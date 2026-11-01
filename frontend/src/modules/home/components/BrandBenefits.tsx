import React, { useState } from 'react';
import {
  Maximize2,
  Feather,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Ruler,
  ShieldCheck
} from 'lucide-react';

interface BenefitItem {
  id: string;
  number: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  oneLiner: string;
  badge: string;
  image: string;
  imageAlt: string;
}

interface BrandBenefitsProps {
  onNavigate?: (path: string) => void;
}

export const BrandBenefits: React.FC<BrandBenefitsProps> = ({ onNavigate }) => {
  const benefits: BenefitItem[] = [
    {
      id: 'tech-flex',
      number: '01',
      icon: Maximize2,
      title: 'Cạp Chun Ẩn Co Giãn 5–7cm',
      oneLiner: 'Tự động mở rộng thêm 5–7cm khi ngồi hoặc ăn no, bên ngoài vẫn phẳng phiu lịch lãm không lộ nếp cạp chun.',
      badge: 'Giải phóng áp lực thắt lưng',
      image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=1200&auto=format&fit=crop&q=85',
      imageAlt: 'Công nghệ cạp chun ẩn co giãn thắt lưng thoải mái'
    },
    {
      id: 'cotton-tencel',
      number: '02',
      icon: Feather,
      title: 'Vải Cotton 260GSM Đứng Phom',
      oneLiner: 'Chất vải định lượng đầm tay che trọn ngấn bụng và lưng, dệt sợi tự nhiên thoáng khí gấp 3 lần suốt cả ngày.',
      badge: 'Che khuyết điểm bụng lưng',
      image: 'https://images.unsplash.com/photo-1523381294911-8d3cead13475?w=1200&auto=format&fit=crop&q=85',
      imageAlt: 'Vải dệt sợi cotton tự nhiên đứng phom không lộ khuyết điểm'
    },
    {
      id: 'ergonomics-3d',
      number: '03',
      icon: CheckCircle2,
      title: 'Cắt May 3D Chuẩn Người Việt',
      oneLiner: 'Hạ nách sâu, lưng áo dài phủ mông, tự do cúi người hay nâng tay mà không bị co rút hở lưng bụng.',
      badge: 'Chuẩn nhân trắc học 10.000+ số đo',
      image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1200&auto=format&fit=crop&q=85',
      imageAlt: 'Phom dáng cắt may 3D công thái học cho người ngoại cỡ'
    },
    {
      id: 'doorstep-exchange',
      number: '04',
      icon: RefreshCw,
      title: 'Đổi Size Miễn Phí Tận Nhà',
      oneLiner: 'Shipper mang size mới đến tận cửa và lấy lại size cũ cùng lúc, miễn phí 100% trong 7 ngày không cần ra bưu cục.',
      badge: 'An tâm mua sắm 100%',
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&auto=format&fit=crop&q=85',
      imageAlt: 'Dịch vụ đổi size tận nhà miễn phí và tiện lợi'
    }
  ];

  const [activeIndex, setActiveIndex] = useState<number>(0);
  const activeBenefit = benefits[activeIndex];

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + benefits.length) % benefits.length);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % benefits.length);
  };

  return (
    <section className="reveal-init py-10 lg:py-12 bg-surface-cream border-y border-surface-border scroll-mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Khung Card bo góc lớn y hệt kiến trúc chuẩn của SizeCalculatorWidget (Ảnh 1) */}
        <div className="bg-white rounded-3xl border border-stone-200/90 shadow-xl p-6 sm:p-8 lg:p-10 relative overflow-hidden">
          {/* Header Section: Tinh gọn, sang trọng, không chiếm diện tích quá đà */}
          <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#5C1D24]/10 text-[#5C1D24] border border-[#5C1D24]/20 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#5C1D24]" />
              <span>TIÊU CHUẨN MAY ĐO THỰC TẾ</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-charcoal-900 tracking-tight">
              Vì Sao Khách Hàng Big Size Tin Chọn Chúng Tôi?
            </h2>

            <p className="text-xs sm:text-sm text-charcoal-600 mt-1.5 max-w-xl mx-auto leading-relaxed">
              Mỗi thiết kế là một giải pháp công thái học tôn vinh vóc dáng, giúp bạn tự tin, đĩnh đạc và thoải mái trọn vẹn trong từng cử động.
            </p>
          </div>

          {/* ================= 2-COLUMN VIEWPORT-FIT GRID (CHUẨN ẢNH 1) ================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
            {/* CỘT TRÁI: 4 TABS GỌN GÀNG, LIA CHUỘT PHÌNH TO ÊM ÁI */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-2.5">
              <div className="space-y-2">
                {benefits.map((b, idx) => {
                  const isActive = activeIndex === idx;
                  const Icon = b.icon;

                  return (
                    <div
                      key={b.id}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => setActiveIndex(idx)}
                      className={`relative rounded-xl cursor-pointer transition-all duration-200 border select-none ${
                        isActive
                          ? 'bg-stone-50/90 text-charcoal-900 border-[#5C1D24]/35 shadow-sm ring-1 ring-[#5C1D24]/15 p-3 sm:p-3.5 scale-[1.01]'
                          : 'bg-white hover:bg-stone-50/60 text-stone-700 border-stone-200/80 shadow-2xs hover:border-[#5C1D24]/20 p-2.5 sm:p-3 hover:translate-x-0.5'
                      }`}
                    >
                      {/* Header Row: Số thứ tự + Icon + Tiêu đề ngắn gọn + Mũi tên */}
                      <div className="flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Number Badge */}
                          <span
                            className={`font-mono text-xs font-black tracking-wider shrink-0 transition-colors ${
                              isActive ? 'text-[#5C1D24]' : 'text-stone-400'
                            }`}
                          >
                            {b.number}
                          </span>

                          {/* Icon */}
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                              isActive
                                ? 'bg-[#5C1D24]/10 text-[#5C1D24]'
                                : 'bg-stone-100 text-stone-500'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>

                          {/* Title */}
                          <h3
                            className={`font-bold text-xs sm:text-sm leading-snug truncate transition-colors ${
                              isActive ? 'text-charcoal-900' : 'text-stone-800'
                            }`}
                          >
                            {b.title}
                          </h3>
                        </div>

                        {/* Arrow Icon Indicator */}
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-200 shrink-0 ${
                            isActive
                              ? 'bg-[#5C1D24]/10 text-[#5C1D24] rotate-90'
                              : 'text-stone-400'
                          }`}
                        >
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      </div>

                      {/* Nội dung khi Active/Hover: 1 câu thông điệp đắt giá + Huy hiệu */}
                      {isActive && (
                        <div className="mt-2 pt-2 border-t border-stone-200/60 space-y-1.5 animate-fadeIn">
                          <p className="text-[11px] sm:text-xs text-stone-600 leading-relaxed font-normal">
                            {b.oneLiner}
                          </p>

                          <div className="pt-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#5C1D24]/5 text-[#5C1D24] border border-[#5C1D24]/15">
                              <ShieldCheck className="w-3 h-3 text-[#5C1D24]" />
                              <span>{b.badge}</span>
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom Actions: Nằm gọn gàng ngay dưới, không bị tràn ra ngoài màn hình */}
              <div className="pt-1 flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => onNavigate ? onNavigate('/products') : (window.location.href = '/products')}
                  className="w-full sm:w-auto flex-1 px-4 py-2.5 rounded-xl bg-charcoal-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 group"
                >
                  <span>Xem Sản Phẩm Chuẩn Size</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate ? onNavigate('/size-guide') : (window.location.href = '/size-guide')}
                  className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-white hover:bg-stone-50 text-stone-700 border border-stone-200/90 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <Ruler className="w-3.5 h-3.5 text-[#5C1D24]" />
                  <span>Bảng Đo Nhân Trắc Học</span>
                </button>
              </div>
            </div>

            {/* CỘT PHẢI: KHUNG TRÌNH DIỄN HÌNH ẢNH GỌN GÀNG, CHIỀU CAO 430PX CHUẨN MỰC */}
            <div className="lg:col-span-7 relative h-[400px] sm:h-[430px] rounded-2xl overflow-hidden border border-stone-200/90 shadow-md bg-stone-900 group flex flex-col justify-between">
              {/* Layers các ảnh với hiệu ứng Cross-fade */}
              {benefits.map((b, idx) => {
                const isSelected = activeIndex === idx;
                return (
                  <div
                    key={b.id}
                    className={`absolute inset-0 transition-opacity duration-500 ease-out ${
                      isSelected
                        ? 'opacity-100 z-10 pointer-events-auto'
                        : 'opacity-0 z-0 pointer-events-none'
                    }`}
                  >
                    <img
                      src={b.image}
                      alt={b.imageAlt}
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-103"
                    />

                    {/* Gradient phủ nhẹ chỉ ở đỉnh và đáy */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                  </div>
                );
              })}

              {/* Top Bar: Badge Trực Quan & Nút Điều Hướng Tròn Kính Mờ */}
              <div className="relative z-20 p-4 sm:p-5 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-bold bg-black/45 text-white backdrop-blur-md border border-white/20 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  TIÊU CHUẨN THỰC TẾ
                </span>

                {/* Prev / Next Buttons */}
                <div className="flex items-center gap-1 bg-black/45 backdrop-blur-md p-0.5 rounded-full border border-white/20">
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="w-7 h-7 rounded-full hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                    title="Tính năng trước"
                    aria-label="Previous Benefit"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-mono font-bold text-white/90 px-1.5">
                    0{activeIndex + 1} / 0{benefits.length}
                  </span>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="w-7 h-7 rounded-full hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                    title="Tính năng tiếp theo"
                    aria-label="Next Benefit"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Bottom Bar: Tinh gọn, hiển thị rõ ràng */}
              <div className="relative z-20 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#D4AF37] font-bold">
                      GIẢI PHÁP 0{activeBenefit.number}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-white/40" />
                    <div className="flex items-center gap-1.5">
                      {benefits.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setActiveIndex(i)}
                          className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                            activeIndex === i ? 'w-5 bg-[#D4AF37]' : 'w-1.5 bg-white/40 hover:bg-white/70'
                          }`}
                          aria-label={`Slide ${i + 1}`}
                        />
                      ))}
                    </div>
                  </div>

                  <h4 className="text-base sm:text-xl font-bold text-white tracking-tight drop-shadow-md">
                    {activeBenefit.title}
                  </h4>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate ? onNavigate('/products') : (window.location.href = '/products')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border border-white/30 text-xs font-semibold transition-all cursor-pointer shadow-xs shrink-0 group"
                >
                  <span>Khám phá bộ sưu tập</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform text-[#D4AF37]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
