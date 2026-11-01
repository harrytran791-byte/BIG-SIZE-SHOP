import React, { useState, useEffect } from 'react';
import {
  Tag,
  Truck,
  Plus,
  Edit,
  Trash2,
  Calendar,
  X
} from 'lucide-react';
import { SupabaseVoucher, supabase, fetchVouchersFromSupabase } from '@/shared/services/supabaseClient';
import { useToast } from '@/shared/context/ToastContext';
import { ConfirmModal } from '@/shared/components/ConfirmModal';

interface VouchersTabProps {
  vouchersList: SupabaseVoucher[];
  setVouchersList: React.Dispatch<React.SetStateAction<SupabaseVoucher[]>>;
  onAppendAuditLog: (
    action: string,
    category: string,
    targetCode: string,
    targetDesc: string,
    result?: 'success' | 'denied',
    reason?: string
  ) => void;
}

const formatVnCurrencyInput = (val: number | string | undefined): string => {
  if (val === '' || val === undefined || val === null) return '';
  const num = typeof val === 'number' ? val : parseInt(String(val).replace(/\D/g, ''), 10);
  return isNaN(num) ? '' : num.toLocaleString('vi-VN');
};

const parseVnCurrencyInput = (str: string): number => {
  const num = parseInt(str.replace(/\D/g, ''), 10);
  return isNaN(num) ? 0 : num;
};

