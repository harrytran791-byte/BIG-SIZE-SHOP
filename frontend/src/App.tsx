import React, { useState } from 'react';
// Global Shared Providers & Hooks
import { ToastProvider } from '@/shared/context/ToastContext';
import { WishlistProvider } from '@/shared/context/WishlistContext';
import { useNavigation } from '@/shared/hooks/useNavigation';
import { useScrollReveal } from '@/shared/hooks/useScrollReveal';
import { AnnouncementBar } from '@/shared/layout/AnnouncementBar';
import { Navbar } from '@/shared/layout/Navbar';
import { MobileDrawer } from '@/shared/layout/MobileDrawer';
import { Footer } from '@/shared/layout/Footer';
import { AIChatbot } from '@/shared/components/AIChatbot';
import { ChiikawaMascot } from '@/shared/components/ChiikawaMascot';

// Module: User (Khách hàng & Xác thực)
import { AuthProvider, useAuth } from '@/modules/user/context/AuthContext';
import { BodyProfileProvider } from '@/modules/user/context/BodyProfileContext';
import { AuthModal } from '@/modules/user/components/AuthModal';
import { LoginRequiredModal } from '@/shared/components/LoginRequiredModal';

// Module: Cart & Order (Giỏ hàng & Đơn hàng)
import { CartProvider } from '@/modules/cart/context/CartContext';
import { CartDrawer } from '@/modules/cart/components/CartDrawer';
import { CartPage } from '@/modules/cart/pages/CartPage';
import { OrderProvider } from '@/modules/order/context/OrderContext';
import { CheckoutPage } from '@/modules/order/pages/CheckoutPage';
import { OrderSuccessPage } from '@/modules/order/pages/OrderSuccessPage';

// Module: Inventory & Returns (Kho hàng & Hậu mãi 7 ngày)
import { InventoryProvider } from '@/modules/inventory/context/InventoryContext';
import { ReturnProvider } from '@/modules/return/context/ReturnContext';

// Module: Home & Product (Trang chủ & Quần áo Big Size XL-5XL)
import { HomePage } from '@/modules/home/pages/HomePage';
import { ProductsPage } from '@/modules/product/pages/ProductsPage';
import { ProductDetailPage } from '@/modules/product/pages/ProductDetailPage';
import { SizeAdvisorModal } from '@/modules/product/components/SizeAdvisorModal';
import { mockProducts } from '@/modules/product/data/products';
import { ProductProvider, useProducts } from '@/modules/product/context/ProductContext';
import { Product, Size } from '@/shared/types';
import { Lock, ShieldAlert, LogIn, ArrowLeft, ExternalLink } from 'lucide-react';
import { hasAdminPortalAccess, normalizeRole, slugToTab } from '@/shared/utils/roleUtils';

