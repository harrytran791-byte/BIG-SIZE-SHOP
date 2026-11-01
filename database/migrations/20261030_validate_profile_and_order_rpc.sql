-- Migration: Bổ sung ràng buộc kiểm tra dữ liệu (Input Validation) tại tầng Database RPC
-- Áp dụng cho public.cc_update_profile và kiểm tra định dạng Họ tên & Số điện thoại Việt Nam (10 chữ số)

CREATE OR REPLACE FUNCTION public.cc_update_profile(
  p_name text,
  p_phone text DEFAULT NULL,
  p_address text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id integer := public.cc_account_id();
  v_clean_name text;
  v_clean_phone text;
BEGIN
  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  -- Tự động loại bỏ khoảng trắng thừa ở đầu, cuối và giữa các từ
  v_clean_name := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
  v_clean_phone := btrim(coalesce(p_phone, ''));

  -- 1. Kiểm tra Họ và tên: 2-100 ký tự, chỉ chữ cái Unicode và khoảng trắng đơn
  IF char_length(v_clean_name) < 2 OR char_length(v_clean_name) > 100 OR v_clean_name !~ '^[[:alpha:]]+( [[:alpha:]]+)*$' THEN
    RAISE EXCEPTION 'INVALID_FULL_NAME: Họ và tên phải từ 2 đến 100 ký tự và chỉ chứa chữ cái hợp lệ.';
  END IF;

  -- 2. Kiểm tra Số điện thoại: bắt buộc đúng 10 chữ số di động Việt Nam bắt đầu bằng 0
  IF v_clean_phone !~ '^0(3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-46-9])[0-9]{7}$' THEN
    RAISE EXCEPTION 'INVALID_PHONE: Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam gồm 10 chữ số.';
  END IF;

  IF p_address IS NOT NULL AND char_length(p_address) > 500 THEN
    RAISE EXCEPTION 'INVALID_ADDRESS';
  END IF;

  UPDATE public.taikhoan
  SET ho_ten = v_clean_name,
      so_dien_thoai = v_clean_phone,
      dia_chi = COALESCE(NULLIF(btrim(p_address), ''), dia_chi)
  WHERE ma_tk = v_account_id;

  RETURN public.cc_my_account();
END;
$$;

