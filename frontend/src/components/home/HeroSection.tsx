import React, { useState, useEffect } from 'react';
import { ArrowRight, Ruler, CheckCircle } from 'lucide-react';

interface HeroSectionProps {
  onNavigate: (path: string) => void;
  onOpenSizeFinder: () => void;
}

interface HeroSlide {
  id: number;
  type: 'full-room';
  image: string;
  alt: string;
  badgeSize: string;
  badgeTitle: string;
  badgeFeature: string;
  badgeColor: string;
  title: string;
  theme: {
    sectionBg: string;
    overlineText: string;
    overlineDash: string;
    headlineWhite: string;
    headlineAccent: string;
    subheadText: string;
    subheadStrong: string;
    btnPrimary: string;
    btnSecondary: string;
    metricNumber: string;
    metricLabel: string;
    metricBorder: string;
    dotActive: string;
    dotInactive: string;
  };
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: 1,
    type: 'full-room',
    image: '/images/hero-slide-1-bg.jpg',
    alt: 'Bộ sưu tập áo sơ mi Big Size Pastel hè chuẩn phom công sở giấu bụng',
    badgeSize: '3XL',
    badgeTitle: 'Chuẩn Phom Công Sở',
    badgeFeature: 'Giấu bụng 100%',
    badgeColor: 'bg-brand-700',
    title: 'Áo Sơ Mi Pastel',
    theme: {
      sectionBg: 'bg-[#F9F5F1]',
      overlineText: 'text-brand-700',
      overlineDash: 'bg-brand-700',
      headlineWhite: 'text-charcoal-900',
      headlineAccent: 'text-brand-700',
      subheadText: 'text-charcoal-700',
      subheadStrong: 'text-charcoal-900',
      btnPrimary: 'bg-brand-700 hover:bg-brand-800 text-white border-transparent shadow-md',
      btnSecondary: 'bg-white/80 hover:bg-white text-brand-700 border-brand-700/60 shadow-xs',
      metricNumber: 'text-charcoal-900',
      metricLabel: 'text-charcoal-600',
      metricBorder: 'border-stone-300/80',
      dotActive: 'bg-brand-700',
      dotInactive: 'bg-stone-400/60 hover:bg-stone-600'
    }
  },
  {
    id: 2,
    type: 'full-room',
    image: '/images/hero-slide-2-bg.jpg',
    alt: 'Bộ sưu tập thời trang Big Size Thu Đông màu Đỏ Rượu Burgundy sang trọng',
    badgeSize: '4XL',
    badgeTitle: 'Thu Đông Burgundy',
    badgeFeature: 'Chất dạ len & Co giãn 4 chiều',
    badgeColor: 'bg-[#6B1F27]',
    title: 'Đỏ Rượu Burgundy',
    theme: {
      sectionBg: 'bg-[#3A0F13]',
      overlineText: 'text-[#E6D5C3]',
      overlineDash: 'bg-[#E6D5C3]',
      headlineWhite: 'text-white drop-shadow-sm',
      headlineAccent: 'text-[#F3E0CA] drop-shadow-sm',
      subheadText: 'text-[#D8C7B8]',
      subheadStrong: 'text-white',
      btnPrimary: 'bg-[#381015] hover:bg-[#48151B] text-white border border-[#EEDBC5]/25 shadow-md',
      btnSecondary: 'bg-transparent hover:bg-white/10 text-[#EEDBC5] border-[#EEDBC5]/70',
      metricNumber: 'text-[#F3E0CA]',
      metricLabel: 'text-[#C4B2A3]',
      metricBorder: 'border-white/15',
      dotActive: 'bg-[#F3E0CA]',
      dotInactive: 'bg-white/30 hover:bg-white/60'
    }
  },
  {
    id: 3,
    type: 'full-room',
    image: '/images/hero-slide-3-bg.jpg',
    alt: 'Bộ sưu tập thời trang Big Size Xanh Ngọc Lục Bảo & Linen cao cấp',
    badgeSize: '5XL',
    badgeTitle: 'Linen & Smart Chinos',
    badgeFeature: 'Thoáng khí & Co giãn 4 chiều',
    badgeColor: 'bg-[#1B4332]',
    title: 'Xanh Rêu Emerald',
    theme: {
      sectionBg: 'bg-[#0E231C]',
      overlineText: 'text-[#E2CEB3]',
      overlineDash: 'bg-[#E2CEB3]',
      headlineWhite: 'text-white drop-shadow-sm',
      headlineAccent: 'text-[#F2D8B3] drop-shadow-sm',
      subheadText: 'text-[#D1DDD6]',
      subheadStrong: 'text-white',
      btnPrimary: 'bg-[#0C1E18] hover:bg-[#153328] text-white border border-[#F2D8B3]/25 shadow-md',
      btnSecondary: 'bg-transparent hover:bg-white/10 text-[#F2D8B3] border-[#F2D8B3]/70',
      metricNumber: 'text-[#F2D8B3]',
      metricLabel: 'text-[#B8C8BF]',
      metricBorder: 'border-white/15',
      dotActive: 'bg-[#F2D8B3]',
      dotInactive: 'bg-white/30 hover:bg-white/60'
    }
  },
  {
    id: 4,
    type: 'full-room',
    image: '/images/hero-slide-4-bg.jpg',
    alt: 'Bộ sưu tập thời trang Big Size Hồng Đất Dusty Rose & Pastel thanh lịch',
    badgeSize: 'XL-5XL',
    badgeTitle: 'Dusty Rose & Peach',
    badgeFeature: 'Chất đũi lụa & Co giãn 4 chiều',
    badgeColor: 'bg-[#8C434D]',
    title: 'Hồng Đất Dusty Rose',
    theme: {
      sectionBg: 'bg-[#E8D1C9]',
      overlineText: 'text-[#3D1D1F]',
      overlineDash: 'bg-[#3D1D1F]',
      headlineWhite: 'text-[#2A1214]',
      headlineAccent: 'text-[#5C1D24]',
      subheadText: 'text-[#4A2D30]',
      subheadStrong: 'text-[#2A1214]',
      btnPrimary: 'bg-[#4A151B] hover:bg-[#5C1D24] text-white border border-[#4A151B] shadow-md',
      btnSecondary: 'bg-[#F3E2DD]/70 hover:bg-[#F3E2DD] text-[#4A151B] border-[#5C1D24]/50',
      metricNumber: 'text-[#4A151B]',
      metricLabel: 'text-[#5C3F42]',
      metricBorder: 'border-[#5C1D24]/20',
      dotActive: 'bg-[#4A151B]',
      dotInactive: 'bg-[#BFA098] hover:bg-[#8C6D65]'
    }
  }
];

