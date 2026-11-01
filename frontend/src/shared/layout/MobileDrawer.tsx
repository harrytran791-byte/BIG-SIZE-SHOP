import React, { useState } from 'react';
import { X, Search, ChevronRight, User, Compass, Heart, HelpCircle, BookOpen, Layers } from 'lucide-react';
import { useWishlist } from '@/context/WishlistContext';
import { useBodyProfile } from '@/context/BodyProfileContext';
import { useAuth } from '@/context/AuthContext';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({ isOpen, onClose, onNavigate }) => {
  const [mobileSearch, setMobileSearch] = useState('');
  const { wishlistCount } = useWishlist();
  const { activeProfile } = useBodyProfile();
  const { currentUser } = useAuth();

  if (!isOpen) return null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (mobileSearch.trim()) {
      onClose();
      onNavigate(`/products?q=${encodeURIComponent(mobileSearch.trim())}`);
    }
  };

  const menuItems = [
    { label: 'Trang chủ', path: '/' },
    { label: 'Tất cả sản phẩm', path: '/products' },
    { label: 'Bán chạy nhất (Best Seller)', path: '/products?filter=bestseller' },
    { label: 'Thời trang Nam Big Size (XL - 5XL)', path: '/products?gender=nam' },
    { label: 'Thời trang Nữ Big Size (XL - 5XL)', path: '/products?gender=nu' },
    { label: 'Hướng dẫn chọn & đo size', path: '/size-guide' },
    { label: 'Quản lý hồ sơ số đo', path: '/account/body-profiles' },
    { label: 'Câu hỏi thường gặp (FAQ)', path: '/faq' },
    { label: 'Liên hệ & Hệ thống cửa hàng', path: '/contact' },
  ];

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/40 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className="fixed inset-y-0 left-0 max-w-xs w-full bg-white shadow-modal flex flex-col z-10 animate-slideRight">
        {/* Header */}
        <div className="p-4 border-b border-surface-border flex items-center justify-between bg-surface-cream">
          <div className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-xl bg-white p-0.5 shadow-2xs border border-surface-border shrink-0 flex items-center justify-center overflow-hidden">
              <img
                src="/images/logo.png?v=2"
                alt="Curve & Confidence Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-charcoal-900 leading-tight">CURVE & CONFIDENCE</h3>
              <p className="text-[9.5px] text-charcoal-500 uppercase tracking-widest font-semibold mt-0.5">
                Big Size XL - 5XL
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-charcoal-500 hover:text-charcoal-900 rounded-lg"
            aria-label="Đóng menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Search */}
        <div className="p-4 border-b border-surface-border">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              placeholder="Tìm kiếm sản phẩm..."
              value={mobileSearch}
              onChange={(e) => setMobileSearch(e.target.value)}
              className="w-full bg-surface-cream rounded-full py-2 pl-9 pr-4 text-xs text-charcoal-800 border border-surface-border focus:outline-none focus:border-brand-500"
            />
            <Search className="w-4 h-4 text-charcoal-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </form>
        </div>

        {/* Auth CTA Banner (Dành riêng cho khách trên điện thoại) */}
        {!currentUser ? (
          <div className="px-4 py-3 bg-[#FAF8F5] border-b border-surface-border flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-charcoal-900">Tài khoản thành viên</p>
              <p className="text-[10px] text-stone-500">Đăng nhập để nhận ưu đãi</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  onClose();
                  onNavigate('/login');
                }}
                className="px-2.5 py-1.5 bg-[#5C1D24] text-white text-xs font-bold rounded-lg shadow-xs hover:bg-[#4A151B] transition-colors"
              >
                Đăng nhập
              </button>
              <button
                onClick={() => {
                  onClose();
                  onNavigate('/register');
                }}
                className="px-2.5 py-1.5 bg-white border border-stone-200 text-charcoal-800 text-xs font-bold rounded-lg shadow-xs hover:bg-stone-50 transition-colors"
              >
                Đăng ký
              </button>
            </div>
          </div>
        ) : (
          <div className="px-4 py-3 bg-stone-50 border-b border-surface-border flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <div className="w-7 h-7 rounded-full bg-[#5C1D24] text-white flex items-center justify-center font-bold text-xs shrink-0">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-charcoal-900 truncate">{currentUser.name}</p>
                <p className="text-[10px] text-stone-500 truncate">{currentUser.email}</p>
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                onNavigate('/account/profile');
              }}
              className="text-xs font-bold text-[#5C1D24] underline shrink-0 ml-2"
            >
              Hồ sơ
            </button>
          </div>
        )}

        {/* Active Profile Banner */}
        <div className="px-4 py-3 bg-brand-50 border-b border-brand-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-brand-600" />
            <div>
              <p className="text-xs font-bold text-brand-900">
                {activeProfile ? activeProfile.name : 'Chưa có hồ sơ'}
              </p>
              <p className="text-[10px] text-brand-600">
                {activeProfile ? `${activeProfile.weight}kg | ${activeProfile.height}cm` : 'Nhập số đo để gợi ý size'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              onClose();
              onNavigate('/account/body-profiles');
            }}
            className="text-[11px] font-bold text-brand-600 underline"
          >
            Đổi
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto py-2 divide-y divide-surface-border/50">
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                onClose();
                onNavigate(item.path);
              }}
              className="w-full px-4 py-3 flex items-center justify-between text-left text-xs font-medium text-charcoal-700 hover:text-brand-600 hover:bg-surface-cream transition-colors"
            >
              <span>{item.label}</span>
              <ChevronRight className="w-4 h-4 text-charcoal-300" />
            </button>
          ))}
        </div>

        {/* Bottom utility links */}
        <div className="p-4 border-t border-surface-border bg-stone-50 space-y-2">
          <button
            onClick={() => {
              onClose();
              onNavigate('/order-tracking');
            }}
            className="w-full flex items-center gap-2 text-xs font-semibold text-charcoal-800 py-1.5"
          >
            <Compass className="w-4 h-4 text-brand-500" />
            <span>Tra cứu tình trạng đơn hàng</span>
          </button>
          <button
            onClick={() => {
              onClose();
              onNavigate('/products?filter=wishlist');
            }}
            className="w-full flex items-center justify-between text-xs font-semibold text-charcoal-800 py-1.5"
          >
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-500" />
              <span>Sản phẩm đã thích</span>
            </div>
            {wishlistCount > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {wishlistCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
