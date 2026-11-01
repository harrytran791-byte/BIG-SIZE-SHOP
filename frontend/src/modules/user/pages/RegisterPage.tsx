import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { AuthHeader } from '@/modules/user/components/AuthHeader';
import { getSystemSettings, SystemSettingsState, fetchSystemSettingsFromSupabase } from '@/shared/services/systemSettingsService';
import {
  normalizeFullName,
  validateFullName,
  validateVietnamesePhone,
  clampPhoneInput,
  validateEmail
} from '@/shared/utils/userInputValidation';

interface RegisterPageProps {
  onNavigate: (path: string) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigate }) => {
  const { register } = useAuth();
  const { showToast } = useToast();

  const [systemSettings, setSystemSettings] = useState<SystemSettingsState>(() => getSystemSettings());

  useEffect(() => {
    void fetchSystemSettingsFromSupabase().then((data) => {
      if (data) setSystemSettings(data);
    });
    const handleSettingsUpdate = (e: any) => {
      if (e.detail) setSystemSettings(e.detail);
    };
    window.addEventListener('curve_system_settings_updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('curve_system_settings_updated', handleSettingsUpdate);
    };
  }, []);

  // Form states matching Image 2 exactly
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validateRegisterField = (field: 'name' | 'email' | 'phone', val: string): string | null => {
    switch (field) {
      case 'name':
        return validateFullName(val, 'Họ và tên');
      case 'email':
        return validateEmail(val);
      case 'phone':
        return validateVietnamesePhone(val);
      default:
        return null;
    }
  };

  const handleBlurField = (field: 'name' | 'email' | 'phone', val: string) => {
    let targetVal = val;
    if (field === 'name') {
      targetVal = normalizeFullName(val);
      setName(targetVal);
    }
    const err = validateRegisterField(field, targetVal);
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (err) next[field] = err;
      else delete next[field];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!systemSettings.allowRegistration) {
      showToast('Thông báo', 'Hệ thống hiện đang tạm đóng đăng ký mới theo chính sách quản trị.', 'error');
      return;
    }

    const cleanName = normalizeFullName(name);
    setName(cleanName);

    const errors: Record<string, string> = {};
    const nameErr = validateFullName(cleanName, 'Họ và tên');
    if (nameErr) errors.name = nameErr;

    const emailErr = validateEmail(email);
    if (emailErr) errors.email = emailErr;

    const phoneErr = validateVietnamesePhone(phone);
    if (phoneErr) errors.phone = phoneErr;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      showToast('Thông tin chưa hợp lệ', Object.values(errors)[0] || 'Vui lòng kiểm tra lại thông tin đăng ký.', 'error');
      return;
    }

    if (!password) {
      showToast('Thông báo', 'Vui lòng nhập mật khẩu', 'info');
      return;
    }
    const requiredMinLen = systemSettings.minPasswordLength || 8;
    if (password.length < requiredMinLen) {
      showToast('Mật khẩu yếu', `Mật khẩu phải có tối thiểu ${requiredMinLen} ký tự theo quy định bảo mật hệ thống`, 'error');
      return;
    }
    if (password !== confirmPassword) {
      showToast('Mật khẩu không khớp', 'Mật khẩu xác nhận chưa trùng khớp, vui lòng kiểm tra lại', 'error');
      return;
    }
    if (!agreeTerms) {
      showToast('Điều khoản', 'Vui lòng đồng ý với Điều khoản sử dụng và Chính sách quyền riêng tư', 'info');
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    const ok = await register(cleanName, email.trim(), phone.trim(), password);
    setIsSubmitting(false);

    if (ok) { onNavigate('/login'); }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col font-sans selection:bg-[#5C1D24] selection:text-white">
      {/* ========================================================= */}
      {/* THANH HEADER CHUẨN THƯƠNG HIỆU (KHỚP 100% ẢNH MẪU VÍ DỤ)   */}
      {/* ========================================================= */}
      <AuthHeader onNavigate={onNavigate} backText="QUAY LẠI MUA SẮM" backPath="/products" />

      {/* ========================================================= */}
      {/* KHÔNG GIAN NỘI DUNG CHÍNH (CĂN GIỮA MÀN HÌNH)             */}
      {/* ========================================================= */}
      <main className="flex-1 flex flex-col justify-center items-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        {/* ========================================================= */}
        {/* CARD CHÍNH: ADAPTIVE RESPONSIVE (PC: 2 CỘT, MOBILE: 1 THẺ) */}
        {/* ========================================================= */}
        <div className="relative w-full max-w-md md:max-w-4xl bg-white rounded-2xl md:rounded-3xl shadow-sm md:shadow-xl border border-stone-200/80 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[620px]">
          
          {/* --------------------------------------------------------- */}
          {/* CỘT TRÁI: BANNER THƯƠNG HIỆU (CHỈ HIỂN THỊ TRÊN PC/LAPTOP)*/}
          {/* --------------------------------------------------------- */}
          <div className="relative hidden md:flex md:col-span-5 p-7 md:p-9 flex-col justify-between overflow-hidden bg-[#5C1D24] text-white select-none">
            {/* Lớp ảnh người mẫu cao cấp */}
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&auto=format&fit=crop&q=80')`
              }}
            />
            {/* Lớp phủ gradient Burgundy */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#5C1D24]/75 via-[#5C1D24]/60 to-[#350C13]/85 mix-blend-multiply" />
            <div className="absolute inset-0 bg-black/15" />

            {/* Phần trên: Logo & Slogan */}
            <div className="relative z-10">
              <p className="text-xs font-bold tracking-[0.2em] uppercase text-white drop-shadow-sm font-sans">
                CURVE & CONFIDENCE
              </p>
              <p className="text-[10px] tracking-[0.22em] text-white/80 uppercase mt-1 font-sans font-medium">
                THỜI TRANG NGOẠI CỠ ĐẲNG CẤP
              </p>
            </div>

            {/* Phần giữa: Thông điệp trung tính cho cả Nam & Nữ */}
            <div className="relative z-10 my-auto py-6">
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white leading-tight font-sans drop-shadow-sm">
                Vừa vặn với bạn. <br />
                Tự tin theo cách riêng.
              </h2>
              <p className="text-sm md:text-base text-white/90 leading-relaxed mt-4 max-w-xs font-sans drop-shadow-sm font-normal">
                Tạo tài khoản miễn phí để nhận ưu đãi thành viên độc quyền và kích hoạt tư vấn kích cỡ AI thông minh.
              </p>
            </div>

            {/* Phần dưới: Badge */}
            <div className="relative z-10 pt-4 border-t border-white/20">
              <p className="text-xs font-semibold tracking-wider text-white/90 uppercase font-sans">
                THỜI TRANG BIGSIZE · XL–5XL
              </p>
            </div>
          </div>

          {/* --------------------------------------------------------- */}
          {/* CỘT PHẢI / THẺ CHÍNH: FORM ĐĂNG KÝ (KHỚP 100% ẢNH 2)      */}
          {/* --------------------------------------------------------- */}
          <div className="relative col-span-12 md:col-span-7 p-6 sm:p-8 md:p-10 flex flex-col justify-between bg-white text-charcoal-900">
            <div>
              {/* Tiêu đề & mô tả */}
              <div className="text-center mb-6">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-charcoal-900 tracking-tight font-sans">
                  Đăng ký
                </h2>
                <p className="text-xs sm:text-sm text-stone-600 mt-2 leading-relaxed font-sans max-w-sm mx-auto">
                  Tạo tài khoản miễn phí để theo dõi lịch sử mua hàng, quản lý thông tin cá nhân và có cơ hội nhận những ưu đãi dành riêng cho thành viên CURVE & CONFIDENCE.
                </p>
              </div>

              {!systemSettings.allowRegistration && (
                <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-bold block">Tạm dừng đăng ký mới</span>
                    <span>Hệ thống tạm thời đóng tiếp nhận đăng ký tài khoản mới theo chính sách quản trị Curve & Confidence. Quý khách vui lòng liên hệ bộ phận hỗ trợ hoặc quay lại sau!</span>
                  </div>
                </div>
              )}

              {/* 5 Form Fields */}
              <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
                {/* Field 1: Họ và tên */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-charcoal-800 mb-1">
                    Họ và tên
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    value={name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setName(val);
                      if (fieldErrors.name) {
                        const err = validateRegisterField('name', val);
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          if (err) next.name = err;
                          else delete next.name;
                          return next;
                        });
                      }
                    }}
                    onBlur={(e) => handleBlurField('name', e.target.value)}
                    placeholder="Nhập họ và tên"
                    className={`w-full h-11 px-3.5 bg-white border rounded-xl text-base sm:text-sm text-charcoal-900 placeholder:text-stone-400 focus:outline-none transition-all ${
                      fieldErrors.name
                        ? 'border-rose-500 bg-rose-50/40 focus:border-rose-600 focus:ring-1 focus:ring-rose-500'
                        : 'border-stone-300 focus:border-[#5C1D24] focus:ring-1 focus:ring-[#5C1D24]'
                    }`}
                    required
                  />
                  {fieldErrors.name && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.name}</p>
                  )}
                </div>

                {/* Field 2: Email */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-charcoal-800 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    maxLength={254}
                    value={email}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEmail(val);
                      if (fieldErrors.email) {
                        const err = validateRegisterField('email', val);
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          if (err) next.email = err;
                          else delete next.email;
                          return next;
                        });
                      }
                    }}
                    onBlur={(e) => handleBlurField('email', e.target.value)}
                    placeholder="Nhập địa chỉ email"
                    className={`w-full h-11 px-3.5 bg-white border rounded-xl text-base sm:text-sm text-charcoal-900 placeholder:text-stone-400 focus:outline-none transition-all ${
                      fieldErrors.email
                        ? 'border-rose-500 bg-rose-50/40 focus:border-rose-600 focus:ring-1 focus:ring-rose-500'
                        : 'border-stone-300 focus:border-[#5C1D24] focus:ring-1 focus:ring-[#5C1D24]'
                    }`}
                    required
                  />
                  {fieldErrors.email && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.email}</p>
                  )}
                </div>

                {/* Field 3: Số điện thoại */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-charcoal-800 mb-1">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => {
                      const val = clampPhoneInput(e.target.value);
                      setPhone(val);
                      if (fieldErrors.phone) {
                        const err = validateRegisterField('phone', val);
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          if (err) next.phone = err;
                          else delete next.phone;
                          return next;
                        });
                      }
                    }}
                    onBlur={(e) => handleBlurField('phone', e.target.value)}
                    placeholder="Nhập số điện thoại 10 chữ số"
                    className={`w-full h-11 px-3.5 bg-white border rounded-xl text-base sm:text-sm text-charcoal-900 placeholder:text-stone-400 focus:outline-none transition-all font-mono ${
                      fieldErrors.phone
                        ? 'border-rose-500 bg-rose-50/40 focus:border-rose-600 focus:ring-1 focus:ring-rose-500'
                        : 'border-stone-300 focus:border-[#5C1D24] focus:ring-1 focus:ring-[#5C1D24]'
                    }`}
                    required
                  />
                  {fieldErrors.phone && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.phone}</p>
                  )}
                </div>

                {/* Field 4: Mật khẩu */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-charcoal-800 mb-1">
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Tối thiểu 8 ký tự"
                      className="w-full h-11 pl-3.5 pr-10 bg-white border border-stone-300 rounded-xl text-base sm:text-sm text-charcoal-900 placeholder:text-stone-400 focus:outline-none focus:border-[#5C1D24] focus:ring-1 focus:ring-[#5C1D24] transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors p-1"
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Field 5: Xác nhận mật khẩu */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-charcoal-800 mb-1">
                    Xác nhận mật khẩu
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu"
                      className="w-full h-11 pl-3.5 pr-10 bg-white border border-stone-300 rounded-xl text-base sm:text-sm text-charcoal-900 placeholder:text-stone-400 focus:outline-none focus:border-[#5C1D24] focus:ring-1 focus:ring-[#5C1D24] transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors p-1"
                      aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Checkbox điều khoản sử dụng */}
                <label className="flex items-start gap-2.5 text-xs text-stone-600 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-0.5 rounded border-stone-300 text-[#5C1D24] focus:ring-[#5C1D24] cursor-pointer"
                  />
                  <span className="leading-snug">
                    Tôi đồng ý với{' '}
                    <button
                      type="button"
                      onClick={() => onNavigate('/faq')}
                      className="underline text-charcoal-800 hover:text-[#5C1D24] font-medium cursor-pointer"
                    >
                      Điều khoản sử dụng
                    </button>{' '}
                    và{' '}
                    <button
                      type="button"
                      onClick={() => onNavigate('/faq')}
                      className="underline text-charcoal-800 hover:text-[#5C1D24] font-medium cursor-pointer"
                    >
                      Chính sách quyền riêng tư
                    </button>
                    .
                  </span>
                </label>

                {/* Nút ĐĂNG KÝ */}
                <button
                  type="submit"
                  disabled={isSubmitting || !systemSettings.allowRegistration}
                  className="w-full h-12 bg-[#5C1D24] hover:bg-[#4A151B] disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm rounded-xl uppercase tracking-wider transition-all shadow-sm active:scale-[0.99] cursor-pointer mt-2"
                >
                  {isSubmitting ? 'ĐANG TẠO TÀI KHOẢN...' : !systemSettings.allowRegistration ? 'TẠM DỪNG ĐĂNG KÝ' : 'ĐĂNG KÝ'}
                </button>
              </form>
            </div>

            {/* Đã có tài khoản? Đăng nhập */}
            <div className="mt-6 pt-4 border-t border-stone-100 text-center">
              <p className="text-xs text-stone-600">
                Đã có tài khoản?{' '}
                <button
                  type="button"
                  onClick={() => onNavigate('/login')}
                  className="font-bold text-[#5C1D24] hover:underline cursor-pointer"
                >
                  Đăng nhập
                </button>
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CHÂN TRANG: FOOTER LINKS                                  */}
        {/* ========================================================= */}
        <div className="mt-6 flex flex-col items-center gap-1.5 text-xs text-stone-500 font-sans select-none">
          <button
            type="button"
            onClick={() => onNavigate('/faq')}
            className="hover:text-[#5C1D24] underline underline-offset-2 transition-colors cursor-pointer"
          >
            Chính sách quyền riêng tư · Hỗ trợ khách hàng
          </button>
        </div>
      </main>
    </div>
  );
};
