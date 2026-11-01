import React, { useState } from 'react';
import { UserCheck, Plus, Trash2, Edit3, Check, Ruler, Sparkles, ChevronRight, User } from 'lucide-react';
import { useBodyProfile } from '../../context/BodyProfileContext';
import { BodyProfile, Gender } from '../../types';

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

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('nam');
  const [height, setHeight] = useState<number>(172);
  const [weight, setWeight] = useState<number>(92);
  const [chest, setChest] = useState<number>(115);
  const [waist, setWaist] = useState<number>(104);
  const [hips, setHips] = useState<number>(112);
  const [shoulder, setShoulder] = useState<number>(50);
  const [fitPreference, setFitPreference] = useState<'snug' | 'regular' | 'loose'>('regular');
  const [notes, setNotes] = useState('');

  const handleOpenAdd = () => {
    setIsEditing(true);
    setEditingId(null);
    setName('');
    setGender('nam');
    setHeight(172);
    setWeight(90);
    setChest(114);
    setWaist(102);
    setHips(110);
    setShoulder(50);
    setFitPreference('regular');
    setNotes('');
  };

  const handleOpenEdit = (p: BodyProfile) => {
    setIsEditing(true);
    setEditingId(p.id);
    setName(p.name);
    setGender(p.gender);
    setHeight(p.height);
    setWeight(p.weight);
    setChest(p.chest);
    setWaist(p.waist);
    setHips(p.hips);
    setShoulder(p.shoulder || 50);
    setFitPreference(p.fitPreference);
    setNotes(p.notes || '');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingId) {
      updateProfile(editingId, {
        name,
        gender,
        height,
        weight,
        chest,
        waist,
        hips,
        shoulder,
        fitPreference,
        notes,
      });
    } else {
      addProfile({
        name,
        gender,
        height,
        weight,
        chest,
        waist,
        hips,
        shoulder,
        fitPreference,
        notes,
      });
    }

    setIsEditing(false);
    setEditingId(null);
  };

  return (
    <div className="py-12 bg-surface-light min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-charcoal-400">
          <button onClick={() => onNavigate('/')} className="hover:text-charcoal-700">
            Trang chủ
          </button>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-charcoal-800 font-semibold">Quản lý hồ sơ số đo</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-brand-600 text-xs font-bold uppercase tracking-wider bg-brand-50 px-3 py-1 rounded-full border border-brand-200 mb-2">
              <UserCheck className="w-3.5 h-3.5" />
              <span>CÔNG CỤ GỢI Ý SIZE ĐỘC QUYỀN</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-charcoal-900 tracking-tight">
              Hồ Sơ Số Đo Cơ Thể (Body Profiles)
            </h1>
            <p className="text-xs sm:text-sm text-charcoal-500 mt-1">
              Lưu số đo cho chính bạn hoặc người thân ("Chồng", "Bạn bè"). Hệ thống sẽ tự động đối soát và đề xuất size chuẩn xác khi xem bất kỳ sản phẩm nào.
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-5 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-float shrink-0 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm hồ sơ mới</span>
          </button>
        </div>

        {/* Profiles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {profiles.map((p) => {
            const isActive = activeProfileId === p.id;
            return (
              <div
                key={p.id}
                className={`bg-white rounded-3xl border p-6 shadow-soft transition-all space-y-4 relative ${
                  isActive
                    ? 'border-brand-500 ring-2 ring-brand-500/20 shadow-float'
                    : 'border-surface-border hover:border-stone-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs ${
                        isActive
                          ? 'bg-brand-500 text-white'
                          : 'bg-surface-cream text-charcoal-700'
                      }`}
                    >
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-base text-charcoal-900">
                        {p.name}
                      </h3>
                      <span className="text-[11px] text-charcoal-500">
                        {p.gender === 'nam' ? 'Nam' : 'Nữ'} • Form:{' '}
                        {p.fitPreference === 'loose'
                          ? 'Rộng rãi'
                          : p.fitPreference === 'snug'
                          ? 'Ôm vừa'
                          : 'Vừa vặn'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(p)}
                      className="p-1.5 text-charcoal-400 hover:text-charcoal-800 rounded-lg hover:bg-stone-100"
                      title="Sửa hồ sơ"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    {profiles.length > 1 && (
                      <button
                        onClick={() => deleteProfile(p.id)}
                        className="p-1.5 text-charcoal-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                        title="Xóa hồ sơ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Measurements pills */}
                <div className="grid grid-cols-3 gap-2 bg-surface-cream/80 p-3 rounded-2xl text-xs">
                  <div>
                    <span className="text-charcoal-400 block text-[10px]">Chiều cao</span>
                    <strong className="text-charcoal-900">{p.height} cm</strong>
                  </div>
                  <div>
                    <span className="text-charcoal-400 block text-[10px]">Cân nặng</span>
                    <strong className="text-brand-600">{p.weight} kg</strong>
                  </div>
                  <div>
                    <span className="text-charcoal-400 block text-[10px]">Vòng ngực</span>
                    <strong className="text-charcoal-900">{p.chest} cm</strong>
                  </div>
                  <div>
                    <span className="text-charcoal-400 block text-[10px]">Vòng eo</span>
                    <strong className="text-charcoal-900">{p.waist} cm</strong>
                  </div>
                  <div>
                    <span className="text-charcoal-400 block text-[10px]">Vòng mông</span>
                    <strong className="text-charcoal-900">{p.hips} cm</strong>
                  </div>
                  <div>
                    <span className="text-charcoal-400 block text-[10px]">Vai</span>
                    <strong className="text-charcoal-900">{p.shoulder || 50} cm</strong>
                  </div>
                </div>

                {p.notes && (
                  <p className="text-xs text-charcoal-500 italic bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                    "{p.notes}"
                  </p>
                )}

                {/* Status & Active selector */}
                <div className="pt-2 flex items-center justify-between border-t border-surface-border">
                  {p.isDefault ? (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      ✓ Hồ sơ mặc định
                    </span>
                  ) : (
                    <button
                      onClick={() => setDefaultProfile(p.id)}
                      className="text-xs text-charcoal-500 hover:text-charcoal-800 underline"
                    >
                      Đặt làm mặc định
                    </button>
                  )}

                  <button
                    onClick={() => setActiveProfileId(p.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-brand-500 text-white shadow-xs'
                        : 'bg-surface-cream text-charcoal-700 hover:bg-stone-200'
                    }`}
                  >
                    {isActive ? 'Đang kích hoạt' : 'Chọn dùng'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Form for Add / Edit */}
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-charcoal-900/60 backdrop-blur-sm"
              onClick={() => setIsEditing(false)}
            />
            <div className="relative bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-modal border border-surface-border z-10 animate-scaleIn max-h-[90vh] overflow-y-auto">
              <h3 className="font-heading font-bold text-lg text-charcoal-900 mb-4">
                {editingId ? 'Cập Nhật Hồ Sơ Số Đo' : 'Tạo Hồ Sơ Số Đo Mới'}
              </h3>

              <form onSubmit={handleSave} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-charcoal-700 mb-1">
                    Tên hồ sơ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Cá nhân, Bạn bè, Anh Tuấn..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-surface-cream border border-surface-border rounded-xl p-2.5 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-charcoal-700 mb-1">Giới tính</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setGender('nam')}
                      className={`py-2 rounded-xl font-bold border ${
                        gender === 'nam' ? 'bg-charcoal-900 text-white' : 'bg-surface-cream'
                      }`}
                    >
                      Nam
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender('nu')}
                      className={`py-2 rounded-xl font-bold border ${
                        gender === 'nu' ? 'bg-brand-500 text-white' : 'bg-surface-cream'
                      }`}
                    >
                      Nữ
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-charcoal-700 mb-1">Chiều cao (cm)</label>
                    <input
                      type="number"
                      required
                      value={height}
                      onChange={(e) => setHeight(Number(e.target.value))}
                      className="w-full bg-surface-cream border border-surface-border rounded-xl p-2.5"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-charcoal-700 mb-1">Cân nặng (kg)</label>
                    <input
                      type="number"
                      required
                      value={weight}
                      onChange={(e) => setWeight(Number(e.target.value))}
                      className="w-full bg-surface-cream border border-surface-border rounded-xl p-2.5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-charcoal-700 mb-1">Ngực (cm)</label>
                    <input
                      type="number"
                      required
                      value={chest}
                      onChange={(e) => setChest(Number(e.target.value))}
                      className="w-full bg-surface-cream border border-surface-border rounded-xl p-2.5"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-charcoal-700 mb-1">Eo/bụng (cm)</label>
                    <input
                      type="number"
                      required
                      value={waist}
                      onChange={(e) => setWaist(Number(e.target.value))}
                      className="w-full bg-surface-cream border border-surface-border rounded-xl p-2.5"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-charcoal-700 mb-1">Mông (cm)</label>
                    <input
                      type="number"
                      required
                      value={hips}
                      onChange={(e) => setHips(Number(e.target.value))}
                      className="w-full bg-surface-cream border border-surface-border rounded-xl p-2.5"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-charcoal-700 mb-1">Sở thích mặc form</label>
                  <select
                    value={fitPreference}
                    onChange={(e) => setFitPreference(e.target.value as any)}
                    className="w-full bg-surface-cream border border-surface-border rounded-xl p-2.5 font-semibold"
                  >
                    <option value="regular">Vừa vặn thoải mái</option>
                    <option value="loose">Rộng rãi giấu bụng</option>
                    <option value="snug">Ôm nhẹ tôn dáng</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-charcoal-700 mb-1">Ghi chú thêm</label>
                  <input
                    type="text"
                    placeholder="VD: Thích áo sơ mi rộng nách, quần đùi rộng..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-surface-cream border border-surface-border rounded-xl p-2.5"
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 py-3 border border-surface-border rounded-xl font-bold text-charcoal-600"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-brand-500 text-white rounded-xl font-bold shadow-sm"
                  >
                    Lưu hồ sơ
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
