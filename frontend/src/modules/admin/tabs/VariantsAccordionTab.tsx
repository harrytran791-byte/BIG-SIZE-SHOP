import { useProducts } from '@/modules/product/context/ProductContext';
import { matchesCatalogCategory } from '@/shared/utils/categoryUtils';
import React, { useState, useMemo } from 'react';
import { 
  Boxes, 
  Warehouse, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Package, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  ExternalLink,
  Filter,
  Tag
} from 'lucide-react';
import { Product, StockItem } from '@/shared/types';
import { getColorHex } from '@/shared/constants/colorConfig';

interface VariantsAccordionTabProps {
  products: Product[];
  inventory: StockItem[];
  onNavigateToInventory: () => void;
  onRestockSku?: (sku: string) => void;
}

export const VariantsAccordionTab: React.FC<VariantsAccordionTabProps> = ({
  products,
  inventory,
  onNavigateToInventory,
  onRestockSku,
}) => {
  const { categoryRecords } = useProducts();
  const [searchQuery, setSearchQuery] = useState('');
  const [sizeFilter, setSizeFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');

  // Hierarchical Category Filter: Level 1 (Main Category) & Level 2 (Sub Category)
  const [mainCategoryFilter, setMainCategoryFilter] = useState<'all' | 'ao' | 'quan' | 'dam' | 'dobo'>('all');
  const [subCategoryFilter, setSubCategoryFilter] = useState<string>('all');

  // Expanded Product IDs set (Default expand first item prod-01 according to Screenshot 5)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['prod-01']));

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleAll = () => {
    if (expandedIds.size === products.length) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(products.map((p) => p.id)));
    }
  };

  // Category matching helper functions
  const matchMainCategory = (prod: Product, mainCat: string): boolean =>
    matchesCatalogCategory(prod, mainCat, categoryRecords);

  const matchSubCategory = (prod: Product, subCat: string): boolean => {
    if (subCat === 'all') return true;
    const name = prod.name.toLowerCase();
    const cat = (prod.category || '').toLowerCase();
    const catName = (prod.categoryName || '').toLowerCase();

    if (subCat === 'polo') return name.includes('polo') || cat.includes('polo') || catName.includes('polo');
    if (subCat === 'somi') {
      return (
        cat === 'ao-so-mi' ||
        cat.includes('so-mi') ||
        name.includes('sơ mi') ||
        name.includes('oxford') ||
        catName.includes('sơ mi')
      );
    }
    if (subCat === 'thun') return (name.includes('thun') || name.includes('t-shirt') || cat.includes('ao-thun') || catName.includes('áo thun')) && !name.includes('polo') && !catName.includes('polo');
    if (subCat === 'khoac') return name.includes('khoác') || name.includes('blazer') || cat.includes('ao-khoac') || catName.includes('khoác') || catName.includes('kiểu');
    if (subCat === 'jeans') return name.includes('jean') || cat.includes('jean') || catName.includes('jean');
    if (subCat === 'kaki') return name.includes('kaki') || name.includes('tây') || cat.includes('kaki') || catName.includes('kaki') || catName.includes('tây');
    if (subCat === 'short') return name.includes('short') || name.includes('lửng') || catName.includes('short');
    if (subCat === 'chua') return name.includes('chữ a') || cat.includes('chua') || catName.includes('đầm');
    if (subCat === 'suong') return name.includes('suông') || cat.includes('suong') || catName.includes('váy');
    if (subCat === 'thethao') return name.includes('thể thao') || cat.includes('the-thao') || catName.includes('nam');
    if (subCat === 'macnha') return name.includes('mặc nhà') || name.includes('thun lạnh') || catName.includes('nữ');
    return true;
  };

  // Calculate SKU volume per main category for pill counter badges
  const categoryCounts = useMemo(() => {
    const counts = { all: 0, ao: 0, quan: 0, dam: 0, dobo: 0 };
    products.forEach((p) => {
      const childSkus = inventory.filter((inv) => inv.productId === p.id);
      const skuCount = childSkus.length > 0 ? childSkus.length : (p.variants?.length || p.sizes?.length || 1);
      counts.all += skuCount;
      if (matchMainCategory(p, 'ao')) counts.ao += skuCount;
      if (matchMainCategory(p, 'quan')) counts.quan += skuCount;
      if (matchMainCategory(p, 'dam')) counts.dam += skuCount;
      if (matchMainCategory(p, 'dobo')) counts.dobo += skuCount;
    });
    return counts;
  }, [products, inventory, categoryRecords]);

  // Filtered parent products and their SKUs
  const filteredProductsWithSkus = useMemo(() => {
    return products
      .filter((prod) => matchMainCategory(prod, mainCategoryFilter) && matchSubCategory(prod, subCategoryFilter))
      .map((prod) => {
        // Get all child SKUs for this product from inventory
        let childSkus = inventory.filter((inv) => inv.productId === prod.id);

        // If inventory doesn't have child SKUs for this product, build from variants or sizes
        if (childSkus.length === 0 && prod.variants && prod.variants.length > 0) {
          childSkus = prod.variants.map((v) => ({
            id: v.sku,
            sku: v.sku,
            productId: prod.id,
            productName: prod.name,
            category: prod.category,
            size: v.size,
            color: (v as any).colorName || (v as any).color || (prod.colors?.[0]?.name || 'Đen Huyền Bí'),
            quantity: v.stock ?? 0,
            heldQuantity: 0,
            lowStockThreshold: 5,
            unitCost: Math.round(prod.price * 0.6),
            sellingPrice: prod.price,
            status: (v.stock || 15) > 5 ? 'in_stock' : (v.stock || 15) > 0 ? 'low_stock' : 'out_of_stock',
            productImage: prod.images?.[0] || '',
            updatedAt: '2026-10-10',
          }));
        }

        // Filter child SKUs by search, size, and stock status
        const matchingChildSkus = childSkus.filter((sku) => {
          if (sizeFilter !== 'all' && sku.size !== sizeFilter) return false;
          if (stockFilter === 'in_stock' && sku.quantity <= 5) return false;
          if (stockFilter === 'low_stock' && (sku.quantity === 0 || sku.quantity > 5)) return false;
          if (stockFilter === 'out_of_stock' && sku.quantity > 0) return false;

          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            const matchSku = sku.sku.toLowerCase().includes(q);
            const matchName = sku.productName.toLowerCase().includes(q);
            const matchColor = sku.color.toLowerCase().includes(q);
            const matchSize = sku.size.toLowerCase().includes(q);
            if (!matchSku && !matchName && !matchColor && !matchSize) return false;
          }

          return true;
        });

        const totalStock = childSkus.reduce((sum, s) => sum + (s.quantity || 0), 0);
        const hasLowStock = childSkus.some((s) => s.quantity > 0 && s.quantity <= 5);
        const hasOutStock = childSkus.some((s) => s.quantity === 0);
        const missingSizeCount = childSkus.filter((s) => s.quantity === 0).length;
        const lowSizeCount = childSkus.filter((s) => s.quantity > 0 && s.quantity <= 5).length;

        return {
          product: prod,
          allChildSkus: childSkus,
          matchingChildSkus,
          totalStock,
          hasLowStock,
          hasOutStock,
          missingSizeCount,
          lowSizeCount,
        };
      }).filter((item) => {
        // If user searched, keep product if it has matching child SKUs or matches name directly
        if (searchQuery.trim() || sizeFilter !== 'all' || stockFilter !== 'all') {
          return item.matchingChildSkus.length > 0;
        }
        return true;
      });
  }, [products, inventory, categoryRecords, searchQuery, sizeFilter, stockFilter, mainCategoryFilter, subCategoryFilter]);

  // Reactive KPI Calculations reflecting current filtered categories & search
  const kpiStats = useMemo(() => {
    let relevantSkus: StockItem[] = [];
    filteredProductsWithSkus.forEach((item) => {
      relevantSkus = relevantSkus.concat(item.matchingChildSkus);
    });

    const total = relevantSkus.length;
    const inStock = relevantSkus.filter((i) => (i.quantity || 0) > 5).length;
    const lowStock = relevantSkus.filter((i) => (i.quantity || 0) > 0 && (i.quantity || 0) <= 5).length;
    const outOfStock = relevantSkus.filter((i) => (i.quantity || 0) === 0).length;
    return { total, inStock, lowStock, outOfStock };
  }, [filteredProductsWithSkus]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fadeIn">
      {/* Header (Screenshot 4) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-900 flex items-center gap-2">
            <Boxes className="w-6 h-6 text-[#5C1D24]" />
            <span>Danh Sách Biến Thể Sản Phẩm (SKU Breakdown)</span>
          </h1>
        </div>
        <button
          type="button"
          onClick={onNavigateToInventory}
          className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-charcoal-800 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer self-start sm:self-auto shadow-2xs"
        >
          <Warehouse className="w-4 h-4 text-[#5C1D24]" />
          <span>Chuyển Sang Kiểm Kê & Nhập Kho</span>
        </button>
      </div>

      {/* Filter and KPI Cards Bar (Screenshot 4) */}
      <div className="bg-white rounded-2xl border border-stone-200/90 p-4 shadow-2xs space-y-3.5">
        {/* HIERARCHICAL CATEGORY FILTER (TẦNG 1: DANH MỤC CHÍNH) */}
        <div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'all', label: 'Tất Cả Danh Mục', count: categoryCounts.all },
              { id: 'ao', label: 'Áo Big Size', count: categoryCounts.ao },
              { id: 'quan', label: 'Quần & Jeans', count: categoryCounts.quan },
              { id: 'dam', label: 'Đầm & Váy', count: categoryCounts.dam },
              { id: 'dobo', label: 'Đồ Bộ & Thể Thao', count: categoryCounts.dobo },
            ].map((cat) => {
              const isActive = mainCategoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setMainCategoryFilter(cat.id as any);
                    setSubCategoryFilter('all');
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
                    isActive
                      ? 'bg-[#5C1D24] text-white shadow-2xs'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-600'
                    }`}
                  >
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* HIERARCHICAL CATEGORY FILTER (TẦNG 2: PHÂN LOẠI CHI TIẾT) */}
          {mainCategoryFilter !== 'all' && (
            <div className="flex items-center gap-1.5 overflow-x-auto pt-2.5 animate-fadeIn">
              <span className="text-[11px] font-bold text-stone-400 shrink-0 flex items-center gap-1 mr-1">
                <Filter className="w-3 h-3 text-[#5C1D24]" />
                <span>Phân loại:</span>
              </span>
              {(
                mainCategoryFilter === 'ao'
                  ? [
                      { id: 'all', label: 'Tất Cả Áo' },
                      { id: 'polo', label: 'Áo Polo Nam' },
                      { id: 'somi', label: 'Áo Sơ Mi Oxford' },
                      { id: 'thun', label: 'Áo Thun Dry-Tech' },
                      { id: 'khoac', label: 'Áo Khoác & Blazer' },
                    ]
                  : mainCategoryFilter === 'quan'
                  ? [
                      { id: 'all', label: 'Tất Cả Quần' },
                      { id: 'jeans', label: 'Quần Jeans Co Giãn' },
                      { id: 'kaki', label: 'Quần Kaki & Quần Tây' },
                      { id: 'short', label: 'Quần Short Ngoại Cỡ' },
                    ]
                  : mainCategoryFilter === 'dam'
                  ? [
                      { id: 'all', label: 'Tất Cả Đầm Váy' },
                      { id: 'chua', label: 'Đầm Xòe Chữ A' },
                      { id: 'suong', label: 'Đầm Phom Suông' },
                    ]
                  : [
                      { id: 'all', label: 'Tất Cả Đồ Bộ' },
                      { id: 'thethao', label: 'Set Đồ Thể Thao' },
                      { id: 'macnha', label: 'Set Đồ Mặc Nhà' },
                    ]
              ).map((sub) => {
                const isSubActive = subCategoryFilter === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setSubCategoryFilter(sub.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                      isSubActive
                        ? 'bg-stone-900 text-white shadow-2xs'
                        : 'bg-stone-50 hover:bg-stone-100 text-stone-600 border border-stone-200'
                    }`}
                  >
                    {sub.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1 border-t border-stone-100">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm mã SKU, tên mẫu, màu sắc (ví dụ: POLO-XL, Đen, Xanh)..."
              className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-hidden focus:border-[#5C1D24] focus:bg-white transition-colors"
            />
          </div>

          <select
            value={sizeFilter}
            onChange={(e) => setSizeFilter(e.target.value)}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#5C1D24] cursor-pointer"
          >
            <option value="all">Tất cả dải size (XL-5XL)</option>
            <option value="XL">Size XL</option>
            <option value="2XL">Size 2XL</option>
            <option value="3XL">Size 3XL</option>
            <option value="4XL">Size 4XL</option>
            <option value="5XL">Size 5XL</option>
          </select>

          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#5C1D24] cursor-pointer"
          >
            <option value="all">Tất cả tình trạng kho</option>
            <option value="in_stock">Còn nhiều (&gt;5 cái)</option>
            <option value="low_stock">Sắp hết hàng (1-5 cái)</option>
            <option value="out_of_stock">Hết hàng (0 cái)</option>
          </select>
        </div>

        {/* 4 KPI Cards (Screenshot 4) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-stone-100">
          <div className="p-3 rounded-xl bg-stone-50 text-xs">
            <span className="text-stone-400 block text-[10px] font-bold">Tổng Biến Thể</span>
            <strong className="text-charcoal-900 font-black text-base">{kpiStats.total} SKU</strong>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-xs">
            <span className="text-emerald-700 block text-[10px] font-bold">Tồn Kho Dồi Dào</span>
            <strong className="text-emerald-800 font-black text-base">{kpiStats.inStock} SKU</strong>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-xs">
            <span className="text-amber-700 block text-[10px] font-bold">Sắp Hết Hàng (≤5)</span>
            <strong className="text-amber-800 font-black text-base">{kpiStats.lowStock} SKU</strong>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-xs">
            <span className="text-rose-700 block text-[10px] font-bold">Đã Hết Hàng</span>
            <strong className="text-rose-800 font-black text-base">{kpiStats.outOfStock} SKU</strong>
          </div>
        </div>
      </div>

      {/* Accordion List grouped by Parent Product (Screenshot 4 & 5) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-stone-700">
            Danh Sách Theo Mẫu Sản Phẩm ({filteredProductsWithSkus.length} sản phẩm • {kpiStats.total} mã SKU)
          </span>
          <button
            type="button"
            onClick={handleToggleAll}
            className="text-xs font-bold text-[#5C1D24] hover:underline cursor-pointer"
          >
            {expandedIds.size === products.length ? 'Thu gọn tất cả' : 'Mở rộng tất cả'}
          </button>
        </div>

        {filteredProductsWithSkus.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200/90 p-12 text-center text-stone-400 text-xs">
            Không tìm thấy biến thể nào phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          filteredProductsWithSkus.map(({ product: p, allChildSkus, matchingChildSkus, totalStock, hasLowStock, hasOutStock, missingSizeCount, lowSizeCount }) => {
            const isExpanded = expandedIds.has(p.id);
            const displayedSkus = isExpanded ? matchingChildSkus : [];

            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden shadow-2xs transition-all"
              >
                {/* Parent Row (Screenshot 4) */}
                <div
                  className="p-4 flex items-center justify-between gap-4 flex-wrap cursor-pointer hover:bg-stone-50/50 transition-colors"
                  onClick={() => toggleExpand(p.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Expand/Collapse Chevron Button (Đóng khung đỏ trong Screenshot 4) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(p.id);
                      }}
                      className={`w-8 h-8 rounded-xl border border-stone-200 flex items-center justify-center transition-all cursor-pointer ${
                        isExpanded ? 'bg-[#5C1D24] text-white border-[#5C1D24]' : 'bg-stone-50 text-stone-600 hover:bg-stone-100'
                      }`}
                      title={isExpanded ? 'Thu gọn' : 'Mở rộng chi tiết biến thể'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {/* Thumbnail */}
                    <img
                      src={p.images?.[0] || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=200'}
                      alt={p.name}
                      className="w-12 h-12 object-cover rounded-xl border border-stone-200 shrink-0 shadow-2xs"
                    />

                    {/* Product Name & SKU Count */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          {p.id}
                        </span>
                        <span className="text-stone-400 text-[11px] font-medium font-mono">
                          {allChildSkus.length} mã SKU
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-charcoal-900 truncate max-w-sm sm:max-w-md">
                        {p.name}
                      </h4>
                    </div>
                  </div>

                  {/* Middle Meta: Bảng màu, Dải size, Tồn kho, Giá, Tình trạng */}
                  <div className="flex items-center gap-4 text-xs ml-auto flex-wrap">
                    {/* Bảng màu */}
                    <div className="hidden lg:flex items-center gap-1.5">
                      <span className="text-[11px] text-stone-400">Bảng màu ({p.colors?.length || 2}):</span>
                      {(p.colors && p.colors.length > 0 ? p.colors : [
                        { name: 'Đen Huyền Bí', hex: '#1C1917' },
                        { name: 'Xanh Navy', hex: '#1E3A8A' }
                      ]).map((c, idx) => (
                        <span key={idx} className="flex items-center gap-1 text-[11px] text-stone-700 font-medium">
                          <span className="w-2.5 h-2.5 rounded-full border border-stone-300 shrink-0" style={{ backgroundColor: c.hex }} />
                          <span className="hidden xl:inline">{c.name}</span>
                        </span>
                      ))}
                    </div>

                    {/* Dải size */}
                    <div className="hidden md:flex items-center gap-1">
                      <span className="text-[11px] text-stone-400 mr-1">Dải Size Big:</span>
                      {p.sizes.map((s) => (
                        <span
                          key={s}
                          className="px-1.5 py-0.5 rounded bg-stone-100 font-mono text-[10px] font-bold text-stone-700 border border-stone-200"
                        >
                          {s}
                        </span>
                      ))}
                    </div>

                    {/* Giá niêm yết */}
                    <div>
                      <span className="text-[10px] text-stone-400 block">Giá niêm yết</span>
                      <strong className="text-xs font-bold text-charcoal-900">{p.price.toLocaleString('vi-VN')}₫</strong>
                    </div>
                  </div>
                </div>

                {/* Expanded Child SKU Table */}
                {isExpanded && (
                  <div className="p-4 pt-0 border-t border-stone-100 bg-stone-50/40 animate-fadeIn">
                    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden mt-3 shadow-2xs">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px] font-bold">
                          <tr>
                            <th className="p-3 pl-4">MÃ SKU BIẾN THỂ</th>
                            <th className="p-3">MÀU SẮC</th>
                            <th className="p-3 text-center">KÍCH CỠ BIG SIZE</th>
                            <th className="p-3 text-center">TỒN KHO THỰC TẾ</th>
                            <th className="p-3 text-right">GIÁ BÁN NIÊM YẾT</th>
                            <th className="p-3 pr-4 text-right">THAO TÁC KHO</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {displayedSkus.map((item) => {
                            const qty = item.quantity ?? 0;
                            return (
                              <tr key={item.sku} className="hover:bg-stone-50/70 transition-colors">
                                {/* Mã SKU */}
                                <td className="p-3 pl-4 font-mono font-bold text-brand-800 text-xs">
                                  {item.sku}
                                </td>

                                {/* Màu sắc */}
                                <td className="p-3">
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className="w-2.5 h-2.5 rounded-full border border-stone-300 shrink-0 shadow-2xs"
                                      style={{ backgroundColor: getColorHex(item.color) }}
                                    />
                                    <span className="font-medium text-charcoal-800">{item.color}</span>
                                  </div>
                                </td>

                                {/* Kích cỡ */}
                                <td className="p-3 text-center">
                                  <span className="px-2 py-0.5 rounded-md bg-stone-100 text-charcoal-900 font-mono font-bold text-[11px] border border-stone-200">
                                    {item.size}
                                  </span>
                                </td>

                                {/* Tồn kho */}
                                <td className="p-3 text-center">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold font-mono ${
                                      qty === 0
                                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                        : qty <= 5
                                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    }`}
                                  >
                                    {qty} cái
                                  </span>
                                </td>

                                {/* Giá bán niêm yết */}
                                <td className="p-3 text-right font-semibold text-charcoal-900">
                                  {(item.sellingPrice || p.price).toLocaleString('vi-VN')}₫
                                </td>

                                {/* Thao tác kho */}
                                <td className="p-3 pr-4 text-right">
                                  {onRestockSku && (
                                    <button
                                      type="button"
                                      onClick={() => onRestockSku(item.sku)}
                                      className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-[#5C1D24] text-stone-700 hover:text-white text-[11px] font-bold transition-colors cursor-pointer"
                                    >
                                      Nhập kho / Kiểm kê
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
