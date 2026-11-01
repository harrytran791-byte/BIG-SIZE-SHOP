import React, { useState } from 'react';
import { X, Trash2, ShoppingBag, Plus, Minus, Tag, Check, ArrowRight, ShieldCheck, Truck } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Size } from '@/types';
import { VoucherModal } from '@/modules/cart/components/VoucherModal';

interface CartDrawerProps {
  onNavigate: (path: string) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onNavigate }) => {
  const { currentRole, currentUser, openLoginPrompt } = useAuth();
  const { showToast } = useToast();
  const {
    cart,
    isCartDrawerOpen,
    setIsCartDrawerOpen,
    updateQuantity,
    removeFromCart,
    changeItemSize,
    subtotal,
    discountAmount,
    baseShippingFee,
    shippingDiscountAmount,
    shippingFee,
    total,
    appliedVoucher,
    appliedDiscountVoucher,
    appliedShippingVoucher,
    applyVoucher,
    removeVoucher,
    removeDiscountVoucher,
    removeShippingVoucher,
    vouchersList,
    usedVoucherCodes,
  } = useCart();

  const { toggleWishlist } = useWishlist();
  const [voucherInput, setVoucherInput] = useState('');
  const [voucherError, setVoucherError] = useState('');
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);

  if (!isCartDrawerOpen) return null;

  const handleApplyVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherInput.trim()) return;
    const ok = applyVoucher(voucherInput.trim());
    if (ok) {
      setVoucherInput('');
      setVoucherError('');
    } else {
      setVoucherError('Mã không khả dụng hoặc chưa đạt giá trị tối thiểu');
    }
  };

  const handleCheckout = () => {
    if (currentRole === 'manager' || currentRole === 'admin') {
      showToast(
        'Chế độ xem trước của Quản lý',
        'Tài khoản Quản lý / Quản trị viên không được phép đặt mua hàng để bảo đảm tính minh bạch.',
        'error'
      );
      return;
    }
    if (!currentUser) {
      setIsCartDrawerOpen(false);
      openLoginPrompt('Vui lòng đăng nhập để tiến hành đặt hàng và thanh toán.');
      return;
    }
    setIsCartDrawerOpen(false);
    onNavigate('/checkout');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-charcoal-900/60 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartDrawerOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-md w-full bg-white shadow-modal flex flex-col z-10 animate-slideLeft">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-surface-border flex items-center justify-between bg-surface-cream">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-brand-600" />
            <h3 className="font-heading font-bold text-lg text-charcoal-900">
              Giỏ Hàng Của Bạn ({cart.length})
            </h3>
          </div>
          <button
            onClick={() => setIsCartDrawerOpen(false)}
            className="p-1.5 text-charcoal-500 hover:text-charcoal-900 rounded-lg hover:bg-stone-200/60 transition-colors"
            aria-label="Đóng giỏ hàng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar to Free Shipping */}
        <div className="bg-amber-50/80 px-4 py-2.5 border-b border-amber-100 text-xs">
          {subtotal >= 500000 ? (
            <p className="text-emerald-700 font-semibold flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" />
              Đơn hàng của bạn đã đạt điều kiện <strong>MIỄN PHÍ VẬN CHUYỂN</strong>!
            </p>
          ) : (
            <div className="space-y-1.5">
              <p className="text-amber-800">
                Mua thêm <strong>{(500000 - subtotal).toLocaleString('vi-VN')}₫</strong> để nhận{' '}
                <strong className="text-brand-600">FREESHIP</strong> toàn quốc!
              </p>
              <div className="w-full bg-amber-200/60 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-brand-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (subtotal / 500000) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Cart items list or Empty state */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-surface-border">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-20 h-20 bg-surface-cream rounded-full flex items-center justify-center text-charcoal-400">
                <ShoppingBag className="w-10 h-10 stroke-[1.5]" />
              </div>
              <div>
                <h4 className="font-heading font-bold text-lg text-charcoal-800">
                  Giỏ hàng của bạn đang trống
                </h4>
                <p className="text-xs text-charcoal-500 mt-1 max-w-xs">
                  Khám phá những mẫu trang phục Big Size thiết kế độc quyền, tôn dáng và thoải mái từ XL đến 5XL.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsCartDrawerOpen(false);
                  onNavigate('/products');
                }}
                className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-full text-xs font-bold tracking-wide transition-all shadow-sm"
              >
                Khám phá sản phẩm ngay
              </button>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="py-4 flex gap-3.5 group">
                <img
                  src={item.product.images[0]}
                  alt={item.product.name}
                  className="w-20 h-24 object-cover rounded-lg bg-stone-100 shrink-0 border border-surface-border"
                />

                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4
                        onClick={() => {
                          setIsCartDrawerOpen(false);
                          onNavigate(`/product/${item.productId}`);
                        }}
                        className="text-xs sm:text-sm font-semibold text-charcoal-900 line-clamp-1 hover:text-brand-600 cursor-pointer"
                      >
                        {item.product.name}
                      </h4>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-charcoal-400 hover:text-red-500 p-1 transition-colors"
                        title="Xóa khỏi giỏ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Variant details with quick size switch */}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-charcoal-600">
                      <span className="flex items-center gap-1">
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-stone-300"
                          style={{ backgroundColor: item.colorHex }}
                        />
                        {item.colorName}
                      </span>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <span>Size:</span>
                        <select
                          value={item.size}
                          onChange={(e) => changeItemSize(item.id, e.target.value as Size)}
                          className="bg-surface-cream border border-surface-border text-charcoal-900 rounded font-semibold text-xs px-1.5 py-0.5 focus:outline-none focus:border-brand-500"
                        >
                          {item.product.sizes.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    {/* Quantity controls */}
                    <div className="flex items-center border border-surface-border rounded-lg overflow-hidden bg-surface-cream">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-1 hover:bg-stone-200/70 text-charcoal-700 transition-colors"
                        aria-label="Giảm"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-2.5 py-0.5 text-xs font-bold text-charcoal-900 min-w-[24px] text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-1 hover:bg-stone-200/70 text-charcoal-700 transition-colors"
                        aria-label="Tăng"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-charcoal-400">
                        {item.quantity > 1 && `${item.price.toLocaleString('vi-VN')}₫ × ${item.quantity}`}
                      </p>
                      <p className="text-sm font-bold text-brand-600">
                        {(item.price * item.quantity).toLocaleString('vi-VN')}₫
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer with summary and voucher */}
        {cart.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-surface-border bg-surface-cream/50 space-y-3">
            {/* Voucher apply box */}
            <div className="space-y-2">
              {/* Applied Discount Voucher Chip */}
              {appliedDiscountVoucher && (
                <div className="flex items-center justify-between bg-rose-50 border border-rose-200 rounded-lg p-2 text-xs">
                  <div className="flex items-center gap-1.5 text-rose-900">
                    <Tag className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>
                      Giảm giá: <strong>{appliedDiscountVoucher.code}</strong> (-{discountAmount.toLocaleString('vi-VN')}₫)
                    </span>
                  </div>
                  <button
                    onClick={removeDiscountVoucher}
                    className="text-xs text-rose-700 hover:text-rose-900 underline font-medium cursor-pointer"
                  >
                    Bỏ mã
                  </button>
                </div>
              )}

              {/* Applied Shipping Voucher Chip */}
              {appliedShippingVoucher && (
                <div className="flex items-center justify-between bg-sky-50 border border-sky-200 rounded-lg p-2 text-xs">
                  <div className="flex items-center gap-1.5 text-sky-900">
                    <Truck className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <span>
                      Vận chuyển: <strong>{appliedShippingVoucher.code}</strong> (-{shippingDiscountAmount.toLocaleString('vi-VN')}₫)
                    </span>
                  </div>
                  <button
                    onClick={removeShippingVoucher}
                    className="text-xs text-sky-700 hover:text-sky-900 underline font-medium cursor-pointer"
                  >
                    Bỏ mã
                  </button>
                </div>
              )}

              {/* Input field if no voucher is applied */}
              {(!appliedDiscountVoucher && !appliedShippingVoucher) && (
                <form onSubmit={handleApplyVoucher} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Mã voucher (BIGSIZE10, FREESHIP)"
                    value={voucherInput}
                    onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                    className="flex-1 bg-white border border-surface-border rounded-lg px-3 py-2 text-xs uppercase font-mono font-bold tracking-wider placeholder:normal-case placeholder:font-normal placeholder:tracking-normal text-charcoal-800 placeholder-charcoal-400 focus:outline-none focus:border-brand-500"
                  />
                  <button
                    type="submit"
                    disabled={!voucherInput.trim()}
                    className="px-3.5 py-2 bg-charcoal-900 hover:bg-black disabled:bg-stone-300 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors shrink-0 cursor-pointer"
                  >
                    Áp dụng
                  </button>
                </form>
              )}
              {voucherError && <p className="text-[11px] text-red-600 mt-1">{voucherError}</p>}

              <button
                type="button"
                onClick={() => setIsVoucherModalOpen(true)}
                className="w-full py-1.5 px-2.5 border border-dashed border-stone-300 hover:border-brand-500 rounded-lg text-stone-700 hover:text-brand-700 text-[11px] flex items-center justify-between transition-all cursor-pointer mt-1.5"
              >
                <span className="flex items-center gap-1 font-semibold">
                  <Tag className="w-3 h-3 text-brand-600" />
                  <span>Kho Voucher ưu đãi</span>
                </span>
                <span className="font-bold text-brand-600">Chọn mã ›</span>
              </button>
            </div>

            {/* Calculations breakdown */}
            <div className="space-y-1.5 text-xs text-charcoal-600 pt-1">
              <div className="flex justify-between">
                <span>Tạm tính ({cart.length} món):</span>
                <span className="font-semibold text-charcoal-900">
                  {subtotal.toLocaleString('vi-VN')}₫
                </span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-rose-700">
                  <span>Giảm giá voucher:</span>
                  <span className="font-semibold">-{discountAmount.toLocaleString('vi-VN')}₫</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Phí vận chuyển gốc:</span>
                <span className="font-semibold">
                  {baseShippingFee === 0 ? (
                    <span className="text-emerald-600 font-bold">Miễn phí</span>
                  ) : (
                    `${baseShippingFee.toLocaleString('vi-VN')}₫`
                  )}
                </span>
              </div>
              {shippingDiscountAmount > 0 && (
                <div className="flex justify-between text-sky-700">
                  <span>Hỗ trợ phí vận chuyển ({appliedShippingVoucher?.code}):</span>
                  <span className="font-semibold">-{shippingDiscountAmount.toLocaleString('vi-VN')}₫</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-charcoal-900 pt-2 border-t border-surface-border">
                <span>Tổng cộng:</span>
                <span className="text-brand-600 font-extrabold text-base">
                  {total.toLocaleString('vi-VN')}₫
                </span>
              </div>
            </div>

            {/* Checkout CTA */}
            <button
              onClick={handleCheckout}
              className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-float transition-all group"
            >
              <span>Tiến hành đặt hàng</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => {
                setIsCartDrawerOpen(false);
                onNavigate('/cart');
              }}
              className="w-full py-2 text-center text-xs font-semibold text-charcoal-600 hover:text-charcoal-900 hover:underline"
            >
              Xem trang giỏ hàng chi tiết
            </button>

            <div className="flex items-center justify-center gap-2 text-[11px] text-charcoal-400 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Đổi trả size miễn phí trong 7 ngày nếu không vừa vặn</span>
            </div>
          </div>
        )}
      </div>

      {/* Voucher Selection Modal */}
      <VoucherModal
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        onApplyVoucher={(code) => {
          const success = applyVoucher(code);
          return success;
        }}
        currentSubtotal={subtotal}
        appliedDiscountVoucher={appliedDiscountVoucher}
        appliedShippingVoucher={appliedShippingVoucher}
        onRemoveDiscount={removeDiscountVoucher}
        onRemoveShipping={removeShippingVoucher}
        vouchersList={vouchersList}
        usedVoucherCodes={usedVoucherCodes}
      />
    </div>
  );
};
