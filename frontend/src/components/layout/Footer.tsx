import React, { useState } from 'react';
import { Send, ShieldCheck, RefreshCw, Truck, HeartHandshake, Phone, Mail, MapPin } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface FooterProps {
  onNavigate: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const { showToast } = useToast();

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      showToast('Đăng ký thành công!', 'Mã ưu đãi 50.000đ đã được gửi đến email của bạn.', 'success');
      setEmail('');
    }
  };

  return (
    <footer className="bg-charcoal-900 text-stone-300 pt-16 pb-10 border-t border-charcoal-800">
      {/* 4 Brand Pillars / Trust Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 border-b border-charcoal-800">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-charcoal-800 rounded-xl text-brand-400 shrink-0">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h5 className="font-heading font-bold text-white text-sm">Đổi Size Tận Nơi 7 Ngày</h5>
              <p className="text-xs text-charcoal-400 mt-1">
                Shipper mang size mới đến tận cửa, không lo không vừa vặn.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-charcoal-800 rounded-xl text-brand-400 shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h5 className="font-heading font-bold text-white text-sm">Freeship Đơn Từ 500k</h5>
              <p className="text-xs text-charcoal-400 mt-1">
                Giao hàng nhanh toàn quốc, đóng gói hộp carton cứng cao cấp.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-charcoal-800 rounded-xl text-brand-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h5 className="font-heading font-bold text-white text-sm">Đồng Kiểm Khi Nhận</h5>
              <p className="text-xs text-charcoal-400 mt-1">
                Được mở hàng kiểm tra chất vải, màu sắc trước khi thanh toán.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-charcoal-800 rounded-xl text-brand-400 shrink-0">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <h5 className="font-heading font-bold text-white text-sm">Form May Công Thái Học</h5>
              <p className="text-xs text-charcoal-400 mt-1">
                Thiết kế riêng cho người Việt từ 75kg đến 140kg (XL - 5XL).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-heading text-xl font-black text-white tracking-tight">
                CURVE & CONFIDENCE
              </span>
              <span className="bg-brand-500 text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded">
                XL - 5XL
              </span>
            </div>
            <p className="text-xs text-charcoal-400 leading-relaxed max-w-sm">
              Chúng tôi tin rằng mọi kích cỡ đều xứng đáng được tôn vinh. CURVE & CONFIDENCE mang đến trang phục ngoại cỡ cao cấp với phom dáng chuẩn xác, chất vải thoáng mát và công cụ tư vấn size thông minh.
            </p>

            {/* Newsletter */}
            <div className="pt-2">
              <p className="text-xs font-semibold text-white mb-2">
                Đăng ký nhận mã giảm 50.000đ và bí quyết phối đồ:
              </p>
              <form onSubmit={handleSubscribe} className="flex gap-2 max-w-md">
                <input
                  type="email"
                  placeholder="Nhập email của bạn..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-charcoal-800 border border-charcoal-700 text-white text-xs px-3.5 py-2.5 rounded-lg flex-1 focus:outline-none focus:border-brand-500 placeholder-charcoal-500"
                />
                <button
                  type="submit"
                  className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Đăng ký</span>
                </button>
              </form>
            </div>
          </div>

          {/* Column 1: Khám phá */}
          <div>
            <h4 className="font-heading font-bold text-white text-sm mb-4">Danh Mục Sản Phẩm</h4>
            <ul className="space-y-2.5 text-xs text-charcoal-400">
              <li>
                <button
                  onClick={() => onNavigate('/products?gender=nam')}
                  className="hover:text-brand-400 transition-colors"
                >
                  Thời trang Nam Big Size
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/products?gender=nu')}
                  className="hover:text-brand-400 transition-colors"
                >
                  Thời trang Nữ Curvy Size
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/products?category=ao-thun')}
                  className="hover:text-brand-400 transition-colors"
                >
                  Áo Polo & Áo Thun Cotton
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/products?category=quan-jeans')}
                  className="hover:text-brand-400 transition-colors"
                >
                  Quần Cạp Chun Ẩn Co Giãn
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/products?category=dam-vay')}
                  className="hover:text-brand-400 transition-colors"
                >
                  Đầm Xòe Che Khuyết Điểm
                </button>
              </li>
            </ul>
          </div>

          {/* Column 2: Hỗ trợ */}
          <div>
            <h4 className="font-heading font-bold text-white text-sm mb-4">Hỗ Trợ Khách Hàng</h4>
            <ul className="space-y-2.5 text-xs text-charcoal-400">
              <li>
                <button
                  onClick={() => onNavigate('/size-guide')}
                  className="hover:text-brand-400 transition-colors"
                >
                  Hướng dẫn đo số đo tại nhà
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/order-tracking')}
                  className="hover:text-brand-400 transition-colors"
                >
                  Theo dõi & Tra cứu đơn hàng
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/faq')}
                  className="hover:text-brand-400 transition-colors"
                >
                  Chính sách đổi trả trong 7 ngày
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/faq')}
                  className="hover:text-brand-400 transition-colors"
                >
                  Câu hỏi thường gặp (FAQ)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/account/body-profiles')}
                  className="hover:text-brand-400 transition-colors"
                >
                  Quản lý hồ sơ số đo cá nhân
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Liên hệ */}
          <div>
            <h4 className="font-heading font-bold text-white text-sm mb-4">Showroom & Liên Hệ</h4>
            <div className="space-y-3 text-xs text-charcoal-400">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                <span>120 Nguyễn Thị Minh Khai, Phường 6, Quận 3, TP. Hồ Chí Minh</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-brand-500 shrink-0" />
                <span className="font-bold text-white">1900 6868 (8:00 - 21:30)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-brand-500 shrink-0" />
                <span>support@curveconfidence.vn</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 border-t border-charcoal-800 flex flex-col sm:flex-row items-center justify-between text-xs text-charcoal-500 gap-4">
        <p>© 2026 CURVE & CONFIDENCE. Nền tảng thời trang Big Size đẳng cấp.</p>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="bg-charcoal-800 text-charcoal-400 px-2 py-1 rounded">
            Dữ liệu Demo mẫu & Mua sắm tương tác
          </span>
          <a href="#/faq" onClick={() => onNavigate('/faq')} className="hover:text-brand-400">
            Điều khoản dịch vụ
          </a>
          <a href="#/faq" onClick={() => onNavigate('/faq')} className="hover:text-brand-400">
            Bảo mật thông tin
          </a>
        </div>
      </div>
    </footer>
  );
};
