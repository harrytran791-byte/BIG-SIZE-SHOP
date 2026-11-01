import React, { useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { mockProducts } from '../../data/products';
import { ProductCard } from '../products/ProductCard';
import { QuickViewModal } from '../products/QuickViewModal';
import { Product } from '../../types';
import { useAuth } from '../../context/AuthContext';

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
  const [activeTab, setActiveTab] = useState<'all' | 'bestseller' | 'nam' | 'nu'>('all');
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  const filteredProducts = mockProducts.filter((p) => {
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onNavigate={onNavigate}
              onQuickView={(p) => setQuickViewProduct(p)}
            />
          ))}
        </div>

        {/* Bottom Banner (Hidden for Admin & Manager) */}
        {!isStaff && (
          <div className="mt-12 p-6 rounded-2xl bg-brand-50 border border-brand-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-brand-500 text-white font-mono font-bold text-sm flex items-center justify-center shrink-0">
                5XL
              </span>
              <div>
                <p className="text-sm font-bold text-charcoal-900">
                  Bạn chưa biết nên chọn size nào vừa vặn nhất?
                </p>
                <p className="text-xs text-charcoal-600 mt-0.5">
                  Chuyên viên tư vấn Big Size của chúng tôi sẵn sàng hỗ trợ trực tuyến 24/7.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                const el = document.getElementById('size-calculator');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl transition-colors whitespace-nowrap shrink-0"
            >
              Tính size của bạn ngay
            </button>
          </div>
        )}
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
