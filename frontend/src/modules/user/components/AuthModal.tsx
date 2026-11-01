import React, { useState } from 'react';
import {
  X,
  Lock,
  Mail,
  User,
  Phone,
  Check,
  CheckCircle,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { googleAuthService } from '@/shared/services/googleAuthService';
import {
  normalizeFullName,
  validateFullName,
  validateVietnamesePhone,
  clampPhoneInput,
  validateEmail
} from '@/shared/utils/userInputValidation';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalTab,
    openAuthModal,
    login,
    register,
    resetPassword
  } = useAuth();
  const { showToast } = useToast();

  // Form states - Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Security & CAPTCHA states (Only triggered on >= 3 failed attempts)
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isCaptchaChecked, setIsCaptchaChecked] = useState(false);
  const [isVerifyingCaptcha, setIsVerifyingCaptcha] = useState(false);

  // Register form states (Matching Image 2 exactly)
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});

  // Google SSO simulated dialog
  const [showGoogleChooser, setShowGoogleChooser] = useState(false);

  // Forgot password states
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [newPassword, setNewPassword] = useState('');

  if (!isAuthModalOpen) return null;

  const validateModalRegField = (field: 'name' | 'email' | 'phone', val: string): string | null => {
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

  const handleBlurRegField = (field: 'name' | 'email' | 'phone', val: string) => {
    let targetVal = val;
    if (field === 'name') {
      targetVal = normalizeFullName(val);
      setRegName(targetVal);
    }
    const err = validateModalRegField(field, targetVal);
    setRegErrors((prev) => {
      const next = { ...prev };
      if (err) next[field] = err;
      else delete next[field];
      return next;
    });
  };

  // Handle CAPTCHA verification toggle
  const handleToggleCaptcha = async () => {
    if (isCaptchaChecked) return;
    setIsVerifyingCaptcha(true);
    setTimeout(() => {
      setIsVerifyingCaptcha(false);
      setIsCaptchaChecked(true);
      showToast('Xác thực bảo mật', 'Xác thực người dùng thành công.', 'success');
    }, 800);
  };

  // Login handler with rate-limiting & conditional reCAPTCHA
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      showToast('Thông báo', 'Vui lòng nhập email hoặc số điện thoại', 'info');
      return;
    }

    // If failed >= 3 times, verify CAPTCHA
    if (failedAttempts >= 3 && !isCaptchaChecked) {
      showToast('Cảnh báo bảo mật', 'Vui lòng xác nhận bạn không phải người máy trước khi đăng nhập', 'error');
      return;
    }

    const ok = await login(email, password);
    if (ok) {
      setFailedAttempts(0);
      setIsCaptchaChecked(false);
      showToast('Đăng nhập thành công', `Chào mừng ${email.split('@')[0]} quay trở lại với Curve & Confidence!`, 'success');
      setEmail('');
      setPassword('');
    } else {
      const nextFail = failedAttempts + 1;
      setFailedAttempts(nextFail);
      if (nextFail >= 3) {
        setIsCaptchaChecked(false);
        showToast('Cảnh báo bảo mật', 'Bạn đã nhập sai mật khẩu quá 3 lần. Hệ thống kích hoạt xác minh reCAPTCHA để phòng ngừa tấn công dò mật khẩu!', 'error');
      } else {
        showToast('Đăng nhập thất bại', `Mật khẩu không chính xác. Còn lại ${3 - nextFail} lần thử trước khi kích hoạt reCAPTCHA.`, 'error');
      }
    }
  };

  // Quick login for demo
  const handleQuickLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('123456');
    const ok = await login(demoEmail, '123456');
    if (ok) {
      setFailedAttempts(0);
      setIsCaptchaChecked(false);
      showToast('Đăng nhập thành công', `Đã đăng nhập bằng tài khoản: ${demoEmail}`, 'success');
    }
  };

  // Google OAuth Real Handler
  const handleGoogleOAuthClick = async () => {
    try {
      const res = await googleAuthService.signInWithOAuth();
      if (!res.success) {
        showToast('Google OAuth', res.error || 'Chuyển sang tài khoản thử nghiệm.', 'info');
        setShowGoogleChooser(true);
      }
    } catch {
      setShowGoogleChooser(true);
    }
  };

  // Google OAuth flow simulation
  const handleGoogleAuthSelect = async (selectedEmail: string, selectedName: string) => {
    setShowGoogleChooser(false);
    if (authModalTab === 'login') {
      // Check if user exists
      const ok = await login(selectedEmail, 'google_oauth_pass');
      if (ok) {
        showToast('Đăng nhập Google thành công', `Chào mừng ${selectedName}!`, 'success');
      } else {
        // If not in database, smoothly guide to register with Google details pre-filled
        showToast('Tài khoản mới', 'Email Google này chưa đăng ký. Hệ thống đã tự động điền thông tin sang màn hình đăng ký!', 'info');
        setRegName(selectedName);
        setRegEmail(selectedEmail);
        openAuthModal('register');
      }
    } else {
      // In register tab: Pre-fill fields from Google
      setRegName(selectedName);
      setRegEmail(selectedEmail);
      showToast('Google OAuth', `Đã đồng bộ thông tin của ${selectedName}. Vui lòng nhập Số điện thoại để hoàn tất.`, 'info');
    }
  };

  // Register handler matching 5 fields from Image 2
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = normalizeFullName(regName);
    setRegName(cleanName);

    const errors: Record<string, string> = {};
    const nameErr = validateFullName(cleanName, 'Họ và tên');
    if (nameErr) errors.name = nameErr;

    const emailErr = validateEmail(regEmail);
    if (emailErr) errors.email = emailErr;

    const phoneErr = validateVietnamesePhone(regPhone);
    if (phoneErr) errors.phone = phoneErr;

    if (Object.keys(errors).length > 0) {
      setRegErrors(errors);
      showToast('Thông tin chưa hợp lệ', Object.values(errors)[0] || 'Vui lòng kiểm tra lại thông tin đăng ký', 'error');
      return;
    }

    if (!regPassword) {
      showToast('Thiếu thông tin', 'Vui lòng điền mật khẩu đăng ký', 'info');
      return;
    }
    if (regPassword.length < 8) {
      showToast('Mật khẩu yếu', 'Mật khẩu phải có tối thiểu 8 ký tự theo quy định bảo mật', 'error');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      showToast('Mật khẩu không khớp', 'Mật khẩu xác nhận chưa trùng khớp với mật khẩu đã nhập', 'error');
      return;
    }

    setRegErrors({});
    const ok = await register(cleanName, regEmail.trim(), regPhone.trim(), regPassword);
    if (ok) {
      setRegName('');
      setRegEmail('');
      setRegPhone('');
      setRegPassword('');
      setRegConfirmPassword('');
    }
  };

  // Forgot password handler
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpSent) {
      if (!email.trim()) {
        showToast('Thông báo', 'Vui lòng nhập email đã đăng ký', 'info');
        return;
      }
      setOtpSent(true);
      showToast('Mã OTP đã gửi', 'Vui lòng nhập mã thử nghiệm: 123456', 'info');
    } else {
      if (otpInput === '123456') {
        resetPassword(email);
        showToast('Khôi phục mật khẩu thành công', 'Mật khẩu mới đã được cập nhật. Vui lòng đăng nhập!', 'success');
        setOtpSent(false);
        setOtpInput('');
        openAuthModal('login');
      } else {
        showToast('Mã OTP không đúng', 'Hãy nhập mã thử nghiệm: 123456', 'error');
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-stone-900/40 backdrop-blur-md animate-fadeIn font-sans"
      onClick={closeAuthModal}
    >
      <div
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[580px] my-auto animate-scaleIn text-left"
        onClick={(e) => e.stopPropagation()}
      >

        {/* ========================================================= */}
        {/* CỘT TRÁI: BANNER THƯƠNG HIỆU MÀU BURGUNDY #5C1D24       */}
        {/* ========================================================= */}
        <div className="relative hidden md:flex md:col-span-5 p-7 md:p-9 flex-col justify-between overflow-hidden bg-[#5C1D24] text-white">
          {/* Lớp ảnh người mẫu cao cấp, giảm độ phủ Burgundy để ảnh sáng rõ nét */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&auto=format&fit=crop&q=80')`
            }}
          />
          {/* Lớp phủ chuyển sắc Burgundy dịu hơn, đảm bảo ảnh rõ và chữ nổi bật */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#5C1D24]/75 via-[#5C1D24]/60 to-[#350C13]/85 mix-blend-multiply" />
          <div className="absolute inset-0 bg-black/15" />

          {/* Phần trên: Logo & Slogan chuẩn */}
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

          {/* Phần dưới: Thông tin chuẩn ngắn gọn */}
          <div className="relative z-10 pt-4 border-t border-white/20">
            <p className="text-xs font-semibold tracking-wider text-white/90 uppercase font-sans">
              THỜI TRANG BIGSIZE · XL–5XL
            </p>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CỘT PHẢI: FORM ĐĂNG NHẬP / ĐĂNG KÝ / QUÊN MẬT KHẨU       */}
        {/* ========================================================= */}
        <div className="relative col-span-12 md:col-span-7 p-6 md:p-8 flex flex-col justify-between bg-white text-charcoal-900 max-h-[92vh] overflow-y-auto">
          {/* Nút đóng tròn góc trên bên phải */}
          <button
            type="button"
            onClick={closeAuthModal}
            className="absolute top-4 right-4 md:top-5 md:right-5 w-8 h-8 rounded-full border border-stone-200 flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer z-20"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>

          {/* 1. Tiêu đề Form */}
          <div className="pr-8">
            <span className="text-[11px] font-bold tracking-widest text-[#5C1D24] uppercase font-sans">
              TÀI KHOẢN THÀNH VIÊN
            </span>
            <h1 className="text-2xl md:text-[28px] font-extrabold text-charcoal-900 mt-1 font-sans tracking-tight">
              {authModalTab === 'login' && 'Đăng nhập'}
              {authModalTab === 'register' && 'Đăng ký tài khoản'}
              {authModalTab === 'forgot' && 'Khôi phục mật khẩu'}
            </h1>
            <p className="text-xs text-stone-500 mt-1 font-sans">
              {authModalTab === 'login' && 'Chào mừng bạn quay lại với Curve & Confidence.'}
              {authModalTab === 'register' && 'Tạo tài khoản để nhận tư vấn kích cỡ chuẩn form và ưu đãi độc quyền.'}
              {authModalTab === 'forgot' && 'Nhập email để nhận mã xác thực OTP 6 số.'}
            </p>
          </div>

          {/* ========================================================= */}
          {/* TAB 1: FORM ĐĂNG NHẬP                                     */}
          {/* ========================================================= */}
          {authModalTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5 my-auto py-3">
              {/* Nút Đăng nhập Google */}
              <button
                type="button"
                onClick={handleGoogleOAuthClick}
                className="w-full py-2.5 px-4 bg-white border border-stone-200 hover:border-stone-300 hover:bg-stone-50 rounded-lg text-xs font-bold text-charcoal-700 flex items-center justify-center gap-2.5 shadow-2xs transition-all cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Tiếp tục với Google</span>
              </button>

              {/* Dòng phân cách: HOẶC ĐĂNG NHẬP BẰNG EMAIL */}
              <div className="relative text-center my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-stone-200" />
                </div>
                <span className="relative bg-white px-3 text-[10px] uppercase tracking-wider text-stone-400 font-bold">
                  HOẶC ĐĂNG NHẬP BẰNG EMAIL
                </span>
              </div>

              {/* Ô nhập Email hoặc Số điện thoại */}
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Email hoặc số điện thoại
                </label>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nang@example.com"
                  className="w-full px-3.5 py-2.5 text-xs text-charcoal-900 bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-[#5C1D24] focus:ring-1 focus:ring-[#5C1D24] transition-colors"
                />
              </div>

              {/* Ô nhập Mật khẩu kèm Icon ẩn/hiện & Quên mật khẩu? */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-charcoal-700">Mật khẩu</label>
                  <button
                    type="button"
                    onClick={() => openAuthModal('forgot')}
                    className="text-xs font-semibold text-[#5C1D24] hover:underline cursor-pointer"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu"
                    className="w-full pl-3.5 pr-10 py-2.5 text-xs text-charcoal-900 bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-[#5C1D24] focus:ring-1 focus:ring-[#5C1D24] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Hàng tùy chọn: Ghi nhớ đăng nhập + Bảo mật SSL */}
              <div className="flex items-center justify-between text-xs text-stone-600 pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-stone-300 text-[#5C1D24] focus:ring-[#5C1D24] accent-[#5C1D24]"
                  />
                  <span>Ghi nhớ đăng nhập</span>
                </label>
                <span className="text-[11px] text-stone-400 flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Bảo mật SSL</span>
                </span>
              </div>

              {/* Hộp Captcha reCAPTCHA: CHỈ HIỂN THỊ KHI NHẬP SAI MẬT KHẨU TỪ 3 LẦN TRỞ LÊN */}
              {failedAttempts >= 3 && (
                <div
                  onClick={handleToggleCaptcha}
                  className="border border-stone-200 bg-stone-50 hover:bg-stone-100/70 rounded-lg px-3.5 py-2.5 flex items-center justify-between cursor-pointer transition-colors select-none animate-fadeIn"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                        isCaptchaChecked
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-stone-300 bg-white'
                      }`}
                    >
                      {isVerifyingCaptcha ? (
                        <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      ) : isCaptchaChecked ? (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      ) : null}
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-charcoal-800 block">Tôi không phải người máy</span>
                      <span className="text-[10px] text-stone-400">reCAPTCHA v2 (Chống dò mật khẩu)</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end text-[9px] leading-tight text-stone-400">
                    <span className="font-bold tracking-wider text-stone-500 uppercase">HUMAN</span>
                    <span className="tracking-widest">VERIFIED</span>
                  </div>
                </div>
              )}

              {/* Nút Submit ĐĂNG NHẬP -> */}
              <button
                type="submit"
                className="w-full py-3 bg-[#5C1D24] hover:bg-[#4A121D] active:bg-[#330C14] text-white font-bold text-xs uppercase tracking-widest rounded-lg shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span>ĐĂNG NHẬP</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>

              {/* Khung Đăng nhập nhanh Demo (rất tiện khi trình diễn đồ án cho Thầy) */}
              <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-lg">
                <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>1-Click Đăng nhập Demo (Dành cho buổi báo cáo):</span>
                </p>
                <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('minhanh@gmail.com')}
                    className="py-1 px-1 bg-white border border-stone-200 hover:border-[#5C1D24] hover:text-[#5C1D24] rounded text-center transition-all truncate font-medium cursor-pointer"
                  >
                    👤 Khách hàng
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('linhkhanh@gmail.com')}
                    className="py-1 px-1 bg-white border border-stone-200 hover:border-[#5C1D24] hover:text-[#5C1D24] rounded text-center transition-all truncate font-medium cursor-pointer"
                  >
                    💼 Quản lý
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('binh98@gmail.com')}
                    className="py-1 px-1 bg-white border border-stone-200 hover:border-[#5C1D24] hover:text-[#5C1D24] rounded text-center transition-all truncate font-medium cursor-pointer"
                  >
                    🛡️ Admin
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ========================================================= */}
          {/* TAB 2: FORM ĐĂNG KÝ (KHỚP 100% VỚI ẢNH 2 CỦA BẠN)         */}
          {/* ========================================================= */}
          {authModalTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} noValidate className="space-y-3 my-auto py-2">
              {/* Nút Đăng ký nhanh với Google */}
              <button
                type="button"
                onClick={handleGoogleOAuthClick}
                className="w-full py-2.5 px-4 bg-white border border-stone-200 hover:border-stone-300 hover:bg-stone-50 rounded-lg text-xs font-bold text-charcoal-700 flex items-center justify-center gap-2.5 shadow-2xs transition-all cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Đăng ký nhanh với Google</span>
              </button>

              {/* Dòng phân cách: HOẶC ĐĂNG KÝ BẰNG THÔNG TIN */}
              <div className="relative text-center my-1.5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-stone-200" />
                </div>
                <span className="relative bg-white px-3 text-[10px] uppercase tracking-wider text-stone-400 font-bold">
                  HOẶC ĐĂNG KÝ BẰNG THÔNG TIN
                </span>
              </div>

              {/* 1. Họ và tên */}
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Họ và tên
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={regName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setRegName(val);
                    if (regErrors.name) {
                      const err = validateModalRegField('name', val);
                      setRegErrors((prev) => {
                        const next = { ...prev };
                        if (err) next.name = err;
                        else delete next.name;
                        return next;
                      });
                    }
                  }}
                  onBlur={(e) => handleBlurRegField('name', e.target.value)}
                  placeholder="Nhập họ và tên"
                  className={`w-full px-3.5 py-2.5 text-xs text-charcoal-900 bg-white border rounded-lg focus:outline-none transition-colors ${
                    regErrors.name
                      ? 'border-rose-500 bg-rose-50/40 focus:border-rose-600 focus:ring-1 focus:ring-rose-500'
                      : 'border-stone-300 focus:border-[#5C1D24] focus:ring-1 focus:ring-[#5C1D24]'
                  }`}
                />
                {regErrors.name && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">{regErrors.name}</p>
                )}
              </div>

              {/* 2. Email */}
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  maxLength={254}
                  value={regEmail}
                  onChange={(e) => {
                    const val = e.target.value;
                    setRegEmail(val);
                    if (regErrors.email) {
                      const err = validateModalRegField('email', val);
                      setRegErrors((prev) => {
                        const next = { ...prev };
                        if (err) next.email = err;
                        else delete next.email;
                        return next;
                      });
                    }
                  }}
                  onBlur={(e) => handleBlurRegField('email', e.target.value)}
                  placeholder="Nhập địa chỉ email"
                  className={`w-full px-3.5 py-2.5 text-xs text-charcoal-900 bg-white border rounded-lg focus:outline-none transition-colors ${
                    regErrors.email
                      ? 'border-rose-500 bg-rose-50/40 focus:border-rose-600 focus:ring-1 focus:ring-rose-500'
                      : 'border-stone-300 focus:border-[#5C1D24] focus:ring-1 focus:ring-[#5C1D24]'
                  }`}
                />
                {regErrors.email && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">{regErrors.email}</p>
                )}
              </div>

              {/* 3. Số điện thoại */}
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={regPhone}
                  onChange={(e) => {
                    const val = clampPhoneInput(e.target.value);
                    setRegPhone(val);
                    if (regErrors.phone) {
                      const err = validateModalRegField('phone', val);
                      setRegErrors((prev) => {
                        const next = { ...prev };
                        if (err) next.phone = err;
                        else delete next.phone;
                        return next;
                      });
                    }
                  }}
                  onBlur={(e) => handleBlurRegField('phone', e.target.value)}
                  placeholder="Nhập số điện thoại 10 chữ số"
                  className={`w-full px-3.5 py-2.5 text-xs text-charcoal-900 bg-white border rounded-lg focus:outline-none transition-colors font-mono ${
                    regErrors.phone
                      ? 'border-rose-500 bg-rose-50/40 focus:border-rose-600 focus:ring-1 focus:ring-rose-500'
                      : 'border-stone-300 focus:border-[#5C1D24] focus:ring-1 focus:ring-[#5C1D24]'
                  }`}
                />
                {regErrors.phone && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">{regErrors.phone}</p>
                )}
              </div>

              {/* 4. Mật khẩu (Tối thiểu 8 ký tự kèm eye icon) */}
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Mật khẩu
                </label>
                <div className="relative">
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Tối thiểu 8 ký tự"
                    minLength={8}
                    className="w-full pl-3.5 pr-10 py-2.5 text-xs text-charcoal-900 bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-[#5C1D24] focus:ring-1 focus:ring-[#5C1D24] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* 5. Xác nhận mật khẩu (Nhập lại mật khẩu kèm eye icon) */}
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Xác nhận mật khẩu
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu"
                    minLength={8}
                    className="w-full pl-3.5 pr-10 py-2.5 text-xs text-charcoal-900 bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-[#5C1D24] focus:ring-1 focus:ring-[#5C1D24] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Nút Submit ĐĂNG KÝ TÀI KHOẢN */}
              <button
                type="submit"
                className="w-full py-3 bg-[#5C1D24] hover:bg-[#4A121D] active:bg-[#330C14] text-white font-bold text-xs uppercase tracking-widest rounded-lg shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <span>ĐĂNG KÝ TÀI KHOẢN</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* ========================================================= */}
          {/* TAB 3: FORM QUÊN MẬT KHẨU / KHÔI PHỤC                    */}
          {/* ========================================================= */}
          {authModalTab === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4 my-auto py-3">
              {!otpSent ? (
                <>
                  <p className="text-xs text-stone-600 leading-relaxed font-sans">
                    Nhập email đã đăng ký tài khoản. Hệ thống sẽ gửi một mã xác thực OTP 6 số để bạn đặt lại mật khẩu mới.
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-charcoal-700 mb-1">Email của bạn</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full px-3.5 py-2.5 text-xs text-charcoal-900 bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-[#5C1D24] focus:ring-1 focus:ring-[#5C1D24]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#5C1D24] hover:bg-[#4A121D] text-white font-bold text-xs uppercase tracking-widest rounded-lg transition-all cursor-pointer"
                  >
                    GỬI MÃ XÁC THỰC OTP
                  </button>
                </>
              ) : (
                <>
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Mã OTP đã gửi đến: {email}</p>
                      <p className="text-[11px] text-emerald-700 mt-0.5">Mã thử nghiệm demo: <strong>123456</strong></p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-charcoal-700 mb-1">Nhập mã OTP (6 số)</label>
                    <input
                      type="text"
                      required
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value)}
                      placeholder="123456"
                      maxLength={6}
                      className="w-full px-3.5 py-2.5 text-sm tracking-widest font-mono text-center bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-[#5C1D24]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-charcoal-700 mb-1">Mật khẩu mới</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Nhập mật khẩu mới"
                      className="w-full px-3.5 py-2.5 text-xs text-charcoal-900 bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-[#5C1D24]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase tracking-widest rounded-lg transition-all cursor-pointer"
                  >
                    XÁC NHẬN ĐỔI MẬT KHẨU
                  </button>
                </>
              )}
            </form>
          )}

          {/* 3. Chân trang Form: Chuyển đổi trạng thái & Điều khoản */}
          <div className="pt-2 text-center border-t border-stone-100 mt-2">
            {authModalTab === 'login' ? (
              <p className="text-xs text-stone-600 font-sans">
                Chưa có tài khoản?{' '}
                <button
                  type="button"
                  onClick={() => openAuthModal('register')}
                  className="font-bold text-[#5C1D24] hover:underline cursor-pointer"
                >
                  Đăng ký ngay
                </button>
              </p>
            ) : (
              <p className="text-xs text-stone-600 font-sans">
                Đã có tài khoản?{' '}
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="font-bold text-[#5C1D24] hover:underline cursor-pointer"
                >
                  Đăng nhập ngay
                </button>
              </p>
            )}

            <p className="text-[10px] text-stone-400 mt-1.5 leading-relaxed font-sans">
              Bằng việc tiếp tục, bạn đồng ý với Điều khoản sử dụng và Chính sách bảo mật của Curve & Confidence.
            </p>
          </div>

        </div>

      </div>

      {/* ========================================================= */}
      {/* GOOGLE ACCOUNT CHOOSER SIMULATION MODAL (API READY)       */}
      {/* ========================================================= */}
      {showGoogleChooser && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 sm:p-6 bg-stone-900/40 backdrop-blur-md animate-fadeIn"
          onClick={() => setShowGoogleChooser(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl border border-stone-200 max-w-sm w-full p-6 text-charcoal-900 relative my-auto animate-scaleIn text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowGoogleChooser(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <div>
                <h3 className="font-bold text-sm text-charcoal-900">Đăng nhập bằng Google</h3>
                <p className="text-[11px] text-stone-500">Chọn tài khoản tiếp tục đến Curve & Confidence</p>
              </div>
            </div>

            <div className="space-y-2 my-4">
              <button
                type="button"
                onClick={() => handleGoogleAuthSelect('lan.nguyen@gmail.com', 'Nguyễn Thị Lan')}
                className="w-full p-2.5 rounded-xl border border-stone-200 hover:border-[#5C1D24] hover:bg-stone-50 flex items-center gap-3 text-left transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs">
                  NL
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-charcoal-900 truncate">Nguyễn Thị Lan (Đã có tài khoản)</p>
                  <p className="text-[10px] text-stone-500 truncate">lan.nguyen@gmail.com</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleGoogleAuthSelect('khachmoi.google@gmail.com', 'Khách Hàng Mới')}
                className="w-full p-2.5 rounded-xl border border-stone-200 hover:border-[#5C1D24] hover:bg-stone-50 flex items-center gap-3 text-left transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                  G
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-charcoal-900 truncate">Tài khoản Google Mới (Chưa đăng ký)</p>
                  <p className="text-[10px] text-stone-500 truncate">khachmoi.google@gmail.com</p>
                </div>
              </button>
            </div>

            <p className="text-[10px] text-stone-400 text-center">
              Chế độ sẵn sàng: Tích hợp OAuth 2.0 Identity Services API khi có Client ID.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
