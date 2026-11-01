import React, { useState, useRef, useEffect } from 'react';
import { Bell, ChevronDown, ArrowLeft, ExternalLink, LogOut, User, Ruler, ShoppingBag, MapPin } from 'lucide-react';
import { UserRole } from '../../../shared/types';
import { useAuth } from '../../user/context/AuthContext';

interface AdminHeaderProps {
  currentRole: UserRole;
  onBackToStore: () => void;
  onShowNotification: () => void;
  onSwitchRole?: (role: UserRole) => void;
  onNavigate?: (path: string) => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  currentRole,
  onBackToStore,
  onShowNotification,
  onNavigate,
}) => {
  const { currentUser, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getUserPillInfo = () => {
    if (currentRole === 'admin') {
      return {
        initial: currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'A',
        bg: 'bg-[#70222B]',
        name: currentUser?.name || 'Administrator',
        desc: 'Quản trị hệ thống',
        roleLabel: 'Super Admin',
      };
    }
    if (currentRole === 'manager') {
      return {
        initial: currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'M',
        bg: 'bg-amber-600',
        name: currentUser?.name || 'Store Manager',
        desc: 'Vận hành kinh doanh',
        roleLabel: 'Store Manager',
      };
    }
    return {
      initial: currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'C',
      bg: 'bg-blue-600',
      name: currentUser?.name || 'Customer Member',
      desc: 'Khách hàng thành viên',
      roleLabel: 'Khách hàng',
    };
  };

  const pill = getUserPillInfo();

  return (
    <header className="bg-[#18181B] text-white px-6 py-3 flex items-center justify-between border-b border-stone-800 sticky top-0 z-30 shadow-md">
      <div className="flex items-center gap-4">
        {/* Brand Logo & System Space Label matching Image 2 Demo */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-white p-1 shadow-sm border border-stone-700/90 shrink-0 flex items-center justify-center overflow-hidden">
            <img
              src="/images/logo.png?v=2"
              alt="Curve & Confidence Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <span className="font-extrabold text-base sm:text-lg tracking-tight block text-white uppercase leading-tight">
              CURVE & CONFIDENCE
            </span>
            <span className="text-[11px] text-stone-300 block mt-0.5 font-medium">
              {currentRole === 'manager' ? 'Không gian quản lý vận hành' : 'Không gian quản trị hệ thống'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Nút Về Cửa Hàng đặt ở góc trên Header */}
        <button
          onClick={onBackToStore}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-stone-800/90 hover:bg-brand-700 text-stone-200 hover:text-white border border-stone-700 hover:border-brand-600 transition-all shadow-xs cursor-pointer"
          title="Quay lại cửa hàng mua sắm"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-stone-300" />
          <span>Về cửa hàng</span>
          <ExternalLink className="w-3 h-3 text-stone-400" />
        </button>

        {/* Notification Bell */}
        <button
          onClick={onShowNotification}
          className="p-1.5 text-stone-300 hover:text-white rounded-lg hover:bg-stone-800 transition-colors relative"
          title="Thông báo"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full" />
        </button>

        {/* User Role Profile Pill */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 pl-2 border-l border-stone-800 hover:bg-stone-800/60 p-1.5 rounded-xl transition-all cursor-pointer text-left"
            title="Tài khoản cá nhân"
          >
            <div className={`w-7 h-7 rounded-full ${pill.bg} text-white flex items-center justify-center font-bold text-xs`}>
              {pill.initial}
            </div>
            <div className="hidden lg:block text-left text-xs leading-tight">
              <span className="font-bold block text-white">{pill.name}</span>
              <span className="text-[10px] text-stone-400 block">{pill.desc}</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-stone-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* User Profile Card Dropdown matching reference image */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white text-charcoal-900 rounded-2xl shadow-2xl border border-stone-200/90 overflow-hidden z-50 animate-scaleIn text-left">
              {/* Header: Avatar, Name, Email, Phone directly from Database */}
              <div className="p-3.5 bg-[#FAF7F5] border-b border-stone-100 flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className={`w-12 h-12 rounded-full text-white flex items-center justify-center font-bold text-lg shadow-xs ${pill.bg}`}>
                    {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : pill.initial}
                  </div>
                  {/* Active Green Dot */}
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-stone-900 text-sm leading-snug truncate">
                    {currentUser?.name || pill.name}
                  </div>
                  <div className="text-stone-500 text-xs truncate mt-0.5 leading-tight font-normal">
                    {currentUser?.email || (currentRole === 'admin' ? 'binh98@gmail.com' : 'linhkhanh@gmail.com')}
                  </div>
                  <div className="text-stone-500 text-xs truncate mt-0.5 leading-tight font-normal">
                    {currentUser?.phone || 'Chưa cập nhật SĐT'}
                  </div>
                </div>
              </div>

              {/* Menu Options: Only Account & Logout for Manager/Admin */}
              <div className="p-2 space-y-1">
                {/* Option 1: Tài khoản của tôi */}
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    if (onNavigate) {
                      onNavigate('/account/profile?tab=info');
                    } else {
                      onBackToStore();
                      window.location.href = '/account/profile?tab=info';
                    }
                  }}
                  className="w-full text-left p-2 rounded-xl hover:bg-[#FAF6F6] transition-colors flex items-center gap-2.5 group cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-7 bg-[#5C1D24] rounded-r-full opacity-0 group-hover:opacity-100 transition-all duration-200" />
                  <div className="w-10 h-10 rounded-xl bg-[#F4EFEB] text-stone-700 group-hover:bg-[#5C1D24] group-hover:text-white flex items-center justify-center shrink-0 ml-1 transition-all duration-200 shadow-xs">
                    <User className="w-5 h-5 stroke-[1.75]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-stone-900 group-hover:text-[#5C1D24] transition-colors leading-snug">
                      Tài khoản của tôi
                    </div>
                    <div className="text-[11px] text-stone-500 truncate leading-snug">
                      Hồ sơ cá nhân & đổi mật khẩu
                    </div>
                  </div>
                </button>

                {/* Divider */}
                <div className="my-1 border-t border-stone-100" />

                {/* Option 2: Đăng xuất */}
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    logout();
                    onBackToStore();
                  }}
                  className="w-full text-left p-2 rounded-xl hover:bg-rose-50/70 transition-colors flex items-center gap-2.5 group cursor-pointer relative overflow-hidden"
                >
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white flex items-center justify-center shrink-0 ml-1 transition-all duration-200">
                    <LogOut className="w-5 h-5 stroke-[1.75]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-rose-700 group-hover:text-rose-800 transition-colors leading-snug">
                      Đăng xuất
                    </div>
                    <div className="text-[11px] text-rose-500/80 group-hover:text-rose-600 truncate leading-snug">
                      Thoát tài khoản khỏi phiên làm việc
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
