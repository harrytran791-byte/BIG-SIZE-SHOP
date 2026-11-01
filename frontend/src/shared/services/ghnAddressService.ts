import { supabase } from './supabaseClient';

export interface GhnAddressRegion {
  province: string;
  district: string;
  ward: string;
}

export type GhnAddressValidationResult =
  | { success: true; region: GhnAddressRegion; codes: { provinceId: number; districtId: number; wardCode: string } }
  | { success: true; addressSystem: 'new2'; region: GhnAddressRegion; codes: { provinceId: number; districtId: null; wardCode: string } }
  | { success: false; errorMessage: string };

const unavailableMessage = 'Hiện chưa thể kiểm tra địa chỉ giao hàng. Vui lòng thử lại sau; đơn hàng chưa được tạo.';
const regionMessage = 'Vui lòng kiểm tra tỉnh / thành phố, quận / huyện và phường / xã thuộc đúng khu vực nhận hàng.';
const sessionMessage = 'Vui lòng đăng nhập lại để kiểm tra địa chỉ giao hàng.';

function isName(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 100 && !/[\u0000-\u001f\u007f<>]/.test(value);
}

function isRegion(value: unknown): value is GhnAddressRegion {
  if (!value || typeof value !== 'object') return false;
  const region = value as GhnAddressRegion;
  return (region.district === '' || isName(region.district)) && isName(region.province) && isName(region.ward);
}

/** Validate the directory hierarchy only; never rewrite the recipient's address. */
export async function validateGhnAddress(region: GhnAddressRegion): Promise<GhnAddressValidationResult> {
  if (!isRegion(region)) return { success: false, errorMessage: regionMessage };
  try {
    const { data, error } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (error || !token) return { success: false, errorMessage: sessionMessage };
    const response = await fetch('/api/ghn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'validate_address', region: { province: region.province, district: region.district, ward: region.ward } }),
      signal: AbortSignal.timeout(45000),
    });
    // Never display raw gateway/provider errors, which can contain technical details.
    if (!response.ok) {
      const errorMessage = response.status === 401 || response.status === 403 ? sessionMessage
        : response.status === 400 || response.status === 422 ? regionMessage : unavailableMessage;
      return { success: false, errorMessage };
    }
    const result = await response.json();
    const codes = result?.codes;
    const isNewAddress = result?.addressSystem === 'new2';
    if (result?.success !== true || !isRegion(result.region)
      || isNewAddress !== (region.district === '')
      || (!isNewAddress && result.addressSystem !== undefined)
      || !Number.isSafeInteger(codes?.provinceId) || codes.provinceId < 1
      || (isNewAddress ? result.region.district !== '' || codes?.districtId !== null
        : !result.region.district || !Number.isSafeInteger(codes?.districtId) || codes.districtId < 1)
      || !isName(codes?.wardCode)) {
      return { success: false, errorMessage: unavailableMessage };
    }
    const validatedRegion = { province: result.region.province, district: result.region.district, ward: result.region.ward };
    if (isNewAddress) {
      return { success: true, addressSystem: 'new2', region: validatedRegion,
        codes: { provinceId: codes.provinceId, districtId: null, wardCode: codes.wardCode } };
    }
    return { success: true, region: validatedRegion,
      codes: { provinceId: codes.provinceId, districtId: codes.districtId, wardCode: codes.wardCode } };
  } catch {
    return { success: false, errorMessage: unavailableMessage };
  }
}
