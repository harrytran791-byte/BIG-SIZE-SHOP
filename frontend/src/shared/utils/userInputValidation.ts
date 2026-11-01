import { ShippingAddress, UserAccount } from '@/types';

export const INVALID_VN_PHONE_MESSAGE =
  'Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam gồm 10 chữ số.';

/**
 * Đầu số di động Việt Nam hợp lệ gồm đúng 10 chữ số, bắt đầu bằng 0:
 * - Viettel: 032..039, 086, 096..098
 * - Mobifone: 070, 076..079, 089, 090, 093
 * - Vinaphone: 081..085, 088, 091, 094
 * - Vietnamobile: 052, 056, 058, 092
 * - Gmobile / Itelecom / Wintel / Reddi: 055, 059, 087, 099
 */
export const VN_MOBILE_PHONE_REGEX = /^0(3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-46-9])\d{7}$/;

/**
 * Chuẩn hóa Họ và tên: loại bỏ khoảng trắng thừa ở đầu, cuối và giữa các từ.
 */
export const normalizeFullName = (value: string | null | undefined): string => {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
};

/**
 * 1. Kiểm tra Họ và tên:
 * - Bắt buộc nhập, không được để trống hoặc chỉ chứa khoảng trắng.
 * - Cho phép chữ cái tiếng Việt có dấu và khoảng trắng hợp lệ.
 * - Không chấp nhận số hoặc ký tự đặc biệt không phù hợp.
 * - Độ dài từ 2–100 ký tự (sau khi chuẩn hóa khoảng trắng).
 */
export const validateFullName = (
  value: string | null | undefined,
  fieldLabel = 'Họ và tên'
): string | null => {
  const normalized = normalizeFullName(value);
  if (!normalized) {
    return `${fieldLabel} không được để trống.`;
  }
  if (normalized.length < 2 || normalized.length > 100) {
    return `${fieldLabel} phải có độ dài từ 2 đến 100 ký tự.`;
  }
  // Chỉ cho phép chữ cái Unicode (bao gồm đầy đủ tiếng Việt có dấu) và khoảng trắng đơn giữa các từ
  if (!/^[\p{L}]+(?:\s[\p{L}]+)*$/u.test(normalized)) {
    return `${fieldLabel} chỉ được chứa chữ cái tiếng Việt và khoảng trắng hợp lệ, không bao gồm số hoặc ký tự đặc biệt.`;
  }
  return null;
};

/**
 * 2. Kiểm tra Số điện thoại:
 * - Bắt buộc nhập.
 * - Chỉ chấp nhận đúng 10 chữ số, bắt đầu bằng 0 và có đầu số di động hợp lệ tại Việt Nam.
 * - Không chấp nhận chữ cái, ký tự đặc biệt hoặc khoảng trắng.
 * - Giới hạn tối đa 10 chữ số khi nhập.
 * - Nếu không hợp lệ, hiển thị đúng thông báo chuẩn.
 */
export const validateVietnamesePhone = (value: string | null | undefined): string | null => {
  const raw = String(value ?? '');
  if (!raw || !VN_MOBILE_PHONE_REGEX.test(raw)) {
    return INVALID_VN_PHONE_MESSAGE;
  }
  return null;
};

/**
 * Giới hạn độ dài tối đa 10 ký tự khi nhập số điện thoại.
 */
export const clampPhoneInput = (value: string): string => {
  return String(value ?? '').slice(0, 10);
};

/**
 * 3. Kiểm tra Email đăng ký:
 * - Bắt buộc có dữ liệu và đúng định dạng email, ví dụ: example@gmail.com.
 * - Không chấp nhận khoảng trắng hoặc định dạng email sai.
 * - Giới hạn tối đa 254 ký tự.
 */
export const validateEmail = (value: string | null | undefined): string | null => {
  const raw = String(value ?? '');
  if (!raw || !raw.trim()) {
    return 'Vui lòng nhập địa chỉ email (ví dụ: example@gmail.com).';
  }
  if (/\s/.test(raw)) {
    return 'Địa chỉ email không được chứa khoảng trắng.';
  }
  if (raw.length > 254) {
    return 'Địa chỉ email không được vượt quá 254 ký tự.';
  }
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  const [localPart, domainPart] = raw.split('@');
  if (
    !emailRegex.test(raw) ||
    !localPart ||
    localPart.length > 64 ||
    localPart.startsWith('.') ||
    localPart.endsWith('.') ||
    localPart.includes('..') ||
    !domainPart ||
    !/\.[a-zA-Z]{2,}$/.test(domainPart)
  ) {
    return 'Địa chỉ email không hợp lệ. Vui lòng nhập đúng định dạng (ví dụ: example@gmail.com).';
  }
  return null;
};

