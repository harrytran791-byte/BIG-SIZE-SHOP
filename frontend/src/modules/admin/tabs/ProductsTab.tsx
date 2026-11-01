import { formatCurrencyInput, parseCurrencyInput } from '@/shared/utils/formatUtils';
import { categoryKey } from '@/shared/utils/categoryUtils';
import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Trash2,
  Image as ImageIcon,
  Crop,
  Check,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Tag,
  Package,
  Palette,
  Boxes
} from 'lucide-react';
import { PRESET_FASHION_COLORS, getColorHex, FashionColor } from '@/shared/constants/colorConfig';
import { Product, Size, StockItem, SupabaseCategory } from '@/shared/types';
import { useProducts } from '../../product/context/ProductContext';
import { useInventory } from '../../inventory/context/InventoryContext';
import { useToast } from '@/shared/context/ToastContext';
import { fetchCategoriesFromSupabase, supabase } from '@/shared/services/supabaseClient';
import { ConfirmModal } from '@/shared/components/ConfirmModal';
import { ProductCategoriesTab, AddProductCategoryContext, buildMergedCategoriesList } from './ProductCategoriesTab';
import { VariantsAccordionTab } from './VariantsAccordionTab';
import { SizeChartsTab } from './SizeChartsTab';
import { ProductSubTab } from '../layout/AdminSidebar';
import { catalogErrorMessage, ensureCatalogSubcategory, saveCatalogProduct, updateCatalogPrice } from '@/shared/services/catalogService';

interface ProductsTabProps {
  productSubTab: ProductSubTab;
  onSelectProductSubTab: (subTab: ProductSubTab) => void;
  onNavigateToInventory?: () => void;
  onRestockSku?: (sku: string) => void;
  appendAuditLog?: (
    action: string,
    category: string,
    targetCode: string,
    targetDesc: string,
    result?: 'success' | 'denied',
    reason?: string
  ) => void;
}

