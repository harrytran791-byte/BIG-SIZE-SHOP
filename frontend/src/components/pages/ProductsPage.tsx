import { matchesCatalogCategory } from '@/shared/utils/categoryUtils';
import React, { useState, useMemo, useEffect } from 'react';
import { Filter, SlidersHorizontal, ArrowUpDown, X, Check, RotateCcw, Search, Sparkles } from 'lucide-react';
import { useProducts } from '@/modules/product/context/ProductContext';
import { ProductCard } from '../products/ProductCard';
import { QuickViewModal } from '../products/QuickViewModal';
import { Category, Gender, Product, Size } from '../../types';
import { useWishlist } from '../../context/WishlistContext';

interface ProductsPageProps {
  onNavigate: (path: string) => void;
  searchParams: URLSearchParams;
  onOpenSizeAdvisor?: (product: Product) => void;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({
  onNavigate,
  searchParams,
  onOpenSizeAdvisor,
}) => {
  const { wishlist } = useWishlist();
  const { products, categories: categoriesList, categoryRecords } = useProducts();

  // Query params
  const categoryParam = searchParams.get('category') as Category | null;
  const genderParam = searchParams.get('gender') as Gender | null;
  const sizeParam = searchParams.get('size') as Size | null;
  const filterParam = searchParams.get('filter'); // 'new' | 'bestseller' | 'wishlist'
  const queryParam = searchParams.get('q') || '';

  // Local filter states
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryParam || 'all');
  const [selectedGender, setSelectedGender] = useState<string>(genderParam || 'all');
  const [selectedSizes, setSelectedSizes] = useState<Size[]>(sizeParam ? [sizeParam] : []);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState<number>(700000);
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('featured');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  // Sync state if URL query params change
  useEffect(() => {
    if (categoryParam) setSelectedCategory(categoryParam);
    if (genderParam) setSelectedGender(genderParam);
    if (sizeParam && !selectedSizes.includes(sizeParam)) setSelectedSizes([sizeParam]);
  }, [categoryParam, genderParam, sizeParam]);

  const sizesList: Size[] = ['XL', '2XL', '3XL', '4XL', '5XL'];

