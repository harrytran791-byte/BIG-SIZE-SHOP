-- =====================================================================================
-- MIGRATION: SỬA LỖI THANH TOÁN VNPAY, ĐỒNG BỘ TRẠNG THÁI ĐƠN HÀNG & RESERVED STOCK
-- Ngày tạo: 2026-10-31
-- Mục tiêu:
--   1. Mở rộng ràng buộc CHECK `hoadon_trang_thai_tt_check` hỗ trợ đầy đủ các trạng thái:
--      - 'chua_thanh_toan'     (Chờ thanh toán)
--      - 'da_thanh_toan'       (Đã thanh toán)
--      - 'thanh_toan_that_bai' (Thanh toán thất bại)
--      - 'da_huy_thanh_toan'   (Đã hủy thanh toán)
--      - 'da_hoan_tien'        (Đã hoàn tiền)
--   2. Cập nhật `cc_place_order`: Đơn Online/VNPay luôn khởi tạo `chua_thanh_toan`,
--      giữ tồn kho `Reserved` kèm `thoi_han_hold = now() + interval '15 minutes'`.
--   3. Bổ sung `cc_expire_stale_online_orders`: Giải phóng Reserved Stock cho các đơn
--      Online quá hạn giữ hàng (15 phút) chưa thanh toán, không giữ kho vô thời hạn.
--   4. Cập nhật `cc_process_vnpay_callback` & khóa bảo mật `cc_record_online_payment`:
--      Xử lý nguyên tử (atomic) và bất biến (idempotent) cho 3 kết quả:
--      Thành công ('00'), Khách hủy ('24'), Thất bại (mã khác), chống trừ/hoàn kho 2 lần.
--   5. Cập nhật `cc_order_transition`: Chặn tuyệt đối Manager xác nhận, đóng gói hoặc
--      bàn giao vận chuyển đối với đơn Online/VNPay chưa có `trang_thai_tt = 'da_thanh_toan'`.
--   6. Đối soát và làm sạch dữ liệu cũ bị sai lệch trạng thái (BS-HD057, BS-HD062, ...).
-- =====================================================================================

BEGIN;

-- 1. Mở rộng CHECK constraint cho cột `trang_thai_tt` trên bảng `hoadon`
ALTER TABLE public.hoadon DROP CONSTRAINT IF EXISTS hoadon_trang_thai_tt_check;
ALTER TABLE public.hoadon
  ADD CONSTRAINT hoadon_trang_thai_tt_check
  CHECK (trang_thai_tt IN (
    'chua_thanh_toan',
    'da_thanh_toan',
    'thanh_toan_that_bai',
    'da_huy_thanh_toan',
    'da_hoan_tien'
  ));

-- 2. Hàm tự động giải phóng Reserved Stock cho đơn Online chờ thanh toán đã quá hạn hold (15 phút)
CREATE OR REPLACE FUNCTION public.cc_expire_stale_online_orders() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  h record;
  x record;
  expired_count integer := 0;
