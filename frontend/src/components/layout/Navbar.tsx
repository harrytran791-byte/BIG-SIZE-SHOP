import React, { useState, useRef, useEffect } from 'react';
import { Search, ShoppingBag, User, Menu, X, ChevronDown, LogOut } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useBodyProfile } from '../../context/BodyProfileContext';
import { useAuth } from '../../context/AuthContext';
import { mockProducts } from '../../data/products';
import { Product } from '../../types';
import { normalizeRole, hasAdminPortalAccess, getRoleDisplayInfo } from '../../shared/utils/roleUtils';

interface NavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onOpenMobileMenu: () => void;
  onOpenProfileModal?: () => void;
  onOpenAdminPortal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPath,
  onNavigate,
  onOpenMobileMenu,
  onOpenProfileModal,
  onOpenAdminPortal,
}) => {
  const { totalItemsCount, setIsCartDrawerOpen } = useCart();
  const { wishlistCount } = useWishlist();
  const { activeProfile } = useBodyProfile();
  const { currentUser, currentRole, switchRole, logout, openAuthModal, openLoginPrompt } = useAuth();

  const userRole = normalizeRole(currentUser?.role || currentRole, currentUser?.email);
  const canAccessAdmin = hasAdminPortalAccess(currentUser, currentRole);
  const roleInfo = getRoleDisplayInfo(userRole, currentUser?.email);
  const shortName = currentUser?.name
    ? currentUser.name.trim().split(' ').slice(-1)[0]
    : '';

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Filter suggestions
  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      const q = searchQuery.toLowerCase();
      const filtered = mockProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)) ||
          p.category.toLowerCase().includes(q)
      );
      setSuggestions(filtered.slice(0, 5));
      setIsSearchOpen(true);
    } else {
      setSuggestions([]);
      setIsSearchOpen(false);
    }
  }, [searchQuery]);

  // Click outside search
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsSearchOpen(false);
      onNavigate(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const navLinks = [
    { label: 'TRANG CHỦ', path: '/' },
    {
      label: 'SẢN PHẨM',
      path: '/products',
      hasDropdown: true,
    },
    { label: 'BEST SELLER', path: '/products?filter=bestseller' },
    { label: 'ĐỒ NAM', path: '/products?gender=nam' },
    { label: 'ĐỒ NỮ', path: '/products?gender=nu' },
    { label: 'HƯỚNG DẪN SIZE', path: '/size-guide' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-surface-border transition-all">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-24 gap-3 xl:gap-6">
          {/* Khu vực 1: Logo & Mobile Hamburger (Bên trái) */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onOpenMobileMenu}
              className="lg:hidden p-2 text-charcoal-700 hover:text-charcoal-900 rounded-lg hover:bg-surface-cream transition-colors"
              aria-label="Mở menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Brand Logo matching Image 1 Demo */}
            <a
              href="#/"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/');
              }}
              className="group flex flex-col items-center justify-center select-none whitespace-nowrap py-1"
              title="Curve & Confidence - Thời Trang Big Size"
            >
              <img
                src="/images/logo.png?v=2"
                alt="Curve & Confidence Big Size Logo"
                className="h-14 sm:h-16 lg:h-[68px] w-auto object-contain transition-transform group-hover:scale-105 drop-shadow-2xs"
              />
              <span className="font-sans text-[11px] sm:text-xs lg:text-[13px] font-black tracking-[0.22em] text-charcoal-900 group-hover:text-brand-700 transition-colors uppercase whitespace-nowrap mt-1">
                CURVE & CONFIDENCE
              </span>
            </a>
          </div>

          {/* Khu vực 2: Menu điều hướng ở giữa */}
          <nav className="hidden lg:flex items-center justify-center gap-3.5 xl:gap-6 2xl:gap-8 text-xs font-bold tracking-wider flex-1 mx-2 xl:mx-4">
            {navLinks.map((link) => {
              const isActive =
                currentPath === link.path ||
                (link.path === '/products' && currentPath.startsWith('/products') && !currentPath.includes('filter'));

              if (link.hasDropdown) {
                return (
                  <div
                    key={link.label}
                    className="relative group py-2 shrink-0"
                    onMouseEnter={() => setIsProductDropdownOpen(true)}
                    onMouseLeave={() => setIsProductDropdownOpen(false)}
                  >
                    <button
                      onClick={() => onNavigate('/products')}
                      className={`flex items-center gap-1 transition-colors uppercase tracking-wider py-1 whitespace-nowrap ${
                        isActive ? 'text-brand-700 font-bold' : 'text-charcoal-800 hover:text-brand-700'
                      }`}
                    >
                      <span className="whitespace-nowrap">{link.label}</span>
                      <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                    </button>

                    {/* Dropdown Menu */}
                    {isProductDropdownOpen && (
                      <div className="absolute top-full left-0 w-48 bg-white border border-surface-border rounded-2xl shadow-modal py-2 z-50 animate-fadeIn text-xs">
                        <button
                          onClick={() => {
                            setIsProductDropdownOpen(false);
                            onNavigate('/products');
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-surface-cream font-semibold text-charcoal-800 hover:text-brand-700"
                        >
                          Tất cả sản phẩm
                        </button>
                        <button
                          onClick={() => {
                            setIsProductDropdownOpen(false);
                            onNavigate('/products?category=ao-thun');
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-surface-cream text-charcoal-600 hover:text-brand-700"
                        >
                          Áo Thun & Polo
                        </button>
                        <button
                          onClick={() => {
                            setIsProductDropdownOpen(false);
                            onNavigate('/products?category=quan-jeans');
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-surface-cream text-charcoal-600 hover:text-brand-700"
                        >
                          Quần & Jeans
                        </button>
                        <button
                          onClick={() => {
                            setIsProductDropdownOpen(false);
                            onNavigate('/products?category=dam-vay');
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-surface-cream text-charcoal-600 hover:text-brand-700"
                        >
                          Đầm & Váy
                        </button>
                        <button
                          onClick={() => {
                            setIsProductDropdownOpen(false);
                            onNavigate('/products?category=do-bo');
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-surface-cream text-charcoal-600 hover:text-brand-700"
                        >
                          Đồ Bộ & Thể Thao
                        </button>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <a
                  key={link.label}
                  href={`#${link.path}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate(link.path);
                  }}
                  className={`transition-colors relative py-1 uppercase tracking-wider whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'text-brand-700 font-bold'
                      : 'text-charcoal-800 hover:text-brand-700'
                  }`}
                >
                  <span className="whitespace-nowrap">{link.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-700 rounded-full" />
                  )}
                </a>
              );
            })}
          </nav>

          {/* Khu vực 3: Cụm tiện ích & tài khoản bên phải */}
          <div className="flex items-center gap-2.5 sm:gap-3 xl:gap-3.5 shrink-0" ref={searchRef}>
            {/* Search Trigger */}
            <div className="relative flex items-center">
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="w-9 h-9 flex items-center justify-center text-charcoal-800 hover:text-brand-700 hover:bg-surface-cream rounded-lg transition-colors"
                aria-label="Tìm kiếm"
              >
                <Search className="w-5 h-5 stroke-[1.75]" />
              </button>

              {/* Search popup bar */}
              {isSearchOpen && (
                <div className="absolute right-0 top-full mt-3 w-72 sm:w-80 bg-white rounded-2xl shadow-modal border border-surface-border p-3 z-50 animate-fadeIn">
                  <form onSubmit={handleSearchSubmit} className="relative">
                    <input
                      type="text"
                      placeholder="Tìm áo polo, đầm, jeans..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                      className="w-full bg-surface-cream border border-surface-border rounded-xl py-2 pl-8 pr-3 text-xs text-charcoal-900 focus:outline-none focus:border-brand-700"
                    />
                    <Search className="w-3.5 h-3.5 text-charcoal-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </form>

                  {/* Quick suggestions */}
                  {suggestions.length > 0 && (
                    <div className="mt-2 divide-y divide-surface-border max-h-60 overflow-y-auto">
                      {suggestions.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setIsSearchOpen(false);
                            onNavigate(`/product/${item.id}`);
                          }}
                          className="w-full flex items-center gap-2.5 p-2 hover:bg-surface-cream text-left rounded-lg transition-colors"
                        >
                          <img
                            src={item.images[0]}
                            alt=""
                            className="w-9 h-11 object-cover rounded bg-stone-100 shrink-0"
                          />
                          <div className="truncate text-xs">
                            <p className="font-semibold text-charcoal-900 truncate">{item.name}</p>
                            <p className="text-brand-700 font-bold">{item.price.toLocaleString('vi-VN')}đ</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Portal Button (when Manager or Admin) */}
            {canAccessAdmin && onOpenAdminPortal && (
              <button
                onClick={onOpenAdminPortal}
                className="hidden sm:inline-flex items-center justify-center px-3.5 py-2 bg-[#5C1D24] hover:bg-[#4A121D] text-white text-xs font-bold rounded-lg shadow-sm transition-all whitespace-nowrap leading-none tracking-wide cursor-pointer"
                title={userRole === 'manager' ? 'Mở Không Gian Quản Lý Cửa Hàng' : 'Mở Không Gian Quản Trị Hệ Thống'}
              >
                {userRole === 'manager' ? 'CỔNG QUẢN LÝ' : 'CỔNG QUẢN TRỊ'}
              </button>
            )}

            {!currentUser ? (
              <>
                {/* Quick Login Button (Chỉ hiện khi CHƯA đăng nhập) */}
                <button
                  onClick={() => onNavigate('/login')}
                  className="hidden lg:inline-flex items-center justify-center px-3.5 py-2 text-xs font-bold text-[#5C1D24] hover:bg-[#5C1D24]/10 rounded-lg transition-colors border border-[#5C1D24]/30 whitespace-nowrap leading-none tracking-wide cursor-pointer"
                >
                  Đăng nhập
                </button>

                {/* User Account Trigger for Guests */}
                <div className="relative flex items-center" ref={userMenuRef}>
                  <button
                    onClick={() => onNavigate('/login')}
                    className="w-9 h-9 flex items-center justify-center text-charcoal-800 hover:text-brand-700 hover:bg-surface-cream rounded-lg transition-colors relative group cursor-pointer"
                    aria-label="Đăng nhập tài khoản"
                    title="Đăng nhập tài khoản"
                  >
                    <User className="w-5 h-5 stroke-[1.75]" />
                  </button>
                </div>
              </>
            ) : (
              /* User Greeting Pill (Khi ĐÃ đăng nhập - Option 1) */
              <div className="relative flex items-center" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-full hover:bg-surface-cream border border-stone-200 transition-all cursor-pointer group text-left shadow-xs"
                  aria-label="Tài khoản cá nhân"
                  title={`Tài khoản: ${currentUser.name}`}
                >
                  <div className={`w-7 h-7 rounded-full text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs overflow-hidden ${
                    userRole === 'admin' ? 'bg-[#70222B]' : userRole === 'manager' ? 'bg-amber-600' : 'bg-[#5C1D24]'
                  }`}>
                    {currentUser.avatar ? (
                      <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                    ) : (
                      currentUser.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="hidden md:flex items-center gap-1">
                    <span className="text-xs font-bold text-charcoal-800 group-hover:text-[#5C1D24] transition-colors whitespace-nowrap">
                      Chào, {shortName || currentUser.name}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-stone-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {/* User Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-surface-border p-3 z-50 animate-fadeIn text-xs">
                    {/* Header Card without role badge */}
                    <div className="p-3 bg-stone-50 rounded-xl mb-2 border border-stone-200/80">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs overflow-hidden ${
                          userRole === 'admin' ? 'bg-[#70222B]' : userRole === 'manager' ? 'bg-amber-600' : 'bg-[#5C1D24]'
                        }`}>
                          {currentUser.avatar ? (
                            <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                          ) : (
                            currentUser.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-charcoal-900 text-xs truncate leading-snug">{currentUser.name}</p>
                          <p className="text-[11px] text-charcoal-500 truncate mt-0.5">{currentUser.email}</p>
                          {currentUser.phone && (
                            <p className="text-[10px] text-stone-400 font-mono mt-0.5">{currentUser.phone}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Phân biệt: Đối với Manager & Admin -> Chỉ hiện 2 mục đúng như ảnh người dùng gửi */}
                    {userRole === 'manager' || userRole === 'admin' ? (
                      <div className="space-y-1">
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onNavigate('/account/profile');
                          }}
                          className="w-full text-left p-2.5 hover:bg-stone-50 rounded-xl transition-colors flex items-center gap-3 group cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded-lg bg-stone-100 group-hover:bg-[#5C1D24]/10 text-stone-600 group-hover:text-[#5C1D24] flex items-center justify-center shrink-0 transition-colors">
                            <User className="w-4 h-4 stroke-[2]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-xs text-stone-900 block leading-tight group-hover:text-[#5C1D24]">Thông tin tài khoản</span>
                            <span className="text-[10px] text-stone-400 block mt-0.5">Hồ sơ cá nhân & đổi mật khẩu</span>
                          </div>
                        </button>

                        <div className="pt-1.5 border-t border-stone-100">
                          <button
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              logout();
                              onNavigate('/');
                            }}
                            className="w-full text-left p-2.5 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-3 group cursor-pointer text-rose-600"
                          >
                            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                              <LogOut className="w-4 h-4 stroke-[2]" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-xs text-rose-600 block leading-tight">Đăng xuất</span>
                              <span className="text-[10px] text-rose-400 block mt-0.5">Thoát tài khoản khỏi phiên làm việc</span>
                            </div>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Dành cho Khách hàng thông thường (Customer) */
                      <div className="space-y-1">
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onNavigate('/account/profile');
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-surface-cream text-charcoal-800 font-semibold rounded-lg transition-colors flex items-center justify-between cursor-pointer"
                        >
                          <span>Hồ Sơ, Sổ Địa Chỉ & Đơn Hàng</span>
                          <span className="text-[10px] text-charcoal-400">➔</span>
                        </button>

                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onNavigate('/account/body-profiles');
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-surface-cream text-charcoal-800 font-semibold rounded-lg transition-colors flex items-center justify-between cursor-pointer"
                        >
                          <span>Hồ Sơ Số Đo AI (AI Fit)</span>
                          <span className="text-[10px] text-brand-700 font-bold">XL-5XL</span>
                        </button>

                        <div className="pt-2 border-t border-stone-100">
                          <button
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              logout();
                            }}
                            className="w-full text-left px-3 py-1.5 text-rose-600 hover:bg-rose-50 font-bold rounded-lg transition-colors cursor-pointer"
                          >
                            Đăng Xuất
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Cart Drawer Trigger */}
            <div className="relative flex items-center">
              <button
                onClick={() => {
                  if (userRole === 'manager' || userRole === 'admin') {
                    alert('Tài khoản Quản lý / Quản trị viên đang ở chế độ xem trước hệ thống và không được phép đặt hàng.');
                    return;
                  }
                  setIsCartDrawerOpen(true);
                }}
                className="w-9 h-9 flex items-center justify-center text-charcoal-800 hover:text-brand-700 hover:bg-surface-cream rounded-lg transition-colors relative group cursor-pointer"
                aria-label="Xem giỏ hàng"
              >
                <ShoppingBag className="w-5 h-5 stroke-[1.75]" />
                {userRole !== 'manager' && userRole !== 'admin' && totalItemsCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-[#5C1D24] text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 shadow-xs">
                    {totalItemsCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
