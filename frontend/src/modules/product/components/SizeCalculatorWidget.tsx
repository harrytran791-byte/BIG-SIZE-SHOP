import React, { useState } from 'react';
import { Ruler, Sparkles, CheckCircle2, ArrowRight, UserCheck, Info, AlertTriangle } from 'lucide-react';
import { Size, Gender } from '@/types';
import { useBodyProfile } from '@/context/BodyProfileContext';
import { useToast } from '@/context/ToastContext';

interface SizeCalculatorWidgetProps {
  onNavigate: (path: string) => void;
}

interface SizeBenchmark {
  size: Size;
  weightMin: number;
  weightMax: number;
  heightMin: number;
  heightMax: number;
  chestMin: number;
  chestMax: number;
  waistMin: number;
  waistMax: number;
}

const MEN_SIZE_CHART: SizeBenchmark[] = [
  { size: 'XL', weightMin: 75, weightMax: 84, heightMin: 165, heightMax: 175, chestMin: 102, chestMax: 108, waistMin: 90, waistMax: 96 },
  { size: '2XL', weightMin: 85, weightMax: 94, heightMin: 170, heightMax: 180, chestMin: 109, chestMax: 116, waistMin: 97, waistMax: 104 },
  { size: '3XL', weightMin: 95, weightMax: 106, heightMin: 172, heightMax: 185, chestMin: 117, chestMax: 126, waistMin: 105, waistMax: 114 },
  { size: '4XL', weightMin: 107, weightMax: 120, heightMin: 175, heightMax: 190, chestMin: 127, chestMax: 138, waistMin: 115, waistMax: 126 },
  { size: '5XL', weightMin: 121, weightMax: 138, heightMin: 175, heightMax: 195, chestMin: 139, chestMax: 150, waistMin: 127, waistMax: 138 },
];

const WOMEN_SIZE_CHART: SizeBenchmark[] = [
  { size: 'XL', weightMin: 68, weightMax: 77, heightMin: 155, heightMax: 165, chestMin: 96, chestMax: 104, waistMin: 82, waistMax: 90 },
  { size: '2XL', weightMin: 78, weightMax: 87, heightMin: 158, heightMax: 170, chestMin: 105, chestMax: 112, waistMin: 91, waistMax: 98 },
  { size: '3XL', weightMin: 88, weightMax: 98, heightMin: 160, heightMax: 175, chestMin: 113, chestMax: 122, waistMin: 99, waistMax: 108 },
  { size: '4XL', weightMin: 99, weightMax: 112, heightMin: 160, heightMax: 178, chestMin: 123, chestMax: 134, waistMin: 109, waistMax: 120 },
  { size: '5XL', weightMin: 113, weightMax: 130, heightMin: 160, heightMax: 180, chestMin: 135, chestMax: 148, waistMin: 121, waistMax: 135 },
];