BEGIN
  FOR h IN
    SELECT ma_hd, yeu_cau_dia_chi
    FROM public.hoadon
    WHERE phuong_thuc_tt <> 'COD'
      AND trang_thai_tt = 'chua_thanh_toan'
      AND trang_thai_don = 'Pending'
      AND trang_thai_giu IN ('Hold', 'Reserved')
      AND COALESCE(thoi_han_hold, ngay_dat + interval '15 minutes') < now()
      AND NOT EXISTS (SELECT 1 FROM public.thanhtoan t WHERE t.ma_hd = hoadon.ma_hd)
    ORDER BY ma_hd
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Khóa biến thể theo thứ tự ma_ctsp để tránh deadlock
    PERFORM c.ma_ctsp
    FROM public.chitietsanpham c
    JOIN public.chitiethoadon d USING (ma_ctsp)
    WHERE d.ma_hd = h.ma_hd
    ORDER BY c.ma_ctsp
    FOR UPDATE OF c;

    FOR x IN
      SELECT ma_ctsp, SUM(so_luong)::integer AS quantity
      FROM public.chitiethoadon
      WHERE ma_hd = h.ma_hd
      GROUP BY ma_ctsp
    LOOP
      UPDATE public.chitietsanpham
      SET so_luong_giu = GREATEST(0, so_luong_giu - x.quantity)
      WHERE ma_ctsp = x.ma_ctsp;
    END LOOP;

    UPDATE public.hoadon
    SET trang_thai_don = 'Cancelled',
        trang_thai_tt = 'da_huy_thanh_toan',
        trang_thai_giu = 'Released',
        thoi_han_hold = NULL,
        yeu_cau_dia_chi = COALESCE(h.yeu_cau_dia_chi, '{}'::jsonb) || jsonb_build_object(
          'vnpay_status', 'da_huy_thanh_toan',
          'vnp_reason', 'Het_thoi_han_giu_hang_15_phut',
          'vnp_updated_at', now()
        )
    WHERE ma_hd = h.ma_hd;

    expired_count := expired_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'expired_count', expired_count);
END $$;

REVOKE ALL ON FUNCTION public.cc_expire_stale_online_orders() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cc_expire_stale_online_orders() TO anon, authenticated, service_role;