export const ProductsTab: React.FC<ProductsTabProps> = ({
  productSubTab,
  onSelectProductSubTab,
  onNavigateToInventory,
  onRestockSku,
  appendAuditLog
}) => {
  const { products, categoryRecords, refreshProducts } = useProducts();
  const { inventory, refreshInventory } = useInventory();
  const { showToast } = useToast();

  const [productList, setProductList] = useState<Product[]>(products);
  const [dbCategories, setDbCategories] = useState<SupabaseCategory[]>([]);
  const productSaveLock = useRef(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [draftId, setDraftId] = useState<number | undefined>();
  const [formColor, setFormColor] = useState('');
  const [selectedColors, setSelectedColors] = useState<{ name: string; hex: string }[]>([
    { name: 'Đen Huyền Bí', hex: '#18181B' }
  ]);
  const [customColorName, setCustomColorName] = useState('');
  const [customColorHex, setCustomColorHex] = useState('#18181B');

  // Category & Subcategory resolution states
  const [categoryMode, setCategoryMode] = useState<'locked_full' | 'locked_parent' | 'manual'>('manual');
  const [selectedParentDbId, setSelectedParentDbId] = useState<string>('1');
  const [selectedParentTitle, setSelectedParentTitle] = useState<string>('Áo');
  const [selectedSubCategoryName, setSelectedSubCategoryName] = useState<string>('Áo thun');
  const [selectedSubCategoryDbId, setSelectedSubCategoryDbId] = useState<string>('');

  // Initial stock per variant (${size}__${color}) when creating a new product
  const [variantInitialStocks, setVariantInitialStocks] = useState<Record<string, string>>({});
  const [quickFillStock, setQuickFillStock] = useState<string>('');

  useEffect(() => { setDbCategories(categoryRecords); }, [categoryRecords]);

  // Sync products when useProducts updates
  useEffect(() => {
    setProductList(products);
  }, [products]);

  const mergedCategories = React.useMemo(
    () => buildMergedCategoriesList(dbCategories),
    [dbCategories]
  );

  const activeParentConfig = React.useMemo(
    () => mergedCategories.find((c) => String(c.dbId) === selectedParentDbId) || mergedCategories[0],
    [mergedCategories, selectedParentDbId]
  );

  const availableSubCategories = React.useMemo(
    () => activeParentConfig?.subCategories || [],
    [activeParentConfig]
  );

  // Danh sách tùy chọn danh mục động gom theo Cây Cha - Con
  const categoryOptions = React.useMemo(() => {
    if (dbCategories.length === 0) return [];

    const parents = dbCategories.filter((c) => !c.ma_danh_muc_cha);
    const result: { id: string; name: string; isChild: boolean }[] = [];

    parents.forEach((p) => {
      result.push({
        id: String(p.ma_danh_muc),
        name: `${p.ten_danh_muc} (Danh mục gốc)`,
        isChild: false
      });
      const children = dbCategories.filter((c) => c.ma_danh_muc_cha === p.ma_danh_muc);
      children.forEach((ch) => {
        result.push({
          id: String(ch.ma_danh_muc),
          name: `  ↳ ${ch.ten_danh_muc} (Thuộc ${p.ten_danh_muc})`,
          isChild: true
        });
      });
    });

    // Bổ sung các danh mục mồ côi (nếu có)
    const listedIds = new Set(result.map((r) => r.id));
    dbCategories.forEach((c) => {
      if (!listedIds.has(String(c.ma_danh_muc))) {
        result.push({
          id: String(c.ma_danh_muc),
          name: c.ten_danh_muc,
          isChild: !!c.ma_danh_muc_cha
        });
      }
    });

    return result;
  }, [dbCategories]);

  // Product modal states
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('1');
  const [formSellingPrice, setFormSellingPrice] = useState<string>('390000');
  const [formImportPrice, setFormImportPrice] = useState<string>('220000');
  const [formDiscountPercent, setFormDiscountPercent] = useState<string>('');
  const [formSalePrice, setFormSalePrice] = useState<string>('');
  const [formMaterial, setFormMaterial] = useState('');
  const [formShortDesc, setFormShortDesc] = useState('');
  const [formSelectedSizes, setFormSelectedSizes] = useState<Size[]>(['XL', '2XL', '3XL', '4XL', '5XL']);
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formImages, setFormImages] = useState<string[]>([]);
  const [newImageInput, setNewImageInput] = useState('');

  // Interactive Image Cropper States
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string>('');
  const [cropAspectRatio, setCropAspectRatio] = useState<'3:4' | '1:1'>('3:4');
  const [cropZoom, setCropZoom] = useState<number>(1);
  const [cropPan, setCropPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cropRotation, setCropRotation] = useState<number>(0);
  const [isDraggingCrop, setIsDraggingCrop] = useState<boolean>(false);
  const [cropDragStart, setCropDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cropEditingIndex, setCropEditingIndex] = useState<number | null>(null);

  // Detail Modal & Confirm Delete State
  const [selectedProductSizeChart, setSelectedProductSizeChart] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // 1. Chống mất dữ liệu khi Quản lý đang soạn sản phẩm mà vô tình F5
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isProductModalOpen) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isProductModalOpen]);

  // Đóng modal bằng phím Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isCropModalOpen) {
          setIsCropModalOpen(false);
          return;
        }
        if (selectedProductSizeChart) {
          setSelectedProductSizeChart(null);
          return;
        }
        if (isProductModalOpen && !isSavingProduct) {
          setIsProductModalOpen(false);
          return;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCropModalOpen, selectedProductSizeChart, isProductModalOpen, isSavingProduct]);

  // 2. Bấm nút Quay lại (Back) thì đóng modal sản phẩm thay vì rời trang
  useEffect(() => {
    if (isProductModalOpen) {
      window.history.pushState({ modal: 'product-modal' }, '');
      const handlePopState = () => {
        setIsProductModalOpen(false);
      };
      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [isProductModalOpen]);

  const handleTogglePresetColor = (preset: FashionColor) => {
    setSelectedColors((prev) => {
      const exists = prev.some((c) => c.name.toLowerCase() === preset.name.toLowerCase());
      if (exists) {
        if (prev.length <= 1) {
          showToast('Thông báo', 'Sản phẩm cần có ít nhất một màu sắc.', 'info');
          return prev;
        }
        return prev.filter((c) => c.name.toLowerCase() !== preset.name.toLowerCase());
      }
      return [...prev, { name: preset.name, hex: preset.hex }];
    });
  };

  const handleAddCustomColor = () => {
    const trimmed = customColorName.trim();
    if (!trimmed) {
      showToast('Thiếu thông tin', 'Vui lòng nhập tên màu sắc.', 'error');
      return;
    }
    if (trimmed.length > 50) {
      showToast('Tên quá dài', 'Tên màu sắc tối đa 50 ký tự.', 'error');
      return;
    }
    const exists = selectedColors.some((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      showToast('Màu đã tồn tại', `Màu “${trimmed}” đã có trong danh sách.`, 'info');
      return;
    }
    const hex = customColorHex || getColorHex(trimmed);
    setSelectedColors((prev) => [...prev, { name: trimmed, hex }]);
    setCustomColorName('');
    showToast('Đã thêm màu', `Đã thêm màu “${trimmed}” vào sản phẩm.`, 'success');
  };

  const handleRemoveColor = (colorName: string) => {
    if (selectedColors.length <= 1) {
      showToast('Thông báo', 'Sản phẩm cần giữ lại ít nhất một màu sắc.', 'info');
      return;
    }
    setSelectedColors((prev) => prev.filter((c) => c.name !== colorName));
  };

  const handleOpenAddProduct = (presetContext?: AddProductCategoryContext | string) => {
    setDraftId(undefined);
    setFormColor('');
    setSelectedColors([{ name: 'Đen Huyền Bí', hex: '#18181B' }]);
    setCustomColorName('');
    setCustomColorHex('#18181B');
    setEditingProduct(null);
    setFormName('');
    setVariantInitialStocks({});
    setQuickFillStock('');

    const defaultParent = mergedCategories[0] || {
      dbId: dbCategories.find(c => !c.ma_danh_muc_cha)?.ma_danh_muc || 1,
      id: 'ao',
      title: 'Áo',
      subCategories: [{ id: 'ao-thun', name: 'Áo thun', dbId: undefined as number | undefined }],
    };

    const resolveParent = (parentIdOrKey?: string, parentDbId?: number) => {
      if (parentDbId) {
        const byDb = mergedCategories.find(c => c.dbId === parentDbId);
        if (byDb) return byDb;
      }
      if (parentIdOrKey && parentIdOrKey !== 'all') {
        const cleanKey = categoryKey(parentIdOrKey);
        const byId = mergedCategories.find(
          c =>
            c.id === parentIdOrKey ||
            String(c.dbId) === parentIdOrKey ||
            categoryKey(c.code) === cleanKey ||
            categoryKey(c.title) === cleanKey
        );
        if (byId) return byId;
      }
      return defaultParent;
    };

    if (presetContext && typeof presetContext === 'object') {
      const parentCfg = resolveParent(presetContext.parentId, presetContext.parentDbId);
      const pDbStr = String(parentCfg.dbId || presetContext.parentDbId || 1);
      const pTitle = presetContext.parentTitle || parentCfg.title || 'Áo';

      if (presetContext.mode === 'locked_full' && presetContext.subCategoryName && presetContext.subCategoryName !== 'all') {
        const matchedSub = parentCfg.subCategories.find(
          s => categoryKey(s.name) === categoryKey(presetContext.subCategoryName || '')
        );
        const subName = matchedSub?.name || presetContext.subCategoryName;
        const subDbId = presetContext.subCategoryDbId || matchedSub?.dbId;

        setCategoryMode('locked_full');
        setSelectedParentDbId(pDbStr);
        setSelectedParentTitle(pTitle);
        setSelectedSubCategoryName(subName);
        setSelectedSubCategoryDbId(subDbId ? String(subDbId) : '');
        setFormCategory(String(subDbId || pDbStr));

        // Ensure subcategory exists in Supabase immediately when opening the form so exact ID is assigned
        if (!subDbId && Number(pDbStr) > 0) {
          void ensureCatalogSubcategory(subName, Number(pDbStr))
            .then((subRow) => {
              setSelectedSubCategoryDbId(String(subRow.ma_danh_muc));
              setFormCategory(String(subRow.ma_danh_muc));
              void refreshProducts().catch(() => {});
            })
            .catch(() => {});
        }
      } else if (presetContext.mode === 'locked_parent') {
        const firstSub = parentCfg.subCategories[0];
        setCategoryMode('locked_parent');
        setSelectedParentDbId(pDbStr);
        setSelectedParentTitle(pTitle);
        setSelectedSubCategoryName(firstSub?.name || '');
        setSelectedSubCategoryDbId(firstSub?.dbId ? String(firstSub.dbId) : '');
        setFormCategory(String(firstSub?.dbId || pDbStr));
      } else {
        const firstSub = parentCfg.subCategories[0];
        setCategoryMode('manual');
        setSelectedParentDbId(pDbStr);
        setSelectedParentTitle(pTitle);
        setSelectedSubCategoryName(firstSub?.name || '');
        setSelectedSubCategoryDbId(firstSub?.dbId ? String(firstSub.dbId) : '');
        setFormCategory(String(firstSub?.dbId || pDbStr));
      }
    } else if (typeof presetContext === 'string' && presetContext && presetContext !== 'all') {
      const parentCfg = resolveParent(presetContext);
      const pDbStr = String(parentCfg.dbId || 1);
      const firstSub = parentCfg.subCategories[0];
      setCategoryMode('locked_parent');
      setSelectedParentDbId(pDbStr);
      setSelectedParentTitle(parentCfg.title);
      setSelectedSubCategoryName(firstSub?.name || '');
      setSelectedSubCategoryDbId(firstSub?.dbId ? String(firstSub.dbId) : '');
      setFormCategory(String(firstSub?.dbId || pDbStr));
    } else {
      const firstSub = defaultParent.subCategories[0];
      setCategoryMode('manual');
      setSelectedParentDbId(String(defaultParent.dbId || 1));
      setSelectedParentTitle(defaultParent.title);
      setSelectedSubCategoryName(firstSub?.name || '');
      setSelectedSubCategoryDbId(firstSub?.dbId ? String(firstSub.dbId) : '');
      setFormCategory(String(firstSub?.dbId || defaultParent.dbId || 1));
    }

    setFormSellingPrice('');
    setFormImportPrice('');
    setFormDiscountPercent('');
    setFormSalePrice('');
    setFormMaterial('');
    setFormShortDesc('');
    setFormSelectedSizes(['XL', '2XL', '3XL', '4XL', '5XL']);
    setFormImages([]);
    setFormImageUrl('');
    setNewImageInput('');
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setFormName(prod.name);
    const existingColors = prod.colors && prod.colors.length > 0
      ? prod.colors
      : [{ name: 'Đen Huyền Bí', hex: '#18181B' }];
    setSelectedColors(existingColors);
    setFormColor(existingColors[0]?.name || '');
    setCustomColorName('');
    setCustomColorHex('#18181B');

    setCategoryMode('manual');
    const parentDbId = prod.parentCategoryId || prod.categoryId || 1;
    const parentCfg = mergedCategories.find(c => c.dbId === parentDbId) || mergedCategories[0];
    setSelectedParentDbId(String(parentCfg?.dbId || parentDbId));
    setSelectedParentTitle(parentCfg?.title || 'Áo');

    let matchedSubName = '';
    let matchedSubDbId = '';
    if (prod.parentCategoryId && prod.categoryName) {
      matchedSubName = prod.categoryName;
      matchedSubDbId = prod.categoryId ? String(prod.categoryId) : '';
    } else if (parentCfg?.subCategories?.length) {
      const foundSub = parentCfg.subCategories.find(
        s => categoryKey(s.name) === categoryKey(prod.categoryName || '') || prod.name.toLowerCase().includes(s.name.toLowerCase())
      ) || parentCfg.subCategories[0];
      matchedSubName = foundSub?.name || '';
      matchedSubDbId = foundSub?.dbId ? String(foundSub.dbId) : '';
    }
    setSelectedSubCategoryName(matchedSubName);
    setSelectedSubCategoryDbId(matchedSubDbId);

    let initialCatId = prod.categoryId ? String(prod.categoryId) : String(parentCfg?.dbId || 1);
    if (!prod.categoryId && prod.category) {
      const found = dbCategories.find(
        (c) =>
          c.code.toLowerCase() === String(prod.category).toLowerCase() ||
          c.ten_danh_muc.toLowerCase().includes(String(prod.category).toLowerCase())
      );
      if (found) initialCatId = String(found.ma_danh_muc);
    }
    setFormCategory(initialCatId);

    const existingStockMap: Record<string, string> = {};
    (prod.variants || []).forEach((v: any) => {
      if (v.size && v.colorName) {
        existingStockMap[`${v.size}__${v.colorName}`] = String(v.stock ?? 0);
      }
    });
    setVariantInitialStocks(existingStockMap);
    setQuickFillStock('');

    const hasDiscount = Boolean((prod.originalPrice && prod.originalPrice > prod.price) || (prod.discountPercent && prod.discountPercent > 0));
    if (hasDiscount) {
      setFormSellingPrice(String(prod.originalPrice || prod.price));
      setFormSalePrice(String(prod.price));
      setFormDiscountPercent(String(prod.discountPercent || Math.round((1 - prod.price / (prod.originalPrice || prod.price)) * 100)));
    } else {
      setFormSellingPrice(String(prod.price || ''));
      setFormSalePrice('');
      setFormDiscountPercent('');
    }
    setFormImportPrice(prod.importPrice ? String(prod.importPrice) : String(Math.round(((prod.originalPrice || prod.price || 300000) * 0.6) / 1000) * 1000));
    setFormMaterial(prod.material || 'Vải cao cấp thoáng khí co giãn');
    setFormShortDesc(prod.shortDesc || prod.description?.slice(0, 120) || '');
    setFormSelectedSizes(prod.sizes || ['XL', '2XL', '3XL', '4XL', '5XL']);
    const imgs = prod.images && prod.images.length > 0 ? [...prod.images] : [prod.images?.[0] || ''];
    setFormImages(imgs);
    setFormImageUrl(imgs[0] || '');
    setNewImageInput('');
    setIsProductModalOpen(true);
  };

  // Image Cropper Handlers
  const handleSelectFileToCrop = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Tệp không hợp lệ', 'Vui lòng chọn tệp hình ảnh (JPG, PNG, WebP)', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
      setCropZoom(1);
      setCropPan({ x: 0, y: 0 });
      setCropRotation(0);
      setCropEditingIndex(null);
      setIsCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSelectUrlToCrop = (urlToCrop?: string) => {
    const url = (urlToCrop || newImageInput).trim();
    if (!url) {
      showToast('Thiếu liên kết', 'Vui lòng nhập hoặc dán liên kết URL hình ảnh', 'error');
      return;
    }
    setCropImageSrc(url);
    setCropZoom(1);
    setCropPan({ x: 0, y: 0 });
    setCropRotation(0);
    setCropEditingIndex(null);
    setIsCropModalOpen(true);
  };

  const handleAddDirectUrl = (directUrl?: string) => {
    const url = (directUrl || newImageInput).trim();
    if (!url) {
      showToast('Thiếu liên kết', 'Vui lòng nhập liên kết ảnh', 'error');
      return;
    }
    const updated = [...formImages, url];
    setFormImages(updated);
    if (!formImageUrl) setFormImageUrl(updated[0]);
    setNewImageInput('');
    showToast('Đã thêm ảnh', 'Đã lưu ảnh vào thư viện sản phẩm', 'success');
  };

  const handleRecropExisting = (idx: number) => {
    const targetUrl = formImages[idx];
    if (!targetUrl) return;
    setCropImageSrc(targetUrl);
    setCropZoom(1);
    setCropPan({ x: 0, y: 0 });
    setCropRotation(0);
    setCropEditingIndex(idx);
    setIsCropModalOpen(true);
  };

  const handleApplyCrop = () => {
    if (!cropImageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const targetWidth = 900;
        const targetHeight = cropAspectRatio === '3:4' ? 1200 : 900;
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D không khả dụng');

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        const boxWidth = 300;
        const boxHeight = cropAspectRatio === '3:4' ? 400 : 300;
        const scaleFactor = targetWidth / boxWidth;

        ctx.save();
        ctx.translate(targetWidth / 2, targetHeight / 2);
        ctx.translate(cropPan.x * scaleFactor, cropPan.y * scaleFactor);
        ctx.rotate((cropRotation * Math.PI) / 180);
        ctx.scale(cropZoom, cropZoom);

        const imgAspect = img.width / img.height;
        const boxAspect = boxWidth / boxHeight;
        let drawW: number;
        let drawH: number;

        if (imgAspect > boxAspect) {
          drawH = targetHeight;
          drawW = targetHeight * imgAspect;
        } else {
          drawW = targetWidth;
          drawH = targetWidth / imgAspect;
        }

        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();

        const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
        if (cropEditingIndex !== null) {
          setFormImages(prev => {
            const next = [...prev];
            next[cropEditingIndex] = croppedDataUrl;
            return next;
          });
        } else {
          setFormImages(prev => [...prev, croppedDataUrl]);
          if (!formImageUrl) setFormImageUrl(croppedDataUrl);
          setNewImageInput('');
        }
        setIsCropModalOpen(false);
        showToast('Thành công', `Đã canh chỉnh khung tỷ lệ ${cropAspectRatio} và tối ưu ảnh`, 'success');
      } catch (err) {
        console.warn('Canvas crop fallback (CORS or canvas error):', err);
        if (cropEditingIndex !== null) {
          setFormImages(prev => {
            const next = [...prev];
            next[cropEditingIndex] = cropImageSrc;
            return next;
          });
        } else {
          setFormImages(prev => [...prev, cropImageSrc]);
          if (!formImageUrl) setFormImageUrl(cropImageSrc);
          setNewImageInput('');
        }
        setIsCropModalOpen(false);
        showToast('Đã lưu ảnh', 'Đã lưu hình ảnh vào thư viện sản phẩm', 'success');
      }
    };
    img.onerror = () => {
      if (cropEditingIndex !== null) {
        setFormImages(prev => {
          const next = [...prev];
          next[cropEditingIndex] = cropImageSrc;
          return next;
        });
      } else {
        setFormImages(prev => [...prev, cropImageSrc]);
        if (!formImageUrl) setFormImageUrl(cropImageSrc);
        setNewImageInput('');
      }
      setIsCropModalOpen(false);
      showToast('Đã thêm ảnh', 'Đã thêm ảnh vào sản phẩm', 'info');
    };
    img.src = cropImageSrc;
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Thiếu thông tin', 'Vui lòng nhập tên sản phẩm', 'error');
      return;
    }
    const sellPrice = Number(formSellingPrice);
    if (!sellPrice || sellPrice <= 0) {
      showToast('Lỗi giá bán', 'Giá bán phải lớn hơn 0đ', 'error');
      return;
    }
    const importPriceNum = Number(formImportPrice) || 0;
    const salePriceNum = Number(formSalePrice) || 0;
    const discountPctNum = Number(formDiscountPercent) || 0;

    // Chặn bán lỗ: Giá khuyến mãi hoặc giá bán không được thấp hơn giá nhập
    if (importPriceNum > 0) {
      if (salePriceNum > 0 && salePriceNum < importPriceNum) {
        showToast('Cảnh báo bán lỗ', `Giá khuyến mãi (${salePriceNum.toLocaleString('vi-VN')}₫) không được thấp hơn Giá nhập (${importPriceNum.toLocaleString('vi-VN')}₫)!`, 'error');
        return;
      }
      if (salePriceNum === 0 && sellPrice < importPriceNum) {
        showToast('Cảnh báo bán lỗ', `Giá bán (${sellPrice.toLocaleString('vi-VN')}₫) không được thấp hơn Giá nhập (${importPriceNum.toLocaleString('vi-VN')}₫)!`, 'error');
        return;
      }
    }

    let finalPrice = sellPrice;
    let finalOriginalPrice: number | undefined = undefined;
    let finalDiscountPct = 0;

    if (salePriceNum > 0 && salePriceNum < sellPrice) {
      finalPrice = salePriceNum;
      finalOriginalPrice = sellPrice;
      finalDiscountPct = discountPctNum > 0 ? discountPctNum : Math.round(((sellPrice - salePriceNum) / sellPrice) * 100);
    } else {
      finalPrice = sellPrice;
      finalOriginalPrice = undefined;
      finalDiscountPct = 0;
    }

    const finalGalleryImages = formImages.filter((img) => Boolean(img?.trim()));
    if (finalGalleryImages.length === 0 && formImageUrl) {
      finalGalleryImages.push(formImageUrl);
    }

    if (productSaveLock.current) return;
    const effectiveColors = selectedColors.length > 0
      ? selectedColors
      : (formColor.trim() ? [{ name: formColor.trim(), hex: getColorHex(formColor) }] : []);

    if (!formSelectedSizes.length || effectiveColors.length === 0) {
      showToast('Thiếu thông tin', 'Vui lòng chọn ít nhất một kích cỡ và thêm ít nhất một màu sắc cho sản phẩm.', 'error');
      return;
    }

    // Validate initial quantities per variant
    const parsedVariantQuantities: Record<string, number> = {};
    for (const sz of formSelectedSizes) {
      for (const col of effectiveColors) {
        const key = `${sz}__${col.name}`;
        const rawVal = (variantInitialStocks[key] ?? '0').trim();
        if (rawVal === '') {
          parsedVariantQuantities[key] = 0;
          continue;
        }
        if (!/^\d+$/.test(rawVal)) {
          showToast(
            'Số lượng không hợp lệ',
            `Số lượng ban đầu của biến thể ${col.name} - Size ${sz} phải là số nguyên không âm.`,
            'error'
          );
          return;
        }
        const numVal = Number(rawVal);
        if (!Number.isSafeInteger(numVal) || numVal < 0) {
          showToast(
            'Số lượng không hợp lệ',
            `Số lượng ban đầu của biến thể ${col.name} - Size ${sz} không hợp lệ.`,
            'error'
          );
          return;
        }
        parsedVariantQuantities[key] = numVal;
      }
    }

    const idMatch = editingProduct ? /^prod-0(\d+)$/.exec(editingProduct.id) : null;
    if (editingProduct && !idMatch) {
      showToast('Chưa thể lưu', 'Không tìm thấy sản phẩm cần cập nhật. Vui lòng tải lại danh sách.', 'error');
      return;
    }

    productSaveLock.current = true;
    setIsSavingProduct(true);
    let saved = false;
    try {
      let resolvedCategoryId = Number(selectedSubCategoryDbId || selectedParentDbId || formCategory);
      const parentDbNum = Number(selectedParentDbId);

      // Ensure subcategory exists in Supabase and get its exact ma_danh_muc
      if (selectedSubCategoryName.trim() && Number.isSafeInteger(parentDbNum) && parentDbNum > 0) {
        const subRow = await ensureCatalogSubcategory(selectedSubCategoryName.trim(), parentDbNum);
        resolvedCategoryId = subRow.ma_danh_muc;
        setSelectedSubCategoryDbId(String(subRow.ma_danh_muc));
        setFormCategory(String(subRow.ma_danh_muc));
      }

      if (!Number.isSafeInteger(resolvedCategoryId) || resolvedCategoryId <= 0) {
        showToast('Chưa thể lưu', 'Vui lòng chọn Danh mục và Phân loại hợp lệ.', 'error');
        return;
      }

      const productId = await saveCatalogProduct({
        name: formName.trim(),
        categoryId: resolvedCategoryId,
        description: formShortDesc,
        image: formImageUrl || finalGalleryImages[0] || '',
        price: finalPrice,
        sizes: formSelectedSizes,
        color: effectiveColors[0]?.name || formColor || '',
        colors: effectiveColors,
        variantQuantities: parsedVariantQuantities,
      }, { productId: idMatch ? Number(idMatch[1]) : undefined, draftId, onDraftCreated: setDraftId });
      saved = true;
      setDraftId(undefined);
      try {
        await Promise.all([refreshProducts(), refreshInventory()]);
        window.dispatchEvent(new Event('curve:catalog-changed'));
      } catch {
        showToast('Đã lưu sản phẩm', 'Chưa tải lại được danh sách. Vui lòng tải lại trang trước khi tiếp tục.', 'info');
        setIsProductModalOpen(false);
        return;
      }
      const totalInitialStock = Object.values(parsedVariantQuantities).reduce((s, q) => s + q, 0);
      appendAuditLog?.(
        editingProduct ? 'Cập nhật thông tin sản phẩm' : 'Tạo sản phẩm mới & Đồng bộ tồn kho',
        'Sản Phẩm & Size',
        String(productId),
        `${formName.trim()} (${selectedParentTitle}${selectedSubCategoryName ? ` → ${selectedSubCategoryName}` : ''}, tổng tồn ban đầu: ${totalInitialStock} cái)`,
        'success'
      );
      showToast(
        'Lưu thành công',
        editingProduct
          ? `Đã cập nhật thông tin sản phẩm “${formName.trim()}”.`
          : `Đã tạo “${formName.trim()}” tại ${selectedParentTitle}${selectedSubCategoryName ? ` → ${selectedSubCategoryName}` : ''} và đồng bộ ${totalInitialStock} sản phẩm vào Kiểm Kê & Tồn Kho.`,
        'success'
      );
      setIsProductModalOpen(false);
    } catch (error) {
      console.error('Product save failed:', error);
      showToast(saved ? 'Đã lưu sản phẩm' : 'Chưa lưu được sản phẩm', catalogErrorMessage(error), saved ? 'info' : 'error');
    } finally {
      productSaveLock.current = false;
      setIsSavingProduct(false);
    }
  };

  const displayProducts = productList.length > 0 ? productList : products;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Sub-tab 1 & 2: Danh Mục Sản Phẩm (Hợp nhất theo 4 nhóm Áo, Quần, Đầm Váy, Đồ Bộ) */}
      {(productSubTab === 'list' || productSubTab === 'categories' || productSubTab === 'pricing' || !productSubTab) && (
        <ProductCategoriesTab
          products={displayProducts}
          inventory={inventory}
          onOpenAddProduct={handleOpenAddProduct}
          onOpenEditProduct={handleOpenEditProduct}
          onUpdateProductPrice={async (prodId, newPrice, newSalePrice) => {
            await updateCatalogPrice(prodId, newSalePrice || newPrice);
            await refreshProducts();
          }}
          onSelectSizeChart={(p) => {
            setSelectedProductSizeChart(p);
          }}
        />
      )}

      {/* Sub-tab 3: Biến Thể Sản Phẩm */}
      {productSubTab === 'variants' && (
        <VariantsAccordionTab
          products={displayProducts}
          inventory={inventory}
          onNavigateToInventory={onNavigateToInventory || (() => {})}
          onRestockSku={onRestockSku || (() => {})}
        />
      )}

      {/* Sub-tab 4: Bảng Đo Size Chart Kỹ Thuật (XL–5XL) */}
      {productSubTab === 'size_chart' && (
        <SizeChartsTab />
      )}

      {/* ================= MODAL: ADD / EDIT PRODUCT ================= */}
      {isProductModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-900/45 animate-fadeIn overflow-y-auto"
          onClick={() => {
            if (!isSavingProduct) setIsProductModalOpen(false);
          }}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-stone-200 my-auto max-h-[90vh] flex flex-col animate-scaleIn text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-5 border-b border-stone-100 shrink-0">
              <div>
                <h3 className="text-xl font-bold text-charcoal-900 leading-snug">
                  {editingProduct ? 'Chỉnh Sửa Sản Phẩm' : 'Thêm Sản Phẩm Mới'}
                </h3>
              </div>
              <button
                type="button"
                disabled={isSavingProduct}
                onClick={() => setIsProductModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} aria-busy={isSavingProduct} className="flex-1 overflow-y-auto py-5 pr-2">
              <fieldset disabled={isSavingProduct} className="flex flex-col gap-5 border-0 p-0 m-0 min-w-0">
              <div>
                <label className="block text-xs font-bold text-charcoal-700 mb-1.5 leading-snug">
                  Tên Sản Phẩm Big Size <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ví dụ: Áo Thun Polo Nam Big Size Dry-Tech Dệt Tổ Ong..."
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs leading-normal focus:outline-hidden focus:border-[#5C1D24] focus:bg-white transition-colors"
                />
              </div>

              {/* DANH MỤC & PHÂN LOẠI (ẨN KHI ĐÃ XÁC ĐỊNH TỰ ĐỘNG THEO VỊ TRÍ) */}
              {categoryMode === 'locked_full' && !editingProduct ? null : categoryMode === 'locked_parent' && !editingProduct ? (
                <div>
                  <label className="block text-xs font-bold text-charcoal-700 mb-1.5 leading-snug">
                    Phân Loại Con ({selectedParentTitle}) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedSubCategoryName}
                    onChange={(e) => {
                      const subName = e.target.value;
                      setSelectedSubCategoryName(subName);
                      const subObj = availableSubCategories.find((s) => s.name === subName);
                      setSelectedSubCategoryDbId(subObj?.dbId ? String(subObj.dbId) : '');
                      setFormCategory(String(subObj?.dbId || selectedParentDbId));
                    }}
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#5C1D24] cursor-pointer"
                  >
                    {availableSubCategories.map((sub) => (
                      <option key={sub.id} value={sub.name}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-charcoal-700 mb-1.5 leading-snug">
                      Danh Mục Chính <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedParentDbId}
                      onChange={(e) => {
                        const newParentDbId = e.target.value;
                        setSelectedParentDbId(newParentDbId);
                        const parentCfg = mergedCategories.find((c) => String(c.dbId) === newParentDbId);
                        setSelectedParentTitle(parentCfg?.title || '');
                        const firstSub = parentCfg?.subCategories?.[0];
                        setSelectedSubCategoryName(firstSub?.name || '');
                        setSelectedSubCategoryDbId(firstSub?.dbId ? String(firstSub.dbId) : '');
                        setFormCategory(String(firstSub?.dbId || newParentDbId));
                      }}
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#5C1D24] cursor-pointer"
                    >
                      {mergedCategories.map((cat) => (
                        <option key={cat.id} value={String(cat.dbId)}>
                          {cat.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-charcoal-700 mb-1.5 leading-snug">
                      Phân Loại Chi Tiết <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedSubCategoryName}
                      onChange={(e) => {
                        const subName = e.target.value;
                        setSelectedSubCategoryName(subName);
                        const subObj = availableSubCategories.find((s) => s.name === subName);
                        setSelectedSubCategoryDbId(subObj?.dbId ? String(subObj.dbId) : '');
                        setFormCategory(String(subObj?.dbId || selectedParentDbId));
                      }}
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#5C1D24] cursor-pointer"
                    >
                      {availableSubCategories.length === 0 && (
                        <option value="">{selectedParentTitle} (Danh mục gốc)</option>
                      )}
                      {availableSubCategories.map((sub) => (
                        <option key={sub.id} value={sub.name}>
                          {sub.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* PHÂN HỆ QUẢN LÝ MÀU SẮC THỜI TRANG BIG SIZE */}
              <div className="bg-stone-50/90 p-5 sm:p-6 rounded-2xl border border-stone-200 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-charcoal-800 flex items-center gap-2 leading-snug">
                    <Palette className="w-4 h-4 text-[#5C1D24]" />
                    <span>Màu Sắc Bán Hàng <span className="text-rose-500">*</span></span>
                  </label>
                  <span className="text-[11px] text-stone-500 font-medium">
                    {selectedColors.length} màu đã chọn
                  </span>
                </div>

                {/* Danh sách màu đã chọn (Chips) */}
                <div className="flex flex-wrap gap-2.5 min-h-11 items-center p-3.5 bg-white rounded-xl border border-stone-200">
                  {selectedColors.map((col) => (
                    <span
                      key={col.name}
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-stone-100 text-charcoal-800 border border-stone-200 shadow-2xs group"
                    >
                      <span
                        className="w-3 h-3 rounded-full border border-stone-300 shrink-0 shadow-2xs"
                        style={{ backgroundColor: col.hex }}
                      />
                      <span>{col.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveColor(col.name)}
                        className="p-0.5 ml-0.5 rounded-full hover:bg-rose-100 hover:text-rose-600 text-stone-400 transition-colors cursor-pointer"
                        title={`Bỏ màu ${col.name}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {selectedColors.length === 0 && (
                    <span className="text-xs text-stone-400 italic">Chưa chọn màu nào cho sản phẩm.</span>
                  )}
                </div>

                {/* Bảng màu chuẩn Curve & Confidence (Quick Select) */}
                <div>
                  <span className="text-[11px] font-bold text-stone-600 block mb-2.5 leading-snug">
                    Bảng màu chuẩn Curve & Confidence (Nhấp để chọn/bỏ):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_FASHION_COLORS.map((preset) => {
                      const isSelected = selectedColors.some(
                        (c) => c.name.toLowerCase() === preset.name.toLowerCase()
                      );
                      return (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => handleTogglePresetColor(preset)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#5C1D24] text-white border-[#5C1D24] shadow-xs'
                              : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50 hover:border-stone-300'
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-white/40 shrink-0"
                            style={{ backgroundColor: preset.hex }}
                          />
                          <span>{preset.name}</span>
                          {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Thêm màu tùy chỉnh */}
                <div className="pt-3.5 border-t border-stone-200/80">
                  <span className="text-[11px] font-bold text-stone-600 block mb-2.5 leading-snug">
                    Hoặc thêm màu mới tùy chỉnh:
                  </span>
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white border border-stone-200 rounded-xl shrink-0">
                      <input
                        type="color"
                        value={customColorHex}
                        onChange={(e) => setCustomColorHex(e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent"
                        title="Chọn mã màu HEX"
                      />
                      <span className="text-[11px] font-mono text-stone-500 uppercase">{customColorHex}</span>
                    </div>
                    <input
                      type="text"
                      maxLength={50}
                      value={customColorName}
                      onChange={(e) => setCustomColorName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomColor();
                        }
                      }}
                      placeholder="Nhập tên màu (ví dụ: Cam Đất, Hồng Pastel...)"
                      className="flex-1 px-3.5 py-2 bg-white border border-stone-200 rounded-xl text-xs focus:outline-hidden focus:border-[#5C1D24]"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomColor}
                      className="px-3.5 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm màu</span>
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-stone-500 pt-1 leading-relaxed">
                  💡 Mỗi màu kết hợp với các kích cỡ đã chọn sẽ tạo thành các biến thể SKU chuẩn may đo. Quản lý có thể nhập số lượng tồn kho ban đầu cho từng SKU ngay tại mục Số Lượng Ban Đầu bên dưới.
                </p>
              </div>

              {/* Ô NHẬP ẢNH SẢN PHẨM & PREVIEW TRỰC TIẾP */}
              <div className="bg-stone-50/90 p-5 sm:p-6 rounded-2xl border border-stone-200 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-charcoal-800 flex items-center gap-2 leading-snug">
                    <ImageIcon className="w-4 h-4 text-[#5C1D24]" />
                    <span>Ảnh Đại Diện Sản Phẩm <span className="text-rose-500">*</span></span>
                  </label>
                  <span className="text-[11px] text-stone-500">
                    Preview trực tiếp • Hỗ trợ URL & tải tệp
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-5 items-start">
                  <div className="w-28 h-34 rounded-xl bg-stone-100 border border-stone-200 overflow-hidden shrink-0 relative flex items-center justify-center shadow-2xs group">
                    {formImageUrl ? (
                      <img
                        src={formImageUrl}
                        alt="Preview ảnh sản phẩm"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500';
                        }}
                      />
                    ) : (
                      <div className="text-center p-2.5 text-stone-400">
                        <ImageIcon className="w-6 h-6 mx-auto mb-1.5 text-stone-300" />
                        <span className="text-[10px] block leading-tight">Chưa có ảnh</span>
                      </div>
                    )}
                    <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/60 text-white">
                      Live
                    </span>
                  </div>

                  <div className="flex-1 space-y-4 w-full">
                    <div>
                      <span className="text-[11px] font-bold text-stone-600 block mb-2 leading-snug">
                        1. Dán liên kết link URL ảnh:
                      </span>
                      <div className="flex gap-2.5">
                        <input
                          type="url"
                          value={formImageUrl}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormImageUrl(val);
                            if (val && !formImages.includes(val)) {
                              setFormImages([val, ...formImages.filter(x => x !== val)]);
                            }
                          }}
                          placeholder="https://images.unsplash.com/photo-..."
                          className="flex-1 px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-xs font-mono focus:outline-hidden focus:border-[#5C1D24]"
                        />
                        <button
                          type="button"
                          onClick={() => handleSelectUrlToCrop(formImageUrl)}
                          disabled={!formImageUrl}
                          className="px-3.5 py-2.5 bg-stone-100 hover:bg-stone-200 disabled:opacity-50 text-stone-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                          title="Mở bảng cắt và căn chỉnh tỷ lệ ảnh"
                        >
                          <Crop className="w-3.5 h-3.5 text-[#5C1D24]" />
                          <span>Cắt ảnh</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold text-stone-600 block mb-2 leading-snug">
                        2. Hoặc tải ảnh từ thiết bị:
                      </span>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <label className="flex items-center gap-2 px-3.5 py-2.5 bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-xl text-xs font-medium cursor-pointer transition-colors shadow-2xs">
                          <ImageIcon className="w-3.5 h-3.5 text-stone-500" />
                          <span>Chọn tệp ảnh từ máy</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleSelectFileToCrop}
                          />
                        </label>
                        <span className="text-[11px] text-stone-400 leading-relaxed">JPG, PNG, WebP (Tự động mở trình căn khung)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Thư viện ảnh đính kèm */}
                {formImages.length > 0 && (
                  <div className="pt-3.5 border-t border-stone-200/80">
                    <span className="text-[11px] font-bold text-stone-600 block mb-2.5">
                      Bộ sưu tập ảnh sản phẩm ({formImages.length} ảnh):
                    </span>
                    <div className="flex flex-wrap gap-3">
                      {formImages.map((img, idx) => (
                        <div
                          key={idx}
                          className={`relative w-14 h-16 rounded-lg overflow-hidden border-2 transition-all group ${img === formImageUrl ? 'border-[#5C1D24] shadow-xs ring-2 ring-[#5C1D24]/20' : 'border-stone-200 opacity-80 hover:opacity-100'}`}
                        >
                          <img
                            src={img}
                            alt={`gallery-${idx}`}
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => setFormImageUrl(img)}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRecropExisting(idx);
                              }}
                              className="p-1 rounded bg-white text-stone-700 hover:text-[#5C1D24] cursor-pointer"
                              title="Căn chỉnh khung ảnh này"
                            >
                              <Crop className="w-2.5 h-2.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const filtered = formImages.filter((_, i) => i !== idx);
                                setFormImages(filtered);
                                if (img === formImageUrl) {
                                  setFormImageUrl(filtered[0] || '');
                                }
                              }}
                              className="p-1 rounded bg-white text-stone-700 hover:text-rose-600 cursor-pointer"
                              title="Xóa ảnh"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* BẢNG GIÁ & CHÍNH SÁCH BÁN HÀNG */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-stone-50 p-5 sm:p-6 rounded-2xl border border-stone-200">
                <div>
                  <label className="block text-xs font-bold text-charcoal-700 mb-2 leading-snug">
                    Giá Bán Niêm Yết (VNĐ) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={formatCurrencyInput(formSellingPrice)}
                    onChange={(e) => setFormSellingPrice(parseCurrencyInput(e.target.value))}
                    className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-xs font-mono font-bold focus:outline-hidden focus:border-[#5C1D24]"
                  />
                  <span className="text-[11px] text-stone-500 mt-1.5 block">
                    {Number(formSellingPrice || 0).toLocaleString('vi-VN')}₫
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-charcoal-700 mb-2 leading-snug">
                    Giá Nhập / Giá Vốn (VNĐ)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatCurrencyInput(formImportPrice)}
                    onChange={(e) => setFormImportPrice(parseCurrencyInput(e.target.value))}
                    className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-xs font-mono focus:outline-hidden focus:border-[#5C1D24]"
                  />
                  <span className="text-[11px] text-stone-500 mt-1.5 block">
                    {Number(formImportPrice || 0).toLocaleString('vi-VN')}₫
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-charcoal-700 mb-2 leading-snug">
                    Giá Khuyến Mãi (Nếu có)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatCurrencyInput(formSalePrice)}
                    onChange={(e) => {
                      const val = parseCurrencyInput(e.target.value);
                      setFormSalePrice(val);
                      const sell = Number(formSellingPrice) || 0;
                      const sale = Number(val) || 0;
                      if (sell > 0 && sale > 0 && sale < sell) {
                        setFormDiscountPercent(String(Math.round(((sell - sale) / sell) * 100)));
                      } else {
                        setFormDiscountPercent('');
                      }
                    }}
                    placeholder="Bỏ trống nếu không giảm"
                    className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-xs font-mono text-emerald-700 font-bold focus:outline-hidden focus:border-[#5C1D24]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-charcoal-700 mb-2 leading-snug">
                    % Giảm Giá
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={90}
                    value={formDiscountPercent}
                    onChange={(e) => {
                      const pct = e.target.value;
                      setFormDiscountPercent(pct);
                      const sell = Number(formSellingPrice) || 0;
                      const p = Number(pct) || 0;
                      if (sell > 0 && p > 0) {
                        setFormSalePrice(String(Math.round((sell * (1 - p / 100)) / 1000) * 1000));
                      }
                    }}
                    placeholder="Ví dụ: 15"
                    className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-xs font-mono focus:outline-hidden focus:border-[#5C1D24]"
                  />
                </div>
              </div>

              {/* Dải Size Chọn */}
              <div>
                <label className="block text-xs font-bold text-charcoal-700 mb-1.5 leading-snug">
                  Dải Kích Cỡ Big Size Áp Dụng <span className="text-rose-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {(['XL', '2XL', '3XL', '4XL', '5XL'] as Size[]).map(sz => (
                    <button
                      key={sz}
                      type="button"
                      disabled={Boolean(draftId) || Boolean(editingProduct)}
                      onClick={() => {
                        if (formSelectedSizes.includes(sz)) {
                          if (formSelectedSizes.length <= 1) {
                            showToast('Thông báo', 'Phải có ít nhất 1 size', 'warning');
                            return;
                          }
                          setFormSelectedSizes(formSelectedSizes.filter(s => s !== sz));
                        } else {
                          setFormSelectedSizes([...formSelectedSizes, sz]);
                        }
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${formSelectedSizes.includes(sz) ? 'bg-[#5C1D24] text-white shadow-xs' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              {/* SỐ LƯỢNG TỒN KHO BAN ĐẦU THEO TỪNG BIẾN THỂ (SKU) */}
              {!editingProduct ? (
                <div className="bg-stone-50/90 p-5 sm:p-6 rounded-2xl border border-stone-200 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-charcoal-800 flex items-center gap-2 leading-snug">
                        <Boxes className="w-4 h-4 text-[#5C1D24] shrink-0" />
                        <span>Số Lượng Ban Đầu (Theo từng biến thể Size / Màu sắc)</span>
                      </label>
                      <p className="text-[11px] text-stone-500 leading-relaxed">
                        Chỉ chấp nhận số nguyên không âm (mặc định là 0). Đồng bộ trực tiếp vào Kiểm Kê & Tồn Kho sau khi lưu.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 self-start">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={quickFillStock}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/[^\d]/g, '');
                          setQuickFillStock(digits === '' ? '' : String(parseInt(digits, 10)));
                        }}
                        placeholder="Điền nhanh..."
                        className="w-28 px-3.5 py-2 bg-white border border-stone-200 rounded-xl text-xs font-mono text-center focus:outline-hidden focus:border-[#5C1D24]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const cleanVal = quickFillStock.trim() === '' ? '0' : quickFillStock.trim();
                          const nextMap: Record<string, string> = {};
                          formSelectedSizes.forEach((sz) => {
                            selectedColors.forEach((col) => {
                              nextMap[`${sz}__${col.name}`] = cleanVal;
                            });
                          });
                          setVariantInitialStocks(nextMap);
                        }}
                        className="px-3.5 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        Áp dụng tất cả
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-stone-200 overflow-hidden max-h-64 overflow-y-auto shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px] font-bold sticky top-0 z-10">
                        <tr>
                          <th className="py-3 px-4">Màu sắc</th>
                          <th className="py-3 px-4 text-center">Kích cỡ</th>
                          <th className="py-3 px-4 text-right">Số lượng ban đầu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {selectedColors.flatMap((col) =>
                          formSelectedSizes.map((sz) => {
                            const key = `${sz}__${col.name}`;
                            const val = variantInitialStocks[key] ?? '0';
                            return (
                              <tr key={key} className="hover:bg-stone-50/70 transition-colors">
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="w-3.5 h-3.5 rounded-full border border-stone-300 shrink-0"
                                      style={{ backgroundColor: col.hex }}
                                    />
                                    <span className="font-medium text-charcoal-800">{col.name}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className="px-2.5 py-1 rounded-md bg-stone-100 font-mono font-bold text-[11px] text-charcoal-900 border border-stone-200 inline-block">
                                    {sz}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <div className="inline-flex items-center gap-2">
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      value={val}
                                      onChange={(e) => {
                                        const raw = e.target.value.replace(/[^\d]/g, '');
                                        const normalized = raw === '' ? '' : String(parseInt(raw, 10));
                                        setVariantInitialStocks((prev) => ({
                                          ...prev,
                                          [key]: normalized,
                                        }));
                                      }}
                                      onBlur={() => {
                                        setVariantInitialStocks((prev) => ({
                                          ...prev,
                                          [key]: prev[key] === '' || prev[key] === undefined ? '0' : prev[key],
                                        }));
                                      }}
                                      className="w-24 px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono font-bold text-right text-charcoal-900 focus:outline-hidden focus:border-[#5C1D24] focus:bg-white transition-colors"
                                    />
                                    <span className="text-[11px] text-stone-500">cái</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between text-xs text-stone-600 pt-2 border-t border-stone-200/70">
                    <span>
                      Tổng số biến thể: <strong className="text-charcoal-900">{selectedColors.length * formSelectedSizes.length} SKU</strong>
                    </span>
                    <span>
                      Tổng tồn kho ban đầu:{' '}
                      <strong className="text-[#5C1D24] font-mono text-sm">
                        {selectedColors
                          .flatMap((col) =>
                            formSelectedSizes.map((sz) => Number(variantInitialStocks[`${sz}__${col.name}`] || 0))
                          )
                          .reduce((a, b) => a + b, 0)}{' '}
                        cái
                      </strong>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200 flex items-center justify-between gap-4">
                  <div className="text-xs text-stone-600 leading-relaxed">
                    <strong className="text-charcoal-900 block mb-1">Quản lý tồn kho SKU hiện có</strong>
                    <span>
                      Để nhập thêm hàng (+ cộng tồn) hoặc đối chiếu kiểm kê thực tế cho sản phẩm đã tồn tại, vui lòng thao tác tại Kiểm Kê & Tồn Kho.
                    </span>
                  </div>
                  {onNavigateToInventory && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsProductModalOpen(false);
                        onNavigateToInventory();
                      }}
                      className="px-4 py-2.5 bg-white hover:bg-stone-100 text-[#5C1D24] border border-stone-200 rounded-xl text-xs font-bold shrink-0 cursor-pointer shadow-2xs"
                    >
                      Mở Tồn Kho
                    </button>
                  )}
                </div>
              )}

              {/* Chất liệu & Mô tả */}
              <div>
                <label className="block text-xs font-bold text-charcoal-700 mb-1.5 leading-snug">
                  Chất Liệu & Đặc Tính Co Giãn
                </label>
                <input
                  type="text"
                  value={formMaterial}
                  onChange={(e) => setFormMaterial(e.target.value)}
                  placeholder="Ví dụ: 95% Cotton thoáng khí, 5% Spandex co giãn 4 chiều..."
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs leading-normal focus:outline-hidden focus:border-[#5C1D24] focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-charcoal-700 mb-1.5 leading-snug">
                  Mô Tả Ngắn Phom Dáng
                </label>
                <textarea
                  rows={3}
                  value={formShortDesc}
                  onChange={(e) => setFormShortDesc(e.target.value)}
                  placeholder="Mô tả ưu điểm che khuyết điểm bụng, bắp tay..."
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs leading-relaxed focus:outline-hidden focus:border-[#5C1D24] focus:bg-white resize-none transition-colors"
                />
              </div>

              <div className="pt-5 border-t border-stone-100 flex items-center justify-between">
                {editingProduct ? (
                  <button
                    type="button"
                    onClick={() => setProductToDelete(editingProduct)}
                    className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Xóa sản phẩm</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={isSavingProduct}
                    onClick={() => setIsProductModalOpen(false)}
                    className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#5C1D24] hover:bg-[#48161C] text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isSavingProduct ? 'Đang lưu…' : editingProduct ? 'Lưu Thay Đổi' : 'Thêm Mới Sản Phẩm'}</span>
                  </button>
                </div>
              </div>
              </fieldset>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CANH CHỈNH KHUNG HÌNH SẢN PHẨM (CROPPER) ================= */}
      {isCropModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-stone-900/55 animate-fadeIn overflow-y-auto"
          onClick={() => setIsCropModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl border border-stone-200 my-auto flex flex-col animate-scaleIn max-h-[92vh] text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-4 border-b border-stone-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#5C1D24]/10 text-[#5C1D24] flex items-center justify-center shrink-0">
                  <Crop className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-charcoal-900">
                    Canh Chỉnh Khung Hình Sản Phẩm
                  </h3>
                  <p className="text-xs text-stone-500">
                    Kéo di chuyển, zoom và xoay để trang phục không bị che khuất hoặc cắt mất góc khi hiển thị
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCropModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-5 space-y-5">
              <div className="flex flex-col items-center justify-center bg-stone-900/95 p-4 sm:p-6 rounded-2xl">
                <div
                  className={`relative overflow-hidden rounded-2xl border-2 border-white/80 shadow-2xl bg-stone-950 cursor-grab active:cursor-grabbing select-none transition-all duration-200 ${cropAspectRatio === '3:4'
                      ? 'w-[270px] sm:w-[300px] h-[360px] sm:h-[400px]'
                      : 'w-[270px] sm:w-[300px] h-[270px] sm:h-[300px]'
                    }`}
                  onMouseDown={(e) => {
                    setIsDraggingCrop(true);
                    setCropDragStart({ x: e.clientX - cropPan.x, y: e.clientY - cropPan.y });
                  }}
                  onMouseMove={(e) => {
                    if (isDraggingCrop) {
                      setCropPan({
                        x: e.clientX - cropDragStart.x,
                        y: e.clientY - cropDragStart.y
                      });
                    }
                  }}
                  onMouseUp={() => setIsDraggingCrop(false)}
                  onMouseLeave={() => setIsDraggingCrop(false)}
                >
                  <img
                    src={cropImageSrc}
                    alt="Cắt ảnh"
                    draggable={false}
                    className="absolute max-w-none pointer-events-none origin-center"
                    style={{
                      transform: `translate(calc(-50% + ${cropPan.x}px), calc(-50% + ${cropPan.y}px)) rotate(${cropRotation}deg) scale(${cropZoom})`,
                      top: '50%',
                      left: '50%',
                      width: cropAspectRatio === '3:4' ? '100%' : '120%'
                    }}
                  />
                  <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-white/20">
                    <div className="border-r border-b border-white/20" />
                    <div className="border-r border-b border-white/20" />
                    <div className="border-b border-white/20" />
                    <div className="border-r border-b border-white/20" />
                    <div className="border-r border-b border-white/20" />
                    <div className="border-b border-white/20" />
                    <div className="border-r border-white/20" />
                    <div className="border-r border-white/20" />
                    <div />
                  </div>
                </div>
              </div>

              {/* Tùy chỉnh công cụ cắt */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-2">Tỷ lệ khung hình:</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCropAspectRatio('3:4')}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${cropAspectRatio === '3:4' ? 'bg-[#5C1D24] text-white shadow-xs' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}
                    >
                      3:4 (Chuẩn thời trang)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCropAspectRatio('1:1')}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${cropAspectRatio === '1:1' ? 'bg-[#5C1D24] text-white shadow-xs' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}
                    >
                      1:1 (Vuông)
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-stone-700">Độ thu phóng (Zoom):</label>
                    <span className="text-xs font-mono text-[#5C1D24] font-bold">{Math.round(cropZoom * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ZoomOut className="w-4 h-4 text-stone-400" />
                    <input
                      type="range"
                      min={0.5}
                      max={3}
                      step={0.05}
                      value={cropZoom}
                      onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                      className="w-full accent-[#5C1D24] cursor-pointer"
                    />
                    <ZoomIn className="w-4 h-4 text-stone-400" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCropRotation((prev) => (prev + 90) % 360)}
                  className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Xoay 90°</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCropZoom(1);
                    setCropPan({ x: 0, y: 0 });
                    setCropRotation(0);
                  }}
                  className="text-xs font-medium text-stone-500 hover:text-stone-800 underline cursor-pointer"
                >
                  Đặt lại căn chỉnh
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setIsCropModalOpen(false)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Hủy bỏ
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (cropEditingIndex !== null) {
                      setFormImages(prev => {
                        const next = [...prev];
                        next[cropEditingIndex] = cropImageSrc;
                        return next;
                      });
                    } else {
                      setFormImages(prev => [...prev, cropImageSrc]);
                      if (!formImageUrl) setFormImageUrl(cropImageSrc);
                    }
                    setIsCropModalOpen(false);
                    showToast('Đã lưu ảnh', 'Đã thêm ảnh gốc vào thư viện sản phẩm', 'info');
                  }}
                  className="px-3.5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Giữ Nguyên Ảnh Gốc
                </button>
                <button
                  type="button"
                  onClick={handleApplyCrop}
                  className="px-5 py-2.5 bg-[#5C1D24] hover:bg-[#48161C] text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Áp Dụng & Lưu Khung Hình</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: PRODUCT SIZE CHART & VARIANTS ================= */}
      {selectedProductSizeChart && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-900/45 animate-fadeIn overflow-y-auto"
          onClick={() => setSelectedProductSizeChart(null)}
        >
          <div
            className="w-full max-w-3xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-stone-200 my-auto max-h-[88vh] flex flex-col text-left animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-4 border-b border-stone-100 shrink-0">
              <div className="flex items-center gap-4">
                <img
                  src={selectedProductSizeChart.images?.[0]}
                  alt={selectedProductSizeChart.name}
                  className="w-14 h-14 object-cover rounded-xl border border-stone-200 shrink-0"
                />
                <div>
                  <h3 className="font-bold text-base text-charcoal-900">
                    Bảng Size Kỹ Thuật: {selectedProductSizeChart.name}
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Mã SP: <span className="font-mono font-bold text-brand-700">{selectedProductSizeChart.id}</span> • Dải kích cỡ: {selectedProductSizeChart.sizes?.join(', ')} • {selectedProductSizeChart.variants?.length || 0} biến thể SKU
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProductSizeChart(null)}
                className="p-1.5 text-stone-400 hover:text-charcoal-800 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto py-5 space-y-6 flex-1 text-xs">
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="font-bold text-charcoal-900 text-sm flex items-center gap-2">
                    <Tag className="w-4 h-4 text-purple-600" />
                    Thông Số Kỹ Thuật Đo Chuẩn Big Size (XL–5XL)
                  </h4>
                  <span className="text-[11px] text-stone-400">Đơn vị: Centimet (cm) / Kilogram (kg)</span>
                </div>
                <div className="overflow-x-auto rounded-2xl border border-stone-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-3 pl-4">Kích Cỡ</th>
                        <th className="p-3">Chiều Cao</th>
                        <th className="p-3">Cân Nặng Khuyến Nghị</th>
                        <th className="p-3">Vòng Ngực</th>
                        <th className="p-3">Vòng Eo</th>
                        <th className="p-3">Vòng Mông</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {(selectedProductSizeChart.sizeChart || []).map((row: any) => (
                        <tr key={row.size} className="hover:bg-purple-50/30">
                          <td className="p-3 pl-4 font-mono font-black text-brand-700 bg-stone-50/50">
                            {row.size}
                          </td>
                          <td className="p-3 font-medium text-charcoal-800">{row.heightRange || '—'}</td>
                          <td className="p-3 font-bold text-purple-700">{row.weightRange || '—'}</td>
                          <td className="p-3 text-charcoal-700">{row.chest || '—'}</td>
                          <td className="p-3 text-charcoal-700">{row.waist || '—'}</td>
                          <td className="p-3 text-charcoal-700">{row.hips || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="font-bold text-charcoal-900 text-sm flex items-center gap-2">
                    <Package className="w-4 h-4 text-brand-700" />
                    Chi Tiết Tồn Kho Từng Phân Loại SKU
                  </h4>
                  <span className="text-[11px] text-emerald-700 font-semibold">
                    Tổng tồn kho: {selectedProductSizeChart.variants?.reduce((s: number, v: any) => s + (v.stock || 0), 0) || 0} sản phẩm
                  </span>
                </div>
                <div className="overflow-x-auto rounded-2xl border border-stone-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-3 pl-4">Mã SKU</th>
                        <th className="p-3">Màu Sắc</th>
                        <th className="p-3">Kích Cỡ</th>
                        <th className="p-3">Giá Bán</th>
                        <th className="p-3 text-right pr-4">Số Lượng Thực Tế</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {(selectedProductSizeChart.variants || []).map((v: any) => (
                        <tr key={v.sku || v.id} className="hover:bg-stone-50/50">
                          <td className="p-3 pl-4 font-mono font-bold text-stone-800">{v.sku || v.id}</td>
                          <td className="p-3">
                            <span className="inline-flex items-center gap-1.5 font-medium text-charcoal-800">
                              <span
                                className="w-3 h-3 rounded-full border border-stone-300 shrink-0"
                                style={{ backgroundColor: v.colorHex || '#ccc' }}
                              />
                              {v.colorName}
                            </span>
                          </td>
                          <td className="p-3 font-mono font-bold text-brand-700">{v.size}</td>
                          <td className="p-3 font-semibold text-charcoal-800">
                            {selectedProductSizeChart.price?.toLocaleString('vi-VN')}₫
                          </td>
                          <td className="p-3 text-right pr-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${(v.stock || 0) > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                              {(v.stock || 0) > 0 ? `${v.stock} cái` : 'Hết hàng'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-stone-400">
                Bảng thông số kích thước chuẩn hóa theo danh mục sản phẩm
              </span>
              <button
                type="button"
                onClick={() => setSelectedProductSizeChart(null)}
                className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Product Modal */}
      <ConfirmModal
        isOpen={productToDelete !== null}
        title="Xác nhận gỡ sản phẩm khỏi hệ thống?"
        description={`Bạn có chắc chắn muốn xóa sản phẩm "${productToDelete?.name}" khỏi hệ thống? Thao tác này sẽ gỡ toàn bộ các phân loại size của sản phẩm.`}
        confirmText="Xóa vĩnh viễn"
        cancelText="Hủy bỏ"
        variant="danger"
        onConfirm={async () => {
          if (!productToDelete) return;
          if (!/^prod-0[1-9]\d*$/.test(productToDelete.id)) {
            showToast('Không thể xóa sản phẩm', 'Chưa xác định được sản phẩm trên hệ thống. Vui lòng tải lại.', 'error');
            return;
          }
          const numId = Number(productToDelete.id.slice(6));
          if (!isNaN(numId)) {
            // Áp dụng Soft Delete: Chuyển trạng thái sang 'ngung_kinh_doanh' để bảo toàn toàn vẹn dữ liệu đơn hàng
            const { error: softDelErr } = await supabase
              .from('sanpham')
              .update({ trang_thai: 'ngung_kinh_doanh' })
              .eq('ma_sp', numId);

            if (softDelErr) {
              console.warn('[ProductsTab] Soft delete sang ngung_kinh_doanh thất bại:', softDelErr);
            }
          }
          const next = productList.filter((p) => p.id !== productToDelete.id);
          setProductList(next);
          try {
            sessionStorage.setItem('curve_live_products', JSON.stringify(next));
          } catch { }
          if (appendAuditLog) {
            appendAuditLog(
              'Gỡ sản phẩm kinh doanh (Soft Delete)',
              'Sản Phẩm & Size',
              productToDelete.id,
              productToDelete.name,
              'success',
              'Đã chuyển trạng thái sản phẩm sang ngưng kinh doanh'
            );
          }
          showToast('Đã gỡ sản phẩm', `Sản phẩm "${productToDelete.name}" đã được chuyển sang ngưng kinh doanh`, 'info');
          setIsProductModalOpen(false);
          setProductToDelete(null);
        }}
        onCancel={() => setProductToDelete(null)}
      />
    </div>
  );
};
