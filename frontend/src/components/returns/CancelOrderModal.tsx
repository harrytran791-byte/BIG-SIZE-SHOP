import { ConfirmModal } from '@/shared/components/ConfirmModal';
import React, { useState, useRef } from 'react';
import { X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Order } from '../../types';
import { useOrder } from '../../context/OrderContext';
import { useReturn } from '../../context/ReturnContext';
import { useInventory } from '../../context/InventoryContext';
import { useToast } from '../../context/ToastContext';

interface CancelOrderModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
}

export const CancelOrderModal: React.FC<CancelOrderModalProps> = ({ order, isOpen, onClose }) => {
  const { cancelOrder, requestCancelOrder } = useOrder();
  const { cancelPendingOrder, requestCancelConfirmedOrder } = useReturn();
  const { releaseStock } = useInventory();
  const { showToast } = useToast();

  const busy = useRef(false);
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState('Đổi ý không muốn mua nữa');
  const [otherReason, setOtherReason] = useState('');
  const [isDone, setIsDone] = useState(false);

  if (!isOpen) return null;

  const isPending = order.status === 'placed';

  const handleCancelSubmit = (e: React.FormEvent) => { e.preventDefault(); setConfirming(true); };
  const performCancel = async () => {
    const finalReason = reason === 'other' ? otherReason : reason;

    if (isDone || busy.current) return;
    busy.current = true;

    if (isPending) {
      // Direct cancel for Pending orders (cancelOrder handles single safe hold release)
      const ok = await cancelOrder(order.id, finalReason);
      if (!ok) { busy.current = false; return; }
    } else {
      // Request cancel for Confirmed orders (FR-C10, FR-M06)
      try { await requestCancelConfirmedOrder(order.id, order.shippingAddress.fullName, finalReason); }
      catch { showToast('Chưa gửi được yêu cầu', 'Vui lòng thử lại.', 'error'); busy.current = false; return; }
    }
    setIsDone(true); busy.current = false;
  };

  return (
    <><ConfirmModal isOpen={confirming} title={isPending ? 'Xác nhận hủy đơn hàng' : 'Xác nhận gửi yêu cầu hủy'} description="Vui lòng kiểm tra mã đơn và lý do trước khi xác nhận."
      onCancel={() => setConfirming(false)} onConfirm={async () => { setConfirming(false); await performCancel(); }} />
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-modal border border-surface-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-amber-50/70 border-b border-amber-200/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-charcoal-900 text-base leading-tight">
                {isPending ? 'Hủy Đơn Hàng' : 'Gửi Yêu Cầu Hủy Đơn'}
              </h3>
              <p className="text-[11px] text-charcoal-500">Mã đơn: <strong>{order.id}</strong></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-charcoal-400 hover:text-charcoal-700 rounded-lg hover:bg-stone-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isDone ? (
            <div className="text-center py-4 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h4 className="text-lg font-bold text-charcoal-900">
                {isPending ? 'Đơn Hàng Đã Được Hủy!' : 'Đã Gửi Yêu Cầu Hủy Đơn!'}
              </h4>
              <p className="text-xs text-charcoal-600 leading-relaxed">
                {isPending
                  ? 'Đơn hàng của bạn đã được hủy bỏ trực tiếp và hoàn trả lại số lượng tồn kho.'
                  : 'Đơn hàng đã được xác nhận nên chuyên viên cửa hàng sẽ xem xét duyệt hủy trong vòng 30 phút.'}
              </p>
              <button
                onClick={onClose}
                className="mt-2 px-6 py-2 bg-charcoal-900 text-white text-xs font-bold rounded-lg uppercase"
              >
                ĐÓNG
              </button>
            </div>
          ) : (
            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <p className="text-xs text-charcoal-600 leading-relaxed">
                {isPending
                  ? 'Đơn hàng đang ở trạng thái Chờ xác nhận, bạn có thể hủy ngay lập tức mà không mất phí.'
                  : 'Đơn hàng đã được hệ thống xác nhận chuẩn bị đóng gói. Yêu cầu hủy sẽ được Quản lý duyệt trước khi hoàn tiền.'}
              </p>

              <div>
                <label className="block text-xs font-bold text-charcoal-700 mb-1.5">
                  Vui lòng chọn lý do hủy đơn:
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:border-brand-700"
                >
                  <option value="Đổi ý không muốn mua nữa">Đổi ý không muốn mua nữa</option>
                  <option value="Muốn thay đổi địa chỉ hoặc số điện thoại">Muốn thay đổi địa chỉ hoặc số điện thoại</option>
                  <option value="Muốn đổi sang sản phẩm hoặc size khác">Muốn đổi sang sản phẩm hoặc size khác</option>
                  <option value="Tìm thấy giá rẻ hơn ở nơi khác">Tìm thấy giá rẻ hơn ở nơi khác</option>
                  <option value="Thời gian giao hàng dự kiến quá lâu">Thời gian giao hàng dự kiến quá lâu</option>
                  <option value="other">Lý do khác...</option>
                </select>
              </div>

              {reason === 'other' && (
                <div>
                  <label className="block text-xs font-bold text-charcoal-700 mb-1">
                    Chi tiết lý do khác:
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={otherReason}
                    onChange={(e) => setOtherReason(e.target.value)}
                    placeholder="Nhập lý do cụ thể..."
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none"
                  />
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-1/3 py-2.5 bg-stone-100 hover:bg-stone-200 text-charcoal-700 font-bold text-xs uppercase rounded-lg"
                >
                  GIỮ LẠI ĐƠN
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm"
                >
                  {isPending ? 'XÁC NHẬN HỦY NGAY' : 'GỬI YÊU CẦU HỦY'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div></>
  );
};