export const SizeCalculatorWidget: React.FC<SizeCalculatorWidgetProps> = ({ onNavigate }) => {
  const { addProfile } = useBodyProfile();
  const { showToast } = useToast();

  const [gender, setGender] = useState<Gender>('nu');
  const [height, setHeight] = useState<number>(174);
  const [weight, setWeight] = useState<number>(96);
  const [chest, setChest] = useState<number>(118);
  const [waist, setWaist] = useState<number>(113);
  const [fitPreference, setFitPreference] = useState<'snug' | 'regular' | 'loose'>('regular');
  const [savedName, setSavedName] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  // Check irrational measurements (Số đo bất hợp lý)
  const isIrrational = React.useMemo(() => {
    if (height <= 0 || weight <= 0 || chest <= 0 || waist <= 0) return true;
    if (height < 120 || height > 230) return true;
    if (weight < 30 || weight > 200) return true;
    if (chest < 50 || chest > 190) return true;
    if (waist < 40 || waist > 190) return true;
    // Extreme disproportion
    const bmi = weight / ((height / 100) * (height / 100));
    if (bmi < 12 || bmi > 65) return true;
    return false;
  }, [height, weight, chest, waist]);

  // Check if below Big Size threshold (< 65kg)
  const isBelowBigSize = React.useMemo(() => {
    if (isIrrational) return false;
    if (gender === 'nam') {
      return weight < 70 && chest < 98 && waist < 86;
    } else {
      return weight < 64 && chest < 93 && waist < 78;
    }
  }, [isIrrational, gender, weight, chest, waist]);

  // Check if above 5XL threshold (> 138kg)
  const isAboveBigSize = React.useMemo(() => {
    if (isIrrational) return false;
    if (gender === 'nam') {
      return weight > 140 || chest > 152 || waist > 142;
    } else {
      return weight > 132 || chest > 150 || waist > 138;
    }
  }, [isIrrational, gender, weight, chest, waist]);

  // Dynamic multi-dimensional calculation
  const recommendation = React.useMemo(() => {
    if (isIrrational || isBelowBigSize || isAboveBigSize) {
      return null;
    }

    const chart = gender === 'nam' ? MEN_SIZE_CHART : WOMEN_SIZE_CHART;
    const sizes: Size[] = ['XL', '2XL', '3XL', '4XL', '5XL'];

    // Score each size row
    const scores = chart.map((row, idx) => {
      let penalty = 0;

      // Weight score
      if (weight < row.weightMin) penalty += (row.weightMin - weight) * 1.5;
      else if (weight > row.weightMax) penalty += (weight - row.weightMax) * 1.8;

      // Chest score (tops fit)
      if (chest < row.chestMin) penalty += (row.chestMin - chest) * 2.2;
      else if (chest > row.chestMax) penalty += (chest - row.chestMax) * 2.8;

      // Waist score (belly fit)
      if (waist < row.waistMin) penalty += (row.waistMin - waist) * 2.0;
      else if (waist > row.waistMax) penalty += (waist - row.waistMax) * 2.5;

      return {
        idx,
        size: row.size,
        penalty,
        row,
      };
    });

    // Best baseline size
    scores.sort((a, b) => a.penalty - b.penalty);
    let chosenIndex = scores[0].idx;
    let alternativeSize: Size | undefined = undefined;

    // Apply fitPreference (Tối ưu hóa: Thay đổi sở thích mặc làm thay đổi size đề xuất)
    if (fitPreference === 'loose') {
      if (chosenIndex < sizes.length - 1) {
        alternativeSize = sizes[chosenIndex];
        chosenIndex += 1;
      }
    } else if (fitPreference === 'snug') {
      if (chosenIndex > 0) {
        alternativeSize = sizes[chosenIndex];
        chosenIndex -= 1;
      }
    } else {
      // Regular: if near border, show alternative
      const runnerUp = scores[1];
      if (runnerUp && Math.abs(runnerUp.penalty - scores[0].penalty) < 18) {
        alternativeSize = runnerUp.size;
      }
    }

    const chosenSize = sizes[chosenIndex];
    const matchedRow = chart[chosenIndex];

    const tag =
      fitPreference === 'loose'
        ? 'Rộng rãi giấu bụng'
        : fitPreference === 'snug'
        ? 'Ôm nhẹ tôn dáng'
        : 'Vừa vặn hoàn hảo';

    const personTerm = gender === 'nam' ? 'chàng' : 'nàng';

    let description = '';
    if (fitPreference === 'loose') {
      description = `Phom nới rộng nách và bụng giúp ${personTerm} che khuyết điểm vòng 2 tối ưu, thoải mái khi ngồi làm việc hay di chuyển.`;
    } else if (fitPreference === 'snug') {
      description = `Phom ôm vừa vặn đứng dáng giúp ${personTerm} trông thon gọn và tôn nét khỏe khoắn.`;
    } else {
      description = `Tỉ lệ vàng chuẩn xác cho ${personTerm} với thông số ${height}cm, ${weight}kg theo chuẩn công thái học 3D Asian.`;
    }

    // Confidence score based on lowest penalty
    const confidenceScore = Math.max(90, Math.min(98, Math.round(100 - scores[0].penalty * 1.2)));

    return {
      size: chosenSize,
      alternativeSize: alternativeSize !== chosenSize ? alternativeSize : undefined,
      tag,
      description,
      confidenceScore,
      matchedRow,
    };
  }, [gender, height, weight, chest, waist, fitPreference, isIrrational, isBelowBigSize, isAboveBigSize]);

  const handleSaveToProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recommendation) {
      showToast('Cảnh báo', 'Vui lòng nhập số đo hợp lệ trước khi lưu hồ sơ', 'error');
      return;
    }
    const name = savedName.trim() || `Hồ sơ ${gender === 'nam' ? 'Nam' : 'Nữ'} (${weight}kg)`;
    addProfile({
      name,
      gender,
      height,
      weight,
      chest,
      waist,
      hips: waist + 6,
      fitPreference,
      notes: `Tạo từ công cụ tính size nhanh Home (${recommendation.size})`,
    });
    setIsSaved(true);
    showToast('Đã lưu hồ sơ số đo!', `Hồ sơ "${name}" được lưu để tự động gợi ý mọi sản phẩm.`, 'success');
  };

  return (
    <section id="size-calculator" className="py-20 bg-surface-cream relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-surface-border shadow-float p-6 sm:p-10 lg:p-12 relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Column: Form Controls */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 text-[#5C1D24] px-3 py-1 rounded-full text-xs font-semibold mb-3">
                  <Ruler className="w-3.5 h-3.5 text-[#5C1D24]" />
                  <span>CÔNG CỤ TÍNH SIZE AI TRỰC TIẾP</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-charcoal-900 tracking-tight">
                  Chỉ Cần 30 Giây Để Biết Chuẩn Size Của Bạn
                </h2>
                <p className="text-xs sm:text-sm text-charcoal-600 mt-2">
                  Thuật toán tự động tính toán đối soát với thông số may đo thực tế của chúng tôi.
                </p>
              </div>

              {/* Gender selector */}
              <div>
                <label className="block text-xs font-bold text-charcoal-700 uppercase tracking-wider mb-2">
                  Bạn đang chọn đồ cho ai?
                </label>
                <div className="grid grid-cols-2 gap-3 max-w-xs">
                  <button
                    type="button"
                    onClick={() => setGender('nam')}
                    className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      gender === 'nam'
                        ? 'bg-charcoal-900 text-white border-charcoal-900 shadow-sm'
                        : 'bg-surface-cream text-charcoal-700 border-surface-border hover:border-brand-500'
                    }`}
                  >
                    Thời Trang Nam
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('nu')}
                    className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      gender === 'nu'
                        ? 'bg-[#5C1D24] text-white border-[#5C1D24] shadow-sm'
                        : 'bg-surface-cream text-charcoal-700 border-surface-border hover:border-brand-500'
                    }`}
                  >
                    Thời Trang Nữ
                  </button>
                </div>
              </div>

              {/* Measurements sliders & Direct Number Inputs (Dải 0 - 200/250) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* 1. Weight */}
                <div className="bg-surface-cream/70 p-4 rounded-2xl border border-surface-border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-charcoal-800">Cân nặng</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        max={200}
                        value={weight}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setWeight(isNaN(val) ? 0 : Math.max(0, Math.min(200, val)));
                        }}
                        className="w-16 px-2 py-1 text-right text-sm font-bold text-[#5C1D24] bg-white border border-stone-200 rounded-lg focus:outline-hidden focus:border-[#5C1D24] font-mono shadow-2xs"
                      />
                      <span className="text-xs font-bold text-stone-500">kg</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    className="w-full accent-[#5C1D24] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-charcoal-400 mt-1 font-mono">
                    <span>0 kg</span>
                    <span>100 kg</span>
                    <span>200 kg</span>
                  </div>
                </div>

                {/* 2. Height */}
                <div className="bg-surface-cream/70 p-4 rounded-2xl border border-surface-border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-charcoal-800">Chiều cao</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        max={250}
                        value={height}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setHeight(isNaN(val) ? 0 : Math.max(0, Math.min(250, val)));
                        }}
                        className="w-16 px-2 py-1 text-right text-sm font-bold text-charcoal-900 bg-white border border-stone-200 rounded-lg focus:outline-hidden focus:border-[#5C1D24] font-mono shadow-2xs"
                      />
                      <span className="text-xs font-bold text-stone-500">cm</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="250"
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    className="w-full accent-charcoal-900 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-charcoal-400 mt-1 font-mono">
                    <span>0 cm</span>
                    <span>125 cm</span>
                    <span>250 cm</span>
                  </div>
                </div>

                {/* 3. Chest */}
                <div className="bg-surface-cream/70 p-4 rounded-2xl border border-surface-border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-charcoal-800">Vòng Ngực (Bust/Chest)</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        max={200}
                        value={chest}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setChest(isNaN(val) ? 0 : Math.max(0, Math.min(200, val)));
                        }}
                        className="w-16 px-2 py-1 text-right text-sm font-bold text-charcoal-900 bg-white border border-stone-200 rounded-lg focus:outline-hidden focus:border-[#5C1D24] font-mono shadow-2xs"
                      />
                      <span className="text-xs font-bold text-stone-500">cm</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={chest}
                    onChange={(e) => setChest(Number(e.target.value))}
                    className="w-full accent-[#5C1D24] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-charcoal-400 mt-1 font-mono">
                    <span>0 cm</span>
                    <span>100 cm</span>
                    <span>200 cm</span>
                  </div>
                </div>

                {/* 4. Waist */}
                <div className="bg-surface-cream/70 p-4 rounded-2xl border border-surface-border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-charcoal-800">Vòng Bụng / Eo (Waist)</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        max={200}
                        value={waist}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setWaist(isNaN(val) ? 0 : Math.max(0, Math.min(200, val)));
                        }}
                        className="w-16 px-2 py-1 text-right text-sm font-bold text-charcoal-900 bg-white border border-stone-200 rounded-lg focus:outline-hidden focus:border-[#5C1D24] font-mono shadow-2xs"
                      />
                      <span className="text-xs font-bold text-stone-500">cm</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={waist}
                    onChange={(e) => setWaist(Number(e.target.value))}
                    className="w-full accent-[#5C1D24] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-charcoal-400 mt-1 font-mono">
                    <span>0 cm</span>
                    <span>100 cm</span>
                    <span>200 cm</span>
                  </div>
                </div>
              </div>

              {/* Fit Preference (Sở thích mặc) */}
              <div>
                <label className="block text-xs font-bold text-charcoal-700 uppercase tracking-wider mb-2">
                  Sở thích mặc áo quần của bạn:
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'snug', label: 'Ôm nhẹ tôn dáng', desc: 'Hạ 1 size nếu khung vừa' },
                    { id: 'regular', label: 'Vừa vặn thoải mái', desc: 'Chuẩn dáng chuẩn số đo' },
                    { id: 'loose', label: 'Rộng rãi giấu bụng', desc: 'Tăng 1 size che khuyết điểm' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setFitPreference(p.id as any)}
                      className={`py-2.5 px-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                        fitPreference === p.id
                          ? 'bg-[#5C1D24]/10 border-[#5C1D24] text-[#5C1D24] font-bold shadow-xs'
                          : 'bg-white border-surface-border text-charcoal-600 hover:border-stone-300'
                      }`}
                    >
                      <span className="text-xs font-bold block">{p.label}</span>
                      <span className="text-[10px] text-stone-400 block mt-0.5">{p.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Instant Live Recommendation & Warning Card */}
            <div className="lg:col-span-5 bg-gradient-to-br from-charcoal-900 to-charcoal-800 text-white rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden min-h-[480px]">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <Ruler className="w-48 h-48" />
              </div>

              {/* CASE 1: BẤT HỢP LÝ */}
              {isIrrational && (
                <div className="space-y-5 relative z-10 my-auto py-6 animate-fadeIn">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                    <AlertTriangle className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-amber-400 font-bold block mb-1">
                      CẢNH BÁO SỐ ĐO BẤT THƯỜNG
                    </span>
                    <h3 className="text-xl font-bold text-white leading-tight">
                      Chỉ Số Đo Chưa Hợp Lý
                    </h3>
                    <p className="text-xs text-stone-300 mt-2 leading-relaxed">
                      Số đo chiều cao ({height}cm), cân nặng ({weight}kg) hoặc vòng ngực/bụng đang quá nhỏ hoặc chênh lệch bất thường. Vui lòng kéo thanh trượt hoặc nhập lại số đo thực tế.
                    </p>
                  </div>
                  <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10 text-xs text-stone-300 space-y-1.5 font-mono">
                    <p className="text-[11px] font-bold text-stone-400 font-sans">KHOẢNG THÔNG SỐ KHUYẾN NGHỊ:</p>
                    <p>• Chiều cao: 140 – 210 cm</p>
                    <p>• Cân nặng Big Size: 65 – 150 kg</p>
                    <p>• Vòng ngực & bụng: 80 – 160 cm</p>
                  </div>
                </div>
              )}

              {/* CASE 2: DƯỚI CHUẨN BIG SIZE (< 65kg) */}
              {!isIrrational && isBelowBigSize && (
                <div className="space-y-5 relative z-10 my-auto py-4 animate-fadeIn">
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                    <Info className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-blue-400 font-bold block mb-1">
                      VÓC DÁNG TIÊU CHUẨN
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-extrabold text-white">S / M / L</span>
                      <span className="bg-blue-500/20 text-blue-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-blue-400/30">
                        Dưới chuẩn Big Size
                      </span>
                    </div>
                    <p className="text-xs text-stone-300 mt-2.5 leading-relaxed">
                      Số đo {height}cm, {weight}kg của bạn thuộc phân khúc vóc dáng thon gọn tiêu chuẩn (dưới ngưỡng 65kg của thương hiệu ngoại cỡ Curve & Confidence).
                    </p>
                  </div>
                  <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10 text-xs text-stone-300 leading-relaxed">
                    Bạn vẫn có thể lựa chọn các dòng áo Polo, áo thun dáng suông Relaxed Fit để mặc thoải mái giấu dáng, hoặc liên hệ stylist để được may đo riêng.
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('/products')}
                    className="w-full py-3.5 bg-white hover:bg-stone-100 text-charcoal-900 text-xs font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                  >
                    <span>Khám phá sản phẩm phom suông</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* CASE 3: VƯỢT DẢI MAY SẴN 5XL (> 138kg) */}
              {!isIrrational && isAboveBigSize && (
                <div className="space-y-5 relative z-10 my-auto py-4 animate-fadeIn">
                  <div className="w-14 h-14 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                    <Sparkles className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-purple-400 font-bold block mb-1">
                      DỊCH VỤ MAY ĐO RIÊNG
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-extrabold text-white">5XL+</span>
                      <span className="bg-purple-500/20 text-purple-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-purple-400/30">
                        Bespoke Custom
                      </span>
                    </div>
                    <p className="text-xs text-stone-300 mt-2.5 leading-relaxed">
                      Số đo {height}cm, {weight}kg cùng vòng đo của bạn vượt quá dải may sẵn tiêu chuẩn 5XL. Curve & Confidence hỗ trợ dịch vụ may đo phom ngoại cỡ riêng theo đúng số đo của bạn.
                    </p>
                  </div>
                  <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10 text-xs text-stone-300 leading-relaxed">
                    Đội ngũ thợ may lành nghề của chúng tôi sẽ thiết kế rập may độc bản, nới rộng nách và hạ đũng quần theo tỷ lệ riêng của bạn.
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('/faq-contact')}
                    className="w-full py-3.5 bg-[#5C1D24] hover:bg-[#48161C] text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                  >
                    <span>Liên hệ chuyên viên may đo riêng</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* CASE 4: CHUẨN BIG SIZE (XL - 5XL) */}
              {!isIrrational && !isBelowBigSize && !isAboveBigSize && recommendation && (
                <>
                  <div className="space-y-5 relative z-10">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-wider text-brand-400 font-bold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>KẾT QUẢ ĐỀ XUẤT NGAY</span>
                      </span>
                      <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                        Độ chính xác {recommendation.confidenceScore}%
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-xs text-stone-400">Size phù hợp nhất của bạn là:</p>
                      <div className="flex items-baseline gap-3">
                        <span className="text-5xl sm:text-6xl font-extrabold text-white tracking-normal font-mono">
                          {recommendation.size}
                        </span>
                        <span className="bg-[#5C1D24] text-white text-xs font-bold px-3 py-1 rounded-full border border-white/20">
                          {recommendation.tag}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-stone-300 leading-relaxed pt-1">
                        {recommendation.description}
                      </p>
                    </div>

                    {/* Dynamic measurement summary table */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-2 text-xs">
                      <div className="flex justify-between text-stone-300">
                        <span>Ngực đề xuất:</span>
                        <span className="font-semibold text-white font-mono">
                          {recommendation.matchedRow.chestMin} – {recommendation.matchedRow.chestMax} cm
                        </span>
                      </div>
                      <div className="flex justify-between text-stone-300">
                        <span>Bụng / Eo đề xuất:</span>
                        <span className="font-semibold text-white font-mono">
                          {recommendation.matchedRow.waistMin} – {recommendation.matchedRow.waistMax} cm
                        </span>
                      </div>
                      <div className="flex justify-between text-stone-300">
                        <span>Form cắt may:</span>
                        <span className="font-semibold text-emerald-400">Công thái học 3D Asian</span>
                      </div>
                    </div>

                    {/* Alternative size notice if any */}
                    {recommendation.alternativeSize && (
                      <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[11px] text-stone-300 flex items-center justify-between">
                        <span>Cân nhắc linh hoạt:</span>
                        <span className="font-bold text-amber-300">Size {recommendation.alternativeSize} ({fitPreference === 'loose' ? 'nếu muốn mặc vừa khít hơn' : 'nếu muốn rộng rãi hơn'})</span>
                      </div>
                    )}

                    {/* Save Profile Section */}
                    <div>
                      {isSaved ? (
                        <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>Đã lưu vào hồ sơ đo! Sẵn sàng gợi ý khi mua sắm.</span>
                        </div>
                      ) : (
                        <form onSubmit={handleSaveToProfile} className="space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Đặt tên hồ sơ (VD: Số đo cá nhân)..."
                              value={savedName}
                              onChange={(e) => setSavedName(e.target.value)}
                              className="bg-white/10 border border-white/20 text-white text-xs px-3 py-2 rounded-xl flex-1 focus:outline-hidden focus:border-white placeholder-stone-400"
                            />
                            <button
                              type="submit"
                              className="bg-white hover:bg-stone-100 text-charcoal-900 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
                            >
                              <UserCheck className="w-3.5 h-3.5 text-[#5C1D24]" />
                              <span>Lưu hồ sơ</span>
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>

                  {/* CTA to view products with this size */}
                  <div className="pt-4 relative z-10">
                    <button
                      onClick={() => onNavigate(`/products?size=${recommendation.size}&gender=${gender}`)}
                      className="w-full py-3.5 bg-[#5C1D24] hover:bg-[#48161C] text-white text-xs sm:text-sm font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all group cursor-pointer"
                    >
                      <span>Xem tất cả sản phẩm size {recommendation.size}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
