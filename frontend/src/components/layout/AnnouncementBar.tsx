import React, { useState } from 'react';
import { X } from 'lucide-react';

export const AnnouncementBar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="bg-brand-700 text-white text-xs py-2 px-4 relative z-40 transition-all font-semibold tracking-wider uppercase shadow-xs border-b border-brand-800">
      <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4">
        <div className="flex-1 text-center font-sans text-[11px] sm:text-xs tracking-widest text-white/95">
          MIỄN PHÍ VẬN CHUYỂN TOÀN QUỐC CHO ĐƠN TỪ 500K • ĐỔI SIZE MIỄN PHÍ 7 NGÀY TẬN NƠI
        </div>

        <button
          onClick={() => setIsOpen(false)}
          className="text-white/60 hover:text-white p-0.5 ml-2 transition-colors shrink-0"
          aria-label="Đóng thông báo"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

