import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Product, SupabaseCategory } from '@/shared/types';
import { categoryKey, matchesCatalogCategory } from '@/shared/utils/categoryUtils';
import { categoriesList } from '../data/products';
import { fetchProductsFromSupabase, fetchCategoriesFromSupabase, supabase } from '@/shared/services/supabaseClient';
import { requireSavedRows, updateCatalogPrice } from '@/shared/services/catalogService';

interface ProductContextType {
  products: Product[];
  categories: typeof categoriesList;
  categoryRecords: SupabaseCategory[];
  isLoading: boolean;
  isSyncing: boolean;
  refreshProducts: () => Promise<void>;
  getProductById: (id: string) => Product | undefined;
  updateProductPricing: (productId: string, newPrice: number, newOriginalPrice: number, discountPercent: number, importPrice?: number) => Promise<void>;
  updateProductImages: (productId: string, newImages: string[]) => Promise<void>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryRecords, setCategoryRecords] = useState<SupabaseCategory[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const refreshProducts = useCallback(async () => {
    setIsSyncing(true);
    try {
      const [liveProducts, liveCategories] = await Promise.all([
        fetchProductsFromSupabase({ strict: true }), fetchCategoriesFromSupabase({ strict: true }),
      ]);
      setCategoryRecords(liveCategories);
      if (liveProducts) {
        setProducts(liveProducts as Product[]);
        sessionStorage.setItem('curve_live_products', JSON.stringify(liveProducts));
      }
    } catch (err) {
      console.warn('⚠️ Lỗi khi đồng bộ sản phẩm từ Supabase:', err);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    Promise.all([fetchProductsFromSupabase({ strict: true }), fetchCategoriesFromSupabase({ strict: true })])
      .then(([live, liveCategories]) => {
        if (isMounted) setCategoryRecords(liveCategories);
        if (isMounted && live) {
          setProducts(live as Product[]);
          sessionStorage.setItem('curve_live_products', JSON.stringify(live));
        }
      })
      .catch((err) => {
        console.warn('⚠️ Không thể tải sản phẩm từ Supabase:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const reload = () => { void refreshProducts().catch(() => {}); };
    window.addEventListener('curve:catalog-changed', reload);
    return () => window.removeEventListener('curve:catalog-changed', reload);
  }, [refreshProducts]);

  const liveCategoryOptions: typeof categoriesList = useMemo(() => [
    { id: 'tat-ca', name: 'Tất cả sản phẩm', count: products.length },
    ...categoryRecords.filter(c => c.trang_thai === 'hoat_dong').map(c => {
      const template = categoriesList.find(t => t.id === categoryKey(c.code || c.ten_danh_muc));
      return {
        id: categoryKey(c.code || c.ten_danh_muc), code: c.code || '', name: c.ten_danh_muc,
        count: products.filter(p => matchesCatalogCategory(p, String(c.ma_danh_muc), categoryRecords)).length,
        desc: c.mo_ta || '', image: (template && 'image' in template ? template.image : '') || '',
      };
    }),
  ], [products, categoryRecords]);

  const getProductById = useCallback(
    (id: string) => {
      return products.find((p) => p.id === id);
    },
    [products]
  );

  const updateProductPricing = useCallback(async (
    productId: string, newPrice: number, _newOriginalPrice: number, _discountPercent: number, _importPrice?: number,
  ) => {
    await updateCatalogPrice(productId, newPrice);
    await refreshProducts();
  }, [refreshProducts]);

  const updateProductImages = useCallback(async (productId: string, newImages: string[]) => {
    const match = /^prod-0(\d+)$/.exec(productId);
    if (!match || !newImages[0] || newImages.length !== 1) {
      throw new Error('Chỉ có thể cập nhật ảnh đại diện trong lần lưu này.');
    }
    requireSavedRows(await supabase.from('sanpham').update({ hinh_anh: newImages[0] })
      .eq('ma_sp', Number(match[1])).select('ma_sp'), 1);
    await refreshProducts();
  }, [refreshProducts]);

  return (
    <ProductContext.Provider
      value={{
        products,
        categories: liveCategoryOptions,
        categoryRecords,
        isLoading,
        isSyncing,
        refreshProducts,
        getProductById,
        updateProductPricing,
        updateProductImages
      }}
    >
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};
