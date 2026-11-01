import { useProducts } from '@/modules/product/context/ProductContext';
import { categoryKey, matchesCatalogCategory } from '@/shared/utils/categoryUtils';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Package,
  Plus,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Edit,
  Ruler,
  Tag,
  Check,
  Sparkles,
  Layers,
  CheckCircle2,
  Filter
} from 'lucide-react';
import { Product, StockItem, Size, SupabaseCategory } from '@/shared/types';
import { formatCurrencyInput, parseCurrencyInput } from '@/shared/utils/formatUtils';
import { useToast } from '@/context/ToastContext';
import { supabase, fetchCategoriesFromSupabase } from '@/shared/services/supabaseClient';
import { catalogErrorMessage } from '@/shared/services/catalogService';

export interface MainCategoryConfig {
  dbId?: number;
  id: string;
  code: string;
  title: string;
  image: string;
  description: string;
  sizeRange: string;
  specs: string;
  subCategories: { id: string; name: string; dbId?: number }[];
  defaultModelCount: number;
  defaultStockCount: number;
}

export const MAIN_CATEGORIES_DATA: MainCategoryConfig[] = [
  {
    id: 'ao',
    code: 'AO',
    title: 'Áo',
    image: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800',
    description: 'Dệt kim Pique tổ ong & Cotton chải kỹ co giãn 4 chiều, giấu bụng hiệu quả.',
    sizeRange: 'XL – 5XL (75kg - 138kg)',
    specs: 'Kháng khuẩn Dry-Tech, Cotton chải kỹ co giãn...',
    subCategories: [
      { id: 'ao-thun', name: 'Áo thun' },
      { id: 'polo', name: 'Polo' },
      { id: 'so-mi', name: 'Sơ mi' },
      { id: 'ao-kieu', name: 'Áo kiểu' },
      { id: 'ao-khoac', name: 'Áo khoác' },
    ],
    defaultModelCount: 4,
    defaultStockCount: 340,
  },
  {
    id: 'quan',
    code: 'QUAN-JEANS',
    title: 'Quần & Jeans',
    image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800',
    description: 'Denim & Kaki co giãn công nghệ Flex-Waist cạp chun ẩn co giãn 5cm, đũng sâu không cọ sát.',
    sizeRange: 'XL – 5XL (Vòng bụng 90 - 138cm)',
    specs: 'Denim 12.5oz pha Spandex co giãn, chỉ may gia cố đũng...',
    subCategories: [
      { id: 'jeans', name: 'Jeans' },
      { id: 'kaki', name: 'Kaki' },
      { id: 'quan-tay', name: 'Quần tây' },
      { id: 'short', name: 'Short' },
    ],
    defaultModelCount: 2,
    defaultStockCount: 141,
  },
  {
    id: 'dam',
    code: 'DAM-VAY',
    title: 'Đầm & Váy',
    image: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800',
    description: 'Thiết kế dáng chữ A, xếp ly hạ eo tôn dáng và giấu khuyết điểm bắp tay, bụng dưới cho phái nữ.',
    sizeRange: 'XL – 5XL (68kg - 130kg)',
    specs: 'Vải voan lụa 2 lớp rủ nhẹ, chiết eo bản to che bụng...',
    subCategories: [
      { id: 'dam', name: 'Đầm' },
      { id: 'chan-vay', name: 'Chân váy' },
    ],
    defaultModelCount: 1,
    defaultStockCount: 80,
  },
  {
    id: 'do-bo',
    code: 'DO-BO',
    title: 'Đồ Bộ',
    image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800',
    description: 'Set đồ mặc nhà & vận động thun lạnh dệt kim, thoáng mát không dính rít da khi đổ mồ hôi.',
    sizeRange: 'XL – 5XL (75kg - 135kg)',
    specs: 'Chất thun lạnh dệt kim co giãn 4 chiều, túi sâu tiện lợi...',
    subCategories: [
      { id: 'do-bo-nam', name: 'Đồ bộ nam' },
      { id: 'do-bo-nu', name: 'Đồ bộ nữ' },
    ],
    defaultModelCount: 1,
    defaultStockCount: 60,
  },
];

export interface AddProductCategoryContext {
  mode: 'locked_full' | 'locked_parent' | 'manual';
  parentId?: string;
  parentDbId?: number;
  parentTitle?: string;
  subCategoryName?: string;
  subCategoryDbId?: number;
}

export function buildMergedCategoriesList(dbCats: SupabaseCategory[]): MainCategoryConfig[] {
  if (!dbCats || dbCats.length === 0) return [];
  const rootCats = dbCats.filter((c) => !c.ma_danh_muc_cha);
  const childCats = dbCats.filter((c) => c.ma_danh_muc_cha);
  const mergedList: MainCategoryConfig[] = [];

  MAIN_CATEGORIES_DATA.forEach((defaultCat) => {
    const matchingDb = dbCats.find(
      (c) => !c.ma_danh_muc_cha && (c.code || '').toUpperCase() === defaultCat.code.toUpperCase()
    );
    if (!matchingDb) return;
    const realDbId = matchingDb.ma_danh_muc;
    const dbChildrenForThisRoot = childCats.filter((c) => c.ma_danh_muc_cha === realDbId);

    const subCats = [...defaultCat.subCategories];
    dbChildrenForThisRoot.forEach((dbChild) => {
      const existingIdx = subCats.findIndex(
        (s) =>
          (s.dbId && s.dbId === dbChild.ma_danh_muc) ||
          categoryKey(s.name) === categoryKey(dbChild.ten_danh_muc) ||
          s.id === (dbChild.code || '').toLowerCase().replace(/^ao-so-mi$/, 'so-mi')
      );
      if (existingIdx >= 0) {
        subCats[existingIdx] = {
          ...subCats[existingIdx],
          dbId: dbChild.ma_danh_muc,
          name: dbChild.ten_danh_muc,
        };
      } else {
        subCats.push({
          id: dbChild.code?.toLowerCase() || String(dbChild.ma_danh_muc),
          name: dbChild.ten_danh_muc,
          dbId: dbChild.ma_danh_muc,
        });
      }
    });

    mergedList.push({
      ...defaultCat,
      dbId: realDbId,
      title: matchingDb?.ten_danh_muc || defaultCat.title,
      description: matchingDb?.mo_ta || defaultCat.description,
      subCategories: subCats,
    });
  });

  rootCats.forEach((dbRoot) => {
    const alreadyIncluded = mergedList.some((m) => m.dbId === dbRoot.ma_danh_muc);
    if (!alreadyIncluded) {
      const dbChildren = childCats.filter((c) => c.ma_danh_muc_cha === dbRoot.ma_danh_muc);
      mergedList.push({
        dbId: dbRoot.ma_danh_muc,
        id: dbRoot.code?.toLowerCase() || String(dbRoot.ma_danh_muc),
        code: dbRoot.code?.toUpperCase() || '',
        title: dbRoot.ten_danh_muc,
        image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800',
        description: dbRoot.mo_ta || `Danh mục thời trang Big Size ${dbRoot.ten_danh_muc}.`,
        sizeRange: 'XL – 5XL (75kg - 138kg)',
        specs: 'Chất liệu co giãn 4 chiều may đo công thái học',
        subCategories: dbChildren.map((c) => ({
          id: c.code?.toLowerCase() || String(c.ma_danh_muc),
          name: c.ten_danh_muc,
          dbId: c.ma_danh_muc,
        })),
        defaultModelCount: 0,
        defaultStockCount: 0,
      });
    }
  });

  return mergedList;
}

