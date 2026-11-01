import React, { useState, useEffect } from 'react';
import { Search, Compass, Package, CheckCircle2, Clock, Truck, ShieldCheck, ChevronRight, RefreshCw, AlertCircle } from 'lucide-react';
import { useOrder } from '../../context/OrderContext';
import { Order, OrderStatus } from '../../types';

interface OrderTrackingPageProps {
  initialCode?: string;
  onNavigate: (path: string) => void;
}

export const OrderTrackingPage: React.FC<OrderTrackingPageProps> = ({ initialCode = '', onNavigate }) => {
  const { orders, getOrderById, getOrdersByPhone, advanceOrderStatus } = useOrder();

  const [searchInput, setSearchInput] = useState(initialCode);
  const [searchedOrder, setSearchedOrder] = useState<Order | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (initialCode) {
      setSearchInput(initialCode);
      const found = getOrderById(initialCode);
      if (found) {
        setSearchedOrder(found);
        setHasSearched(true);
      } else if (orders.length > 0) {
        // Thử tìm theo số điện thoại
        const byPhone = getOrdersByPhone(initialCode);
        if (byPhone.length > 0) {
          setSearchedOrder(byPhone[0]);
          setHasSearched(true);
        } else {
          setSearchedOrder(null);
          setHasSearched(true);
        }
      }
    }
  }, [initialCode, orders, getOrderById, getOrdersByPhone]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchInput.trim();
    if (!query) return;

    setHasSearched(true);
    // 1. Tìm theo mã đơn / alias / mã vận đơn 3PL
    const byId = getOrderById(query);
    if (byId) {
      setSearchedOrder(byId);
      return;
    }

    // 2. Tìm theo số điện thoại
    const byPhone = getOrdersByPhone(query);
    if (byPhone.length > 0) {
      setSearchedOrder(byPhone[0]);
      return;
    }

    setSearchedOrder(null);
  };

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
            Nhập mã đơn hàng dạng <strong>BS-XXXXX</strong> hoặc Số điện thoại đặt hàng để cập nhật trạng thái mới nhất.
          </p>
        </div>

        {/* Search Input Box */}
        <div className="bg-white p-4 sm:p-6 rounded-3xl border border-surface-border shadow-soft max-w-2xl mx-auto">
          <form onSubmit={handleSearch} className="flex gap-2.5">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Nhập mã đơn hàng (VD: BS-HD09, BS-68879) hoặc SĐT..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full bg-surface-cream border border-surface-border rounded-2xl py-3 pl-10 pr-4 text-xs sm:text-sm font-semibold text-charcoal-900 placeholder-charcoal-400 focus:outline-none focus:border-brand-500"
              />
              <Search className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-sm transition-all cursor-pointer"
            >
              Tra cứu
            </button>
          </form>

          {/* Quick Demo shortcuts & Recent Orders */}
          <div className="flex items-center gap-2 mt-3 text-xs text-charcoal-500 flex-wrap pt-2 border-t border-stone-100">
            <span className="font-semibold text-stone-600">Đơn hàng gợi ý tra cứu:</span>
            {orders.slice(0, 4).map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  setSearchInput(o.id);
                  setSearchedOrder(o);
                  setHasSearched(true);
                }}
                className="font-mono font-bold text-[#5C1D24] hover:bg-[#5C1D24] hover:text-white bg-[#5C1D24]/5 px-2.5 py-1 rounded-lg border border-[#5C1D24]/20 transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <span>📦</span>
                <span>{o.id}</span>
                {o.clientCode && o.clientCode !== o.id && (
                  <span className="text-[10px] text-stone-400 font-normal">({o.clientCode})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Results Area */}
        {hasSearched && (
          <>
            {searchedOrder ? (
              <div className="bg-white rounded-3xl border border-surface-border shadow-soft overflow-hidden p-6 sm:p-8 space-y-8 animate-fadeIn">
                {/* Header of Order */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-surface-border gap-4">
                  <div>
                    <span className="text-[11px] font-bold text-charcoal-400 uppercase tracking-wider">
                      Mã Đơn Hàng
                    </span>
                    <h2 className="text-2xl font-black text-brand-600 font-mono">
                      {searchedOrder.id}
                    </h2>
                    <p className="text-xs text-charcoal-500 mt-0.5">
                      Ngày đặt: {searchedOrder.createdAt}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[11px] text-charcoal-400 block">Tổng thanh toán:</span>
                      <span className="font-extrabold text-base text-charcoal-900">
                        {searchedOrder.total.toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                  </div>
                </div>

                {/* Visual Timeline (Cân đối động 4 hoặc 5 bước) */}
                <div>
                  <h3 className="text-xs font-bold text-charcoal-800 uppercase tracking-wider mb-6">
                    Tiến Trình Xử Lý & Vận Chuyển:
                  </h3>

                  <div className="relative">
                    {/* Đường kẻ nối chuẩn xác từ tâm vòng tròn 1 đến tâm vòng tròn cuối */}
                    <div
                      className={`hidden md:block absolute top-6 h-1 bg-stone-200 z-0 overflow-hidden ${
                        searchedOrder.timeline.length === 4
                          ? 'left-[12.5%] right-[12.5%]'
                          : searchedOrder.timeline.length === 3
                          ? 'left-[16.6%] right-[16.6%]'
                          : 'left-[10%] right-[10%]'
                      }`}
                    >
                      {/* Dải màu xanh ngọc biểu thị tiến độ thực tế */}
                      <div
                        className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                        style={{
                          width: `${Math.max(
                            0,
                            Math.min(
                              100,
                              ((searchedOrder.timeline.filter((s) => s.completed).length - (searchedOrder.timeline.some(s => s.current) ? 0.5 : 1)) /
                                Math.max(1, searchedOrder.timeline.length - 1)) *
                                100
                            )
                          )}%`
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
                      {searchedOrder.timeline.map((step, idx) => {
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
                          <span className="text-amber-600 font-bold">Thu tiền khi giao hàng</span>
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
                          <span className={searchedOrder.paymentStatus === 'paid' ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                            {searchedOrder.paymentStatus === 'paid' ? 'Đã thanh toán qua VNPay' : 'Chờ thanh toán VNPay'}
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
                            {(item.price * item.quantity).toLocaleString('vi-VN')}đ
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
                    Chưa Tìm Thấy Thông Tin Đơn Hàng
                  </h3>
                  <p className="text-xs text-charcoal-500 max-w-md mx-auto leading-relaxed">
                    Vui lòng kiểm tra lại mã đơn hàng. Nếu bạn vừa hoàn tất thanh toán, hệ thống có thể cần vài giây để đồng bộ hóa CSDL.
                  </p>
                  <p className="text-[11px] text-stone-500 font-medium">
                    💡 Mẹo: Bạn có thể nhập <strong>Số điện thoại đặt hàng</strong> vào ô tìm kiếm để tra cứu tất cả đơn của mình.
                  </p>
                </div>

                {orders.length > 0 && (
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        const latest = orders[0];
                        setSearchInput(latest.id);
                        setSearchedOrder(latest);
                        setHasSearched(true);
                      }}
                      className="px-5 py-2.5 bg-[#5C1D24] hover:bg-[#48161C] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Package className="w-4 h-4" />
                      <span>Xem Đơn Hàng Vừa Tạo ({orders[0].id})</span>
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
