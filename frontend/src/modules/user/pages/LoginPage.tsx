import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Eye,
  EyeOff,
  User,
  Warehouse,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { normalizeRole } from '@/shared/utils/roleUtils';
import { AuthHeader } from '@/modules/user/components/AuthHeader';
import { googleAuthService } from '@/shared/services/googleAuthService';
import { GoogleRecaptcha } from '@/shared/components/GoogleRecaptcha';
import { GoogleIdentityButton } from '@/shared/components/GoogleIdentityButton';
import { getSystemSettings, SystemSettingsState, fetchSystemSettingsFromSupabase } from '@/shared/services/systemSettingsService';
import { appendAuditLog } from '@/shared/services/auditLogService';

type LoginRole = 'customer' | 'manager' | 'admin';

interface LoginPageProps {
  onNavigate: (path: string, options?: { replace?: boolean }) => void;
  onOpenAdminPortal?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const {
    allUsers,
    currentUser,
    login,
    switchRole,
    resetPassword
  } = useAuth();
  const { showToast } = useToast();

  // Tự động chuyển hướng nếu người dùng đã đăng nhập (chống rơi lại form login khi bấm Back)
  useEffect(() => {
    if (currentUser) {
      const role = normalizeRole(currentUser.role, currentUser.email);
      if (role === 'manager') {
        onNavigate('/manager/products', { replace: true });
      } else if (role === 'admin') {
        onNavigate('/admin/system-dashboard', { replace: true });
      } else {
        const redirectUrl = sessionStorage.getItem('auth_redirect_url') || '/';
        sessionStorage.removeItem('auth_redirect_url');
        onNavigate(redirectUrl, { replace: true });
      }
    }
  }, [currentUser, onNavigate]);

  const handleGoogleSuccess = useCallback(() => {
    onNavigate('/');
  }, [onNavigate]);

  const handleGoogleError = useCallback((errMsg: string) => {
    showToast('Đăng nhập Google', errMsg, 'error');
  }, [showToast]);

  // Login form states: DÙNG REF (UNCONTROLLED) ĐỂ TRÁNH RE-RENDER KHI GÕ PHÍM → TRIỆT TIÊU GIẬT
  const identifierRef = useRef('');
  const passwordRef = useRef('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // System settings state
  const [systemSettings, setSystemSettings] = useState<SystemSettingsState>(() => getSystemSettings());

  useEffect(() => {
    void fetchSystemSettingsFromSupabase().then((data) => {
      if (data) setSystemSettings(data);
    });
    const handleSettingsUpdate = async (e: any) => {
      if (e.detail) setSystemSettings(e.detail);
    };
    window.addEventListener('curve_system_settings_updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('curve_system_settings_updated', handleSettingsUpdate);
    };
  }, []);

  // Security & reCAPTCHA states (Triggered dynamically when failed >= maxFailedLogins)
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isCaptchaChecked, setIsCaptchaChecked] = useState(false);
  const [isVerifyingCaptcha, setIsVerifyingCaptcha] = useState(false);

  // Forgot password modal/state
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState('');

  // Google SSO simulated dialog
  const [showGoogleChooser, setShowGoogleChooser] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Collapsible Quick-Login bar for grading/testing (Bảo lưu toàn bộ mã để bật lại khi cần)
  const SHOW_DEMO_PRESETS_SECTION = false;
  const [showDemoPresets, setShowDemoPresets] = useState(false);

  // Handle reCAPTCHA toggle
  const handleToggleCaptcha = async () => {
    if (isCaptchaChecked) return;
    setIsVerifyingCaptcha(true);
    setTimeout(() => {
      setIsVerifyingCaptcha(false);
      setIsCaptchaChecked(true);
      showToast('Bảo mật', 'Xác thực người dùng thành công.', 'success');
    }, 700);
  };