interface ProductCategoriesTabProps {
  products: Product[];
  inventory: StockItem[];
  onOpenAddProduct: (context?: AddProductCategoryContext | string) => void;
  onOpenEditProduct: (p: Product) => void;
  onUpdateProductPrice: (prodId: string, newPrice: number, newSalePrice?: number) => Promise<void>;
  onSelectSizeChart: (p: Product) => void;
}

export const ProductCategoriesTab: React.FC<ProductCategoriesTabProps> = ({
  products,
  inventory,
  onOpenAddProduct,
  onOpenEditProduct,
  onUpdateProductPrice,
  onSelectSizeChart,
}) => {
  const { showToast } = useToast();

  const { categoryRecords } = useProducts();
  const [categoriesData, setCategoriesData] = useState<MainCategoryConfig[]>([]);
  const categorySaveLock = useRef(false);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const quickPriceSaveLock = useRef(false);
  const [isSavingQuickPrice, setIsSavingQuickPrice] = useState(false);

  // Dynamic load from Supabase Cloud danhmuc table
  const loadCategories = async () => {
    try {
      const dbCats = await fetchCategoriesFromSupabase({ strict: true });
      if (!dbCats || dbCats.length === 0) { setCategoriesData([]); return; }

      const rootCats = dbCats.filter((c) => !c.ma_danh_muc_cha);
      const childCats = dbCats.filter((c) => c.ma_danh_muc_cha);

      const mergedList: MainCategoryConfig[] = [];

      // 1. Process default 4 main categories with high quality assets & styling
      MAIN_CATEGORIES_DATA.forEach((defaultCat) => {
        const matchingDb = dbCats.find(
          (c) => !c.ma_danh_muc_cha && (c.code || '').toUpperCase() === defaultCat.code.toUpperCase()
        );
        if (!matchingDb) return;
        const realDbId = matchingDb.ma_danh_muc;

        // Find child categories from Supabase under this root
        const dbChildrenForThisRoot = childCats.filter((c) => c.ma_danh_muc_cha === realDbId);

        // Merge subcategories without duplicates
        const subCats = [...defaultCat.subCategories];
        dbChildrenForThisRoot.forEach((dbChild) => {
          const existingIdx = subCats.findIndex(
            (s) => (s.dbId && s.dbId === dbChild.ma_danh_muc) || s.name.toLowerCase() === dbChild.ten_danh_muc.toLowerCase() || s.id === (dbChild.code || '').toLowerCase().replace(/^ao-so-mi$/, 'so-mi')
          );
          if (existingIdx >= 0) {
            subCats[existingIdx] = {
              ...subCats[existingIdx],
              dbId: dbChild.ma_danh_muc,
              name: dbChild.ten_danh_muc,
            };
          } else {
            subCats.push({
              id: dbChild.code?.toLowerCase() || String(dbChild.ma_danh_muc),
              name: dbChild.ten_danh_muc,
              dbId: dbChild.ma_danh_muc,
            });
          }
        });

        mergedList.push({
          ...defaultCat,
          dbId: realDbId,
          title: matchingDb?.ten_danh_muc || defaultCat.title,
          description: matchingDb?.mo_ta || defaultCat.description,
          subCategories: subCats,
        });
      });

      // 2. Process any newly added root categories from Supabase
      rootCats.forEach((dbRoot) => {
        const alreadyIncluded = mergedList.some(
          (m) => m.dbId === dbRoot.ma_danh_muc
        );
        if (!alreadyIncluded) {
          const dbChildren = childCats.filter((c) => c.ma_danh_muc_cha === dbRoot.ma_danh_muc);
          mergedList.push({
            dbId: dbRoot.ma_danh_muc,
            id: dbRoot.code?.toLowerCase() || String(dbRoot.ma_danh_muc),
            code: dbRoot.code?.toUpperCase() || '',
            title: dbRoot.ten_danh_muc,
            image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800',
            description: dbRoot.mo_ta || `Danh mục thời trang Big Size ${dbRoot.ten_danh_muc}.`,
            sizeRange: 'XL – 5XL (75kg - 138kg)',
            specs: 'Chất liệu co giãn 4 chiều may đo công thái học',
            subCategories: dbChildren.map((c) => ({
              id: c.code?.toLowerCase() || String(c.ma_danh_muc),
              name: c.ten_danh_muc,
              dbId: c.ma_danh_muc,
            })),
            defaultModelCount: 0,
            defaultStockCount: 0,
          });
        }
      });

      setCategoriesData(mergedList);
    } catch (err) {
      console.warn('Could not load categories from Supabase:', err);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [categoryRecords]);

  // Modal Thêm Danh Mục states (Hỗ trợ phân cấp Cha - Con)
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryCode, setNewCategoryCode] = useState('');
  const [newCategoryParent, setNewCategoryParent] = useState<string>('none');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [newCategorySizeRange, setNewCategorySizeRange] = useState('XL – 5XL (75kg - 138kg)');

  const generateCategoryCode = (name: string) => {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toUpperCase()
      .replace(/[^A-Z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (categorySaveLock.current) return;
    const name = newCategoryName.trim();
    const code = (newCategoryCode.trim() || generateCategoryCode(name)).toUpperCase();
    if (!name) {
      showToast('Thiếu thông tin', newCategoryParent !== 'none' ? 'Vui lòng nhập tên phân loại' : 'Vui lòng nhập tên danh mục', 'error');
      return;
    }
    if (!code) {
      showToast('Thiếu mã định danh', newCategoryParent !== 'none' ? 'Vui lòng nhập mã phân loại' : 'Vui lòng nhập mã danh mục', 'error');
      return;
    }
    if (name.length > 150 || !/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(code) || code.length > 50) {
      showToast(
        'Thông tin chưa hợp lệ',
        newCategoryParent !== 'none'
          ? 'Tên phân loại tối đa 150 ký tự; mã gồm chữ, số và dấu gạch nối, tối đa 50 ký tự.'
          : 'Tên danh mục tối đa 150 ký tự; mã gồm chữ, số và dấu gạch nối, tối đa 50 ký tự.',
        'error'
      );
      return;
    }

    categorySaveLock.current = true;
    setIsSavingCategory(true);
    try {
      if (newCategoryParent !== 'none') {
        const targetParent = categoriesData.find(
          (c) => c.id === newCategoryParent || String(c.dbId) === newCategoryParent
        );
        if (!targetParent) {
          showToast('Lỗi', 'Không tìm thấy danh mục cha', 'error');
          return;
        }

        const parentDbId = targetParent.dbId;
        if (!parentDbId) {
          showToast('Chưa thể lưu', 'Danh mục cha chưa tải được. Vui lòng tải lại trang rồi thử lại.', 'error');
          return;
        }

        const { error: insErr } = await supabase.from('danhmuc').insert({
          code: code,
          ten_danh_muc: name,
          mo_ta: newCategoryDesc.trim() || name,
          trang_thai: 'hoat_dong',
          ma_danh_muc_cha: parentDbId,
        });

        if (insErr) {
          console.error('Supabase category insert error:', insErr);
          showToast('Chưa lưu được danh mục', insErr.code === '23505' ? 'Tên hoặc mã danh mục đã tồn tại.' : 'Vui lòng kiểm tra thông tin và thử lại.', 'error');
          return;
        }

        showToast('Thêm phân loại thành công', `Đã thêm "${name}" vào danh mục ${targetParent.title}`, 'success');
      } else {
        const { error: insErr } = await supabase.from('danhmuc').insert({
          code: code,
          ten_danh_muc: name,
          mo_ta: newCategoryDesc.trim() || name,
          trang_thai: 'hoat_dong',
          ma_danh_muc_cha: null,
        });

        if (insErr) {
          console.error('Supabase root category insert error:', insErr);
          showToast('Chưa lưu được danh mục', insErr.code === '23505' ? 'Tên hoặc mã danh mục đã tồn tại.' : 'Vui lòng kiểm tra thông tin và thử lại.', 'error');
          return;
        }

        showToast('Tạo danh mục thành công', `Đã tạo mới danh mục gốc "${name}" (${code})`, 'success');
      }

      // Re-fetch categories directly from Supabase so state is 100% authoritative
      await loadCategories();

      setNewCategoryName('');
      setNewCategoryCode('');
      setNewCategoryParent('none');
      setNewCategoryDesc('');
      setIsAddCategoryModalOpen(false);
      window.dispatchEvent(new Event('curve:catalog-changed'));
    } catch (err: any) {
      console.error('Error saving category:', err);
      showToast('Lỗi kết nối', 'Chưa thể lưu danh mục. Vui lòng kiểm tra kết nối rồi thử lại.', 'error');
    } finally {
      categorySaveLock.current = false;
      setIsSavingCategory(false);
    }
  };

  // Drilldown state: null = Showing 4 category cards; object = Showing product list for that category/sub
  const [drilldown, setDrilldown] = useState<{
    parentId: string;
    parentTitle: string;
    subCategoryName: string; // 'all' or specific name like 'Áo thun'
  } | null>(null);

  // Search, Status, Size & Sort filters inside drilldown view
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');
  const [sizeFilter, setSizeFilter] = useState<'all' | Size>('all');
  const [sortBy, setSortBy] = useState<'default' | 'price_asc' | 'price_desc' | 'stock_desc' | 'stock_asc' | 'name_asc'>('default');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Quick price modal state
  const [quickPriceProduct, setQuickPriceProduct] = useState<Product | null>(null);
  const [quickSellingPriceInput, setQuickSellingPriceInput] = useState('');
  const [quickSalePriceInput, setQuickSalePriceInput] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isAddCategoryModalOpen && !isSavingCategory) {
          setIsAddCategoryModalOpen(false);
          setNewCategoryName('');
          setNewCategoryCode('');
          setNewCategoryParent('none');
        }
        if (quickPriceProduct && !isSavingQuickPrice) {
          setQuickPriceProduct(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddCategoryModalOpen, isSavingCategory, quickPriceProduct, isSavingQuickPrice]);

  // Helper: check if a product matches a parent category (by DB ID or legacy slug)
  const matchesParentCategory = (p: Product, parentId: string): boolean =>
    matchesCatalogCategory(p, parentId, categoryRecords);

  // Calculate dynamic stats for each main category
  const categoryStats = useMemo(() => {
    const stats: Record<string, { modelCount: number; stockCount: number }> = {};

    categoriesData.forEach((cat) => {
      const prods = products.filter((p) => matchesParentCategory(p, cat.id));
      const modelCount = prods.length;
      const stockCount =
        prods.reduce((sum, p) => sum + (p.variants?.reduce((s, v) => s + (v.stock || 0), 0) || 0), 0) ||
        0;
      stats[cat.id] = { modelCount, stockCount };
    });

    return stats;
  }, [products, categoriesData]);

  // Current category config & available subcategories
  const currentCategoryConfig = useMemo(() => {
    if (!drilldown) return undefined;
    return categoriesData.find((c) => c.id === drilldown.parentId);
  }, [drilldown, categoriesData]);

  const availableSubCategories = useMemo(() => {
    if (!drilldown) return [];
    if (drilldown.parentId === 'all') {
      return categoriesData.flatMap((c) => c.subCategories);
    }
    return currentCategoryConfig?.subCategories || [];
  }, [drilldown, currentCategoryConfig, categoriesData]);

  // Helper: check if a product matches a subcategory name
  const matchesSubcategory = (p: Product, subName: string) => {
    const sub = subName.toLowerCase().trim();
    const subKey = categoryKey(subName);
    const pName = p.name.toLowerCase();
    const pCat = (p.category || '').toLowerCase();
    const pCatName = (p.categoryName || '').toLowerCase().trim();
    const pCatKey = categoryKey(p.categoryName || '');

    // Direct match if database product has categoryName
    if (pCatKey && pCatKey === subKey) {
      return true;
    }
    // If product is explicitly linked to a specific child subcategory in Supabase (parentCategoryId != null),
    // do not fall back to keyword guessing across other subcategories.
    if (p.parentCategoryId != null && pCatKey) {
      return false;
    }

    if (sub === 'áo thun') return pName.includes('thun') || pCat === 'ao-thun';
    if (sub === 'polo') return pName.includes('polo') || pCat === 'polo';
    if (sub === 'sơ mi' || sub === 'áo sơ mi') {
      return (
        pCat === 'so-mi' ||
        pCat === 'ao-so-mi' ||
        pName.includes('sơ mi') ||
        pName.includes('oxford')
      );
    }
    if (sub === 'áo kiểu') return pName.includes('kiểu');
    if (sub === 'áo khoác') return pName.includes('khoác') || pName.includes('blazer') || pCat === 'ao-khoac';
    if (sub === 'jeans') return pName.includes('jean') || pCat === 'quan-jeans';
    if (sub === 'kaki') return pName.includes('kaki') || pName.includes('chinos');
    if (sub === 'quần tây') return pName.includes('tây');
    if (sub === 'short') return pName.includes('short') || pName.includes('lửng');
    if (sub === 'đầm') return pName.includes('đầm') || pCat === 'dam-vay';
    if (sub === 'chân váy') return pName.includes('chân váy');
    if (sub === 'đồ bộ nam') {
      return (pName.includes('bộ') || pName.includes('thể thao') || pCat === 'do-bo') && (p.gender === 'nam' || p.gender === 'unisex');
    }
    if (sub === 'đồ bộ nữ') {
      return (pName.includes('bộ') || pName.includes('thể thao') || pCat === 'do-bo') && p.gender === 'nu';
    }
    return pName.includes(sub) || pCat === sub || pCatName === sub;
  };

  // Helper: Get friendly display category title for a product
  const getProductCategoryTitle = (prod: Product) => {
    if (prod.parentCategoryId) {
      const parentName = categoryRecords.find(c => c.ma_danh_muc === prod.parentCategoryId)?.ten_danh_muc;
      if (parentName && prod.categoryName) {
        return `${parentName} → ${prod.categoryName}`;
      }
    }
    const id = prod.parentCategoryId || prod.categoryId;
    return categoryRecords.find(c => c.ma_danh_muc === id)?.ten_danh_muc || prod.categoryName || 'Chưa phân loại';
  };

  // Subcategory product counts for quick filter pills
  const subCategoryCounts = useMemo(() => {
    if (!drilldown) return {};
    const counts: Record<string, number> = {};

    availableSubCategories.forEach((sub) => {
      const count = products.filter((p) => {
        if (!matchesParentCategory(p, drilldown.parentId)) return false;
        return matchesSubcategory(p, sub.name);
      }).length;

      counts[sub.name] = count;
    });

    return counts;
  }, [drilldown, availableSubCategories, products, categoriesData]);

  // Filter products for the drilldown view
  const filteredProducts = useMemo(() => {
    if (!drilldown) return [];

    return products.filter((p) => {
      const pName = p.name.toLowerCase();

      // 1. Parent category match
      if (!matchesParentCategory(p, drilldown.parentId)) return false;

      // 2. Subcategory match if specified
      if (drilldown.subCategoryName && drilldown.subCategoryName !== 'all') {
        if (!matchesSubcategory(p, drilldown.subCategoryName)) return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = pName.includes(q);
        const matchId = p.id.toLowerCase().includes(q);
        if (!matchName && !matchId) return false;
      }

      // 4. Status filter
      const totalStock = p.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0;
      if (statusFilter === 'in_stock' && totalStock === 0) return false;
      if (statusFilter === 'out_of_stock' && totalStock > 0) return false;

      // 5. Size filter
      if (sizeFilter !== 'all') {
        if (!p.sizes || !p.sizes.includes(sizeFilter)) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'stock_desc') {
        const stockA = a.variants?.reduce((s, v) => s + (v.stock || 0), 0) || 0;
        const stockB = b.variants?.reduce((s, v) => s + (v.stock || 0), 0) || 0;
        return stockB - stockA;
      }
      if (sortBy === 'stock_asc') {
        const stockA = a.variants?.reduce((s, v) => s + (v.stock || 0), 0) || 0;
        const stockB = b.variants?.reduce((s, v) => s + (v.stock || 0), 0) || 0;
        return stockA - stockB;
      }
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name, 'vi');
      return 0;
    });
  }, [drilldown, products, searchQuery, statusFilter, sizeFilter, sortBy, categoriesData]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  // Metrics for drilldown view
  const drilldownMetrics = useMemo(() => {
    if (!drilldown) return { totalInGroup: 0, selling: 0, outOfStock: 0, totalSkus: 0 };
    const inGroup = products.filter((p) => matchesParentCategory(p, drilldown.parentId));

    const selling = inGroup.filter((p) => (p.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0) > 0).length;
    const outOfStock = inGroup.filter((p) => (p.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0) === 0).length;
    const totalSkus = inGroup.reduce((sum, p) => sum + (p.variants?.length || 0), 0) || 0;

    return {
      totalInGroup: inGroup.length,
      selling,
      outOfStock,
      totalSkus,
    };
  }, [drilldown, products, categoriesData]);

  // Handlers for Quick Price Modal
  const handleOpenQuickPrice = (prod: Product) => {
    setQuickPriceProduct(prod);
    setQuickSellingPriceInput(formatCurrencyInput(prod.originalPrice || prod.price));
    setQuickSalePriceInput(prod.originalPrice && prod.originalPrice > prod.price ? formatCurrencyInput(prod.price) : '');
  };

  const handleSaveQuickPrice = async () => {
    if (quickPriceSaveLock.current) return;
    if (!quickPriceProduct) return;
    const cleanSelling = parseCurrencyInput(quickSellingPriceInput);
    const cleanSale = parseCurrencyInput(quickSalePriceInput);

    const newSelling = parseInt(cleanSelling, 10);
    const newSale = cleanSale ? parseInt(cleanSale, 10) : undefined;

    if (!newSelling || newSelling <= 0) {
      showToast('Lỗi nhập giá', 'Vui lòng nhập giá bán hợp lệ lớn hơn 0', 'error');
      return;
    }

    if (newSale !== undefined && (newSale <= 0 || newSale >= newSelling)) {
      showToast('Giá chưa hợp lệ', 'Giá khuyến mãi phải lớn hơn 0 và nhỏ hơn giá niêm yết.', 'error');
      return;
    }
    quickPriceSaveLock.current = true;
    setIsSavingQuickPrice(true);
    try {
      await onUpdateProductPrice(quickPriceProduct.id, newSelling, newSale);
      showToast('Cập nhật giá thành công', `Đã lưu giá bán mới cho ${quickPriceProduct.name}`, 'success');
      setQuickPriceProduct(null);
    } catch (error) {
      console.error('Price save failed:', error);
      showToast('Chưa cập nhật được giá', catalogErrorMessage(error), 'error');
    } finally {
      quickPriceSaveLock.current = false;
      setIsSavingQuickPrice(false);
    }
  };

  // Render Modal Thêm Danh Mục / Phân Loại Mới (Nâng cấp thẩm mỹ chuyên nghiệp)
  const renderAddCategoryModal = () => {
    if (!isAddCategoryModalOpen) return null;
    const isSubCategory = newCategoryParent !== 'none';
    const selectedParentTitle = categoriesData.find(c => c.id === newCategoryParent || String(c.dbId) === newCategoryParent)?.title;
    return createPortal(
      <div
        className="fixed inset-0 z-[9999] bg-stone-900/45 flex items-center justify-center p-4 sm:p-6 animate-fadeIn"
        onClick={() => {
          if (!isSavingCategory) {
            setIsAddCategoryModalOpen(false);
            setNewCategoryName('');
            setNewCategoryCode('');
            setNewCategoryParent('none');
          }
        }}
      >
        <div
          className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200/80 flex flex-col animate-scaleIn overflow-hidden max-h-[88vh] my-auto text-left"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header với gradient Burgundy tinh tế */}
          <div className="relative px-6 sm:px-7 py-5 bg-gradient-to-br from-[#5C1D24] to-[#3A1018] shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm text-white flex items-center justify-center border border-white/10">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {isSubCategory ? 'Thêm Phân Loại Sản Phẩm' : 'Thêm Danh Mục Mới'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddCategoryModalOpen(false);
                  setNewCategoryName('');
                  setNewCategoryCode('');
                  setNewCategoryParent('none');
                  setNewCategoryDesc('');
                }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Form body */}
          <form onSubmit={handleSaveCategory} className="px-6 sm:px-7 py-5 sm:py-6 space-y-4.5 overflow-y-auto flex-1">
            {/* Huy hiệu chỉ dẫn danh mục trực thuộc khi thêm phân loại */}
            {isSubCategory && (
              <div className="flex items-center justify-between px-4 py-2.5 bg-stone-50 rounded-xl border border-stone-200/90 text-xs">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#5C1D24]" />
                  <span className="text-stone-500 font-medium">Danh mục trực thuộc:</span>
                </div>
                <span className="font-bold text-[#5C1D24] px-2.5 py-0.5 bg-[#5C1D24]/10 rounded-lg">
                  {selectedParentTitle || 'Danh mục hiện tại'}
                </span>
              </div>
            )}

            {/* Tên Danh Mục / Tên Phân Loại */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-bold text-charcoal-800 mb-2">
                <Tag className="w-3.5 h-3.5 text-[#5C1D24]" />
                {isSubCategory ? 'Tên Phân Loại' : 'Tên Danh Mục'} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={newCategoryName}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewCategoryName(val);
                  if (!newCategoryCode || newCategoryCode === generateCategoryCode(newCategoryName)) {
                    setNewCategoryCode(generateCategoryCode(val));
                  }
                }}
                placeholder={isSubCategory ? 'Ví dụ: Áo Thun Oversize, Áo Polo Big Size...' : 'Ví dụ: Áo Big Size, Đồ Thể Thao...'}
                className="w-full px-4 py-3 bg-stone-50/80 border border-stone-200 rounded-xl text-sm text-charcoal-900 placeholder:text-stone-400 focus:outline-none focus:border-[#5C1D24] focus:ring-1 focus:ring-[#5C1D24]/20 focus:bg-white transition-colors"
              />
            </div>

            {/* Mã Định Danh */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-bold text-charcoal-800 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                Mã Định Danh <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={newCategoryCode}
                onChange={(e) => setNewCategoryCode(e.target.value.toUpperCase())}
                placeholder={isSubCategory ? 'AO-THUN-OVERSIZE' : 'AO-BIGSIZE'}
                className="w-full px-4 py-3 bg-stone-50/80 border border-stone-200 rounded-xl text-sm font-mono font-bold text-charcoal-900 placeholder:text-stone-400 placeholder:font-normal focus:outline-none focus:border-[#5C1D24] focus:ring-1 focus:ring-[#5C1D24]/20 focus:bg-white uppercase transition-colors"
              />
              <p className="text-[11px] text-stone-500 mt-1.5">
                Mã định danh tự động tạo theo tên, có thể tùy chỉnh nếu cần.
              </p>
            </div>

            {/* Mô Tả */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-bold text-charcoal-800 mb-2">
                <Edit className="w-3.5 h-3.5 text-stone-500" />
                {isSubCategory ? 'Mô Tả Phân Loại' : 'Mô Tả Danh Mục'}
              </label>
              <textarea
                rows={3}
                value={newCategoryDesc}
                onChange={(e) => setNewCategoryDesc(e.target.value)}
                placeholder={isSubCategory ? 'Mô tả đặc điểm phom dáng và phong cách của phân loại này...' : 'Mô tả đặc tính, phom dáng và đối tượng khách hàng...'}
                className="w-full px-4 py-3 bg-stone-50/80 border border-stone-200 rounded-xl text-sm text-charcoal-900 placeholder:text-stone-400 focus:outline-none focus:border-[#5C1D24] focus:ring-1 focus:ring-[#5C1D24]/20 focus:bg-white resize-none transition-colors leading-relaxed"
              />
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
              <button
                type="button"
                onClick={() => {
                  setIsAddCategoryModalOpen(false);
                  setNewCategoryName('');
                  setNewCategoryCode('');
                  setNewCategoryParent('none');
                  setNewCategoryDesc('');
                }}
                className="px-5 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 hover:border-stone-300 text-sm font-semibold transition-colors cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="submit"
                disabled={isSavingCategory}
                className="px-6 py-2.5 rounded-xl bg-[#5C1D24] hover:bg-[#48161C] text-white text-sm font-bold shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSavingCategory ? 'Đang lưu…' : (isSubCategory ? 'Lưu Phân Loại' : 'Lưu Danh Mục')}</span>
              </button>
            </div>
          </form>
        </div>
      </div>,
      document.body
    );
  };

  // ================= SCENARIO A: SHOW 4 MAIN CATEGORY CARDS (SCREENSHOT 1, 2, 6) =================
  if (!drilldown) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto animate-fadeIn">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-charcoal-900 flex items-center gap-2">
              <Package className="w-6 h-6 text-[#5C1D24]" />
              <span>Quản Lý Danh Mục Sản Phẩm</span>
            </h1>
          </div>
          <button
            type="button"
            onClick={() => {
              setNewCategoryParent('none');
              setIsAddCategoryModalOpen(true);
            }}
            className="px-4 py-2.5 bg-[#5C1D24] hover:bg-[#48161C] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Danh Mục Mới</span>
          </button>
        </div>

        {/* Category Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {categoriesData.map((cat) => {
            const stats = categoryStats[cat.id] || {
              modelCount: cat.defaultModelCount,
              stockCount: cat.defaultStockCount,
            };

            return (
              <div
                key={cat.id}
                className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-2xs hover:border-stone-300 hover:shadow-xs transition-all duration-200 flex flex-col justify-between"
              >
                {/* Banner Image with Overlay (Theo đúng thiết kế khách hàng) */}
                <div className="relative h-60 sm:h-64 overflow-hidden bg-stone-100 group">
                  <img
                    src={cat.image}
                    alt={cat.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Gradient Overlay để hiển thị chữ rõ nét */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent flex flex-col justify-end p-5 sm:p-6 pointer-events-none">
                    {/* Mã Danh Mục Badge */}
                    <div className="mb-1.5">
                      <span className="inline-block px-2.5 py-0.5 rounded bg-[#5C1D24] text-white text-[10px] font-bold font-mono tracking-wider uppercase shadow-xs">
                        {cat.code}
                      </span>
                    </div>

                    {/* Tên Danh Mục */}
                    <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight drop-shadow-sm">
                      {cat.title}
                    </h3>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      {cat.description}
                    </p>

                    {/* Dải size chuẩn - Căn đối xứng 2 đầu theo mockup */}
                    <div className="flex items-center justify-between pt-3.5 mt-3.5 border-t border-stone-100 text-xs">
                      <span className="text-stone-400 text-[11px]">Dải size chuẩn:</span>
                      <strong className="text-charcoal-800 font-semibold">{cat.sizeRange}</strong>
                    </div>
                  </div>

                  {/* Khung Phân Loại Sản Phẩm (Đồng nhất chuẩn thiết kế Ảnh 1) */}
                  <div className="p-4 bg-stone-50/90 rounded-2xl border border-stone-200/90 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-charcoal-900 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-[#5C1D24]" />
                        <span>Phân Loại Sản Phẩm:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setNewCategoryParent(cat.id);
                          setIsAddCategoryModalOpen(true);
                        }}
                        className="text-[11px] font-bold text-[#5C1D24] hover:text-[#48161C] flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Thêm phân loại</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-0.5">
                      {cat.subCategories.map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => {
                            setDrilldown({
                              parentId: cat.id,
                              parentTitle: cat.title,
                              subCategoryName: sub.name,
                            });
                            setSearchQuery('');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 text-stone-700 font-medium text-xs border border-stone-200 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>{sub.name}</span>
                          <span className="text-stone-400 text-xs">→</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Stats */}
                  <div className="pt-2 flex items-center justify-between border-t border-stone-100">
                    <div className="flex items-center gap-6 text-xs">
                      <div>
                        <span className="text-stone-400 text-[11px] block">Mẫu mã</span>
                        <strong className="text-charcoal-900 font-bold">{stats.modelCount} mẫu</strong>
                      </div>
                      <div>
                        <span className="text-stone-400 text-[11px] block">Tồn kho</span>
                        <strong className="text-emerald-700 font-bold">{stats.stockCount} cái</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {renderAddCategoryModal()}
      </div>
    );
  }

  // ================= SCENARIO B: DRILLDOWN PRODUCT LIST VIEW (SCREENSHOT 3) =================
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fadeIn">
      {/* Top Nav: Back button + Breadcrumb contextual badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200">
        <button
          type="button"
          onClick={() => {
            setDrilldown(null);
            setSearchQuery('');
            setStatusFilter('all');
            setSizeFilter('all');
            setSortBy('default');
            setCurrentPage(1);
          }}
          className="px-4 py-2 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-bold flex items-center gap-2 shadow-2xs transition-colors cursor-pointer self-start"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Trở lại danh mục sản phẩm</span>
        </button>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-stone-500 font-medium">Đang xem:</span>
          <span className="px-2.5 py-1 rounded-lg bg-[#5C1D24]/10 text-[#5C1D24] font-bold">
            Danh mục: {drilldown.parentTitle}
          </span>
          {drilldown.subCategoryName !== 'all' && (
            <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 font-bold flex items-center gap-1">
              Phân loại: {drilldown.subCategoryName}
              <button
                type="button"
                onClick={() => {
                  setDrilldown(prev => prev ? { ...prev, subCategoryName: 'all' } : null);
                  setCurrentPage(1);
                }}
                className="hover:text-rose-600 cursor-pointer ml-0.5"
                title="Bỏ lọc phân loại"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {sizeFilter !== 'all' && (
            <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 font-bold flex items-center gap-1">
              Size: {sizeFilter}
              <button
                type="button"
                onClick={() => {
                  setSizeFilter('all');
                  setCurrentPage(1);
                }}
                className="hover:text-rose-600 cursor-pointer ml-0.5"
                title="Bỏ lọc size"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {(drilldown.subCategoryName !== 'all' || searchQuery || statusFilter !== 'all' || sizeFilter !== 'all' || sortBy !== 'default') && (
            <button
              type="button"
              onClick={() => {
                setDrilldown(prev => prev ? { ...prev, subCategoryName: 'all' } : null);
                setSearchQuery('');
                setStatusFilter('all');
                setSizeFilter('all');
                setSortBy('default');
                setCurrentPage(1);
              }}
              className="text-stone-400 hover:text-[#5C1D24] text-xs underline font-semibold ml-1 cursor-pointer transition-colors"
            >
              Xóa lọc
            </button>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-[#5C1D24]" />
            <span>Danh Sách Sản Phẩm Big Size</span>
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Quản lý kho mẫu, cấu hình dải kích cỡ XL–5XL, chất liệu và giá niêm yết
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!drilldown || drilldown.parentId === 'all') {
              onOpenAddProduct({ mode: 'manual' });
              return;
            }
            const resolvedParentTitle = currentCategoryConfig?.title || drilldown.parentTitle;
            const resolvedParentDbId = currentCategoryConfig?.dbId;
            if (drilldown.subCategoryName && drilldown.subCategoryName !== 'all') {
              const matchedSub = availableSubCategories.find(
                (s) => categoryKey(s.name) === categoryKey(drilldown.subCategoryName)
              );
              onOpenAddProduct({
                mode: 'locked_full',
                parentId: drilldown.parentId,
                parentDbId: resolvedParentDbId,
                parentTitle: resolvedParentTitle,
                subCategoryName: matchedSub?.name || drilldown.subCategoryName,
                subCategoryDbId: matchedSub?.dbId,
              });
            } else {
              onOpenAddProduct({
                mode: 'locked_parent',
                parentId: drilldown.parentId,
                parentDbId: resolvedParentDbId,
                parentTitle: resolvedParentTitle,
              });
            }
          }}
          className="px-4 py-2.5 bg-[#5C1D24] hover:bg-[#48161C] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Sản Phẩm Mới</span>
        </button>
      </div>

      {/* Filter and Metric Bar */}
      <div className="bg-white rounded-2xl border border-stone-200/90 p-4 shadow-2xs space-y-3.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5 flex-wrap">
          {/* Search Input with Clear Button */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm kiếm theo tên sản phẩm, mã ID (ví dụ: prod-01, polo, sơ mi)..."
              className="w-full pl-10 pr-9 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-hidden focus:border-[#5C1D24] focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Controls Cluster */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Dropdown */}
            <select
              value={drilldown.parentId}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'all') {
                  setDrilldown({
                    parentId: 'all',
                    parentTitle: 'Tất Cả Danh Mục',
                    subCategoryName: 'all',
                  });
                } else {
                  const newParent = categoriesData.find((c) => c.id === val);
                  if (newParent) {
                    setDrilldown({
                      parentId: newParent.id,
                      parentTitle: newParent.title,
                      subCategoryName: 'all',
                    });
                  }
                }
                setSearchQuery('');
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-[#5C1D24] cursor-pointer"
            >
              <option value="all">Tất cả danh mục</option>
              {categoriesData.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.title}
                </option>
              ))}
            </select>

            {/* Big Size Range Filter */}
            <select
              value={sizeFilter}
              onChange={(e) => {
                setSizeFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-[#5C1D24] cursor-pointer"
            >
              <option value="all">Tất cả kích cỡ</option>
              {(['XL', '2XL', '3XL', '4XL', '5XL'] as Size[]).map((sz) => (
                <option key={sz} value={sz}>
                  Cỡ {sz}
                </option>
              ))}
            </select>

            {/* Stock Status Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-[#5C1D24] cursor-pointer"
            >
              <option value="all">Tất cả tình trạng</option>
              <option value="in_stock">Còn hàng</option>
              <option value="out_of_stock">Hết hàng</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as any);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-[#5C1D24] cursor-pointer"
            >
              <option value="default">Sắp xếp mặc định</option>
              <option value="price_asc">Giá: Thấp → Cao</option>
              <option value="price_desc">Giá: Cao → Thấp</option>
              <option value="stock_desc">Tồn kho: Nhiều nhất</option>
              <option value="stock_asc">Tồn kho: Sắp hết</option>
              <option value="name_asc">Tên: A → Z</option>
            </select>

            {(searchQuery || drilldown.subCategoryName !== 'all' || statusFilter !== 'all' || sizeFilter !== 'all' || sortBy !== 'default') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setDrilldown(prev => prev ? { ...prev, subCategoryName: 'all' } : null);
                  setStatusFilter('all');
                  setSizeFilter('all');
                  setSortBy('default');
                  setCurrentPage(1);
                }}
                className="text-xs font-bold text-rose-600 hover:underline px-2 cursor-pointer flex items-center gap-1 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
                <span>Xóa lọc</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Subcategory Filter Pills (Nút bấm nhanh 1 chạm kèm số lượng) */}
        {availableSubCategories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 filter-custom-scrollbar">
            <span className="text-xs font-bold text-stone-500 whitespace-nowrap flex items-center gap-1.5 mr-1">
              <Filter className="w-3.5 h-3.5 text-[#5C1D24]" />
              <span>Phân loại nhanh:</span>
            </span>

            <button
              type="button"
              onClick={() => {
                setDrilldown(prev => prev ? { ...prev, subCategoryName: 'all' } : null);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                drilldown.subCategoryName === 'all'
                  ? 'bg-[#5C1D24] text-white shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-charcoal-700'
              }`}
            >
              <span>Tất cả</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                drilldown.subCategoryName === 'all' ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-600'
              }`}>
                {drilldownMetrics.totalInGroup}
              </span>
            </button>

            {availableSubCategories.map((sub) => {
              const isSelected = drilldown.subCategoryName === sub.name;
              const count = subCategoryCounts[sub.name] || 0;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => {
                    setDrilldown(prev => prev ? { ...prev, subCategoryName: sub.name } : null);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#5C1D24] text-white shadow-xs'
                      : 'bg-stone-100 hover:bg-stone-200 text-charcoal-700'
                  }`}
                >
                  <span>{sub.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-600'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Metric Summary Line (Theo Screenshot 3) */}
        <div className="flex items-center gap-2 pt-2 border-t border-stone-100 flex-wrap text-xs text-stone-500">
          <span>
            Hiển thị: <strong className="text-charcoal-900">{filteredProducts.length}</strong> / {drilldownMetrics.totalInGroup} mẫu
          </span>
          <span>•</span>
          <span>
            Đang bán: <strong className="text-emerald-700">{drilldownMetrics.selling}</strong>
          </span>
          <span>•</span>
          <span>
            Hết hàng: <strong className="text-rose-700">{drilldownMetrics.outOfStock}</strong>
          </span>
          <span>•</span>
          <span>
            Tổng SKU trực thuộc: <strong className="text-stone-700 font-mono">{drilldownMetrics.totalSkus} SKU</strong>
          </span>
        </div>
      </div>

      {/* Product Table (Screenshot 3) */}
      <div className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden shadow-2xs">
        {filteredProducts.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Package className="w-12 h-12 text-stone-300 mx-auto" />
            <h4 className="text-sm font-bold text-charcoal-700">Không tìm thấy sản phẩm phù hợp bộ lọc</h4>
            <p className="text-xs text-stone-400">Thử thay đổi từ khóa tìm kiếm, phân loại hoặc chọn kích cỡ khác</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setDrilldown(prev => prev ? { ...prev, subCategoryName: 'all' } : null);
                setStatusFilter('all');
                setSizeFilter('all');
                setSortBy('default');
                setCurrentPage(1);
              }}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-charcoal-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Khôi phục tất cả bộ lọc
            </button>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="p-4 pl-6">SẢN PHẨM & MÃ ID</th>
                <th className="p-4">DANH MỤC</th>
                <th className="p-4">DẢI SIZE BIG SIZE</th>
                <th className="p-4">GIÁ NIÊM YẾT</th>
                <th className="p-4 text-center">TỒN KHO</th>
                <th className="p-4 pr-6 text-right">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {paginatedProducts.map((p) => {
                const totalStock = p.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0;
                const hasDiscount = Boolean((p.discountPercent && p.discountPercent > 0) || (p.originalPrice && p.originalPrice > p.price));
                const originalPrice = p.originalPrice || p.price;
                const discountPct = p.discountPercent || Math.round((1 - p.price / originalPrice) * 100);

                return (
                  <tr key={p.id} className="hover:bg-stone-50/60 transition-colors">
                    {/* Cột 1: Sản phẩm & Mã ID */}
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.images?.[0] || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=200'}
                          alt={p.name}
                          className="w-12 h-12 object-cover rounded-xl shrink-0 border border-stone-200 shadow-2xs"
                        />
                        <div>
                          <span className="font-bold text-charcoal-900 block leading-tight">{p.name}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-stone-400 text-[11px] font-mono">{p.id}</span>
                            <span className="text-stone-300">•</span>
                            <span className="text-stone-500 text-[11px] font-medium">{p.variants?.length || 6} SKU</span>
                            {p.colors && p.colors.length > 0 && (
                              <>
                                <span className="text-stone-300">•</span>
                                <div className="flex items-center gap-1" title={p.colors.map(c => c.name).join(', ')}>
                                  {p.colors.slice(0, 4).map((c, idx) => (
                                    <span
                                      key={idx}
                                      className="w-2.5 h-2.5 rounded-full border border-stone-300 shrink-0 shadow-2xs"
                                      style={{ backgroundColor: c.hex || '#333333' }}
                                    />
                                  ))}
                                  {p.colors.length > 4 && (
                                    <span className="text-[10px] text-stone-500 font-bold">+{p.colors.length - 4}</span>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Cột 2: Danh Mục */}
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-lg bg-stone-100 font-semibold text-charcoal-700 text-[11px]">
                        {getProductCategoryTitle(p)}
                      </span>
                    </td>

                    {/* Cột 3: Dải Size Big Size */}
                    <td className="p-4">
                      <div className="flex gap-1 flex-wrap">
                        {p.sizes.map((s) => (
                          <span
                            key={s}
                            className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold border ${
                              sizeFilter === s
                                ? 'bg-[#5C1D24] text-white border-[#5C1D24]'
                                : 'bg-stone-100 text-charcoal-800 border-stone-200'
                            }`}
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Cột 4: Giá Niêm Yết */}
                    <td className="p-4">
                      <div>
                        <span className="font-bold text-charcoal-900 block text-xs">
                          {p.price.toLocaleString('vi-VN')}₫
                        </span>
                        {hasDiscount && (
                          <div className="flex items-center gap-1.5 text-[10px] text-stone-400 mt-0.5">
                            <span className="line-through">{originalPrice.toLocaleString('vi-VN')}₫</span>
                            <span className="px-1 py-0.2 bg-rose-50 text-rose-600 rounded font-bold">
                              -{discountPct}%
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Cột 5: Tồn Kho */}
                    <td className="p-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                          totalStock > 0
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${totalStock > 0 ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                        <span>{totalStock}</span>
                      </span>
                    </td>

                    {/* Cột 6: Thao Tác (Bảng Size, Đổi Giá, Sửa - Đúng như Screenshot 3) */}
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSelectSizeChart(p)}
                          className="px-2.5 py-1 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                          title="Xem & cấu hình bảng size"
                        >
                          Bảng Size
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenQuickPrice(p)}
                          className="px-2.5 py-1 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                          title="Cập nhật nhanh giá bán niêm yết"
                        >
                          Đổi Giá
                        </button>

                        <button
                          type="button"
                          onClick={() => onOpenEditProduct(p)}
                          className="px-2.5 py-1 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                          title="Chỉnh sửa chi tiết thông tin sản phẩm"
                        >
                          Sửa
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Bar (Phân Trang Khi Có Nhiều Sản Phẩm) */}
      {filteredProducts.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200/90 p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3 text-stone-500 flex-wrap">
            <span>
              Hiển thị <strong>{Math.min((currentPage - 1) * pageSize + 1, filteredProducts.length)} - {Math.min(currentPage * pageSize, filteredProducts.length)}</strong> trên tổng số <strong>{filteredProducts.length}</strong> sản phẩm
            </span>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <span>Mỗi trang:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 bg-stone-50 border border-stone-200 rounded-lg text-xs font-semibold cursor-pointer focus:outline-hidden focus:border-[#5C1D24]"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="p-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Trang trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                .map((page, idx, arr) => {
                  const prevPage = arr[idx - 1];
                  const hasGap = prevPage && page - prevPage > 1;
                  return (
                    <React.Fragment key={page}>
                      {hasGap && <span className="px-1 text-stone-400">...</span>}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                          currentPage === page
                            ? 'bg-[#5C1D24] text-white shadow-xs'
                            : 'bg-white border border-stone-200 hover:bg-stone-50 text-charcoal-700'
                        }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="p-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Trang sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Quick Price Modal (Khi ấn Đổi Giá) */}
      {quickPriceProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-900/45 animate-fadeIn"
          onClick={() => setQuickPriceProduct(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-stone-200 space-y-4 animate-scaleUp my-auto text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-charcoal-900">Cập Nhật Giá Bán Niêm Yết</h3>
                  <p className="text-[11px] text-stone-500 font-mono">{quickPriceProduct.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickPriceProduct(null)}
                className="text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-3">
              <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
                <img
                  src={quickPriceProduct.images?.[0]}
                  alt=""
                  className="w-10 h-10 object-cover rounded-lg border border-stone-200"
                />
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-charcoal-900 block truncate">{quickPriceProduct.name}</span>
                  <span className="text-stone-500 text-[11px]">
                    Giá hiện tại: {quickPriceProduct.price.toLocaleString('vi-VN')}₫
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Giá bán niêm yết (VNĐ):
                </label>
                <input
                  type="text"
                  value={quickSellingPriceInput}
                  onChange={(e) => setQuickSellingPriceInput(formatCurrencyInput(e.target.value))}
                  placeholder="Ví dụ: 390.000"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 font-bold text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Giá khuyến mãi (Optional - VNĐ):
                </label>
                <input
                  type="text"
                  value={quickSalePriceInput}
                  onChange={(e) => setQuickSalePriceInput(formatCurrencyInput(e.target.value))}
                  placeholder="Để trống nếu không giảm giá"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 font-bold text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="flex gap-2.5 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setQuickPriceProduct(null)}
                className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveQuickPrice}
                disabled={isSavingQuickPrice}
                className="flex-1 py-2.5 bg-[#5C1D24] hover:bg-[#48161C] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
              >
                {isSavingQuickPrice ? 'Đang lưu…' : 'Lưu Thay Đổi'}
              </button>
            </div>
          </div>
        </div>
      )}
      {renderAddCategoryModal()}
    </div>
  );
};
