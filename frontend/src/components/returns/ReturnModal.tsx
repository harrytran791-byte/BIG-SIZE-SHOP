import React, { useState, useRef } from 'react';
import { X, RotateCcw, AlertCircle, Upload, CheckCircle2, ShieldCheck, Trash2, Video, Image as ImageIcon, Plus } from 'lucide-react';
import { Order, CartItem, Size, ReturnReason } from '../../types';
import { useReturn } from '../../context/ReturnContext';
import { useToast } from '../../context/ToastContext';

interface ReturnModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
}

export const ReturnModal: React.FC<ReturnModalProps> = ({ order, isOpen, onClose }) => {
  const { createReturnRequest } = useReturn();
  const { showToast } = useToast();

  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(() =>
    order.items.length > 0 ? [order.items[0].id] : []
  );
  const [requestType, setRequestType] = useState<'exchange_size' | 'return_refund'>('exchange_size');
  const [requestedSize, setRequestedSize] = useState<Size>('3XL');
  const [reason, setReason] = useState<ReturnReason>('too_tight');
  const [reasonDetail, setReasonDetail] = useState('');
  const [proofImages, setProofImages] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const requestKey = useRef(crypto.randomUUID());
  const submitting = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdReturnId, setCreatedReturnId] = useState('');

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (proofImages.length + files.length > 8 || files.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 1000000)) {
        showToast('Ảnh chưa hợp lệ', 'Chọn tối đa 8 ảnh JPG, PNG hoặc WebP, mỗi ảnh tối đa 1 MB.', 'warning'); return;
      }
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setProofImages((prev) => [...prev, event.target!.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeProofImage = (index: number) => {
    setProofImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItemIds.length === 0) {
      showToast('Chưa chọn sản phẩm', 'Vui lòng chọn ít nhất 1 sản phẩm để đổi / trả', 'error');
      return;
    }

    if (proofImages.length < 2) {
      showToast('Thiếu ảnh minh chứng', 'Vui lòng đính kèm tối thiểu 2 hình ảnh chụp tem mác / phom dáng sản phẩm.', 'warning');
      return;
    }

    const selectedItems = order.items.filter((it) => selectedItemIds.includes(it.id));
    const firstItem = selectedItems[0];
    const totalRefund = selectedItems.reduce((sum, it) => sum + it.price * it.quantity, 0);

    if (submitting.current) return;
    submitting.current = true; setIsSubmitting(true);
    try {
    const returnId = await createReturnRequest({
      orderId: order.id,
      customerName: order.shippingAddress.fullName,
      customerPhone: order.shippingAddress.phone,
      type: requestType,
      productId: firstItem.productId,
      productName: selectedItems.length > 1 ? `${firstItem.product.name} (+${selectedItems.length - 1} món khác)` : firstItem.product.name,
      productImage: firstItem.product.images[0],
      currentSize: firstItem.size,
      requestedSize: requestType === 'exchange_size' ? requestedSize : undefined,
      items: selectedItems.map((it) => ({
        orderItemId: it.orderItemId || Number(it.id.replace(/^ct_/, '')),
        sku: it.sku,
        productId: it.productId,
        productName: it.product.name,
        productImage: it.product.images[0],
        currentSize: it.size,
        requestedSize: requestType === 'exchange_size' ? requestedSize : undefined,
        quantity: it.quantity,
        price: it.price,
        reason,
        reasonDetail: reasonDetail || (reason === 'too_tight' ? 'Mặc bị chật bụng khi mặc' : 'Không vừa vặn')
      })),
      reason,
      reasonDetail: reasonDetail || (reason === 'too_tight' ? 'Mặc bị chật bụng khi mặc' : 'Không vừa vặn'),
      images: proofImages,
      videoUrl: videoUrl.trim() || undefined,
      refundAmount: requestType === 'return_refund' ? totalRefund : undefined
    }, requestKey.current);

    setCreatedReturnId(returnId);
    setIsSuccess(true);
    showToast('Tạo yêu cầu hậu mãi thành công!', `Mã yêu cầu: ${returnId} (${selectedItems.length} sản phẩm)`, 'success');
    } catch { showToast('Chưa gửi được yêu cầu', 'Vui lòng kiểm tra thông tin và thử lại.', 'error'); }
    finally { submitting.current = false; setIsSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-modal border border-surface-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-surface-cream border-b border-surface-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-700 text-white flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-charcoal-900 text-base leading-tight">
                Yêu Cầu Hậu Mãi & Đổi/Trả Hàng
              </h3>
              <p className="text-[11px] text-charcoal-500">
                Đơn hàng: <strong>{order.id}</strong> • Chính sách đổi size tận nhà miễn phí 7 ngày
              </p>
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
        <div className="p-6 overflow-y-auto flex-1">
          {isSuccess ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-scaleIn">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-xl font-bold text-charcoal-900">
                Đã Tiếp Nhận Yêu Cầu!
              </h4>
              <p className="text-xs text-charcoal-600 max-w-sm mx-auto leading-relaxed">
                Mã yêu cầu của bạn là <strong className="text-brand-700 font-mono text-sm">{createdReturnId}</strong>. 
                Chuyên viên Curve & Confidence sẽ liên hệ duyệt trong 2 giờ làm việc và shipper sẽ đến đổi tận nơi miễn phí.
              </p>
              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs uppercase tracking-wider rounded-lg"
                >
                  ĐÓNG VÀ THEO DÕI
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Step 1: Select items to return */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-charcoal-700">
                    1. Chọn sản phẩm cần đổi / trả (Có thể chọn nhiều món):
                  </label>
                  {order.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedItemIds.length === order.items.length) {
                          setSelectedItemIds([order.items[0].id]);
                        } else {
                          setSelectedItemIds(order.items.map((i) => i.id));
                        }
                      }}
                      className="text-[11px] font-bold text-brand-700 hover:underline cursor-pointer"
                    >
                      {selectedItemIds.length === order.items.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {order.items.map((item) => {
                    const isChecked = selectedItemIds.includes(item.id);
                    return (
                      <label
                        key={item.id}
                        className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          isChecked
                            ? 'border-brand-700 bg-brand-50/50 ring-1 ring-brand-700'
                            : 'border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              if (selectedItemIds.length > 1) {
                                setSelectedItemIds((prev) => prev.filter((id) => id !== item.id));
                              } else {
                                showToast('Thông báo', 'Cần giữ lại ít nhất 1 sản phẩm để đổi trả', 'info');
                              }
                            } else {
                              setSelectedItemIds((prev) => [...prev, item.id]);
                            }
                          }}
                          className="w-4 h-4 rounded text-brand-700 focus:ring-brand-700 cursor-pointer"
                        />
                        <img
                          src={item.product.images[0]}
                          alt={item.product.name}
                          className="w-10 h-10 object-cover rounded-lg shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-charcoal-900 truncate">{item.product.name}</p>
                          <p className="text-[11px] text-charcoal-500">
                            Size hiện tại: <span className="font-bold text-brand-700">{item.size}</span> • SL: {item.quantity}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-charcoal-800">
                          {(item.price * item.quantity).toLocaleString('vi-VN')}₫
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Choose action type */}
              <div>
                <label className="block text-xs font-bold text-charcoal-700 mb-1.5">
                  2. Bạn muốn đổi size hay trả hàng hoàn tiền?
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setRequestType('exchange_size')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      requestType === 'exchange_size'
                        ? 'border-brand-700 bg-brand-50/60 ring-1 ring-brand-700'
                        : 'border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    <p className="text-xs font-bold text-brand-900">Đổi sang size khác</p>
                    <p className="text-[10px] text-charcoal-500 mt-0.5">Miễn phí ship đổi 2 chiều</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestType('return_refund')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      requestType === 'return_refund'
                        ? 'border-brand-700 bg-brand-50/60 ring-1 ring-brand-700'
                        : 'border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    <p className="text-xs font-bold text-brand-900">Trả hàng & Hoàn tiền</p>
                    <p className="text-[10px] text-charcoal-500 mt-0.5">Hoàn tiền 100% trong 24h</p>
                  </button>
                </div>
              </div>

              {/* Step 3: If exchange size, select target size */}
              {requestType === 'exchange_size' && (
                <div>
                  <label className="block text-xs font-bold text-charcoal-700 mb-1.5">
                    Size bạn muốn đổi sang:
                  </label>
                  <div className="flex gap-2">
                    {(['XL', '2XL', '3XL', '4XL', '5XL'] as Size[]).map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setRequestedSize(sz)}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                          requestedSize === sz
                            ? 'bg-brand-700 text-white border-brand-700'
                            : 'bg-white text-charcoal-700 border-stone-300 hover:border-brand-600'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 4: Reason & Note */}
              <div>
                <label className="block text-xs font-bold text-charcoal-700 mb-1.5">
                  Lý do đổi / trả:
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as ReturnReason)}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:border-brand-700"
                >
                  <option value="too_tight">Hơi kích / chật bụng khi ngồi</option>
                  <option value="too_loose">Hơi rộng thùng thình so với mong muốn</option>
                  <option value="wrong_item">Giao nhầm size hoặc nhầm màu</option>
                  <option value="defective">Lỗi kỹ thuật / Lỗi đường may</option>
                  <option value="other">Lý do khác</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-charcoal-700 mb-1.5">
                  Ghi chú chi tiết cho chuyên viên:
                </label>
                <textarea
                  rows={2}
                  value={reasonDetail}
                  onChange={(e) => setReasonDetail(e.target.value)}
                  placeholder="Ví dụ: Vòng bụng của tôi 102cm mặc size 2XL hơi căng, nhờ shop hỗ trợ đổi lên 3XL nhé..."
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:border-brand-700"
                />
              </div>

              {/* Hình ảnh minh chứng (Bắt buộc tối thiểu 2 ảnh) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-charcoal-700">
                    Hình ảnh minh chứng thực tế <span className="text-rose-500">* (Tối thiểu 2 ảnh)</span>:
                  </label>
                  <span className="text-[11px] font-semibold text-brand-700">
                    Đã tải: {proofImages.length} ảnh
                  </span>
                </div>
                <p className="text-[10.5px] text-stone-500 mb-2">
                  Vui lòng chụp rõ tem mác sản phẩm và góc mặc thực tế để chuyên viên xét duyệt nhanh.
                </p>

                <div className="grid grid-cols-4 gap-2 mb-2">
                  {proofImages.map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg border border-stone-200 overflow-hidden group bg-stone-100">
                      <img src={img} alt={`Minh chứng ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeProofImage(idx)}
                        className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-rose-600 text-white rounded-md transition-colors"
                        title="Xóa ảnh"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1 py-0.5 rounded font-mono">
                        Ảnh {idx + 1}
                      </span>
                    </div>
                  ))}

                  <label className="aspect-square rounded-lg border-2 border-dashed border-stone-300 hover:border-brand-500 bg-stone-50 hover:bg-brand-50/30 flex flex-col items-center justify-center cursor-pointer transition-colors text-stone-500 hover:text-brand-700">
                    <Upload className="w-5 h-5 mb-1" />
                    <span className="text-[10px] font-bold text-center px-1">+ Thêm ảnh</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Video minh chứng (Tùy chọn - Optional) */}
              <div>
                <label className="block text-xs font-bold text-charcoal-700 mb-1">
                  Video minh chứng (Tùy chọn / Optional):
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="Dán liên kết video unbox / quay lỗi (Google Drive, YouTube, Cloud...)"
                    className="w-full pl-8 pr-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:border-brand-700"
                  />
                  <Video className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Trust Badge */}
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex items-center gap-2 text-[11px] text-charcoal-600">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Cam kết bảo hành phom dáng: Đổi size tận nơi, kiểm tra hàng trước khi nhận.</span>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-1/3 py-2.5 bg-stone-100 hover:bg-stone-200 text-charcoal-700 font-bold text-xs uppercase tracking-wider rounded-lg"
                >
                  HỦY BỎ
                </button>
                <button
                  type="submit" disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm"
                >
                  GỬI YÊU CẦU ĐỔI / TRẢ
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
