import React from 'react';
import { Maximize2, ShieldCheck, Feather, RefreshCw, CheckCircle2 } from 'lucide-react';

export const BrandBenefits: React.FC = () => {
  const benefits = [
    {
      icon: Maximize2,
      title: 'Công Nghệ Cạp Chun Ẩn Tech-Flex',
      description: 'Đai lưng co giãn viền trong mở rộng thêm 5–7cm khi ngồi hoặc ăn no, bên ngoài vẫn là cúc cài và đỉa thắt lưng thanh lịch.',
      highlight: 'Giải phóng áp lực thắt lưng 100%'
    },
    {
      icon: Feather,
      title: 'Vải Cotton Mỹ & Tencel Kháng Khuẩn',
      description: 'Chất liệu định lượng đầm tay từ 240–280GSM đứng dáng, dệt sợi tự nhiên thoáng khí gấp 3 lần, không dính người khi đổ mồ hôi.',
      highlight: 'Không lộ ngấn mỡ lưng hay bụng'
    },
    {
      icon: CheckCircle2,
      title: 'Cắt May Công Thái Học 3D Asian',
      description: 'Được nghiên cứu trên hàng nghìn số đo người Việt ngoại cỡ: phần nách, bắp tay và bụng được nới rộng tỉ lệ vàng, lưng áo không bị cụt.',
      highlight: 'Dải size trọn vẹn từ XL đến 5XL'
    },
    {
      icon: RefreshCw,
      title: 'Đổi Size Miễn Phí Tận Nhà 7 Ngày',
      description: 'Shipper mang size mới đến tận cửa và nhận lại size cũ cùng lúc. Bạn hoàn toàn không cần mất công ra bưu cục gửi hàng.',
      highlight: 'Mua sắm online an tâm tuyệt đối'
    }
  ];

  return (
    <section className="py-20 bg-surface-cream border-y border-surface-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-brand-600 text-xs font-bold uppercase tracking-wider bg-brand-50 border border-brand-200 px-3 py-1 rounded-full">
            TIÊU CHUẨN MAY ĐO BIG SIZE CAO CẤP
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-charcoal-900 tracking-tight mt-3">
            Vì Sao Khách Hàng Big Size Tin Chọn Chúng Tôi?
          </h2>
          <p className="text-xs sm:text-sm text-charcoal-600 mt-2">
            Không đơn thuần là phóng to quần áo thông thường, mỗi thiết kế là một giải pháp công thái học tôn vinh vóc dáng.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((b, idx) => {
            const Icon = b.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-3xl p-6 sm:p-7 border border-surface-border shadow-soft hover:shadow-float hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 mb-5">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-heading font-bold text-base text-charcoal-900 leading-snug">
                    {b.title}
                  </h3>
                  <p className="text-xs text-charcoal-600 mt-2.5 leading-relaxed">
                    {b.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-surface-border/60">
                  <span className="text-[11px] font-bold text-brand-700 bg-brand-50/80 px-2.5 py-1 rounded-lg inline-block">
                    ✓ {b.highlight}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