-- 3. Cập nhật `cc_place_order`:
--    - Giải phóng các đơn Online hết hạn hold trước khi kiểm tra tồn kho
--    - Khởi tạo `trang_thai_tt = 'chua_thanh_toan'`
--    - Đặt `thoi_han_hold = now() + interval '15 minutes'` cho đơn Online/VNPay
CREATE OR REPLACE FUNCTION public.cc_place_order(
  p_request_id text,
  p_items jsonb,
  p_shipping jsonb,
  p_method text,
  p_voucher text DEFAULT NULL,
  p_shipping_method text DEFAULT 'standard',
  p_expected_total numeric DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor_id uuid := auth.uid();
  account_id integer := public.cc_account_id();
  customer_id integer;
  saved cc_private.mutations;
  hd integer;
  x record;
  v public.chitietsanpham;
  total numeric := 0;
  fee numeric;
  reduction numeric := 0;
  discount numeric := 0;
  coupon public.voucher;
  item_name text;
  item_size text;
  result jsonb;
  payload jsonb;
  is_online boolean;
  hold_until timestamptz;
BEGIN
  IF account_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  -- Dọn dẹp các đơn Online treo quá hạn 15 phút trước khi giữ tồn kho mới
  PERFORM public.cc_expire_stale_online_orders();

  IF p_request_id IS NULL OR p_items IS NULL OR length(p_request_id) NOT BETWEEN 1 AND 80
     OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 100
     OR p_shipping IS NULL OR length(p_shipping::text) > 4000
     OR p_method IS NULL OR p_shipping_method IS NULL
     OR p_shipping_method NOT IN ('standard', 'express')
     OR p_method NOT IN ('cod', 'vietqr', 'momo', 'vnpay') THEN
    RAISE EXCEPTION 'Invalid order';
  END IF;

  payload := jsonb_build_object(
    'items', p_items,
    'shipping', p_shipping,
    'method', p_method,
    'voucher', p_voucher,
    'shipping_method', p_shipping_method,
    'total', p_expected_total
  );

  PERFORM pg_advisory_xact_lock(hashtextextended(actor_id::text || ':order:' || p_request_id, 0));
  SELECT * INTO saved FROM cc_private.mutations WHERE actor = actor_id AND kind = 'order' AND key = p_request_id;
  IF FOUND THEN
    IF saved.payload <> payload THEN RAISE EXCEPTION 'Idempotency key reused'; END IF;
    RETURN saved.result;
  END IF;

  IF length(btrim(coalesce(p_shipping->>'fullName', ''))) NOT BETWEEN 2 AND 150
     OR length(coalesce(p_shipping->>'phone', '')) NOT BETWEEN 9 AND 20
     OR length(coalesce(p_shipping->>'addressDetail', '')) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION 'Invalid shipping address';
  END IF;

  SELECT ma_kh INTO customer_id FROM public.khachhang WHERE ma_tk = account_id AND trangthai = 'hoat_dong';
  IF customer_id IS NULL THEN RAISE EXCEPTION 'Customer profile required'; END IF;

  IF EXISTS(
    SELECT 1 FROM jsonb_array_elements(p_items) i
    WHERE coalesce(i->>'quantity', '') !~ '^[1-9][0-9]{0,3}$' OR coalesce(i->>'sku', '') = ''
  ) THEN
    RAISE EXCEPTION 'Invalid quantity';
  END IF;

  PERFORM c.ma_ctsp FROM public.chitietsanpham c
  WHERE c.sku IN (SELECT i->>'sku' FROM jsonb_array_elements(p_items) i)
  ORDER BY c.ma_ctsp FOR UPDATE;

  FOR x IN
    SELECT i->>'sku' AS sku, sum((i->>'quantity')::integer)::integer AS quantity
    FROM jsonb_array_elements(p_items) i
    GROUP BY i->>'sku'
  LOOP
    SELECT * INTO v FROM public.chitietsanpham WHERE sku = x.sku AND trang_thai = 'dang_kinh_doanh';
    IF NOT FOUND OR v.so_luong_ton - v.so_luong_giu < x.quantity THEN
      RAISE EXCEPTION 'Insufficient stock';
    END IF;
    total := total + v.don_gia * x.quantity;
  END LOOP;

  fee := (CASE WHEN total >= 500000 THEN 0 ELSE 30000 END)
       + (CASE WHEN p_shipping_method = 'express' THEN 35000 ELSE 0 END);

  IF p_voucher IS NOT NULL THEN
    SELECT * INTO coupon FROM public.voucher
    WHERE code = p_voucher AND trang_thai = 'dang_hoat_dong'
      AND (ngay_bat_dau IS NULL OR ngay_bat_dau <= now())
      AND (ngay_ket_thuc IS NULL OR ngay_ket_thuc >= now())
    FOR UPDATE;
    IF NOT FOUND OR total < coalesce(coupon.don_toi_thieu, 0) THEN
      RAISE EXCEPTION 'Voucher unavailable';
    END IF;
    IF coupon.gia_tri_giam IS NULL OR coupon.gia_tri_giam < 0
       OR (coupon.loai_giam = 'phan_tram' AND coupon.gia_tri_giam > 100)
       OR coupon.giam_toi_da < 0 OR coupon.don_toi_thieu < 0 THEN
      RAISE EXCEPTION 'Voucher unavailable';
    END IF;
    reduction := CASE
      WHEN coupon.loai_giam = 'phan_tram' THEN
        round((CASE WHEN coupon.loai_voucher = 'van_chuyen' THEN fee ELSE total END) * coupon.gia_tri_giam / 100)
      ELSE coupon.gia_tri_giam
    END;
    IF coupon.giam_toi_da IS NOT NULL THEN reduction := least(reduction, coupon.giam_toi_da); END IF;
    IF coupon.loai_voucher = 'van_chuyen' THEN
      fee := fee - least(fee, greatest(0, reduction));
    ELSE
      discount := least(total, greatest(0, reduction));
    END IF;
  END IF;

  IF p_expected_total IS NULL OR p_expected_total <> total - discount + fee THEN
    RAISE EXCEPTION 'Price changed; reload checkout';
  END IF;

  is_online := (p_method <> 'cod');
  hold_until := CASE WHEN is_online THEN now() + interval '15 minutes' ELSE NULL END;

  INSERT INTO public.hoadon(
    ma_kh, ten_nguoi_nhan, sdt_nguoi_nhan, dia_chi_giao,
    tong_tien_hang, giam_gia, phi_van_chuyen, thanh_tien,
    phuong_thuc_tt, trang_thai_tt, trang_thai_don, trang_thai_giu,
    thoi_han_hold, ma_voucher, yeu_cau_dia_chi
  )
  VALUES (
    customer_id,
    btrim(p_shipping->>'fullName'),
    p_shipping->>'phone',
    concat_ws(', ', p_shipping->>'addressDetail', p_shipping->>'ward', p_shipping->>'district', p_shipping->>'province'),
    total,
    discount,
    fee,
    total - discount + fee,
    CASE WHEN is_online THEN 'Online' ELSE 'COD' END,
    'chua_thanh_toan',
    'Pending',
    'Reserved',
    hold_until,
    coupon.ma_voucher,
    CASE WHEN is_online THEN jsonb_build_object('vnpay_status', 'chua_thanh_toan', 'hold_expires_at', hold_until) ELSE NULL END
  )
  RETURNING ma_hd INTO hd;

  FOR x IN
    SELECT i->>'sku' AS sku, sum((i->>'quantity')::integer)::integer AS quantity
    FROM jsonb_array_elements(p_items) i
    GROUP BY i->>'sku'
  LOOP
    SELECT * INTO STRICT v FROM public.chitietsanpham WHERE sku = x.sku;
    SELECT ten_sp INTO item_name FROM public.sanpham WHERE ma_sp = v.ma_sp AND trang_thai = 'dang_kinh_doanh';
    IF item_name IS NULL THEN RAISE EXCEPTION 'Product unavailable'; END IF;
    SELECT kich_co INTO item_size FROM public.bangsize WHERE ma_bang_size = v.ma_bang_size;
    UPDATE public.chitietsanpham SET so_luong_giu = so_luong_giu + x.quantity WHERE ma_ctsp = v.ma_ctsp;
    INSERT INTO public.chitiethoadon(ma_hd, ma_ctsp, so_luong, don_gia, thanh_tien, sku_mua, ten_sp_mua, kich_co_mua, mau_sac_mua)
    VALUES (hd, v.ma_ctsp, x.quantity, v.don_gia, v.don_gia * x.quantity, v.sku, item_name, item_size, v.mau_sac);
  END LOOP;

  result := jsonb_build_object('success', true, 'order_id', hd, 'hold_expires_at', hold_until);
  INSERT INTO cc_private.mutations VALUES (actor_id, 'order', p_request_id, payload, result);
  RETURN result;
END $$;

REVOKE ALL ON FUNCTION public.cc_place_order(text, jsonb, jsonb, text, text, text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cc_place_order(text, jsonb, jsonb, text, text, text, numeric) TO authenticated;

-- 4. Cập nhật `cc_cancel_order`: Khi hủy đơn Online chưa thanh toán, cập nhật `da_huy_thanh_toan`
CREATE OR REPLACE FUNCTION public.cc_cancel_order(p_order_id integer, p_reason text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  h public.hoadon;
  x record;
  owned boolean;
  next_payment_status text;
BEGIN
  IF public.cc_account_id() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO h FROM public.hoadon WHERE ma_hd = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.khachhang WHERE ma_kh = h.ma_kh AND ma_tk = public.cc_account_id()) INTO owned;
  IF NOT (public.cc_staff() OR owned) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;
  IF h.trang_thai_don = 'Cancelled' THEN
    RETURN jsonb_build_object('success', true, 'order_id', h.ma_hd);
  END IF;
  IF h.trang_thai_don NOT IN ('Pending', 'Confirmed') OR (NOT public.cc_staff() AND h.trang_thai_don <> 'Pending') THEN
    RAISE EXCEPTION 'Order cannot be cancelled';
  END IF;
  IF length(btrim(coalesce(p_reason, ''))) NOT BETWEEN 1 AND 1000 THEN
    RAISE EXCEPTION 'Invalid reason';
  END IF;
  IF h.trang_thai_giu NOT IN ('Hold', 'Reserved') THEN
    RAISE EXCEPTION 'Order is no longer reserved';
  END IF;

  PERFORM c.ma_ctsp FROM public.chitietsanpham c JOIN public.chitiethoadon d USING (ma_ctsp)
  WHERE d.ma_hd = h.ma_hd ORDER BY c.ma_ctsp FOR UPDATE OF c;

  FOR x IN SELECT ma_ctsp, sum(so_luong)::integer AS quantity FROM public.chitiethoadon WHERE ma_hd = h.ma_hd GROUP BY ma_ctsp LOOP
    UPDATE public.chitietsanpham SET so_luong_giu = GREATEST(0, so_luong_giu - x.quantity)
    WHERE ma_ctsp = x.ma_ctsp;
  END LOOP;

  next_payment_status := CASE
    WHEN h.phuong_thuc_tt <> 'COD' AND h.trang_thai_tt = 'chua_thanh_toan' THEN 'da_huy_thanh_toan'
    ELSE h.trang_thai_tt
  END;

  UPDATE public.hoadon
  SET trang_thai_don = 'Cancelled',
      trang_thai_giu = 'Released',
      trang_thai_tt = next_payment_status,
      thoi_han_hold = NULL,
      yeu_cau_dia_chi = CASE
        WHEN h.phuong_thuc_tt <> 'COD' AND h.trang_thai_tt = 'chua_thanh_toan' THEN
          COALESCE(h.yeu_cau_dia_chi, '{}'::jsonb) || jsonb_build_object('vnpay_status', 'da_huy_thanh_toan', 'vnp_updated_at', now())
        ELSE h.yeu_cau_dia_chi
      END
  WHERE ma_hd = h.ma_hd;

  UPDATE public.yeucauhuy
  SET trang_thai = 'da_duyet', ghi_chu_xu_ly = p_reason
  WHERE ma_hd = h.ma_hd AND trang_thai = 'cho_xu_ly';

  RETURN jsonb_build_object('success', true, 'order_id', h.ma_hd);
END $$;

-- 5. Cập nhật `cc_order_transition`:
--    Chặn tuyệt đối Manager xác nhận (Confirmed), lấy hàng (Da_lay_hang), giao hàng (Dang_giao)
--    đối với đơn Online/VNPay chưa thanh toán thành công!
CREATE OR REPLACE FUNCTION public.cc_order_transition(
  p_order_id integer,
  p_status text,
  p_carrier text DEFAULT '',
  p_tracking text DEFAULT ''
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  h public.hoadon;
  target text;
  x record;
BEGIN
  IF NOT public.cc_staff() THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_status = 'delivered' THEN
    RAISE EXCEPTION 'Carrier observation or documented exception required';
  END IF;
  target := CASE p_status
    WHEN 'confirmed' THEN 'Confirmed'
    WHEN 'preparing' THEN 'Da_lay_hang'
    WHEN 'shipping' THEN 'Dang_giao'
    WHEN 'delivered' THEN 'Giao_thanh_cong'
  END;

  SELECT * INTO h FROM public.hoadon WHERE ma_hd = p_order_id FOR UPDATE;
  IF NOT FOUND OR target IS NULL THEN
    RAISE EXCEPTION 'Invalid order';
  END IF;

  -- CHẶN XỬ LÝ ĐƠN VNPAY/ONLINE CHƯA THANH TOÁN THÀNH CÔNG
  IF h.phuong_thuc_tt <> 'COD' AND (
    h.trang_thai_tt <> 'da_thanh_toan'
    OR NOT EXISTS (SELECT 1 FROM public.thanhtoan t WHERE t.ma_hd = h.ma_hd AND t.so_tien = h.thanh_tien)
  ) THEN
    RAISE EXCEPTION 'Đơn hàng thanh toán trực tuyến (VNPay) chưa được xác nhận thanh toán thành công. Không thể xác nhận hoặc bàn giao vận chuyển.';
  END IF;

  IF h.trang_thai_don = target THEN
    RETURN jsonb_build_object('success', true);
  END IF;

  IF NOT (
    (h.trang_thai_don = 'Pending' AND target = 'Confirmed')
    OR (h.trang_thai_don = 'Confirmed' AND target IN ('Da_lay_hang', 'Dang_giao'))
    OR (h.trang_thai_don = 'Da_lay_hang' AND target = 'Dang_giao')
    OR (h.trang_thai_don = 'Dang_giao' AND target = 'Giao_thanh_cong')
  ) THEN
    RAISE EXCEPTION 'Invalid order transition';
  END IF;

  IF target = 'Dang_giao' THEN
    IF length(btrim(p_tracking)) NOT BETWEEN 3 AND 100 OR p_carrier NOT IN ('GHTK', 'GHN', 'ViettelPost') THEN
      RAISE EXCEPTION 'Real tracking required';
    END IF;
    IF h.trang_thai_giu <> 'Reserved' THEN
      RAISE EXCEPTION 'Reservation required';
    END IF;
    PERFORM c.ma_ctsp FROM public.chitietsanpham c JOIN public.chitiethoadon d USING (ma_ctsp)
    WHERE d.ma_hd = h.ma_hd ORDER BY c.ma_ctsp FOR UPDATE OF c;
    FOR x IN SELECT ma_ctsp, sum(so_luong)::integer AS quantity FROM public.chitiethoadon WHERE ma_hd = h.ma_hd GROUP BY ma_ctsp LOOP
      UPDATE public.chitietsanpham
      SET so_luong_ton = so_luong_ton - x.quantity,
          so_luong_giu = so_luong_giu - x.quantity
      WHERE ma_ctsp = x.ma_ctsp AND so_luong_giu >= x.quantity;
      IF NOT FOUND THEN RAISE EXCEPTION 'Reservation mismatch'; END IF;
    END LOOP;
    INSERT INTO public.vandon(ma_hd, don_vi_van_chuyen, ma_tracking, ngay_ban_giao)
    VALUES (h.ma_hd, p_carrier, p_tracking, now())
    ON CONFLICT (ma_hd) DO UPDATE
    SET don_vi_van_chuyen = excluded.don_vi_van_chuyen,
        ma_tracking = excluded.ma_tracking,
        ngay_ban_giao = excluded.ngay_ban_giao;
  END IF;

  IF target = 'Giao_thanh_cong' THEN
    UPDATE public.vandon SET ngay_giao_thanh_cong = now() WHERE ma_hd = h.ma_hd;
    IF NOT FOUND THEN RAISE EXCEPTION 'Delivery record missing'; END IF;
  END IF;

  UPDATE public.hoadon
  SET trang_thai_don = target,
      trang_thai_giu = CASE WHEN target = 'Dang_giao' THEN 'Deducted' ELSE trang_thai_giu END
  WHERE ma_hd = h.ma_hd;

  RETURN jsonb_build_object('success', true);
END $$;

-- 6. Hàm xử lý kết quả giao dịch VNPay nguyên tử & bất biến (`cc_process_vnpay_callback`)
--    Chỉ cho phép `service_role` (Backend đã xác thực chữ ký HMAC-SHA512) gọi.
CREATE OR REPLACE FUNCTION public.cc_process_vnpay_callback(
  p_order_id integer,
  p_response_code text,
  p_transaction_status text,
  p_trans_no text,
  p_amount numeric,
  p_bank_code text DEFAULT NULL,
  p_pay_date text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  h public.hoadon;
  x record;
  is_success boolean;
  is_cancelled boolean;
  target_tt text;
BEGIN
  SELECT * INTO h FROM public.hoadon WHERE ma_hd = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'rsp_code', '01', 'message', 'Order not found');
  END IF;

  IF h.phuong_thuc_tt = 'COD' THEN
    RETURN jsonb_build_object('success', false, 'rsp_code', '01', 'message', 'COD order cannot process VNPay callback');
  END IF;

  IF p_amount IS NULL OR p_amount <> h.thanh_tien THEN
    RETURN jsonb_build_object('success', false, 'rsp_code', '04', 'message', 'Invalid amount');
  END IF;

  -- Nếu đơn đã được xác nhận thanh toán thành công trước đó -> Idempotent return (không cập nhật đè, không trừ/hoàn kho lại)
  IF h.trang_thai_tt = 'da_thanh_toan' AND EXISTS (SELECT 1 FROM public.thanhtoan t WHERE t.ma_hd = h.ma_hd) THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_confirmed', true,
      'rsp_code', '02',
      'payment_status', 'paid',
      'order_status', h.trang_thai_don
    );
  END IF;

  is_success := (p_response_code = '00' AND p_transaction_status = '00' AND coalesce(btrim(p_trans_no), '') NOT IN ('', '0'));
  is_cancelled := (p_response_code = '24');

  IF is_success THEN
    -- Trường hợp 1: Thanh toán VNPay THÀNH CÔNG
    INSERT INTO public.thanhtoan(ma_hd, ma_giao_dich_cong, so_tien, phuong_thuc, ngay_thanh_toan)
    VALUES (h.ma_hd, btrim(p_trans_no), h.thanh_tien, 'VNPay', now())
    ON CONFLICT (ma_hd) DO NOTHING;

    UPDATE public.hoadon
    SET trang_thai_tt = 'da_thanh_toan',
        thoi_han_hold = NULL,
        yeu_cau_dia_chi = COALESCE(h.yeu_cau_dia_chi, '{}'::jsonb) || jsonb_build_object(
          'vnpay_status', 'da_thanh_toan',
          'vnp_response_code', p_response_code,
          'vnp_transaction_status', p_transaction_status,
          'vnp_transaction_no', btrim(p_trans_no),
          'vnp_bank_code', p_bank_code,
          'vnp_pay_date', p_pay_date,
          'vnp_updated_at', now()
        )
    WHERE ma_hd = h.ma_hd;

    RETURN jsonb_build_object(
      'success', true,
      'already_confirmed', false,
      'rsp_code', '00',
      'payment_status', 'paid',
      'order_status', h.trang_thai_don
    );
  ELSE
    -- Trường hợp 2 & 3: Khách hàng HỦY ('24') hoặc Thanh toán THẤT BẠI (mã khác)
    target_tt := CASE WHEN is_cancelled THEN 'da_huy_thanh_toan' ELSE 'thanh_toan_that_bai' END;

    -- Giải phóng Reserved Stock đúng 1 lần duy nhất nếu đang giữ ('Hold' hoặc 'Reserved')
    IF h.trang_thai_giu IN ('Hold', 'Reserved') THEN
      PERFORM c.ma_ctsp FROM public.chitietsanpham c JOIN public.chitiethoadon d USING (ma_ctsp)
      WHERE d.ma_hd = h.ma_hd ORDER BY c.ma_ctsp FOR UPDATE OF c;

      FOR x IN SELECT ma_ctsp, sum(so_luong)::integer AS quantity FROM public.chitiethoadon WHERE ma_hd = h.ma_hd GROUP BY ma_ctsp LOOP
        UPDATE public.chitietsanpham
        SET so_luong_giu = GREATEST(0, so_luong_giu - x.quantity)
        WHERE ma_ctsp = x.ma_ctsp;
      END LOOP;
    END IF;

    UPDATE public.hoadon
    SET trang_thai_tt = target_tt,
        trang_thai_don = 'Cancelled',
        trang_thai_giu = CASE WHEN h.trang_thai_giu IN ('Hold', 'Reserved') THEN 'Released' ELSE h.trang_thai_giu END,
        thoi_han_hold = NULL,
        yeu_cau_dia_chi = COALESCE(h.yeu_cau_dia_chi, '{}'::jsonb) || jsonb_build_object(
          'vnpay_status', target_tt,
          'vnp_response_code', p_response_code,
          'vnp_transaction_status', p_transaction_status,
          'vnp_transaction_no', nullif(btrim(coalesce(p_trans_no, '')), ''),
          'vnp_bank_code', p_bank_code,
          'vnp_pay_date', p_pay_date,
          'vnp_updated_at', now()
        )
    WHERE ma_hd = h.ma_hd;

    RETURN jsonb_build_object(
      'success', true,
      'already_confirmed', false,
      'rsp_code', '00',
      'payment_status', CASE WHEN is_cancelled THEN 'cancelled' ELSE 'failed' END,
      'order_status', 'Cancelled'
    );
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.cc_process_vnpay_callback(integer, text, text, text, numeric, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cc_process_vnpay_callback(integer, text, text, text, numeric, text, text) TO service_role;

-- 7. Khóa bảo mật `cc_record_online_payment` để không cho phép client tự ý truyền mã giao dịch giả (như TEST_PROBE)
CREATE OR REPLACE FUNCTION public.cc_record_online_payment(
  p_order_id integer,
  p_trans_no text,
  p_amount numeric,
  p_method text DEFAULT 'VNPay'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  -- Chỉ cho phép service_role (Backend sau khi đã kiểm tra chữ ký HMAC-SHA512 của VNPay) ghi nhận thanh toán
  IF current_user IN ('anon', 'authenticated') THEN
    RAISE EXCEPTION 'Direct client payment recording is forbidden; payment must be verified by server callback' USING ERRCODE = '42501';
  END IF;
  RETURN public.cc_process_vnpay_callback(p_order_id, '00', '00', p_trans_no, p_amount, p_method, NULL);
END $$;

REVOKE ALL ON FUNCTION public.cc_record_online_payment(integer, text, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cc_record_online_payment(integer, text, numeric, text) TO service_role;

-- 8. ĐỐI SOÁT VÀ LÀM SẠCH DỮ LIỆU ĐƠN VNPAY CŨ BỊ LỆCH TRẠNG THÁI
-- 8.1. Xóa giao dịch giả 'TEST_PROBE' trên đơn BS-HD062 (ma_hd = 62)
DELETE FROM public.thanhtoan WHERE ma_hd = 62 AND ma_giao_dich_cong = 'TEST_PROBE';

-- 8.2. Đơn BS-HD004 (ma_hd = 4) đã Cancelled nhưng trạng thái giữ kho còn kẹt 'Reserved' -> chuyển sang 'Released'
UPDATE public.hoadon
SET trang_thai_giu = 'Released'
WHERE ma_hd = 4 AND trang_thai_don = 'Cancelled' AND trang_thai_giu = 'Reserved';

-- 8.3. Các đơn Online đã Cancelled và KHÔNG có bản ghi giao dịch hợp lệ trong bảng `thanhtoan`
--      (bao gồm BS-HD057, BS-HD062, BS-HD004, BS-HD005, BS-HD006, BS-HD013, BS-HD027, BS-HD029,
--       BS-HD039, BS-HD040, BS-HD044, BS-HD053, BS-HD054, BS-HD056, BS-HD061)
--      -> Cập nhật `trang_thai_tt = 'da_huy_thanh_toan'` để đồng bộ với thực tế hủy thanh toán.
UPDATE public.hoadon h
SET trang_thai_tt = 'da_huy_thanh_toan',
    thoi_han_hold = NULL,
    yeu_cau_dia_chi = COALESCE(h.yeu_cau_dia_chi, '{}'::jsonb) || jsonb_build_object(
      'vnpay_status', 'da_huy_thanh_toan',
      'vnp_reconciled_at', now()
    )
WHERE h.phuong_thuc_tt <> 'COD'
  AND h.trang_thai_don = 'Cancelled'
  AND NOT EXISTS (SELECT 1 FROM public.thanhtoan t WHERE t.ma_hd = h.ma_hd);

COMMIT;

