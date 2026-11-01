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
import { Product, Size } from '@/types';
import { useProducts } from '../context/ProductContext';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { SizeAdvisorModal } from '../components/SizeAdvisorModal';
import { ProductCard } from '../components/ProductCard';

interface ProductDetailPageProps {
  productId: string;
  onNavigate: (path: string) => void;
}

interface ReviewItem {
  id: string;
  name: string;
  height?: string;
  weight?: string;
  size: string;
  rating: number;
  date: string;
  comment: string;
}

const DEFAULT_SAMPLE_REVIEWS: ReviewItem[] = [
  {
    id: 'rev-1',
    name: 'Vũ Minh Tuấn',
    height: '176',
    weight: '104',
    size: '3XL',
    rating: 5,
    date: '03/10/2026',
    comment: 'Mình mặc size 3XL vừa như in, nách áo rất thoải mái không bị bó kẹp. Vải dệt tổ ong mát rượi, ngồi lái xe hay ăn no không bị căng ngấn bụng. Rất ưng ý!'
  },
  {
    id: 'rev-2',
    name: 'Hoàng Long',
    height: '172',
    weight: '92',
    size: '2XL',
    rating: 5,
    date: '12/10/2026',
    comment: 'Phom dáng cắt may chuẩn cho người có bụng, vai áo đứng phom rất thanh lịch. Mua lần đầu nhưng cực kỳ hài lòng!'
  }
];

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({ productId, onNavigate }) => {
  const { getProductById, products } = useProducts();
  const product = getProductById(productId);

  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { showToast } = useToast();
  const { currentRole, currentUser, openLoginPrompt } = useAuth();

  const [selectedColor, setSelectedColor] = useState(product?.colors?.[0] || { name: 'Tiêu chuẩn', hex: '#18181B' });
  const [selectedSize, setSelectedSize] = useState<Size>(product?.sizes?.[0] || 'XL');
  const [activeImage, setActiveImage] = useState(product?.images?.[0] || '');
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'desc' | 'care' | 'exchange' | 'reviews'>('desc');
  const [isSizeAdvisorOpen, setIsSizeAdvisorOpen] = useState(false);
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [notifyPhone, setNotifyPhone] = useState('');
  const [isZoomed, setIsZoomed] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState<ReviewItem[]>(() => {
    try {
      const stored = localStorage.getItem(`curve_reviews_${productId}`);
      if (stored) return JSON.parse(stored);
    } catch {}
    return DEFAULT_SAMPLE_REVIEWS;
  });
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewName, setReviewName] = useState<string>('');
  const [reviewHeight, setReviewHeight] = useState<string>('');
  const [reviewWeight, setReviewWeight] = useState<string>('');
  const [reviewSize, setReviewSize] = useState<Size>(selectedSize || '3XL');
  const [reviewComment, setReviewComment] = useState<string>('');
  const [showReviewForm, setShowReviewForm] = useState<boolean>(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`curve_reviews_${productId}`);
      if (stored) {
        setReviews(JSON.parse(stored));
      } else {
        setReviews(DEFAULT_SAMPLE_REVIEWS);
      }
    } catch {
      setReviews(DEFAULT_SAMPLE_REVIEWS);
    }
  }, [productId]);

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    const author = reviewName.trim() || currentUser?.name || 'Khách hàng';
    if (!reviewComment.trim()) {
      showToast('Thiếu nội dung', 'Vui lòng nhập nội dung đánh giá của bạn.', 'error');
      return;
    }
    const newRev: ReviewItem = {
      id: `rev-${Date.now()}`,
      name: author,
      height: reviewHeight.trim() || undefined,
      weight: reviewWeight.trim() || undefined,
      size: reviewSize,
      rating: reviewRating,
      date: new Date().toLocaleDateString('vi-VN'),
      comment: reviewComment.trim()
    };
    const updated = [newRev, ...reviews];
    setReviews(updated);
    try {
      localStorage.setItem(`curve_reviews_${productId}`, JSON.stringify(updated));
    } catch {}
    setReviewComment('');
    setReviewHeight('');
    setReviewWeight('');
    setShowReviewForm(false);
    showToast('Đánh giá thành công!', 'Cảm ơn bạn đã chia sẻ trải nghiệm với Curve & Confidence.', 'success');
  };

  useEffect(() => {
    if (product?.images && product.images.length > 0) {
      setActiveImage(product.images[0]);
    }
    if (product?.colors && product.colors.length > 0) {
      const firstColor = product.colors[0];
      setSelectedColor(firstColor);
      const colorVariants = product.variants?.filter(
        (v) => v.colorName.toLowerCase() === firstColor.name.toLowerCase()
      ) || [];
      const firstInStock = colorVariants.find((v) => v.stock > 0);
      if (firstInStock) {
        setSelectedSize(firstInStock.size);
      } else if (colorVariants.length > 0) {
        setSelectedSize(colorVariants[0].size);
      } else if (product.sizes && product.sizes.length > 0) {
        setSelectedSize(product.sizes[0]);
      }
    }
    setIsZoomed(false);
  }, [product?.id]);

  if (!product) {
    return (
      <div className="py-20 bg-surface-light min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <AlertCircle className="w-12 h-12 text-stone-400 mb-3" />
        <h2 className="text-lg font-bold text-charcoal-900 mb-1">Không tìm thấy sản phẩm</h2>
        <p className="text-xs text-charcoal-500 mb-6 max-w-sm">
          Sản phẩm bạn đang tìm kiếm không tồn tại hoặc đã tạm dừng phân phối.
        </p>
        <button
          onClick={() => onNavigate('/products')}
          className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
        >
          Xem tất cả sản phẩm
        </button>
      </div>
    );
  }

  const isFavorited = isInWishlist(product.id);

  // Check active variant: phân định rõ 3 trạng thái:
  // 1. Không tồn tại (!variantExists): màu này không sản xuất size đang chọn
  // 2. Tạm hết hàng (variantExists && stock <= 0): có sản xuất nhưng hết hàng
  // 3. Còn hàng (variantExists && stock > 0): sẵn sàng bán
  const activeVariant = product.variants?.find(
    (v) => v.size === selectedSize && v.colorName.toLowerCase() === selectedColor?.name?.toLowerCase()
  );
  const variantExists = Boolean(activeVariant);
  const isOutOfStock = variantExists && (activeVariant?.stock ?? 0) <= 0;
  const isUnavailable = !variantExists;
  const stockCount = activeVariant ? activeVariant.stock : 0;

  const isManagementRole = currentRole === 'manager' || currentRole === 'admin';

  const handleColorChange = (newColor: { name: string; hex: string }) => {
    setSelectedColor(newColor);

    // Tìm các biến thể thuộc màu mới
    const variantsInNewColor = product.variants?.filter(
      (v) => v.colorName.toLowerCase() === newColor.name.toLowerCase()
    ) || [];

    // Kiểm tra xem size hiện tại có tồn tại ở màu mới không
    const sizeStillExists = variantsInNewColor.some((v) => v.size === selectedSize);

    if (!sizeStillExists) {
      // Nếu không tồn tại: chuyển sang size còn hàng đầu tiên
      const firstInStock = variantsInNewColor.find((v) => v.stock > 0);
      if (firstInStock) {
        setSelectedSize(firstInStock.size);
      } else if (variantsInNewColor.length > 0) {
        // Nếu không có size nào còn hàng, lấy size hợp lệ đầu tiên của màu đó
        setSelectedSize(variantsInNewColor[0].size);
      }
    }

    setQuantity(1);
  };

  const handleAddToCart = () => {
    if (isManagementRole) {
      showToast(
        'Chế độ xem trước của Quản lý',
        'Tài khoản Quản lý / Quản trị viên không được phép đặt mua hàng để bảo đảm tính minh bạch.',
        'error'
      );
      return;
    }
    if (isUnavailable || !activeVariant) {
      showToast('Kích cỡ không khả dụng', `Màu ${selectedColor?.name} hiện không có Size ${selectedSize}. Vui lòng chọn kích cỡ khác.`, 'error');
      return;
    }
    if (isOutOfStock) {
      showToast('Biến thể đã tạm hết hàng', `Size ${selectedSize} - Màu ${selectedColor?.name} hiện không còn trong kho.`, 'error');
      return;
    }
    if (quantity > activeVariant.stock) {
      showToast('Vượt quá tồn kho khả dụng', `Kho chỉ còn ${activeVariant.stock} sản phẩm khả dụng cho biến thể này.`, 'error');
      return;
    }
    addToCart(product, selectedSize, selectedColor.name, selectedColor.hex, quantity);
  };

  const handleNotifyMe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!variantExists) {
      showToast('Không khả dụng', `Màu ${selectedColor.name} hiện không có phân loại Size ${selectedSize}.`, 'error');
      setIsNotifyModalOpen(false);
      return;
    }
    if (notifyPhone.trim()) {
      setIsNotifyModalOpen(false);
      showToast('Đã tiếp nhận yêu cầu', `Chuyên viên sẽ liên hệ số ${notifyPhone.trim()} khi có hàng Size ${selectedSize} - ${selectedColor.name}.`, 'success');
      setNotifyPhone('');
    }
  };

  const relatedProducts = products.filter((p) => p.id !== product.id).slice(0, 4);

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
                  <span className="text-charcoal-400 font-normal">({reviews.length} đánh giá)</span>
                </div>
              </div>

              <h1 className="font-heading font-black text-xl sm:text-2xl text-charcoal-900 leading-snug">
                {product.name}
              </h1>

              {/* Price */}
              <div className="flex items-baseline gap-3 mt-3">
                <span className="text-2xl sm:text-3xl font-black text-brand-600 font-heading">
                  {product.price.toLocaleString('vi-VN')}₫
                </span>
                {product.originalPrice && product.originalPrice > product.price ? (
                  <span className="text-sm text-charcoal-400 line-through">
                    {product.originalPrice.toLocaleString('vi-VN')}₫
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
                {product.colors.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => handleColorChange(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-all cursor-pointer ${
                      selectedColor.name.toLowerCase() === c.name.toLowerCase()
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
                  type="button"
                  onClick={() => setIsSizeAdvisorOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100/80 px-2.5 py-1 rounded-full border border-brand-200 transition-colors shadow-xs cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                  <span>Tìm size của tôi (AI Fit)</span>
                </button>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {product.sizes.map((sz) => {
                  const variant = product.variants?.find(
                    (v) => v.size === sz && v.colorName.toLowerCase() === selectedColor.name.toLowerCase()
                  );
                  const exists = Boolean(variant);
                  const inStock = exists && (variant?.stock ?? 0) > 0;
                  const outOfStock = exists && (variant?.stock ?? 0) <= 0;
                  const isSelected = selectedSize === sz;

                  return (
                    <button
                      key={sz}
                      type="button"
                      disabled={!exists}
                      onClick={() => {
                        if (exists) {
                          setSelectedSize(sz);
                          setQuantity(1);
                        }
                      }}
                      title={
                        !exists
                          ? `Màu ${selectedColor.name} không có size ${sz}`
                          : outOfStock
                          ? `Size ${sz} màu ${selectedColor.name} đã tạm hết hàng`
                          : `Size ${sz} (Còn ${variant?.stock} sản phẩm khả dụng)`
                      }
                      className={`relative py-2.5 px-1 rounded-2xl text-xs font-bold border transition-all flex flex-col items-center justify-center min-h-[50px] ${
                        !exists
                          ? 'opacity-30 bg-stone-100 text-stone-300 border-dashed border-stone-200 cursor-not-allowed select-none'
                          : isSelected
                          ? outOfStock
                            ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-xs ring-1 ring-rose-400'
                            : 'bg-charcoal-900 text-white border-charcoal-900 shadow-sm'
                          : outOfStock
                          ? 'bg-stone-50 text-stone-400 border-stone-200 hover:border-stone-300 cursor-pointer'
                          : 'bg-white text-charcoal-800 border-surface-border hover:border-brand-500 cursor-pointer'
                      }`}
                    >
                      <span className={outOfStock ? 'line-through' : ''}>{sz}</span>
                      {!exists ? (
                        <span className="text-[8.5px] font-normal text-stone-400 leading-none mt-1">Không có</span>
                      ) : outOfStock ? (
                        <span className="text-[8.5px] font-semibold text-rose-500 leading-none mt-1">Hết hàng</span>
                      ) : (
                        <span className="text-[8.5px] font-normal opacity-60 leading-none mt-1">Còn hàng</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Stock status indicator */}
              <div className="mt-2.5 text-xs">
                {isUnavailable ? (
                  <div className="flex items-center justify-between text-stone-600 bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                    <span className="font-semibold flex items-center gap-1.5 text-stone-700">
                      <AlertCircle className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span>Màu {selectedColor.name} không có kích cỡ {selectedSize}</span>
                    </span>
                    <span className="text-[11px] text-stone-400 italic">Vui lòng chọn size khác</span>
                  </div>
                ) : isOutOfStock ? (
                  <div className="flex items-center justify-between text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                    <span className="font-semibold flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>Tạm hết hàng Size {selectedSize} màu {selectedColor.name}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsNotifyModalOpen(true)}
                      className="text-[11px] underline font-bold hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Bell className="w-3 h-3" /> Báo khi có hàng
                    </button>
                  </div>
                ) : !isManagementRole ? (
                  stockCount <= 3 ? (
                    <p className="text-amber-700 font-semibold text-xs flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Chỉ còn {stockCount} sản phẩm khả dụng (Nhanh tay đặt hàng)</span>
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
                    <span>Còn hàng • <strong className="text-brand-700 font-mono">Quản lý kho: Còn {stockCount} khả dụng (SKU: {activeVariant?.sku})</strong></span>
                  </p>
                )}
              </div>
            </div>

            {/* Quantity Selector & CTAs */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                <div className={`flex items-center border border-surface-border rounded-xl overflow-hidden ${isUnavailable || isOutOfStock ? 'opacity-50 pointer-events-none bg-stone-100' : 'bg-surface-cream'}`}>
                  <button
                    type="button"
                    disabled={isUnavailable || isOutOfStock || quantity <= 1}
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-2 text-charcoal-700 hover:bg-stone-200 transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="px-3 py-2 text-xs font-bold text-charcoal-900 min-w-[28px] text-center">
                    {isUnavailable || isOutOfStock ? 0 : quantity}
                  </span>
                  <button
                    type="button"
                    disabled={isUnavailable || isOutOfStock || quantity >= stockCount}
                    onClick={() => setQuantity(Math.min(stockCount, quantity + 1))}
                    className="px-3 py-2 text-charcoal-700 hover:bg-stone-200 transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    +
                  </button>
                </div>

                {isUnavailable ? (
                  <button
                    type="button"
                    disabled
                    className="flex-1 py-3.5 bg-stone-100 border border-stone-200 text-stone-400 font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 cursor-not-allowed select-none"
                  >
                    <span>Không có kích cỡ này</span>
                  </button>
                ) : isOutOfStock ? (
                  <button
                    type="button"
                    disabled
                    className="flex-1 py-3.5 bg-stone-200 text-stone-500 font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 cursor-not-allowed select-none"
                  >
                    <span>Tạm hết hàng</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isManagementRole}
                    onClick={handleAddToCart}
                    className="flex-1 py-3.5 bg-brand-500 hover:bg-brand-600 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-float transition-all cursor-pointer"
                    title={isManagementRole ? 'Tài khoản Quản lý / Quản trị viên bị khóa quyền mua hàng' : undefined}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Thêm vào giỏ hàng</span>
                  </button>
                )}

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
              { id: 'reviews', label: `Đánh Giá (${reviews.length})` },
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

          {/* Tab 4: Customer Reviews (Interactive & Persisted) */}
          {activeTab === 'reviews' && (
            <div className="space-y-6 max-w-3xl">
              {/* Review Header Summary */}
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="text-center sm:text-left pr-4 border-r border-stone-200">
                    <span className="text-3xl font-black text-charcoal-900 block font-heading">
                      {(reviews.reduce((acc, r) => acc + r.rating, 0) / (reviews.length || 1)).toFixed(1)}
                    </span>
                    <div className="flex items-center justify-center sm:justify-start gap-0.5 text-amber-500 my-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-current" />
                      ))}
                    </div>
                    <span className="text-[11px] text-stone-500 block">{reviews.length} đánh giá thực tế</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-charcoal-900">Chia sẻ trải nghiệm may đo</h4>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Đánh giá về độ vừa vặn vòng bụng, bắp tay và chất liệu vải khi vận động.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowReviewForm(!showReviewForm)}
                  className="px-4 py-2.5 bg-[#5C1D24] hover:bg-[#48161C] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer self-start sm:self-auto shrink-0"
                >
                  {showReviewForm ? 'Đóng Biểu Mẫu' : '+ Viết Đánh Giá'}
                </button>
              </div>

              {/* Review Submission Form */}
              {showReviewForm && (
                <form onSubmit={handleAddReview} className="bg-white border-2 border-[#5C1D24]/20 rounded-2xl p-4 sm:p-6 space-y-4 shadow-sm animate-fadeIn">
                  <h4 className="font-bold text-sm text-charcoal-900 flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500 fill-current" />
                    <span>Gửi Đánh Giá Của Bạn</span>
                  </h4>

                  {/* Star Rating Picker */}
                  <div>
                    <label className="block text-xs font-bold text-charcoal-700 mb-1.5">
                      Độ hài lòng của bạn <span className="text-rose-500">*</span>:
                    </label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setReviewRating(s)}
                          className="p-1 hover:scale-110 transition-transform cursor-pointer"
                        >
                          <Star
                            className={`w-6 h-6 transition-colors ${
                              s <= reviewRating
                                ? 'text-amber-500 fill-current'
                                : 'text-stone-300'
                            }`}
                          />
                        </button>
                      ))}
                      <span className="text-xs font-bold text-charcoal-700 ml-2">
                        {reviewRating === 5
                          ? 'Tuyệt vời (5/5)'
                          : reviewRating === 4
                          ? 'Rất tốt (4/5)'
                          : reviewRating === 3
                          ? 'Bình thường (3/5)'
                          : 'Chưa hài lòng'}
                      </span>
                    </div>
                  </div>

                  {/* Customer Info (Name, Height, Weight, Size) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                        Họ và tên của bạn:
                      </label>
                      <input
                        type="text"
                        placeholder={currentUser?.name || 'Ví dụ: Nguyễn Văn A'}
                        value={reviewName}
                        onChange={(e) => setReviewName(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-[#5C1D24]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                        Kích cỡ bạn đã mua:
                      </label>
                      <select
                        value={reviewSize}
                        onChange={(e) => setReviewSize(e.target.value as Size)}
                        className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-[#5C1D24] cursor-pointer"
                      >
                        {(product.sizes || ['XL', '2XL', '3XL', '4XL', '5XL']).map((sz) => (
                          <option key={sz} value={sz}>
                            Size {sz}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                        Cân nặng (kg) (để gợi ý cho người khác):
                      </label>
                      <input
                        type="text"
                        placeholder="Ví dụ: 95kg"
                        value={reviewWeight}
                        onChange={(e) => setReviewWeight(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-[#5C1D24]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                        Chiều cao (cm):
                      </label>
                      <input
                        type="text"
                        placeholder="Ví dụ: 1m75"
                        value={reviewHeight}
                        onChange={(e) => setReviewHeight(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-[#5C1D24]"
                      />
                    </div>
                  </div>

                  {/* Comment */}
                  <div>
                    <label className="block text-xs font-bold text-charcoal-700 mb-1">
                      Cảm nhận thực tế khi mặc <span className="text-rose-500">*</span>:
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Chia sẻ về độ co giãn, phom áo giấu bụng, độ dài tà áo, độ thoải mái khi ngồi làm việc..."
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      className="w-full p-3 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-[#5C1D24] leading-relaxed"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                    <button
                      type="button"
                      onClick={() => setShowReviewForm(false)}
                      className="px-4 py-2 border border-stone-200 text-stone-600 rounded-xl text-xs font-semibold hover:bg-stone-50 transition-colors cursor-pointer"
                    >
                      Hủy Bỏ
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-[#5C1D24] hover:bg-[#48161C] text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    >
                      Gửi Đánh Giá
                    </button>
                  </div>
                </form>
              )}

              {/* Reviews List */}
              <div className="divide-y divide-surface-border">
                {reviews.map((rev) => {
                  const spec = [rev.weight ? `${rev.weight}kg` : '', rev.height ? `${rev.height}cm` : ''].filter(Boolean).join(', ');
                  return (
                    <div key={rev.id} className="py-4 space-y-1.5 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-charcoal-900">
                          {rev.name} {spec ? `(${spec})` : ''}
                        </span>
                        <span className="text-[11px] text-charcoal-400">{rev.date}</span>
                      </div>
                      <div className="flex items-center gap-1 text-amber-500 text-xs">
                        {[...Array(rev.rating)].map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-current" />
                        ))}
                        {rev.size && (
                          <span className="text-emerald-700 font-bold ml-2 text-[11px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Đã mua size {rev.size}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-charcoal-700 leading-relaxed">
                        "{rev.comment}"
                      </p>
                    </div>
                  );
                })}
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
            {product.price.toLocaleString('vi-VN')}₫
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
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-md"
            onClick={() => setIsNotifyModalOpen(false)}
          />
          <div className="relative bg-white rounded-3xl p-6 max-w-sm w-full shadow-modal border border-surface-border z-10 animate-scaleIn my-auto">
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
