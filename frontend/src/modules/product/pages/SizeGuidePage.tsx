import React from 'react';
import { Ruler, Sparkles, User, Maximize2, Activity, ArrowRight, ShieldCheck } from 'lucide-react';
import { measurementGuideSteps, sizeStandardsOverview } from '@/data/sizeGuideData';

interface SizeGuidePageProps {
  onNavigate: (path: string) => void;
}

export const SizeGuidePage: React.FC<SizeGuidePageProps> = ({ onNavigate }) => {
  return (
    <div className="py-12 bg-surface-light min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-bold text-brand-600 bg-brand-50 px-3 py-1 rounded-full uppercase tracking-wider border border-brand-200">
            HƯỚNG DẪN ĐO SIZE CHUẨN XÁC TẠI NHÀ
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-charcoal-900 tracking-tight font-heading">
            Bảng Kích Cỡ & Cách Đo Phom Dáng Big Size
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-600 leading-relaxed">
            Dải kích cỡ từ <strong>XL đến 5XL</strong> tại CURVE & CONFIDENCE được nghiên cứu may đo theo nhân trắc học người Việt đầy đặn, hạn chế tối đa tình trạng lưng áo bị cụt hay nách áo bị kích.
          </p>
        </div>

        {/* 4 Step How to Measure */}
        <div className="reveal-init space-y-6">
          <h2 className="text-xl sm:text-2xl font-extrabold text-charcoal-900 tracking-tight">
            4 Bước Đo Số Đo Chuẩn Xác Bằng Thước Dây
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {measurementGuideSteps.map((step) => (
              <div
                key={step.id}
                className="bg-white p-6 rounded-3xl border border-surface-border shadow-soft flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
                      <Ruler className="w-5 h-5" />
                    </div>
                    <h3 className="font-heading font-bold text-base text-charcoal-900">
                      {step.name}
                    </h3>
                  </div>
                  <p className="text-xs text-charcoal-700 leading-relaxed">
                    {step.instruction}
                  </p>
                </div>

                <div className="bg-surface-cream/80 p-3 rounded-2xl border border-surface-border text-[11px] text-charcoal-600">
                  <span className="font-bold text-brand-700">Mẹo nhỏ: </span>
                  {step.tips}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Standard Size Chart Table */}
        <div className="reveal-init delay-100 bg-white rounded-3xl border border-surface-border shadow-soft p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-charcoal-900 tracking-tight">
              Bảng Thông Số Quy Đổi Kích Cỡ Chuẩn (XL – 5XL)
            </h2>
            <p className="text-xs text-charcoal-500 mt-1">
              Áp dụng cho các dòng sản phẩm Áo thun, Sơ mi, Quần và Đầm.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse border border-surface-border">
              <thead className="bg-surface-cream text-charcoal-900 font-bold uppercase text-[11px]">
                <tr>
                  <th className="p-3 border border-surface-border">Kích cỡ</th>
                  <th className="p-3 border border-surface-border">Cân nặng</th>
                  <th className="p-3 border border-surface-border">Chiều cao</th>
                  <th className="p-3 border border-surface-border">Vòng ngực</th>
                  <th className="p-3 border border-surface-border">Vòng eo</th>
                  <th className="p-3 border border-surface-border">Vòng mông</th>
                  <th className="p-3 border border-surface-border">Mô tả phom</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border text-charcoal-700">
                {sizeStandardsOverview.map((item) => (
                  <tr key={item.size} className="hover:bg-stone-50">
                    <td className="p-3 border border-surface-border font-bold">
                      <span className="px-2.5 py-1 bg-charcoal-900 text-white rounded-lg font-mono">
                        {item.size}
                      </span>
                    </td>
                    <td className="p-3 border border-surface-border font-bold text-brand-600">
                      {item.weight}
                    </td>
                    <td className="p-3 border border-surface-border">{item.height}</td>
                    <td className="p-3 border border-surface-border">{item.chest}</td>
                    <td className="p-3 border border-surface-border">{item.waist}</td>
                    <td className="p-3 border border-surface-border">{item.hips}</td>
                    <td className="p-3 border border-surface-border text-charcoal-500 text-[11px]">
                      {item.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA to calculate AI Fit or Create Profile */}
        <div className="reveal-init delay-150 bg-gradient-to-r from-charcoal-900 to-charcoal-800 text-white p-8 sm:p-10 rounded-3xl shadow-float flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <h3 className="text-xl sm:text-2xl font-bold font-heading">
              Vẫn Chưa Chắc Chắn Về Số Đo?
            </h3>
            <p className="text-xs text-stone-300 max-w-md">
              Sử dụng công cụ tính size AI tự động hoặc tạo hồ sơ số đo để hệ thống tự ghi nhớ và gợi ý cho mọi lần mua sắm.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => onNavigate('/#size-calculator')}
              className="px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-full text-xs font-bold transition-all shadow-sm"
            >
              Dùng công cụ AI Fit
            </button>
            <button
              onClick={() => onNavigate('/account/body-profiles')}
              className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-bold transition-all border border-white/20"
            >
              Lưu hồ sơ cá nhân
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
