import React, { useState, useEffect } from 'react';
import { Heart, Eye, ShoppingBag, Star, Check } from 'lucide-react';
import { Product, Size } from '@/types';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

interface ProductCardProps {
  product: Product;
  onNavigate: (path: string) => void;
  onQuickView: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onNavigate,
  onQuickView,
}) => {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { addToCart } = useCart();
  const { currentRole, currentUser, openLoginPrompt } = useAuth();
  const { showToast } = useToast();

  const fallbackColor = { name: 'Tiêu chuẩn', hex: '#18181B' };
  const availableColors = product.colors && product.colors.length > 0 ? product.colors : [fallbackColor];
  const [selectedColor, setSelectedColor] = useState(availableColors[0]);
  const [selectedSize, setSelectedSize] = useState<Size>(product.sizes?.[0] || 'XL');
  const [showSizePicker, setShowSizePicker] = useState(false);

  useEffect(() => {
    if (product.colors && product.colors.length > 0) {
      setSelectedColor(product.colors[0]);
    }
  }, [product.colors]);

  const isFavorited = isInWishlist(product.id);

  // Check if a size has stock in the selected color
  const checkStockForSize = (size: Size) => {
    const variant = product.variants?.find(
      (v) => v.size === size && v.colorName.toLowerCase() === (selectedColor?.name || '').toLowerCase()
    );
    return variant ? variant.stock > 0 : false;
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentRole === 'manager' || currentRole === 'admin') {
      showToast(
        'Chế độ xem trước của Quản lý',
        'Tài khoản Quản lý / Quản trị viên không được phép đặt mua hàng để bảo đảm tính minh bạch.',
        'error'
      );
      return;
    }
    // If not showing picker, show it for quick size confirmation
    if (!showSizePicker) {
      setShowSizePicker(true);
      return;
    }

    addToCart(product, selectedSize, selectedColor.name, selectedColor.hex, 1);
    setShowSizePicker(false);
  };

  return (
    <div
      onClick={() => onNavigate(`/product/${product.id}`)}
      className="group relative bg-white rounded-2xl border border-surface-border overflow-hidden shadow-soft hover:shadow-float hover:-translate-y-1 transition-all duration-300 flex flex-col cursor-pointer"
    >
      {/* Product Image Area */}
      <div className="relative aspect-[3/4] w-full bg-stone-100 overflow-hidden">
        <img
          src={product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover object-center group-hover:scale-106 transition-transform duration-500"
          loading="lazy"
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {product.isBestSeller && (
            <span className="bg-charcoal-900 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm">
              Best Seller
            </span>
          )}
          {product.isNew && (
            <span className="bg-brand-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm">
              Mới Về
            </span>
          )}
          {(product.discountPercent || 0) > 0 ? (
            <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              -{product.discountPercent}%
            </span>
          ) : null}
        </div>

        {/* Action icons (Wishlist & Quick View) */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleWishlist(product.id, product.name);
            }}
            className={`p-2 rounded-full backdrop-blur-md shadow-sm transition-all ${
              isFavorited
                ? 'bg-rose-500 text-white'
                : 'bg-white/80 hover:bg-white text-charcoal-700 hover:text-rose-500'
            }`}
            aria-label="Thêm vào danh sách yêu thích"
          >
            <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuickView(product);
            }}
            className="p-2 rounded-full bg-white/80 hover:bg-white text-charcoal-700 hover:text-brand-600 backdrop-blur-md shadow-sm transition-all opacity-0 group-hover:opacity-100 hidden sm:flex items-center justify-center"
            title="Xem nhanh"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Add Overlay Drawer */}
        {showSizePicker && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 bg-white/95 backdrop-blur-md p-3 border-t border-surface-border animate-slideDown z-20"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-charcoal-800">
                Chọn size để thêm nhanh:
              </span>
              <button
                onClick={() => setShowSizePicker(false)}
                className="text-[11px] text-charcoal-400 hover:text-charcoal-700"
              >
                Đóng
              </button>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {product.sizes.map((sz) => {
                const variant = product.variants?.find(
                  (v) => v.size === sz && v.colorName.toLowerCase() === selectedColor.name.toLowerCase()
                );
                const exists = Boolean(variant);
                const inStock = exists && (variant?.stock ?? 0) > 0;
                return (
                  <button
                    key={sz}
                    disabled={!inStock}
                    title={
                      !exists
                        ? `Màu ${selectedColor.name} không có size ${sz}`
                        : !inStock
                        ? `Size ${sz} màu ${selectedColor.name} đã hết hàng`
                        : `Size ${sz} (Còn ${variant?.stock} sản phẩm)`
                    }
                    onClick={() => {
                      if (currentRole === 'manager' || currentRole === 'admin') {
                        showToast(
                          'Chế độ xem trước của Quản lý',
                          'Tài khoản Quản lý / Quản trị viên không được phép đặt mua hàng.',
                          'error'
                        );
                        setShowSizePicker(false);
                        return;
                      }
                      setSelectedSize(sz);
                      addToCart(product, sz, selectedColor.name, selectedColor.hex, 1);
                      setShowSizePicker(false);
                    }}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                      !inStock
                        ? 'opacity-40 line-through bg-stone-100 text-stone-400 cursor-not-allowed border-stone-200'
                        : selectedSize === sz
                        ? 'bg-brand-500 text-white border-brand-500'
                        : 'bg-white text-charcoal-800 border-surface-border hover:border-brand-500'
                    }`}
                  >
                    {sz}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Product Content Details */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Color swatches */}
          <div className="flex items-center gap-1.5 mb-2">
            {availableColors.map((c) => (
              <button
                key={c.name}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedColor(c);
                }}
                className={`w-4 h-4 rounded-full border transition-all ${
                  selectedColor?.name === c.name
                    ? 'ring-2 ring-brand-500 ring-offset-1 scale-110'
                    : 'border-stone-300 hover:scale-105'
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.name}
              />
            ))}
            <span className="text-[11px] text-charcoal-400 ml-1">
              {availableColors.length} màu
            </span>
          </div>

          {/* Product Name */}
          <h3 className="font-heading font-semibold text-sm text-charcoal-900 line-clamp-2 hover:text-brand-600 transition-colors leading-snug">
            {product.name}
          </h3>

          {/* Size availability chips */}
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            {product.sizes.map((sz) => (
              <span
                key={sz}
                className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-surface-cream text-charcoal-600 border border-surface-border"
              >
                {sz}
              </span>
            ))}
          </div>
        </div>

        {/* Price and CTA */}
        <div className="pt-2 border-t border-surface-border flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-sm sm:text-base text-brand-600">
                {product.price.toLocaleString('vi-VN')}₫
              </span>
              {product.originalPrice && product.originalPrice > product.price ? (
                <span className="text-xs text-charcoal-400 line-through">
                  {product.originalPrice.toLocaleString('vi-VN')}₫
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-amber-500 mt-0.5">
              <Star className="w-3 h-3 fill-current" />
              <span className="font-bold text-charcoal-700">{product.rating}</span>
              <span className="text-charcoal-400">({product.ratingCount})</span>
            </div>
          </div>

          {/* Quick add button */}
          <button
            onClick={handleQuickAdd}
            className="p-2.5 bg-surface-cream hover:bg-brand-500 text-charcoal-900 hover:text-white rounded-xl transition-all shadow-sm group/btn"
            title="Thêm nhanh vào giỏ"
            aria-label="Thêm vào giỏ"
          >
            <ShoppingBag className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};
