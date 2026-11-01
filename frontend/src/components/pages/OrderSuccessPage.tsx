import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2, Compass, ArrowRight, ShieldCheck, Truck, Package, Clock } from 'lucide-react';
import { useOrder } from '../../context/OrderContext';

interface OrderSuccessPageProps {
  orderId: string;
  onNavigate: (path: string) => void;
}

export const OrderSuccessPage: React.FC<OrderSuccessPageProps> = ({ orderId, onNavigate }) => {
  const { getOrderById, orders } = useOrder();
  const order = React.useMemo(() => getOrderById(orderId), [orderId, orders, getOrderById]);

  useEffect(() => {
    try {
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.5 },
      });
    } catch {}
  }, []);

  return (
    <div className="py-16 bg-surface-light min-h-screen">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center space-y-8">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-sm animate-scaleIn">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        {/* Headline */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider border border-emerald-200">
            Đặt hàng thành công!
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-charcoal-900 font-heading tracking-tight">
            Cảm Ơn Bạn Đã Mua Sắm Tại CURVE & CONFIDENCE
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-600 max-w-md mx-auto leading-relaxed">
            Mã đơn hàng của bạn là{' '}
            <strong className="text-brand-600 font-mono text-base px-2 py-0.5 bg-brand-50 rounded border border-brand-200">
              {order ? order.id : orderId}
            </strong>
          </p>
        </div>

        {/* Order Details Card */}
        {order && (
          <div className="bg-white rounded-3xl border border-surface-border shadow-soft p-6 sm:p-8 text-left space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-surface-border text-xs">
              <div>
                <p className="text-charcoal-400">Thời gian đặt:</p>
                <p className="font-bold text-charcoal-900">{order.createdAt}</p>
              </div>
              <div className="text-right">
                <p className="text-charcoal-400">Trạng thái:</p>
                <span className="font-bold text-emerald-600">Đã ghi nhận vào hệ thống</span>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-charcoal-800 uppercase tracking-wider">
                Sản Phẩm Đã Đặt:
              </h4>
              <div className="divide-y divide-surface-border">
                {order.items.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center gap-3 text-xs">
                    <img
                      src={item.product.images[0]}
                      alt={item.product.name}
                      className="w-12 h-14 object-cover rounded-xl bg-stone-100 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-charcoal-900 truncate">{item.product.name}</p>
                      <p className="text-charcoal-500 text-[11px] mt-0.5">
                        Size: <strong>{item.size}</strong> • Màu: {item.colorName} • SL:{' '}
                        <strong>{item.quantity}</strong>
                      </p>
                    </div>
                    <span className="font-bold text-charcoal-900 font-mono">
                      {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Address */}
            <div className="p-4 bg-surface-cream rounded-2xl border border-surface-border text-xs text-charcoal-700 space-y-1">
              <p className="font-bold text-charcoal-900">Địa chỉ giao hàng:</p>
              <p>
                {order.shippingAddress.fullName} – {order.shippingAddress.phone}
              </p>
              <p>
                {order.shippingAddress.addressDetail}, {order.shippingAddress.ward},{' '}
                {order.shippingAddress.district}, {order.shippingAddress.province}
              </p>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center pt-2 border-t border-surface-border text-sm font-bold text-charcoal-900">
              <span>Tổng thanh toán:</span>
              <span className="text-xl font-black text-brand-600 font-heading">
                {order.total.toLocaleString('vi-VN')}đ
              </span>
            </div>
          </div>
        )}

        {/* Dual Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <button
            onClick={() => onNavigate(`/order-tracking?code=${order ? order.id : orderId}`)}
            className="w-full sm:w-auto px-8 py-3.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs sm:text-sm rounded-full shadow-float flex items-center justify-center gap-2 transition-all"
          >
            <Compass className="w-4 h-4" />
            <span>Theo dõi tiến trình đơn hàng</span>
          </button>

          <button
            onClick={() => onNavigate('/products')}
            className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-surface-cream text-charcoal-800 border border-surface-border font-bold text-xs sm:text-sm rounded-full transition-all"
          >
            Tiếp tục mua sắm
          </button>
        </div>
      </div>
    </div>
  );
};