/**
 * 4. Kiểm tra Giới tính:
 * - Chỉ chấp nhận một trong ba giá trị: Nam, Nữ, Khác.
 * - Không cho phép gửi giá trị ngoài danh sách.
 * - Nếu chưa có dữ liệu và trường này không bắt buộc thì cho phép bỏ trống.
 */
export const ALLOWED_GENDERS = ['Nam', 'Nữ', 'Khác'] as const;
export type ValidGender = (typeof ALLOWED_GENDERS)[number];

export const validateGender = (value: string | null | undefined): string | null => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (!ALLOWED_GENDERS.includes(value as ValidGender)) {
    return 'Giới tính không hợp lệ. Chỉ chấp nhận một trong ba giá trị: Nam, Nữ hoặc Khác.';
  }
  return null;
};

/**
 * Kiểm tra năm nhuận lịch Gregory
 */
export const isLeapYear = (year: number): boolean => {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
};

/**
 * 5. Kiểm tra Ngày sinh:
 * - Không bắt buộc nhập ngày sinh.
 * - Kiểm tra ngày thực tế hợp lệ, kể cả ngày 29/02 của năm nhuận.
 * - Không cho phép chọn ngày trong tương lai.
 * - Không chấp nhận ngày sinh dẫn đến tuổi lớn hơn 120.
 */
export const validateBirthday = (
  value: string | null | undefined,
  hasBadInput = false
): string | null => {
  if (hasBadInput) {
    return 'Ngày sinh không hợp lệ (vui lòng kiểm tra lại ngày thực tế hoặc ngày 29/02 năm nhuận).';
  }
  const raw = String(value ?? '').trim();
  if (!raw) {
    return null;
  }

  let year: number;
  let month: number;
  let day: number;

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const vnMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (isoMatch) {
    year = Number(isoMatch[1]);
    month = Number(isoMatch[2]);
    day = Number(isoMatch[3]);
  } else if (vnMatch) {
    day = Number(vnMatch[1]);
    month = Number(vnMatch[2]);
    year = Number(vnMatch[3]);
  } else {
    return 'Ngày sinh không đúng định dạng hợp lệ.';
  }

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return 'Ngày sinh không hợp lệ.';
  }

  if (month < 1 || month > 12 || day < 1) {
    return 'Ngày sinh không hợp lệ.';
  }

  const daysInMonths = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31
  ];

  if (day > daysInMonths[month - 1]) {
    if (month === 2 && day === 29) {
      return `Năm ${year} không phải năm nhuận nên không có ngày 29/02.`;
    }
    return 'Ngày sinh không tồn tại trên lịch thực tế.';
  }

  const birthDate = new Date(year, month - 1, day);
  if (
    isNaN(birthDate.getTime()) ||
    birthDate.getFullYear() !== year ||
    birthDate.getMonth() !== month - 1 ||
    birthDate.getDate() !== day
  ) {
    return 'Ngày sinh không hợp lệ.';
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (birthDate.getTime() > today.getTime()) {
    return 'Ngày sinh không được lớn hơn ngày hiện tại (không chọn ngày trong tương lai).';
  }

  const minAllowedDate = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate());
  if (birthDate.getTime() < minAllowedDate.getTime()) {
    return 'Ngày sinh không hợp lệ (tuổi không được vượt quá 120 tuổi).';
  }

  return null;
};

/**
 * Lấy chuỗi YYYY-MM-DD của ngày hôm nay và ngày cách đây 120 năm cho thuộc tính min/max của input[type="date"]
 */
