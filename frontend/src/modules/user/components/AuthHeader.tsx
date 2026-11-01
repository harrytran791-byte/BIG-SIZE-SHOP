import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface AuthHeaderProps {
  onNavigate: (path: string) => void;
  backText?: string;
  backPath?: string;
}

export const AuthHeader: React.FC<AuthHeaderProps> = ({
  onNavigate,
  backText = 'QUAY LẠI MUA SẮM',
  backPath = '/products'
}) => {
  return (
    <header className="w-full bg-white border-b border-stone-200/80 sticky top-0 z-30 select-none shadow-2xs">
      {/* 1. Dải màu Burgundy chuẩn nhận diện thương hiệu trên cùng */}
      <div className="h-1 bg-[#5C1D24] w-full" />

      {/* 2. Thanh điều hướng chính */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 h-16 sm:h-20 flex items-center justify-between">
        {/* Bên trái: Logo & Slogan matching Image 1 Demo */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('/');
          }}
          className="group flex flex-col items-center justify-center select-none whitespace-nowrap py-1 cursor-pointer"
          title="Về trang chủ Curve & Confidence"
        >
          <img
            src="/images/logo.png?v=2"
            alt="Curve & Confidence Big Size Logo"
            className="h-12 sm:h-14 w-auto object-contain transition-transform group-hover:scale-105"
          />
          <span className="font-sans text-[11px] sm:text-xs font-black tracking-[0.2em] text-charcoal-900 group-hover:text-[#5C1D24] transition-colors uppercase whitespace-nowrap mt-0.5">
            CURVE & CONFIDENCE
          </span>
        </a>

        {/* Bên phải: Nút QUAY LẠI MUA SẮM */}
        <button
          type="button"
          onClick={() => onNavigate(backPath)}
          className="inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold text-[#5C1D24] hover:text-[#4A151B] uppercase tracking-wider transition-all cursor-pointer group py-2 px-1"
          title="Tiếp tục mua sắm các sản phẩm Big Size"
        >
          <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:-translate-x-1 transition-transform stroke-[2.5]" />
          <span className="hidden sm:inline">{backText}</span>
          <span className="sm:hidden text-xs">MUA SẮM</span>
        </button>
      </div>
    </header>
  );
};