export const VouchersTab: React.FC<VouchersTabProps> = ({
  vouchersList,
  setVouchersList,
  onAppendAuditLog,
}) => {
  const { showToast } = useToast();

  const [voucherCategoryFilter, setVoucherCategoryFilter] = useState<'all' | 'discount' | 'shipping'>('all');

  // Create Voucher Modal State
  const [isCreateVoucherModalOpen, setIsCreateVoucherModalOpen] = useState(false);
  const [newVoucherCode, setNewVoucherCode] = useState('');
  const [newVoucherName, setNewVoucherName] = useState('');
  const [newVoucherType, setNewVoucherType] = useState<'discount' | 'shipping'>('discount');
  const [newVoucherDiscountType, setNewVoucherDiscountType] = useState<'percent' | 'fixed'>('fixed');
  const [newVoucherDiscountValue, setNewVoucherDiscountValue] = useState(30000);
  const [newVoucherMinOrder, setNewVoucherMinOrder] = useState(300000);
  const [newVoucherMaxDiscount, setNewVoucherMaxDiscount] = useState(50000);

  // Edit Voucher Modal State
  const [isEditVoucherModalOpen, setIsEditVoucherModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<SupabaseVoucher | null>(null);
  const [editVoucherCode, setEditVoucherCode] = useState('');
  const [editVoucherName, setEditVoucherName] = useState('');
  const [editVoucherType, setEditVoucherType] = useState<'discount' | 'shipping'>('discount');
  const [editVoucherDiscountType, setEditVoucherDiscountType] = useState<'percent' | 'fixed'>('fixed');
  const [editVoucherDiscountValue, setEditVoucherDiscountValue] = useState<string>('30000');
  const [editVoucherMinOrder, setEditVoucherMinOrder] = useState<string>('300000');
  const [editVoucherMaxDiscount, setEditVoucherMaxDiscount] = useState<string>('50000');
  const [editVoucherStartDate, setEditVoucherStartDate] = useState<string>('');
  const [editVoucherEndDate, setEditVoucherEndDate] = useState<string>('');

  // Lifecycle actions require a separate confirmation from the edit form.
  const [voucherToDelete, setVoucherToDelete] = useState<SupabaseVoucher | null>(null);
  const [voucherToPause, setVoucherToPause] = useState<SupabaseVoucher | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isCreateVoucherModalOpen) setIsCreateVoucherModalOpen(false);
        if (isEditVoucherModalOpen) {
          setIsEditVoucherModalOpen(false);
          setEditingVoucher(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreateVoucherModalOpen, isEditVoucherModalOpen]);
  const isPaused = (voucher: SupabaseVoucher) =>
    ['Tạm ngưng', 'Đã vô hiệu hóa', 'Hết hiệu lực'].includes(voucher.status);

  const isReactivating = voucherToPause !== null && isPaused(voucherToPause);

  const isAnyVoucherModalOpen = isCreateVoucherModalOpen || isEditVoucherModalOpen || voucherToPause !== null || voucherToDelete !== null;

  // 1. Cảnh báo khi Quản lý đang nhập voucher mà lỡ tay F5
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isAnyVoucherModalOpen) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isAnyVoucherModalOpen]);

  // 2. Bấm nút Quay lại (Back) thì đóng modal voucher thay vì rời trang
  useEffect(() => {
    if (isAnyVoucherModalOpen) {
      window.history.pushState({ modal: 'voucher-modal' }, '');
      const handlePopState = () => {
        if (voucherToPause || voucherToDelete) return;
        setIsCreateVoucherModalOpen(false);
        setIsEditVoucherModalOpen(false);
      };
      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [isAnyVoucherModalOpen, voucherToPause, voucherToDelete]);

  const discountCount = vouchersList.filter(
    (v) => (v.voucherType || (v.code.includes('FREESHIP') ? 'shipping' : 'discount')) === 'discount'
  ).length;

  const shippingCount = vouchersList.filter(
    (v) => (v.voucherType || (v.code.includes('FREESHIP') ? 'shipping' : 'discount')) === 'shipping'
  ).length;

  const filtered = vouchersList.filter((v) => {
    const t = v.voucherType || (v.code.includes('FREESHIP') ? 'shipping' : 'discount');
    if (voucherCategoryFilter === 'discount') return t === 'discount';
    if (voucherCategoryFilter === 'shipping') return t === 'shipping';
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-900 flex items-center gap-2">
            <Tag className="w-6 h-6 text-[#5C1D24]" />
            <span>Quản Lý Voucher & Khuyến Mãi</span>
          </h1>
        </div>
        <button
          type="button"
          onClick={() => {
            setNewVoucherCode('');
            setNewVoucherName('');
            setNewVoucherType('discount');
            setNewVoucherDiscountType('fixed');
            setNewVoucherDiscountValue(30000);
            setNewVoucherMinOrder(300000);
            setNewVoucherMaxDiscount(50000);
            setIsCreateVoucherModalOpen(true);
          }}
          className="px-4 py-2 bg-[#5C1D24] hover:bg-[#4A151B] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo Voucher Mới</span>
        </button>
      </div>

      {/* THANH TAB PHÂN LOẠI VOUCHER: TẤT CẢ | GIẢM GIÁ | VẬN CHUYỂN */}
      <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 pb-3">
        <button
          type="button"
          onClick={() => setVoucherCategoryFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            voucherCategoryFilter === 'all'
              ? 'bg-[#5C1D24] text-white shadow-2xs'
              : 'bg-white hover:bg-stone-50 text-stone-600 border border-stone-200'
          }`}
        >
          <span>Tất cả</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              voucherCategoryFilter === 'all' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
            }`}
          >
            {vouchersList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setVoucherCategoryFilter('discount')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            voucherCategoryFilter === 'discount'
              ? 'bg-rose-700 text-white shadow-2xs'
              : 'bg-white hover:bg-stone-50 text-stone-600 border border-stone-200'
          }`}
        >
          <Tag className="w-3.5 h-3.5 text-rose-500" />
          <span>Voucher Giảm Giá</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              voucherCategoryFilter === 'discount' ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-700'
            }`}
          >
            {discountCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setVoucherCategoryFilter('shipping')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            voucherCategoryFilter === 'shipping'
              ? 'bg-sky-700 text-white shadow-2xs'
              : 'bg-white hover:bg-stone-50 text-stone-600 border border-stone-200'
          }`}
        >
          <Truck className="w-3.5 h-3.5 text-sky-500" />
          <span>Hỗ Trợ Vận Chuyển</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              voucherCategoryFilter === 'shipping' ? 'bg-white/20 text-white' : 'bg-sky-50 text-sky-700'
            }`}
          >
            {shippingCount}
          </span>
        </button>
      </div>

      {/* Vouchers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((v) => {
          const isShipping = (v.voucherType || (v.code.includes('FREESHIP') ? 'shipping' : 'discount')) === 'shipping';
          const today = new Date().toISOString().split('T')[0];
          const isExpired = Boolean(v.endDate && today > v.endDate);
          const isUpcoming = Boolean(v.startDate && today < v.startDate);
          const statusLabel = isPaused(v) ? 'Tạm ngưng' : v.status !== 'Đang hoạt động' ? v.status : isExpired ? 'Đã hết hạn' : isUpcoming ? 'Sắp diễn ra' : 'Đang áp dụng';
          const statusBadgeClass = isPaused(v) || isExpired
            ? 'bg-stone-100 text-stone-600 border border-stone-200'
            : isUpcoming
              ? 'bg-amber-50 text-amber-800 border border-amber-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200';

          return (
            <div
              key={v.code}
              className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-2xs hover:border-brand-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="font-mono font-black text-lg text-brand-700 tracking-wider">{v.code}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${statusBadgeClass}`}>
                    {statusLabel}
                  </span>
                </div>

                {/* Badge phân loại voucher */}
                <div className="mb-2">
                  {isShipping ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10.5px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                      <Truck className="w-3 h-3 text-sky-600" />
                      <span>Voucher Hỗ Trợ Vận Chuyển</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      <Tag className="w-3 h-3 text-rose-600" />
                      <span>Voucher Giảm Giá Đơn Hàng</span>
                    </span>
                  )}
                </div>

                <p className="font-bold text-xs text-charcoal-900 mb-1">{v.name}</p>
                <p className={`text-xs font-semibold ${isShipping ? 'text-sky-800' : 'text-brand-800'}`}>
                  {isShipping
                    ? `Hỗ trợ phí ship: ${v.discountValue?.toLocaleString('vi-VN')}₫`
                    : `Mức giảm: ${
                        v.discountType === 'percent'
                          ? `${v.discountValue}% (Tối đa ${v.maxDiscount?.toLocaleString('vi-VN')}₫)`
                          : `${v.discountValue?.toLocaleString('vi-VN')}₫`
                      }`}
                </p>
                <p className="text-[11px] text-stone-500 mt-1">
                  Đơn tối thiểu: {v.minOrderValue?.toLocaleString('vi-VN')}₫
                </p>

                {/* Thời gian hiệu lực áp dụng */}
                <div className="flex items-center gap-1.5 text-[11px] text-stone-500 mt-2 pt-2 border-t border-stone-100">
                  <Calendar className="w-3.5 h-3.5 text-[#5C1D24]" />
                  <span>
                    {v.startDate || v.endDate
                      ? `Hạn dùng: ${v.startDate ? v.startDate.split('-').reverse().join('/') : 'Bắt đầu ngay'} – ${v.endDate ? v.endDate.split('-').reverse().join('/') : 'Vô thời hạn'}`
                      : 'Hạn dùng: Vô thời hạn (Áp dụng quanh năm)'}
                  </span>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-stone-100 flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[10px] text-stone-400 font-mono">Mã KM: #{v.id}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingVoucher(v);
                      setEditVoucherCode(v.code);
                      setEditVoucherName(v.name);
                      setEditVoucherType(v.voucherType || (v.code.includes('FREESHIP') ? 'shipping' : 'discount'));
                      setEditVoucherDiscountType(v.discountType);
                      setEditVoucherDiscountValue(String(v.discountValue));
                      setEditVoucherMinOrder(String(v.minOrderValue));
                      setEditVoucherMaxDiscount(String(v.maxDiscount || ''));
                      setEditVoucherStartDate(v.startDate || '');
                      setEditVoucherEndDate(v.endDate || '');
                      setIsEditVoucherModalOpen(true);
                    }}
                    className="px-3 py-1.5 text-[11px] font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    title="Chỉnh sửa thông tin & thời hạn áp dụng voucher"
                  >
                    <Edit className="w-3.5 h-3.5 text-stone-600" />
                    <span>Sửa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (isPaused(v)) setVoucherToDelete(v); }}
                    disabled={!isPaused(v)}
                    className="px-3 py-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                    title={isPaused(v) ? 'Xóa voucher' : 'Tạm ngưng voucher trước khi xóa'}
                  >
                    <Trash2 className="w-3 h-3 text-rose-600" />
                    <span>Xóa</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL TẠO VOUCHER MỚI */}
      {isCreateVoucherModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fadeIn"
          onClick={() => setIsCreateVoucherModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-2xl border border-stone-200 animate-scaleIn space-y-4 my-auto text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <h3 className="font-bold text-base text-charcoal-900">Tạo Voucher Khuyến Mãi Mới</h3>
                <p className="text-xs text-stone-500">Cấu hình loại voucher, giá trị ưu đãi và điều kiện áp dụng</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateVoucherModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const code = newVoucherCode.trim().toUpperCase();
                const name = newVoucherName.trim();
                if (!code || !name) {
                  showToast('Thiếu thông tin', 'Vui lòng nhập mã và tên voucher', 'error');
                  return;
                }

                if (Number(newVoucherDiscountValue) <= 0 || Number(newVoucherMinOrder) < 0 || (newVoucherType === 'discount' && newVoucherDiscountType === 'percent' && Number(newVoucherDiscountValue) > 100)) {
                  showToast('Giá trị chưa hợp lệ', 'Mức giảm phải lớn hơn 0 và tỷ lệ giảm không vượt quá 100%.', 'error');
                  return;
                }
                try {
                  const { data, error } = await supabase
                    .from('voucher')
                    .insert({
                      code,
                      ten_voucher: name,
                      loai_voucher: newVoucherType === 'shipping' ? 'van_chuyen' : 'tien_hang',
                      loai_giam: newVoucherType !== 'shipping' && newVoucherDiscountType === 'percent' ? 'phan_tram' : 'so_tien',
                      gia_tri_giam: Number(newVoucherDiscountValue),
                      giam_toi_da: newVoucherType !== 'shipping' && newVoucherDiscountType === 'percent' ? Number(newVoucherMaxDiscount) : Number(newVoucherDiscountValue),
                      don_toi_thieu: Number(newVoucherMinOrder),
                      trang_thai: 'dang_hoat_dong',
                    })
                    .select()
                    .maybeSingle();

                  if (error || !data) {
                    showToast('Lỗi tạo voucher', 'Không thể lưu voucher. Vui lòng kiểm tra quyền và cấu hình hệ thống.', 'error');
                    return;
                  }

                  const newV: SupabaseVoucher = {
                    id: data.ma_voucher,
                    code,
                    name,
                    voucherType: newVoucherType,
                    discountType: newVoucherType === 'shipping' ? 'fixed' : newVoucherDiscountType,
                    discountValue: Number(newVoucherDiscountValue),
                    maxDiscount: newVoucherType !== 'shipping' && newVoucherDiscountType === 'percent' ? Number(newVoucherMaxDiscount) : Number(newVoucherDiscountValue),
                    minOrderValue: Number(newVoucherMinOrder),
                    startDate: undefined,
                    endDate: undefined,
                    status: 'Đang hoạt động'
                  };

                  setVouchersList((prev) => [newV, ...prev]);

                  onAppendAuditLog(
                    'Tạo mã khuyến mãi / voucher mới',
                    'Khuyến mãi & Voucher',
                    newV.code,
                    `${newV.name} (${newV.discountValue.toLocaleString('vi-VN')}${newV.discountType === 'percent' ? '%' : '₫'})`,
                    'success',
                    `Áp dụng cho đơn hàng từ ${newV.minOrderValue.toLocaleString('vi-VN')}₫`
                  );

                  showToast(
                    'Tạo voucher thành công',
                    `Mã ${newV.code} (${newV.voucherType === 'shipping' ? 'Hỗ trợ ship' : 'Giảm giá'}) đã được kích hoạt!`,
                    'success'
                  );
                  setIsCreateVoucherModalOpen(false);
                } catch (err: any) {
                  showToast('Không thể lưu thay đổi', 'Vui lòng thử lại sau khi kiểm tra kết nối và quyền truy cập.', 'error');
                }
              }}
              className="space-y-4"
            >
              {/* 1. Chọn loại Voucher */}
              <div>
                <label className="block text-xs font-bold text-charcoal-800 mb-1.5">
                  Phân loại voucher <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewVoucherType('discount')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      newVoucherType === 'discount'
                        ? 'border-rose-500 bg-rose-50/50 ring-1 ring-rose-500'
                        : 'border-stone-200 bg-white hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-rose-900 mb-0.5">
                      <Tag className="w-3.5 h-3.5 text-rose-600" />
                      <span>Giảm Giá Đơn Hàng</span>
                    </div>
                    <p className="text-[10.5px] text-stone-500 leading-tight">
                      Trừ trực tiếp vào tiền hàng theo % hoặc số tiền cố định.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewVoucherType('shipping')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      newVoucherType === 'shipping'
                        ? 'border-sky-500 bg-sky-50/50 ring-1 ring-sky-500'
                        : 'border-stone-200 bg-white hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-sky-900 mb-0.5">
                      <Truck className="w-3.5 h-3.5 text-sky-600" />
                      <span>Hỗ Trợ Vận Chuyển</span>
                    </div>
                    <p className="text-[10.5px] text-stone-500 leading-tight">
                      Trừ trực tiếp vào phí vận chuyển của đơn hàng (GHTK/GHN).
                    </p>
                  </button>
                </div>
              </div>

              {/* 2. Mã voucher & Tên voucher */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    Mã voucher (In hoa) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: BIGSALE10, FREESHIP30"
                    value={newVoucherCode}
                    onChange={(e) => setNewVoucherCode(e.target.value.toUpperCase())}
                    className="w-full h-9 px-3 text-xs uppercase font-mono font-bold bg-white border border-stone-300 rounded-xl focus:border-[#5C1D24] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    Tên chương trình <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Tri ân khách hàng mới"
                    value={newVoucherName}
                    onChange={(e) => setNewVoucherName(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-white border border-stone-300 rounded-xl focus:border-[#5C1D24] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* 3. Giá trị giảm & Điều kiện */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {newVoucherType === 'discount' && (
                  <div>
                    <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                      Kiểu giảm giá
                    </label>
                    <select
                      value={newVoucherDiscountType}
                      onChange={(e) => setNewVoucherDiscountType(e.target.value as any)}
                      className="w-full h-9 px-3 text-xs bg-white border border-stone-300 rounded-xl focus:border-[#5C1D24] focus:outline-hidden cursor-pointer"
                    >
                      <option value="fixed">Số tiền cố định (VNĐ)</option>
                      <option value="percent">Phần trăm (%)</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    {newVoucherType === 'shipping'
                      ? 'Mức hỗ trợ ship (VNĐ)'
                      : newVoucherDiscountType === 'percent'
                        ? 'Mức giảm (%)'
                        : 'Mức giảm (VNĐ)'}
                  </label>
                  <input
                    type={newVoucherDiscountType === 'percent' && newVoucherType !== 'shipping' ? 'number' : 'text'}
                    required
                    min={1}
                    max={newVoucherDiscountType === 'percent' && newVoucherType !== 'shipping' ? 100 : undefined}
                    value={
                      newVoucherDiscountType === 'percent' && newVoucherType !== 'shipping'
                        ? newVoucherDiscountValue
                        : formatVnCurrencyInput(newVoucherDiscountValue)
                    }
                    onChange={(e) =>
                      setNewVoucherDiscountValue(
                        newVoucherDiscountType === 'percent' && newVoucherType !== 'shipping'
                          ? Number(e.target.value)
                          : parseVnCurrencyInput(e.target.value)
                      )
                    }
                    className="w-full h-9 px-3 text-xs bg-white border border-stone-300 rounded-xl focus:border-[#5C1D24] focus:outline-hidden font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                    Đơn tối thiểu áp dụng (VNĐ)
                  </label>
                  <input
                    type="text"
                    required
                    value={formatVnCurrencyInput(newVoucherMinOrder)}
                    onChange={(e) => setNewVoucherMinOrder(parseVnCurrencyInput(e.target.value))}
                    className="w-full h-9 px-3 text-xs bg-white border border-stone-300 rounded-xl focus:border-[#5C1D24] focus:outline-hidden font-medium"
                  />
                </div>

                {newVoucherType === 'discount' && newVoucherDiscountType === 'percent' && (
                  <div>
                    <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                      Giảm tối đa (VNĐ)
                    </label>
                    <input
                      type="text"
                      required
                      value={formatVnCurrencyInput(newVoucherMaxDiscount)}
                      onChange={(e) => setNewVoucherMaxDiscount(parseVnCurrencyInput(e.target.value))}
                      className="w-full h-9 px-3 text-xs bg-white border border-stone-300 rounded-xl focus:border-[#5C1D24] focus:outline-hidden font-medium"
                    />
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsCreateVoucherModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#5C1D24] hover:bg-[#4A151B] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Lưu Voucher Mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CHỈNH SỬA VOUCHER */}
      {isEditVoucherModalOpen && editingVoucher && (
        <div
          className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fadeIn"
          onClick={() => {
            setIsEditVoucherModalOpen(false);
            setEditingVoucher(null);
          }}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-2xl border border-stone-200 animate-scaleIn space-y-4 max-h-[88vh] my-auto overflow-y-auto text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <h3 className="font-bold text-base text-charcoal-900">Chỉnh Sửa Mã Khuyến Mãi</h3>
                <p className="text-xs text-stone-500">Cập nhật thông tin ưu đãi và thời hạn áp dụng voucher</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditVoucherModalOpen(false);
                  setEditingVoucher(null);
                }}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!editVoucherName.trim()) {
                  showToast('Thiếu thông tin', 'Vui lòng nhập tên chương trình ưu đãi', 'error');
                  return;
                }

                if (editVoucherStartDate && editVoucherEndDate && editVoucherStartDate > editVoucherEndDate) {
                  showToast('Thời gian chưa hợp lệ', 'Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.', 'error');
                  return;
                }
                const numDiscount = Number(editVoucherDiscountValue) || 0;
                const numMinOrder = Number(editVoucherMinOrder) || 0;
                const numMaxDiscount = editVoucherType === 'shipping' || editVoucherDiscountType === 'fixed' ? numDiscount : Number(editVoucherMaxDiscount) || 0;

                const updated: SupabaseVoucher = {
                  ...editingVoucher,
                  name: editVoucherName.trim(),
                  voucherType: editVoucherType,
                  discountType: editVoucherType === 'shipping' ? 'fixed' : editVoucherDiscountType,
                  discountValue: numDiscount,
                  maxDiscount: numMaxDiscount,
                  minOrderValue: numMinOrder,
                  startDate: editVoucherStartDate,
                  endDate: editVoucherEndDate,
                };

                try {
                  const { data, error } = await supabase
                    .from('voucher')
                    .update({
                      ten_voucher: updated.name,
                      loai_voucher: updated.voucherType === 'shipping' ? 'van_chuyen' : 'tien_hang',
                      loai_giam: updated.discountType === 'percent' ? 'phan_tram' : 'so_tien',
                      gia_tri_giam: updated.discountValue,
                      giam_toi_da: updated.maxDiscount,
                      don_toi_thieu: updated.minOrderValue,
                      ngay_bat_dau: editVoucherStartDate ? `${editVoucherStartDate}T00:00:00+07:00` : null,
                      ngay_ket_thuc: editVoucherEndDate ? `${editVoucherEndDate}T23:59:59.999+07:00` : null,
                    })
                    .eq('code', updated.code)
                    .select();

                  if (error || !data || data.length === 0) {
                    showToast('Lỗi cập nhật', 'Không thể cập nhật voucher. Vui lòng tải lại và kiểm tra quyền hoặc cấu hình hệ thống.', 'error');
                    setVouchersList(await fetchVouchersFromSupabase());
                    return;
                  }

                  setVouchersList((prev) => prev.map((v) => (v.id === editingVoucher.id ? updated : v)));

                  onAppendAuditLog(
                    'Cập nhật voucher khuyến mãi',
                    'Khuyến mãi & Voucher',
                    updated.code,
                    `${updated.name} (Hạn: ${updated.startDate || 'N/A'} - ${updated.endDate || 'N/A'})`,
                    'success',
                    'Đã cập nhật thông tin và thời gian áp dụng'
                  );

                  showToast('Cập nhật thành công', `Đã lưu thông tin cho mã ${updated.code}!`, 'success');
                  setIsEditVoucherModalOpen(false);
                  setEditingVoucher(null);
                } catch (err: any) {
                  showToast('Không thể lưu thay đổi', 'Vui lòng thử lại sau khi kiểm tra kết nối và quyền truy cập.', 'error');
                }
              }}
              className="space-y-3.5 text-xs"
            >
              {/* Mã voucher & Phân loại */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-600 font-bold mb-1">Mã Voucher (Cố định):</label>
                  <input
                    type="text"
                    disabled
                    value={editVoucherCode}
                    className="w-full px-3 py-2 bg-stone-100 border border-stone-200 rounded-xl font-mono font-bold text-charcoal-700 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 font-bold mb-1">Phân Loại Voucher:</label>
                  <select
                    value={editVoucherType}
                    onChange={(e) => setEditVoucherType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl font-medium focus:outline-hidden focus:border-[#5C1D24] cursor-pointer"
                  >
                    <option value="discount">Giảm Giá Đơn Hàng</option>
                    <option value="shipping">Hỗ Trợ Vận Chuyển</option>
                  </select>
                </div>
              </div>

              {/* Tên chương trình */}
              <div>
                <label className="block text-stone-600 font-bold mb-1">Tên Chương Trình Ưu Đãi:</label>
                <input
                  type="text"
                  required
                  value={editVoucherName}
                  onChange={(e) => setEditVoucherName(e.target.value)}
                  placeholder="VD: Tri ân khách hàng thân thiết..."
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl font-medium focus:outline-hidden focus:border-[#5C1D24]"
                />
              </div>

              {/* Hình thức giảm & Mức giảm */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-600 font-bold mb-1">Hình Thức Giảm:</label>
                  <select
                    value={editVoucherType === 'shipping' ? 'fixed' : editVoucherDiscountType}
                    disabled={editVoucherType === 'shipping'}
                    onChange={(e) => setEditVoucherDiscountType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl font-medium focus:outline-hidden focus:border-[#5C1D24] disabled:bg-stone-100 disabled:text-stone-400 cursor-pointer"
                  >
                    <option value="fixed">Số tiền cố định (₫)</option>
                    <option value="percent">Phần trăm (%)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-stone-600 font-bold mb-1">
                    Mức Giảm {editVoucherDiscountType === 'percent' && editVoucherType !== 'shipping' ? '(%)' : '(₫)'}:
                  </label>
                  <input
                    type={editVoucherDiscountType === 'percent' && editVoucherType !== 'shipping' ? 'number' : 'text'}
                    required
                    min={1}
                    max={editVoucherDiscountType === 'percent' && editVoucherType !== 'shipping' ? 100 : undefined}
                    value={
                      editVoucherDiscountType === 'percent' && editVoucherType !== 'shipping'
                        ? editVoucherDiscountValue
                        : formatVnCurrencyInput(editVoucherDiscountValue)
                    }
                    onChange={(e) =>
                      setEditVoucherDiscountValue(
                        editVoucherDiscountType === 'percent' && editVoucherType !== 'shipping'
                          ? e.target.value
                          : String(parseVnCurrencyInput(e.target.value))
                      )
                    }
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl font-medium focus:outline-hidden focus:border-[#5C1D24]"
                  />
                </div>
              </div>

              {/* Đơn tối thiểu & Giảm tối đa */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-600 font-bold mb-1">Đơn Tối Thiểu (₫):</label>
                  <input
                    type="text"
                    required
                    value={formatVnCurrencyInput(editVoucherMinOrder)}
                    onChange={(e) => setEditVoucherMinOrder(String(parseVnCurrencyInput(e.target.value)))}
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl font-medium focus:outline-hidden focus:border-[#5C1D24]"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 font-bold mb-1">Giảm Tối Đa (₫):</label>
                  <input
                    type="text"
                    required
                    value={formatVnCurrencyInput(editVoucherMaxDiscount)}
                    onChange={(e) => setEditVoucherMaxDiscount(String(parseVnCurrencyInput(e.target.value)))}
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl font-medium focus:outline-hidden focus:border-[#5C1D24]"
                  />
                </div>
              </div>

              {/* THỜI GIAN ÁP DỤNG */}
              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2.5">
                <span className="block font-bold text-charcoal-900 text-xs flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#5C1D24]" />
                  Thời Gian Áp Dụng (Hệ Thống Tự Xác Định Trạng Thái)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-500 text-[11px] font-medium mb-1">Ngày Bắt Đầu:</label>
                    <input
                      type="date"
                      required
                      value={editVoucherStartDate}
                      onChange={(e) => setEditVoucherStartDate(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-medium focus:outline-hidden focus:border-[#5C1D24] cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-500 text-[11px] font-medium mb-1">Ngày Kết Thúc:</label>
                    <input
                      type="date"
                      required
                      value={editVoucherEndDate}
                      onChange={(e) => setEditVoucherEndDate(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-medium focus:outline-hidden focus:border-[#5C1D24] cursor-pointer"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-stone-500 italic">
                  * Để dừng áp dụng ngay, chọn Tạm ngưng bên dưới. Chỉ voucher đã tạm ngưng và chưa được dùng trong đơn hàng mới có thể xóa.
                </p>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setVoucherToPause(editingVoucher)}
                  className="mr-auto px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPaused(editingVoucher) ? 'Kích hoạt lại' : 'Tạm ngưng'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditVoucherModalOpen(false);
                    setEditingVoucher(null);
                  }}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#5C1D24] hover:bg-[#4A121D] text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={voucherToPause !== null}
        title={isReactivating ? 'Xác nhận kích hoạt lại voucher?' : 'Xác nhận tạm ngưng voucher?'}
        description={isReactivating
          ? `Kích hoạt lại mã "${voucherToPause?.code}"? Thời hạn đã lưu được giữ nguyên; mã hết hạn hoặc chưa đến ngày bắt đầu vẫn chưa thể áp dụng. Các chỉnh sửa chưa lưu sẽ không được áp dụng.`
          : `Tạm ngưng mã "${voucherToPause?.code}"? Khách hàng sẽ không thể áp dụng mã này. Các chỉnh sửa chưa lưu sẽ không được áp dụng.`}
        confirmText={isReactivating ? 'Kích hoạt lại' : 'Tạm ngưng'}
        cancelText="Hủy bỏ"
        variant="warning"
        onConfirm={async () => {
          if (!voucherToPause) return;
          const target = voucherToPause;
          const reactivating = isPaused(target);
          const nextState = reactivating ? 'dang_hoat_dong' : 'ngung_hoat_dong';
          const action = reactivating ? 'kích hoạt lại' : 'tạm ngưng';
          try {
            const { data, error } = await supabase.from('voucher')
              .update({ trang_thai: nextState })
              .eq('ma_voucher', target.id).select('ma_voucher, trang_thai');
            if (error || data?.length !== 1 || data[0].trang_thai !== nextState) {
              showToast(`Không thể ${action}`, 'Vui lòng tải lại và kiểm tra quyền truy cập.', 'error');
              return;
            }
            const { data: saved, error: readError } = await supabase.from('voucher')
              .select('trang_thai').eq('ma_voucher', target.id).single();
            if (readError || saved?.trang_thai !== nextState) {
              showToast('Chưa xác minh được thay đổi', 'Vui lòng tải lại danh sách trước khi thao tác tiếp.', 'error');
              return;
            }
            const startsAt = target.startsAt || (target.startDate ? `${target.startDate}T00:00:00+07:00` : '');
            const expiresAt = target.expiresAt || (target.endDate ? `${target.endDate}T23:59:59.999+07:00` : '');
            const activeStatus = startsAt && Date.now() < Date.parse(startsAt) ? 'Chưa bắt đầu'
              : expiresAt && Date.now() > Date.parse(expiresAt) ? 'Đã hết hạn' : 'Đang hoạt động';
            setVouchersList(prev => prev.map(v => v.id === target.id ? { ...v, status: reactivating ? activeStatus : 'Tạm ngưng' } : v));
            setIsEditVoucherModalOpen(false);
            setEditingVoucher(null);
            onAppendAuditLog(reactivating ? 'Kích hoạt lại voucher' : 'Tạm ngưng voucher', 'Khuyến mãi & Voucher', target.code, target.name);
            showToast(`Đã ${action} voucher`, reactivating
              ? `Mã ${target.code} đã được kích hoạt lại. Thời hạn áp dụng được giữ nguyên.`
              : `Mã ${target.code} đã tạm ngưng và không còn được áp dụng.`, 'success');
          } catch {
            showToast(`Không thể ${action}`, 'Vui lòng kiểm tra kết nối và thử lại.', 'error');
          } finally {
            setVoucherToPause(null);
          }
        }}
        onCancel={() => setVoucherToPause(null)}
      />

      {/* CONFIRM DELETE VOUCHER MODAL */}
      <ConfirmModal
        isOpen={voucherToDelete !== null}
        title="Xác nhận xóa mã voucher?"
        description={`Xóa vĩnh viễn mã "${voucherToDelete?.code}" (${voucherToDelete?.name})? Thao tác không thể hoàn tác. Voucher đã được dùng trong đơn hàng sẽ không được xóa.`}
        confirmText="Xóa voucher"
        cancelText="Hủy bỏ"
        variant="danger"
        onConfirm={async () => {
          if (!voucherToDelete) return;
          const code = voucherToDelete.code;
          const name = voucherToDelete.name;
          const targetId = voucherToDelete.id;

          try {
            if (!isPaused(voucherToDelete)) {
              showToast('Chưa thể xóa voucher', 'Tạm ngưng voucher trước khi xóa.', 'error');
              return;
            }
            const { data: current, error: stateError } = await supabase.from('voucher')
              .select('trang_thai').eq('ma_voucher', targetId).single();
            if (stateError || !['ngung_hoat_dong', 'tam_dung'].includes(current?.trang_thai)) {
              showToast('Chưa thể xóa voucher', 'Voucher chưa tạm ngưng hoặc đã thay đổi. Vui lòng tải lại.', 'error');
              return;
            }
            const { count, error: usageError } = await supabase.from('hoadon')
              .select('ma_hd', { count: 'exact', head: true }).eq('ma_voucher', targetId);
            if (usageError || typeof count !== 'number' || count < 0) {
              showToast('Chưa thể xóa voucher', 'Không thể kiểm tra lịch sử sử dụng. Vui lòng thử lại.', 'error');
              return;
            }
            if (count > 0) {
              showToast('Không thể xóa voucher đã sử dụng', 'Mã đã gắn với đơn hàng. Giữ trạng thái tạm ngưng để bảo toàn lịch sử.', 'error');
              return;
            }
            const { data, error } = await supabase.from('voucher').delete()
              .eq('ma_voucher', targetId).in('trang_thai', ['ngung_hoat_dong', 'tam_dung'])
              .select('ma_voucher');
            if (error || data?.length !== 1) {
              showToast('Không thể xóa voucher', 'Voucher đã thay đổi, đang được sử dụng hoặc bạn không có quyền xóa. Vui lòng tải lại.', 'error');
              return;
            }
            const { data: remaining, error: readError } = await supabase.from('voucher')
              .select('ma_voucher').eq('ma_voucher', targetId).maybeSingle();
            if (readError || remaining) {
              showToast('Chưa xác minh được việc xóa', 'Vui lòng tải lại danh sách trước khi thao tác tiếp.', 'error');
              return;
            }
            setVouchersList(prev => prev.filter(v => v.id !== targetId));
            onAppendAuditLog('Xóa voucher', 'Khuyến mãi & Voucher', code, name);
            showToast('Đã xóa voucher', `Mã ${code} đã được xóa khỏi hệ thống.`, 'success');
          } catch (err: any) {
            showToast('Không thể lưu thay đổi', 'Vui lòng thử lại sau khi kiểm tra kết nối và quyền truy cập.', 'error');
          } finally {
            setVoucherToDelete(null);
          }
        }}
        onCancel={() => setVoucherToDelete(null)}
      />
    </div>
  );
};
