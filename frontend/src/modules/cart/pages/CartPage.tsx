import React, { useState } from 'react';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, ShieldCheck, Tag, Check, Heart, ChevronRight, Truck } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { Size } from '@/types';
import { VoucherModal } from '@/modules/cart/components/VoucherModal';
import { useAuth } from '@/modules/user/context/AuthContext';

interface CartPageProps {
  onNavigate: (path: string) => void;
}

export const CartPage: React.FC<CartPageProps> = ({ onNavigate }) => {
  const { currentUser, openLoginPrompt } = useAuth();
  const {
    cart,
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
  const [voucherCode, setVoucherCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);

  const handleApplyVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherCode.trim()) return;
    const ok = applyVoucher(voucherCode.trim());
    if (ok) {
      setVoucherCode('');
      setErrorMsg('');
    } else {
      setErrorMsg('Mã voucher không hợp lệ hoặc đơn hàng chưa đủ điều kiện.');
    }
  };

  if (cart.length === 0) {
    return (
      <div className="py-20 bg-surface-light min-h-[70vh] flex items-center justify-center">
        <div className="max-w-md w-full mx-auto px-4 text-center space-y-5">
          <div className="w-24 h-24 bg-surface-cream rounded-full flex items-center justify-center mx-auto text-charcoal-400">
            <ShoppingBag className="w-12 h-12 stroke-[1.5]" />
          </div>
          <h2 className="text-2xl font-extrabold text-charcoal-900 font-heading">
            Giỏ Hàng Của Bạn Đang Trống
          </h2>
          <p className="text-xs sm:text-sm text-charcoal-500 max-w-sm mx-auto leading-relaxed">
            Chưa có sản phẩm nào trong giỏ hàng. Hãy khám phá ngay các bộ sưu tập Big Size (XL - 5XL) được may đo chuẩn dáng người đầy đặn.
          </p>
          <button
            onClick={() => onNavigate('/products')}
            className="px-8 py-3.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm rounded-full shadow-float transition-all"
          >
            Bắt đầu mua sắm ngay
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-10 bg-surface-light min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-charcoal-400 mb-6">
          <button onClick={() => onNavigate('/')} className="hover:text-charcoal-700">
            Trang chủ
          </button>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-charcoal-800 font-semibold">Giỏ hàng ({cart.length} món)</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-charcoal-900 tracking-tight mb-8">
          Giỏ Hàng Mua Sắm
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Items List (Left 8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {/* Free shipping bar */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs">
              {subtotal >= 500000 ? (
                <p className="text-emerald-700 font-bold flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  Chúc mừng! Đơn hàng của bạn đủ điều kiện MIỄN PHÍ VẬN CHUYỂN toàn quốc.
                </p>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-amber-900">
                    Mua thêm <strong>{(500000 - subtotal).toLocaleString('vi-VN')}₫</strong> để được <strong>FREESHIP</strong> toàn quốc!
                  </p>
                  <div className="w-full bg-amber-200/60 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-brand-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (subtotal / 500000) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Items Table / Cards */}
            <div className="bg-white rounded-3xl border border-surface-border shadow-soft overflow-hidden divide-y divide-surface-border">
              {cart.map((item) => (
                <div key={item.id} className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4 sm:items-center">
                  <img
                    src={item.product.images[0]}
                    alt={item.product.name}
                    className="w-24 h-28 object-cover rounded-2xl bg-stone-100 shrink-0 border border-surface-border cursor-pointer"
                    onClick={() => onNavigate(`/product/${item.productId}`)}
                  />

                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3
                        onClick={() => onNavigate(`/product/${item.productId}`)}
                        className="font-heading font-bold text-sm sm:text-base text-charcoal-900 hover:text-brand-600 cursor-pointer"
                      >
                        {item.product.name}
                      </h3>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-charcoal-400 hover:text-red-500 p-1 transition-colors"
                        title="Xóa món này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-charcoal-600 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-3 h-3 rounded-full border border-stone-300"
                          style={{ backgroundColor: item.colorHex }}
                        />
                        <span>Màu: <strong>{item.colorName}</strong></span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span>Size:</span>
                        <select
                          value={item.size}
                          onChange={(e) => changeItemSize(item.id, e.target.value as Size)}
                          className="bg-surface-cream border border-surface-border text-charcoal-900 rounded-lg font-bold text-xs px-2 py-0.5"
                        >
                          {item.product.sizes.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={() => {
                          toggleWishlist(item.productId, item.product.name);
                        }}
                        className="text-xs text-charcoal-500 hover:text-rose-500 flex items-center gap-1 ml-auto"
                      >
                        <Heart className="w-3.5 h-3.5" />
                        <span>Lưu yêu thích</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      {/* Quantity */}
                      <div className="flex items-center border border-surface-border rounded-xl overflow-hidden bg-surface-cream">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="px-2.5 py-1 text-charcoal-700 hover:bg-stone-200"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-3 py-1 text-xs font-bold text-charcoal-900 min-w-[24px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="px-2.5 py-1 text-charcoal-700 hover:bg-stone-200"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="text-right">
                        <p className="text-sm sm:text-base font-extrabold text-brand-600 font-heading">
                          {(item.price * item.quantity).toLocaleString('vi-VN')}₫
                        </p>
                        <p className="text-[11px] text-charcoal-400">
                          {item.price.toLocaleString('vi-VN')}₫ / cái
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary (Right 4 cols) */}
          <div className="lg:col-span-4 bg-white p-6 sm:p-7 rounded-3xl border border-surface-border shadow-soft space-y-5 sticky top-28">
            <h3 className="font-heading font-bold text-base text-charcoal-900 pb-3 border-b border-surface-border">
              Tóm Tắt Đơn Hàng
            </h3>

            {/* Voucher input & Dual Applied Vouchers */}
            <div className="space-y-2.5">
              {/* Applied Discount Voucher Card */}
              {appliedDiscountVoucher && (
                <div className="flex items-center justify-between bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-xs">
                  <div className="flex items-center gap-2 text-rose-900">
                    <Tag className="w-4 h-4 text-rose-600 shrink-0" />
                    <div>
                      <p className="font-bold">
                        Giảm giá: <span className="font-mono">{appliedDiscountVoucher.code}</span>
                      </p>
                      <p className="text-[11px] text-rose-700">
                        {appliedDiscountVoucher.discountType === 'percent'
                          ? `Giảm ${appliedDiscountVoucher.discountValue}% (Tối đa ${appliedDiscountVoucher.maxDiscount?.toLocaleString('vi-VN')}₫)`
                          : `Giảm ${appliedDiscountVoucher.discountValue.toLocaleString('vi-VN')}₫`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={removeDiscountVoucher}
                    className="text-xs text-rose-700 hover:text-rose-900 underline font-semibold cursor-pointer"
                  >
                    Bỏ mã
                  </button>
                </div>
              )}

              {/* Applied Shipping Voucher Card */}
              {appliedShippingVoucher && (
                <div className="flex items-center justify-between bg-sky-50 border border-sky-200 rounded-xl p-2.5 text-xs">
                  <div className="flex items-center gap-2 text-sky-900">
                    <Truck className="w-4 h-4 text-sky-600 shrink-0" />
                    <div>
                      <p className="font-bold">
                        Vận chuyển: <span className="font-mono">{appliedShippingVoucher.code}</span>
                      </p>
                      <p className="text-[11px] text-sky-700">
                        Hỗ trợ phí ship {appliedShippingVoucher.discountValue.toLocaleString('vi-VN')}₫
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={removeShippingVoucher}
                    className="text-xs text-sky-700 hover:text-sky-900 underline font-semibold cursor-pointer"
                  >
                    Bỏ mã
                  </button>
                </div>
              )}

              {/* Form nhập mã */}
              {(!appliedDiscountVoucher && !appliedShippingVoucher) ? (
                <form onSubmit={handleApplyVoucher} className="space-y-1.5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Mã voucher (BIGSIZE10, FREESHIP)..."
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                      className="flex-1 bg-surface-cream border border-surface-border rounded-xl px-3 py-2 text-xs uppercase focus:outline-none focus:border-brand-500 font-mono font-bold tracking-wider placeholder:font-normal placeholder:normal-case placeholder:tracking-normal"
                    />
                    <button
                      type="submit"
                      disabled={!voucherCode.trim()}
                      className="px-4 py-2 bg-charcoal-900 text-white text-xs font-bold rounded-xl hover:bg-black disabled:bg-stone-300 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      Áp dụng
                    </button>
                  </div>
                  {errorMsg && <p className="text-[11px] text-red-600">{errorMsg}</p>}

                  {/* Gợi ý mã nhanh */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10.5px] text-stone-500">Gợi ý:</span>
                    {!appliedDiscountVoucher && !usedVoucherCodes.includes('BIGSIZE10') && (
                      <button
                        type="button"
                        onClick={() => applyVoucher('BIGSIZE10')}
                        className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-md text-[10px] font-semibold cursor-pointer transition-colors"
                      >
                        🏷️ BIGSIZE10 (-10%)
                      </button>
                    )}
                    {!appliedShippingVoucher && (
                      <button
                        type="button"
                        onClick={() => applyVoucher('FREESHIP')}
                        className="px-2 py-0.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-md text-[10px] font-semibold cursor-pointer transition-colors"
                      >
                        🚚 FREESHIP (-30k)
                      </button>
                    )}
                  </div>

                  {/* Nút mở Kho Voucher Modal */}
                  <button
                    type="button"
                    onClick={() => setIsVoucherModalOpen(true)}
                    className="w-full py-2 px-3 border border-dashed border-stone-300 hover:border-brand-500 rounded-xl bg-stone-50/60 hover:bg-brand-50/30 text-stone-700 hover:text-brand-700 text-xs flex items-center justify-between transition-all cursor-pointer group mt-2"
                  >
                    <span className="flex items-center gap-1.5 font-bold">
                      <Tag className="w-3.5 h-3.5 text-brand-600 group-hover:scale-110 transition-transform" />
                      <span>Chọn mã từ Kho Voucher ưu đãi</span>
                    </span>
                    <span className="text-[11px] font-bold text-brand-600 group-hover:translate-x-0.5 transition-transform flex items-center">
                      <span>Xem tất cả</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </button>
                </form>
              ) : (
                <div className="space-y-2">
                  <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center justify-between">
                    <span>
                      ✓ Đã áp dụng mã ưu đãi: <strong className="font-mono">{appliedVoucher?.code}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeVoucher()}
                      className="text-[11px] text-rose-600 hover:text-rose-800 underline font-semibold cursor-pointer ml-2"
                    >
                      Bỏ mã
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsVoucherModalOpen(true)}
                    className="w-full py-1.5 px-3 border border-stone-200 hover:border-brand-500 rounded-xl text-stone-600 hover:text-brand-700 text-xs flex items-center justify-center gap-1 font-semibold transition-all cursor-pointer"
                  >
                    <span>Thay đổi mã ưu đãi trong kho</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Price list */}
            <div className="space-y-2 text-xs text-charcoal-600 pt-2 border-t border-surface-border">
              <div className="flex justify-between">
                <span>Tạm tính tiền hàng:</span>
                <span className="font-bold text-charcoal-900">{subtotal.toLocaleString('vi-VN')}₫</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-rose-700">
                  <span>Giảm giá từ voucher {appliedDiscountVoucher ? `(${appliedDiscountVoucher.code})` : ''}:</span>
                  <span className="font-bold">-{discountAmount.toLocaleString('vi-VN')}₫</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Phí vận chuyển gốc:</span>
                <span className="font-bold">
                  {baseShippingFee === 0 ? (
                    <span className="text-emerald-600">Miễn phí</span>
                  ) : (
                    `${baseShippingFee.toLocaleString('vi-VN')}₫`
                  )}
                </span>
              </div>
              {shippingDiscountAmount > 0 && (
                <div className="flex justify-between text-sky-700">
                  <span>Hỗ trợ phí vận chuyển ({appliedShippingVoucher?.code}):</span>
                  <span className="font-bold">-{shippingDiscountAmount.toLocaleString('vi-VN')}₫</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-charcoal-900 pt-3 border-t border-surface-border">
                <span>Tổng thanh toán:</span>
                <span className="text-xl font-extrabold text-brand-600 font-heading">
                  {total.toLocaleString('vi-VN')}₫
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                if (!currentUser) {
                  openLoginPrompt('Vui lòng đăng nhập để tiến hành thanh toán đơn hàng.');
                  return;
                }
                onNavigate('/checkout');
              }}
              className="w-full py-4 bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-float transition-all group"
            >
              <span>Tiến hành thanh toán</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="pt-2 text-center">
              <button
                onClick={() => onNavigate('/products')}
                className="text-xs font-bold text-charcoal-600 hover:text-brand-600 hover:underline"
              >
                ← Tiếp tục chọn thêm sản phẩm
              </button>
            </div>

            <div className="pt-3 border-t border-surface-border text-[11px] text-charcoal-400 space-y-1">
              <p className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Bảo hiểm đổi size tận nhà trong 7 ngày</span>
              </p>
              <p className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Kiểm tra hàng trước khi thanh toán</span>
              </p>
            </div>
          </div>
        </div>
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
