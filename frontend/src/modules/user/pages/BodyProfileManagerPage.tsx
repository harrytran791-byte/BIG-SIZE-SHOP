import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Plus,
  Trash2,
  Edit3,
  Check,
  Ruler,
  Sparkles,
  ChevronRight,
  User,
  Info,
  ShieldCheck,
  Maximize2,
  XCircle,
  Shirt,
  HeartHandshake
} from 'lucide-react';
import { useBodyProfile } from '@/context/BodyProfileContext';
import { useToast } from '@/context/ToastContext';
import { BodyProfile, Gender } from '@/types';

interface BodyProfileManagerPageProps {
  onNavigate: (path: string) => void;
}

export const BodyProfileManagerPage: React.FC<BodyProfileManagerPageProps> = ({ onNavigate }) => {
  const {
    profiles,
    activeProfileId,
    setActiveProfileId,
    addProfile,
    updateProfile,
    deleteProfile,
    setDefaultProfile,
  } = useBodyProfile();

  const { showToast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditing) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsEditing(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditing]);

  // Form fields
  const [name, setName] = useState('');
  const [subInfo, setSubInfo] = useState('');
  const [gender, setGender] = useState<Gender>('nam');
  const [age, setAge] = useState<number>(36);
  const [relationship, setRelationship] = useState('Bản thân');
  const [height, setHeight] = useState<number>(174);
  const [weight, setWeight] = useState<number>(88);
  const [chest, setChest] = useState<number>(110);
  const [waist, setWaist] = useState<number>(104);
  const [hips, setHips] = useState<number>(108);
  const [shoulder, setShoulder] = useState<number>(48);
  const [bodyFeature, setBodyFeature] = useState('Dáng người đầy đặn, bụng bia nhẹ, vai ngang vừa phải.');
  const [fitPreference, setFitPreference] = useState<'snug' | 'regular' | 'loose'>('regular');
  const [notes, setNotes] = useState('');

  const handleOpenAdd = () => {
    setIsEditing(true);
    setEditingId(null);
    setName('');
    setSubInfo('Người thân');
    setGender('nam');
    setAge(30);
    setRelationship('Người thân');
    setHeight(175);
    setWeight(85);
    setChest(108);
    setWaist(100);
    setHips(106);
    setShoulder(48);
    setBodyFeature('Vóc dáng cao lớn, vai ngang, thích mặc đồ thoải mái.');
    setFitPreference('regular');
    setNotes('');
  };

  const handleOpenEdit = (p: BodyProfile) => {
    setIsEditing(true);
    setEditingId(p.id);
    setName(p.name);
    setSubInfo(p.subInfo || '');
    setGender(p.gender);
    setAge(p.age || 36);
    setRelationship(p.relationship || 'Người thân');
    setHeight(p.height);
    setWeight(p.weight);
    setChest(p.chest);
    setWaist(p.waist);
    setHips(p.hips);
    setShoulder(p.shoulder || 48);
    setBodyFeature(p.bodyFeature || p.notes || '');
    setFitPreference(p.fitPreference);
    setNotes(p.notes || '');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Lỗi', 'Vui lòng nhập tên hồ sơ.', 'error');
      return;
    }

    const compiledSubInfo = subInfo || `${gender === 'nam' ? 'Nam' : 'Nữ'}, ${age} tuổi • ${relationship}`;

    if (editingId) {
      updateProfile(editingId, {
        name,
        subInfo: compiledSubInfo,
        gender,
        age,
        relationship,
        height,
        weight,
        chest,
        waist,
        hips,
        shoulder,
        bodyFeature,
        fitPreference,
        notes: bodyFeature || notes,
      });
      showToast('Cập nhật thành công', `Hồ sơ số đo "${name}" đã được cập nhật!`, 'success');
    } else {
      addProfile({
        name,
        subInfo: compiledSubInfo,
        gender,
        age,
        relationship,
        height,
        weight,
        chest,
        waist,
        hips,
        shoulder,
        bodyFeature,
        fitPreference,
        notes: bodyFeature || notes,
      });
      showToast('Đã thêm hồ sơ', `Hồ sơ số đo "${name}" đã được lưu vào hệ thống!`, 'success');
    }

    setIsEditing(false);
    setEditingId(null);
  };

  const activeProfile = profiles.find(p => p.id === activeProfileId) || profiles[0];

  return (
    <div className="py-8 bg-[#FAF8F5] min-h-screen text-stone-900 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Top Header matching Image 2 */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-stone-200 text-xs font-bold text-stone-800 shadow-xs mb-3">
              <span className="w-5 h-5 rounded-full bg-[#5C1D24] text-white flex items-center justify-center text-[11px] font-bold">
                {profiles.length}
              </span>
              <span>HỒ SƠ ĐÃ LƯU TRỮ</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              Hồ sơ số đo cơ thể
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Lưu số đo cơ thể để được hỗ trợ lựa chọn kích thước phù hợp khi mua sắm.
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-5 py-3 bg-[#5C1D24] hover:bg-[#4A121D] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs shrink-0 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Thêm hồ sơ mới</span>
          </button>
        </div>

        {/* 3-Column Responsive Cards Grid */}
        {profiles.length === 0 ? (
          <div className="bg-white rounded-3xl border border-stone-200 p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
              <Ruler className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-sm text-stone-800">Chưa có hồ sơ số đo nào được lưu</h4>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              Tạo hồ sơ số đo cá nhân hoặc người thân để Stylist AI gợi ý kích cỡ vừa vặn chuẩn xác 100% khi mua sắm.
            </p>
            <button
              onClick={handleOpenAdd}
              className="px-5 py-2.5 bg-[#5C1D24] hover:bg-[#4A121D] text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm hồ sơ đầu tiên</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profiles.map((p) => {
              const isActive = (activeProfileId === p.id) || (p.isDefault && !activeProfileId);
              const isSelf = p.relationship === 'Bản thân' || p.name.toLowerCase().includes('bản thân') || p.name.toLowerCase().includes('cá nhân');

              return (
              <div
                key={p.id}
                className={`bg-white rounded-3xl border transition-all p-6 shadow-xs flex flex-col justify-between relative ${
                  isActive
                    ? 'border-[#5C1D24]/40 ring-1 ring-[#5C1D24]/20 shadow-md'
                    : 'border-stone-200/90 hover:border-stone-300'
                }`}
              >
                <div>
                  {/* Top Active Tag */}
                  {isActive && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#2C1014] text-white rounded-full text-[10px] font-bold uppercase tracking-wider mb-4 shadow-xs">
                      <Check className="w-3 h-3 stroke-[2.5]" />
                      <span>ĐANG ÁP DỤNG MUA SẮM</span>
                    </div>
                  )}

                  {/* Profile Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base text-stone-900">{p.name}</h3>
                        {p.isDefault && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Mặc định
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-500 mt-1">
                        {p.subInfo || `${p.gender === 'nam' ? 'Nam' : 'Nữ'}${p.age ? `, ${p.age} tuổi` : ''} • ${p.relationship || 'Người thân'}`}
                      </p>
                    </div>

                    <div className="w-10 h-10 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center shrink-0">
                      {isSelf ? (
                        <User className="w-5 h-5" />
                      ) : p.name.includes('Em Trai') ? (
                        <Maximize2 className="w-4 h-4" />
                      ) : (
                        <User className="w-5 h-5" />
                      )}
                    </div>
                  </div>

                  {/* Anthropometric Measurements Table (CHỈ SỐ NHÂN TRẮC HỌC) */}
                  <div className="mt-5">
                    <span className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2.5">
                      CHỈ SỐ NHÂN TRẮC HỌC
                    </span>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-stone-50/80 p-2.5 rounded-xl flex items-center justify-between border border-stone-100">
                        <span className="text-stone-500 text-[11px]">Chiều cao</span>
                        <strong className="text-stone-900">{p.height} cm</strong>
                      </div>
                      <div className="bg-stone-50/80 p-2.5 rounded-xl flex items-center justify-between border border-stone-100">
                        <span className="text-stone-500 text-[11px]">Cân nặng</span>
                        <strong className="text-stone-900">{p.weight} kg</strong>
                      </div>
                      <div className="bg-stone-50/80 p-2.5 rounded-xl flex items-center justify-between border border-stone-100">
                        <span className="text-stone-500 text-[11px]">Vòng ngực</span>
                        <strong className="text-stone-900">{p.chest} cm</strong>
                      </div>
                      <div className="bg-stone-50/80 p-2.5 rounded-xl flex items-center justify-between border border-stone-100">
                        <span className="text-stone-500 text-[11px]">Vòng bụng (eo)</span>
                        <strong className="text-stone-900">{p.waist} cm</strong>
                      </div>
                      <div className="bg-stone-50/80 p-2.5 rounded-xl flex items-center justify-between border border-stone-100">
                        <span className="text-stone-500 text-[11px]">Vòng mông</span>
                        <strong className="text-stone-900">{p.hips} cm</strong>
                      </div>
                      <div className="bg-stone-50/80 p-2.5 rounded-xl flex items-center justify-between border border-stone-100">
                        <span className="text-stone-500 text-[11px]">Rộng vai</span>
                        <strong className="text-stone-900">{p.shoulder || 48} cm</strong>
                      </div>
                    </div>
                  </div>

                  {/* Body Features Box (ĐẶC ĐIỂM DÁNG NGƯỜI) */}
                  <div className="mt-4 bg-[#FAF7F5] rounded-xl p-3 border border-stone-200/60 flex items-start gap-2.5 text-xs">
                    <Info className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="block font-bold text-[10px] text-stone-500 uppercase tracking-wider mb-0.5">
                        ĐẶC ĐIỂM DÁNG NGƯỜI
                      </span>
                      <p className="text-stone-700 leading-snug text-[11px]">
                        {p.bodyFeature || p.notes || 'Dáng người đầy đặn, thích phom áo thoải mái vừa vặn.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-5 space-y-2.5 pt-2">
                  {isActive ? (
                    <button
                      disabled
                      className="w-full py-3 bg-[#5C1D24] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-default"
                    >
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>Đang chọn mua sắm</span>
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setActiveProfileId(p.id);
                          showToast('Đã chọn hồ sơ', `Hồ sơ "${p.name}" đang được áp dụng để gợi ý kích cỡ.`, 'success');
                        }}
                        className="w-full py-3 bg-[#F6EFEA] hover:bg-[#ECE3DC] text-stone-900 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                      >
                        <Shirt className="w-4 h-4 stroke-[2]" />
                        <span>Chọn hồ sơ này để tư vấn size</span>
                      </button>

                      <button
                        onClick={() => {
                          setDefaultProfile(p.id);
                          showToast('Thành công', `Đã đặt "${p.name}" làm hồ sơ mặc định!`, 'success');
                        }}
                        className="w-full text-center text-[11px] font-medium text-stone-500 hover:text-stone-900 hover:underline block py-0.5 cursor-pointer"
                      >
                        Đặt làm mặc định
                      </button>
                    </>
                  )}

                  {/* Edit & Delete Sub-Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleOpenEdit(p)}
                      className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>CHỈNH SỬA</span>
                    </button>

                    {profiles.length > 1 && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Bạn có chắc muốn xóa hồ sơ "${p.name}" không?`)) {
                            deleteProfile(p.id);
                            showToast('Đã xóa', `Đã xóa hồ sơ số đo "${p.name}".`, 'info');
                          }
                        }}
                        className="flex-1 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>XÓA</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )}

        {/* Bottom Section: "Tại sao nên lưu số đo vóc dáng?" matching Image 2 */}
        <div className="bg-white rounded-3xl p-7 sm:p-8 border border-stone-200/90 shadow-xs mt-10">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Left Header Box */}
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#F7EFEA] text-[#5C1D24] flex items-center justify-center shadow-xs">
                <Ruler className="w-6 h-6 stroke-[2]" />
              </div>
              <h2 className="text-xl font-extrabold text-stone-900 tracking-tight leading-snug">
                Tại sao nên lưu số đo vóc dáng?
              </h2>
              <p className="text-xs text-stone-500 leading-relaxed">
                Hồ sơ số đo giúp hệ thống may đo và đội ngũ chuyên viên của Curve & Confidence đối soát chuẩn xác phom dáng từng dòng sản phẩm trước khi giao hàng.
              </p>
            </div>

            {/* Feature 01 */}
            <div className="bg-[#FAF7F5] rounded-2xl p-5 border border-stone-200/60 flex flex-col justify-between">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-lg text-xs font-black bg-stone-200 text-stone-800 mb-3">
                  01
                </span>
                <h3 className="font-bold text-sm text-stone-900 mb-1.5">Đối soát độ co giãn</h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Hệ thống tự động tính toán độ dãn vải Spandex/Cotton theo số đo ngực và bụng thực tế, chống tình trạng chật nách hoặc kích bụng.
                </p>
              </div>

              <div className="pt-4 border-t border-stone-200/60 mt-3 flex items-center gap-1.5 text-xs font-bold text-stone-900">
                <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                <span>Tối ưu độ vừa vặn</span>
              </div>
            </div>

            {/* Feature 02 */}
            <div className="bg-[#FAF7F5] rounded-2xl p-5 border border-stone-200/60 flex flex-col justify-between">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-lg text-xs font-black bg-stone-200 text-stone-800 mb-3">
                  02
                </span>
                <h3 className="font-bold text-sm text-stone-900 mb-1.5">Phom dáng người Việt</h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Được cân chỉnh dựa trên dữ liệu nhân trắc học nam và nữ ngoại cỡ tại Việt Nam, hạ eo hợp lý và nới lỏng nách tay tinh tế.
                </p>
              </div>

              <div className="pt-4 border-t border-stone-200/60 mt-3 flex items-center gap-1.5 text-xs font-bold text-stone-900">
                <Shirt className="w-4 h-4 text-[#5C1D24]" />
                <span>May đo công nghệ cao</span>
              </div>
            </div>

            {/* Feature 03 */}
            <div className="bg-[#FAF7F5] rounded-2xl p-5 border border-stone-200/60 flex flex-col justify-between">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-lg text-xs font-black bg-stone-200 text-stone-800 mb-3">
                  03
                </span>
                <h3 className="font-bold text-sm text-stone-900 mb-1.5">Đổi size miễn phí</h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Trường hợp mặc không vừa như ý, nhân viên shipper mang size mới đổi tận cửa trong vòng 7 ngày hoàn toàn miễn phí.
                </p>
              </div>

              <div className="pt-4 border-t border-stone-200/60 mt-3 flex items-center gap-1.5 text-xs font-bold text-stone-900">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Bảo trợ đổi tận nhà</span>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Advisory Status Pill at Bottom Right matching Image 2 */}
        <div className="fixed bottom-6 right-6 z-40 bg-white/95 backdrop-blur-md rounded-full px-4 py-2.5 shadow-2xl border border-stone-200 flex items-center gap-3 animate-fadeIn">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-xs font-bold text-stone-800">
            Hồ sơ {activeProfile?.name || 'Bản Thân'} đang được tư vấn chọn size XL - 2XL
          </span>
          <div className="w-8 h-8 rounded-full bg-[#5C1D24] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
            <Ruler className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* ================= MODAL THÊM / CHỈNH SỬA HỒ SƠ SỐ ĐO ================= */}
      {isEditing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-900/40 backdrop-blur-md animate-fadeIn overflow-y-auto"
          onClick={() => setIsEditing(false)}
        >
          <div
            className="w-full max-w-xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-stone-200 my-auto animate-scaleIn text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-5">
              <div className="flex items-center gap-2">
                <Ruler className="w-5 h-5 text-[#5C1D24]" />
                <h3 className="font-bold text-base text-stone-900">
                  {editingId ? 'Chỉnh Sửa Hồ Sơ Số Đo' : 'Thêm Hồ Sơ Số Đo Mới'}
                </h3>
              </div>
              <button onClick={() => setIsEditing(false)} className="text-stone-400 hover:text-stone-700 cursor-pointer">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Tên hồ sơ *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Bản Thân, Bố, Em Trai..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl bg-stone-50/50 focus:bg-white focus:border-[#5C1D24]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Mối quan hệ / Chú thích</label>
                  <input
                    type="text"
                    placeholder="VD: Nam, 36 tuổi • Bản thân"
                    value={subInfo}
                    onChange={(e) => setSubInfo(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl bg-stone-50/50 focus:bg-white focus:border-[#5C1D24]"
                  />
                </div>
              </div>

              {/* 6 Anthropometric Measurements */}
              <div className="pt-2">
                <span className="block font-bold text-stone-800 uppercase tracking-wider text-[11px] mb-2">
                  CHỈ SỐ NHÂN TRẮC HỌC (CM / KG)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-stone-500 mb-1">Chiều cao (cm)</label>
                    <input
                      type="number"
                      required
                      min={120}
                      max={220}
                      value={height}
                      onChange={(e) => setHeight(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-500 mb-1">Cân nặng (kg)</label>
                    <input
                      type="number"
                      required
                      min={40}
                      max={200}
                      value={weight}
                      onChange={(e) => setWeight(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl font-bold text-[#5C1D24]"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-500 mb-1">Vòng ngực (cm)</label>
                    <input
                      type="number"
                      required
                      min={70}
                      max={180}
                      value={chest}
                      onChange={(e) => setChest(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-500 mb-1">Vòng bụng (eo) (cm)</label>
                    <input
                      type="number"
                      required
                      min={60}
                      max={180}
                      value={waist}
                      onChange={(e) => setWaist(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-500 mb-1">Vòng mông (cm)</label>
                    <input
                      type="number"
                      required
                      min={70}
                      max={180}
                      value={hips}
                      onChange={(e) => setHips(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-500 mb-1">Rộng vai (cm)</label>
                    <input
                      type="number"
                      min={35}
                      max={80}
                      value={shoulder}
                      onChange={(e) => setShoulder(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Đặc điểm vóc dáng */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">Đặc điểm dáng người</label>
                <textarea
                  rows={2}
                  placeholder="VD: Dáng người đầy đặn, bụng bia nhẹ, lưng dài..."
                  value={bodyFeature}
                  onChange={(e) => setBodyFeature(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="w-1/3 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl cursor-pointer"
                >
                  HỦY
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#5C1D24] hover:bg-[#4A121D] text-white font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  LƯU HỒ SƠ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
