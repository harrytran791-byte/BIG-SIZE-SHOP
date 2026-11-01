import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Ruler, Sparkles, UserCheck, CheckCircle2, AlertTriangle, ArrowRight, Table, Info } from 'lucide-react';
import { BodyProfile, Product, Size, SizeRecommendation } from '@/types';
import { useBodyProfile } from '@/context/BodyProfileContext';

interface SizeAdvisorModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onSelectRecommendedSize: (size: Size) => void;
}

export const SizeAdvisorModal: React.FC<SizeAdvisorModalProps> = ({
  product,
  isOpen,
  onClose,
  onSelectRecommendedSize,
}) => {
  const { profiles, activeProfile, calculateSizeRecommendation } = useBodyProfile();

  const [activeTab, setActiveTab] = useState<'profile' | 'manual' | 'chart'>('profile');
  const [selectedProfileId, setSelectedProfileId] = useState<string>(activeProfile?.id || profiles[0]?.id || '');

  // Manual inputs state
  const [manualHeight, setManualHeight] = useState<number>(activeProfile?.height || 174);
  const [manualWeight, setManualWeight] = useState<number>(activeProfile?.weight || 96);
  const [manualChest, setManualChest] = useState<number>(activeProfile?.chest || 118);
  const [manualWaist, setManualWaist] = useState<number>(activeProfile?.waist || 106);
  const [manualHips, setManualHips] = useState<number>(activeProfile?.hips || 116);
  const [manualFit, setManualFit] = useState<'snug' | 'regular' | 'loose'>('regular');

  // Bấm nút Quay lại (Back) hoặc ESC thì đóng modal tư vấn size
  useEffect(() => {
    if (isOpen) {
      window.history.pushState({ modal: 'size-advisor-modal' }, '');
      const handlePopState = () => {
        onClose();
      };
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('popstate', handlePopState);
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('popstate', handlePopState);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Compute recommendation based on active tab
  let recommendation: SizeRecommendation;
  if (activeTab === 'profile') {
    const p = profiles.find((prof) => prof.id === selectedProfileId) || profiles[0];
    recommendation = calculateSizeRecommendation(product, p);
  } else {
    recommendation = calculateSizeRecommendation(product, {
      height: manualHeight,
      weight: manualWeight,
      chest: manualChest,
      waist: manualWaist,
      hips: manualHips,
      fitPreference: manualFit,
    });
  }

  const handleApplySize = (sz: Size) => {
    onSelectRecommendedSize(sz);
    onClose();
  };

  const content = (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/40 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      <div className="min-h-full flex items-center justify-center p-3 sm:p-4">
        <div className="relative bg-white rounded-3xl shadow-modal max-w-2xl w-full overflow-hidden border border-surface-border animate-scaleIn z-10 my-auto max-h-[88vh] flex flex-col">
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-surface-border flex items-center justify-between bg-surface-cream">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand-500 text-white flex items-center justify-center shadow-sm">
                <Ruler className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base sm:text-lg text-charcoal-900">
                  Tư Vấn Chọn Size AI (Smart Fit)
                </h3>
                <p className="text-[11px] text-charcoal-500">
                  Sản phẩm: <strong className="text-charcoal-800">{product.name}</strong>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-charcoal-400 hover:text-charcoal-800 rounded-lg hover:bg-stone-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex border-b border-surface-border bg-stone-50 text-xs font-bold">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 py-3 px-3 flex items-center justify-center gap-2 border-b-2 transition-all ${
                activeTab === 'profile'
                  ? 'border-brand-500 text-brand-600 bg-white'
                  : 'border-transparent text-charcoal-600 hover:text-charcoal-900'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Hồ sơ đã lưu ({profiles.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('manual')}
              className={`flex-1 py-3 px-3 flex items-center justify-center gap-2 border-b-2 transition-all ${
                activeTab === 'manual'
                  ? 'border-brand-500 text-brand-600 bg-white'
                  : 'border-transparent text-charcoal-600 hover:text-charcoal-900'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Nhập số đo lần này</span>
            </button>

            <button
              onClick={() => setActiveTab('chart')}
              className={`flex-1 py-3 px-3 flex items-center justify-center gap-2 border-b-2 transition-all ${
                activeTab === 'chart'
                  ? 'border-brand-500 text-brand-600 bg-white'
                  : 'border-transparent text-charcoal-600 hover:text-charcoal-900'
              }`}
            >
              <Table className="w-4 h-4" />
              <span>Bảng thông số chi tiết</span>
            </button>
          </div>

          {/* Content Body */}
          <div className="p-4 sm:p-6 max-h-[75vh] overflow-y-auto space-y-6">
            {/* Tab 1: Profile Selection */}
            {activeTab === 'profile' && (
              <div className="space-y-4">
                <label className="block text-xs font-bold text-charcoal-800 uppercase tracking-wider">
                  Chọn hồ sơ số đo người mặc:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {profiles.map((p) => {
                    const isSelected = selectedProfileId === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedProfileId(p.id)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-brand-50/80 border-brand-500 shadow-sm ring-1 ring-brand-500/20'
                            : 'bg-white border-surface-border hover:border-stone-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-charcoal-900">{p.name}</span>
                          {p.isDefault && (
                            <span className="text-[10px] bg-brand-500 text-white px-1.5 py-0.2 rounded font-bold">
                              Mặc định
                            </span>
                          )}
                        </div>
                        <div className="mt-2 text-[11px] text-charcoal-600 space-y-0.5">
                          <p>
                            Chiều cao: <strong>{p.height}cm</strong> • Cân nặng: <strong>{p.weight}kg</strong>
                          </p>
                          <p>
                            Ngực: <strong>{p.chest}cm</strong> • Bụng/Eo: <strong>{p.waist}cm</strong>
                          </p>
                          <p className="text-brand-700 font-semibold pt-0.5">
                            Form ưa thích:{' '}
                            {p.fitPreference === 'loose'
                              ? 'Rộng rãi'
                              : p.fitPreference === 'snug'
                              ? 'Ôm vừa'
                              : 'Vừa vặn'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 2: Manual Measurements Input */}
            {activeTab === 'manual' && (
              <div className="space-y-4">
                <p className="text-xs text-charcoal-500">
                  Nhập số đo tạm thời cho lần mua sắm này (không bắt buộc lưu):
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-charcoal-700 block mb-1">
                      Chiều cao (cm)
                    </label>
                    <input
                      type="number"
                      value={manualHeight}
                      onChange={(e) => setManualHeight(Number(e.target.value))}
                      className="w-full bg-surface-cream border border-surface-border rounded-xl p-2 text-xs font-semibold text-charcoal-900 focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-charcoal-700 block mb-1">
                      Cân nặng (kg)
                    </label>
                    <input
                      type="number"
                      value={manualWeight}
                      onChange={(e) => setManualWeight(Number(e.target.value))}
                      className="w-full bg-surface-cream border border-surface-border rounded-xl p-2 text-xs font-semibold text-charcoal-900 focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-charcoal-700 block mb-1">
                      Vòng Ngực (cm)
                    </label>
                    <input
                      type="number"
                      value={manualChest}
                      onChange={(e) => setManualChest(Number(e.target.value))}
                      className="w-full bg-surface-cream border border-surface-border rounded-xl p-2 text-xs font-semibold text-charcoal-900 focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-charcoal-700 block mb-1">
                      Vòng Eo / Bụng (cm)
                    </label>
                    <input
                      type="number"
                      value={manualWaist}
                      onChange={(e) => setManualWaist(Number(e.target.value))}
                      className="w-full bg-surface-cream border border-surface-border rounded-xl p-2 text-xs font-semibold text-charcoal-900 focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-charcoal-700 block mb-1">
                      Vòng Mông (cm)
                    </label>
                    <input
                      type="number"
                      value={manualHips}
                      onChange={(e) => setManualHips(Number(e.target.value))}
                      className="w-full bg-surface-cream border border-surface-border rounded-xl p-2 text-xs font-semibold text-charcoal-900 focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-charcoal-700 block mb-1">
                      Sở thích mặc
                    </label>
                    <select
                      value={manualFit}
                      onChange={(e) => setManualFit(e.target.value as any)}
                      className="w-full bg-surface-cream border border-surface-border rounded-xl p-2 text-xs font-semibold text-charcoal-900 focus:outline-none focus:border-brand-500"
                    >
                      <option value="regular">Vừa vặn thoải mái</option>
                      <option value="loose">Rộng rãi giấu bụng</option>
                      <option value="snug">Ôm nhẹ tôn dáng</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Recommendation Result Box (Shown for Tab 1 & Tab 2) */}
            {activeTab !== 'chart' && (
              <div className="bg-gradient-to-br from-charcoal-900 to-charcoal-800 text-white rounded-3xl p-5 sm:p-6 shadow-float space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-brand-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    KẾT QUẢ ĐỀ XUẤT CHO SẢN PHẨM NÀY
                  </span>
                  <span className="text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Độ tin cậy: {recommendation.confidenceScore}%
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                  <div>
                    <p className="text-xs text-stone-300">Size đề xuất hoàn hảo nhất:</p>
                    <div className="flex items-baseline gap-3 mt-0.5">
                      <span className="text-4xl sm:text-5xl font-black font-heading text-white">
                        {recommendation.recommendedSize}
                      </span>
                      <span className="bg-brand-500 text-white text-xs font-bold px-2.5 py-0.8 rounded-full">
                        Vừa vặn thoải mái
                      </span>
                    </div>
                  </div>

                  {recommendation.alternativeSize && (
                    <div className="bg-white/10 rounded-2xl p-3 border border-white/10 text-xs">
                      <p className="text-stone-300 text-[11px]">Size cân nhắc thêm:</p>
                      <p className="font-bold text-amber-300 text-sm mt-0.5">
                        {recommendation.alternativeSize}
                      </p>
                      <button
                        onClick={() => handleApplySize(recommendation.alternativeSize!)}
                        className="text-[10px] text-brand-300 underline font-semibold mt-1 hover:text-white"
                      >
                        Chọn size này
                      </button>
                    </div>
                  )}
                </div>

                {/* Explanation text */}
                <p className="text-xs text-stone-200 leading-relaxed bg-white/5 p-3 rounded-2xl border border-white/10">
                  <Info className="w-3.5 h-3.5 inline mr-1 text-brand-400" />
                  {recommendation.reason}
                </p>

                {/* Comparison Breakdown Table */}
                <div className="bg-white/5 rounded-2xl overflow-hidden border border-white/10 text-xs">
                  <div className="grid grid-cols-3 bg-white/10 p-2 font-bold text-stone-300 text-[11px]">
                    <span>Chỉ số</span>
                    <span>Số đo của bạn</span>
                    <span>Thông số áo {recommendation.recommendedSize}</span>
                  </div>
                  <div className="divide-y divide-white/10">
                    {recommendation.measurementComparison.map((item, i) => (
                      <div key={i} className="grid grid-cols-3 p-2 text-stone-200">
                        <span className="font-medium text-stone-300">{item.part}</span>
                        <span className="font-bold text-white">{item.userValue} cm/kg</span>
                        <span className="text-emerald-400 font-semibold">{item.recommendedRange}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Direct Action Button */}
                <button
                  onClick={() => handleApplySize(recommendation.recommendedSize)}
                  className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Áp dụng Size {recommendation.recommendedSize} vào sản phẩm này ngay</span>
                </button>
              </div>
            )}

            {/* Tab 3: Detailed Size Chart Table */}
            {activeTab === 'chart' && (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse border border-surface-border">
                    <thead className="bg-surface-cream text-charcoal-900 font-bold uppercase text-[11px]">
                      <tr>
                        <th className="p-2.5 border border-surface-border">Size</th>
                        <th className="p-2.5 border border-surface-border">Cân nặng</th>
                        <th className="p-2.5 border border-surface-border">Chiều cao</th>
                        <th className="p-2.5 border border-surface-border">Vòng ngực (cm)</th>
                        <th className="p-2.5 border border-surface-border">Vòng eo/bụng (cm)</th>
                        <th className="p-2.5 border border-surface-border">Vòng mông (cm)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border text-charcoal-700">
                      {product.sizeChart.map((row) => {
                        const isMatch = row.size === recommendation.recommendedSize;
                        return (
                          <tr
                            key={row.size}
                            className={isMatch ? 'bg-brand-50 font-bold text-brand-900' : 'hover:bg-stone-50'}
                          >
                            <td className="p-2.5 border border-surface-border">
                              <span className="px-2 py-0.5 bg-charcoal-900 text-white rounded font-mono font-bold">
                                {row.size}
                              </span>
                              {isMatch && (
                                <span className="ml-1.5 text-[10px] text-brand-600 font-bold">
                                  (Đề xuất)
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 border border-surface-border">{row.weightRange}</td>
                            <td className="p-2.5 border border-surface-border">{row.heightRange}</td>
                            <td className="p-2.5 border border-surface-border">{row.chest}</td>
                            <td className="p-2.5 border border-surface-border">{row.waist}</td>
                            <td className="p-2.5 border border-surface-border">{row.hips}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="bg-surface-cream p-4 rounded-2xl text-xs text-charcoal-600 space-y-1">
                  <p className="font-bold text-charcoal-900">Mẹo chọn kích cỡ:</p>
                  <p>• Dải size may đo theo phom người Việt, không bị dài lê thê phần lưng.</p>
                  <p>• Nếu số đo nằm giữa 2 size và bạn thích mặc rộng thoải mái, hãy ưu tiên chọn size lớn hơn.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
};
