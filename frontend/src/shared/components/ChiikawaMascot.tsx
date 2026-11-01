import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Heart, Sparkles, X } from 'lucide-react';

const CUTE_QUOTES = [
  'Tự tin khoe dáng cùng Curve & Confidence! 💖',
  'Form chuẩn XL – 5XL tôn dáng cực đỉnh nha~ ✨',
  'Đang có ưu đãi FREESHIP toàn quốc đó! 🛍️',
  'Cần tư vấn size chuẩn cứ hỏi em nha! 👗',
  'Ngoại cỡ nhưng thần thái không hề nhỏ! 💃',
  'Chúc bạn mua sắm thật nhiều niềm vui! 🌸',
  'Nhảy cùng Chiikawa cho ngày thêm vui nè! 🎀',
];

// Vị trí cố định vĩnh viễn theo tinh chỉnh thực tế của người dùng:
// Chiikawa: X = -30px, Y = -10px, Size = 210px
// Dòng chữ thoại: X = 0px, Y = 146px
// Chữ Chiikawa: X = 13px, Y = 24px
const CHIIKAWA_X = -30;
const CHIIKAWA_Y = -10;
const CHIIKAWA_SIZE = 210;

const BUBBLE_X = 0;
const BUBBLE_Y = 146;

const BADGE_X = 13;
const BADGE_Y = 24;

