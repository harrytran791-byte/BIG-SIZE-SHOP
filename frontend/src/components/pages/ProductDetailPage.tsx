import React, { useState, useEffect } from 'react';
import {
  Heart,
  ShoppingBag,
  Ruler,
  Star,
  ShieldCheck,
  RefreshCw,
  Truck,
  Check,
  ChevronRight,
  Sparkles,
  Bell,
  Eye,
  ArrowRight,
  ZoomIn,
  AlertCircle,
} from 'lucide-react';
import { Product, Size } from '../../types';
import { mockProducts } from '../../data/products';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { SizeAdvisorModal } from '../product-detail/SizeAdvisorModal';
import { ProductCard } from '../products/ProductCard';

interface ProductDetailPageProps {
  productId: string;
  onNavigate: (path: string) => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({ productId, onNavigate }) => {
  const product = mockProducts.find((p) => p.id === productId) || mockProducts[0];

  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { showToast } = useToast();
  const { currentUser, currentRole, openLoginPrompt } = useAuth();
  const isManagementRole = currentRole === 'manager' || currentRole === 'admin';

  const fallbackColor = { name: 'Tiêu chuẩn', hex: '#18181B' };
  const availableColors = product.colors && product.colors.length > 0 ? product.colors : [fallbackColor];
  const [selectedColor, setSelectedColor] = useState(availableColors[0]);
  const [selectedSize, setSelectedSize] = useState<Size>(product.sizes[0]);
  const [activeImage, setActiveImage] = useState(product.images[0]);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'desc' | 'care' | 'exchange' | 'reviews'>('desc');
  const [isSizeAdvisorOpen, setIsSizeAdvisorOpen] = useState(false);
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [notifyPhone, setNotifyPhone] = useState('');
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    if (product.images && product.images.length > 0) {
      setActiveImage(product.images[0]);
    }
    if (product.colors && product.colors.length > 0) {
      setSelectedColor(product.colors[0]);
    }
    if (product.sizes && product.sizes.length > 0) {
      setSelectedSize(product.sizes[0]);
    }
    setIsZoomed(false);
  }, [product.id, product.images]);

  const isFavorited = isInWishlist(product.id);

  // Check active variant stock
  const activeVariant = product.variants.find(
    (v) => v.size === selectedSize && v.colorName === selectedColor.name
  );
  const isOutOfStock = activeVariant ? activeVariant.stock <= 0 : false;
  const stockCount = activeVariant ? activeVariant.stock : 10;

  const handleAddToCart = () => {
    if (!currentUser) {
      openLoginPrompt('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng hoặc tiến hành mua hàng.');
      return;
    }
    if (isOutOfStock) return;
    addToCart(product, selectedSize, selectedColor.name, selectedColor.hex, quantity);
  };

  const handleNotifyMe = (e: React.FormEvent) => {
    e.preventDefault();
    if (notifyPhone.trim()) {
      setIsNotifyModalOpen(false);
      showToast('Đã đăng ký thông báo hàng!', `Chúng tôi sẽ SMS ngay khi có size ${selectedSize} - ${selectedColor.name}.`, 'success');
      setNotifyPhone('');
    }
  };

  const relatedProducts = mockProducts.filter((p) => p.id !== product.id).slice(0, 4);

  return (
    <div className="py-8 bg-surface-light min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-charcoal-400 mb-6 flex-wrap">
          <button onClick={() => onNavigate('/')} className="hover:text-charcoal-700">
            Trang chủ
          </button>
          <ChevronRight className="w-3.5 h-3.5" />
          <button onClick={() => onNavigate('/products')} className="hover:text-charcoal-700">
            Sản phẩm
          </button>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-charcoal-800 font-semibold truncate max-w-xs">{product.name}</span>
        </div>

        {/* Product Main Showcase Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Gallery (Left 7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="relative rounded-3xl overflow-hidden bg-stone-100 aspect-[3/4] border border-surface-border shadow-soft group">
              <img
                src={activeImage}
                alt={product.name}
                className={`w-full h-full object-cover transition-transform duration-500 ${
                  isZoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'
                }`}
                onClick={() => setIsZoomed(!isZoomed)}
              />

              {/* Zoom hint */}
              <button
                onClick={() => setIsZoomed(!isZoomed)}
                className="absolute bottom-4 right-4 bg-white/80 hover:bg-white text-charcoal-700 text-xs px-3 py-1.5 rounded-full backdrop-blur-md shadow-sm flex items-center gap-1.5 transition-all"
              >
                <ZoomIn className="w-3.5 h-3.5" />
                <span>{isZoomed ? 'Thu nhỏ ảnh' : 'Phóng to chất vải'}</span>
              </button>

              {/* Best seller / new badge */}
              <div className="absolute top-4 left-4 flex gap-2">
                {product.isBestSeller && (
                  <span className="bg-charcoal-900 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                    Best Seller
                  </span>
                )}
                <span className="bg-brand-500 text-white text-xs font-mono font-bold px-2.5 py-1 rounded-full shadow-sm">
                  XL – 5XL
                </span>
              </div>
            </div>

            {/* Thumbnail Row */}
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setActiveImage(img);
                    setIsZoomed(false);
                  }}
                  className={`w-20 h-24 rounded-2xl overflow-hidden border-2 transition-all shrink-0 ${
                    activeImage === img
                      ? 'border-brand-500 ring-2 ring-brand-500/20'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Product Purchase Form (Right 5 cols) */}
          <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-3xl border border-surface-border shadow-soft space-y-6">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold text-brand-600 uppercase tracking-wider bg-brand-50 px-2.5 py-0.5 rounded-full">
                  Dành riêng cho người đầy đặn
                </span>
                <div className="flex items-center gap-1 text-xs text-amber-500 font-bold">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="text-charcoal-900">{product.rating}</span>
                  <span className="text-charcoal-400 font-normal">({product.ratingCount} đánh giá)</span>
                </div>
              </div>

              <h1 className="font-heading font-black text-xl sm:text-2xl text-charcoal-900 leading-snug">
                {product.name}
              </h1>

              {/* Price */}
              <div className="flex items-baseline gap-3 mt-3">
                <span className="text-2xl sm:text-3xl font-black text-brand-600 font-heading">
                  {product.price.toLocaleString('vi-VN')}đ
                </span>
                {product.originalPrice && product.originalPrice > product.price ? (
                  <span className="text-sm text-charcoal-400 line-through">
                    {product.originalPrice.toLocaleString('vi-VN')}đ
                  </span>
                ) : null}
                {(product.discountPercent || 0) > 0 ? (
                  <span className="bg-rose-50 text-rose-600 text-xs font-bold px-2 py-0.5 rounded-full border border-rose-200">
                    Tiết kiệm {product.discountPercent}%
                  </span>
                ) : null}
              </div>
            </div>

            {/* Short highlight */}
            <p className="text-sm sm:text-base text-charcoal-700 leading-relaxed bg-surface-cream/60 p-4 rounded-2xl border border-surface-border">
              {product.shortDesc}
            </p>

            {/* Color Selection */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold text-charcoal-800 mb-2">
                <span>
                  Màu sắc: <strong className="text-charcoal-900">{selectedColor.name}</strong>
                </span>
              </div>
              <div className="flex items-center gap-3">
                {availableColors.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setSelectedColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      selectedColor?.name === c.name
                        ? 'ring-2 ring-brand-500 ring-offset-2 scale-110 border-white shadow-sm'
                        : 'border-stone-300 hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            {/* Size Selection + CORE SIZE ADVISOR TRIGGER */}
            <div>
              <div className="flex justify-between items-center text-xs mb-2">
                <span className="font-semibold text-charcoal-800">
                  Kích cỡ: <strong className="text-brand-600 font-bold text-sm">{selectedSize}</strong>
                </span>
                {/* AI Size Advisor Modal Trigger */}
                <button
                  onClick={() => setIsSizeAdvisorOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100/80 px-2.5 py-1 rounded-full border border-brand-200 transition-colors shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                  <span>Tìm size của tôi (AI Fit)</span>
                </button>
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
                      className={`py-3 rounded-2xl text-xs font-bold border transition-all ${
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

              {/* Stock status indicator */}
              <div className="mt-2 text-xs">
                {isOutOfStock ? (
                  <div className="flex items-center justify-between text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
                    <span className="font-semibold">Tạm hết hàng Size {selectedSize} màu này</span>
                    <button
                      onClick={() => setIsNotifyModalOpen(true)}
                      className="text-[11px] underline font-bold hover:text-red-700 flex items-center gap-1"
                    >
                      <Bell className="w-3 h-3" /> Báo khi có hàng
                    </button>
                  </div>
                ) : !isManagementRole ? (
                  stockCount <= 3 ? (
                    <p className="text-amber-700 font-semibold text-xs flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Chỉ còn vài sản phẩm (Nhanh tay đặt hàng)</span>
                    </p>
                  ) : (
                    <p className="text-emerald-700 font-medium text-xs flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Còn hàng (Sẵn sàng giao ngay)</span>
                    </p>
                  )
                ) : (
                  <p className="text-stone-700 font-medium text-xs flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Còn hàng • <strong className="text-brand-700 font-mono">Quản lý kho: Còn {stockCount} sản phẩm</strong></span>
                  </p>
                )}
              </div>
            </div>

            {/* Quantity Selector & CTAs */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-surface-border rounded-xl overflow-hidden bg-surface-cream">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-2 text-charcoal-700 hover:bg-stone-200 transition-colors"
                  >
                    -
                  </button>
                  <span className="px-3 py-2 text-xs font-bold text-charcoal-900 min-w-[28px] text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-3 py-2 text-charcoal-700 hover:bg-stone-200 transition-colors"
                  >
                    +
                  </button>
                </div>

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
                  title="Yêu thích"
                >
                  <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>

            {/* Trust highlights below CTA */}
            <div className="pt-4 border-t border-surface-border space-y-2 text-xs text-charcoal-600">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-brand-500 shrink-0" />
                <span>Hỗ trợ đổi size tận nhà trong 7 ngày miễn phí</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-brand-500 shrink-0" />
                <span>Miễn phí giao hàng toàn quốc cho đơn từ 500.000đ</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-brand-500 shrink-0" />
                <span>Đồng kiểm xem hàng và chất vải trước khi thanh toán</span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Tabs Section */}
        <div className="mt-16 bg-white rounded-3xl border border-surface-border shadow-soft p-6 sm:p-10">
          <div className="flex border-b border-surface-border gap-6 overflow-x-auto no-scrollbar mb-6 text-sm font-bold">
            {[
              { id: 'desc', label: 'Chất Liệu & Cắt May' },
              { id: 'care', label: 'Hướng Dẫn Giặt Ủi' },
              { id: 'exchange', label: 'Chính Sách Đổi Size 7 Ngày' },
              { id: 'reviews', label: `Đánh Giá (${product.ratingCount})` },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`pb-3 border-b-2 transition-all whitespace-nowrap ${
                  activeTab === t.id
                    ? 'border-brand-500 text-brand-600 font-extrabold'
                    : 'border-transparent text-charcoal-500 hover:text-charcoal-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Description */}
          {activeTab === 'desc' && (
            <div className="space-y-5 text-sm sm:text-base text-charcoal-700 leading-relaxed max-w-3xl">
              <p className="leading-relaxed">{product.description}</p>
              <div className="pt-2">
                <h4 className="font-bold text-charcoal-900 text-sm sm:text-base mb-2.5">Đặc tính kỹ thuật nổi bật:</h4>
                <ul className="list-disc pl-5 space-y-2 text-sm sm:text-base text-charcoal-700">
                  {product.features.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
              <p className="text-sm sm:text-base text-charcoal-700 pt-2 border-t border-stone-100">
                <strong className="text-charcoal-900 font-semibold">Thành phần chất liệu:</strong> {product.material}
              </p>
            </div>
          )}

          {/* Tab 2: Care instructions */}
          {activeTab === 'care' && (
            <div className="space-y-4 text-sm sm:text-base text-charcoal-700 leading-relaxed max-w-3xl">
              <p className="font-bold text-charcoal-900">
                Để giữ phom áo luôn đứng đẹp và chất vải bền lâu:
              </p>
              <ul className="list-disc pl-5 space-y-2.5">
                {product.careInstructions.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Tab 3: Exchange policy */}
          {activeTab === 'exchange' && (
            <div className="space-y-4 text-sm sm:text-base text-charcoal-700 leading-relaxed max-w-3xl">
              <p className="font-bold text-charcoal-900">Chính sách đổi size độc quyền tại CURVE & CONFIDENCE:</p>
              <p>
                1. <strong>Đổi size tận nơi:</strong> Shipper giao size mới đến tận cửa và lấy lại sản phẩm cũ cùng lúc. Bạn không cần phải ra bưu cục gửi hàng hay đóng gói rườm rà.
              </p>
              <p>
                2. <strong>Thời gian:</strong> Hỗ trợ trong 7 ngày kể từ khi bạn nhận hàng thành công.
              </p>
              <p>
                3. <strong>Điều kiện:</strong> Sản phẩm còn nguyên tem mác, chưa qua giặt tẩy và không có mùi lạ.
              </p>
            </div>
          )}

          {/* Tab 4: Reviews */}
          {activeTab === 'reviews' && (
            <div className="space-y-6 max-w-3xl">
              {/* Sample Review */}
              <div className="divide-y divide-surface-border">
                <div className="py-4 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-charcoal-900">Vũ Minh Tuấn (104kg, 1m76)</span>
                    <span className="text-[11px] text-charcoal-400">03/10/2026</span>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500 text-xs">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                    <span className="text-emerald-700 font-bold ml-2 text-[11px]">Đã mua size 3XL</span>
                  </div>
                  <p className="text-xs text-charcoal-700">
                    "Mình mặc size 3XL vừa như in, nách áo rất thoải mái không bị bó kẹp. Vải dệt tổ ong mát rượi, ngồi lái xe hay ăn no không bị căng ngấn bụng. Rất ưng ý!"
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Related Products */}
        <div className="mt-20">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-heading font-extrabold text-xl sm:text-2xl text-charcoal-900">
              Có Thể Bạn Cũng Thích
            </h3>
            <button
              onClick={() => onNavigate('/products')}
              className="text-xs font-bold text-brand-600 hover:underline flex items-center gap-1"
            >
              <span>Xem thêm</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {relatedProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onNavigate={onNavigate}
                onQuickView={() => onNavigate(`/product/${p.id}`)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-surface-border p-3 px-4 flex items-center justify-between shadow-modal">
        <div>
          <span className="text-[10px] text-charcoal-400 block">Giá sản phẩm</span>
          <span className="font-heading font-black text-base text-brand-600">
            {product.price.toLocaleString('vi-VN')}đ
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsSizeAdvisorOpen(true)}
            className="p-2.5 bg-surface-cream text-brand-700 rounded-xl border border-surface-border"
            title="Tư vấn size"
          >
            <Ruler className="w-4 h-4" />
          </button>
          <button
            disabled={isOutOfStock}
            onClick={handleAddToCart}
            className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:bg-stone-300 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Thêm giỏ hàng ({selectedSize})</span>
          </button>
        </div>
      </div>

      {/* Size Advisor Modal */}
      <SizeAdvisorModal
        product={product}
        isOpen={isSizeAdvisorOpen}
        onClose={() => setIsSizeAdvisorOpen(false)}
        onSelectRecommendedSize={(sz) => setSelectedSize(sz)}
      />

      {/* Out of Stock Notify Modal */}
      {isNotifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-charcoal-900/60 backdrop-blur-sm"
            onClick={() => setIsNotifyModalOpen(false)}
          />
          <div className="relative bg-white rounded-3xl p-6 max-w-sm w-full shadow-modal border border-surface-border z-10 animate-scaleIn">
            <h4 className="font-heading font-bold text-base text-charcoal-900">
              Nhận Thông Báo Khi Có Hàng
            </h4>
            <p className="text-xs text-charcoal-500 mt-1">
              Size {selectedSize} - {selectedColor.name} sẽ sớm được bổ sung vào kho.
            </p>
            <form onSubmit={handleNotifyMe} className="mt-4 space-y-3">
              <input
                type="tel"
                placeholder="Nhập số điện thoại của bạn..."
                required
                value={notifyPhone}
                onChange={(e) => setNotifyPhone(e.target.value)}
                className="w-full p-2.5 bg-surface-cream border border-surface-border rounded-xl text-xs focus:outline-none focus:border-brand-500"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsNotifyModalOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold text-charcoal-600 border border-surface-border rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold text-white bg-brand-500 rounded-xl"
                >
                  Đăng ký
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