  // All unique colors in database
  const allColors = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach((p) => {
      p.colors.forEach((c) => {
        if (!map.has(c.name)) map.set(c.name, c.hex);
      });
    });
    return Array.from(map.entries()).map(([name, hex]) => ({ name, hex }));
  }, []);

  const toggleSize = (sz: Size) => {
    setSelectedSizes((prev) =>
      prev.includes(sz) ? prev.filter((s) => s !== sz) : [...prev, sz]
    );
  };

  const toggleColor = (colorName: string) => {
    setSelectedColors((prev) =>
      prev.includes(colorName) ? prev.filter((c) => c !== colorName) : [...prev, colorName]
    );
  };

  const resetFilters = () => {
    setSelectedCategory('all');
    setSelectedGender('all');
    setSelectedSizes([]);
    setSelectedColors([]);
    setMaxPrice(700000);
    setInStockOnly(false);
    onNavigate('/products');
  };

  // Filter products logic
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // Search query
      if (queryParam) {
        const q = queryParam.toLowerCase();
        const matchesName = product.name.toLowerCase().includes(q);
        const matchesTag = product.tags.some((t) => t.toLowerCase().includes(q));
        const matchesDesc = product.shortDesc.toLowerCase().includes(q);
        if (!matchesName && !matchesTag && !matchesDesc) return false;
      }

      // Filter param (wishlist, bestseller, new)
      if (filterParam === 'wishlist' && !wishlist.includes(product.id)) return false;
      if (filterParam === 'bestseller' && !product.isBestSeller) return false;
      if (filterParam === 'new' && !product.isNew) return false;

      if (!matchesCatalogCategory(product, selectedCategory, categoryRecords)) return false;

      // Gender
      if (selectedGender !== 'all') {
        if (product.gender !== selectedGender && product.gender !== 'unisex') return false;
      }

      // Sizes (if any selected, product must have at least one)
      if (selectedSizes.length > 0) {
        const hasSize = selectedSizes.some((sz) => product.sizes.includes(sz));
        if (!hasSize) return false;
      }

      // Colors
      if (selectedColors.length > 0) {
        const hasColor = selectedColors.some((c) => product.colors.some((pc) => pc.name === c));
        if (!hasColor) return false;
      }

      // Max price
      if (product.price > maxPrice) return false;

      // In stock
      if (inStockOnly) {
        const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
        if (totalStock <= 0) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'newest') return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0);
      return (b.isBestSeller ? 1 : 0) - (a.isBestSeller ? 1 : 0);
    });
  }, [
    queryParam,
    filterParam,
    wishlist,
    selectedCategory,
    selectedGender,
    selectedSizes,
    selectedColors,
    maxPrice,
    inStockOnly,
    sortBy,
  ]);

  const activeFiltersCount =
    (selectedCategory !== 'all' ? 1 : 0) +
    (selectedGender !== 'all' ? 1 : 0) +
    selectedSizes.length +
    selectedColors.length +
    (inStockOnly ? 1 : 0) +
    (maxPrice < 700000 ? 1 : 0);

  return (
    <div className="py-10 bg-surface-light min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Title & Breadcrumb */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-charcoal-400 mb-2">
            <button onClick={() => onNavigate('/')} className="hover:text-charcoal-700">
              Trang chủ
            </button>
            <span>/</span>
            <span className="text-charcoal-800 font-semibold">
              {filterParam === 'wishlist'
                ? 'Sản phẩm yêu thích'
                : filterParam === 'bestseller'
                ? 'Bán chạy nhất'
                : queryParam
                ? `Tìm kiếm: "${queryParam}"`
                : 'Tất cả sản phẩm Big Size'}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-charcoal-900 tracking-tight">
                {filterParam === 'wishlist'
                  ? 'Danh Sách Yêu Thích Của Bạn'
                  : 'Thời Trang Ngoại Cỡ Cao Cấp (XL – 5XL)'}
              </h1>
              <p className="text-xs sm:text-sm text-charcoal-500 mt-1">
                Hiển thị {filteredProducts.length} sản phẩm chuẩn phom dáng người đầy đặn.
              </p>
            </div>

            {/* Sort & Mobile filter trigger */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMobileFilterOpen(true)}
                className="lg:hidden flex items-center gap-2 px-4 py-2.5 bg-white border border-surface-border rounded-xl text-xs font-bold text-charcoal-800 shadow-sm"
              >
                <SlidersHorizontal className="w-4 h-4 text-brand-500" />
                <span>Bộ lọc {activeFiltersCount > 0 && `(${activeFiltersCount})`}</span>
              </button>

              <div className="flex items-center gap-2 bg-white border border-surface-border rounded-xl px-3 py-2 text-xs shadow-sm">
                <ArrowUpDown className="w-3.5 h-3.5 text-charcoal-500" />
                <span className="text-charcoal-500 hidden sm:inline">Sắp xếp:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent font-semibold text-charcoal-900 focus:outline-none cursor-pointer"
                >
                  <option value="featured">Nổi bật nhất</option>
                  <option value="newest">Mới về</option>
                  <option value="price-asc">Giá: Thấp đến Cao</option>
                  <option value="price-desc">Giá: Cao đến Thấp</option>
                  <option value="rating">Đánh giá cao</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Layout: Sidebar Filter + Product Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden lg:flex flex-col bg-white rounded-3xl border border-surface-border shadow-soft sticky top-28 max-h-[calc(100vh-8.5rem)] overflow-hidden">
            {/* Header cố định trên cùng của bộ lọc */}
            <div className="flex items-center justify-between p-5 pb-4 border-b border-surface-border shrink-0 bg-white">
              <div className="flex items-center gap-2 font-bold text-sm text-charcoal-900">
                <SlidersHorizontal className="w-4 h-4 text-brand-500" />
                <span>Bộ Lọc Đa Năng</span>
              </div>
              {activeFiltersCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="text-xs text-brand-600 hover:text-brand-700 font-bold flex items-center gap-1 hover:underline"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Đặt lại</span>
                </button>
              )}
            </div>

            {/* Vùng cuộn độc lập: Hỗ trợ lăn con lăn chuột & thanh kéo tiện lợi */}
            <div className="p-5 overflow-y-auto overscroll-contain space-y-6 filter-custom-scrollbar flex-1 pr-3.5">
              {/* Gender filter */}
            <div>
              <h4 className="text-xs font-bold text-charcoal-800 uppercase tracking-wider mb-2.5">
                Giới Tính
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'all', label: 'Tất cả' },
                  { id: 'nam', label: 'Nam' },
                  { id: 'nu', label: 'Nữ' },
                ].map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGender(g.id)}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      selectedGender === g.id
                        ? 'bg-charcoal-900 text-white border-charcoal-900'
                        : 'bg-surface-cream text-charcoal-700 border-surface-border hover:border-brand-500'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div>
              <h4 className="text-xs font-bold text-charcoal-800 uppercase tracking-wider mb-2.5">
                Danh Mục Sản Phẩm
              </h4>
              <div className="space-y-1">
                {categoriesList.map((cat) => {
                  const isChecked = selectedCategory === (cat.id === 'tat-ca' ? 'all' : cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id === 'tat-ca' ? 'all' : cat.id)}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold transition-colors ${
                        isChecked
                          ? 'bg-brand-50 text-brand-700 font-bold'
                          : 'text-charcoal-600 hover:bg-surface-cream'
                      }`}
                    >
                      <span>{cat.name}</span>
                      <span className="text-[10px] text-charcoal-400 font-mono">
                        ({cat.count})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sizes (XL to 5XL) */}
            <div>
              <div className="flex justify-between items-center mb-2.5">
                <h4 className="text-xs font-bold text-charcoal-800 uppercase tracking-wider">
                  Kích Cỡ Khả Dụng
                </h4>
                {selectedSizes.length > 0 && (
                  <span className="text-[11px] text-brand-600 font-bold">
                    {selectedSizes.length} đã chọn
                  </span>
                )}
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {sizesList.map((sz) => {
                  const isSelected = selectedSizes.includes(sz);
                  return (
                    <button
                      key={sz}
                      onClick={() => toggleSize(sz)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        isSelected
                          ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                          : 'bg-surface-cream text-charcoal-700 border-surface-border hover:border-brand-400'
                      }`}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Colors */}
            <div>
              <h4 className="text-xs font-bold text-charcoal-800 uppercase tracking-wider mb-2.5">
                Màu Sắc
              </h4>
              <div className="flex flex-wrap gap-2">
                {allColors.map((color) => {
                  const isSelected = selectedColors.includes(color.name);
                  return (
                    <button
                      key={color.name}
                      onClick={() => toggleColor(color.name)}
                      className={`w-6 h-6 rounded-full border transition-all relative ${
                        isSelected
                          ? 'ring-2 ring-brand-500 ring-offset-2 scale-110'
                          : 'border-stone-300 hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    >
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-white absolute inset-0 m-auto drop-shadow" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price Slider */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-bold text-charcoal-800 uppercase tracking-wider">
                  Mức Giá Tối Đa
                </h4>
                <span className="text-xs font-bold text-brand-600 font-mono">
                  {maxPrice.toLocaleString('vi-VN')}đ
                </span>
              </div>
              <input
                type="range"
                min="250000"
                max="750000"
                step="10000"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-brand-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-charcoal-400 mt-1">
                <span>250.000đ</span>
                <span>750.000đ</span>
              </div>
            </div>

            {/* In stock checkbox */}
            <div className="pt-2 border-t border-surface-border">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-charcoal-800 select-none">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="rounded border-surface-border text-brand-500 focus:ring-brand-500 w-4 h-4 cursor-pointer"
                />
                <span>Chỉ hiển thị sản phẩm còn hàng</span>
              </label>
            </div>
            </div>
          </aside>

          {/* Product Grid Area (3 cols desktop, 2 cols mobile) */}
          <main className="lg:col-span-3">
            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-3xl border border-surface-border p-12 text-center space-y-4 shadow-soft">
                <div className="w-16 h-16 bg-surface-cream rounded-full flex items-center justify-center mx-auto text-charcoal-400">
                  <Search className="w-8 h-8 stroke-[1.5]" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-lg text-charcoal-800">
                    Không tìm thấy sản phẩm phù hợp
                  </h3>
                  <p className="text-xs text-charcoal-500 mt-1 max-w-sm mx-auto">
                    Hãy thử nới lỏng các tiêu chí lọc (Kích cỡ, Màu sắc, Mức giá) hoặc tìm kiếm bằng từ khóa khác.
                  </p>
                </div>
                <button
                  onClick={resetFilters}
                  className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-full text-xs font-bold tracking-wide transition-all shadow-sm"
                >
                  Xóa tất cả bộ lọc
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onNavigate={onNavigate}
                    onQuickView={(p) => setQuickViewProduct(p)}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-charcoal-900/60 backdrop-blur-sm"
            onClick={() => setIsMobileFilterOpen(false)}
          />

          <div className="relative ml-auto max-w-xs w-full bg-white h-full shadow-modal flex flex-col z-10 animate-slideLeft">
            <div className="p-4 border-b border-surface-border flex items-center justify-between bg-surface-cream">
              <span className="font-heading font-bold text-sm text-charcoal-900">
                Bộ Lọc Sản Phẩm
              </span>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="p-1 text-charcoal-500 hover:text-charcoal-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto overscroll-contain flex-1 space-y-6 filter-custom-scrollbar">
              {/* Gender mobile */}
              <div>
                <h4 className="text-xs font-bold text-charcoal-800 uppercase tracking-wider mb-2">
                  Giới Tính
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'all', label: 'Tất cả' },
                    { id: 'nam', label: 'Nam' },
                    { id: 'nu', label: 'Nữ' },
                  ].map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setSelectedGender(g.id)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        selectedGender === g.id
                          ? 'bg-charcoal-900 text-white border-charcoal-900'
                          : 'bg-surface-cream text-charcoal-700 border-surface-border'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category mobile */}
              <div>
                <h4 className="text-xs font-bold text-charcoal-800 uppercase tracking-wider mb-2">
                  Danh Mục
                </h4>
                <div className="space-y-1">
                  {categoriesList.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCategory(c.id === 'tat-ca' ? 'all' : c.id)}
                      className={`w-full text-left text-xs p-2 rounded-lg ${
                        selectedCategory === (c.id === 'tat-ca' ? 'all' : c.id)
                          ? 'bg-brand-50 text-brand-700 font-bold'
                          : 'text-charcoal-700 hover:bg-stone-50'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sizes mobile */}
              <div>
                <h4 className="text-xs font-bold text-charcoal-800 uppercase tracking-wider mb-2">
                  Kích cỡ (XL - 5XL)
                </h4>
                <div className="grid grid-cols-5 gap-1.5">
                  {sizesList.map((sz) => (
                    <button
                      key={sz}
                      onClick={() => toggleSize(sz)}
                      className={`py-2 text-xs font-bold rounded-lg border ${
                        selectedSizes.includes(sz)
                          ? 'bg-brand-500 text-white border-brand-500'
                          : 'bg-surface-cream text-charcoal-700 border-surface-border'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              {/* Colors mobile */}
              <div>
                <h4 className="text-xs font-bold text-charcoal-800 uppercase tracking-wider mb-2">
                  Màu Sắc
                </h4>
                <div className="flex flex-wrap gap-2">
                  {allColors.map((color) => {
                    const isSelected = selectedColors.includes(color.name);
                    return (
                      <button
                        key={color.name}
                        onClick={() => toggleColor(color.name)}
                        className={`w-7 h-7 rounded-full border transition-all relative ${
                          isSelected
                            ? 'ring-2 ring-brand-500 ring-offset-2 scale-110'
                            : 'border-stone-300'
                        }`}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      >
                        {isSelected && (
                          <Check className="w-4 h-4 text-white absolute inset-0 m-auto drop-shadow" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price mobile */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-xs font-bold text-charcoal-800 uppercase tracking-wider">
                    Giá tối đa
                  </h4>
                  <span className="text-xs font-bold text-brand-600">
                    {maxPrice.toLocaleString('vi-VN')}đ
                  </span>
                </div>
                <input
                  type="range"
                  min="250000"
                  max="750000"
                  step="10000"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-brand-500"
                />
              </div>

              {/* In stock checkbox mobile */}
              <div className="pt-2 border-t border-surface-border">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-charcoal-800 select-none">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    className="rounded border-surface-border text-brand-500 focus:ring-brand-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Chỉ hiển thị sản phẩm còn hàng</span>
                </label>
              </div>
            </div>

            <div className="p-4 border-t border-surface-border bg-stone-50 flex gap-2">
              <button
                onClick={resetFilters}
                className="flex-1 py-2.5 border border-surface-border rounded-xl text-xs font-bold text-charcoal-700"
              >
                Đặt lại
              </button>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="flex-1 py-2.5 bg-brand-500 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Xem {filteredProducts.length} kết quả
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick View Modal */}
      <QuickViewModal
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        onNavigate={onNavigate}
        onOpenSizeAdvisor={onOpenSizeAdvisor}
      />
    </div>
  );
};
