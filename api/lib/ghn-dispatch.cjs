const { parseShippingAddress } = require('./shipping-address.cjs');
const { resolveGhnAddress, AddressError } = require('./ghn-address.cjs');
const GHN_BASE = 'https://dev-online-gateway.ghn.vn/shiip/public-api';
class DispatchError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const unavailable = () => new DispatchError(502, 'Không thể xác minh thông tin với dịch vụ vận chuyển. Vui lòng thử lại sau.');
const codeValid = code => typeof code === 'string' && /^[A-Za-z0-9-]{1,96}$/.test(code);
function verifyDetail(result, code, clientCode) {
  const d = result?.data;
  if (result?.code !== 200 || !d || d.order_code !== code || !codeValid(code)
    || d.client_order_code !== clientCode || !/^[a-z_]{1,64}$/.test(d.status || '')
    || !d.created_date || !Number.isFinite(Date.parse(d.created_date)) || (d.updated_date && !Number.isFinite(Date.parse(d.updated_date)))) throw unavailable();
  return d;
}
function normalizeRecipientPhone(raw) {
  let p = String(raw || '').trim().replace(/[\s.-]/g, '');
  if (/^84\d{9}$/.test(p)) p = '0' + p.slice(2);
  else if (/^\+84\d{9}$/.test(p)) p = '0' + p.slice(3);
  else if (/^[35789]\d{8}$/.test(p)) p = '0' + p;
  return p;
}

