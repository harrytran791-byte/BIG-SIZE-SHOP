import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ShoppingBag, User, Menu, X, ChevronDown, Ruler, MapPin, LogOut, Warehouse, Bell, AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useBodyProfile } from '@/context/BodyProfileContext';
import { useAuth } from '@/context/AuthContext';
import { useOrder } from '@/context/OrderContext';
import { useReturn } from '@/modules/return/context/ReturnContext';
import { ReturnRecoveryEditor } from '@/modules/return/components/ReturnRecoveryEditor';
import type { RecoverySnapshot } from '@/modules/return/services/returnRecovery';
import { useToast } from '@/shared/context/ToastContext';
import { useProducts } from '@/modules/product/context/ProductContext';
import { mockProducts } from '@/data/products';
import { Product, Order } from '@/types';
import { normalizeRole, hasAdminPortalAccess, getRoleDisplayInfo } from '@/shared/utils/roleUtils';
import {
  normalizeFullName,
  validateFullName,
  validateVietnamesePhone,
  clampPhoneInput
} from '@/shared/utils/userInputValidation';

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
  const { products } = useProducts();
  const { orders, updateOrderShippingAddress, refreshOrders } = useOrder();
  const { showToast } = useToast();

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

  // In-App Notification State
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const [customerEditOrder, setCustomerEditOrder] = useState<Order | null>(null);
  const [isSavingCustomerAddress, setIsSavingCustomerAddress] = useState(false);
  const [customerAddressForm, setCustomerAddressForm] = useState({
    fullName: '',
    phone: '',
    addressDetail: '',
    ward: '',
    district: '',
    province: 'TP. Hồ Chí Minh'
  });

  const { returnRequests, loadRecovery, saveRecovery, refreshReturns } = useReturn();
  const [selectedReturnRecovery, setSelectedReturnRecovery] = useState<{ id: string; snapshot: RecoverySnapshot } | null>(null);

  // Filter orders that have an active address update request for current user (chỉ dành riêng cho tài khoản Khách hàng)
  const addressNotifications = useMemo(() => {
    if (!currentUser || currentUser.role !== 'customer') return [];
    return orders.filter(o => o.yeuCauDiaChi?.trang_thai === 'cho_xu_ly');
  }, [orders, currentUser]);

  // Filter return requests that need customer supplement (chỉ dành riêng cho đúng Khách hàng sở hữu đơn đó)
  const returnNotifications = useMemo(() => {
    if (!currentUser || currentUser.role !== 'customer') return [];
    const cleanDigits = (s?: string) => (s || '').replace(/\D/g, '');
    const userDigits = cleanDigits(currentUser.phone);

    return returnRequests.filter((r) => {
      if (!['pending_review', 'approved', 'received_goods'].includes(r.status)) return false;
      if (r.recoveryInfo?.state !== 'awaiting_info') return false;

      // 1. Kiểm tra đơn hàng có nằm trong danh sách đơn đã xác thực của khách hàng (bảo vệ bởi Supabase RLS)
      const isOrderMatch = orders.some((o) => o.id === r.orderId);

      // 2. Kiểm tra khớp chính xác số điện thoại người nhận trong hồ sơ
      const custDigits = cleanDigits(r.customerPhone);
      const isPhoneMatch = Boolean(userDigits && custDigits && userDigits.length >= 9 && (userDigits === custDigits || userDigits.endsWith(custDigits) || custDigits.endsWith(userDigits)));

      return isOrderMatch || isPhoneMatch;
    });
  }, [returnRequests, currentUser, orders]);

  const unreadNotifCount = addressNotifications.length + returnNotifications.length;

  const handleOpenCustomerEditAddress = (order: Order) => {
    setCustomerEditOrder(order);

    let detail = order.shippingAddress?.addressDetail || '';
    let ward = order.shippingAddress?.ward || '';
    let district = order.shippingAddress?.district || '';
    let province = order.shippingAddress?.province || 'TP. Hồ Chí Minh';

    // Tự động phân rã thông minh nếu chuỗi địa chỉ bị gộp chung vào ô chi tiết
    if ((!ward || !district) && detail.includes(',')) {
      const parts = detail.split(',').map(s => s.trim()).filter(Boolean);
      if (parts.length >= 4) {
        detail = parts.slice(0, parts.length - 3).join(', ');
        ward = parts[parts.length - 3];
        district = parts[parts.length - 2];
        province = parts[parts.length - 1];
      } else if (parts.length === 3) {
        detail = parts[0];
        ward = parts[1];
        province = parts[2];
      }
    }

    setCustomerAddressForm({
      fullName: order.shippingAddress?.fullName || currentUser?.name || '',
      phone: order.shippingAddress?.phone || currentUser?.phone || '',
      addressDetail: detail,
      ward: ward,
      district: district,
      province: province
    });
  };

  const handleCustomerSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerEditOrder || isSavingCustomerAddress) return;
    const cleanFullName = normalizeFullName(customerAddressForm.fullName);
    const nameErr = validateFullName(cleanFullName, 'Họ và tên người nhận');
    if (nameErr) {
      showToast('Thông tin chưa hợp lệ', nameErr, 'error');
      return;
    }
    const cleanPhone = customerAddressForm.phone.trim();
    const phoneErr = validateVietnamesePhone(cleanPhone);
    if (phoneErr) {
      showToast('Thông tin chưa hợp lệ', phoneErr, 'error');
      return;
    }
    if (!customerAddressForm.addressDetail.trim() || customerAddressForm.addressDetail.trim().length < 3) {
      showToast('Thông tin chưa hợp lệ', 'Địa chỉ chi tiết (số nhà, tên đường) cần tối thiểu 3 ký tự.', 'error');
      return;
    }
    if (!customerAddressForm.ward.trim() || !customerAddressForm.district.trim() || !customerAddressForm.province.trim()) {
      showToast('Thông tin chưa hợp lệ', 'Vui lòng điền đầy đủ Phường/Xã, Quận/Huyện và Tỉnh/TP.', 'error');
      return;
    }
    setIsSavingCustomerAddress(true);
    try {
      if (updateOrderShippingAddress) {
        const ok = await updateOrderShippingAddress(customerEditOrder.id, {
          ...customerAddressForm,
          fullName: cleanFullName,
          phone: cleanPhone
        });
        if (ok) {
          setCustomerEditOrder(null);
          await refreshOrders?.();
          showToast('Cập nhật thành công', 'Địa chỉ giao hàng đã được cập nhật. Bưu cục sẽ sớm xuất kho giao hàng.', 'success');
        }
      }
    } catch (err: any) {
      showToast('Lỗi cập nhật', err?.message || 'Không thể lưu địa chỉ lúc này.', 'error');
    } finally {
      setIsSavingCustomerAddress(false);
    }
  };

  // Filter suggestions
  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      const q = searchQuery.toLowerCase();
      const productPool = products && products.length > 0 ? products : mockProducts;
      const filtered = productPool.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)) ||
          p.category.toLowerCase().includes(q)
      );
      setSuggestions(filtered.slice(0, 5));
    } else {
      setSuggestions([]);
    }
  }, [searchQuery, products]);

  // Click outside search & notification dropdown, or press Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (searchRef.current && !searchRef.current.contains(target)) {
        setIsSearchOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(target)) {
        setIsNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setIsUserMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsNotifOpen(false);
        setIsUserMenuOpen(false);
        setCustomerEditOrder(null);
        setSelectedReturnRecovery(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Tự động đóng menu khi chuyển trang
  useEffect(() => {
    setIsUserMenuOpen(false);
    setIsSearchOpen(false);
    setIsNotifOpen(false);
  }, [currentPath]);

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
              href="/"
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
                link.path === '/products'
                  ? currentPath === '/products' ||
                    (currentPath.startsWith('/products?') &&
                      !currentPath.includes('filter=') &&
                      !currentPath.includes('gender='))
                  : currentPath === link.path;

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
          <div className="flex items-center gap-2.5 sm:gap-3 xl:gap-3.5 shrink-0">
            {/* Search Trigger */}
            <div className="relative flex items-center" ref={searchRef}>
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
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setIsSearchOpen(false);
                        }
                      }}
                      autoFocus
                      className="w-full bg-surface-cream border border-surface-border rounded-xl py-2 pl-8 pr-8 text-xs text-charcoal-900 focus:outline-none focus:border-brand-700"
                    />
                    <Search className="w-3.5 h-3.5 text-charcoal-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-600"
                        title="Xoá tìm kiếm"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
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
                            <p className="text-brand-700 font-bold">{item.price.toLocaleString('vi-VN')}₫</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* In-App Notification Bell (Kế bên nút tìm kiếm) */}
            {currentUser && (
              <div className="relative flex items-center" ref={notifRef}>
                <button
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  className="w-9 h-9 flex items-center justify-center text-charcoal-800 hover:text-brand-700 hover:bg-surface-cream rounded-lg transition-colors relative cursor-pointer group"
                  aria-label="Thông báo"
                  title="Thông báo của bạn"
                >
                  <Bell className="w-5 h-5 stroke-[1.75]" />
                  {unreadNotifCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#5C1D24] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white animate-pulse shadow-xs">
                      {unreadNotifCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown Panel */}
                {isNotifOpen && (
                  <div className="absolute right-0 top-full mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-stone-200/90 overflow-hidden z-50 animate-fadeIn text-left">
                    <div className="p-3.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-[#5C1D24]" />
                        <h4 className="font-bold text-xs text-charcoal-900 uppercase tracking-wider">
                          Thông Báo ({unreadNotifCount})
                        </h4>
                      </div>
                      {unreadNotifCount > 0 && (
                        <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
                          Cần xử lý
                        </span>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-stone-100 p-1">
                      {unreadNotifCount === 0 ? (
                        <div className="py-8 text-center text-xs text-stone-400">
                          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-70" />
                          <p className="font-semibold text-stone-600">Bạn không có thông báo mới</p>
                          <p className="text-[11px] text-stone-400 mt-0.5">Tất cả đơn hàng và đổi trả đều đang được xử lý ổn định</p>
                        </div>
                      ) : (
                        <>
                          {/* Yêu cầu bổ sung sản phẩm & size đổi trả */}
                          {returnNotifications.map((ret) => (
                            <div key={ret.id} className="p-3.5 hover:bg-purple-50/50 transition-colors rounded-xl space-y-2">
                              <div className="flex items-start gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center shrink-0 mt-0.5">
                                  <RotateCcw className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1">
                                    <h5 className="font-bold text-xs text-charcoal-900 truncate">
                                      Bổ sung đổi size đơn #{ret.orderId}
                                    </h5>
                                    <span className="text-[10px] text-stone-400 whitespace-nowrap">
                                      {ret.createdAt}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-charcoal-600 mt-1 leading-relaxed">
                                    {ret.recoveryInfo?.note || 'Cửa hàng đã nhận hàng cũ. Vui lòng chọn sản phẩm và size mới để shop xuất kho gửi đổi tận nhà cho bạn.'}
                                  </p>
                                  <div className="mt-1.5 text-[10px] text-purple-700 bg-purple-50/80 p-2 rounded-lg border border-purple-100 flex items-center gap-1.5 font-medium">
                                    <span>📦</span>
                                    <span className="truncate">Hồ sơ: <strong>{ret.id}</strong> ({ret.productName})</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex justify-end pt-1">
                                <button
                                  onClick={async () => {
                                    setIsNotifOpen(false);
                                    try {
                                      const snapshot = await loadRecovery(ret.id);
                                      setSelectedReturnRecovery({ id: ret.id, snapshot });
                                    } catch (err) {
                                      showToast('Chưa tải được hồ sơ', err instanceof Error ? err.message : 'Vui lòng thử lại sau.', 'error');
                                    }
                                  }}
                                  className="px-3 py-1.5 bg-[#5C1D24] hover:bg-[#4A121D] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Chọn sản phẩm & size ngay</span>
                                </button>
                              </div>
                            </div>
                          ))}

                          {/* Yêu cầu sửa địa chỉ giao hàng */}
                          {addressNotifications.map((order) => (
                            <div key={order.id} className="p-3.5 hover:bg-amber-50/40 transition-colors rounded-xl space-y-2">
                              <div className="flex items-start gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                                  <AlertTriangle className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1">
                                    <h5 className="font-bold text-xs text-charcoal-900 truncate">
                                      Cập nhật địa chỉ đơn #{order.id}
                                    </h5>
                                    <span className="text-[10px] text-stone-400 whitespace-nowrap">
                                      {order.yeuCauDiaChi?.ngay_gui ? new Date(order.yeuCauDiaChi.ngay_gui).toLocaleDateString('vi-VN') : ''}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-charcoal-600 mt-1 leading-relaxed">
                                    {order.yeuCauDiaChi?.ly_do || 'Địa chỉ nhận hàng chưa hợp lệ, vui lòng cập nhật lại Phường / Quận / Tên đường.'}
                                  </p>
                                  <div className="mt-2 text-[10px] text-stone-500 bg-stone-100 p-2 rounded-lg truncate">
                                    <span className="font-semibold">Địa chỉ hiện tại:</span> {order.shippingAddress?.addressDetail}, {order.shippingAddress?.ward}, {order.shippingAddress?.district}, {order.shippingAddress?.province}
                                  </div>
                                </div>
                              </div>
                              <div className="flex justify-end pt-1">
                                <button
                                  onClick={() => {
                                    setIsNotifOpen(false);
                                    handleOpenCustomerEditAddress(order);
                                  }}
                                  className="px-3 py-1.5 bg-[#5C1D24] hover:bg-[#4A121D] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                                >
                                  <MapPin className="w-3.5 h-3.5" />
                                  <span>Cập nhật địa chỉ ngay</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

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
                  <div className={`w-7 h-7 rounded-full text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                    userRole === 'admin' ? 'bg-[#70222B]' : userRole === 'manager' ? 'bg-amber-600' : 'bg-[#5C1D24]'
                  }`}>
                    {currentUser.name.charAt(0).toUpperCase()}
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
                  <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-stone-200/90 overflow-hidden z-50 animate-fadeIn text-left">
                    {/* Header: Avatar, Name, Email, Phone directly from Database */}
                    <div className="p-3.5 bg-[#FAF7F5] border-b border-stone-100 flex items-center gap-3">
                      <div className="relative shrink-0">
                        <div className={`w-12 h-12 rounded-full text-white flex items-center justify-center font-bold text-lg shadow-xs ${
                          userRole === 'admin' ? 'bg-[#70222B]' : userRole === 'manager' ? 'bg-amber-600' : 'bg-[#5C1D24]'
                        }`}>
                          {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        {/* Active Green Dot */}
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-stone-900 text-sm leading-snug truncate">
                          {currentUser.name}
                        </div>
                        <div className="text-stone-500 text-xs truncate mt-0.5 leading-tight font-normal">
                          {currentUser.email}
                        </div>
                        <div className="text-stone-500 text-xs truncate mt-0.5 leading-tight font-normal">
                          {currentUser.phone || 'Chưa cập nhật SĐT'}
                        </div>
                      </div>
                    </div>

                    {/* Menu Options matching exact reference */}
                    <div className="p-2 space-y-1">
                      {/* Option 1: Tài khoản của tôi */}
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onNavigate('/account/profile?tab=info');
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
                            {userRole === 'manager' || userRole === 'admin'
                              ? 'Hồ sơ cá nhân & đổi mật khẩu'
                              : 'Thông tin, đơn hàng, địa chỉ'}
                          </div>
                        </div>
                      </button>

                      {/* Các mục chỉ hiển thị đối với Khách Mua Hàng (Customer) */}
                      {userRole !== 'manager' && userRole !== 'admin' && (
                        <>
                          {/* Option 2: Hồ sơ số đo cơ thể (Hover to highlight with left burgundy bar and icon) */}
                          <button
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              onNavigate('/account/body-profiles');
                            }}
                            className="w-full text-left p-2 rounded-xl hover:bg-[#FAF6F6] transition-colors flex items-center gap-2.5 group cursor-pointer relative overflow-hidden"
                          >
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-7 bg-[#5C1D24] rounded-r-full opacity-0 group-hover:opacity-100 transition-all duration-200" />
                            <div className="w-10 h-10 rounded-xl bg-[#F4EFEB] text-stone-700 group-hover:bg-[#5C1D24] group-hover:text-white flex items-center justify-center shrink-0 ml-1 transition-all duration-200 shadow-xs">
                              <Ruler className="w-5 h-5 stroke-[2]" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-stone-900 group-hover:text-[#5C1D24] transition-colors leading-snug">
                                Hồ sơ số đo cơ thể
                              </div>
                              <div className="text-[11px] text-stone-500 truncate leading-snug">
                                Quản lý số đo & tư vấn size
                              </div>
                            </div>
                          </button>

                          {/* Option 3: Đơn hàng của tôi */}
                          <button
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              onNavigate('/account/profile?tab=orders');
                            }}
                            className="w-full text-left p-2 rounded-xl hover:bg-[#FAF6F6] transition-colors flex items-center gap-2.5 group cursor-pointer relative overflow-hidden"
                          >
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-7 bg-[#5C1D24] rounded-r-full opacity-0 group-hover:opacity-100 transition-all duration-200" />
                            <div className="w-10 h-10 rounded-xl bg-[#F4EFEB] text-stone-700 group-hover:bg-[#5C1D24] group-hover:text-white flex items-center justify-center shrink-0 ml-1 transition-all duration-200 shadow-xs">
                              <ShoppingBag className="w-5 h-5 stroke-[1.75]" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-stone-900 group-hover:text-[#5C1D24] transition-colors leading-snug">
                                Đơn hàng của tôi
                              </div>
                              <div className="text-[11px] text-stone-500 truncate leading-snug">
                                Theo dõi & lịch sử mua sắm
                              </div>
                            </div>
                          </button>

                          {/* Option 4: Sổ địa chỉ nhận hàng */}
                          <button
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              onNavigate('/account/profile?tab=addresses');
                            }}
                            className="w-full text-left p-2 rounded-xl hover:bg-[#FAF6F6] transition-colors flex items-center gap-2.5 group cursor-pointer relative overflow-hidden"
                          >
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-7 bg-[#5C1D24] rounded-r-full opacity-0 group-hover:opacity-100 transition-all duration-200" />
                            <div className="w-10 h-10 rounded-xl bg-[#F4EFEB] text-stone-700 group-hover:bg-[#5C1D24] group-hover:text-white flex items-center justify-center shrink-0 ml-1 transition-all duration-200 shadow-xs">
                              <MapPin className="w-5 h-5 stroke-[1.75]" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-stone-900 group-hover:text-[#5C1D24] transition-colors leading-snug">
                                Sổ địa chỉ nhận hàng
                              </div>
                              <div className="text-[11px] text-stone-500 truncate leading-snug">
                                Địa chỉ nhà & văn phòng
                              </div>
                            </div>
                          </button>
                        </>
                      )}

                      {/* Divider */}
                      <div className="my-1 border-t border-stone-100" />

                      {/* Option 5: Đăng xuất */}
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          logout();
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
            )}

            {/* Cart Drawer Trigger (Chỉ dành cho khách hàng - Ẩn đối với Admin/Manager) */}
            {userRole !== 'admin' && userRole !== 'manager' && (
              <div className="relative flex items-center">
                <button
                  onClick={() => {
                    setIsCartDrawerOpen(true);
                  }}
                  className="w-9 h-9 flex items-center justify-center text-charcoal-800 hover:text-brand-700 hover:bg-surface-cream rounded-lg transition-colors relative group cursor-pointer"
                  aria-label="Xem giỏ hàng"
                >
                  <ShoppingBag className="w-5 h-5 stroke-[1.75]" />
                  {totalItemsCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-[#5C1D24] text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 shadow-xs">
                      {totalItemsCount}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Khách Hàng Tự Cập Nhật Địa Chỉ Theo Yêu Cầu */}
      {customerEditOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-md p-4 sm:p-6 animate-fadeIn"
          onClick={() => setCustomerEditOrder(null)}
        >
          <div
            className="relative bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 animate-scaleIn text-left space-y-4 my-auto overflow-hidden max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-[#5C1D24]" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-charcoal-900">Cập Nhật Địa Chỉ Nhận Hàng</h3>
                  <p className="text-[11px] text-stone-500">Đơn hàng #{customerEditOrder.id} • Dành cho giao vận GHN</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCustomerEditOrder(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {customerEditOrder.yeuCauDiaChi?.ly_do && (
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-xs text-amber-900 space-y-1">
                <span className="font-bold block text-[11px] text-amber-800">Lời nhắn từ Quản lý cửa hàng:</span>
                <p className="italic text-[11px] leading-relaxed">"{customerEditOrder.yeuCauDiaChi.ly_do}"</p>
              </div>
            )}

            {/* Chọn nhanh từ sổ địa chỉ đã lưu */}
            {currentUser?.addresses && currentUser.addresses.length > 0 && (
              <div className="p-3 bg-brand-50/40 rounded-2xl border border-brand-200/60 space-y-1.5">
                <span className="text-[11px] font-bold text-brand-900 block">
                  Chọn nhanh từ sổ địa chỉ đã lưu của bạn:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {currentUser.addresses.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setCustomerAddressForm({
                          fullName: a.fullName || customerAddressForm.fullName,
                          phone: a.phone || customerAddressForm.phone,
                          addressDetail: a.addressDetail,
                          ward: a.ward,
                          district: a.district,
                          province: a.province || 'TP. Hồ Chí Minh'
                        });
                        showToast('Đã chọn địa chỉ', `${a.label || 'Địa chỉ'}: ${a.addressDetail}`, 'info');
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        customerAddressForm.addressDetail === a.addressDetail && customerAddressForm.ward === a.ward
                          ? 'bg-[#5C1D24] text-white border-[#5C1D24] shadow-xs'
                          : 'bg-white text-charcoal-700 border-stone-300 hover:border-[#5C1D24]'
                      }`}
                    >
                      📍 {a.label || 'Địa chỉ'}: {a.addressDetail}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleCustomerSaveAddress} className="space-y-3 pt-1">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-stone-700 block mb-1">Họ và tên *</label>
                  <input
                    type="text"
                    required
                    value={customerAddressForm.fullName}
                    onChange={e => setCustomerAddressForm(prev => ({ ...prev, fullName: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-surface-cream border border-surface-border rounded-xl text-charcoal-900 focus:outline-none focus:border-brand-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-stone-700 block mb-1">Số điện thoại *</label>
                  <input
                    type="tel"
                    required
                    value={customerAddressForm.phone}
                    onChange={e => setCustomerAddressForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-surface-cream border border-surface-border rounded-xl font-mono text-charcoal-900 focus:outline-none focus:border-brand-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1">Địa chỉ chi tiết (số nhà, tên đường) *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: 45 Lê Duẩn"
                  value={customerAddressForm.addressDetail}
                  onChange={e => setCustomerAddressForm(prev => ({ ...prev, addressDetail: e.target.value }))}
                  className="w-full text-xs p-2.5 bg-surface-cream border border-surface-border rounded-xl text-charcoal-900 focus:outline-none focus:border-brand-600"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-stone-700 block mb-1">Phường / Xã *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Phường Bến Nghé"
                    value={customerAddressForm.ward}
                    onChange={e => setCustomerAddressForm(prev => ({ ...prev, ward: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-surface-cream border border-surface-border rounded-xl text-charcoal-900 focus:outline-none focus:border-brand-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-stone-700 block mb-1">Quận / Huyện *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Quận 1"
                    value={customerAddressForm.district}
                    onChange={e => setCustomerAddressForm(prev => ({ ...prev, district: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-surface-cream border border-surface-border rounded-xl text-charcoal-900 focus:outline-none focus:border-brand-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-stone-700 block mb-1">Tỉnh / TP *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: TP. Hồ Chí Minh"
                    value={customerAddressForm.province}
                    onChange={e => setCustomerAddressForm(prev => ({ ...prev, province: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-surface-cream border border-surface-border rounded-xl text-charcoal-900 focus:outline-none focus:border-brand-600"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setCustomerEditOrder(null)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingCustomerAddress}
                  className="px-5 py-2 bg-[#5C1D24] hover:bg-[#4A121D] text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingCustomerAddress ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Bổ Sung Sản Phẩm & Size Đổi Trả cho Khách Hàng */}
      {selectedReturnRecovery && (
        <ReturnRecoveryEditor
          customer
          returnId={selectedReturnRecovery.id}
          snapshot={selectedReturnRecovery.snapshot}
          onClose={() => setSelectedReturnRecovery(null)}
          onSave={async (input, key) => {
            await saveRecovery(selectedReturnRecovery.id, input, key);
            setSelectedReturnRecovery(null);
            showToast('Đã gửi thông tin bổ sung', 'Cửa hàng đã nhận được lựa chọn size của bạn và sẽ tiến hành chuẩn bị hàng đổi!', 'success');
            await refreshReturns();
          }}
        />
      )}
    </header>
  );
};
