import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { categoriesList } from '../../data/products';

interface CategoryGridProps {
  onNavigate: (path: string) => void;
}

export const CategoryGrid: React.FC<CategoryGridProps> = ({ onNavigate }) => {
  // Exclude 'tat-ca' to display the 4 core categories matching Manager role
  const featuredCats = categoriesList.filter((c) => c.id !== 'tat-ca');

  return (
    <section className="py-16 bg-surface-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#5C1D24] text-xs font-bold uppercase tracking-wider mb-2">
              <span className="w-6 h-0.5 bg-[#5C1D24] rounded-full" />
              <span>Phân loại trang phục may đo</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-charcoal-900 tracking-tight">
              Danh Mục Thiết Kế Riêng Cho Bạn
            </h2>
          </div>
          <button
            onClick={() => onNavigate('/products')}
            className="text-xs sm:text-sm font-bold text-[#5C1D24] hover:text-[#7A2832] flex items-center gap-1 hover:underline cursor-pointer transition-colors"
          >
            <span>Xem toàn bộ bộ sưu tập</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {/* Symmetrical 4-column grid (2 cols on mobile, 4 cols on lg screens) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {featuredCats.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onNavigate(`/products?category=${cat.id}`)}
              className="group relative flex flex-col rounded-2xl overflow-hidden bg-white border border-stone-200/90 shadow-soft hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 text-left cursor-pointer"
            >
              {/* Image Aspect Box with 60fps GPU acceleration */}
              <div className="aspect-[4/5] w-full overflow-hidden bg-stone-100 relative">
                {cat.image && (
                  <img
                    src={cat.image}
                    alt={cat.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out will-change-transform"
                  />
                )}
                {/* Cinematic Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1C1917]/90 via-[#1C1917]/35 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-300" />

                {/* Top Right Badge: Size Range */}
                <div className="absolute top-3 right-3 pointer-events-none">
                  <span className="bg-white/20 backdrop-blur-md px-2 py-0.5 rounded text-white font-mono text-[10px] font-bold border border-white/20 shadow-xs">
                    XL – 5XL
                  </span>
                </div>

                {/* Bottom Content: Clean prominent category name */}
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h3 className="font-heading font-bold text-base sm:text-lg text-white group-hover:text-[#D4AF37] transition-colors leading-snug">
                    {cat.name}
                  </h3>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
