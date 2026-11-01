import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Tag,
  Truck,
  Check,
  AlertCircle,
  Copy,
  Sparkles,
  ChevronRight,
  Info
} from 'lucide-react';
import { Voucher } from '@/types';
import { useToast } from '@/context/ToastContext';

interface VoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyVoucher: (code: string) => boolean | void;
  currentSubtotal?: number;
  appliedDiscountVoucher?: Voucher | null;
  appliedShippingVoucher?: Voucher | null;
  onRemoveDiscount?: () => void;
  onRemoveShipping?: () => void;
  vouchersList?: Voucher[];
  usedVoucherCodes?: string[];
}

export const VoucherModal: React.FC<VoucherModalProps> = ({
  isOpen,
  onClose,
  onApplyVoucher,
  currentSubtotal = 0,
  appliedDiscountVoucher,
  appliedShippingVoucher,
  onRemoveDiscount,
  onRemoveShipping,
  vouchersList = [],
  usedVoucherCodes = [],
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'all' | 'discount' | 'shipping'>('all');
  const [manualCode, setManualCode] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleManualApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    const res = onApplyVoucher(manualCode.trim().toUpperCase());
    if (res !== false) {
      setManualCode('');
    }
  };

  const handleCopyCode = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast('Đã sao chép mã', `Mã ${code} đã được lưu vào bộ nhớ tạm.`, 'info');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredVouchers = vouchersList.filter((v) => {
    const type = v.voucherType || (v.code.toUpperCase().includes('FREESHIP') ? 'shipping' : 'discount');
    if (activeTab === 'discount') return type === 'discount';
    if (activeTab === 'shipping') return type === 'shipping';
    return true;
  });

  const content = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-stone-900/40 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[88vh] my-auto animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#F7EFEA] text-[#5C1D24] flex items-center justify-center shrink-0 shadow-2xs">
              <Tag className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-sm">Kho Voucher Ưu Đãi</h3>
              <p className="text-[11px] text-stone-500">
                Mỗi đơn áp dụng một mã ưu đãi. Chọn mã mới sẽ thay mã hiện tại.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Manual Code Input Bar */}
        <div className="p-4 bg-white border-b border-stone-100">
          <form onSubmit={handleManualApply} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Nhập mã voucher (BIGSIZE10, FREESHIP)..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                className="w-full pl-3.5 pr-8 py-2.5 text-xs uppercase bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:border-[#5C1D24] focus:ring-1 focus:ring-[#5C1D24] transition-all font-mono font-bold tracking-wider placeholder:normal-case placeholder:font-normal placeholder:tracking-normal"
              />
              {manualCode && (
                <button
                  type="button"
                  onClick={() => setManualCode('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-4 py-2.5 bg-[#5C1D24] hover:bg-[#48161C] disabled:bg-stone-300 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer disabled:cursor-not-allowed shrink-0"
            >
              Áp dụng
            </button>
          </form>

          {/* Single Voucher Status Note */}
          <div className="flex items-center gap-2 mt-2.5 text-[11px] text-stone-500">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>
              {appliedDiscountVoucher ? (
                <>Đang áp dụng: <strong className="text-[#5C1D24] font-mono">{appliedDiscountVoucher.code}</strong> (Mã giảm giá đơn)</>
              ) : appliedShippingVoucher ? (
                <>Đang áp dụng: <strong className="text-sky-700 font-mono">{appliedShippingVoucher.code}</strong> (Mã miễn phí vận chuyển)</>
              ) : (
                'Chưa chọn mã ưu đãi. Mỗi đơn chỉ áp dụng 1 mã (giảm giá hoặc freeship).'
              )}
            </span>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex border-b border-stone-200 px-4 bg-stone-50/40 text-xs font-bold">
          <button
            onClick={() => setActiveTab('all')}
            className={`py-3 px-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'border-[#5C1D24] text-[#5C1D24]'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            Tất cả ({vouchersList.length})
          </button>
          <button
            onClick={() => setActiveTab('discount')}
            className={`py-3 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'discount'
                ? 'border-[#5C1D24] text-[#5C1D24]'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Mã Giảm Giá</span>
          </button>
          <button
            onClick={() => setActiveTab('shipping')}
            className={`py-3 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'shipping'
                ? 'border-[#5C1D24] text-[#5C1D24]'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Mã Vận Chuyển</span>
          </button>
        </div>

        {/* Voucher List Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAF8F5]">
          {filteredVouchers.map((voucher) => {
            const isShipping =
              voucher.voucherType === 'shipping' || voucher.code.toUpperCase().includes('FREESHIP');
            const isUsed = !isShipping && Boolean(usedVoucherCodes?.includes(voucher.code.toUpperCase()));
            const isApplied =
              (isShipping && appliedShippingVoucher?.code === voucher.code) ||
              (!isShipping && appliedDiscountVoucher?.code === voucher.code);

            const isEligible = (currentSubtotal === 0 || currentSubtotal >= voucher.minOrderValue) && !isUsed;
            const shortage = voucher.minOrderValue - currentSubtotal;

            return (
              <div
                key={voucher.id}
                className={`relative rounded-2xl border transition-all overflow-hidden flex flex-col sm:flex-row bg-white shadow-2xs ${
                  isApplied
                    ? isShipping
                      ? 'border-sky-400 ring-2 ring-sky-300/40'
                      : 'border-[#5C1D24] ring-2 ring-[#5C1D24]/20'
                    : isUsed
                    ? 'border-stone-200 opacity-60 bg-stone-50/70'
                    : isEligible
                    ? 'border-stone-200/90 hover:border-stone-300'
                    : 'border-stone-200 opacity-70 bg-stone-50/50'
                }`}
              >
                {/* Left Ticket Stub */}
                <div
                  className={`w-full sm:w-28 p-3 flex sm:flex-col items-center justify-center gap-2 border-b sm:border-b-0 sm:border-r border-dashed ${
                    isShipping
                      ? 'bg-sky-50 text-sky-800 border-sky-200'
                      : 'bg-[#F7EFEA] text-[#5C1D24] border-[#5C1D24]/20'
                  }`}
                >
                  {isShipping ? (
                    <Truck className="w-6 h-6 stroke-[2]" />
                  ) : (
                    <Tag className="w-6 h-6 stroke-[2]" />
                  )}
                  <span className="text-[10px] font-bold uppercase tracking-wider text-center">
                    {isShipping ? 'Vận Chuyển' : 'Giảm Đơn'}
                  </span>
                </div>

                {/* Right Ticket Info */}
                <div className="flex-1 p-3.5 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-extrabold text-xs px-2 py-0.5 rounded bg-stone-100 text-stone-900 border border-stone-200">
                          {voucher.code}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleCopyCode(voucher.code, e)}
                          className="text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                          title="Sao chép mã"
                        >
                          {copiedCode === voucher.code ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {isUsed ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 border border-stone-200">
                          Đã sử dụng (1 lần)
                        </span>
                      ) : isApplied ? (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            isShipping
                              ? 'bg-sky-100 text-sky-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          <Check className="w-3 h-3 stroke-[2.5]" />
                          <span>Đang áp dụng</span>
                        </span>
                      ) : null}
                    </div>

                    <h4 className="font-bold text-xs text-stone-900 mt-1.5 leading-snug">
                      {voucher.name}
                    </h4>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      {voucher.description ||
                        `Đơn tối thiểu ${voucher.minOrderValue.toLocaleString('vi-VN')}₫`}
                    </p>
                  </div>

                  {/* Bottom Action & Condition */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-100 flex-wrap">
                    {isUsed ? (
                      <span className="text-[10.5px] text-stone-500 italic">
                        Mã giảm giá đã dùng ở đơn hàng trước
                      </span>
                    ) : !isEligible ? (
                      <span className="text-[10.5px] text-amber-700 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3 h-3 text-amber-600" />
                        <span>Mua thêm {shortage.toLocaleString('vi-VN')}₫ để dùng</span>
                      </span>
                    ) : (
                      <span className="text-[10.5px] text-emerald-700 font-medium">
                        ✓ Đủ điều kiện sử dụng
                      </span>
                    )}

                    <div className="ml-auto">
                      {isUsed ? (
                        <button
                          type="button"
                          disabled
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed select-none"
                        >
                          Đã dùng
                        </button>
                      ) : isApplied ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (isShipping && onRemoveShipping) onRemoveShipping();
                            else if (!isShipping && onRemoveDiscount) onRemoveDiscount();
                          }}
                          className="px-3 py-1 text-xs font-semibold text-rose-700 hover:text-rose-900 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          Bỏ chọn
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={!isEligible}
                          onClick={() => {
                            onApplyVoucher(voucher.code);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isEligible
                              ? isShipping
                                ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-xs'
                                : 'bg-[#5C1D24] hover:bg-[#48161C] text-white shadow-xs'
                              : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                          }`}
                        >
                          Sử dụng
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 bg-white flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-stone-500 text-[11px]">
            <Info className="w-3.5 h-3.5 text-stone-400" />
            <span>Mỗi đơn áp dụng một mã ưu đãi</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-stone-900 hover:bg-black text-white font-bold rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
};