export const ChiikawaMascot: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Mốc 1: Chỉ kích hoạt trên Tablet / Desktop (>= 768px). Ẩn hoàn toàn trên Mobile (< 768px)
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState<number>(0);
  const [showBubble, setShowBubble] = useState<boolean>(false);
  const [isBouncing, setIsBouncing] = useState<boolean>(false);
  const [heartPops, setHeartPops] = useState<{ id: number; x: number; y: number }[]>([]);
  const bubbleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Kích hoạt hiển thị bong bóng thoại và tự động ẩn sau đúng 3 giây
  const triggerBubble = () => {
    setShowBubble(true);
    if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
    bubbleTimeoutRef.current = setTimeout(() => {
      setShowBubble(false);
    }, 3000);
  };

  // Dọn dẹp dữ liệu chỉnh vị trí tạm thời trong localStorage nếu có
  useEffect(() => {
    try {
      localStorage.removeItem('chiikawa_pos_x');
      localStorage.removeItem('chiikawa_pos_y');
      localStorage.removeItem('chiikawa_pos_size');
      localStorage.removeItem('chiikawa_badge_x');
      localStorage.removeItem('chiikawa_badge_y');
      localStorage.removeItem('chiikawa_bubble_x');
      localStorage.removeItem('chiikawa_bubble_y');
    } catch {}
  }, []);

  // Khi Guest hoặc User vào trang: Chiikawa chào mừng 1 lần trong đúng 3s rồi tự biến mất (chỉ chạy trên Desktop/Tablet)
  useEffect(() => {
    if (!isDesktop) return;

    const welcomeTimer = setTimeout(() => {
      triggerBubble();
    }, 1200);

    return () => {
      clearTimeout(welcomeTimer);
      if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
    };
  }, [isDesktop]);

  // CHỈ KHI BẤM VÀO con Chiikawa mới hiện lên thông báo thoại (tồn tại 3s rồi biến mất)
  const handleMascotClick = (e: React.MouseEvent) => {
    setIsBouncing(true);
    setTimeout(() => setIsBouncing(false), 600);

    setCurrentQuoteIndex((prev) => {
      let next = Math.floor(Math.random() * CUTE_QUOTES.length);
      if (next === prev) next = (next + 1) % CUTE_QUOTES.length;
      return next;
    });
    triggerBubble();

    const newHeart = { id: Date.now(), x: e.nativeEvent.offsetX || 60, y: e.nativeEvent.offsetY || 30 };
    setHeartPops((prev) => [...prev, newHeart]);
    setTimeout(() => {
      setHeartPops((prev) => prev.filter((h) => h.id !== newHeart.id));
    }, 1200);
  };

  // Bật / tắt nhạc bài nhảy Chiikawa
  const toggleMute = () => {
    if (videoRef.current) {
      const nextMuted = !isMuted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
      if (!nextMuted) videoRef.current.play().catch(() => {});
    }
  };

  // Tách nền xanh Chroma Key Canvas theo thời gian thực (chỉ chạy trên Desktop/Tablet)
  useEffect(() => {
    if (!isDesktop) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let animationFrameId: number;
    let lastRenderTime = 0;
    const FRAME_INTERVAL = 1000 / 24; // 24 FPS target for mascot video, saving ~65% CPU load

    const renderLoop = (timestamp: number) => {
      // Tạm dừng xử lý pixel nếu tab trình duyệt đang ẩn ở chế độ nền
      if (typeof document !== 'undefined' && document.hidden) {
        animationFrameId = requestAnimationFrame(renderLoop);
        return;
      }

      // Giới hạn 24 FPS để không chiếm dụng CPU Main Thread, giữ độ mượt mà cho mascot
      if (timestamp - lastRenderTime >= FRAME_INTERVAL) {
        lastRenderTime = timestamp;

        if (video.readyState >= 2 && !video.paused && !video.ended) {
          const vW = video.videoWidth || 120;
          const vH = video.videoHeight || 120;
          const targetH = CHIIKAWA_SIZE;
          const targetW = Math.round(targetH * (vW / vH));

          if (canvas.width !== targetW || canvas.height !== targetH) {
            canvas.width = targetW;
            canvas.height = targetH;
          }

          ctx.drawImage(video, 0, 0, targetW, targetH);

          try {
            const frame = ctx.getImageData(0, 0, targetW, targetH);
            const data = frame.data;
            const totalPixels = data.length;

            for (let i = 0; i < totalPixels; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];

              const isGreen = g > 75 && (g - r) > 25 && (g - b) > 25;

              if (isGreen) {
                data[i + 3] = 0;
              } else if (g > r && g > b && (g - r) > 10 && (g - b) > 10) {
                const greenDelta = Math.min(g - r, g - b);
                const alphaFactor = Math.max(0, 1 - (greenDelta - 10) / 15);
                data[i + 3] = Math.round(data[i + 3] * alphaFactor);
                data[i + 1] = Math.max(r, b);
              }
            }

            ctx.putImageData(frame, 0, 0);
          } catch {}
        }
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    const startPlay = () => {
      video.muted = isMuted;
      video.play().catch(() => {
        const handleGesture = () => {
          video.play().catch(() => {});
          window.removeEventListener('click', handleGesture);
          window.removeEventListener('touchstart', handleGesture);
        };
        window.addEventListener('click', handleGesture, { once: true });
        window.addEventListener('touchstart', handleGesture, { once: true });
      });
    };

    video.addEventListener('loadeddata', startPlay);
    video.addEventListener('canplay', startPlay);
    if (video.readyState >= 2) startPlay();

    animationFrameId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      video.removeEventListener('loadeddata', startPlay);
      video.removeEventListener('canplay', startPlay);
    };
  }, [isMuted]);

  if (!isDesktop) {
    return null;
  }

  return (
    <div className="hidden md:block">
      {/* Video ẩn nguồn */}
      <video
        ref={videoRef}
        src="/videos/chiikawa.mp4"
        playsInline
        loop
        muted={isMuted}
        autoPlay
        preload="auto"
        className="hidden"
      />

      {/* ============================================================== */}
      {/* 🐾 CÁ THỂ 1: CON CHIIKAWA CỐ ĐỊNH CHUẨN X=-30px, Y=-10px */}
      {/* Nhảy liên tục, lướt web bình thường, rê chuột KHÔNG bao giờ hiện chữ */}
      {/* ============================================================== */}
      <div
        className="fixed z-40 select-none flex flex-col items-center pointer-events-auto"
        style={{
          left: `${CHIIKAWA_X}px`,
          bottom: `${CHIIKAWA_Y}px`,
        }}
      >
        <div className="relative group">
          {/* Tim bay khi click */}
          {heartPops.map((heart) => (
            <div
              key={heart.id}
              className="absolute pointer-events-none text-rose-500 animate-floatUp z-50 flex items-center gap-1"
              style={{ left: heart.x, top: heart.y }}
            >
              <Heart className="w-6 h-6 fill-rose-500" />
              <span className="text-xs font-bold text-rose-600 font-sans">+1 Yêu</span>
            </div>
          ))}

          {/* Canvas Chiikawa 210px: KHÔNG có onMouseEnter để tránh vô tình lia chuột */}
          <canvas
            ref={canvasRef}
            onClick={handleMascotClick}
            className={`cursor-pointer transition-transform duration-300 drop-shadow-[0_12px_24px_rgba(0,0,0,0.16)] ${
              isBouncing ? 'scale-115 -translate-y-2' : 'hover:scale-105 active:scale-95'
            }`}
            style={{
              width: `${CHIIKAWA_SIZE}px`,
              height: `${CHIIKAWA_SIZE}px`,
              maxWidth: 'none',
              maxHeight: 'none',
              imageRendering: 'auto',
            }}
            title="Bấm vào Chiikawa để tương tác nha! 💖"
          />
        </div>
      </div>

      {/* ============================================================== */}
      {/* 💬 CÁ THỂ 2: DÒNG CHỮ (BONG BÓNG THOẠI) CỐ ĐỊNH X=0px, Y=146px */}
      {/* MẶC ĐỊNH ẨN, CHỈ HIỆN 3S KHI BẤM VÀO CHIIKAWA, TỰ BIẾN MẤT */}
      {/* ============================================================== */}
      {showBubble && (
        <div
          onClick={handleMascotClick}
          className="fixed z-40 select-none cursor-pointer hover:scale-102 transition-transform animate-fadeIn pointer-events-auto"
          style={{
            left: `${BUBBLE_X}px`,
            bottom: `${BUBBLE_Y}px`,
          }}
          title="Bấm vào để đổi câu nói hoặc bấm dấu × để đóng!"
        >
          <div className="max-w-[230px] bg-white/95 backdrop-blur-sm pl-3.5 pr-7 py-2 rounded-2xl shadow-xl border border-surface-border text-charcoal-800 text-[11px] font-semibold leading-relaxed relative flex items-center">
            <p className="flex-1">{CUTE_QUOTES[currentQuoteIndex]}</p>
            {/* Đuôi bong bóng chỉ thẳng xuống đầu Chiikawa */}
            <div className="absolute -bottom-1.5 left-8 w-3 h-3 bg-white border-b border-r border-surface-border transform rotate-45" />

            {/* Nút đóng nhanh × */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowBubble(false);
              }}
              className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-stone-100 hover:bg-stone-200 text-charcoal-500 hover:text-charcoal-800 flex items-center justify-center text-[10px] transition-colors"
              title="Đóng bong bóng thoại"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 🏷️ CÁ THỂ 3: CHỮ CHIIKAWA & NÚT PHÁT NHẠC (CHỈ ICON) */}
      {/* CỐ ĐỊNH CHUẨN X=13px, Y=24px */}
      {/* ============================================================== */}
      <div
        className="fixed z-40 select-none flex items-center gap-2 pointer-events-auto"
        style={{
          left: `${BADGE_X}px`,
          bottom: `${BADGE_Y}px`,
        }}
      >
        {/* Huy hiệu Chiikawa */}
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-xs border border-surface-border text-[11px] font-bold text-charcoal-700 shadow-sm transition-transform hover:scale-105">
          <Sparkles className="w-2.5 h-2.5 text-amber-500" />
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          Chiikawa
        </span>

        {/* Nút phát nhạc: CHỈ ICON, bo tròn nhỏ gọn, không chữ */}
        <button
          onClick={toggleMute}
          className={`w-7 h-7 rounded-full flex items-center justify-center shadow-sm transition-all border cursor-pointer ${
            !isMuted
              ? 'bg-rose-50 text-rose-600 border-rose-300 shadow-rose-100 hover:bg-rose-100 scale-105'
              : 'bg-white/95 text-charcoal-700 border-surface-border hover:bg-stone-50 hover:text-brand-700 hover:scale-105 active:scale-95'
          }`}
          title={isMuted ? 'Phát nhạc' : 'Tắt tiếng'}
          aria-label={isMuted ? 'Phát nhạc Chiikawa' : 'Tắt tiếng Chiikawa'}
        >
          {!isMuted ? (
            <Volume2 className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
          ) : (
            <VolumeX className="w-3.5 h-3.5 text-stone-500" />
          )}
        </button>
      </div>
    </div>
  );
};
