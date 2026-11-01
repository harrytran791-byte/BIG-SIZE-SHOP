import React, { useState } from 'react';
import {
  X,
  RotateCcw,
  ArrowRight,
  Eye,
  CheckCircle2,
  XCircle,
  Phone,
  Package,
  Calendar,
  FileText,
  Sparkles,
  Truck,
  ShieldCheck,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ExternalLink
} from 'lucide-react';
import { ReturnRequest } from '@/shared/types';

interface ReturnDetailModalProps {
  isOpen: boolean;
  request: ReturnRequest | null;
  onClose: () => void;
  onApprove: (request: ReturnRequest, note: string) => void;
  onReject: (request: ReturnRequest, note: string) => void;
}

export const ReturnDetailModal: React.FC<ReturnDetailModalProps> = ({
  isOpen,
  request,
  onClose,
  onApprove,
  onReject
}) => {
  const [adminNote, setAdminNote] = useState('');
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  // Keyboard navigation for image inspection lightbox
  React.useEffect(() => {
    if (activeImageIndex === null || !request?.images) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveImageIndex(null);
        setZoomScale(1);
        setRotation(0);
      } else if (e.key === 'ArrowLeft') {
        setActiveImageIndex((prev) => (prev !== null ? (prev - 1 + request.images.length) % request.images.length : null));
        setZoomScale(1);
        setRotation(0);
      } else if (e.key === 'ArrowRight') {
        setActiveImageIndex((prev) => (prev !== null ? (prev + 1) % request.images.length : null));
        setZoomScale(1);
        setRotation(0);
      } else if (e.key === '+' || e.key === '=') {
        setZoomScale((s) => Math.min(s + 0.25, 3));
      } else if (e.key === '-') {
        setZoomScale((s) => Math.max(s - 0.25, 0.5));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeImageIndex, request?.images]);

  if (!isOpen || !request) return null;

  const handleActionSubmit = (status: 'approved' | 'rejected') => {
    if (status === 'approved') {
      onApprove(request, adminNote || request.adminNote || 'Chuyên viên đã duyệt đổi size cho khách hàng.');
    } else {
      onReject(request, adminNote || request.adminNote || 'Từ chối yêu cầu đổi/trả.');
    }
  };

  const formatReasonText = (reason: string) => {
    switch (reason) {
      case 'too_tight':
        return 'Chật kích thước (vòng 1 / bụng / mông)';
      case 'too_loose':
        return 'Rộng so với số đo';
      case 'wrong_item':
        return 'Giao nhầm size hoặc mẫu';
      case 'defective':
        return 'Lỗi chất liệu / đường chỉ';
      default:
        return 'Lý do khác';
    }
  };

  return (
    <>

      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-900/40 backdrop-blur-md animate-fadeIn"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden max-h-[88vh] my-auto flex flex-col animate-scaleIn"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50/80 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-charcoal-900">
                    Chi Tiết Yêu Cầu Hậu Mãi & Đổi Size
                  </h3>
                  <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                    {request.id}
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-0.5 flex items-center gap-2">
                  <span>Mã đơn: <strong className="text-stone-700 font-mono">{request.orderId}</strong></span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {request.createdAt}
                  </span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs text-stone-700">
            {/* Status & Service Type Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80">
              <div className="flex items-center gap-2">
                <span className="text-stone-500 font-medium">Loại dịch vụ:</span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  request.type === 'exchange_size'
                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                }`}>
                  <RotateCcw className="w-3.5 h-3.5" />
                  {request.type === 'exchange_size' ? 'Đổi Size Tận Nhà Miễn Phí (7 ngày)' : 'Trả Hàng Hoàn Tiền'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-stone-500 font-medium">Trạng thái:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  request.status === 'pending_review'
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : request.status === 'approved'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : request.status === 'received_goods'
                    ? 'bg-sky-100 text-sky-800 border border-sky-200'
                    : request.status === 'exchange_sent'
                    ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                    : request.status === 'rejected'
                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                    : 'bg-purple-100 text-purple-800 border border-purple-200'
                }`}>
                  {request.status === 'pending_review'
                    ? '⏳ Chờ quản lý duyệt'
                    : request.status === 'approved'
                    ? '✓ Đã duyệt (Chờ nhận hàng cũ)'
                    : request.status === 'received_goods'
                    ? '📦 Đã nhận hàng cũ'
                    : request.status === 'exchange_sent'
                    ? '🚚 Đang giao hàng đổi mới'
                    : request.status === 'rejected'
                    ? '✕ Đã từ chối'
                    : '✓ Hoàn tất'}
                </span>
              </div>
            </div>

            {/* Customer Info Section */}
            <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-2">
              <h4 className="font-bold text-stone-900 text-xs flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                Thông Tin Khách Hàng Yêu Cầu
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-stone-400 block text-[11px]">Họ tên khách hàng</span>
                  <span className="font-bold text-charcoal-900 text-sm">{request.customerName}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[11px]">Số điện thoại liên hệ</span>
                  <a
                    href={`tel:${request.customerPhone}`}
                    className="font-mono font-bold text-purple-700 hover:text-purple-900 inline-flex items-center gap-1.5 mt-0.5"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {request.customerPhone}
                  </a>
                </div>
              </div>
            </div>

            {/* Product & Size Change Specs */}
            <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-3">
              <h4 className="font-bold text-stone-900 text-xs flex items-center gap-2">
                <Package className="w-4 h-4 text-purple-600" />
                Sản Phẩm & Kích Thước Cần Đổi
              </h4>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3 bg-stone-50/80 rounded-xl border border-stone-200/60">
                {request.productImage && <img src={request.productImage} alt={request.productName} className="w-16 h-16 rounded-xl object-cover" />}
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-[10px] text-stone-400 font-semibold block">
                    MÃ SP: {request.productId}
                  </span>
                  <h5 className="font-bold text-charcoal-900 text-sm truncate">
                    {request.productName}
                  </h5>
                  <p className="text-stone-500 text-[11px] mt-0.5">
                    Hỗ trợ kiểm tra đổi hàng theo chính sách phom chuẩn Big Size
                  </p>
                </div>
              </div>

      {request.items && request.items.length > 1 && <div className="bg-white border rounded-xl p-3 max-h-40 overflow-auto text-xs space-y-2">
        <strong>Sản phẩm trong yêu cầu</strong>{request.items.map((item, index) => <p key={item.orderItemId || index}>{item.productName} · {item.quantity} sản phẩm · {item.currentSize || 'Chưa có kích cỡ'}{item.requestedSize ? ` → ${item.requestedSize}` : ''}</p>)}
      </div>}

              {/* Size Transformation Box */}
              <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-200/80 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-stone-500 block mb-1">Kích cỡ hiện tại</span>
                  <span className="font-mono font-bold text-stone-800 text-base px-3 py-1 bg-white rounded-lg border border-stone-200 shadow-2xs">
                    {request.currentSize}
                  </span>
                </div>

                <div className="flex flex-col items-center px-4">
                  <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider mb-1">
                    Đổi sang size
                  </span>
                  <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-xs">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-purple-700 font-semibold block mb-1">Kích cỡ mong muốn</span>
                  <span className="font-mono font-black text-purple-700 text-base px-3 py-1 bg-white rounded-lg border border-purple-300 shadow-2xs">
                    {request.requestedSize || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Reasons & Notes */}
            <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-2">
              <h4 className="font-bold text-stone-900 text-xs flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" />
                Lý Do Khách Hàng Yêu Cầu Đổi / Trả
              </h4>
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-stone-500 font-semibold">Phân loại:</span>
                  <span className="px-2 py-0.5 bg-stone-200 text-stone-800 rounded font-semibold text-[11px]">
                    {formatReasonText(request.reason)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-stone-500 font-semibold block">Mô tả chi tiết:</span>
                  <p className="text-charcoal-800 font-medium text-xs mt-0.5 leading-relaxed bg-white p-2.5 rounded-lg border border-stone-200">
                    "{request.reasonDetail || 'Không có mô tả chi tiết'}"
                  </p>
                </div>
              </div>
            </div>

            {/* Customer Proof Images (Minh chứng) */}
            <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-stone-900 text-xs flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  Hình Ảnh Minh Chứng Thực Tế ({request.images?.length || 0})
                </h4>
                <span className="text-[10px] text-stone-400">Click vào ảnh để phóng to kiểm tra tem mác</span>
              </div>

              {request.images && request.images.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  {request.images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIndex(idx);
                        setZoomScale(1);
                        setRotation(0);
                      }}
                      className="group relative aspect-square rounded-xl overflow-hidden border-2 border-stone-200 hover:border-purple-600 transition-all shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <img
                        src={img}
                        alt={`Minh chứng ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-charcoal-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1 pointer-events-none">
                        <Eye className="w-6 h-6 drop-shadow-md" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Soi chi tiết ({idx + 1}/{request.images.length})</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-stone-400 text-xs italic py-2">Khách hàng không đính kèm hình ảnh minh chứng.</p>
              )}
            </div>

            {/* Admin Note / Review Log if existed */}
            {request.adminNote && (
              <div className="p-4 rounded-2xl bg-purple-50/40 border border-purple-200/80 space-y-1">
                <span className="text-[11px] font-bold text-purple-900 block flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                  Ghi chú từ Chuyên viên CSKH / Quản lý:
                </span>
                <p className="text-xs text-stone-700 italic font-medium">
                  {request.adminNote}
                </p>
                {request.newTrackingCode && (
                  <p className="text-[11px] text-purple-800 font-bold mt-1 flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5" /> Mã vận đơn kiện đổi: <span className="font-mono bg-white px-2 py-0.5 rounded border border-purple-200">{request.newTrackingCode}</span>
                  </p>
                )}
              </div>
            )}

            {/* Action Box if Pending Review */}
            {request.status === 'pending_review' && (
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/90 space-y-3">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-700" />
                  Xét Duyệt Yêu Cầu Hậu Mãi
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    Ghi chú xử lý / Hướng dẫn shipper (Tùy chọn):
                  </label>
                  <input
                    type="text"
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="VD: Đã liên hệ khách, đổi sang size 3XL qua GHTK thu hồi hàng cũ..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-stone-100 bg-stone-50/80 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Đóng
            </button>

            {request.status === 'pending_review' ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleActionSubmit('rejected')}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  Từ Chối Yêu Cầu
                </button>
                <button
                  type="button"
                  onClick={() => handleActionSubmit('approved')}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Phê Duyệt Đổi Size
                </button>
              </div>
            ) : (
              <span className="text-xs text-stone-500 font-medium italic">
                {request.status === 'approved'
                  ? 'Đã duyệt yêu cầu — Đang chờ bưu tá nhận kiện hàng cũ từ khách'
                  : request.status === 'received_goods'
                  ? 'Đã nhận kiện hàng cũ — Sẵn sàng xuất kho gửi size mới hoặc hoàn tiền'
                  : request.status === 'exchange_sent'
                  ? `Đã xuất kho gửi size mới (Mã vận đơn: ${request.newTrackingCode || 'Đang cập nhật'})`
                  : request.status === 'rejected'
                  ? 'Yêu cầu đã bị từ chối'
                  : 'Yêu cầu hậu mãi đã hoàn tất'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Studio-Grade Evidence Inspection Lightbox */}
      {activeImageIndex !== null && request.images && request.images[activeImageIndex] && (
        <div
          className="fixed inset-0 flex flex-col items-center justify-between p-4 sm:p-6 bg-stone-950/90 backdrop-blur-md animate-fadeIn select-none"
          style={{ zIndex: 9999 }}
          onClick={() => {
            setActiveImageIndex(null);
            setZoomScale(1);
            setRotation(0);
          }}
        >
          {/* Top Control Bar */}
          <div
            className="w-full max-w-5xl flex items-center justify-between px-4 py-2.5 bg-stone-900/95 backdrop-blur-sm rounded-2xl border border-white/10 text-white shadow-xl shrink-0 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left: Info */}
            <div className="flex items-center gap-2.5">
              <span className="px-2 py-0.5 rounded-md text-[10.5px] font-mono font-bold bg-[#5C1D24] text-white">
                {request.id}
              </span>
              <span className="text-xs font-bold text-stone-200 hidden sm:inline">
                Đơn {request.orderId}
              </span>
              <span className="text-stone-500 hidden sm:inline">•</span>
              <span className="text-xs font-medium text-emerald-400">
                Ảnh minh chứng {activeImageIndex + 1} / {request.images.length}
              </span>
            </div>

            {/* Center: Zoom & Rotate Toolbar */}
            <div className="flex items-center gap-1.5 bg-white/10 px-2 py-1 rounded-xl border border-white/5">
              <button
                type="button"
                onClick={() => setZoomScale((s) => Math.max(s - 0.25, 0.5))}
                className="p-1 hover:bg-white/20 rounded-lg text-stone-200 transition-colors cursor-pointer"
                title="Thu nhỏ (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoomScale(1);
                  setRotation(0);
                }}
                className="px-2 py-0.5 text-xs font-mono font-bold text-stone-200 hover:text-white transition-colors cursor-pointer"
                title="Đặt lại 100%"
              >
                {Math.round(zoomScale * 100)}%
              </button>
              <button
                type="button"
                onClick={() => setZoomScale((s) => Math.min(s + 0.25, 3))}
                className="p-1 hover:bg-white/20 rounded-lg text-stone-200 transition-colors cursor-pointer"
                title="Phóng to (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <span className="w-px h-3.5 bg-white/20 mx-0.5" />
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="p-1 hover:bg-white/20 rounded-lg text-stone-200 transition-colors cursor-pointer flex items-center gap-1"
                title="Xoay 90°"
              >
                <RotateCw className="w-4 h-4" />
                <span className="text-[10px] hidden md:inline">Xoay</span>
              </button>
            </div>

            {/* Right: External Link & Close */}
            <div className="flex items-center gap-1.5">
              <a
                href={request.images[activeImageIndex]}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-stone-200 transition-colors cursor-pointer flex items-center gap-1 text-xs"
                title="Mở ảnh gốc trong tab mới"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="text-[11px] hidden md:inline">Mở gốc</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  setActiveImageIndex(null);
                  setZoomScale(1);
                  setRotation(0);
                }}
                className="p-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                title="Đóng (ESC)"
              >
                <X className="w-4 h-4" />
                <span className="text-[10px] font-bold font-mono hidden sm:inline">ESC</span>
              </button>
            </div>
          </div>

          {/* Middle: Main Image Canvas with Navigation Arrows */}
          <div
            className="relative w-full max-w-5xl flex-1 flex items-center justify-center my-3 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Prev Arrow */}
            {request.images.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  setActiveImageIndex((prev) => (prev !== null ? (prev - 1 + request.images.length) % request.images.length : null));
                  setZoomScale(1);
                  setRotation(0);
                }}
                className="absolute left-2 sm:left-4 z-20 w-11 h-11 rounded-full bg-stone-900/80 hover:bg-[#5C1D24] text-white border border-white/20 flex items-center justify-center transition-all shadow-xl cursor-pointer hover:scale-105"
                title="Ảnh trước đó (←)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Image viewport */}
            <div className="w-full h-full flex items-center justify-center overflow-auto p-2">
              <img
                src={request.images[activeImageIndex]}
                alt={`Minh chứng ${activeImageIndex + 1}`}
                style={{
                  transform: `scale(${zoomScale}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)'
                }}
                className="max-w-full max-h-[68vh] object-contain rounded-2xl shadow-2xl cursor-grab active:cursor-grabbing border border-white/10"
              />
            </div>

            {/* Next Arrow */}
            {request.images.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  setActiveImageIndex((prev) => (prev !== null ? (prev + 1) % request.images.length : null));
                  setZoomScale(1);
                  setRotation(0);
                }}
                className="absolute right-2 sm:right-4 z-20 w-11 h-11 rounded-full bg-stone-900/80 hover:bg-[#5C1D24] text-white border border-white/20 flex items-center justify-center transition-all shadow-xl cursor-pointer hover:scale-105"
                title="Ảnh kế tiếp (→)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Bottom Filmstrip Carousel */}
          <div
            className="w-full max-w-3xl flex flex-col items-center gap-2 shrink-0 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {request.images.length > 1 && (
              <div className="flex items-center gap-2 p-1.5 bg-stone-900/90 backdrop-blur-sm rounded-2xl border border-white/10 shadow-xl overflow-x-auto max-w-full">
                {request.images.map((img, idx) => {
                  const isActive = idx === activeImageIndex;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setActiveImageIndex(idx);
                        setZoomScale(1);
                        setRotation(0);
                      }}
                      className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                        isActive
                          ? 'border-emerald-400 ring-2 ring-emerald-400/50 scale-105'
                          : 'border-white/20 opacity-60 hover:opacity-100 hover:border-white/40'
                      }`}
                    >
                      <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                      <span className="absolute bottom-0.5 right-0.5 px-1 bg-black/70 text-white rounded text-[9px] font-mono font-bold">
                        #{idx + 1}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            <p className="text-[11px] text-stone-400 text-center">
              💡 Chuyên viên dùng chuột hoặc phím mũi tên <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-stone-300 font-mono text-[10px]">←</kbd> <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-stone-300 font-mono text-[10px]">→</kbd> để chuyển ảnh, phóng to hoặc xoay để kiểm tra tem mác.
            </p>
          </div>
        </div>
      )}
    </>
  );
};
