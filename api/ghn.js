const { dispatchOrder, DispatchError } = require('./lib/ghn-dispatch.cjs');
const { resolveGhnAddress, AddressError } = require('./lib/ghn-address.cjs');
// Server-only gateway. Never forward a caller-supplied token, price, recipient or tracking code.
function createGhnHandler({ env = process.env, fetchImpl = fetch } = {}) {
  return async function handler(req, res) {
    const reply = (status, body) => res.status(status).json(body);
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') return reply(405, { success: false, errorMessage: 'Phương thức không được hỗ trợ.' });
    const { action, orderId, returnId } = req.body || {};
    const validatingAddress = action === 'validate_address';
    const syncingOrders = action === 'sync';
    const calculatingFee = action === 'calculate_fee';
    if (!validatingAddress && !syncingOrders && !calculatingFee && (!['create', 'create_exchange', 'tracking'].includes(action) || typeof orderId !== 'string' || !/^BS-HD0?[1-9]\d*$/.test(orderId))) {
      return reply(400, { success: false, errorMessage: 'Thông tin đơn hàng không hợp lệ.' });
    }
    if (action === 'create_exchange' && (!Number.isSafeInteger(returnId) || returnId < 1 || returnId > 2147483647)) return reply(400, { success: false, errorMessage: 'Yêu cầu đổi hàng không hợp lệ.' });
    const bearer = req.headers?.authorization;
    if (typeof bearer !== 'string' || (validatingAddress && bearer.length > 8192) || !/^Bearer \S+$/.test(bearer)) return reply(401, { success: false, errorMessage: 'Vui lòng đăng nhập lại.' });
    const supabaseUrl = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
    const supabaseAnonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
    if (env.GHN_ENABLED !== 'true' || !env.GHN_TOKEN || (!validatingAddress && (!env.GHN_SHOP_ID || (action !== 'tracking' && !env.GHN_SYNC_SECRET))) || !supabaseUrl || !supabaseAnonKey) {
      return reply(503, { success: false, errorMessage: 'Dịch vụ vận chuyển chưa được bật. Vui lòng liên hệ quản lý.' });
    }
    const base = supabaseUrl;
    const headers = { apikey: supabaseAnonKey, Authorization: bearer, 'Content-Type': 'application/json' };
    const request = (url, options = {}) => fetchImpl(url, { ...options, signal: AbortSignal.timeout(8000) });
    try {
      const user = await request(`${base}/auth/v1/user`, { headers });
      if (!user.ok) return reply(401, { success: false, errorMessage: 'Phiên đăng nhập không hợp lệ.' });
      if (validatingAddress) {
        // Narrow, bounded body: no order access or caller-supplied provider configuration.
        if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)
          || Object.keys(req.body).length !== 2 || !Object.hasOwn(req.body, 'region')
          || Buffer.byteLength(JSON.stringify(req.body), 'utf8') > 2048) {
          return reply(400, { success: false, errorMessage: 'Thông tin khu vực giao hàng không hợp lệ.' });
        }
        return reply(200, { success: true, ...await resolveGhnAddress({ region: req.body.region, env, request }) });
      }
      if (calculatingFee) {
        const { region, weight = 500, insuranceValue = 0 } = req.body || {};
        if (!region || !region.province || !region.district || !region.ward) {
          return reply(400, { success: false, errorMessage: 'Vui lòng cung cấp đầy đủ Tỉnh/Thành, Quận/Huyện, Phường/Xã.' });
        }
        const resolved = await resolveGhnAddress({ region, env, request });
        if (!resolved?.codes?.districtId || !resolved?.codes?.wardCode) {
          return reply(400, { success: false, errorMessage: 'Không thể xác định khu vực GHN tương ứng.' });
        }

        const feePayload = {
          service_type_id: 2,
          from_district_id: 1444, // Kho shop Quận 3, TP.HCM
          to_district_id: resolved.codes.districtId,
          to_ward_code: resolved.codes.wardCode,
          height: 10,
          length: 30,
          width: 20,
          weight: Math.max(100, Number(weight) || 500),
          insurance_value: Math.min(5000000, Math.max(0, Number(insuranceValue) || 0))
        };

        const feeResponse = await request('https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/fee', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Token: env.GHN_TOKEN, ShopId: String(env.GHN_SHOP_ID || '235033') },
          body: JSON.stringify(feePayload)
        });
        const feeData = await feeResponse.json();
        if (!feeResponse.ok || feeData?.code !== 200 || !feeData?.data) {
          return reply(502, { success: false, errorMessage: feeData?.message || 'Không thể tính phí vận chuyển từ GHN.' });
        }

        const totalFee = Number(feeData.data.total) || 20900;
        return reply(200, {
          success: true,
          fee: totalFee,
          serviceFee: feeData.data.service_fee,
          insuranceFee: feeData.data.insurance_fee,
          resolvedRegion: resolved.region
        });
      }
      if (action !== 'tracking') {
        const staff = await request(`${base}/rest/v1/rpc/cc_staff`, { method: 'POST', headers, body: '{}' });
        if (!staff.ok || await staff.json() !== true) return reply(403, { success: false, errorMessage: 'Bạn không có quyền thao tác vận đơn.' });
      }
      if (syncingOrders) {
        const { createGhnSync } = require('./lib/ghn-sync.cjs');
        const sync = createGhnSync({ env, fetchImpl });
        const syncResult = await sync.runOnce();
        return reply(200, { success: syncResult.configured !== false, ...syncResult });
      }
      // The user's Supabase JWT and RLS determine order ownership, including tracking requests.
      const id = Number(orderId.replace('BS-HD', ''));
      if (!Number.isSafeInteger(id) || id > 2147483647) return reply(400, { success: false, errorMessage: 'Thông tin đơn hàng không hợp lệ.' });
      const saved = await request(`${base}/rest/v1/hoadon?ma_hd=eq.${id}&select=*,chitiethoadon(*),vandon(*)`, { headers });
      const rows = saved.ok ? await saved.json() : [];
      if (!Array.isArray(rows) || rows.length !== 1 || rows[0].ma_hd !== id) return reply(404, { success: false, errorMessage: 'Không tìm thấy đơn hàng được phép xem.' });
      const order = rows[0];
      if (action !== 'tracking') {
        try {
          return reply(200, await dispatchOrder({ order, orderId, id, returnId: action === 'create_exchange' ? returnId : null, env, request, base, headers, anonKey: supabaseAnonKey }));
        } catch (error) {
          let confirmed;
          if (action === 'create') {
            try {
              const check = await request(`${base}/rest/v1/hoadon?ma_hd=eq.${id}&select=trang_thai_don`, { headers });
              const current = check.ok ? await check.json() : [];
              if (Array.isArray(current) && current.length === 1) confirmed = ['Confirmed', 'Da_lay_hang', 'Dang_giao', 'Giao_thanh_cong'].includes(current[0].trang_thai_don);
            } catch { /* An unavailable read-back must not invent confirmation state. */ }
          }
          return reply(error instanceof DispatchError ? error.status : 502, { success: false, confirmed, errorMessage: error instanceof DispatchError ? error.message : 'Không thể xác minh thông tin với dịch vụ vận chuyển. Vui lòng thử lại sau.' });
        }
      }
      const shipments = Array.isArray(order.vandon) ? order.vandon : order.vandon ? [order.vandon] : [];
      const shipment = shipments.find(s => s.don_vi_van_chuyen === 'GHN' || /^GHN-/i.test(s.ma_tracking || ''));
      if (!shipment?.ma_tracking) return reply(200, { success: true, data: null });
      const path = '/v2/shipping-order/detail';
      const payload = { order_code: shipment.ma_tracking.replace(/^GHN-/, '') };
      const response = await request(`https://dev-online-gateway.ghn.vn/shiip/public-api${path}?${new URLSearchParams(payload)}`, {
        method: 'GET', headers: { 'Content-Type': 'application/json', Token: env.GHN_TOKEN, ShopId: env.GHN_SHOP_ID },
      });
      const result = await response.json();
      if (!response.ok || result.code !== 200 || !result.data) return reply(502, { success: false, errorMessage: 'Đối tác vận chuyển chưa xác nhận yêu cầu. Vui lòng thử lại sau.' });
      const d = result.data;
      if (d.order_code !== payload.order_code || !/^[a-z_]{1,64}$/.test(d.status || '')) throw Error('Unverified provider response');
      // Do not relay arbitrary provider content (or credentials) into the browser.
      return reply(200, { success: true, data: { orderCode: shipment.ma_tracking, status: d.status, leadtime: d.leadtime, createdDate: d.created_date, updatedDate: d.updated_date, totalFee: d.total_fee } });
    } catch (error) {
      const safe = error instanceof DispatchError || error instanceof AddressError;
      return reply(safe ? error.status : 502, { success: false, errorMessage: safe ? error.message : 'Không thể xác minh thông tin với dịch vụ vận chuyển. Vui lòng thử lại sau.' });
    }
  };
}
module.exports = createGhnHandler();
module.exports.createGhnHandler = createGhnHandler;
