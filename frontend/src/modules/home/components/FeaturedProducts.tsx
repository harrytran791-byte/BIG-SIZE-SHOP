import React, { useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { mockProducts } from '@/data/products';
import { useProducts } from '@/modules/product/context/ProductContext';
import { ProductCard } from '@/modules/product/components/ProductCard';
import { QuickViewModal } from '@/modules/product/components/QuickViewModal';
import { Product } from '@/types';
import { useAuth } from '@/context/AuthContext';

interface FeaturedProductsProps {
  onNavigate: (path: string) => void;
  onOpenSizeAdvisor?: (product: Product) => void;
}

export const FeaturedProducts: React.FC<FeaturedProductsProps> = ({
  onNavigate,
  onOpenSizeAdvisor,
}) => {
  const { currentRole } = useAuth();
  const isStaff = currentRole === 'admin' || currentRole === 'manager';
  const { products } = useProducts();
  const [activeTab, setActiveTab] = useState<'all' | 'bestseller' | 'nam' | 'nu'>('all');
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  const displayList = products && products.length > 0 ? products : mockProducts;
  const filteredProducts = displayList.filter((p) => {
    if (activeTab === 'bestseller') return p.isBestSeller;
    if (activeTab === 'nam') return p.gender === 'nam' || p.gender === 'unisex';
    if (activeTab === 'nu') return p.gender === 'nu' || p.gender === 'unisex';
    return true;
  });

  const tabs = [
    { id: 'all', label: 'Tất Cả Sản Phẩm' },
    { id: 'bestseller', label: 'Bán Chạy Nhất' },
    { id: 'nam', label: 'Thời Trang Nam (XL-5XL)' },
    { id: 'nu', label: 'Thời Trang Nữ (XL-5XL)' },
  ];

  return (
    <section className="py-16 bg-surface-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-brand-600 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4 text-brand-500" />
              <span>Sản phẩm tuyển chọn</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-charcoal-900 tracking-tight">
              Phom Dáng Hoàn Hảo Cho Bạn
            </h2>
          </div>

          <button
            onClick={() => onNavigate('/products')}
            className="text-xs sm:text-sm font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 hover:underline"
          >
            <span>Khám phá 50+ mẫu Big Size</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-charcoal-900 text-white shadow-sm'
                  : 'bg-surface-cream text-charcoal-700 hover:bg-stone-200 border border-surface-border'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Product Grid: 4 cols on desktop, 2 cols on mobile */}
        <div key={activeTab} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredProducts.map((product, idx) => {
            const delayClass = idx % 4 === 1 ? 'delay-100' : idx % 4 === 2 ? 'delay-150' : idx % 4 === 3 ? 'delay-200' : '';
            return (
              <div key={`${activeTab}-${product.id}`} className={`reveal-init ${delayClass}`}>
                <ProductCard
                  product={product}
                  onNavigate={onNavigate}
                  onQuickView={(p) => setQuickViewProduct(p)}
                />
              </div>
            );
          })}
        </div>


      </div>

      {/* Quick View Modal */}
      <QuickViewModal
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        onNavigate={onNavigate}
        onOpenSizeAdvisor={onOpenSizeAdvisor}
      />
    </section>
  );
};