// Code-split heavy pages to make homepage load under 1 second
const AdminPortal = React.lazy(() => import('@/modules/admin/AdminPortal').then(m => ({ default: m.AdminPortal })));
const LoginPage = React.lazy(() => import('@modules/user/pages/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = React.lazy(() => import('@modules/user/pages/RegisterPage').then(m => ({ default: m.RegisterPage })));
const ProfilePage = React.lazy(() => import('@modules/user/pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const OrderTrackingPage = React.lazy(() => import('@modules/order/pages/OrderTrackingPage').then(m => ({ default: m.OrderTrackingPage })));
const BodyProfileManagerPage = React.lazy(() => import('@modules/user/pages/BodyProfileManagerPage').then(m => ({ default: m.BodyProfileManagerPage })));
const SizeGuidePage = React.lazy(() => import('@modules/product/pages/SizeGuidePage').then(m => ({ default: m.SizeGuidePage })));
const FaqContactPage = React.lazy(() => import('@modules/content/pages/FaqContactPage').then(m => ({ default: m.FaqContactPage })));

/**
 * 401 / 403 Guard Screen for Admin & Manager Portal route protection
 */
const PortalAuthGuard: React.FC<{
  type: 'unauthorized' | 'forbidden';
  portalType: 'admin' | 'manager';
  userName?: string;
  onLogin: () => void;
  onBackToStore: () => void;
  onSwitchPortal?: () => void;
}> = ({ type, portalType, userName, onLogin, onBackToStore, onSwitchPortal }) => {
  const isManager = portalType === 'manager';
  const portalTitle = isManager ? 'Không Gian Quản Lý Cửa Hàng' : 'Không Gian Quản Trị Hệ Thống';
  const requiredRole = isManager ? 'Cửa Hàng Trưởng (Store Manager)' : 'Quản Trị Viên (Super Admin)';

  let description = '';
  if (type === 'unauthorized') {
    description = `Đường dẫn này chỉ dành riêng cho ${requiredRole}. Vui lòng đăng nhập bằng tài khoản có thẩm quyền để tiếp tục.`;
  } else {
    description = `Tài khoản (${userName || 'Khách Hàng'}) hiện tại không có thẩm quyền truy cập ${portalTitle} của Curve & Confidence.`;
  }

  return (
    <div className="min-h-screen bg-[#18181B] text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-stone-900 border border-stone-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl animate-scaleIn">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-inner ${
          type === 'unauthorized' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
        }`}>
          {type === 'unauthorized' ? <Lock className="w-8 h-8" /> : <ShieldAlert className="w-8 h-8" />}
        </div>

        <div>
          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block ${
            type === 'unauthorized' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
          }`}>
            {type === 'unauthorized' ? '401 Unauthorized • Yêu Cầu Xác Thực' : '403 Forbidden • Quyền Hạn Giới Hạn'}
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-white mt-3">
            {type === 'unauthorized' ? portalTitle : 'Truy Cập Bị Giới Hạn'}
          </h2>
          <p className="text-xs text-stone-400 mt-2 leading-relaxed">
            {description}
          </p>
        </div>

        <div className="space-y-2 pt-2">
          {onSwitchPortal && (
            <button
              onClick={onSwitchPortal}
              className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <span>Chuyển Sang {isManager ? 'Cổng Quản Trị Hệ Thống' : 'Cổng Quản Lý Cửa Hàng'}</span>
            </button>
          )}

          {type === 'unauthorized' ? (
            <button
              onClick={onLogin}
              className="w-full py-3 rounded-xl bg-[#5C1D24] hover:bg-[#70222B] text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <LogIn className="w-4 h-4" />
              <span>Đăng Nhập {isManager ? 'Quản Lý' : 'Quản Trị'}</span>
            </button>
          ) : (
            <button
              onClick={onLogin}
              className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Đăng Nhập Tài Khoản Khác</span>
            </button>
          )}

          <button
            onClick={onBackToStore}
            className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay Về Trang Mua Sắm</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Auth Guard Screen for Customer Profile and AI Body Profile
 */
const CustomerAuthGuard: React.FC<{
  title: string;
  description: string;
  onLogin: () => void;
  onBackToHome: () => void;
}> = ({ title, description, onLogin, onBackToHome }) => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-white rounded-3xl border border-stone-200/90 p-8 text-center space-y-6 shadow-sm animate-scaleIn">
        <div className="w-16 h-16 rounded-2xl bg-[#5C1D24]/10 text-[#5C1D24] border border-[#5C1D24]/20 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>

        <div>
          <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#5C1D24]/10 text-[#5C1D24] border border-[#5C1D24]/20 inline-block">
            Yêu Cầu Đăng Nhập
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-charcoal-900 mt-3">
            {title}
          </h2>
          <p className="text-xs text-charcoal-600 mt-2 leading-relaxed">
            {description}
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <button
            onClick={onLogin}
            className="w-full py-3 rounded-xl bg-[#5C1D24] hover:bg-[#70222B] text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <LogIn className="w-4 h-4" />
            <span>Đăng Nhập Ngay</span>
          </button>

          <button
            onClick={onBackToHome}
            className="w-full py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-charcoal-700 font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Tiếp Tục Khám Phá Sản Phẩm</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const MainApp: React.FC = () => {
  useScrollReveal();
  const { route, navigate } = useNavigation();
  const { currentUser, currentRole, openAuthModal } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { products } = useProducts();
  const [globalAdvisorProduct, setGlobalAdvisorProduct] = useState<Product | null>(null);

  const canAccessAdmin = hasAdminPortalAccess(currentUser, currentRole);
  const effectiveRole = normalizeRole(currentUser?.role || currentRole, currentUser?.email);

  const handleOpenGlobalAdvisor = (product?: Product) => {
    setGlobalAdvisorProduct(product || products[0] || mockProducts[0]);
  };

  const isAdminPath = route.path === '/admin' || route.path.startsWith('/admin/');
  const isManagerPath = route.path === '/manager' || route.path.startsWith('/manager/');
  const isAuthPath = route.path === '/login' || route.path === '/register';

  // ROUTE GUARD: If Super Admin Portal is accessed (/admin or /admin/*)
  if (isAdminPath) {
    if (!currentUser) {
      return (
        <PortalAuthGuard
          type="unauthorized"
          portalType="admin"
          onLogin={() => navigate('/login')}
          onBackToStore={() => navigate('/')}
        />
      );
    }

    const isLocked = currentUser.status === 'locked' || (() => {
      try {
        const lockedList: string[] = JSON.parse(localStorage.getItem('curve_locked_users') || '[]');
        return lockedList.includes(currentUser.id) || (!!currentUser.email && lockedList.includes(currentUser.email.toLowerCase()));
      } catch {
        return false;
      }
    })();

    if (isLocked) {
      return (
        <PortalAuthGuard
          type="forbidden"
          portalType="admin"
          userName={`${currentUser.name} (Tài khoản đã bị Quản trị viên tạm khóa)`}
          onLogin={() => navigate('/login')}
          onBackToStore={() => navigate('/')}
        />
      );
    }

    if (effectiveRole !== 'admin') {
      return (
        <PortalAuthGuard
          type="forbidden"
          portalType="admin"
          userName={currentUser.name}
          onLogin={() => navigate('/login')}
          onBackToStore={() => navigate('/')}
          onSwitchPortal={effectiveRole === 'manager' ? () => navigate('/manager/products') : undefined}
        />
      );
    }

    const adminTabSlug = route.path.split('/')[2];
    const initialAdminTab = slugToTab(adminTabSlug) || 'system_dashboard';

    return (
      <React.Suspense fallback={
        <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center gap-3">
          <div className="w-9 h-9 border-3 border-brand-700 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-charcoal-600">Đang khởi tạo Hệ thống Quản trị...</p>
        </div>
      }>
        <AdminPortal
          onBackToStore={() => navigate('/')}
          onNavigate={navigate}
          initialTab={initialAdminTab}
        />
      </React.Suspense>
    );
  }

  // ROUTE GUARD: If Store Manager Portal is accessed (/manager or /manager/*)
  if (isManagerPath) {
    if (!currentUser) {
      return (
        <PortalAuthGuard
          type="unauthorized"
          portalType="manager"
          onLogin={() => navigate('/login')}
          onBackToStore={() => navigate('/')}
        />
      );
    }

    const isLocked = currentUser.status === 'locked' || (() => {
      try {
        const lockedList: string[] = JSON.parse(localStorage.getItem('curve_locked_users') || '[]');
        return lockedList.includes(currentUser.id) || (!!currentUser.email && lockedList.includes(currentUser.email.toLowerCase()));
      } catch {
        return false;
      }
    })();

    if (isLocked) {
      return (
        <PortalAuthGuard
          type="forbidden"
          portalType="manager"
          userName={`${currentUser.name} (Tài khoản Quản lý đã bị tạm khóa)`}
          onLogin={() => navigate('/login')}
          onBackToStore={() => navigate('/')}
        />
      );
    }

    if (effectiveRole !== 'manager') {
      return (
        <PortalAuthGuard
          type="forbidden"
          portalType="manager"
          userName={currentUser.name}
          onLogin={() => navigate('/login')}
          onBackToStore={() => navigate('/')}
          onSwitchPortal={effectiveRole === 'admin' ? () => navigate('/admin/system-dashboard') : undefined}
        />
      );
    }

    const managerTabSlug = route.path.split('/')[2];
    const initialManagerTab = slugToTab(managerTabSlug) || 'products';

    return (
      <React.Suspense fallback={
        <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center gap-3">
          <div className="w-9 h-9 border-3 border-amber-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-charcoal-600">Đang khởi tạo Không gian Quản lý...</p>
        </div>
      }>
        <AdminPortal
          onBackToStore={() => navigate('/')}
          onNavigate={navigate}
          initialTab={initialManagerTab}
        />
      </React.Suspense>
    );
  }

  // STANDALONE AUTH PAGES: /login, /register, /auth (Trang riêng biệt, không popup, responsive 100%)
  if (route.path === '/login' || route.path === '/auth') {
    return (
      <React.Suspense fallback={
        <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-3 border-[#5C1D24] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-stone-600">Đang tải trang đăng nhập...</p>
        </div>
      }>
        <LoginPage
          onNavigate={navigate}
          onOpenAdminPortal={() => {
            const defaultTab = effectiveRole === 'manager' ? '/manager/products' : '/admin/system-dashboard';
            navigate(defaultTab);
          }}
        />
      </React.Suspense>
    );
  }

  if (route.path === '/register') {
    return (
      <React.Suspense fallback={
        <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-3 border-[#5C1D24] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-stone-600">Đang tải trang đăng ký...</p>
        </div>
      }>
        <RegisterPage onNavigate={navigate} />
      </React.Suspense>
    );
  }

  // Render current active page
  const renderCurrentPage = () => {
    const { path, params, searchParams } = route;

    if (path === '/' || path === '') {
      return (
        <HomePage
          onNavigate={navigate}
          onOpenSizeAdvisor={handleOpenGlobalAdvisor}
        />
      );
    }

    if (path.startsWith('/products')) {
      return (
        <ProductsPage
          onNavigate={navigate}
          searchParams={searchParams}
          onOpenSizeAdvisor={handleOpenGlobalAdvisor}
        />
      );
    }

    if (path.startsWith('/product/') && params.id) {
      return <ProductDetailPage productId={params.id} onNavigate={navigate} />;
    }

    if (path === '/cart') {
      if (effectiveRole === 'manager' || effectiveRole === 'admin') {
        return (
          <div className="max-w-xl mx-auto py-16 px-4 text-center">
            <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-stone-900">Giỏ Hàng Đã Bị Khóa</h2>
              <p className="text-xs text-stone-600 leading-relaxed">
                Tài khoản của bạn đang có vai trò <strong>{effectiveRole === 'admin' ? 'Quản trị viên' : 'Quản lý cửa hàng'}</strong>. Nhằm tuân thủ nguyên tắc bảo mật và chống xung đột quyền hạn nội bộ (Phương án B), tài khoản quản lý/quản trị không được phép đặt mua hàng hay thanh toán trên hệ thống.
              </p>
              <button
                onClick={() => navigate(effectiveRole === 'admin' ? '/admin/system-dashboard' : '/manager/products')}
                className="mt-2 px-6 py-2.5 bg-[#5C1D24] hover:bg-[#4A151B] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-2"
              >
                <span>QUAY VỀ CỔNG QUẢN LÝ</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      }
      return <CartPage onNavigate={navigate} />;
    }

    if (path === '/checkout') {
      if (effectiveRole === 'manager' || effectiveRole === 'admin') {
        return (
          <div className="max-w-xl mx-auto py-16 px-4 text-center">
            <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-stone-900">Không Cho Phép Đặt Hàng</h2>
              <p className="text-xs text-stone-600 leading-relaxed">
                Tài khoản <strong>{effectiveRole === 'admin' ? 'Quản trị viên' : 'Quản lý cửa hàng'}</strong> đang ở Chế độ Xem trước hệ thống và không được phép thực hiện giao dịch thanh toán.
              </p>
              <button
                onClick={() => navigate(effectiveRole === 'admin' ? '/admin/system-dashboard' : '/manager/products')}
                className="mt-2 px-6 py-2.5 bg-[#5C1D24] hover:bg-[#4A151B] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-2"
              >
                <span>QUAY VỀ CỔNG QUẢN LÝ</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      }

      if (!currentUser) {
        return (
          <CustomerAuthGuard
            title="Đăng Nhập Để Tiến Hành Thanh Toán"
            description="Bạn cần đăng nhập tài khoản thành viên để được tích điểm hội viên, áp dụng mã voucher ưu đãi và hưởng chính sách bảo hiểm đổi size 7 ngày miễn phí tận nơi."
            onLogin={() => {
              try {
                sessionStorage.setItem('auth_redirect_url', '/checkout');
              } catch {}
              navigate('/login');
            }}
            onBackToHome={() => navigate('/cart')}
          />
        );
      }

      return <CheckoutPage onNavigate={navigate} />;
    }

    if (path.startsWith('/order-success')) {
      return <OrderSuccessPage orderId={params.orderId || searchParams.get('id') || 'BS-88291'} onNavigate={navigate} />;
    }

    if (path === '/order-tracking' || path === '/tracking') {
      const code = searchParams.get('code') || searchParams.get('id') || '';
      return <OrderTrackingPage initialCode={code} onNavigate={navigate} />;
    }

    if (path === '/account/profile' || path === '/profile') {
      if (!currentUser) {
        return (
          <CustomerAuthGuard
            title="Đăng Nhập Xem Hồ Sơ & Đơn Hàng"
            description="Bạn cần đăng nhập tài khoản thành viên để xem thông tin cá nhân, sổ địa chỉ nhận hàng và lịch sử đơn mua."
            onLogin={() => navigate('/login')}
            onBackToHome={() => navigate('/products')}
          />
        );
      }
      const initialTabParam = (searchParams?.get('tab') as any) || (params?.tab as any);
      return <ProfilePage onNavigate={navigate} initialTab={initialTabParam} />;
    }

    if (path === '/login' || path === '/auth') {
      return (
        <LoginPage
          onNavigate={navigate}
          onOpenAdminPortal={() => {
            const defaultTab = effectiveRole === 'manager' ? '/manager/products' : '/admin/system-dashboard';
            navigate(defaultTab);
          }}
        />
      );
    }

    if (path === '/register') {
      return <RegisterPage onNavigate={navigate} />;
    }

    if (path === '/account/body-profiles') {
      if (!currentUser) {
        return (
          <CustomerAuthGuard
            title="Đăng Nhập Quản Lý Hồ Sơ Số Đo AI"
            description="Lưu giữ số đo cơ thể chuẩn xác để trợ lý AI Stylist tự động đối chiếu thông số may đo và tư vấn size quần áo vừa vặn nhất."
            onLogin={() => navigate('/login')}
            onBackToHome={() => navigate('/products')}
          />
        );
      }
      return <BodyProfileManagerPage onNavigate={navigate} />;
    }

    if (path === '/size-guide') {
      return <SizeGuidePage onNavigate={navigate} />;
    }

    if (path === '/faq' || path === '/contact') {
      return <FaqContactPage onNavigate={navigate} />;
    }

    // Default fallback to Home
    return (
      <HomePage
        onNavigate={navigate}
        onOpenSizeAdvisor={handleOpenGlobalAdvisor}
      />
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-light text-charcoal-900 selection:bg-brand-500 selection:text-white">
      {/* 1. Top Announcement Bar */}
      <AnnouncementBar />

      {/* 2. Navigation Header */}
      <Navbar
        currentPath={route.path + (route.searchParams.toString() ? `?${route.searchParams.toString()}` : '')}
        onNavigate={navigate}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        onOpenProfileModal={() => navigate('/account/profile')}
        onOpenAdminPortal={() => {
          const defaultTab = effectiveRole === 'manager' ? '/manager/products' : '/admin/system-dashboard';
          navigate(defaultTab);
        }}
      />


      {/* 3. Mobile Navigation Drawer */}
      <MobileDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onNavigate={navigate}
      />

      {/* 4. Slide-over Cart Drawer */}
      <CartDrawer onNavigate={navigate} />

      {/* 5. Main Page Content */}
      <main className="flex-1">
        <React.Suspense fallback={
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-brand-700 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-charcoal-500 font-semibold">Đang tải trang...</p>
          </div>
        }>
          {renderCurrentPage()}
        </React.Suspense>
      </main>

      {/* 6. Footer */}
      <Footer onNavigate={navigate} />

      {/* Global Size Advisor Modal if opened */}
      {globalAdvisorProduct && (
        <SizeAdvisorModal
          product={globalAdvisorProduct}
          isOpen={!!globalAdvisorProduct}
          onClose={() => setGlobalAdvisorProduct(null)}
          onSelectRecommendedSize={(sz: Size) => {
            navigate(`/products?size=${sz}`);
            setGlobalAdvisorProduct(null);
          }}
        />
      )}

      {/* Login Requirement Notice Modal */}
      <LoginRequiredModal onNavigate={navigate} />

      {/* Floating AI Fashion Assistant Chatbot (Module 3: FR-C04 - Chỉ hiển thị cho khách hàng, ẩn với Admin/Manager) */}
      {effectiveRole !== 'admin' && effectiveRole !== 'manager' && (
        <AIChatbot
          onNavigate={navigate}
          onOpenSizeFinder={() => handleOpenGlobalAdvisor()}
        />
      )}

      {/* Floating Chiikawa Mascot Dancer with real-time Chroma Key (Chỉ hiển thị trên storefront của khách hàng, ẩn trên trang đăng nhập/quản trị để tối ưu hiệu năng) */}
      {!isAdminPath && !isManagerPath && !isAuthPath && (
        <ChiikawaMascot />
      )}
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <ProductProvider>
          <InventoryProvider>
            <ReturnProvider>
              <WishlistProvider>
                <CartProvider>
                  <BodyProfileProvider>
                    <OrderProvider>
                      <MainApp />
                    </OrderProvider>
                  </BodyProfileProvider>
                </CartProvider>
              </WishlistProvider>
            </ReturnProvider>
          </InventoryProvider>
        </ProductProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