// Module-level persistent active slide index so navigating between pages never causes slide reset or white flash
let globalHeroSlide = 0;

// Pre-warm browser cache for all 4 hero images so returning from other pages never flashes white
if (typeof window !== 'undefined') {
  HERO_SLIDES.forEach((slide) => {
    const preloader = new Image();
    preloader.src = slide.image;
  });
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onNavigate, onOpenSizeFinder }) => {
  const [currentSlide, setCurrentSlide] = useState(globalHeroSlide);

  // Synchronize state with module variable
  const goToSlide = (idx: number) => {
    globalHeroSlide = idx;
    setCurrentSlide(idx);
  };

  // Tự động chuyển sang slide kế tiếp sau mỗi 5s & Bảo vệ mượt mà khi người dùng quay lại tab (Page Visibility API)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const startTimer = (delay = 5000) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        // Chỉ chuyển slide nếu tab đang được người dùng nhìn thấy
        if (typeof document !== 'undefined' && !document.hidden) {
          const next = (globalHeroSlide + 1) % HERO_SLIDES.length;
          goToSlide(next);
        }
      }, delay);
    };

    // Bắt đầu chu kỳ 5 giây cho slide hiện tại
    startTimer(5000);

    // Lắng nghe sự kiện chuyển đổi tab (Page Visibility API)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Người dùng đã rời tab: Tạm dừng bộ đếm để không dồn ứ sự kiện
        if (timer) clearTimeout(timer);
      } else {
        // Người dùng vừa click quay lại tab:
        // Đệm ít nhất 3.5s để khách quan sát slide hiện tại trước, sau đó mới hòa mờ sang slide tiếp theo (Triệt tiêu 100% cú giật jump-cut)
        startTimer(3500);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentSlide]);

  const currentSlideData = HERO_SLIDES[currentSlide];

  return (
    <section className={`relative overflow-hidden ${currentSlideData.theme.sectionBg} border-b border-surface-border select-none transition-colors duration-1000 ease-in-out`}>
      {/* Multi-layer Stacking Crossfade: Cả 4 ảnh nằm sẵn trong DOM, chuyển mờ bằng GPU opacity 1000ms y hệt video */}
      <div className="absolute inset-0 w-full h-full z-0 overflow-hidden">
        {HERO_SLIDES.map((slide, index) => {
          const isActive = index === currentSlide;
          return (
            <div
              key={slide.id}
              className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
              aria-hidden={!isActive}
            >
              <img
                src={slide.image}
                alt={slide.alt}
                loading="eager"
                fetchPriority={index === 0 ? 'high' : 'auto'}
                decoding="async"
                className="w-full h-full object-cover object-center lg:object-right-top"
              />
            </div>
          );
        })}
        {/* Subtle gradient vignette on small mobile screens to ensure razor-sharp text legibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/10 to-transparent lg:from-transparent pointer-events-none z-20" />
      </div>

      <div className="w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[580px] lg:min-h-[640px] xl:min-h-[680px]">
          {/* Text Content - Left (6 cols) - 100% HTML & CSS THẬT, TỰ ĐỘNG CHUYỂN MÀU THEO PHONG CÁCH */}
          <div
            className="lg:col-span-6 xl:col-span-6 flex flex-col justify-center py-12 lg:py-16 xl:py-20 z-10 px-6 sm:px-10 lg:pr-8 xl:pr-12"
            style={{
              paddingLeft: 'max(1.5rem, calc((100vw - 1280px) / 2 + 2rem))',
            }}
          >
            <div className="max-w-xl space-y-7">
              {/* Top overline label with dash */}
              <div className="flex items-center gap-2 text-[11px] sm:text-xs font-bold uppercase tracking-[0.2em]">
                <span className={`w-8 h-px ${currentSlideData.theme.overlineDash} shrink-0 transition-colors duration-1000 ease-in-out`} />
                <span className={`${currentSlideData.theme.overlineText} transition-colors duration-1000 ease-in-out`}>
                  Thời Trang Ngoại Cỡ Thiết Kế Độc Quyền • XL–5XL
                </span>
              </div>

              {/* Main Headline with Sans Bold (Arial) */}
              <h1 className="text-4xl sm:text-5xl lg:text-[54px] xl:text-[60px] leading-[1.12] tracking-tight">
                <span className={`block font-bold ${currentSlideData.theme.headlineWhite} transition-colors duration-1000 ease-in-out`}>
                  Big Size.
                </span>
                <span className={`font-bold ${currentSlideData.theme.headlineAccent} block mt-1.5 transition-colors duration-1000 ease-in-out`}>
                  Big Confidence.
                </span>
              </h1>

              {/* Subhead text */}
              <p className={`text-xs sm:text-sm ${currentSlideData.theme.subheadText} leading-relaxed font-sans transition-colors duration-1000 ease-in-out`}>
                Tạm biệt nỗi lo áo chật bụng, quần kích đùi. Trang phục may đo theo công thái học người đầy đặn từ{' '}
                <strong className={currentSlideData.theme.subheadStrong}>75kg đến 140kg</strong>, tôn dáng thanh lịch với chất liệu cao cấp co giãn 4 chiều.
              </p>

              {/* Dual CTA Buttons (Solid Burgundy + Outline) with whitespace-nowrap */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-1">
                <button
                  type="button"
                  onClick={() => onNavigate('/products')}
                  className={`px-7 py-3.5 ${currentSlideData.theme.btnPrimary} font-bold text-xs uppercase tracking-wider rounded-sm shadow-sm flex items-center justify-center gap-2.5 transition-all duration-1000 ease-in-out group whitespace-nowrap cursor-pointer`}
                >
                  <span className="whitespace-nowrap">MUA NGAY HÔM NAY</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={onOpenSizeFinder}
                  className={`px-6 py-3.5 ${currentSlideData.theme.btnSecondary} border font-bold text-xs uppercase tracking-wider rounded-sm flex items-center justify-center gap-2 transition-all duration-1000 ease-in-out whitespace-nowrap cursor-pointer`}
                >
                  <Ruler className="w-3.5 h-3.5 shrink-0" />
                  <span className="whitespace-nowrap">TÌM SIZE CỦA TÔI (AI FIT)</span>
                </button>
              </div>

              {/* 3 Key Trust Metrics with divider lines */}
              <div className={`grid grid-cols-3 gap-4 pt-6 border-t ${currentSlideData.theme.metricBorder} transition-colors duration-1000 ease-in-out`}>
                <div className={`pr-2 border-r ${currentSlideData.theme.metricBorder}`}>
                  <p className={`font-sans text-xl sm:text-2xl font-black ${currentSlideData.theme.metricNumber} transition-colors duration-1000 ease-in-out`}>
                    XL – 5XL
                  </p>
                  <p className={`text-[11px] ${currentSlideData.theme.metricLabel} mt-0.5 transition-colors duration-1000 ease-in-out`}>
                    Dải size chuẩn 75-140kg
                  </p>
                </div>
                <div className={`px-2 border-r ${currentSlideData.theme.metricBorder}`}>
                  <p className={`font-sans text-xl sm:text-2xl font-black ${currentSlideData.theme.headlineAccent} transition-colors duration-1000 ease-in-out`}>
                    98.4%
                  </p>
                  <p className={`text-[11px] ${currentSlideData.theme.metricLabel} mt-0.5 transition-colors duration-1000 ease-in-out`}>
                    Đoán size vừa vặn lần đầu
                  </p>
                </div>
                <div className="pl-2">
                  <p className={`font-sans text-xl sm:text-2xl font-black ${currentSlideData.theme.metricNumber} transition-colors duration-1000 ease-in-out`}>
                    7 Ngày
                  </p>
                  <p className={`text-[11px] ${currentSlideData.theme.metricLabel} mt-0.5 transition-colors duration-1000 ease-in-out`}>
                    Đổi size tận nơi miễn phí
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Visual Wardrobe Imagery - Right (6 cols) */}
          <div className="lg:col-span-6 xl:col-span-6 relative min-h-[380px] lg:min-h-full overflow-hidden">
            {/* Floating Badge (Top Right) đồng bộ theo slide */}
            <div className="absolute top-5 right-5 sm:top-8 sm:right-8 bg-white/95 dark:bg-stone-900/90 backdrop-blur-md px-3.5 py-2.5 rounded-xl shadow-float border border-stone-200/80 dark:border-stone-700/80 flex items-center gap-3 z-20 transition-all duration-1000 ease-in-out">
              <div className={`w-8 h-8 rounded-lg ${currentSlideData.badgeColor} text-white flex items-center justify-center font-bold text-xs shrink-0 transition-colors duration-1000 ease-in-out shadow-xs`}>
                {currentSlideData.badgeSize}
              </div>
              <div>
                <p className="text-[11px] font-bold text-charcoal-900 dark:text-white leading-tight">
                  {currentSlideData.badgeTitle}
                </p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                  <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> {currentSlideData.badgeFeature}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cụm nút 4 chấm chuyển đổi ảnh - Hòa quyện tự nhiên không khung viền */}
      <div className="absolute bottom-4 sm:bottom-5 md:bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 py-1 select-none">
        {HERO_SLIDES.map((slide, idx) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => goToSlide(idx)}
            className={`rounded-full transition-all duration-200 cursor-pointer ${
              currentSlide === idx
                ? `w-2 h-2 sm:w-2.5 sm:h-2.5 ${currentSlideData.theme.dotActive} scale-110 shadow-sm`
                : `w-1.5 h-1.5 sm:w-2 sm:h-2 ${currentSlideData.theme.dotInactive}`
            }`}
            title={`Chuyển sang: ${slide.title}`}
            aria-label={`Slide ${idx + 1}: ${slide.title}`}
          />
        ))}
      </div>
    </section>
  );
};
