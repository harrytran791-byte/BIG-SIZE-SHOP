import { matchesCatalogCategory } from '@/shared/utils/categoryUtils';
import React, { useState, useMemo, useEffect } from 'react';
import { Filter, SlidersHorizontal, ArrowUpDown, X, Check, RotateCcw, Search, Sparkles, ChevronDown } from 'lucide-react';

import { useProducts } from '../context/ProductContext';
import { ProductCard } from '../components/ProductCard';
import { QuickViewModal } from '../components/QuickViewModal';
import { Category, Gender, Product, Size } from '@/types';
import { useWishlist } from '@/context/WishlistContext';

const CATEGORY_ICONS: Record<string, string> = {
  'tat-ca': '✨',
  'ao': '👕',
  'ao-thun': '👕',
  'quan-jeans': '👖',
  'dam-vay': '👗',
  'do-bo': '🏃',
};

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
  const [isCategoryOpen, setIsCategoryOpen] = useState<boolean>(false);
  const [isMobileCategoryOpen, setIsMobileCategoryOpen] = useState<boolean>(false);
  const [selectedGender, setSelectedGender] = useState<string>(genderParam || 'all');
  const [selectedSizes, setSelectedSizes] = useState<Size[]>(sizeParam ? [sizeParam] : []);
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('featured');
  const [isSidebarVisible, setIsSidebarVisible] = useState<boolean>(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  // Active category object for smart context display
  const currentCategoryObj = useMemo(() => {
    return categoriesList.find((c) => (c.id === 'tat-ca' ? 'all' : c.id) === selectedCategory) || categoriesList[0];
  }, [selectedCategory, categoriesList]);

  // Sync state if URL query params change
  useEffect(() => {
    setSelectedCategory(categoryParam || 'all');
    setSelectedGender(genderParam || 'all');
    setSelectedSizes(sizeParam ? [sizeParam] : []);
  }, [categoryParam, genderParam, sizeParam]);

  const sizesList: Size[] = ['XL', '2XL', '3XL', '4XL', '5XL'];

  const toggleSize = (sz: Size) => {
    setSelectedSizes((prev) =>
      prev.includes(sz) ? prev.filter((s) => s !== sz) : [...prev, sz]
    );
  };

  const resetFilters = () => {
    setSelectedCategory('all');
    setSelectedGender('all');
    setSelectedSizes([]);
    setInStockOnly(false);
    setSortBy('featured');
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
    products,
    categoryRecords,
    queryParam,
    filterParam,
    wishlist,
    selectedCategory,
    selectedGender,
    selectedSizes,
    inStockOnly,
    sortBy,
  ]);

  const activeFiltersCount =
    (selectedCategory !== 'all' ? 1 : 0) +
    (selectedGender !== 'all' ? 1 : 0) +
    selectedSizes.length +
    (inStockOnly ? 1 : 0) +
    (sortBy !== 'featured' ? 1 : 0);

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

            {/* Desktop hide/show filter button + Mobile filter trigger */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsSidebarVisible(!isSidebarVisible)}
                className="hidden lg:flex items-center gap-2 px-3.5 py-2.5 bg-white hover:bg-stone-50 border border-surface-border rounded-xl text-xs font-bold text-charcoal-800 shadow-2xs transition-all cursor-pointer"
                title={isSidebarVisible ? 'Ẩn thanh bộ lọc để xem sản phẩm rộng hơn' : 'Hiện lại thanh bộ lọc'}
              >
                <SlidersHorizontal className="w-4 h-4 text-brand-600" />
                <span>{isSidebarVisible ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}</span>
              </button>

              <button
                onClick={() => setIsMobileFilterOpen(true)}
                className="lg:hidden flex items-center gap-2 px-4 py-2.5 bg-white border border-surface-border rounded-xl text-xs font-bold text-charcoal-800 shadow-sm cursor-pointer"
              >
                <SlidersHorizontal className="w-4 h-4 text-brand-500" />
                <span>Bộ lọc {activeFiltersCount > 0 && `(${activeFiltersCount})`}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Layout: Sidebar Filter + Product Grid */}
        <div className={`grid grid-cols-1 ${isSidebarVisible ? 'lg:grid-cols-4' : 'lg:grid-cols-1'} gap-8 items-start`}>
          {/* Desktop Filter Sidebar */}
          {isSidebarVisible && (
            <aside className="hidden lg:flex flex-col bg-white rounded-3xl border border-surface-border shadow-soft sticky top-28 animate-fadeIn">
            {/* Header cố định trên cùng của bộ lọc */}
            <div className="flex items-center justify-between p-5 pb-4 border-b border-surface-border shrink-0 bg-white">
              <div className="flex items-center gap-2 font-bold text-sm text-charcoal-900">
                <SlidersHorizontal className="w-4 h-4 text-brand-500" />
                <span>Bộ Lọc Đa Năng</span>
              </div>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs text-brand-600 hover:text-brand-700 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Đặt lại</span>
                </button>
              )}
            </div>

            {/* Vùng nội dung bộ lọc - hiển thị tự nhiên, không kẹt cuộn */}
            <div className="p-5 space-y-5">
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
                      type="button"
                      onClick={() => setSelectedGender(g.id)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        selectedGender === g.id
                          ? 'bg-charcoal-900 text-white border-charcoal-900 shadow-xs'
                          : 'bg-surface-cream text-charcoal-700 border-surface-border hover:border-brand-500'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categories Collapsible Accordion */}
              <div className="border border-surface-border rounded-2xl overflow-hidden bg-surface-cream/40 transition-all">
                <button
                  type="button"
                  onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                  className="w-full flex items-center justify-between p-3.5 hover:bg-stone-50 transition-colors cursor-pointer group text-left"
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="text-[11px] font-bold text-charcoal-500 uppercase tracking-wider">
                      Danh Mục Sản Phẩm
                    </span>
                    <span className="text-xs text-charcoal-900 font-bold mt-0.5 flex items-center gap-1.5 truncate">
                      <span>{CATEGORY_ICONS[currentCategoryObj.id] || '✨'}</span>
                      <span className="truncate">{currentCategoryObj.name}</span>
                    </span>
                  </div>
                  <div className={`w-6 h-6 rounded-lg bg-white border border-stone-200 flex items-center justify-center text-charcoal-500 group-hover:text-brand-600 transition-all shrink-0 ${isCategoryOpen ? 'rotate-180 bg-brand-50 text-brand-700 border-brand-200' : ''}`}>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </div>
                </button>

                {/* Danh sách danh mục xổ xuống khi bấm (Đã xóa số lượng) */}
                {isCategoryOpen && (
                  <div className="p-2 pt-0 space-y-1 border-t border-surface-border bg-white animate-in slide-in-from-top-2 duration-150">
                    {categoriesList.map((cat) => {
                      const isChecked = selectedCategory === (cat.id === 'tat-ca' ? 'all' : cat.id);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(cat.id === 'tat-ca' ? 'all' : cat.id);
                            setIsCategoryOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                            isChecked
                              ? 'bg-charcoal-900 text-white font-bold shadow-xs'
                              : 'text-charcoal-700 hover:bg-surface-cream hover:text-charcoal-900'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span className="text-sm">{CATEGORY_ICONS[cat.id] || '🏷️'}</span>
                            <span>{cat.name}</span>
                          </span>
                          {isChecked && (
                            <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
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

            {/* Xem Theo Giá & Sắp Xếp */}
            <div>
              <div className="flex justify-between items-center mb-2.5">
                <h4 className="text-xs font-bold text-charcoal-800 uppercase tracking-wider">
                  Xem Theo Giá & Thứ Tự
                </h4>
                {sortBy !== 'featured' && (
                  <button
                    type="button"
                    onClick={() => setSortBy('featured')}
                    className="text-[11px] text-brand-600 hover:underline font-semibold cursor-pointer"
                  >
                    Mặc định
                  </button>
                )}
              </div>
              <div className="space-y-1.5">
                {[
                  { id: 'featured', label: 'Nổi bật & Bán chạy', hint: 'Đề xuất Curve & Confidence', icon: '🔥' },
                  { id: 'rating', label: 'Đánh giá cao nhất', hint: 'Nhiều sao & Phản hồi 5 sao', icon: '⭐' },
                  { id: 'newest', label: 'Hàng mới về nhất', hint: 'Bộ sưu tập xu hướng', icon: '✨' },
                  { id: 'price-asc', label: 'Giá: Thấp đến Cao', hint: 'Tiết kiệm / Săn deal', icon: '🏷️' },
                  { id: 'price-desc', label: 'Giá: Cao đến Thấp', hint: 'Cao cấp / Sang trọng', icon: '💎' },
                ].map((item) => {
                  const isSelected = sortBy === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSortBy(item.id)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs border transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'bg-charcoal-900 text-white border-charcoal-900 shadow-xs'
                          : 'bg-surface-cream text-charcoal-700 border-surface-border hover:border-brand-400 hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm shrink-0">{item.icon}</span>
                        <div className="truncate">
                          <p className={`font-bold leading-tight ${isSelected ? 'text-white' : 'text-charcoal-900'}`}>
                            {item.label}
                          </p>
                          <p className={`text-[10px] mt-0.5 ${isSelected ? 'text-stone-300' : 'text-stone-400'}`}>
                            {item.hint}
                          </p>
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-white shrink-0 stroke-[2.5]" />
                      )}
                    </button>
                  );
                })}
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
        )}

        {/* Product Grid Area */}
        <main className={isSidebarVisible ? 'lg:col-span-3' : 'lg:col-span-4'}>
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
                  Hãy thử nới lỏng các tiêu chí lọc (Kích cỡ, Danh mục, Giới tính) hoặc tìm kiếm bằng từ khóa khác.
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
            <div
              key={`${filterParam || 'all'}-${selectedGender}-${selectedCategory}-${sortBy}`}
              className={`grid grid-cols-2 ${isSidebarVisible ? 'md:grid-cols-3' : 'md:grid-cols-4'} gap-4 sm:gap-6`}
            >
                {filteredProducts.map((product, idx) => {
                  const delayClass = idx % 3 === 1 ? 'delay-100' : idx % 3 === 2 ? 'delay-200' : '';
                  const itemKey = `${filterParam || 'all'}-${selectedGender}-${selectedCategory}-${product.id}`;
                  return (
                    <div key={itemKey} className={`reveal-init ${delayClass}`}>
                      <ProductCard
                        product={product}
                        onNavigate={onNavigate}
                        onQuickView={(p) => setQuickViewProduct(p)}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-md"
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
              <div className="border border-surface-border rounded-xl overflow-hidden bg-surface-cream/40">
                <button
                  type="button"
                  onClick={() => setIsMobileCategoryOpen(!isMobileCategoryOpen)}
                  className="w-full flex items-center justify-between p-3 hover:bg-stone-50 transition-colors text-left"
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="text-[11px] font-bold text-charcoal-500 uppercase tracking-wider">
                      Danh Mục Sản Phẩm
                    </span>
                    <span className="text-xs text-charcoal-900 font-bold mt-0.5 flex items-center gap-1.5 truncate">
                      <span>{CATEGORY_ICONS[currentCategoryObj.id] || '✨'}</span>
                      <span className="truncate">{currentCategoryObj.name}</span>
                    </span>
                  </div>
                  <div className={`w-6 h-6 rounded-lg bg-white border border-stone-200 flex items-center justify-center text-charcoal-500 transition-all shrink-0 ${isMobileCategoryOpen ? 'rotate-180 bg-brand-50 text-brand-700' : ''}`}>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </div>
                </button>

                {isMobileCategoryOpen && (
                  <div className="p-2 pt-0 space-y-1 border-t border-surface-border bg-white">
                    {categoriesList.map((c) => {
                      const isChecked = selectedCategory === (c.id === 'tat-ca' ? 'all' : c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(c.id === 'tat-ca' ? 'all' : c.id);
                            setIsMobileCategoryOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-semibold text-left transition-all ${
                            isChecked
                              ? 'bg-charcoal-900 text-white font-bold'
                              : 'text-charcoal-700 hover:bg-stone-50'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span>{CATEGORY_ICONS[c.id] || '🏷️'}</span>
                            <span>{c.name}</span>
                          </span>
                          {isChecked && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                      );
                    })}
                  </div>
                )}
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

              {/* Sắp xếp & Thứ tự giá mobile */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xs font-bold text-charcoal-800 uppercase tracking-wider">
                    Xem Theo Giá & Thứ Tự
                  </h4>
                  {sortBy !== 'featured' && (
                    <button
                      type="button"
                      onClick={() => setSortBy('featured')}
                      className="text-[11px] text-brand-600 hover:underline font-semibold"
                    >
                      Mặc định
                    </button>
                  )}
                </div>
                <div className="space-y-1.5">
                  {[
                    { id: 'featured', label: 'Nổi bật & Bán chạy', hint: 'Đề xuất Curve & Confidence', icon: '🔥' },
                    { id: 'rating', label: 'Đánh giá cao nhất', hint: 'Nhiều sao & Phản hồi 5 sao', icon: '⭐' },
                    { id: 'newest', label: 'Hàng mới về nhất', hint: 'Bộ sưu tập xu hướng', icon: '✨' },
                    { id: 'price-asc', label: 'Giá: Thấp đến Cao', hint: 'Tiết kiệm / Săn deal', icon: '🏷️' },
                    { id: 'price-desc', label: 'Giá: Cao đến Thấp', hint: 'Cao cấp / Sang trọng', icon: '💎' },
                  ].map((item) => {
                    const isSelected = sortBy === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSortBy(item.id)}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-xs border transition-all text-left ${
                          isSelected
                            ? 'bg-charcoal-900 text-white border-charcoal-900 shadow-xs'
                            : 'bg-surface-cream text-charcoal-700 border-surface-border'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm shrink-0">{item.icon}</span>
                          <div className="truncate">
                            <p className={`font-bold leading-tight ${isSelected ? 'text-white' : 'text-charcoal-900'}`}>
                              {item.label}
                            </p>
                            <p className={`text-[10px] mt-0.5 ${isSelected ? 'text-stone-300' : 'text-stone-400'}`}>
                              {item.hint}
                            </p>
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 text-white shrink-0 stroke-[2.5]" />
                        )}
                      </button>
                    );
                  })}
                </div>
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
