import React, { useState } from 'react';
import { Sparkles, X, ShoppingBag, Eye, ArrowRight } from 'lucide-react';
import { mockProducts } from '../../data/products';

interface LookbookItem {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  modelInfo: string;
  featuredProductId: string;
}

const lookbooks: LookbookItem[] = [
  {
    id: 'lb-1',
    title: 'Smart Casual Công Sở Đĩnh Đạc',
    subtitle: 'Áo Sơ Mi Oxford & Quần Tây Xếp Ly 2 Ly',
    image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=900&auto=format&fit=crop&q=80',
    modelInfo: 'Người mẫu cao 1m78, nặng 102kg (Đang mặc Size 3XL)',
    featuredProductId: 'prod-02',
  },
  {
    id: 'lb-2',
    title: 'Tiệc Tối Quyến Rũ & Tự Tin',
    subtitle: 'Đầm Xòe Chữ A Cổ Tim Lụa Tencel',
    image: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=900&auto=format&fit=crop&q=80',
    modelInfo: 'Người mẫu cao 1m65, nặng 88kg (Đang mặc Size 3XL)',
    featuredProductId: 'prod-04',
  },
  {
    id: 'lb-3',
    title: 'Dạo Phố Cuối Tuần Năng Động',
    subtitle: 'Áo Polo Dry-Tech Tổ Ong & Quần Jeans Cạp Chun Ẩn',
    image: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=900&auto=format&fit=crop&q=80',
    modelInfo: 'Người mẫu cao 1m75, nặng 96kg (Đang mặc Size 3XL)',
    featuredProductId: 'prod-01',
  },
  {
    id: 'lb-4',
    title: 'Quyền Lực & Thanh Lịch',
    subtitle: 'Áo Khoác Blazer Suông Phong Cách Hàn Quốc',
    image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=900&auto=format&fit=crop&q=80',
    modelInfo: 'Người mẫu cao 1m68, nặng 92kg (Đang mặc Size 3XL)',
    featuredProductId: 'prod-05',
  },
];

interface LookbookSectionProps {
  onNavigate: (path: string) => void;
}

export const LookbookSection: React.FC<LookbookSectionProps> = ({ onNavigate }) => {
  const [activeLightbox, setActiveLightbox] = useState<LookbookItem | null>(null);

  return (
    <section id="lookbook" className="py-20 bg-surface-light border-t border-surface-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 text-brand-600 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-brand-500" />
            <span>Bộ sưu tập phong cách</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-charcoal-900 tracking-tight">
            Lookbook: Tự Tin Tỏa Sáng Ở Mọi Kích Cỡ
          </h2>
          <p className="text-xs sm:text-sm text-charcoal-600 mt-2">
            Xem thực tế người mẫu Big Size diện trang phục đời thực với phom dáng chuẩn, không photoshop thu nhỏ cơ thể.
          </p>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {lookbooks.map((item) => (
            <div
              key={item.id}
              onClick={() => setActiveLightbox(item)}
              className="group relative rounded-3xl overflow-hidden bg-stone-100 aspect-[3/4] cursor-pointer shadow-soft hover:shadow-xl transition-all duration-500"
            >
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/85 via-charcoal-900/20 to-transparent opacity-80 group-hover:opacity-95 transition-opacity" />

              {/* Tag button in corner */}
              <div className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center text-white group-hover:bg-brand-500 transition-colors">
                <Eye className="w-4 h-4" />
              </div>

              {/* Bottom Info */}
              <div className="absolute bottom-5 left-5 right-5 text-white">
                <p className="text-[11px] text-brand-300 font-semibold uppercase tracking-wider">
                  {item.subtitle}
                </p>
                <h3 className="font-heading font-bold text-base sm:text-lg text-white mt-1 leading-snug">
                  {item.title}
                </h3>
                <p className="text-[11px] text-stone-300 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  {item.modelInfo}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {activeLightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-charcoal-900/80 backdrop-blur-md"
            onClick={() => setActiveLightbox(null)}
          />

          <div className="relative bg-white rounded-3xl shadow-modal max-w-2xl w-full overflow-hidden border border-surface-border z-10 animate-scaleIn">
            <button
              onClick={() => setActiveLightbox(null)}
              className="absolute top-4 right-4 z-20 p-2 bg-white/80 hover:bg-white text-charcoal-700 rounded-full shadow-sm"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2">
              <div className="aspect-[3/4] bg-stone-100 overflow-hidden">
                <img
                  src={activeLightbox.image}
                  alt={activeLightbox.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="p-6 sm:p-8 flex flex-col justify-between space-y-4">
                <div>
                  <span className="text-xs uppercase font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
                    Chi tiết set đồ Lookbook
                  </span>
                  <h3 className="font-heading font-bold text-xl text-charcoal-900 mt-2">
                    {activeLightbox.title}
                  </h3>
                  <p className="text-xs font-semibold text-charcoal-600 mt-1">
                    {activeLightbox.subtitle}
                  </p>

                  <div className="mt-4 p-3.5 bg-surface-cream rounded-2xl border border-surface-border text-xs text-charcoal-700">
                    <p className="font-bold text-charcoal-900 mb-1">Thông số người mẫu ảnh:</p>
                    <p>{activeLightbox.modelInfo}</p>
                    <p className="text-emerald-700 font-semibold mt-1">
                      Đảm bảo chuẩn phom người mặc không cần bóp eo hay sửa nách.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-surface-border">
                  <button
                    onClick={() => {
                      const prodId = activeLightbox.featuredProductId;
                      setActiveLightbox(null);
                      onNavigate(`/product/${prodId}`);
                    }}
                    className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-float transition-all"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Xem sản phẩm trong set đồ</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveLightbox(null);
                      onNavigate('/products');
                    }}
                    className="w-full py-2 text-center text-xs font-bold text-charcoal-600 hover:text-charcoal-900"
                  >
                    Xem toàn bộ bộ sưu tập
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
