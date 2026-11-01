const crypto = require('crypto');

const VNPAY_HOLD_DURATION_MS = 15 * 60 * 1000; // 15 phút giữ tồn kho cho giao dịch chờ thanh toán VNPay

function formatVnTime(date = new Date()) {
  const vn = new Date(date.getTime() + (date.getTimezoneOffset() + 420) * 60000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${vn.getFullYear()}${pad(vn.getMonth() + 1)}${pad(vn.getDate())}${pad(vn.getHours())}${pad(vn.getMinutes())}${pad(vn.getSeconds())}`;
}

function buildSignData(params) {
  return Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(params[key])).replace(/%20/g, '+')}`)
    .join('&');
}

function signParams(params, secret) {
  return crypto.createHmac('sha512', secret.trim()).update(Buffer.from(buildSignData(params), 'utf-8')).digest('hex');
}

function verifySignature(params, secureHash, secret) {
  if (!secureHash || !secret || typeof secureHash !== 'string') return false;
  const computed = signParams(params, secret);
  const a = Buffer.from(computed.toLowerCase(), 'utf-8');
  const b = Buffer.from(secureHash.trim().toLowerCase(), 'utf-8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function extractBaseOrderCode(txnRef) {
  if (!txnRef || typeof txnRef !== 'string') return '';
  const base = txnRef.trim().split('_')[0];
  return /^BS-HD0?[1-9]\d*$/.test(base) ? base : '';
}

function parseNumericOrderId(orderCode) {
  if (!orderCode || !/^BS-HD0?[1-9]\d*$/.test(String(orderCode).trim())) return NaN;
  const n = Number(String(orderCode).trim().replace(/^BS-HD0?/, ''));
  return Number.isSafeInteger(n) && n > 0 ? n : NaN;
}

function resolveEffectivePaymentStatus(order, hasPaymentRecord = false) {
  if (!order) return 'pending';
  if (order.trang_thai_tt === 'da_thanh_toan' && (order.phuong_thuc_tt === 'COD' || hasPaymentRecord)) {
    return 'paid';
  }
  if (order.trang_thai_tt === 'thanh_toan_that_bai') return 'failed';
  if (order.trang_thai_tt === 'da_huy_thanh_toan') return 'cancelled';
  if (order.trang_thai_tt === 'da_hoan_tien') return 'refunded';

  const metaStatus = order.yeu_cau_dia_chi && typeof order.yeu_cau_dia_chi === 'object'
    ? order.yeu_cau_dia_chi.vnpay_status
    : null;
  if (metaStatus === 'thanh_toan_that_bai') return 'failed';
  if (metaStatus === 'da_huy_thanh_toan') return 'cancelled';
  if (metaStatus === 'da_thanh_toan' && hasPaymentRecord) return 'paid';

  if (order.phuong_thuc_tt !== 'COD' && order.trang_thai_don === 'Cancelled' && order.trang_thai_tt !== 'da_thanh_toan') {
    return 'cancelled';
  }
  return 'pending';
}

function createVnpayHandler({ env = process.env, fetchImpl = fetch } = {}) {
  return async function handler(req, res) {
    const reply = (status, payload) => {
      if (res.setHeader) res.setHeader('Content-Type', 'application/json');
      if (res.status) return res.status(status).json(payload);
      res.statusCode = status;
      res.end(JSON.stringify(payload));
    };

    const secret = env.VNPAY_HASH_SECRET || 'VFXQQWIMNQMTZRQOSABXLGTZPCJKGGBQ';
    const tmnCode = env.VNPAY_TMN_CODE || 'X23LQ8KA';
    const payUrl = env.VNPAY_PAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';

    if (!secret || !tmnCode) {
      return reply(503, { success: false, errorMessage: 'Cổng thanh toán chưa được cấu hình đầy đủ.' });
    }

    const supabaseUrl = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
    const supabaseAnonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
    const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || (!supabaseAnonKey && !supabaseServiceKey)) {
      return reply(503, { success: false, errorMessage: 'Cổng thanh toán chưa sẵn sàng.' });
    }

    const request = (url, options = {}) => fetchImpl(url, { ...options, signal: AbortSignal.timeout(8000) });

    const serviceHeaders = supabaseServiceKey
      ? {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        }
      : null;

    // Giải phóng nguyên tử (atomic & idempotent) tồn kho tạm giữ của 1 đơn hàng
    async function releaseOrderReservedStock(orderRow, dbHeaders) {
      if (!orderRow || !['Reserved', 'Hold'].includes(orderRow.trang_thai_giu)) {
        return false;
      }
      // Chuyển trạng thái giữ kho từ Reserved/Hold -> Released có điều kiện để chống giải phóng 2 lần khi callback lặp
      const claimRes = await request(
        `${supabaseUrl}/rest/v1/hoadon?ma_hd=eq.${orderRow.ma_hd}&trang_thai_giu=in.(Reserved,Hold)`,
        {
          method: 'PATCH',
          headers: { ...dbHeaders, Prefer: 'return=representation' },
          body: JSON.stringify({ trang_thai_giu: 'Released', thoi_han_hold: null }),
        }
      );
      if (!claimRes.ok) return false;
      const claimedRows = await claimRes.json().catch(() => []);
      if (!Array.isArray(claimedRows) || claimedRows.length === 0) {
        // Đã được giải phóng bởi một tiến trình/callback khác trước đó
        return false;
      }

      // Truy vấn chi tiết đơn hàng để hoàn lại so_luong_giu cho từng biến thể
      const itemsRes = await request(
        `${supabaseUrl}/rest/v1/chitiethoadon?ma_hd=eq.${orderRow.ma_hd}&select=*`,
        { headers: dbHeaders }
      );
      if (!itemsRes.ok) return true;
      const items = await itemsRes.json().catch(() => []);
      const qtyByVariant = {};
      for (const item of items) {
        const itemQty = Number(item.so_luong ?? item.so_luong_mua ?? 0);
        if (item.ma_ctsp && itemQty > 0) {
          qtyByVariant[item.ma_ctsp] = (qtyByVariant[item.ma_ctsp] || 0) + itemQty;
        }
      }

      for (const [maCtspStr, qty] of Object.entries(qtyByVariant)) {
        const maCtsp = Number(maCtspStr);
        const varRes = await request(
          `${supabaseUrl}/rest/v1/chitietsanpham?ma_ctsp=eq.${maCtsp}&select=ma_ctsp,so_luong_giu`,
          { headers: dbHeaders }
        );
        if (varRes.ok) {
          const varRows = await varRes.json().catch(() => []);
          if (Array.isArray(varRows) && varRows[0]) {
            const currentHeld = Number(varRows[0].so_luong_giu || 0);
            const nextHeld = Math.max(0, currentHeld - Number(qty));
            await request(`${supabaseUrl}/rest/v1/chitietsanpham?ma_ctsp=eq.${maCtsp}`, {
              method: 'PATCH',
              headers: dbHeaders,
              body: JSON.stringify({ so_luong_giu: nextHeld }),
            });
          }
        }
      }
      return true;
    }

    // Cập nhật trạng thái thanh toán trên bảng hoadon (hỗ trợ cả DB đã chạy migration CHECK constraint mới và DB cũ)
    async function updateOrderPaymentState(orderRow, { targetTt, targetDon, targetGiu, metaPatch, cancelLogReason }, dbHeaders) {
      const mergedMeta = Object.assign(
        {},
        orderRow.yeu_cau_dia_chi && typeof orderRow.yeu_cau_dia_chi === 'object' ? orderRow.yeu_cau_dia_chi : {},
        metaPatch || {}
      );

      const patchPayload = {
        trang_thai_tt: targetTt,
        thoi_han_hold: null,
        yeu_cau_dia_chi: mergedMeta,
      };
      if (targetDon) patchPayload.trang_thai_don = targetDon;
      if (targetGiu) patchPayload.trang_thai_giu = targetGiu;

      let patchRes = await request(`${supabaseUrl}/rest/v1/hoadon?ma_hd=eq.${orderRow.ma_hd}`, {
        method: 'PATCH',
        headers: { ...dbHeaders, Prefer: 'return=representation' },
        body: JSON.stringify(patchPayload),
      });

      // Fallback an toàn nếu DB chưa chạy ALTER TABLE mở rộng hoadon_trang_thai_tt_check
      if (!patchRes.ok && !['chua_thanh_toan', 'da_thanh_toan'].includes(targetTt)) {
        const fallbackPayload = {
          ...patchPayload,
          trang_thai_tt: 'chua_thanh_toan',
        };
        patchRes = await request(`${supabaseUrl}/rest/v1/hoadon?ma_hd=eq.${orderRow.ma_hd}`, {
          method: 'PATCH',
          headers: { ...dbHeaders, Prefer: 'return=representation' },
          body: JSON.stringify(fallbackPayload),
        });
      }

      if (cancelLogReason && orderRow.ma_kh) {
        try {
          const existYchRes = await request(
            `${supabaseUrl}/rest/v1/yeucauhuy?ma_hd=eq.${orderRow.ma_hd}&select=ma_ych`,
            { headers: dbHeaders }
          );
          const existYch = existYchRes.ok ? await existYchRes.json().catch(() => []) : [];
          if (Array.isArray(existYch) && existYch.length === 0) {
            await request(`${supabaseUrl}/rest/v1/yeucauhuy`, {
              method: 'POST',
              headers: dbHeaders,
              body: JSON.stringify({
                ma_hd: orderRow.ma_hd,
                ma_kh: orderRow.ma_kh,
                ly_do: cancelLogReason,
                trang_thai: 'da_duyet',
                thoi_gian_xu_ly: new Date().toISOString(),
                ghi_chu_xu_ly: 'Hệ thống tự động cập nhật từ kết quả cổng thanh toán VNPay và giải phóng tồn kho tạm giữ.',
              }),
            });
          }
        } catch {
          // Không chặn luồng chính nếu bảng log phụ gặp lỗi
        }
      }
    }

    // Tự động kiểm tra và giải phóng các đơn Online chờ thanh toán đã quá thời hạn giữ hàng (15 phút)
    async function expireStaleOnlineOrders(dbHeaders) {
      if (!dbHeaders) return 0;
      try {
        const nowIso = new Date().toISOString();
        const cutoffIso = new Date(Date.now() - VNPAY_HOLD_DURATION_MS).toISOString();
        const staleRes = await request(
          `${supabaseUrl}/rest/v1/hoadon?phuong_thuc_tt=neq.COD&trang_thai_tt=eq.chua_thanh_toan&trang_thai_don=eq.Pending&trang_thai_giu=in.(Reserved,Hold)&select=ma_hd,ma_kh,ngay_dat,thoi_han_hold,trang_thai_tt,trang_thai_don,trang_thai_giu,yeu_cau_dia_chi,thanhtoan(ma_thanh_toan)`,
          { headers: dbHeaders }
        );
        if (!staleRes.ok) return 0;
        const candidates = await staleRes.json().catch(() => []);
        if (!Array.isArray(candidates)) return 0;

        let expiredCount = 0;
        for (const row of candidates) {
          const hasPayment = row.thanhtoan && (Array.isArray(row.thanhtoan) ? row.thanhtoan.length > 0 : Boolean(row.thanhtoan.ma_thanh_toan));
          if (hasPayment) continue;

          const holdDeadline = row.thoi_han_hold || (row.ngay_dat ? new Date(new Date(row.ngay_dat).getTime() + VNPAY_HOLD_DURATION_MS).toISOString() : null);
          const isExpired = holdDeadline ? holdDeadline < nowIso : (row.ngay_dat && row.ngay_dat < cutoffIso);
          if (!isExpired) continue;

          await releaseOrderReservedStock(row, dbHeaders);
          await updateOrderPaymentState(
            row,
            {
              targetTt: 'da_huy_thanh_toan',
              targetDon: 'Cancelled',
              targetGiu: 'Released',
              metaPatch: {
                vnpay_status: 'da_huy_thanh_toan',
                vnp_reason: 'Quá thời hạn giữ hàng chờ thanh toán VNPay (15 phút)',
                vnp_updated_at: nowIso,
              },
              cancelLogReason: '[VNPAY_EXPIRED] Đơn hàng VNPay quá thời hạn thanh toán 15 phút — Tự động hủy và hoàn tồn kho tạm giữ.',
            },
            dbHeaders
          );
          expiredCount += 1;
        }
        return expiredCount;
      } catch {
        return 0;
      }
    }

    // Xử lý chung cho cả VNPay IPN (GET/POST) và ReturnURL Verify (POST)
    async function verifyAndProcessVnpayCallback(rawQuery, explicitOrderId, dbHeaders) {
      const searchParams = new URLSearchParams(
        typeof rawQuery === 'string'
          ? rawQuery.replace(/^\?/, '')
          : new URLSearchParams(rawQuery || {}).toString()
      );
      const vnpParams = {};
      for (const [key, value] of searchParams.entries()) {
        if (key.startsWith('vnp_') && key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType') {
          vnpParams[key] = value;
        }
      }

      const secureHash = searchParams.get('vnp_SecureHash') || '';
      const responseCode = searchParams.get('vnp_ResponseCode') || '99';
      const transactionStatus = searchParams.get('vnp_TransactionStatus') || '';
      const txnRef = searchParams.get('vnp_TxnRef') || '';
      const amountStr = searchParams.get('vnp_Amount') || '';
      const transactionNo = (searchParams.get('vnp_TransactionNo') || '').trim();
      const bankCode = searchParams.get('vnp_BankCode') || '';
      const payDate = searchParams.get('vnp_PayDate') || '';

      const baseOrderCode = extractBaseOrderCode(txnRef) || (explicitOrderId && /^BS-HD0?[1-9]\d*$/.test(explicitOrderId) ? explicitOrderId : '');
      const numericId = parseNumericOrderId(baseOrderCode);

      const isSignatureValid =
        Boolean(secureHash) &&
        Object.keys(vnpParams).length > 0 &&
        searchParams.get('vnp_TmnCode') === tmnCode &&
        verifySignature(vnpParams, secureHash, secret);

      if (!isSignatureValid) {
        return {
          httpStatus: 200,
          rspCode: '97',
          rspMessage: 'Invalid signature',
          isValid: false,
          isSuccess: false,
          isCancelled: false,
          responseCode,
          transactionStatus,
          orderId: baseOrderCode || explicitOrderId || '',
          amount: /^\d+$/.test(amountStr) ? Number(amountStr) / 100 : 0,
          transactionNo,
          paymentStatus: 'pending',
          errorMessage: 'Chữ ký bảo mật VNPay không hợp lệ hoặc dữ liệu phản hồi đã bị can thiệp.',
        };
      }

      if (!Number.isSafeInteger(numericId) || (explicitOrderId && baseOrderCode !== explicitOrderId)) {
        return {
          httpStatus: 200,
          rspCode: '01',
          rspMessage: 'Order not found',
          isValid: false,
          isSuccess: false,
          isCancelled: false,
          responseCode,
          transactionStatus,
          orderId: explicitOrderId || baseOrderCode,
          amount: /^\d+$/.test(amountStr) ? Number(amountStr) / 100 : 0,
          transactionNo,
          paymentStatus: 'pending',
          errorMessage: 'Mã đơn hàng đối chiếu với VNPay không khớp.',
        };
      }

      const savedRes = await request(
        `${supabaseUrl}/rest/v1/hoadon?ma_hd=eq.${numericId}&select=ma_hd,ma_kh,thanh_tien,phuong_thuc_tt,trang_thai_tt,trang_thai_don,trang_thai_giu,thoi_han_hold,yeu_cau_dia_chi,thanhtoan(ma_thanh_toan,ma_giao_dich_cong,so_tien)`,
        { headers: dbHeaders }
      );
      if (!savedRes.ok) {
        return {
          httpStatus: 502,
          rspCode: '99',
          rspMessage: 'Database unavailable',
          isValid: false,
          isSuccess: false,
          isCancelled: false,
          responseCode,
          transactionStatus,
          orderId: baseOrderCode,
          amount: 0,
          transactionNo,
          paymentStatus: 'pending',
          errorMessage: 'Chưa tải được đơn hàng từ máy chủ để đối soát.',
        };
      }

      const rows = await savedRes.json().catch(() => []);
      const order = Array.isArray(rows) && rows.length === 1 ? rows[0] : null;
      if (!order || order.phuong_thuc_tt === 'COD') {
        return {
          httpStatus: 200,
          rspCode: '01',
          rspMessage: 'Order not found',
          isValid: false,
          isSuccess: false,
          isCancelled: false,
          responseCode,
          transactionStatus,
          orderId: baseOrderCode,
          amount: 0,
          transactionNo,
          paymentStatus: 'pending',
          errorMessage: 'Không tìm thấy đơn hàng thanh toán trực tuyến tương ứng.',
        };
      }

      const expectedAmountVnp = Math.round(Number(order.thanh_tien) * 100);
      const isAmountValid = /^\d+$/.test(amountStr) && Number(amountStr) === expectedAmountVnp;
      if (!isAmountValid) {
        return {
          httpStatus: 200,
          rspCode: '04',
          rspMessage: 'Invalid amount',
          isValid: false,
          isSuccess: false,
          isCancelled: false,
          responseCode,
          transactionStatus,
          orderId: baseOrderCode,
          amount: Number(amountStr || 0) / 100,
          transactionNo,
          paymentStatus: resolveEffectivePaymentStatus(order, Boolean(order.thanhtoan)),
          orderStatus: order.trang_thai_don,
          errorMessage: 'Số tiền giao dịch VNPay không khớp với giá trị đơn hàng.',
        };
      }

      const existingPayment = order.thanhtoan
        ? Array.isArray(order.thanhtoan)
          ? order.thanhtoan[0]
          : order.thanhtoan
        : null;
      const isAlreadyConfirmedPaid =
        order.trang_thai_tt === 'da_thanh_toan' && Boolean(existingPayment && existingPayment.ma_giao_dich_cong);

      const isSuccess =
        responseCode === '00' &&
        transactionStatus === '00' &&
        Boolean(transactionNo) &&
        transactionNo !== '0';
      const isCancelled = responseCode === '24';
      const amount = Number(amountStr) / 100;

      // Bảo vệ bất biến (Idempotency): Nếu đơn đã xác nhận Đã thanh toán hợp lệ từ trước,
      // không ghi đè trạng thái và không trừ/hoàn tồn kho thêm lần nào nữa.
      if (isAlreadyConfirmedPaid) {
        return {
          httpStatus: 200,
          rspCode: '02',
          rspMessage: 'Order already confirmed',
          isValid: true,
          isSuccess: true,
          isCancelled: false,
          alreadyConfirmed: true,
          responseCode: '00',
          transactionStatus: '00',
          orderId: baseOrderCode,
          amount,
          transactionNo: existingPayment.ma_giao_dich_cong || transactionNo,
          paymentStatus: 'paid',
          orderStatus: order.trang_thai_don,
          stockHoldStatus: order.trang_thai_giu,
        };
      }

      const nowIso = new Date().toISOString();

      if (isSuccess) {
        // TRƯỜNG HỢP 1: THANH TOÁN VNPAY THÀNH CÔNG HỢP LỆ
        // Nếu đơn từng bị giải phóng tồn kho do quá hạn nhưng IPN báo thanh toán thành công về trễ,
        // thử giữ lại tồn kho cho đơn.
        let nextOrderStatus = order.trang_thai_don;
        let nextHoldStatus = order.trang_thai_giu;
        if (order.trang_thai_don === 'Cancelled' && order.trang_thai_giu === 'Released') {
          const itemsRes = await request(
            `${supabaseUrl}/rest/v1/chitiethoadon?ma_hd=eq.${order.ma_hd}&select=ma_ctsp,so_luong`,
            { headers: dbHeaders }
          );
          const items = itemsRes.ok ? await itemsRes.json().catch(() => []) : [];
          let canReReserve = true;
          for (const item of items) {
            const varRes = await request(
              `${supabaseUrl}/rest/v1/chitietsanpham?ma_ctsp=eq.${item.ma_ctsp}&select=ma_ctsp,so_luong_ton,so_luong_giu`,
              { headers: dbHeaders }
            );
            const varRows = varRes.ok ? await varRes.json().catch(() => []) : [];
            const v = Array.isArray(varRows) ? varRows[0] : null;
            if (!v || Number(v.so_luong_ton) - Number(v.so_luong_giu) < Number(item.so_luong)) {
              canReReserve = false;
              break;
            }
          }
          if (canReReserve && items.length > 0) {
            for (const item of items) {
              const varRes = await request(
                `${supabaseUrl}/rest/v1/chitietsanpham?ma_ctsp=eq.${item.ma_ctsp}&select=so_luong_giu`,
                { headers: dbHeaders }
              );
              const varRows = varRes.ok ? await varRes.json().catch(() => []) : [];
              if (Array.isArray(varRows) && varRows[0]) {
                await request(`${supabaseUrl}/rest/v1/chitietsanpham?ma_ctsp=eq.${item.ma_ctsp}`, {
                  method: 'PATCH',
                  headers: dbHeaders,
                  body: JSON.stringify({ so_luong_giu: Number(varRows[0].so_luong_giu || 0) + Number(item.so_luong) }),
                });
              }
            }
            nextOrderStatus = 'Pending';
            nextHoldStatus = 'Reserved';
          }
        }

        // Ghi nhận bản ghi giao dịch vào bảng `thanhtoan` (idempotent theo ma_hd)
        if (!existingPayment) {
          await request(`${supabaseUrl}/rest/v1/thanhtoan?on_conflict=ma_hd`, {
            method: 'POST',
            headers: { ...dbHeaders, Prefer: 'resolution=ignore-duplicates,return=representation' },
            body: JSON.stringify({
              ma_hd: order.ma_hd,
              ma_giao_dich_cong: String(transactionNo),
              so_tien: Number(order.thanh_tien),
              phuong_thuc: 'VNPay',
              ngay_thanh_toan: nowIso,
            }),
          });
        }

        await updateOrderPaymentState(
          order,
          {
            targetTt: 'da_thanh_toan',
            targetDon: nextOrderStatus,
            targetGiu: nextHoldStatus,
            metaPatch: {
              vnpay_status: 'da_thanh_toan',
              vnp_response_code: responseCode,
              vnp_transaction_status: transactionStatus,
              vnp_transaction_no: String(transactionNo),
              vnp_bank_code: bankCode || null,
              vnp_pay_date: payDate || null,
              vnp_updated_at: nowIso,
            },
          },
          dbHeaders
        );

        return {
          httpStatus: 200,
          rspCode: '00',
          rspMessage: 'Confirm Success',
          isValid: true,
          isSuccess: true,
          isCancelled: false,
          alreadyConfirmed: false,
          responseCode,
          transactionStatus,
          orderId: baseOrderCode,
          amount,
          transactionNo,
          paymentStatus: 'paid',
          orderStatus: nextOrderStatus,
          stockHoldStatus: nextHoldStatus,
        };
      }

      // TRƯỜNG HỢP 2 & 3: KHÁCH HÀNG HỦY GIAO DỊCH ('24') HOẶC THANH TOÁN THẤT BẠI (MÃ KHÁC)
      const targetTt = isCancelled ? 'da_huy_thanh_toan' : 'thanh_toan_that_bai';
      const paymentStatus = isCancelled ? 'cancelled' : 'failed';

      // Giải phóng Reserved Stock nguyên tử (nếu đơn đang giữ tồn kho)
      await releaseOrderReservedStock(order, dbHeaders);

      await updateOrderPaymentState(
        order,
        {
          targetTt,
          targetDon: 'Cancelled',
          targetGiu: 'Released',
          metaPatch: {
            vnpay_status: targetTt,
            vnp_response_code: responseCode,
            vnp_transaction_status: transactionStatus,
            vnp_transaction_no: transactionNo && transactionNo !== '0' ? transactionNo : null,
            vnp_bank_code: bankCode || null,
            vnp_pay_date: payDate || null,
            vnp_updated_at: nowIso,
          },
          cancelLogReason: isCancelled
            ? `[VNPAY_CANCELLED] Khách hàng chủ động hủy giao dịch thanh toán VNPay (Mã phản hồi: ${responseCode}).`
            : `[VNPAY_FAILED] Thanh toán VNPay thất bại (Mã phản hồi: ${responseCode}, Trạng thái: ${transactionStatus || 'N/A'}).`,
        },
        dbHeaders
      );

      return {
        httpStatus: 200,
        rspCode: '00',
        rspMessage: 'Confirm Success',
        isValid: true,
        isSuccess: false,
        isCancelled,
        alreadyConfirmed: false,
        responseCode,
        transactionStatus,
        orderId: baseOrderCode,
        amount,
        transactionNo,
        paymentStatus,
        orderStatus: 'Cancelled',
        stockHoldStatus: 'Released',
      };
    }

    // 1. Hỗ trợ chuẩn VNPay IPN qua phương thức GET (/api/vnpay?vnp_Amount=...&vnp_SecureHash=...)
    if (req.method === 'GET') {
      const urlObj = new URL(req.url || '/api/vnpay', 'http://localhost');
      if (!urlObj.searchParams.has('vnp_SecureHash') && !urlObj.searchParams.has('vnp_TxnRef')) {
        return reply(400, { RspCode: '99', Message: 'Missing VNPay IPN parameters' });
      }
      if (!serviceHeaders) {
        return reply(503, { RspCode: '99', Message: 'Service role not configured for IPN' });
      }
      const outcome = await verifyAndProcessVnpayCallback(urlObj.search, '', serviceHeaders);
      return reply(200, {
        RspCode: outcome.rspCode || '99',
        Message: outcome.rspMessage || 'Unknown error',
        paymentStatus: outcome.paymentStatus,
        orderStatus: outcome.orderStatus,
      });
    }

    if (req.method !== 'POST') {
      return reply(405, { success: false, errorMessage: 'Phương thức không được hỗ trợ.' });
    }

    const { action, orderId, query, retry } = req.body || {};

    // Dọn dẹp các đơn Online quá thời hạn giữ hàng 15 phút
    if (serviceHeaders) {
      await expireStaleOnlineOrders(serviceHeaders);
    }

    // 2. Xử lý action 'ipn' hoặc 'verify' (Xác minh chữ ký HMAC-SHA512 từ VNPay)
    if (action === 'ipn' || action === 'verify') {
      if (!query || (typeof query !== 'string' && typeof query !== 'object')) {
        return reply(400, { success: false, errorMessage: 'Thiếu dữ liệu phản hồi từ cổng VNPay.' });
      }

      const bearer = req.headers?.authorization || '';
      const fallbackUserHeaders =
        supabaseAnonKey && /^Bearer\s+\S+/.test(bearer)
          ? { apikey: supabaseAnonKey, Authorization: bearer, 'Content-Type': 'application/json' }
          : null;
      const dbHeaders = serviceHeaders || fallbackUserHeaders;
      if (!dbHeaders) {
        return reply(401, { success: false, errorMessage: 'Phiên xác thực không hợp lệ.' });
      }

      const outcome = await verifyAndProcessVnpayCallback(query, orderId, dbHeaders);
      if (action === 'ipn') {
        return reply(200, {
          RspCode: outcome.rspCode,
          Message: outcome.rspMessage,
          paymentStatus: outcome.paymentStatus,
          orderStatus: outcome.orderStatus,
        });
      }

      return reply(outcome.httpStatus || 200, {
        success: true,
        isValid: outcome.isValid,
        isSuccess: outcome.isSuccess,
        isCancelled: outcome.isCancelled,
        alreadyConfirmed: Boolean(outcome.alreadyConfirmed),
        responseCode: outcome.responseCode,
        transactionStatus: outcome.transactionStatus,
        orderId: outcome.orderId,
        amount: outcome.amount,
        transactionNo: outcome.transactionNo,
        paymentStatus: outcome.paymentStatus,
        orderStatus: outcome.orderStatus,
        stockHoldStatus: outcome.stockHoldStatus,
        errorMessage: outcome.errorMessage,
      });
    }

    // 3. Các action yêu cầu mã đơn hàng hợp lệ: 'create', 'sync_pending', 'cancel_payment'
    if (!['create', 'sync_pending', 'cancel_payment'].includes(action) || !/^BS-HD0?[1-9]\d*$/.test(orderId || '')) {
      return reply(400, { success: false, errorMessage: 'Thông tin đơn hàng hoặc tác vụ không hợp lệ.' });
    }

    const numericId = parseNumericOrderId(orderId);
    if (!Number.isSafeInteger(numericId)) {
      return reply(400, { success: false, errorMessage: 'Mã đơn hàng không hợp lệ.' });
    }

    const bearer = req.headers?.authorization || '';
    const hasBearer = /^Bearer\s+\S+/.test(bearer);

    // Action 'sync_pending' chỉ đọc trạng thái thanh toán/tồn kho phi nhạy cảm nên có thể dùng serviceHeaders khi trang vừa tải lại
    if (action !== 'sync_pending' && !hasBearer) {
      return reply(401, { success: false, errorMessage: 'Vui lòng đăng nhập để thực hiện thao tác thanh toán.' });
    }

    const userHeaders = hasBearer
      ? {
          apikey: supabaseAnonKey || supabaseServiceKey,
          Authorization: bearer,
          'Content-Type': 'application/json',
        }
      : null;

    let order;
    try {
      if (action === 'sync_pending' && serviceHeaders && !hasBearer) {
        const saved = await request(
          `${supabaseUrl}/rest/v1/hoadon?ma_hd=eq.${numericId}&select=ma_hd,ma_kh,ngay_dat,thanh_tien,phuong_thuc_tt,trang_thai_tt,trang_thai_don,trang_thai_giu,thoi_han_hold,yeu_cau_dia_chi`,
          { headers: serviceHeaders }
        );
        const rows = saved.ok ? await saved.json().catch(() => []) : [];
        if (!Array.isArray(rows) || rows.length !== 1) {
          return reply(404, { success: false, errorMessage: 'Không tìm thấy đơn hàng.' });
        }
        order = rows[0];
      } else {
        const identity = await request(`${supabaseUrl}/auth/v1/user`, { headers: userHeaders });
        if (!identity.ok) {
          return reply(401, { success: false, errorMessage: 'Phiên đăng nhập không hợp lệ.' });
        }
        const saved = await request(
          `${supabaseUrl}/rest/v1/hoadon?ma_hd=eq.${numericId}&select=ma_hd,ma_kh,ngay_dat,thanh_tien,phuong_thuc_tt,trang_thai_tt,trang_thai_don,trang_thai_giu,thoi_han_hold,yeu_cau_dia_chi`,
          { headers: userHeaders }
        );
        if (!saved.ok) {
          return reply(502, { success: false, errorMessage: 'Chưa tải được đơn hàng từ máy chủ.' });
        }
        const rows = await saved.json();
        if (!Array.isArray(rows) || rows.length !== 1) {
          return reply(403, { success: false, errorMessage: 'Bạn không có quyền thao tác với đơn hàng này.' });
        }
        order = rows[0];
      }
    } catch {
      return reply(502, { success: false, errorMessage: 'Không kết nối được máy chủ xác thực.' });
    }

    const writeHeaders = serviceHeaders || userHeaders;

    // Kiểm tra xem đơn hàng đã có bản ghi giao dịch trong bảng `thanhtoan` chưa
    let paymentRow = null;
    if (serviceHeaders) {
      const ttRes = await request(`${supabaseUrl}/rest/v1/thanhtoan?ma_hd=eq.${numericId}&select=*`, {
        headers: serviceHeaders,
      }).catch(() => null);
      if (ttRes && ttRes.ok) {
        const ttRows = await ttRes.json().catch(() => []);
        if (Array.isArray(ttRows) && ttRows.length > 0) paymentRow = ttRows[0];
      }
    }

    // 3.1. Action 'sync_pending': Đối soát trạng thái đơn hàng & thời hạn giữ tồn kho
    if (action === 'sync_pending') {
      const effectivePaymentStatus = resolveEffectivePaymentStatus(order, Boolean(paymentRow));
      const isExpired = Boolean(
        order.trang_thai_don === 'Cancelled' &&
          effectivePaymentStatus === 'cancelled' &&
          order.yeu_cau_dia_chi &&
          String(order.yeu_cau_dia_chi.vnp_reason || '').includes('Quá thời hạn')
      );
      return reply(200, {
        success: true,
        orderId,
        expired: isExpired,
        paymentStatus: effectivePaymentStatus,
        orderStatus: order.trang_thai_don,
        stockHoldStatus: order.trang_thai_giu,
        holdExpiresAt: order.thoi_han_hold || (order.yeu_cau_dia_chi && order.yeu_cau_dia_chi.hold_expires_at) || null,
        transactionNo: paymentRow?.ma_giao_dich_cong || (order.yeu_cau_dia_chi && order.yeu_cau_dia_chi.vnp_transaction_no) || null,
      });
    }

    // 3.2. Action 'cancel_payment': Khách hàng chủ động hủy thanh toán VNPay khi đơn đang chờ thanh toán
    if (action === 'cancel_payment') {
      if (order.phuong_thuc_tt === 'COD') {
        return reply(400, { success: false, errorMessage: 'Đơn hàng COD không áp dụng hủy thanh toán VNPay.' });
      }
      if (order.trang_thai_tt === 'da_thanh_toan' && paymentRow) {
        return reply(409, { success: false, errorMessage: 'Đơn hàng đã thanh toán thành công, không thể hủy thanh toán.' });
      }
      if (order.trang_thai_don !== 'Pending' && order.trang_thai_don !== 'Cancelled') {
        return reply(409, { success: false, errorMessage: 'Đơn hàng đã chuyển sang bước xử lý, không thể hủy trực tiếp.' });
      }

      await releaseOrderReservedStock(order, writeHeaders);
      const nowIso = new Date().toISOString();
      await updateOrderPaymentState(
        order,
        {
          targetTt: 'da_huy_thanh_toan',
          targetDon: 'Cancelled',
          targetGiu: 'Released',
          metaPatch: {
            vnpay_status: 'da_huy_thanh_toan',
            vnp_response_code: '24',
            vnp_reason: 'Khách hàng chủ động hủy thanh toán VNPay',
            vnp_updated_at: nowIso,
          },
          cancelLogReason: '[VNPAY_CANCELLED] Khách hàng chủ động hủy giao dịch thanh toán VNPay.',
        },
        writeHeaders
      );

      return reply(200, {
        success: true,
        orderId,
        paymentStatus: 'cancelled',
        orderStatus: 'Cancelled',
        stockHoldStatus: 'Released',
      });
    }

    // 3.3. Action 'create': Khởi tạo đường dẫn thanh toán VNPay
    if (order.phuong_thuc_tt === 'COD') {
      return reply(409, { success: false, errorMessage: 'Đơn hàng COD không sử dụng cổng thanh toán VNPay.' });
    }
    if (order.trang_thai_tt === 'da_thanh_toan' && paymentRow) {
      return reply(409, { success: false, errorMessage: 'Đơn hàng này đã được thanh toán thành công.' });
    }
    if (order.trang_thai_don !== 'Pending' || !['Reserved', 'Hold'].includes(order.trang_thai_giu)) {
      return reply(409, {
        success: false,
        errorMessage: 'Đơn hàng đã hết thời hạn giữ tồn kho hoặc đã bị hủy. Vui lòng đặt lại đơn hàng mới.',
      });
    }

    const amount = Number(order.thanh_tien);
    if (!Number.isFinite(amount) || amount <= 0) {
      return reply(409, { success: false, errorMessage: 'Số tiền thanh toán của đơn hàng không hợp lệ.' });
    }

    // Thiết lập / gia hạn thời hạn giữ hàng (thoi_han_hold = 15 phút) cho phiên thanh toán VNPay
    const now = new Date();
    const expireDate = new Date(now.getTime() + VNPAY_HOLD_DURATION_MS);
    const holdExpiresIso = expireDate.toISOString();

    if (serviceHeaders) {
      const mergedMeta = Object.assign(
        {},
        order.yeu_cau_dia_chi && typeof order.yeu_cau_dia_chi === 'object' ? order.yeu_cau_dia_chi : {},
        {
          vnpay_status: 'chua_thanh_toan',
          hold_expires_at: holdExpiresIso,
        }
      );
      await request(`${supabaseUrl}/rest/v1/hoadon?ma_hd=eq.${numericId}`, {
        method: 'PATCH',
        headers: serviceHeaders,
        body: JSON.stringify({
          thoi_han_hold: holdExpiresIso,
          yeu_cau_dia_chi: mergedMeta,
        }),
      }).catch(() => null);
    }

    const proto = (req.headers?.['x-forwarded-proto'] || 'http').split(',')[0].trim();
    const host = (req.headers?.['x-forwarded-host'] || req.headers?.host || 'localhost:5173').split(',')[0].trim();
    const origin = (env.APP_ORIGIN || `${proto}://${host}`).replace(/\/$/, '');
    const ipAddr =
      (req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1')
        .toString()
        .split(',')[0]
        .trim() || '127.0.0.1';

    // Nếu là lần thanh toán lại (retry), gắn hậu tố timestamp để tránh lỗi trùng lặp vnp_TxnRef trên VNPay Sandbox
    const txnRef = retry ? `${orderId}_${Date.now()}` : orderId;

    const params = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Amount: Math.round(amount * 100),
      vnp_CreateDate: formatVnTime(now),
      vnp_ExpireDate: formatVnTime(expireDate),
      vnp_CurrCode: 'VND',
      vnp_IpAddr: ipAddr.includes(':') ? '127.0.0.1' : ipAddr,
      vnp_Locale: 'vn',
      vnp_OrderInfo: `Thanh toan don hang ${orderId} tai Curve Confidence`,
      vnp_OrderType: 'other',
      vnp_ReturnUrl: `${origin}/order-success/${encodeURIComponent(orderId)}`,
      vnp_TxnRef: txnRef,
    };
    const vnp_SecureHash = signParams(params, secret);
    return reply(200, {
      success: true,
      paymentUrl: `${payUrl}?${buildSignData(params)}&vnp_SecureHash=${vnp_SecureHash}`,
      holdExpiresAt: holdExpiresIso,
    });
  };
}

module.exports = createVnpayHandler();
module.exports.createVnpayHandler = createVnpayHandler;
module.exports.signParams = signParams;
module.exports.verifySignature = verifySignature;
module.exports.buildSignData = buildSignData;