function buildPayload(order, items, clientCode, env, cod) {
  const region = parseShippingAddress(order.dia_chi_giao);
  const toPhone = normalizeRecipientPhone(order.sdt_nguoi_nhan);
  if (!/^\+?\d{9,15}$/.test(toPhone) || !order.ten_nguoi_nhan
    || !region.addressDetail || !region.ward || !region.province
    || !env.GHN_FROM_PHONE || !env.GHN_FROM_ADDRESS || !env.GHN_FROM_WARD || !env.GHN_FROM_DISTRICT || !env.GHN_FROM_PROVINCE) {
    throw new DispatchError(400, 'Thiếu thông tin người nhận, khu vực giao hàng hoặc kho gửi. Vui lòng bổ sung trước khi tạo vận đơn.');
  }
  if (!Number.isSafeInteger(cod) || cod < 0 || !Array.isArray(items) || !items.length
    || items.some(i => !i.ten_sp_mua || !Number.isSafeInteger(i.ma_ctsp) || i.ma_ctsp < 1 || !Number.isSafeInteger(i.so_luong) || i.so_luong < 1
      || !Number.isSafeInteger(Number(i.don_gia)) || Number(i.don_gia) < 0)) throw new DispatchError(400, 'Chi tiết sản phẩm hoặc số tiền chưa hợp lệ.');
  return {
    payment_type_id: 1, required_note: 'CHOXEMHANGKHONGTHU', service_type_id: 2,
    client_order_code: clientCode, from_name: env.GHN_FROM_NAME || 'Curve & Confidence',
    from_phone: env.GHN_FROM_PHONE, from_address: env.GHN_FROM_ADDRESS,
    from_ward_name: env.GHN_FROM_WARD, from_district_name: env.GHN_FROM_DISTRICT, from_province_name: env.GHN_FROM_PROVINCE,
    to_name: order.ten_nguoi_nhan, to_phone: toPhone, to_address: order.dia_chi_giao,
    to_ward_name: region.ward.slice(0, 100), to_district_name: region.district.slice(0, 100), to_province_name: region.province.slice(0, 100),
    cod_amount: cod, weight: Math.max(300, items.reduce((sum, i) => sum + i.so_luong * 250, 0)), length: 25, width: 20, height: 10,
    items: items.map(i => ({ name: i.ten_sp_mua, code: String(i.ma_ctsp), quantity: i.so_luong, price: Number(i.don_gia), weight: 250 })),
  };
}
async function exchangeItems({ order, id, returnId, request, base, headers }) {
  const invalid = () => new DispatchError(409, 'Yêu cầu đổi size chưa đủ điều kiện gửi hàng. Vui lòng kiểm tra hàng nhận, kiểm định và size đã giữ.');
  const saved = await request(`${base}/rest/v1/yeucaudoitra?ma_ycdt=eq.${returnId}&ma_hd=eq.${id}&select=*,chitietyeucaudoitra(*)`, { headers });
  const rows = saved.ok ? await saved.json() : [];
  if (!Array.isArray(rows) || rows.length !== 1) throw invalid();
  const row = rows[0], details = row.chitietyeucaudoitra;
  if (row.ma_ycdt !== returnId || row.ma_hd !== id || row.loai_yeu_cau !== 'doi_size'
    || (!row.exchange_tracking_code && row.trang_thai !== 'da_nhan_hang') || !Array.isArray(details) || !details.length
    || details.some(d => d.ket_qua_kiem_tra !== 'dat' || (!row.exchange_tracking_code && d.trang_thai_giu_size_moi !== 'Reserved')
      || !Number.isSafeInteger(d.ma_ctsp_moi) || !Number.isSafeInteger(d.so_luong) || d.so_luong < 1)) throw invalid();
  const originals = Array.isArray(order.chitiethoadon) ? order.chitiethoadon : [];
  const ids = [...new Set([...originals.map(l => l.ma_ctsp), ...details.map(d => d.ma_ctsp_moi)])];
  if (ids.some(v => !Number.isSafeInteger(v) || v < 1)) throw invalid();
  const variantsResponse = await request(`${base}/rest/v1/chitietsanpham?ma_ctsp=in.(${ids.join(',')})&select=*,sanpham(ten_sp)`, { headers });
  const variants = variantsResponse.ok ? await variantsResponse.json() : [];
  if (!Array.isArray(variants)) throw invalid();
  const quantities = new Map();
  return details.map(d => {
    const line = originals.find(l => l.ma_cthd === d.ma_cthd);
    const original = variants.find(v => v.ma_ctsp === line?.ma_ctsp);
    const target = variants.find(v => v.ma_ctsp === d.ma_ctsp_moi);
    quantities.set(d.ma_cthd, (quantities.get(d.ma_cthd) || 0) + d.so_luong);
    if (!line || line.ma_hd !== id || quantities.get(d.ma_cthd) > line.so_luong || !original || !target) throw invalid();
    if (!Number.isSafeInteger(original.ma_sp) || original.ma_sp !== target.ma_sp) {
      throw new DispatchError(409, 'Chính sách đổi size chỉ áp dụng cho cùng một mẫu sản phẩm.');
    }
    if (typeof original.mau_sac !== 'string' || original.mau_sac !== target.mau_sac) {
      throw new DispatchError(409, `Chính sách đổi size chỉ áp dụng cùng màu sắc (màu ban đầu: ${original.mau_sac}, màu chọn: ${target.mau_sac}).`);
    }
    if (!Number.isSafeInteger(original.ma_bang_size) || !Number.isSafeInteger(target.ma_bang_size) || original.ma_bang_size === target.ma_bang_size) {
      throw new DispatchError(409, 'Kích cỡ mới bị trùng với kích cỡ cũ trong đơn hàng. Vui lòng chọn size khác để đổi.');
    }
    // No trusted exchange-payment ledger exists yet: refuse ANY nonzero price difference.
    const priceValid = (Number(target.don_gia) === Number(line.don_gia)) || (Number(target.don_gia) === Number(original.don_gia));
    if (!Number.isSafeInteger(Number(target.don_gia)) || !priceValid) {
      throw new DispatchError(409, 'Chênh lệch tiền đổi size chưa được xác minh thanh toán. Chưa thể tạo vận đơn.');
    }
    return { ma_ctsp: target.ma_ctsp, ten_sp_mua: target.sanpham?.ten_sp, so_luong: d.so_luong, don_gia: target.don_gia };
  });
}
async function assertOnlineOrderPaid({ order, id, env, request, base }) {
  if (order.phuong_thuc_tt === 'COD') return;
  if (order.trang_thai_tt !== 'da_thanh_toan') {
    throw new DispatchError(409, 'Đơn hàng thanh toán trực tuyến (VNPay) chưa được xác nhận Đã thanh toán. Quản lý không thể xác nhận hoặc tạo vận đơn giao hàng.');
  }
  if (env.SUPABASE_SERVICE_ROLE_KEY) {
    const ttRes = await request(`${base}/rest/v1/thanhtoan?ma_hd=eq.${id}&select=ma_thanh_toan,ma_giao_dich_cong,so_tien`, {
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    const ttRows = ttRes.ok ? await ttRes.json().catch(() => []) : [];
    const validRow = Array.isArray(ttRows) && ttRows.find(r => r.ma_giao_dich_cong && Number(r.so_tien) === Number(order.thanh_tien));
    if (!validRow) {
      throw new DispatchError(409, 'Đơn hàng thanh toán trực tuyến (VNPay) chưa có bằng chứng giao dịch thành công hợp lệ. Không thể xử lý giao hàng.');
    }
  }
}

async function dispatchOrder({ order, orderId, id, returnId = null, env, request, base, headers, anonKey }) {
  const rpc = async (name, args, secret = false) => {
    const response = await request(`${base}/rest/v1/rpc/${name}`, {
      method: 'POST', headers: secret ? { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' } : headers,
      body: JSON.stringify(secret ? { p_secret: env.GHN_SYNC_SECRET, ...args } : args),
    });
    if (!response.ok) throw new DispatchError(409, 'Đơn hàng đang được xử lý hoặc chưa sẵn sàng. Vui lòng kiểm tra lại sau 2 phút.');
    const data = await response.json();
    if (data?.success !== true) throw new DispatchError(409, 'Đơn hàng đang được xử lý hoặc chưa sẵn sàng. Vui lòng kiểm tra lại sau 2 phút.');
    return data;
  };
  if (returnId === null) {
    await assertOnlineOrderPaid({ order, id, env, request, base });
  }
  const clientCode = returnId === null ? orderId : `${orderId}-RET-${returnId}`;
  let items = returnId === null ? order.chitiethoadon : await exchangeItems({ order, id, returnId, request, base, headers });
  if (returnId === null && order.trang_thai_don === 'Pending') {
    await rpc('cc_order_transition', { p_order_id: id, p_status: 'confirmed' });
  }
  const cod = returnId === null && order.phuong_thuc_tt === 'COD' && order.trang_thai_tt !== 'da_thanh_toan' ? Number(order.thanh_tien) : 0;
  let payload = buildPayload(order, items, clientCode, env, cod);
  const prepared = await rpc('cc_ghn_prepare_dispatch', { p_order_id: id, p_return_id: returnId }, true);
  if (prepared.client_order_code !== clientCode || (prepared.ready !== true && !prepared.existing_tracking)) throw new DispatchError(409, 'Đơn hàng đang được xử lý. Vui lòng kiểm tra lại sau 2 phút.');
  const provider = async (path, data, method = 'POST') => {
    const url = `${GHN_BASE}/v2/shipping-order/${path}${method === 'GET' ? `?${new URLSearchParams(data)}` : ''}`;
    const response = await request(url, { method, headers: { 'Content-Type': 'application/json', Token: env.GHN_TOKEN, ShopId: env.GHN_SHOP_ID }, ...(method === 'POST' ? { body: JSON.stringify(data) } : {}) });
    return { response, result: await response.json() };
  };
  // Re-read under the durable prepare lock/guards; the initial JWT read may predate a manager edit.
  const freshResponse = await request(`${base}/rest/v1/hoadon?ma_hd=eq.${id}&select=*,chitiethoadon(*),vandon(*)`, { headers });
  const freshRows = freshResponse.ok ? await freshResponse.json() : [];
  if (!Array.isArray(freshRows) || freshRows.length !== 1 || freshRows[0].ma_hd !== id) throw unavailable();
  order = freshRows[0];
  if (returnId === null) {
    await assertOnlineOrderPaid({ order, id, env, request, base });
  }
  items = returnId === null ? order.chitiethoadon : await exchangeItems({ order, id, returnId, request, base, headers });
  const freshCod = returnId === null && order.phuong_thuc_tt === 'COD' && order.trang_thai_tt !== 'da_thanh_toan' ? Number(order.thanh_tien) : 0;
  payload = buildPayload(order, items, clientCode, env, freshCod);
  const lookup = await provider('detail-by-client-code', { client_order_code: clientCode }, 'GET');
  let code, recovered = false;
  if (lookup.response.ok && lookup.result.code === 200) {
    code = lookup.result.data?.order_code;
    verifyDetail(lookup.result, code, clientCode);
    if (prepared.existing_tracking && prepared.existing_tracking !== `GHN-${code}`) throw unavailable();
    recovered = true;
  } else {
    // Keep an exact allowlist: staging wraps the documented not-found message.
    // Observed via read-only detail-by-client-code; never accept arbitrary suffixes.
    // https://developer.ghn.dev/vi/docs/order/info-by-client-code
    const notFound = lookup.response.status === 400 && lookup.result.code === 400
      && ['Đơn hàng không tồn tại', 'Lỗi gọi API: corev2_tenant_order_detail_by_client_order_code - Đơn hàng không tồn tại'].includes(lookup.result.message)
      && lookup.result.data === null;
    if (!notFound || prepared.existing_tracking) throw unavailable();
    try {
      const resolved = await resolveGhnAddress({ region: parseShippingAddress(order.dia_chi_giao), env, request });
      payload = {
        ...payload,
        to_province_name: resolved.region.province,
        to_district_name: resolved.region.district,
        to_ward_name: resolved.region.ward,
      };
    } catch (error) {
      if (error instanceof AddressError) throw new DispatchError(error.status, error.message);
      throw unavailable();
    }
    const created = await provider('create', payload);
    if (!created.response.ok || created.result.code !== 200 || !codeValid(created.result.data?.order_code)) {
      if (created.response.status === 400 && created.result.code === 400) {
        const addressErrors = {
          WARD_NAME_NOT_VALID: 'Phường/xã không khớp quận/huyện. Vui lòng kiểm tra địa chỉ nhận hàng.',
          DISTRICT_NAME_NOT_VALID: 'Quận/huyện không khớp tỉnh/thành phố. Vui lòng kiểm tra địa chỉ nhận hàng.',
          PROVINCE_NAME_NOT_VALID: 'Tỉnh/thành phố chưa hợp lệ. Vui lòng kiểm tra địa chỉ nhận hàng.',
          PHONE_INVALID: 'Số điện thoại người nhận không hợp lệ (cần đúng 10 số di động, bắt đầu bằng số 0).',
        };
        if (Object.hasOwn(addressErrors, created.result.code_message)) throw new DispatchError(400, addressErrors[created.result.code_message]);
        if (created.result.message?.includes('validate_phone') || created.result.code_message === 'PHONE_INVALID') {
          throw new DispatchError(400, 'Số điện thoại người nhận không hợp lệ (cần đúng 10 chữ số di động, bắt đầu bằng số 0).');
        }
        if (created.result.message) {
          throw new DispatchError(400, created.result.code_message_value || created.result.message);
        }
      }
      throw unavailable();
    }
    code = created.result.data.order_code;
  }
  const verified = await provider('detail', { order_code: code }, 'GET');
  if (!verified.response.ok) throw unavailable();
  const d = verifyDetail(verified.result, code, clientCode);
  try {
    await rpc('cc_ghn_finish_dispatch', { p_order_id: id, p_return_id: returnId, p_tracking: `GHN-${code}`, p_status: d.status, p_created_at: new Date(d.updated_date || d.created_date).toISOString() }, true);
  } catch {
    throw new DispatchError(502, 'Đối tác đã có vận đơn nhưng chưa lưu được vào đơn hàng. Không tạo đơn mới; vui lòng kiểm tra lại sau 2 phút để khôi phục vận đơn.');
  }
  const savedPath = returnId === null
    ? `/rest/v1/vandon?ma_hd=eq.${id}&select=ma_tracking,don_vi_van_chuyen`
    : `/rest/v1/yeucaudoitra?ma_ycdt=eq.${returnId}&ma_hd=eq.${id}&select=exchange_tracking_code`;
  const savedResponse = await request(`${base}${savedPath}`, { headers });
  const savedRows = savedResponse.ok ? await savedResponse.json() : [];
  if (!Array.isArray(savedRows) || savedRows.length !== 1 || (returnId === null
    ? savedRows[0].don_vi_van_chuyen !== 'GHN' || savedRows[0].ma_tracking !== `GHN-${code}`
    : savedRows[0].exchange_tracking_code !== `GHN-${code}`)) {
    throw new DispatchError(502, 'Chưa xác minh được vận đơn đã lưu. Không tạo đơn mới; vui lòng thử đối soát lại sau 2 phút.');
  }
  return { success: true, orderCode: `GHN-${code}`, providerStatus: d.status,
    totalFee: Number.isFinite(d.total_fee) ? d.total_fee : null, expectedDelivery: typeof d.leadtime === 'string' ? d.leadtime : null, recovered };
}
module.exports = { dispatchOrder, DispatchError };
