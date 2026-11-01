import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Compass,
  Package,
  CheckCircle2,
  Clock,
  Truck,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Lock,
  User,
  Copy,
  XCircle,
} from 'lucide-react';
import { useOrder } from '@/context/OrderContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/shared/context/ToastContext';
import { Order, UserAccount } from '@/types';
import { ghnService, GhnOrderDetailResponse } from '@/shared/services/ghnService';

interface OrderTrackingPageProps {
  initialCode?: string;
  onNavigate: (path: string) => void;
}

export const OrderTrackingPage: React.FC<OrderTrackingPageProps> = ({ initialCode = '', onNavigate }) => {
  const { orders, getOrderById, getOrdersByPhone } = useOrder();
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [searchInput, setSearchInput] = useState(initialCode);
  const [searchedOrder, setSearchedOrder] = useState<Order | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // GHN Real-time Tracking state
  const [ghnTracking, setGhnTracking] = useState<GhnOrderDetailResponse | null>(null);
  const [isLoadingGhn, setIsLoadingGhn] = useState<boolean>(false);
  const trackingRequest = useRef(0);
  const trackingInFlight = useRef<string | null>(null);

  /**
   * Kiểm tra quyền sở hữu đơn hàng (RBAC & Anti-IDOR):
   * - Quản trị viên (admin) và Quản lý (manager) được xem mọi đơn hàng để hỗ trợ khách.
   * - Khách hàng (customer) BẮT BUỘC chỉ được xem đơn hàng khớp với SĐT hoặc Email của tài khoản mình.
   */
  const isOrderOwnedByUser = useCallback(
    (order: Order | null | undefined, user: UserAccount | null | undefined): boolean => {
      if (!order || !user) return false;
      if (user.role === 'admin' || user.role === 'manager') return true;

      const userPhone = (user.phone || '').replace(/\D/g, '');
      const orderPhone = (order.shippingAddress?.phone || '').replace(/\D/g, '');
      if (userPhone && orderPhone && (userPhone === orderPhone || userPhone.endsWith(orderPhone) || orderPhone.endsWith(userPhone))) {
        return true;
      }

      const userEmail = (user.email || '').trim().toLowerCase();
      const orderEmail = (order.shippingAddress?.email || order.invoiceEmail || '').trim().toLowerCase();
      if (userEmail && orderEmail && userEmail === orderEmail) {
        return true;
      }

      return false;
    },
    []
  );

  // Danh sách đơn hàng mà người dùng hiện tại có quyền xem
  const userVisibleOrders = orders.filter((o) => currentUser && isOrderOwnedByUser(o, currentUser));

  /**
   * Tải thông tin vận chuyển thời gian thực từ API GHN (CHẾ ĐỘ READ-ONLY, KHÔNG TỰ SỬA DATABASE)
   */
  const fetchGhnTracking = useCallback(
    async (order: Order) => {
      const isGhn = order.carrier === 'GHN' || (order.trackingCode && order.trackingCode.startsWith('GHN'));
      if (!isGhn || !order.trackingCode || order.status === 'cancelled') {
        trackingRequest.current++;
        trackingInFlight.current = null;
        setGhnTracking(null);
        setIsLoadingGhn(false);
        return;
      }
      const key = `${order.id}:${order.trackingCode}`;
      if (trackingInFlight.current === key) return;
      trackingInFlight.current = key;
      const request = ++trackingRequest.current;
      setIsLoadingGhn(true);
      try {
        const tracking = await ghnService.getOrderTracking(order.trackingCode, order.id);
        if (request === trackingRequest.current) setGhnTracking(tracking);
      } catch (err) {
        console.warn('⚠️ Lỗi truy vấn API GHN Real-time:', err);
        if (request === trackingRequest.current) setGhnTracking(null);
      } finally {
        if (request === trackingRequest.current) {
          trackingInFlight.current = null;
          setIsLoadingGhn(false);
        }
      }
    },
    []
  );

  // Khởi tạo tra cứu ban đầu nếu có initialCode từ URL / Điều hướng
  useEffect(() => {
    if (!currentUser) return;
    if (initialCode) {
      setSearchInput(initialCode);
      let found = getOrderById(initialCode);
      if (!found) {
        const byPhone = getOrdersByPhone(initialCode);
        if (byPhone.length > 0) {
          found = byPhone[0];
        }
      }

      setHasSearched(true);
      if (found) {
        if (isOrderOwnedByUser(found, currentUser)) {
          setSearchedOrder(found);
          setPermissionDenied(false);
          fetchGhnTracking(found);
        } else {
          setSearchedOrder(null);
          setPermissionDenied(true);
        }
      } else {
        setSearchedOrder(null);
        setPermissionDenied(false);
      }
    }
  }, [initialCode, orders, currentUser, getOrderById, getOrdersByPhone, isOrderOwnedByUser, fetchGhnTracking]);

  // Tự động đồng bộ hóa thời gian thực (Real-time Reactive Sync) cho đơn hàng đang tra cứu khi CSDL thay đổi
  useEffect(() => {
    if (!searchedOrder) return;
    const latest = getOrderById(searchedOrder.id);
    if (!latest || !isOrderOwnedByUser(latest, currentUser)) {
      setSearchedOrder(null);
      setGhnTracking(null);
      return;
    }
    if (
      latest.status !== searchedOrder.status ||
      latest.trackingCode !== searchedOrder.trackingCode ||
      latest.carrier !== searchedOrder.carrier ||
      latest.paymentStatus !== searchedOrder.paymentStatus ||
      JSON.stringify(latest.timeline) !== JSON.stringify(searchedOrder.timeline)
    ) {
      setSearchedOrder(latest);
      if (latest.trackingCode && latest.trackingCode !== searchedOrder.trackingCode) {
        fetchGhnTracking(latest);
      }
    }
  }, [orders, searchedOrder, currentUser, isOrderOwnedByUser, getOrderById, fetchGhnTracking]);

  // Refresh carrier details even when its tracking code and database status stay the same.
  useEffect(() => {
    if (!currentUser || !searchedOrder || !isOrderOwnedByUser(searchedOrder, currentUser)) return;
    void fetchGhnTracking(searchedOrder);
    const timer = setInterval(() => { void fetchGhnTracking(searchedOrder); }, 30000);
    return () => {
      clearInterval(timer);
      trackingRequest.current++;
      trackingInFlight.current = null;
    };
  }, [currentUser?.id, searchedOrder?.id, searchedOrder?.trackingCode, searchedOrder?.status, fetchGhnTracking, isOrderOwnedByUser]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchInput.trim();
    if (!query) return;

    setHasSearched(true);
    setPermissionDenied(false);

    // 1. Tìm theo mã đơn / alias / mã vận đơn 3PL
    let targetOrder = getOrderById(query);

    // 2. Nếu không tìm thấy bằng ID, tìm theo SĐT
    if (!targetOrder) {
      const byPhone = getOrdersByPhone(query);
      if (byPhone.length > 0) {
        targetOrder = byPhone[0];
      }
    }

    if (targetOrder) {
      if (isOrderOwnedByUser(targetOrder, currentUser)) {
        setSearchedOrder(targetOrder);
        fetchGhnTracking(targetOrder);
      } else {
        setSearchedOrder(null);
        setPermissionDenied(true);
      }
    } else {
      setSearchedOrder(null);
    }
  };

  // ==========================================
  // CASE 1: BẢO VỆ BẢO MẬT - YÊU CẦU ĐĂNG NHẬP
  // ==========================================
  if (!currentUser) {
    return (
      <div className="py-12 bg-surface-light min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 text-brand-600 text-xs font-bold uppercase tracking-wider bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
              <Compass className="w-3.5 h-3.5" />
              <span>HỆ THỐNG TRA CỨU ĐƠN HÀNG</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-charcoal-900 tracking-tight">
              Theo Dõi Hành Trình Đơn Hàng Của Bạn
            </h1>
            <p className="text-xs sm:text-sm text-charcoal-500">
              Tra cứu tiến trình vận chuyển thời gian thực qua hệ thống kết nối bưu cục Giao Hàng Nhanh (GHN).
            </p>
          </div>

          {/* Luxury Auth Gate Card */}
          <div className="bg-white rounded-3xl border border-surface-border shadow-soft p-8 sm:p-12 text-center max-w-xl mx-auto space-y-6 animate-fadeIn">
            <div className="w-16 h-16 rounded-2xl bg-[#5C1D24]/10 text-[#5C1D24] border border-[#5C1D24]/20 flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-charcoal-900 tracking-tight">
                Yêu Cầu Đăng Nhập Tài Khoản
              </h2>
              <p className="text-xs sm:text-sm text-charcoal-500 leading-relaxed">
                Để bảo vệ an toàn thông tin cá nhân (địa chỉ giao hàng, số điện thoại, thông tin số đo Big Size), quý khách vui lòng đăng nhập vào tài khoản để theo dõi hành trình đơn hàng.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onNavigate('/login')}
                className="w-full sm:w-auto px-6 py-3 bg-[#5C1D24] hover:bg-[#48161C] text-white font-bold text-xs sm:text-sm rounded-2xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <User className="w-4 h-4" />
                <span>Đăng Nhập Ngay</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/register')}
                className="w-full sm:w-auto px-6 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs sm:text-sm rounded-2xl transition-colors cursor-pointer"
              >
                Tạo Tài Khoản Mới
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // CASE 2: ĐÃ ĐĂNG NHẬP - GIAO DIỆN TRA CỨU AN TOÀN
  // ==========================================
  return (
    <div className="py-12 bg-surface-light min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Title */}
        <div className="text-center max-w-xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 text-brand-600 text-xs font-bold uppercase tracking-wider bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
            <Compass className="w-3.5 h-3.5" />
            <span>HỆ THỐNG TRA CỨU ĐƠN HÀNG</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-charcoal-900 tracking-tight">
            Theo Dõi Hành Trình Đơn Hàng Của Bạn
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-500">
            Tra cứu hành trình vận chuyển thời gian thực liên kết trực tiếp với <strong>GHN Express</strong>.
          </p>

          {/* Logged in badge */}
          <div className="inline-flex items-center gap-2 text-xs text-charcoal-600 bg-white py-1 px-3.5 rounded-full border border-stone-200 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              Đang đăng nhập: <strong>{currentUser.name}</strong> ({currentUser.phone || currentUser.email})
            </span>
          </div>
        </div>

        {/* Search Input Box */}
        <div className="bg-white p-4 sm:p-6 rounded-3xl border border-surface-border shadow-soft max-w-2xl mx-auto">
          <form onSubmit={handleSearch} className="flex gap-2.5">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Nhập mã đơn (VD: BS-HD09), mã vận đơn GHN hoặc SĐT..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full bg-surface-cream border border-surface-border rounded-2xl py-3 pl-10 pr-4 text-xs sm:text-sm font-semibold text-charcoal-900 placeholder-charcoal-400 focus:outline-none focus:border-brand-500"
              />
              <Search className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-[#5C1D24] hover:bg-[#48161C] text-white font-bold text-xs sm:text-sm rounded-2xl shadow-sm transition-all cursor-pointer"
            >
              Tra cứu
            </button>
          </form>

          {/* Quick shortcuts - Chỉ hiển thị đơn thuộc quyền sở hữu của người dùng đang đăng nhập */}
          <div className="flex items-center gap-2 mt-3 text-xs text-charcoal-500 flex-wrap pt-2 border-t border-stone-100">
            <span className="font-semibold text-stone-600">Đơn hàng của bạn:</span>
            {userVisibleOrders.length > 0 ? (
              userVisibleOrders.slice(0, 4).map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => {
                    setSearchInput(o.id);
                    setSearchedOrder(o);
                    setPermissionDenied(false);
                    setHasSearched(true);
                    fetchGhnTracking(o);
                  }}
                  className="font-mono font-bold text-[#5C1D24] hover:bg-[#5C1D24] hover:text-white bg-[#5C1D24]/5 px-2.5 py-1 rounded-lg border border-[#5C1D24]/20 transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <span>📦</span>
                  <span>{o.id}</span>
                  {o.clientCode && o.clientCode !== o.id && (
                    <span className="text-[10px] text-stone-400 font-normal">({o.clientCode})</span>
                  )}
                </button>
              ))
            ) : (
              <span className="text-stone-400 italic">Chưa ghi nhận đơn hàng nào cho tài khoản này.</span>
            )}
          </div>
        </div>

        {/* Results Area */}
        {hasSearched && (
          <>
            {permissionDenied ? (
              /* Security Warning - Quyền sở hữu đơn hàng */
              <div className="bg-white rounded-3xl border border-red-200 p-8 sm:p-10 text-center space-y-4 shadow-soft animate-fadeIn">
                <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 border border-red-200/60 flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-heading font-bold text-lg text-charcoal-900">
                    Không Thể Truy Cập Đơn Hàng Này
                  </h3>
                  <p className="text-xs text-charcoal-600 max-w-md mx-auto leading-relaxed">
                    Vì lý do bảo mật thông tin cá nhân và an toàn dữ liệu số đo may đo, quý khách chỉ có quyền tra cứu hành trình các đơn hàng được đặt bởi chính tài khoản của bạn.
                  </p>
                </div>
                {userVisibleOrders.length > 0 && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const first = userVisibleOrders[0];
                        setSearchInput(first.id);
                        setSearchedOrder(first);
                        setPermissionDenied(false);
                        fetchGhnTracking(first);
                      }}
                      className="px-5 py-2.5 bg-[#5C1D24] hover:bg-[#48161C] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-2"
                    >
                      <Package className="w-4 h-4" />
                      <span>Xem Đơn Hàng Của Bạn ({userVisibleOrders[0].id})</span>
                    </button>
                  </div>
                )}
              </div>
            ) : searchedOrder && isOrderOwnedByUser(searchedOrder, currentUser) ? (
              <div className="bg-white rounded-3xl border border-surface-border shadow-soft overflow-hidden p-6 sm:p-8 space-y-8 animate-fadeIn">
                {/* Header of Order */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-surface-border gap-4">
                  <div>
                    <span className="text-[11px] font-bold text-charcoal-400 uppercase tracking-wider">
                      Mã Đơn Hàng
                    </span>
                    <div className="flex items-center gap-2.5 flex-wrap mt-0.5">
                      <h2 className="text-2xl font-black text-brand-600 font-mono">
                        {searchedOrder.id}
                      </h2>

                      {/* Badge Trạng thái xử lý đơn hàng (Tách biệt rõ ràng) */}
                      {searchedOrder.status === 'cancelled' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-red-100 text-red-700 border border-red-200 uppercase tracking-wide">
                          <XCircle className="w-3.5 h-3.5" />
                          Đơn hàng: Đã hủy
                        </span>
                      ) : searchedOrder.paymentMethod !== 'cod' && searchedOrder.paymentStatus !== 'paid' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          <Clock className="w-3.5 h-3.5" />
                          Đơn hàng: Chờ hoàn tất thanh toán (Chưa giao hàng)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Đơn hàng:{' '}
                          {searchedOrder.status === 'placed'
                            ? 'Chờ xác nhận'
                            : searchedOrder.status === 'confirmed'
                            ? 'Đã xác nhận'
                            : searchedOrder.status === 'preparing'
                            ? 'Đang đóng gói'
                            : searchedOrder.status === 'shipping'
                            ? 'Đang giao hàng'
                            : 'Giao thành công'}
                        </span>
                      )}

                      {/* Badge Trạng thái thanh toán (Tách biệt rõ ràng) */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          searchedOrder.paymentStatus === 'paid'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : searchedOrder.paymentStatus === 'failed'
                            ? 'bg-rose-100 text-rose-800 border-rose-200'
                            : searchedOrder.paymentStatus === 'cancelled'
                            ? 'bg-stone-100 text-stone-700 border-stone-300'
                            : searchedOrder.paymentStatus === 'refunded'
                            ? 'bg-purple-100 text-purple-800 border-purple-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        Thanh toán:{' '}
                        {searchedOrder.paymentStatus === 'paid'
                          ? 'Đã thanh toán'
                          : searchedOrder.paymentStatus === 'failed'
                          ? 'Thanh toán thất bại'
                          : searchedOrder.paymentStatus === 'cancelled'
                          ? 'Đã hủy thanh toán'
                          : searchedOrder.paymentStatus === 'refunded'
                          ? 'Đã hoàn tiền'
                          : searchedOrder.paymentMethod === 'cod'
                          ? 'Thu hộ (COD)'
                          : 'Chờ thanh toán'}
                      </span>
                    </div>
                    <p className="text-xs text-charcoal-500 mt-1">
                      Ngày đặt: {searchedOrder.createdAt}
                    </p>
                    {searchedOrder.voucherCode && (
                      <div className="mt-1">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          Mã KM: {searchedOrder.voucherCode}
                          {searchedOrder.discountAmount ? ` (-${searchedOrder.discountAmount.toLocaleString('vi-VN')}₫)` : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[11px] text-charcoal-400 block">Tổng thanh toán:</span>
                      <span className="font-extrabold text-base text-charcoal-900">
                        {searchedOrder.total.toLocaleString('vi-VN')}₫
                      </span>
                    </div>
                  </div>
                </div>

                {/* Visual Timeline (Cân đối động 4 hoặc 5 bước) hoặc Banner Đã Hủy */}
                <div>
                  <h3 className="text-xs font-bold text-charcoal-800 uppercase tracking-wider mb-6">
                    Tiến Trình Xử Lý & Vận Chuyển:
                  </h3>

                  {searchedOrder.status === 'cancelled' ? (
                    <div className="bg-red-50/80 border border-red-200/80 rounded-2xl p-6 text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 border border-red-200 flex items-center justify-center mx-auto shadow-inner">
                        <XCircle className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-base font-black text-red-800 tracking-tight uppercase">
                          {searchedOrder.paymentMethod !== 'cod' && searchedOrder.paymentStatus === 'failed'
                            ? 'THANH TOÁN VNPAY THẤT BẠI • ĐƠN HÀNG ĐÃ BỊ HỦY'
                            : searchedOrder.paymentMethod !== 'cod' && searchedOrder.paymentStatus === 'cancelled'
                            ? 'ĐÃ HỦY THANH TOÁN VNPAY • ĐƠN HÀNG ĐÃ BỊ HỦY'
                            : 'ĐƠN HÀNG ĐÃ BỊ HỦY'}
                        </h4>
                        <p className="text-xs text-red-600 max-w-md mx-auto leading-relaxed">
                          {searchedOrder.paymentMethod !== 'cod' && searchedOrder.paymentStatus === 'failed'
                            ? 'Giao dịch thanh toán VNPay không thành công. Đơn hàng không được xử lý giao hàng và toàn bộ tồn kho tạm giữ (Reserved Stock) đã được giải phóng an toàn.'
                            : searchedOrder.paymentMethod !== 'cod' && searchedOrder.paymentStatus === 'cancelled'
                            ? 'Khách hàng đã hủy giao dịch thanh toán VNPay hoặc đơn hàng đã quá thời hạn giữ hàng. Toàn bộ tồn kho tạm giữ (Reserved Stock) đã được giải phóng an toàn.'
                            : 'Đơn hàng đã được xác nhận hủy trên hệ thống. Toàn bộ số lượng sản phẩm đã được nhả giữ kho an toàn và không tiếp tục vận chuyển.'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {searchedOrder.paymentMethod !== 'cod' && searchedOrder.paymentStatus !== 'paid' && (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950">
                          <div className="space-y-1">
                            <p className="font-bold text-amber-900 flex items-center gap-1.5">
                              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>Đơn hàng VNPay chưa hoàn tất thanh toán (Chưa đủ điều kiện giao hàng)</span>
                            </p>
                            <p className="text-[11px] text-amber-800">
                              Bộ phận kho chỉ xác nhận, đóng gói và bàn giao vận chuyển sau khi hệ thống xác minh giao dịch VNPay thành công hợp lệ.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => onNavigate(`/order-success/${searchedOrder.id}`)}
                            className="px-4 py-2 bg-[#0066cc] hover:bg-[#0052a3] text-white font-bold rounded-xl text-xs shrink-0 cursor-pointer transition-colors"
                          >
                            Thanh toán / Kiểm tra VNPay
                          </button>
                        </div>
                      )}

                      <div className="relative">
                        {/* Đường kẻ nối chuẩn xác */}
                        <div
                          className={`hidden md:block absolute top-6 h-1 bg-stone-200 z-0 overflow-hidden ${
                            searchedOrder.timeline.length === 4
                              ? 'left-[12.5%] right-[12.5%]'
                              : searchedOrder.timeline.length === 3
                              ? 'left-[16.6%] right-[16.6%]'
                              : 'left-[10%] right-[10%]'
                          }`}
                        >
                          <div
                            className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                            style={{
                              width: `${Math.max(
                                0,
                                Math.min(
                                  100,
                                  ((searchedOrder.timeline.filter((s) => s.completed).length - (searchedOrder.timeline.some((s) => s.current) ? 0.5 : 1)) /
                                    Math.max(1, searchedOrder.timeline.length - 1)) *
                                    100
                                )
                              )}%`,
                            }}
                          />
                        </div>

                        <div
                          className={`grid grid-cols-1 ${
                            searchedOrder.timeline.length === 4
                              ? 'md:grid-cols-4'
                              : searchedOrder.timeline.length === 3
                              ? 'md:grid-cols-3'
                              : 'md:grid-cols-5'
                          } gap-6 relative z-10`}
                        >
                          {searchedOrder.timeline.map((step) => {
                            return (
                              <div key={step.status} className="flex md:flex-col items-start md:items-center gap-4 md:gap-2.5 text-left md:text-center">
                                {/* Circle icon */}
                                <div
                                  className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 transition-all ${
                                    step.completed
                                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                                      : step.current
                                      ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30 ring-4 ring-brand-500/20 animate-pulse'
                                      : 'bg-surface-cream text-charcoal-400 border border-surface-border'
                                  }`}
                                >
                                  {step.completed ? (
                                    <CheckCircle2 className="w-6 h-6" />
                                  ) : step.current ? (
                                    <Truck className="w-6 h-6" />
                                  ) : (
                                    <Clock className="w-5 h-5" />
                                  )}
                                </div>

                                {/* Text labels */}
                                <div>
                                  <p
                                    className={`text-xs font-bold ${
                                      step.current
                                        ? 'text-brand-600 font-extrabold'
                                        : step.completed
                                        ? 'text-charcoal-900'
                                        : 'text-charcoal-400'
                                    }`}
                                  >
                                    {step.label}
                                  </p>
                                  {step.time && (
                                    <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                                      {step.time}
                                    </p>
                                  )}
                                  <p className="text-[11px] text-charcoal-500 mt-1 max-w-[150px] md:mx-auto">
                                    {step.description}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* GHN 3PL REAL-TIME INTEGRATION CARD */}
                {searchedOrder.status !== 'cancelled' && (searchedOrder.carrier === 'GHN' || (searchedOrder.trackingCode && searchedOrder.trackingCode.startsWith('GHN'))) && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-orange-50/70 via-amber-50/50 to-orange-50/70 border border-orange-200/80 shadow-2xs space-y-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                          GHN
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs sm:text-sm text-charcoal-900">
                              Giao Hàng Nhanh (GHN Express)
                            </span>
                          </div>
                          <p className="text-xs text-stone-500 font-mono mt-0.5">
                            Mã vận đơn:{' '}
                            <strong className="text-[#5C1D24]">
                              {searchedOrder.trackingCode || ghnTracking?.orderCode}
                            </strong>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isLoadingGhn}
                          onClick={() => fetchGhnTracking(searchedOrder)}
                          className="px-3 py-1.5 text-xs font-bold bg-white hover:bg-stone-50 text-charcoal-800 border border-stone-200 rounded-xl transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 text-orange-600 ${isLoadingGhn ? 'animate-spin' : ''}`} />
                          <span>{isLoadingGhn ? 'Đang kết nối GHN...' : 'Cập nhật từ GHN'}</span>
                        </button>
                        {searchedOrder.trackingCode && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(searchedOrder.trackingCode || '');
                              showToast('Đã sao chép mã vận đơn GHN', '', 'info');
                            }}
                            className="p-2 text-stone-600 hover:text-stone-900 bg-white border border-stone-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
                            title="Sao chép mã vận đơn"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Chi tiết trạng thái và thời gian giao hàng */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-orange-200/60 text-xs">
                      <div className="bg-white/90 p-3 rounded-xl border border-orange-100 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-stone-400 block">
                          Trạng thái bưu kiện hiện tại:
                        </span>
                        {ghnTracking ? (
                          <>
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
                              <span className="font-extrabold text-xs text-orange-700">
                                {ghnTracking.statusText || 'Bưu tá GHN đang xử lý kiện hàng'}
                              </span>
                            </div>
                            {ghnTracking.status && (
                              <p className="text-[11px] text-stone-600 leading-snug">
                                {ghnService.getStatusDescription(ghnTracking.status).description}
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-[11px] text-stone-500">
                            Chưa có dữ liệu hành trình từ bưu cục GHN hoặc đơn hàng đang chờ phân tuyến.
                          </p>
                        )}
                      </div>

                      <div className="bg-white/90 p-3 rounded-xl border border-orange-100 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-stone-400 block">
                          Dự kiến phát hàng:
                        </span>
                        <span className="font-extrabold text-xs text-charcoal-900 block">
                          {ghnTracking?.leadtime
                            ? new Date(ghnTracking.leadtime).toLocaleDateString('vi-VN', {
                                weekday: 'long',
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })
                            : '1 - 3 ngày làm việc'}
                        </span>
                        <p className="text-[11px] text-emerald-600 font-semibold">
                          ✓ Giao tận nơi • Được kiểm tra hàng trước khi nhận
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Items & Shipping Address details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-surface-border">
                  {/* Delivery address */}
                  <div className="bg-surface-cream/70 p-5 rounded-2xl border border-surface-border space-y-2 text-xs">
                    <h4 className="font-bold text-charcoal-900 uppercase tracking-wider text-[11px]">
                      Thông Tin Nhận Hàng:
                    </h4>
                    <p className="font-bold text-charcoal-900">
                      {searchedOrder.shippingAddress.fullName} – {searchedOrder.shippingAddress.phone}
                    </p>
                    <p className="text-charcoal-600">
                      {searchedOrder.shippingAddress.addressDetail}, {searchedOrder.shippingAddress.ward},{' '}
                      {searchedOrder.shippingAddress.district}, {searchedOrder.shippingAddress.province}
                    </p>
                    <p className="text-charcoal-500 pt-1">
                      Phương thức thanh toán:{' '}
                      {searchedOrder.paymentMethod === 'cod' && (
                        <span>
                          <strong className="text-charcoal-900 font-bold">Thanh toán khi nhận hàng (COD)</strong>
                          <span className="text-stone-400 mx-1.5">•</span>
                          <span className={searchedOrder.paymentStatus === 'paid' ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                            {searchedOrder.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Thu tiền khi giao hàng'}
                          </span>
                        </span>
                      )}
                      {searchedOrder.paymentMethod === 'vietqr' && (
                        <span>
                          <strong className="text-charcoal-900 font-bold">Chuyển khoản VietQR 24/7</strong>
                          <span className="text-stone-400 mx-1.5">•</span>
                          <span className={searchedOrder.paymentStatus === 'paid' ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                            {searchedOrder.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chờ xác nhận chuyển khoản'}
                          </span>
                        </span>
                      )}
                      {searchedOrder.paymentMethod === 'vnpay' && (
                        <span>
                          <strong className="text-charcoal-900 font-bold">Cổng thanh toán VNPay</strong>
                          <span className="text-stone-400 mx-1.5">•</span>
                          <span
                            className={
                              searchedOrder.paymentStatus === 'paid'
                                ? 'text-emerald-600 font-bold'
                                : searchedOrder.paymentStatus === 'failed' || searchedOrder.paymentStatus === 'cancelled'
                                ? 'text-rose-600 font-bold'
                                : 'text-amber-600 font-bold'
                            }
                          >
                            {searchedOrder.paymentStatus === 'paid'
                              ? 'Đã thanh toán qua VNPay'
                              : searchedOrder.paymentStatus === 'failed'
                              ? 'Thanh toán thất bại'
                              : searchedOrder.paymentStatus === 'cancelled'
                              ? 'Đã hủy thanh toán'
                              : searchedOrder.paymentStatus === 'refunded'
                              ? 'Đã hoàn tiền'
                              : 'Chờ thanh toán VNPay'}
                          </span>
                        </span>
                      )}
                      {searchedOrder.paymentMethod !== 'cod' && searchedOrder.paymentMethod !== 'vietqr' && searchedOrder.paymentMethod !== 'vnpay' && (
                        <span>
                          <strong className="text-charcoal-900 font-bold uppercase">{searchedOrder.paymentMethod}</strong>
                          <span className="text-stone-400 mx-1.5">•</span>
                          <span className={searchedOrder.paymentStatus === 'paid' ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                            {searchedOrder.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chờ thanh toán'}
                          </span>
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Products list in this order */}
                  <div className="bg-surface-cream/70 p-5 rounded-2xl border border-surface-border space-y-2 text-xs">
                    <h4 className="font-bold text-charcoal-900 uppercase tracking-wider text-[11px]">
                      Sản Phẩm Trong Kiện ({searchedOrder.items.length} món):
                    </h4>
                    <div className="divide-y divide-surface-border/70 max-h-36 overflow-y-auto pr-1">
                      {searchedOrder.items.map((item) => (
                        <div key={item.id} className="py-2 flex items-center justify-between gap-2">
                          <div className="truncate">
                            <p className="font-bold text-charcoal-900 truncate">{item.product.name}</p>
                            <p className="text-[11px] text-charcoal-500">
                              Size {item.size} • {item.colorName} • SL: {item.quantity}
                            </p>
                          </div>
                          <span className="font-mono font-bold text-charcoal-900 shrink-0">
                            {(item.price * item.quantity).toLocaleString('vi-VN')}₫
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-surface-border p-8 sm:p-10 text-center space-y-4 shadow-soft">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-heading font-bold text-lg text-charcoal-900">
                    Không Tìm Thấy Đơn Hàng
                  </h3>
                  <p className="text-xs text-charcoal-500 max-w-md mx-auto leading-relaxed">
                    Hệ thống không tìm thấy thông tin đơn hàng này hoặc đơn hàng đã bị hủy. Vui lòng kiểm tra lại mã đơn hàng chính xác.
                  </p>
                  <p className="text-[11px] text-stone-500 font-medium">
                    💡 Mẹo: Bạn có thể nhập <strong>Số điện thoại đặt hàng</strong> vào ô tìm kiếm để tra cứu tất cả đơn của mình.
                  </p>
                </div>

                {userVisibleOrders.length > 0 && (
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        const latest = userVisibleOrders[0];
                        setSearchInput(latest.id);
                        setSearchedOrder(latest);
                        setPermissionDenied(false);
                        setHasSearched(true);
                        fetchGhnTracking(latest);
                      }}
                      className="px-5 py-2.5 bg-[#5C1D24] hover:bg-[#48161C] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Package className="w-4 h-4" />
                      <span>Xem Đơn Hàng Gần Nhất ({userVisibleOrders[0].id})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigate('/products')}
                      className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Tiếp Tục Mua Sắm
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
