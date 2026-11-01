import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  Compass,
  Truck,
  Clock,
  CreditCard,
  AlertCircle,
  RotateCcw,
  Mail,
  QrCode,
  X,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { useOrder } from '@/context/OrderContext';
import { useToast } from '@/shared/context/ToastContext';
import { vnpayService, type VNPayVerifyResult } from '@/shared/services/vnpayService';
import { emailService } from '@/shared/services/emailService';
import { PAYMENT_CONFIG } from '@/shared/config/paymentConfig';
import { PaymentStatus } from '@/types';

interface OrderSuccessPageProps {
  orderId: string;
  onNavigate: (path: string) => void;
}

export const OrderSuccessPage: React.FC<OrderSuccessPageProps> = ({ orderId, onNavigate }) => {
  const { showToast } = useToast();
  const {
    getOrderById,
    orders,
    updatePaymentStatus,
    switchToCod,
    refreshOrders,
  } = useOrder();
  const order = React.useMemo(() => getOrderById(orderId), [orderId, orders, getOrderById]);

  const initialSearchRef = useRef<string>(window.location.search);
  const hasVnpayCallbackParams = React.useMemo(() => {
    const params = new URLSearchParams(initialSearchRef.current);
    return (
      params.has('vnp_ResponseCode') ||
      params.has('vnp_TransactionStatus') ||
      params.has('vnp_SecureHash')
    );
  }, []);

  const [vnpayResult, setVnpayResult] = useState<VNPayVerifyResult | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(hasVnpayCallbackParams);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [isAlternativeModalOpen, setIsAlternativeModalOpen] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [customEmail, setCustomEmail] = useState('');
  const [isEditingEmail, setIsEditingEmail] = useState(false);

  useEffect(() => {
    if (!isAlternativeModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsAlternativeModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAlternativeModalOpen]);

  // 1. Xác minh callback từ cổng VNPay trên Backend (/api/vnpay)
  useEffect(() => {
    let cancelled = false;
    if (!hasVnpayCallbackParams) return;

    setIsVerifying(true);
    vnpayService
      .verifyCallback(initialSearchRef.current, orderId)
      .then(async (res) => {
        if (cancelled) return;
        setVnpayResult(res);

        // Xóa query parameters khỏi thanh địa chỉ sau khi Backend đã đối soát xong
        if (window.location.search) {
          window.history.replaceState(null, '', `/order-success/${orderId}`);
        }

        const resolvedStatus: PaymentStatus =
          res.paymentStatus ||
          (res.isValid && res.isSuccess
            ? 'paid'
            : res.isCancelled
            ? 'cancelled'
            : 'failed');

        await updatePaymentStatus(orderId, resolvedStatus);
        if (refreshOrders) {
          await refreshOrders();
        }
      })
      .catch((err) => {
        console.warn('⚠️ Lỗi xác minh callback VNPay:', err);
        if (!cancelled) {
          setVnpayResult({
            isValid: false,
            isSuccess: false,
            paymentStatus: 'failed',
            message: 'Không thể xác minh chữ ký giao dịch VNPay với máy chủ.',
          });
        }
      })
      .finally(() => {
        if (!cancelled) setIsVerifying(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orderId, hasVnpayCallbackParams]);

  // 2. Nếu truy cập trang đơn hàng VNPay mà KHÔNG có query callback (ví dụ đóng trình duyệt giữa chừng hoặc tải lại trang)
  // -> Đồng bộ trạng thái thực tế từ Backend & kiểm tra hạn giữ hàng 15 phút
  const syncedPendingRef = useRef<string | null>(null);
  useEffect(() => {
    if (hasVnpayCallbackParams) return;
    if (!order || order.paymentMethod === 'cod') return;
    if (syncedPendingRef.current === `${order.id}_${order.paymentStatus}`) return;
    syncedPendingRef.current = `${order.id}_${order.paymentStatus}`;

    let cancelled = false;
    vnpayService
      .syncPendingOrder(order.id)
      .then(async (syncRes) => {
        if (cancelled || !syncRes.success) return;
        if (
          syncRes.expired ||
          (syncRes.paymentStatus && syncRes.paymentStatus !== order.paymentStatus)
        ) {
          if (refreshOrders) {
            await refreshOrders();
          }
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [hasVnpayCallbackParams, order?.id, order?.paymentMethod, order?.paymentStatus, refreshOrders]);

  const isVnpayOrder = Boolean(
    hasVnpayCallbackParams || (order && order.paymentMethod !== 'cod')
  );

  const effectivePaymentStatus: PaymentStatus = React.useMemo(() => {
    if (vnpayResult) {
      if (vnpayResult.isValid && vnpayResult.isSuccess) return 'paid';
      if (vnpayResult.isCancelled || vnpayResult.paymentStatus === 'cancelled') return 'cancelled';
      return 'failed';
    }
    if (order) {
      return order.paymentStatus;
    }
    return 'pending';
  }, [vnpayResult, order]);

  const isConfirmedSuccess = Boolean(
    !isVerifying &&
      order &&
      (isVnpayOrder
        ? effectivePaymentStatus === 'paid' && order.status !== 'cancelled'
        : order.status !== 'cancelled')
  );

  const isCancelledPayment = Boolean(
    !isVerifying &&
      isVnpayOrder &&
      (effectivePaymentStatus === 'cancelled' || vnpayResult?.isCancelled)
  );

  const isFailedPayment = Boolean(
    !isVerifying &&
      isVnpayOrder &&
      (effectivePaymentStatus === 'failed' ||
        (vnpayResult !== null && !vnpayResult.isSuccess && !vnpayResult.isCancelled))
  );

  const isPendingUnconfirmed = Boolean(
    !isVerifying &&
      isVnpayOrder &&
      effectivePaymentStatus === 'pending' &&
      !isCancelledPayment &&
      !isFailedPayment
  );

  // 3. Khóa nút Back về trang sản phẩm khi đơn hàng thực sự thành công
  useEffect(() => {
    if (!isConfirmedSuccess || !order) return;

    window.history.pushState({ page: 'order-success-lock' }, '', window.location.href);
    const handlePopState = () => {
      const firstItem = order.items && order.items[0];
      const targetUrl = firstItem?.productId ? `/product/${firstItem.productId}` : '/products';
      onNavigate(targetUrl);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isConfirmedSuccess, order, onNavigate]);

  // 4. Chỉ bắn pháo giấy và gửi email hóa đơn khi đơn hàng ĐÃ XÁC NHẬN HỢP LỆ (COD hoặc VNPay Đã thanh toán)
  useEffect(() => {
    if (!isConfirmedSuccess || !order) return;

    try {
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.5 },
      });
    } catch {}

    const sentKey = `curve_invoice_sent_${order.id}`;
    const isSent = localStorage.getItem(sentKey);
    const targetEmail = (order.invoiceEmail || order.shippingAddress?.email || '').trim();
    if (!isSent && targetEmail && targetEmail.includes('@')) {
      emailService
        .sendOrderInvoice(
          { ...order, paymentStatus: isVnpayOrder ? 'paid' : order.paymentStatus },
          targetEmail,
          order.shippingAddress?.fullName
        )
        .then((res) => {
          if (res.success) {
            localStorage.setItem(sentKey, 'true');
            setResendStatus('sent');
          }
        })
        .catch((err) => {
          console.warn('⚠️ Lỗi gửi hóa đơn điện tử:', err);
        });
    } else if (isSent) {
      setResendStatus('sent');
    }
  }, [isConfirmedSuccess, isVnpayOrder, order]);

  const handleResendInvoice = async () => {
    if (!order || !isConfirmedSuccess) return;
    const targetEmail = (customEmail || order.invoiceEmail || order.shippingAddress?.email || '').trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      showToast('Email không hợp lệ', 'Vui lòng nhập đúng định dạng email nhận hóa đơn.', 'error');
      return;
    }

    setResendStatus('sending');
    try {
      const res = await emailService.sendOrderInvoice(
        order,
        targetEmail,
        order.shippingAddress?.fullName,
        true
      );
      if (res.success) {
        localStorage.setItem(`curve_invoice_sent_${order.id}`, 'true');
        setResendStatus('sent');
        setIsEditingEmail(false);
        showToast('Đã gửi hóa đơn điện tử', `Hóa đơn đã được gửi tới ${targetEmail}`, 'success');
      } else {
        setResendStatus('error');
        showToast('Lỗi gửi mail', res.error || 'Máy chủ bận, vui lòng thử lại sau giây lát.', 'error');
      }
    } catch {
      setResendStatus('error');
      showToast('Lỗi kết nối', 'Không thể kết nối đến máy chủ gửi email.', 'error');
    }
  };

  const handleContinueVNPay = async () => {
    if (!order) return;
    setIsActionLoading(true);
    try {
      const res = await vnpayService.createPaymentUrl(
        order.id,
        order.total,
        `Thanh toan don hang ${order.id} tai Curve and Confidence`,
        `${window.location.origin}/order-success/${order.id}`,
        true
      );
      if (res.success && res.paymentUrl) {
        window.location.href = res.paymentUrl;
      } else {
        showToast('Không thể khởi tạo lại VNPay', res.errorMessage || 'Đơn hàng đã hết hạn hoặc đã hủy.', 'error');
        if (refreshOrders) await refreshOrders();
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCancelPendingVNPay = async () => {
    const targetId = order ? order.id : orderId;
    setIsActionLoading(true);
    try {
      const res = await vnpayService.cancelPendingPayment(
        targetId,
        'Khách hàng chủ động hủy thanh toán VNPay'
      );
      if (res.success) {
        await updatePaymentStatus(targetId, 'cancelled');
        if (refreshOrders) await refreshOrders();
        showToast(
          'Đã hủy thanh toán VNPay',
          `Đơn hàng #${targetId} đã chuyển sang Đã hủy thanh toán và giải phóng tồn kho tạm giữ.`,
          'info'
        );
      } else {
        showToast('Không thể hủy giao dịch', res.message || 'Vui lòng thử lại.', 'error');
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReconcilePending = async () => {
    const targetId = order ? order.id : orderId;
    setIsActionLoading(true);
    try {
      const res = await vnpayService.syncPendingOrder(targetId);
      if (refreshOrders) await refreshOrders();
      if (res.paymentStatus === 'paid') {
        showToast('Đã xác nhận thanh toán!', `Đơn hàng #${targetId} đã được ghi nhận Đã thanh toán.`, 'success');
      } else if (res.expired || res.paymentStatus === 'cancelled') {
        showToast('Đơn hàng đã hủy', `Đơn hàng #${targetId} đã hết hạn giữ hàng và giải phóng tồn kho.`, 'info');
      } else {
        showToast('Chưa nhận được xác nhận từ VNPay', 'Đơn hàng vẫn đang ở trạng thái Chờ thanh toán.', 'info');
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSwitchToCod = () => {
    switchToCod(orderId);
    setIsAlternativeModalOpen(false);
    window.history.replaceState(null, '', `/order-success/${orderId}`);
    onNavigate(`/order-success/${orderId}`);
  };

  const renderPaymentStatusBadge = () => {
    if (isVerifying) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
          Đang xác minh VNPay...
        </span>
      );
    }
    if (effectivePaymentStatus === 'paid') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          Đã thanh toán
        </span>
      );
    }
    if (effectivePaymentStatus === 'failed' || isFailedPayment) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          Thanh toán thất bại
        </span>
      );
    }
    if (effectivePaymentStatus === 'cancelled' || isCancelledPayment) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-stone-100 text-stone-700 border border-stone-300">
          Đã hủy thanh toán
        </span>
      );
    }
    if (effectivePaymentStatus === 'refunded') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
          Đã hoàn tiền
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
        {isVnpayOrder ? 'Chờ thanh toán' : 'Thanh toán khi nhận hàng (COD)'}
      </span>
    );
  };

  const renderOrderStatusBadge = () => {
    if (isVerifying) {
      return <span className="font-bold text-blue-600">Đang đối soát giao dịch...</span>;
    }
    if (isFailedPayment || isCancelledPayment || order?.status === 'cancelled') {
      return (
        <span className="font-bold text-rose-600">
          Đã hủy đơn (Không giao hàng • Đã giải phóng Reserved Stock)
        </span>
      );
    }
    if (isPendingUnconfirmed) {
      return (
        <span className="font-bold text-amber-700">
          Chờ hoàn tất thanh toán VNPay (Chưa đủ điều kiện xử lý & giao hàng)
        </span>
      );
    }
    return <span className="font-bold text-emerald-600">Chờ xác nhận & đóng gói giao hàng</span>;
  };

  return (
    <div className="py-16 bg-surface-light min-h-screen">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center space-y-8">
        {/* Status Icon */}
        <div
          className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-sm animate-scaleIn ${
            isVerifying
              ? 'bg-blue-100 text-blue-600'
              : isConfirmedSuccess
              ? 'bg-emerald-100 text-emerald-600'
              : isPendingUnconfirmed
              ? 'bg-amber-100 text-amber-600'
              : 'bg-rose-100 text-rose-600'
          }`}
        >
          {isVerifying ? (
            <RefreshCw className="w-10 h-10 animate-spin" />
          ) : isConfirmedSuccess ? (
            <CheckCircle2 className="w-10 h-10" />
          ) : isPendingUnconfirmed ? (
            <Clock className="w-10 h-10" />
          ) : isCancelledPayment ? (
            <XCircle className="w-10 h-10" />
          ) : (
            <AlertCircle className="w-10 h-10" />
          )}
        </div>

        {/* Headline */}
        <div className="space-y-2">
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border ${
              isVerifying
                ? 'text-blue-700 bg-blue-50 border-blue-200'
                : isConfirmedSuccess
                ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                : isPendingUnconfirmed
                ? 'text-amber-800 bg-amber-50 border-amber-200'
                : 'text-rose-700 bg-rose-50 border-rose-200'
            }`}
          >
            {isVerifying
              ? 'Đang xác minh giao dịch VNPay...'
              : isConfirmedSuccess
              ? isVnpayOrder
                ? 'Đã thanh toán & Đặt hàng thành công!'
                : 'Đặt hàng thành công!'
              : isPendingUnconfirmed
              ? 'Chờ thanh toán VNPay (Chưa hoàn tất)'
              : isCancelledPayment
              ? 'Đã hủy thanh toán'
              : 'Thanh toán thất bại'}
          </span>

          <h1 className="text-2xl sm:text-3xl font-black text-charcoal-900 font-heading tracking-tight">
            {isVerifying
              ? 'Đang Đối Soát Kết Quả Với Cổng VNPay'
              : isConfirmedSuccess
              ? 'Cảm Ơn Bạn Đã Mua Sắm Tại CURVE & CONFIDENCE'
              : isPendingUnconfirmed
              ? 'Đơn Hàng Đang Chờ Xác Nhận Thanh Toán VNPay'
              : isCancelledPayment
              ? 'Giao Dịch Thanh Toán VNPay Đã Bị Hủy'
              : 'Giao Dịch Thanh Toán VNPay Thất Bại'}
          </h1>

          <p className="text-xs sm:text-sm text-charcoal-600 max-w-md mx-auto leading-relaxed">
            Mã đơn hàng của bạn là{' '}
            <strong className="text-brand-600 font-mono text-base px-2 py-0.5 bg-brand-50 rounded border border-brand-200">
              {order ? order.id : orderId}
            </strong>
          </p>

          {/* VNPay Result / Pending Notice Box */}
          {isVnpayOrder && !isVerifying && (
            <div
              className={`mt-4 p-5 rounded-2xl border text-xs max-w-lg mx-auto text-left space-y-3 ${
                isConfirmedSuccess
                  ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                  : isPendingUnconfirmed
                  ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center justify-between gap-2 font-bold">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#0066cc] shrink-0" />
                  <span>
                    {isConfirmedSuccess
                      ? 'Cổng VNPay đã xác nhận thanh toán hợp lệ'
                      : isPendingUnconfirmed
                      ? 'Chưa nhận được xác nhận thanh toán từ VNPay'
                      : isCancelledPayment
                      ? 'Khách hàng đã hủy giao dịch thanh toán VNPay'
                      : 'Giao dịch VNPay không thành công'}
                  </span>
                </div>
                {renderPaymentStatusBadge()}
              </div>

              <p className="text-[11px] leading-relaxed opacity-90">
                {isConfirmedSuccess
                  ? `Số tiền ${(vnpayResult?.amount || order?.total || 0).toLocaleString('vi-VN')}₫ đã được thanh toán thành công${
                      vnpayResult?.transactionNo || order?.paymentTransactionNo
                        ? ` (Mã GD VNPay: ${vnpayResult?.transactionNo || order?.paymentTransactionNo})`
                        : ''
                    }. Đơn hàng đã đủ điều kiện để bộ phận kho xác nhận và đóng gói giao hàng.`
                  : isPendingUnconfirmed
                  ? 'Đơn hàng của bạn mới ở trạng thái Chờ thanh toán và CHƯA được xác nhận đặt hàng thành công. Bộ phận kho sẽ không xác nhận hoặc giao hàng cho đến khi VNPay xác nhận giao dịch thành công. Tồn kho đang được tạm giữ trong tối đa 15 phút.'
                  : isCancelledPayment
                  ? `${
                      vnpayResult?.message ||
                      'Bạn đã hủy giao dịch trên cổng VNPay hoặc đơn hàng đã quá thời hạn chờ thanh toán.'
                    } Đơn hàng đã được hủy và tồn kho tạm giữ (Reserved Stock) đã được giải phóng hoàn toàn.`
                  : `${
                      vnpayResult?.message ||
                      'Giao dịch bị từ chối hoặc thất bại từ ngân hàng phát hành.'
                    } Đơn hàng không được xử lý giao hàng và tồn kho tạm giữ (Reserved Stock) đã được giải phóng.`}
              </p>

              {/* Actions when Pending / Unconfirmed */}
              {isPendingUnconfirmed && (
                <div className="pt-3 border-t border-amber-200/80 flex flex-col sm:flex-row items-center gap-2">
                  <button
                    type="button"
                    disabled={isActionLoading}
                    onClick={handleContinueVNPay}
                    className="w-full sm:w-auto px-4 py-2.5 bg-[#0066cc] hover:bg-[#0052a3] text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Tiếp tục thanh toán VNPay</span>
                  </button>
                  <button
                    type="button"
                    disabled={isActionLoading}
                    onClick={handleReconcilePending}
                    className="w-full sm:w-auto px-3.5 py-2.5 bg-white hover:bg-amber-100 text-amber-900 font-bold text-xs rounded-xl border border-amber-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isActionLoading ? 'animate-spin' : ''}`} />
                    <span>Kiểm tra lại trạng thái</span>
                  </button>
                  <button
                    type="button"
                    disabled={isActionLoading}
                    onClick={handleCancelPendingVNPay}
                    className="w-full sm:w-auto px-3.5 py-2.5 bg-white hover:bg-rose-50 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Hủy thanh toán</span>
                  </button>
                </div>
              )}

              {/* Actions when Failed or Cancelled */}
              {(isFailedPayment || isCancelledPayment) && (
                <div className="pt-3 border-t border-rose-200 flex flex-col sm:flex-row items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-rose-800">
                    Tồn kho tạm giữ (Reserved Stock) đã được hoàn trả về kho.
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigate('/products')}
                    className="w-full sm:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Đặt lại đơn hàng mới</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* VietQR Transfer Card if VietQR is chosen */}
          {isConfirmedSuccess && order && order.paymentMethod === 'vietqr' && (
            <div className="mt-5 max-w-lg mx-auto bg-white rounded-3xl p-6 border-2 border-[#D4AF37]/40 shadow-lg text-left space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold">
                    <QrCode className="w-5 h-5 text-[#5C1D24]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-charcoal-900">Quét Mã VietQR Thanh Toán</h3>
                    <p className="text-[11px] text-stone-500">Chuyển khoản 24/7 qua mọi App Ngân hàng</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                  {order.paymentStatus === 'paid' ? '✅ Đã xác nhận' : '⏳ Chờ thanh toán'}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div className="p-2 bg-stone-50 rounded-2xl border border-stone-200 shrink-0">
                  <img
                    src={`https://img.vietqr.io/image/${PAYMENT_CONFIG.BANK_TRANSFER.bankBin}-${PAYMENT_CONFIG.BANK_TRANSFER.accountNumber}-compact2.png?amount=${order.total}&addInfo=${order.id}&accountName=${encodeURIComponent(PAYMENT_CONFIG.BANK_TRANSFER.accountHolder)}`}
                    alt="VietQR Payment Code"
                    className="w-40 h-40 object-contain rounded-xl"
                  />
                </div>

                <div className="space-y-2 text-xs flex-1 w-full">
                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-500">Ngân hàng:</span>
                    <strong className="text-charcoal-900 font-semibold">{PAYMENT_CONFIG.BANK_TRANSFER.bankName}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-500">Số tài khoản:</span>
                    <strong className="text-[#5C1D24] font-mono text-sm tracking-wider">{PAYMENT_CONFIG.BANK_TRANSFER.accountNumberFormatted}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-500">Chủ tài khoản:</span>
                    <strong className="text-charcoal-900">{PAYMENT_CONFIG.BANK_TRANSFER.accountHolder}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-100">
                    <span className="text-stone-500">Số tiền:</span>
                    <strong className="text-brand-700 font-mono text-sm">{order.total.toLocaleString('vi-VN')}₫</strong>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-stone-500">Nội dung CK:</span>
                    <strong className="font-mono bg-stone-100 px-2 py-0.5 rounded text-[#5C1D24]">{order.id}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Invoice Email Dispatched Notice & Quick Controls - ONLY shown for confirmed orders */}
          {isConfirmedSuccess && order && (
            <div className="mt-4 p-4 bg-emerald-50/90 border border-emerald-200/90 rounded-2xl max-w-lg mx-auto text-xs text-emerald-900 shadow-xs animate-fadeIn space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold text-left">
                    Hóa đơn điện tử gửi đến:{' '}
                    <strong className="text-emerald-950 font-bold underline decoration-emerald-400">
                      {customEmail || order.invoiceEmail || order.shippingAddress?.email || 'Chưa có email'}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={handleResendInvoice}
                    disabled={resendStatus === 'sending'}
                    className="px-3 py-1 text-[11px] font-bold text-emerald-800 bg-white hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                  >
                    {resendStatus === 'sending' ? 'Đang gửi...' : 'Gửi lại bill'}
                  </button>
                  {!isEditingEmail && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomEmail(order.invoiceEmail || order.shippingAddress?.email || '');
                        setIsEditingEmail(true);
                      }}
                      className="text-emerald-800 text-[11px] font-bold hover:underline cursor-pointer"
                    >
                      Đổi email
                    </button>
                  )}
                </div>
              </div>

              {isEditingEmail ? (
                <div className="pt-2 border-t border-emerald-200/80 flex items-center gap-2">
                  <input
                    type="email"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    placeholder="Nhập địa chỉ email mới..."
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-emerald-300 rounded-lg text-charcoal-900 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleResendInvoice}
                    disabled={resendStatus === 'sending'}
                    className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800 cursor-pointer disabled:opacity-50"
                  >
                    Gửi ngay
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingEmail(false)}
                    className="text-emerald-700 text-xs hover:underline cursor-pointer"
                  >
                    Hủy
                  </button>
                </div>
              ) : (
                <div className="text-[11px] text-emerald-700 pt-1 border-t border-emerald-200/60 text-left flex items-center justify-between">
                  <span>
                    Hệ thống tự động gửi từ <strong>shopbigsize47@gmail.com</strong>
                  </span>
                  {resendStatus === 'sent' && (
                    <span className="text-emerald-800 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Đã gửi thành công
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Order Details Card */}
        {order && (
          <div className="bg-white rounded-3xl border border-surface-border shadow-soft p-6 sm:p-8 text-left space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-4 border-b border-surface-border text-xs">
              <div>
                <p className="text-charcoal-400">Thời gian đặt:</p>
                <p className="font-bold text-charcoal-900 mt-0.5">{order.createdAt}</p>
              </div>
              <div>
                <p className="text-charcoal-400">Trạng thái thanh toán:</p>
                <div className="mt-1">{renderPaymentStatusBadge()}</div>
              </div>
              <div className="sm:text-right">
                <p className="text-charcoal-400">Trạng thái xử lý đơn hàng:</p>
                <div className="mt-0.5">{renderOrderStatusBadge()}</div>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-charcoal-800 uppercase tracking-wider">
                Sản Phẩm Trong Đơn:
              </h4>
              <div className="divide-y divide-surface-border">
                {order.items.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center gap-3 text-xs">
                    <img
                      src={item.product.images[0]}
                      alt={item.product.name}
                      className="w-12 h-14 object-cover rounded-xl bg-stone-100 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-charcoal-900 truncate">{item.product.name}</p>
                      <p className="text-charcoal-500 text-[11px] mt-0.5">
                        Kích cỡ: <strong>{item.size}</strong> • Màu: {item.colorName} • SL:{' '}
                        <strong>{item.quantity}</strong>
                      </p>
                    </div>
                    <span className="font-bold text-charcoal-900 font-mono">
                      {(item.price * item.quantity).toLocaleString('vi-VN')}₫
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Address */}
            <div className="p-4 bg-surface-cream rounded-2xl border border-surface-border text-xs text-charcoal-700 space-y-1">
              <p className="font-bold text-charcoal-900">Địa chỉ giao hàng:</p>
              <p>
                {order.shippingAddress.fullName} – {order.shippingAddress.phone}
              </p>
              <p>
                {order.shippingAddress.addressDetail}, {order.shippingAddress.ward},{' '}
                {order.shippingAddress.district}, {order.shippingAddress.province}
              </p>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center pt-2 border-t border-surface-border text-sm font-bold text-charcoal-900">
              <span>Tổng giá trị đơn hàng:</span>
              <span className="text-xl font-black text-brand-600 font-heading">
                {order.total.toLocaleString('vi-VN')}₫
              </span>
            </div>
          </div>
        )}

        {/* Dual Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <button
            onClick={() => onNavigate(`/order-tracking?code=${order ? order.id : orderId}`)}
            className="w-full sm:w-auto px-8 py-3.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs sm:text-sm rounded-full shadow-float flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Compass className="w-4 h-4" />
            <span>Tra cứu & Theo dõi đơn hàng</span>
          </button>

          <button
            onClick={() => onNavigate('/products')}
            className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-surface-cream text-charcoal-800 border border-surface-border font-bold text-xs sm:text-sm rounded-full transition-all cursor-pointer"
          >
            Tiếp tục mua sắm
          </button>
        </div>
      </div>

      {/* Modal Chọn Cách Thức Thanh Toán Khác */}
      {isAlternativeModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fadeIn"
          onClick={() => setIsAlternativeModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-stone-200 text-left space-y-5 animate-scaleIn my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <h3 className="text-base font-extrabold text-charcoal-900 font-heading">
                  Cách Thức Thanh Toán Khác
                </h3>
                <p className="text-xs text-charcoal-500 mt-0.5">
                  Chọn phương thức bạn muốn sử dụng cho đơn hàng #{order ? order.id : orderId}
                </p>
              </div>
              <button
                onClick={() => setIsAlternativeModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-stone-100 text-charcoal-400 hover:text-charcoal-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div
                onClick={handleSwitchToCod}
                className="p-4 rounded-2xl border border-stone-200 hover:border-brand-500 hover:bg-brand-50/40 transition-all cursor-pointer group flex items-start gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Truck className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-charcoal-900 group-hover:text-brand-600 transition-colors">
                      Thanh toán khi nhận hàng (COD)
                    </h4>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                      Khuyên dùng
                    </span>
                  </div>
                  <p className="text-[11px] text-charcoal-500 mt-1 leading-relaxed">
                    Được mở kiện đồng kiểm tra sản phẩm trước khi thanh toán tiền mặt cho bưu tá giao hàng.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setIsAlternativeModalOpen(false)}
                className="w-full py-2.5 rounded-xl border border-stone-200 text-charcoal-600 hover:bg-stone-50 font-bold text-xs transition-colors cursor-pointer"
              >
                Đóng / Giữ phương thức hiện tại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