export const getBirthdayBounds = (): { minDate: string; maxDate: string } => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const maxDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const minDate = `${now.getFullYear() - 120}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return { minDate, maxDate };
};

/**
 * Kiểm tra địa chỉ giao hàng (Sổ địa chỉ & Checkout)
 */
export const validateShippingAddressInput = (
  addr: Partial<ShippingAddress>,
  options: { requireEmail?: boolean; requireWard?: boolean } = {}
): Record<string, string> => {
  const errors: Record<string, string> = {};

  const nameErr = validateFullName(addr.fullName, 'Họ và tên người nhận');
  if (nameErr) errors.fullName = nameErr;

  const phoneErr = validateVietnamesePhone(addr.phone);
  if (phoneErr) errors.phone = phoneErr;

  if (options.requireEmail) {
    const emailErr = validateEmail(addr.email);
    if (emailErr) errors.email = emailErr;
  } else if (addr.email && String(addr.email).trim()) {
    const emailErr = validateEmail(addr.email);
    if (emailErr) errors.email = emailErr;
  }

  const province = String(addr.province ?? '').trim();
  if (!province) {
    errors.province = 'Vui lòng nhập Tỉnh / Thành phố.';
  } else if (province.length < 2 || province.length > 100) {
    errors.province = 'Tỉnh / Thành phố phải từ 2 đến 100 ký tự.';
  }

  const district = String(addr.district ?? '').trim();
  if (!district) {
    errors.district = 'Vui lòng nhập Quận / Huyện.';
  } else if (district.length < 2 || district.length > 100) {
    errors.district = 'Quận / Huyện phải từ 2 đến 100 ký tự.';
  }

  const ward = String(addr.ward ?? '').trim();
  if (options.requireWard !== false) {
    if (!ward) {
      errors.ward = 'Vui lòng nhập Phường / Xã.';
    } else if (ward.length < 2 || ward.length > 100) {
      errors.ward = 'Phường / Xã phải từ 2 đến 100 ký tự.';
    }
  } else if (ward && (ward.length < 2 || ward.length > 100)) {
    errors.ward = 'Phường / Xã phải từ 2 đến 100 ký tự.';
  }

  const detail = String(addr.addressDetail ?? '').trim();
  if (!detail) {
    errors.addressDetail = 'Vui lòng nhập địa chỉ chi tiết (số nhà, tên đường).';
  } else if (detail.length < 3 || detail.length > 250) {
    errors.addressDetail = 'Địa chỉ chi tiết cần từ 3 đến 250 ký tự.';
  }

  return errors;
};

/**
 * 9. Phát hiện dữ liệu cá nhân cũ không hợp lệ đã lưu trong Supabase cho tài khoản hiện tại
 * (Không tự ý xóa hay sửa dữ liệu cũ, chỉ phát hiện để cảnh báo và yêu cầu người dùng cập nhật).
 */
export const detectLegacyInvalidProfileData = (
  user: Partial<UserAccount> | null | undefined
): {
  hasInvalidData: boolean;
  fieldErrors: Record<string, string>;
  reasons: string[];
} => {
  const fieldErrors: Record<string, string> = {};
  const reasons: string[] = [];

  if (!user) {
    return { hasInvalidData: false, fieldErrors, reasons };
  }

  const nameErr = validateFullName(user.name, 'Họ và tên');
  if (nameErr) {
    fieldErrors.name = nameErr;
    reasons.push(`Họ và tên ("${user.name || 'Trống'}") chưa đúng định dạng chuẩn.`);
  }

  const phoneErr = validateVietnamesePhone(user.phone);
  if (phoneErr) {
    fieldErrors.phone = phoneErr;
    if (!user.phone || !String(user.phone).trim()) {
      reasons.push('Số điện thoại chưa được cập nhật.');
    } else {
      reasons.push(`Số điện thoại đang lưu ("${user.phone}") không đúng chuẩn 10 chữ số di động Việt Nam.`);
    }
  }

  const emailErr = validateEmail(user.email);
  if (emailErr) {
    fieldErrors.email = emailErr;
    reasons.push(`Email ("${user.email || 'Trống'}") không đúng định dạng.`);
  }

  const genderErr = validateGender(user.gender);
  if (genderErr) {
    fieldErrors.gender = genderErr;
    reasons.push(`Giới tính ("${user.gender}") nằm ngoài danh sách cho phép.`);
  }

  const birthdayErr = validateBirthday(user.birthday);
  if (birthdayErr) {
    fieldErrors.birthday = birthdayErr;
    reasons.push(`Ngày sinh ("${user.birthday}") không hợp lệ.`);
  }

  return {
    hasInvalidData: reasons.length > 0,
    fieldErrors,
    reasons
  };
};

