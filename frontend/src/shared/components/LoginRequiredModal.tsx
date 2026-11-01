import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShoppingBag, Lock, LogIn, UserPlus, X, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface LoginRequiredModalProps {
  onNavigate: (path: string) => void;
}

export const LoginRequiredModal: React.FC<LoginRequiredModalProps> = ({ onNavigate }) => {
  const { isLoginPromptOpen, loginPromptMessage, closeLoginPrompt, openAuthModal } = useAuth();

  useEffect(() => {
    if (!isLoginPromptOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLoginPrompt();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLoginPromptOpen, closeLoginPrompt]);

  if (!isLoginPromptOpen) return null;

  const handleGoToLogin = () => {
    closeLoginPrompt();
    // Lưu lại đường dẫn trang sản phẩm hiện tại để đăng nhập xong quay lại đúng trang này
    try {
      sessionStorage.setItem('auth_redirect_url', window.location.pathname + window.location.search);
    } catch {}
    onNavigate('/login');
  };

  const handleGoToRegister = () => {
    closeLoginPrompt();
    try {
      sessionStorage.setItem('auth_redirect_url', window.location.pathname + window.location.search);
    } catch {}
    onNavigate('/register');
  };

  const content = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/40 backdrop-blur-md transition-opacity animate-fadeIn"
        onClick={closeLoginPrompt}
      />

      {/* Modal Card */}
      <div className="relative bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-stone-200 z-10 animate-scaleIn overflow-hidden my-auto">
        {/* Subtle decorative background glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-[#5C1D24]/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close button */}
        <button
          onClick={closeLoginPrompt}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors cursor-pointer"
          aria-label="Đóng thông báo"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Icon Header */}
        <div className="w-14 h-14 rounded-2xl bg-[#5C1D24]/10 text-[#5C1D24] flex items-center justify-center mb-5 border border-[#5C1D24]/20 shadow-xs">
          <div className="relative">
            <ShoppingBag className="w-7 h-7" />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#5C1D24] rounded-full flex items-center justify-center text-white">
              <Lock className="w-2.5 h-2.5" />
            </div>
          </div>
        </div>

        {/* Title & Description */}
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C1D24] block mb-1">
          YÊU CẦU XÁC THỰC TÀI KHOẢN
        </span>
        <h2 className="text-xl sm:text-2xl font-extrabold text-charcoal-900 tracking-tight leading-tight">
          Vui Lòng Đăng Nhập
        </h2>
        <p className="text-xs sm:text-sm text-stone-600 mt-2 leading-relaxed">
          {loginPromptMessage ||
            'Để thêm sản phẩm vào giỏ hàng, lưu số đo cá nhân và quản lý đơn hàng của bạn, vui lòng đăng nhập hoặc tạo tài khoản mới.'}
        </p>

        {/* Benefits bullets */}
        <div className="mt-4 p-3 bg-stone-50 rounded-2xl border border-stone-200/80 text-xs text-stone-600 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>Lưu hồ sơ số đo 3D để tự động gợi ý chuẩn size XL–5XL</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>Theo dõi lộ trình giao hàng trực tiếp & đổi size miễn phí 7 ngày</span>
          </div>
        </div>

        {/* 2 Action Buttons */}
        <div className="mt-6 space-y-2.5">
          {/* Button 1: Đăng Nhập (Primary) */}
          <button
            type="button"
            onClick={handleGoToLogin}
            className="w-full py-3.5 px-4 bg-[#5C1D24] hover:bg-[#48161C] text-white text-xs sm:text-sm font-bold rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer group"
          >
            <LogIn className="w-4 h-4" />
            <span>Đăng Nhập Ngay</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform ml-auto" />
          </button>

          {/* Button 2: Đăng Ký (Secondary) */}
          <button
            type="button"
            onClick={handleGoToRegister}
            className="w-full py-3 px-4 bg-white hover:bg-stone-50 text-charcoal-800 text-xs sm:text-sm font-bold rounded-2xl border border-stone-300 hover:border-stone-400 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-[#5C1D24]" />
            <span>Tạo Tài Khoản Mới (Đăng Ký)</span>
          </button>
        </div>

        {/* Dismiss option */}
        <div className="text-center mt-4">
          <button
            type="button"
            onClick={closeLoginPrompt}
            className="text-xs text-stone-400 hover:text-stone-600 font-medium transition-colors cursor-pointer"
          >
            Để sau, tôi muốn tiếp tục xem đồ
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
};