  // Login Submit handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!identifierRef.current.trim()) {
      showToast('Thông báo', 'Vui lòng nhập email hoặc số điện thoại', 'info');
      return;
    }

    const maxFails = systemSettings.maxFailedLogins || 5;

    // Rate limiting & security CAPTCHA enforcement
    if (failedAttempts >= maxFails && !isCaptchaChecked) {
      showToast('Cảnh báo bảo mật', 'Vui lòng xác minh mã reCAPTCHA trước khi tiếp tục đăng nhập', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await login(identifierRef.current.trim(), passwordRef.current);
      if (ok) {
        setFailedAttempts(0);
        setIsCaptchaChecked(false);
        showToast('Đăng nhập thành công', `Chào mừng bạn quay lại với Curve & Confidence!`, 'success');
      } else {
        const nextFails = failedAttempts + 1;
        setFailedAttempts(nextFails);
        if (nextFails >= maxFails) {
          setIsCaptchaChecked(false);
          showToast('Cảnh báo bảo mật', `Bạn đã nhập sai ${nextFails} lần. Hệ thống kích hoạt xác minh reCAPTCHA để bảo vệ tài khoản!`, 'error');
          appendAuditLog(
            'Đăng nhập sai nhiều lần',
            'Tài khoản và xác thực',
            'Cảnh báo bảo mật',
            `Tài khoản: ${identifierRef.current} (Lần ${nextFails}/${maxFails})`,
            'denied',
            'Vượt quá giới hạn đăng nhập sai an toàn'
          );
        } else {
          showToast('Đăng nhập thất bại', `Thông tin đăng nhập chưa đúng (Lần ${nextFails}/${maxFails})`, 'error');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick switch role for grading/demo: ĐIỀU HƯỚNG TRỰC TIẾP, KHÔNG BỊ LẠC VÀO ADMIN KHI CHỌN QUẢN LÝ
  const handleQuickLoginRole = async (_role: LoginRole) => {
    showToast('Đăng nhập tài khoản', 'Vui lòng dùng tài khoản đã được cấp quyền.', 'info');
  };

  // Google OAuth Real Handler
  const handleGoogleClick = async () => {
    setIsGoogleLoading(true);
    try {
      const res = await googleAuthService.signInWithOAuth();
      if (!res.success) {
        showToast('Đăng nhập Google', 'Chưa thể kết nối Google. Vui lòng thử lại.', 'error');
      }
    } catch {
      showToast('Đăng nhập Google', 'Chưa thể kết nối Google. Vui lòng thử lại.', 'error');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Google Login simulation
  const handleGoogleSelect = async (_userEmail: string, _userName: string) => {
    setShowGoogleChooser(false);
    await handleGoogleClick();
  };
  // Forgot Password handler
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    if (!await resetPassword(forgotEmail)) { showToast('Chưa gửi được email', 'Vui lòng thử lại.', 'error'); return; }
    showToast('Kiểm tra email', 'Nếu tài khoản hợp lệ, bạn sẽ nhận được liên kết khôi phục mật khẩu.', 'info');
    setIsForgotMode(false);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col font-sans selection:bg-[#5C1D24] selection:text-white">
      {/* ========================================================= */}
      {/* THANH HEADER CHUẨN THƯƠNG HIỆU                            */}
      {/* ========================================================= */}
      <AuthHeader onNavigate={onNavigate} backText="QUAY LẠI MUA SẮM" backPath="/products" />

      {/* ========================================================= */}
      {/* KHÔNG GIAN NỘI DUNG CHÍNH (CĂN GIỮA AN TOÀN, KHÔNG BỊ CẤN) */}
      {/* ========================================================= */}
      <main className="flex-1 flex flex-col items-center justify-start sm:justify-center py-6 sm:py-10 px-4 sm:px-6 lg:px-8 my-auto w-full">
        {/* ========================================================= */}
        {/* CARD CHÍNH: ADAPTIVE RESPONSIVE (PC: 2 CỘT, MOBILE: 1 THẺ) */}
        {/* ========================================================= */}
        <div className="relative w-full max-w-md md:max-w-4xl bg-white rounded-2xl md:rounded-3xl shadow-sm md:shadow-xl border border-stone-200/80 overflow-hidden grid grid-cols-1 md:grid-cols-12 my-auto">
          
          {/* --------------------------------------------------------- */}
          {/* CỘT TRÁI: BANNER THƯƠNG HIỆU (CHỈ HIỂN THỊ TRÊN PC/LAPTOP)*/}
          {/* --------------------------------------------------------- */}
          <div className="relative hidden md:flex md:col-span-5 p-7 md:p-9 flex-col justify-between overflow-hidden bg-[#5C1D24] text-white select-none min-h-[540px]">
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
                Đăng nhập để lưu số đo cá nhân, theo dõi đơn hàng và trải nghiệm thời trang ngoại cỡ chuẩn form.
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
          {/* CỘT PHẢI / THẺ CHÍNH: FORM ĐĂNG NHẬP (KHỚP 100% ẢNH 1)    */}
          {/* --------------------------------------------------------- */}
          <div className="relative col-span-12 md:col-span-7 p-6 sm:p-8 flex flex-col justify-between bg-white text-charcoal-900">
            <div>
              {!isForgotMode ? (
                <>
                  {/* Tiêu đề & mô tả (Ảnh 1) */}
                  <div className="text-center mb-5">
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-charcoal-900 tracking-tight font-sans">
                      Đăng nhập
                    </h2>
                    <p className="text-xs sm:text-sm text-stone-600 mt-1.5 leading-relaxed font-sans max-w-sm mx-auto">
                      Đăng nhập để theo dõi đơn hàng, quản lý tài khoản và tiếp tục mua sắm cùng CURVE & CONFIDENCE.
                    </p>
                  </div>

                  {/* Form Đăng nhập */}
                  <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                    {/* Field 1: Email hoặc số điện thoại */}
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-charcoal-800 mb-1">
                        Email hoặc số điện thoại
                      </label>
                      <input
                        type="text"
                        defaultValue=""
                        onChange={(e) => { identifierRef.current = e.target.value; }}
                        placeholder="Nhập email hoặc số điện thoại"
                        className="w-full h-11 px-3.5 bg-white border border-stone-300 rounded-xl text-base sm:text-sm text-charcoal-900 placeholder:text-stone-400 focus:outline-none focus:border-[#5C1D24] focus:ring-1 focus:ring-[#5C1D24] transition-colors"
                        required
                      />
                    </div>

                    {/* Field 2: Mật khẩu */}
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-charcoal-800 mb-1">
                        Mật khẩu
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          defaultValue=""
                          onChange={(e) => { passwordRef.current = e.target.value; }}
                          placeholder="Nhập mật khẩu"
                          className="w-full h-11 pl-3.5 pr-10 bg-white border border-stone-300 rounded-xl text-base sm:text-sm text-charcoal-900 placeholder:text-stone-400 focus:outline-none focus:border-[#5C1D24] focus:ring-1 focus:ring-[#5C1D24] transition-colors"
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

                    {/* Tiện ích: Ghi nhớ đăng nhập & Quên mật khẩu */}
                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <label className="flex items-center gap-2 text-stone-600 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="rounded border-stone-300 text-[#5C1D24] focus:ring-[#5C1D24] cursor-pointer"
                        />
                        <span>Ghi nhớ đăng nhập</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotMode(true);
                          setForgotEmail(identifierRef.current.includes('@') ? identifierRef.current : '');
                        }}
                        className="text-stone-700 hover:text-[#5C1D24] transition-colors font-medium cursor-pointer"
                      >
                        Quên mật khẩu?
                      </button>
                    </div>

                    {/* Kích hoạt bảo mật Google reCAPTCHA v2 khi nhập sai >= 3 lần (Hoặc bật kiểm thử) */}
                    {failedAttempts >= 3 && (
                      <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2 animate-fadeIn">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-charcoal-800">Xác thực an toàn đăng nhập (reCAPTCHA)</span>
                          <span className="text-[11px] text-stone-500">Sai {failedAttempts} lần</span>
                        </div>
                        <GoogleRecaptcha
                          onVerify={(token) => {
                            setIsCaptchaChecked(true);
                            showToast('reCAPTCHA', 'Xác thực người dùng thành công.', 'success');
                          }}
                          onExpire={() => {
                            setIsCaptchaChecked(false);
                          }}
                        />
                      </div>
                    )}

                    {/* Nút ĐĂNG NHẬP */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`w-full h-11 bg-[#5C1D24] hover:bg-[#4A151B] text-white font-bold text-xs sm:text-sm rounded-xl uppercase tracking-wider transition-all shadow-sm active:scale-[0.99] flex items-center justify-center gap-2 ${
                        isSubmitting ? 'opacity-80 cursor-wait' : 'cursor-pointer'
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>ĐANG ĐĂNG NHẬP...</span>
                        </>
                      ) : (
                        <span>ĐĂNG NHẬP</span>
                      )}
                    </button>

                    {/* Divider "Hoặc" đối xứng 2 bên hoàn hảo */}
                    <div className="my-2.5 flex items-center justify-center gap-3">
                      <div className="h-px bg-stone-200 flex-1" />
                      <span className="text-xs text-stone-400 font-medium shrink-0">Hoặc</span>
                      <div className="h-px bg-stone-200 flex-1" />
                    </div>

                    {/* Google Identity Services (GIS) One-Tap / Popup chính hãng Google */}
                    <div className="w-full min-h-[44px] flex items-center justify-center">
                      <GoogleIdentityButton
                        onSuccess={handleGoogleSuccess}
                        onError={handleGoogleError}
                      />
                    </div>

                    {/* PHÂN QUYỀN DEMO NẰM GỌN GÀNG TRONG BẢNG DƯỚI NÚT GOOGLE (ẨN THEO YÊU CẦU, BẢO LƯU CODE ĐỂ BẬT LẠI KHI CẦN) */}
                    {SHOW_DEMO_PRESETS_SECTION && (
                      <div className="pt-1.5">
                        <button
                          type="button"
                          onClick={() => setShowDemoPresets(!showDemoPresets)}
                          className="w-full py-1.5 px-3 bg-stone-50 hover:bg-stone-100 border border-stone-200/90 rounded-xl text-stone-600 text-[11px] font-semibold flex items-center justify-between transition-colors cursor-pointer"
                          title="Đăng nhập nhanh các vai trò thử nghiệm"
                        >
                          <span className="flex items-center gap-1.5 truncate">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span className="truncate">⚡ Phân quyền nhanh tài khoản Demo (Giảng viên / Hội đồng)</span>
                          </span>
                          {showDemoPresets ? (
                            <ChevronUp className="w-3.5 h-3.5 shrink-0 text-stone-400" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 shrink-0 text-stone-400" />
                          )}
                        </button>

                        {showDemoPresets && (
                          <div className="mt-1.5 p-2 bg-stone-50/90 border border-stone-200 rounded-xl space-y-1 animate-fadeIn text-xs">
                            <div className="grid grid-cols-3 gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleQuickLoginRole('customer')}
                                className="p-1.5 border border-brand-200 bg-white hover:bg-brand-50 rounded-lg text-center cursor-pointer transition-colors shadow-2xs"
                              >
                                <div className="flex items-center justify-center gap-1 font-bold text-brand-900 text-[11px]">
                                  <User className="w-3 h-3 text-brand-700 shrink-0" />
                                  <span>Khách</span>
                                </div>
                                <p className="text-[9.5px] text-stone-500 truncate mt-0.5">minhanh</p>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleQuickLoginRole('manager')}
                                className="p-1.5 border border-amber-200 bg-white hover:bg-amber-50 rounded-lg text-center cursor-pointer transition-colors shadow-2xs"
                              >
                                <div className="flex items-center justify-center gap-1 font-bold text-amber-950 text-[11px]">
                                  <Warehouse className="w-3 h-3 text-amber-700 shrink-0" />
                                  <span>Quản Lý</span>
                                </div>
                                <p className="text-[9.5px] text-stone-500 truncate mt-0.5">kieuduyen</p>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleQuickLoginRole('admin')}
                                className="p-1.5 border border-purple-200 bg-white hover:bg-purple-50 rounded-lg text-center cursor-pointer transition-colors shadow-2xs"
                              >
                                <div className="flex items-center justify-center gap-1 font-bold text-purple-950 text-[11px]">
                                  <ShieldCheck className="w-3 h-3 text-purple-700 shrink-0" />
                                  <span>Admin</span>
                                </div>
                                <p className="text-[9.5px] text-stone-500 truncate mt-0.5">nhotoan</p>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </form>
                </>
              ) : (
                /* GIAO DIỆN QUÊN MẬT KHẨU */
                <div>
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-extrabold text-charcoal-900 tracking-tight font-sans">
                      Khôi phục mật khẩu
                    </h2>
                    <p className="text-xs sm:text-sm text-stone-500 mt-2 leading-relaxed">
                      Nhập email tài khoản của bạn để nhận mã xác thực OTP 6 số.
                    </p>
                  </div>

                  <form onSubmit={handleForgotSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-charcoal-800 mb-1.5">
                        Địa chỉ Email
                      </label>
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="Nhập email nhận mã OTP"
                        className="w-full h-11 px-3.5 bg-white border border-stone-300 rounded-xl text-sm"
                        required
                      />
                    </div>

                    {otpSent && (
                      <div>
                        <label className="block text-xs font-semibold text-charcoal-800 mb-1.5">
                          Mã OTP xác thực (Mã demo: 123456)
                        </label>
                        <input
                          type="text"
                          value={otpInput}
                          onChange={(e) => setOtpInput(e.target.value)}
                          placeholder="Nhập 123456"
                          maxLength={6}
                          className="w-full h-11 px-3.5 bg-white border border-stone-300 rounded-xl text-center font-mono tracking-widest text-lg"
                          required
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full h-12 bg-[#5C1D24] hover:bg-[#4A151B] text-white font-bold text-xs sm:text-sm rounded-xl uppercase tracking-wider"
                    >
                      {!otpSent ? 'GỬI MÃ OTP' : 'XÁC NHẬN ĐỔI MẬT KHẨU'}
                    </button>

                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => setIsForgotMode(false)}
                        className="text-xs font-semibold text-[#5C1D24] hover:underline cursor-pointer"
                      >
                        ← Quay lại Đăng nhập
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* Chưa có tài khoản? Đăng ký ngay */}
            {!isForgotMode && (
              <div className="mt-5 pt-3.5 border-t border-stone-100 text-center">
                <p className="text-xs text-stone-600">
                  Chưa có tài khoản?{' '}
                  <button
                    type="button"
                    onClick={() => onNavigate('/register')}
                    className="font-bold text-[#5C1D24] hover:underline cursor-pointer"
                  >
                    Đăng ký ngay
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* CHÂN TRANG: FOOTER LINKS                                  */}
        {/* ========================================================= */}
        <div className="mt-5 flex flex-col items-center gap-1 text-xs text-stone-500 font-sans select-none">
          <button
            type="button"
            onClick={() => onNavigate('/faq')}
            className="hover:text-[#5C1D24] underline underline-offset-2 transition-colors cursor-pointer"
          >
            Chính sách quyền riêng tư · Hỗ trợ khách hàng
          </button>
        </div>
      </main>

      {/* ========================================================= */}
      {/* POPUP MÔ PHỎNG GOOGLE ACCOUNT CHOOSER (Chuẩn bị sẵn cho SSO)*/}
      {/* ========================================================= */}
      {showGoogleChooser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-900/40 backdrop-blur-md animate-fadeIn"
          onClick={() => setShowGoogleChooser(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 my-auto animate-scaleIn text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span className="font-bold text-sm text-charcoal-900">Đăng nhập bằng Google</span>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleChooser(false)}
                className="text-stone-400 hover:text-stone-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone-500 my-4">
              Chọn tài khoản Google để tiếp tục với Curve & Confidence:
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleGoogleSelect('trandinhminh.dev@gmail.com', 'Trần Đình Minh')}
                className="w-full p-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 flex items-center gap-3 text-left transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  M
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-charcoal-900">Trần Đình Minh</p>
                  <p className="text-[11px] text-stone-500 truncate">trandinhminh.dev@gmail.com</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleGoogleSelect('huynh.bigsize.customer@gmail.com', 'Huỳnh Thảo')}
                className="w-full p-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 flex items-center gap-3 text-left transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  T
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-charcoal-900">Huỳnh Thảo</p>
                  <p className="text-[11px] text-stone-500 truncate">huynh.bigsize.customer@gmail.com</p>
                </div>
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-stone-100 text-center">
              <button
                type="button"
                onClick={() => setShowGoogleChooser(false)}
                className="text-xs text-stone-500 hover:text-stone-800 cursor-pointer"
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
