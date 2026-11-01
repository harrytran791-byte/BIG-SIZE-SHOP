import React, { useState } from 'react';
import { X, Heart, ShoppingBag, Check, ShieldCheck, Ruler, ArrowRight, Star } from 'lucide-react';
import { Product, Size } from '../../types';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useAuth } from '../../context/AuthContext';

interface QuickViewModalProps {
  product: Product | null;
  onClose: () => void;
  onNavigate: (path: string) => void;
  onOpenSizeAdvisor?: (product: Product) => void;
}

export const QuickViewModal: React.FC<QuickViewModalProps> = ({
  product,
  onClose,
  onNavigate,
  onOpenSizeAdvisor,
}) => {
  if (!product) return null;

  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { currentUser, openLoginPrompt } = useAuth();

  const [selectedColor, setSelectedColor] = useState(product.colors[0]);
  const [selectedSize, setSelectedSize] = useState<Size>(product.sizes[0]);
  const [activeImage, setActiveImage] = useState(product.images[0]);
  const [qty, setQty] = useState(1);

  const isFavorited = isInWishlist(product.id);

  // Variant check
  const activeVariant = product.variants.find(
    (v) => v.size === selectedSize && v.colorName === selectedColor.name
  );
  const isOutOfStock = activeVariant ? activeVariant.stock <= 0 : false;

  const handleAddToCart = () => {
    if (isOutOfStock || !activeVariant) return;
    addToCart(product, selectedSize, selectedColor.name, selectedColor.hex, qty);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-charcoal-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="min-h-full flex items-center justify-center p-4">
        <div className="relative bg-white rounded-3xl shadow-modal max-w-3xl w-full overflow-hidden border border-surface-border animate-scaleIn z-10">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 bg-white/80 hover:bg-white text-charcoal-700 hover:text-charcoal-900 rounded-full shadow-sm transition-all"
            aria-label="Đóng xem nhanh"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Left: Images */}
            <div className="p-6 bg-surface-cream/50 flex flex-col gap-4">
              <div className="aspect-[3/4] w-full rounded-2xl overflow-hidden bg-stone-100 shadow-sm">
                <img
                  src={activeImage}
                  alt={product.name}
                  className="w-full h-full object-cover object-center"
                />
              </div>

              {/* Thumbnails */}
              <div className="flex gap-2.5 overflow-x-auto no-scrollbar">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(img)}
                    className={`w-16 h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                      activeImage === img ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Info & Actions */}
            <div className="p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] font-bold text-brand-600 uppercase tracking-wider bg-brand-50 px-2 py-0.5 rounded">
                      Big Size {product.sizes.join(' - ')}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-amber-500">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span className="font-bold text-charcoal-800">{product.rating}</span>
                      <span className="text-charcoal-400">({product.ratingCount})</span>
                    </div>
                  </div>

                  <h3 className="font-heading font-bold text-lg sm:text-xl text-charcoal-900 leading-snug">
                    {product.name}
                  </h3>

                  <div className="flex items-baseline gap-3 mt-2">
                    <span className="text-2xl font-extrabold text-brand-600 font-heading">
                      {product.price.toLocaleString('vi-VN')}đ
                    </span>
                    {product.originalPrice && product.originalPrice > product.price ? (
                      <span className="text-sm text-charcoal-400 line-through">
                        {product.originalPrice.toLocaleString('vi-VN')}đ
                      </span>
                    ) : null}
                    {(product.discountPercent || 0) > 0 ? (
                      <span className="bg-rose-50 text-rose-600 text-xs font-bold px-2 py-0.5 rounded-full border border-rose-200">
                        -{product.discountPercent}%
                      </span>
                    ) : null}
                  </div>
                </div>

                <p className="text-sm text-charcoal-700 leading-relaxed">
                  {product.shortDesc}
                </p>

                {/* Color Selector */}
                <div>
                  <div className="flex justify-between items-center text-xs font-semibold text-charcoal-800 mb-2">
                    <span>Màu sắc: <strong className="text-charcoal-900">{selectedColor.name}</strong></span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {product.colors.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => setSelectedColor(c)}
                        className={`w-7 h-7 rounded-full border-2 transition-all ${
                          selectedColor.name === c.name
                            ? 'ring-2 ring-brand-500 ring-offset-2 scale-110 border-white'
                            : 'border-stone-300 hover:scale-105'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Size Selector + Size Advisor Trigger */}
                <div>
                  <div className="flex justify-between items-center text-xs font-semibold text-charcoal-800 mb-2">
                    <span>Kích cỡ: <strong className="text-brand-600 font-bold">{selectedSize}</strong></span>
                    {onOpenSizeAdvisor && (
                      <button
                        onClick={() => onOpenSizeAdvisor(product)}
                        className="text-[11px] text-brand-600 hover:text-brand-700 font-bold flex items-center gap-1 hover:underline"
                      >
                        <Ruler className="w-3.5 h-3.5" />
                        <span>Tư vấn chọn size (AI Fit)</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    {product.sizes.map((sz) => {
                      const variant = product.variants.find(
                        (v) => v.size === sz && v.colorName === selectedColor.name
                      );
                      const inStock = variant ? variant.stock > 0 : true;

                      return (
                        <button
                          key={sz}
                          disabled={!inStock}
                          onClick={() => setSelectedSize(sz)}
                          className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                            !inStock
                              ? 'opacity-40 line-through bg-stone-100 text-stone-400 cursor-not-allowed border-stone-200'
                              : selectedSize === sz
                              ? 'bg-charcoal-900 text-white border-charcoal-900 shadow-sm'
                              : 'bg-white text-charcoal-800 border-surface-border hover:border-brand-500'
                          }`}
                        >
                          {sz}
                        </button>
                      );
                    })}
                  </div>

                  {isOutOfStock && (
                    <p className="text-xs text-red-600 font-semibold mt-2">
                      Biến thể Size {selectedSize} - {selectedColor.name} đã tạm hết hàng.
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3 pt-2">
                <div className="flex gap-3">
                  <button
                    disabled={isOutOfStock}
                    onClick={handleAddToCart}
                    className="flex-1 py-3.5 bg-brand-500 hover:bg-brand-600 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-float transition-all"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>{isOutOfStock ? 'Tạm hết hàng' : 'Thêm vào giỏ hàng'}</span>
                  </button>

                  <button
                    onClick={() => toggleWishlist(product.id, product.name)}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isFavorited
                        ? 'bg-rose-50 border-rose-200 text-rose-600'
                        : 'border-surface-border text-charcoal-700 hover:border-rose-300 hover:text-rose-500'
                    }`}
                    title="Lưu yêu thích"
                  >
                    <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
                  </button>
                </div>

                <button
                  onClick={() => {
                    onClose();
                    onNavigate(`/product/${product.id}`);
                  }}
                  className="w-full text-center text-xs font-bold text-charcoal-600 hover:text-brand-600 py-1 flex items-center justify-center gap-1 hover:underline"
                >
                  <span>Xem trang chi tiết đầy đủ</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
