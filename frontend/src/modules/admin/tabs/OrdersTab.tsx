import React, { useRef, useState, useEffect } from 'react';
import { useOrder } from '@/modules/order/context/OrderContext';
import { supabase } from '@/shared/services/supabaseClient';

import {
  Truck,
  Calendar,
  Search,
  X,
  Package,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  Printer,
  Check,
  RefreshCw,
  Edit3,
  Bell
} from 'lucide-react';
import { Order, OrderStatus, PaymentStatus } from '@/shared/types';
import { useToast } from '@/shared/context/ToastContext';
import { ConfirmModal } from '@/shared/components/ConfirmModal';
import { ghnService } from '@/shared/services/ghnService';


interface OrdersTabProps {
  orders: Order[];
  updateOrderStatus: (orderId: string, status: OrderStatus, carrier?: 'GHTK' | 'GHN' | 'ViettelPost', trackingCode?: string, exception?: { reason: string; proof: string }) => Promise<boolean>;
  updatePaymentStatus?: (orderId: string, status: PaymentStatus) => Promise<boolean>;
  onAppendAuditLog: (action: string, category: string, targetCode: string, targetDesc: string) => void;
  updateOrderShippingAddress?: (orderId: string, address: { fullName: string; phone: string; addressDetail: string; ward: string; district: string; province: string }) => Promise<boolean>;
}

export type OrderPipelineStage = 'all' | 'placed' | 'confirmed' | 'shipping' | 'delivered' | 'cancelled';

export const parseVnDate = (dateStr?: string): number => {
  if (!dateStr) return 0;
  try {
    const cleanDate = dateStr.trim().split(' ')[0];
    const parts = cleanDate.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day).getTime();
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  } catch {
    return 0;
  }
};

export const normalizeTo5Stages = (status: OrderStatus): 'placed' | 'confirmed' | 'shipping' | 'delivered' | 'cancelled' => {
  if (status === 'delivered') return 'delivered';
  if (status === 'shipping') return 'shipping';
  if (status === 'preparing' || status === 'confirmed') return 'confirmed';
  if (status === 'cancelled') return 'cancelled';
  return 'placed';
};

// Backward-compatibility alias
export const normalizeTo3Stages = (status: OrderStatus): 'confirmed' | 'shipping' | 'delivered' => {
  if (status === 'delivered') return 'delivered';
  if (status === 'shipping') return 'shipping';
  return 'confirmed';
};

/**
 * High-precision vector SVG Barcode for shipping labels and order tracking
 */
const BarcodeSvg: React.FC<{ code: string }> = ({ code }) => {
  const cleanCode = (code || 'CC-ORDER').toUpperCase().replace(/[^A-Z0-9-]/g, '');
  const bars: { x: number; w: number }[] = [];
  let currentX = 8;

  // Start guard bars
  bars.push({ x: currentX, w: 2 });
  currentX += 4;
  bars.push({ x: currentX, w: 1 });
  currentX += 3;

  for (let i = 0; i < cleanCode.length; i++) {
    const c = cleanCode.charCodeAt(i);
    const pattern = [(c % 3) + 1, ((c >> 1) % 2) + 1, ((c >> 2) % 3) + 1, ((c >> 3) % 2) + 1];
    pattern.forEach((w, idx) => {
      if (idx % 2 === 0) {
        bars.push({ x: currentX, w: w * 1.5 });
      }
      currentX += w * 1.5 + 1.5;
    });
    currentX += 2;
  }

  // End guard bars
  bars.push({ x: currentX, w: 2 });
  currentX += 4;
  bars.push({ x: currentX, w: 1 });
  currentX += 8;

  return (
    <div className="flex flex-col items-center">
      <svg width={Math.min(currentX, 220)} height={36} viewBox={`0 0 ${currentX} 36`} className="overflow-visible">
        {bars.map((b, idx) => (
          <rect key={idx} x={b.x} y={0} width={b.w} height={36} fill="#000000" />
        ))}
      </svg>
      <span className="text-[10px] font-mono tracking-widest text-black font-bold mt-0.5">*{cleanCode}*</span>
    </div>
  );
};

export const OrdersTab: React.FC<OrdersTabProps> = ({
  orders,
  updateOrderStatus,
  updatePaymentStatus,
  onAppendAuditLog,
  updateOrderShippingAddress,
}) => {
  const { showToast } = useToast();

  const [orderDateRangeFilter, setOrderDateRangeFilter] = useState<'today' | '7_days' | '30_days' | 'this_month' | 'all'>('30_days');
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderPipelineStage>('all');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [selectedViewOrder, setSelectedViewOrder] = useState<Order | null>(null);
  const [cancelOrderTarget, setCancelOrderTarget] = useState<Order | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState('Khách hàng đổi ý / Hết size');
  const [orderToManualDeliver, setOrderToManualDeliver] = useState<Order | null>(null);
  const [manualDeliveryReason, setManualDeliveryReason] = useState('Khách nhận trực tiếp tại shop / Bưu tá đã nộp biên lai');
  const [manualDeliveryProof, setManualDeliveryProof] = useState('');
  const [manualDeliveryError, setManualDeliveryError] = useState('');

  // Sửa thông tin nhận hàng trực tiếp cho đơn hàng
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const addressSaveBusy = useRef(false);
  const [editAddressForm, setEditAddressForm] = useState({
    fullName: '',
    phone: '',
    addressDetail: '',
    ward: '',
    district: '',
    province: 'TP. Hồ Chí Minh'
  });

  // Gửi thông báo yêu cầu khách hàng sửa địa chỉ
  const [requestAddressTarget, setRequestAddressTarget] = useState<Order | null>(null);
  const [requestReasonInput, setRequestReasonInput] = useState('Địa chỉ nhận hàng chưa hợp lệ, vui lòng cập nhật lại Phường / Quận / Tên đường để bàn giao GHN.');
  const [isSendingAddressRequest, setIsSendingAddressRequest] = useState(false);

  /**
   * Kiểm tra đơn hàng có đủ điều kiện để Manager xác nhận, đóng gói hoặc bàn giao vận chuyển hay không:
   * - Đơn đã hủy: KHÔNG được xử lý.
   * - Đơn VNPay / Online chưa được xác nhận 'paid' ('Đã thanh toán'): TUYỆT ĐỐI KHÔNG được xác nhận, đóng gói hoặc giao hàng.
   */
  const canProcessOrderForFulfillment = (order?: Order | null): boolean => {
    if (!order) return false;
    if (order.status === 'cancelled') return false;
    if (order.paymentMethod !== 'cod' && order.paymentStatus !== 'paid') return false;
    return true;
  };

  const handleConfirmRequestAddress = async () => {
    if (!requestAddressTarget) return;
    setIsSendingAddressRequest(true);
    try {
      const dbId = Number(requestAddressTarget.id.replace(/^BS-HD0?/, ''));
      const { error } = await supabase.rpc('cc_request_address_update', {
        p_order_id: dbId,
        p_reason: requestReasonInput.trim()
      });
      if (error) throw error;
      await refreshOrders?.();
      showToast('Đã gửi thông báo', `Đã gửi yêu cầu cập nhật địa chỉ đến tài khoản khách hàng trên website (Đơn #${requestAddressTarget.id}).`, 'success');
      onAppendAuditLog(
        'Yêu cầu khách sửa địa chỉ',
        'Đơn hàng & Vận chuyển',
        requestAddressTarget.id,
        `Yêu cầu khách hàng sửa địa chỉ: ${requestReasonInput.trim()}`
      );
      setRequestAddressTarget(null);
    } catch (err: any) {
      showToast('Không thể gửi yêu cầu', err?.message || 'Vui lòng thử lại sau.', 'error');
    } finally {
      setIsSendingAddressRequest(false);
    }
  };

  const handleStartEditAddress = (order: Order) => {
    setIsEditingAddress(true);
    setEditAddressForm({
      fullName: order.shippingAddress?.fullName || '',
      phone: order.shippingAddress?.phone || '',
      addressDetail: order.shippingAddress?.addressDetail || '',
      ward: order.shippingAddress?.ward || '',
      district: order.shippingAddress?.district || '',
      province: order.shippingAddress?.province || 'TP. Hồ Chí Minh'
    });
  };

  const handleSaveAddress = async (orderId: string) => {
    if (addressSaveBusy.current) return;
    if (!editAddressForm.fullName.trim() || editAddressForm.fullName.trim().length < 2) {
      showToast('Thông tin chưa hợp lệ', 'Họ và tên người nhận cần tối thiểu 2 ký tự.', 'error');
      return;
    }
    const cleanPhone = editAddressForm.phone.trim().replace(/[\s.-]/g, '');
    if (!/^\d{10,11}$/.test(cleanPhone)) {
      showToast('Thông tin chưa hợp lệ', 'Số điện thoại nhận hàng không hợp lệ (cần từ 10 chữ số).', 'error');
      return;
    }
    if (!editAddressForm.addressDetail.trim() || editAddressForm.addressDetail.trim().length < 3) {
      showToast('Thông tin chưa hợp lệ', 'Địa chỉ chi tiết (số nhà, tên đường) cần tối thiểu 3 ký tự.', 'error');
      return;
    }
    if (!editAddressForm.ward.trim() || !editAddressForm.province.trim() || !editAddressForm.district.trim()) {
      showToast('Thông tin chưa hợp lệ', 'Vui lòng điền đầy đủ Phường/Xã, Quận/Huyện và Tỉnh/TP.', 'error');
      return;
    }
    addressSaveBusy.current = true;
    const submittedAddress = { ...editAddressForm, phone: cleanPhone };
    setIsSavingAddress(true);
    try {
      if (updateOrderShippingAddress) {
        const ok = await updateOrderShippingAddress(orderId, submittedAddress);
        if (ok) {
          setIsEditingAddress(false);
          showToast('Đã lưu địa chỉ', 'Địa chỉ nhận hàng đã được cập nhật thành công.', 'success');
          onAppendAuditLog(
            'Chỉnh sửa địa chỉ nhận hàng',
            'Đơn hàng & Vận chuyển',
            orderId,
            `Cập nhật địa chỉ nhận hàng: ${submittedAddress.addressDetail}, ${submittedAddress.ward}, ${submittedAddress.district}, ${submittedAddress.province}`
          );
        }
      }
    } catch (error) {
      showToast('Chưa lưu địa chỉ', error instanceof Error ? error.message : 'Chưa cập nhật được địa chỉ nhận hàng. Vui lòng thử lại sau.', 'error');
    } finally {
      addressSaveBusy.current = false;
      setIsSavingAddress(false);
    }
  };

  // Sync selected order with latest orders state
  const liveSelectedOrder = selectedViewOrder
    ? orders.find((o) => o.id === selectedViewOrder.id) || selectedViewOrder
    : null;

  useEffect(() => {
    if (!selectedViewOrder) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedViewOrder(null);
        setIsEditingAddress(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedViewOrder]);

  // Filter orders by date range safely using parseVnDate
  const dateFilteredOrders = orders.filter((o) => {
    if (orderDateRangeFilter === 'all') return true;
    const now = Date.now();
    const orderTime = parseVnDate(o.createdAt);
    if (!orderTime) return true;
    const diffDays = (now - orderTime) / (1000 * 60 * 60 * 24);

    if (orderDateRangeFilter === 'today') return diffDays <= 1;
    if (orderDateRangeFilter === '7_days') return diffDays <= 7;
    if (orderDateRangeFilter === '30_days') return diffDays <= 30;
    if (orderDateRangeFilter === 'this_month') {
      const orderDate = new Date(orderTime);
      const nowDate = new Date();
      return (
        orderDate.getMonth() === nowDate.getMonth() &&
        orderDate.getFullYear() === nowDate.getFullYear()
      );
    }
    return true;
  });

  // Calculate order counts for all stages
  const orderStats = {
    all: dateFilteredOrders.length,
    placed: dateFilteredOrders.filter((o) => normalizeTo5Stages(o.status) === 'placed').length,
    confirmed: dateFilteredOrders.filter((o) => normalizeTo5Stages(o.status) === 'confirmed').length,
    shipping: dateFilteredOrders.filter((o) => normalizeTo5Stages(o.status) === 'shipping').length,
    delivered: dateFilteredOrders.filter((o) => normalizeTo5Stages(o.status) === 'delivered').length,
    cancelled: dateFilteredOrders.filter((o) => normalizeTo5Stages(o.status) === 'cancelled').length,
    revenue: dateFilteredOrders
      .filter((o) => o.status !== 'cancelled' && (o.paymentMethod === 'cod' || o.paymentStatus === 'paid'))
      .reduce((sum, o) => sum + (o.total || 0), 0),
  };

  // Filter orders by search & status
  const filteredOrders = dateFilteredOrders.filter((o) => {
    const stage = normalizeTo5Stages(o.status);
    if (orderStatusFilter !== 'all' && stage !== orderStatusFilter) return false;

    if (orderSearchQuery.trim()) {
      const q = orderSearchQuery.toLowerCase().trim();
      const matchId = o.id.toLowerCase().includes(q);
      const matchName = o.shippingAddress?.fullName?.toLowerCase().includes(q) || false;
      const matchPhone = o.shippingAddress?.phone?.includes(q) || false;
      const matchTracking = o.trackingCode?.toLowerCase().includes(q) || false;
      if (!matchId && !matchName && !matchPhone && !matchTracking) return false;
    }
    return true;
  });

  const { refreshOrders } = useOrder();
  const [dispatchTarget, setDispatchTarget] = useState<Order | null>(null);
  const dispatchBusy = useRef(false);
  const [isSyncingGhn, setIsSyncingGhn] = useState<string | null>(null);
  const [isSyncingAllGhn, setIsSyncingAllGhn] = useState(false);

  // Tự động kiểm tra và đồng bộ trạng thái từ GHN khi Quản lý mở tab Đơn Hàng
  useEffect(() => {
    const hasActiveGhn = orders.some(
      (o) =>
        ['confirmed', 'shipping'].includes(normalizeTo5Stages(o.status)) &&
        (o.carrier === 'GHN' || (o.trackingCode && o.trackingCode.startsWith('GHN')))
    );
    if (hasActiveGhn) {
      ghnService.syncOrders().then((res) => {
        if (res.success && res.synced && res.synced > 0) {
          refreshOrders?.();
        }
      }).catch(() => {});
    }
  }, []);

  const handleConfirmOrder = (orderId: string) => {
    const order = orders.find(item => item.id === orderId);
    if (!order) return;
    if (!canProcessOrderForFulfillment(order)) {
      showToast(
        'Không thể xử lý đơn chưa thanh toán VNPay',
        'Đơn hàng VNPay chưa được xác nhận Đã thanh toán nên Manager không được phép xác nhận, đóng gói hoặc bàn giao vận chuyển.',
        'error'
      );
      return;
    }
    if (!dispatchBusy.current) setDispatchTarget(order);
  };

  const handleShipOrderWithGhn = (order: Order) => {
    if (!canProcessOrderForFulfillment(order)) {
      showToast(
        'Không thể bàn giao vận chuyển',
        'Đơn hàng VNPay chưa được xác nhận Đã thanh toán nên không thể tạo vận đơn GHN.',
        'error'
      );
      return;
    }
    if (!dispatchBusy.current && !order.trackingCode) setDispatchTarget(order);
  };

  const handleConfirmDispatch = async () => {
    if (!dispatchTarget || dispatchBusy.current) return;
    const order = orders.find(item => item.id === dispatchTarget.id);
    if (!order || order.trackingCode || !['placed', 'confirmed'].includes(normalizeTo5Stages(order.status))) {
      setDispatchTarget(null);
      showToast('Đơn hàng đã thay đổi', 'Vui lòng tải lại danh sách trước khi tiếp tục.', 'warning');
      return;
    }
    if (!canProcessOrderForFulfillment(order)) {
      setDispatchTarget(null);
      showToast(
        'Chưa thanh toán VNPay',
        'Đơn hàng VNPay chưa được xác nhận Đã thanh toán nên không được phép tạo vận đơn hoặc giao hàng.',
        'error'
      );
      return;
    }
    dispatchBusy.current = true;
    setIsSyncingGhn(order.id);
    try {
      const result = await ghnService.createShippingOrder(order);
      if (result.success && result.orderCode) {
        setDispatchTarget(null);
        onAppendAuditLog('Tạo vận đơn GHN', 'Đơn hàng & Vận chuyển', order.id, `Đã lưu vận đơn ${result.orderCode}; trạng thái lấy hàng theo xác nhận của GHN.`);
        showToast('Đã tạo vận đơn GHN', `Mã vận đơn: ${result.orderCode}. Chờ GHN lấy hàng; tạo vận đơn không đồng nghĩa đã bàn giao.`, 'success');
        await refreshOrders?.();
      } else {
        await refreshOrders?.();
        showToast(result.confirmed ? 'Đã xác nhận — chưa tạo được vận đơn' : 'Chưa hoàn tất tạo vận đơn', result.errorMessage || 'Vui lòng kiểm tra lại danh sách và thử đối soát sau 2 phút.', 'error');
      }
    } catch {
      showToast('Chưa xác minh được kết quả', 'Vui lòng tải lại danh sách; không tạo đơn mới khi chưa đối soát vận đơn.', 'error');
    } finally {
      dispatchBusy.current = false;
      setIsSyncingGhn(null);
    }
  };

  // Đồng bộ trạng thái thực tế từ GHN và cập nhật tự động vào CSDL
  const handleSyncGhnStatus = async (order: Order) => {
    if (!order.trackingCode) return;
    setIsSyncingGhn(order.id);
    try {
      const syncRes = await ghnService.syncOrders();
      await refreshOrders?.();
      const info = await ghnService.getOrderTracking(order.trackingCode, order.id);
      if (syncRes.success) {
        showToast('Đồng bộ GHN thành công', `Đã đồng bộ trạng thái mới nhất từ GHN (${info?.statusText || 'Đã kiểm tra'}).`, 'success');
      } else {
        showToast('Thông tin vận chuyển', info?.statusText || 'Đã kiểm tra', 'info');
      }
    } catch {
      showToast('Chưa thể đồng bộ', 'Vui lòng kiểm tra kết nối và thử lại sau ít phút.', 'error');
    } finally {
      setIsSyncingGhn(null);
    }
  };

  // Đồng bộ tất cả đơn hàng bưu tá GHN
  const handleSyncAllGhn = async () => {
    if (isSyncingAllGhn) return;
    setIsSyncingAllGhn(true);
    try {
      const syncRes = await ghnService.syncOrders();
      await refreshOrders?.();
      if (syncRes.success) {
        showToast(
          'Đồng bộ GHN thành công',
          `Đã quét và cập nhật ${syncRes.synced ?? 0} đơn hàng từ đối tác vận chuyển GHN.`,
          'success'
        );
      } else {
        showToast('Thông báo đồng bộ', syncRes.errorMessage || 'Đã kiểm tra danh sách vận đơn.', 'info');
      }
    } catch {
      showToast('Chưa thể đồng bộ', 'Vui lòng kiểm tra kết nối mạng và thử lại sau ít phút.', 'error');
    } finally {
      setIsSyncingAllGhn(false);
    }
  };

  // 4. Bàn giao vận chuyển thủ công dự phòng
  const handleShipOrder = async (orderId: string, carrier: 'GHTK' | 'GHN' = 'GHN', trackingCode?: string) => {
    const order = orders.find((item) => item.id === orderId);
    if (!canProcessOrderForFulfillment(order)) {
      showToast('Chưa thanh toán VNPay', 'Không thể bàn giao vận chuyển cho đơn VNPay chưa thanh toán thành công.', 'error');
      return;
    }
    const targetTracking = trackingCode?.trim();
    if (!targetTracking) { showToast('Thiếu vận đơn', 'Vui lòng nhập mã vận đơn đã được đơn vị vận chuyển xác nhận.', 'error'); return; }
    if (!await updateOrderStatus(orderId, 'shipping', carrier, targetTracking)) return;
    onAppendAuditLog(
      'Bàn giao bưu tá vận chuyển',
      'Đơn hàng & Vận chuyển',
      orderId,
      `Bàn giao cho ${carrier}, mã vận đơn: ${targetTracking}`
    );
    showToast(
      'Bàn giao bưu tá thành công',
      `Đơn hàng #${orderId} đã giao cho ${carrier} với mã vận đơn: ${targetTracking}`,
      'success'
    );
  };

  // 3. Hoàn tất giao hàng thành công (Đang vận chuyển -> Đã giao ngoại lệ thủ công)
  const handleDeliverOrder = async (orderId: string, reason?: string, proofCode?: string) => {
    const order = orders.find((item) => item.id === orderId);
    if (!canProcessOrderForFulfillment(order)) {
      showToast('Chưa thanh toán VNPay', 'Không thể xác nhận giao hàng cho đơn VNPay chưa thanh toán thành công.', 'error');
      return false;
    }
    if (!reason || !proofCode || !await updateOrderStatus(orderId, 'delivered', undefined, undefined, { reason, proof: proofCode })) return false;
    const desc = reason
      ? `Ngoại lệ giao hàng thủ công. Lý do: ${reason}. Bằng chứng/Mã đối soát: ${proofCode || 'N/A'}`
      : 'Khách đã nhận kiện hàng an toàn';
    onAppendAuditLog(
      'Giao hàng thành công (Ngoại lệ)',
      'Đơn hàng & Vận chuyển',
      orderId,
      desc
    );
    showToast(
      'Giao hàng thành công',
      `Đơn hàng #${orderId} đã được xác nhận giao thành công thủ công có chứng từ lưu vết.`,
      'success'
    );
    return true;
  };

  // 4. Hủy đơn hàng an toàn
  const handleConfirmCancelOrder = async () => {
    if (!cancelOrderTarget) return;
    const targetId = cancelOrderTarget.id;
    if (!await updateOrderStatus(targetId, 'cancelled')) return;
    onAppendAuditLog(
      'Hủy đơn hàng',
      'Đơn hàng & Vận chuyển',
      targetId,
      `Hủy đơn hàng. Lý do: ${cancelReasonInput}`
    );
    setCancelOrderTarget(null);
    if (selectedViewOrder?.id === targetId) {
      setSelectedViewOrder(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Date Range Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-900 flex items-center gap-2">
            <Truck className="w-6 h-6 text-[#5C1D24]" />
            Quản Lý Đơn Hàng & Vận Đơn
          </h1>
        </div>

        {/* Date Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-white border border-stone-200/90 rounded-2xl shadow-2xs self-start md:self-auto overflow-x-auto max-w-full">
          <div className="flex items-center gap-1 px-2.5 py-1 text-stone-400 text-xs font-semibold shrink-0">
            <Calendar className="w-3.5 h-3.5 text-[#5C1D24]" />
            <span className="hidden sm:inline">Kỳ lọc:</span>
          </div>
          {[
            { id: 'today', label: 'Hôm nay' },
            { id: '7_days', label: '7 ngày qua' },
            { id: '30_days', label: '30 ngày qua' },
            { id: 'this_month', label: 'Tháng này' },
            { id: 'all', label: 'Tất cả' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setOrderDateRangeFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                orderDateRangeFilter === tab.id
                  ? 'bg-[#5C1D24] text-white shadow-xs'
                  : 'text-stone-600 hover:text-charcoal-900 hover:bg-stone-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5+1 Pipeline Status Cards (Có Thẻ 'CHỜ XÁC NHẬN') */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Tất cả đơn */}
        <button
          type="button"
          onClick={() => setOrderStatusFilter('all')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            orderStatusFilter === 'all'
              ? 'bg-stone-900 text-white border-stone-900 shadow-sm ring-2 ring-stone-900/20'
              : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-200/90 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">TẤT CẢ ĐƠN</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                orderStatusFilter === 'all' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
              }`}
            >
              {orderStats.all}
            </span>
          </div>
          <strong className="text-lg font-bold block">{orderStats.all} đơn</strong>
          <span className="text-[10px] block opacity-80 truncate mt-0.5">
            {orderStats.revenue > 0 ? `${orderStats.revenue.toLocaleString('vi-VN')}₫` : 'Toàn bộ kỳ chọn'}
          </span>
        </button>

        {/* 2. CHỜ XÁC NHẬN (Mới Đặt) */}
        <button
          type="button"
          onClick={() => setOrderStatusFilter(orderStatusFilter === 'placed' ? 'all' : 'placed')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
            orderStatusFilter === 'placed'
              ? 'bg-amber-600 text-white border-amber-600 shadow-sm ring-2 ring-amber-600/30'
              : 'bg-amber-50/70 hover:bg-amber-100/60 text-amber-900 border-amber-200 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-90 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block" />
              1. CHỜ DUYỆT
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                orderStatusFilter === 'placed' ? 'bg-white text-amber-900' : 'bg-amber-200 text-amber-900'
              }`}
            >
              {orderStats.placed}
            </span>
          </div>
          <strong className="text-lg font-bold block">{orderStats.placed} đơn</strong>
          <span className="text-[10px] block opacity-85 truncate mt-0.5 font-medium">Cần duyệt & kiểm cỡ</span>
        </button>

        {/* 3. Đã đóng gói */}
        <button
          type="button"
          onClick={() => setOrderStatusFilter(orderStatusFilter === 'confirmed' ? 'all' : 'confirmed')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            orderStatusFilter === 'confirmed'
              ? 'bg-indigo-900 text-white border-indigo-900 shadow-sm ring-2 ring-indigo-900/20'
              : 'bg-white hover:bg-indigo-50/50 text-stone-700 border-stone-200/90 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 opacity-90">2. ĐÃ ĐÓNG GÓI</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                orderStatusFilter === 'confirmed' ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-800'
              }`}
            >
              {orderStats.confirmed}
            </span>
          </div>
          <strong className="text-lg font-bold block">{orderStats.confirmed} đơn</strong>
          <span className="text-[10px] block opacity-80 truncate mt-0.5">Sẵn sàng giao bưu tá</span>
        </button>

        {/* 4. Đang vận chuyển */}
        <button
          type="button"
          onClick={() => setOrderStatusFilter(orderStatusFilter === 'shipping' ? 'all' : 'shipping')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            orderStatusFilter === 'shipping'
              ? 'bg-blue-900 text-white border-blue-900 shadow-sm ring-2 ring-blue-900/20'
              : 'bg-white hover:bg-blue-50/50 text-stone-700 border-stone-200/90 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 opacity-90">3. VẬN CHUYỂN</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                orderStatusFilter === 'shipping' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-800'
              }`}
            >
              {orderStats.shipping}
            </span>
          </div>
          <strong className="text-lg font-bold block">{orderStats.shipping} đơn</strong>
          <span className="text-[10px] block opacity-80 truncate mt-0.5">Bưu tá đang phát hàng</span>
        </button>

        {/* 5. Đã giao */}
        <button
          type="button"
          onClick={() => setOrderStatusFilter(orderStatusFilter === 'delivered' ? 'all' : 'delivered')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            orderStatusFilter === 'delivered'
              ? 'bg-emerald-900 text-white border-emerald-900 shadow-sm ring-2 ring-emerald-900/20'
              : 'bg-white hover:bg-emerald-50/50 text-stone-700 border-stone-200/90 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 opacity-90">4. ĐÃ GIAO</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                orderStatusFilter === 'delivered' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {orderStats.delivered}
            </span>
          </div>
          <strong className="text-lg font-bold block">{orderStats.delivered} đơn</strong>
          <span className="text-[10px] block opacity-80 truncate mt-0.5">Giao thành công</span>
        </button>

        {/* 6. Đã hủy */}
        <button
          type="button"
          onClick={() => setOrderStatusFilter(orderStatusFilter === 'cancelled' ? 'all' : 'cancelled')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            orderStatusFilter === 'cancelled'
              ? 'bg-rose-900 text-white border-rose-900 shadow-sm ring-2 ring-rose-900/20'
              : 'bg-white hover:bg-rose-50/50 text-stone-700 border-stone-200/90 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 opacity-90">ĐÃ HỦY</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                orderStatusFilter === 'cancelled' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'
              }`}
            >
              {orderStats.cancelled}
            </span>
          </div>
          <strong className="text-lg font-bold block">{orderStats.cancelled} đơn</strong>
          <span className="text-[10px] block opacity-80 truncate mt-0.5">Đã hoàn trả tồn kho</span>
        </button>
      </div>

      {/* Search & Status Toolbar */}
      <div className="bg-white rounded-2xl border border-stone-200/90 p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={orderSearchQuery}
              onChange={(e) => setOrderSearchQuery(e.target.value)}
              placeholder="Tìm mã đơn (BS-...), tên khách, SĐT, mã vận đơn..."
              className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-hidden focus:border-[#5C1D24] focus:bg-white transition-colors"
            />
            {orderSearchQuery && (
              <button
                type="button"
                onClick={() => setOrderSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0 text-xs text-stone-500">
            <button
              type="button"
              disabled={isSyncingAllGhn}
              onClick={handleSyncAllGhn}
              className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 active:scale-95 border border-indigo-200/80 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
              title="Đồng bộ tất cả tiến trình và trạng thái hủy đơn từ GHN API"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAllGhn ? 'animate-spin' : ''}`} />
              <span>{isSyncingAllGhn ? 'Đang đồng bộ...' : 'Đồng bộ GHN'}</span>
            </button>
            <span>
              Hiển thị: <strong className="text-charcoal-900">{filteredOrders.length}</strong> / {dateFilteredOrders.length} đơn
            </span>
            {(orderSearchQuery || orderStatusFilter !== 'all' || orderDateRangeFilter !== '30_days') && (
              <button
                type="button"
                onClick={() => {
                  setOrderSearchQuery('');
                  setOrderStatusFilter('all');
                  setOrderDateRangeFilter('30_days');
                }}
                className="px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              >
                Xóa lọc
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Order List Table */}
      <div className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden shadow-2xs">
        {filteredOrders.length === 0 ? (
          <div className="py-16 text-center">
            <Package className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-stone-700">Không tìm thấy đơn hàng nào</p>
            <p className="text-xs text-stone-400 mt-1">Thử thay đổi từ khóa tìm kiếm hoặc chọn mốc thời gian khác</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50/80 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="px-5 py-3.5">MÃ ĐƠN & NGÀY TẠO</th>
                  <th className="px-5 py-3.5">KHÁCH HÀNG & NƠI NHẬN</th>
                  <th className="px-5 py-3.5">SẢN PHẨM & KÍCH CỠ</th>
                  <th className="px-5 py-3.5">TỔNG TIỀN & TRẠNG THÁI TT</th>
                  <th className="px-5 py-3.5">TRẠNG THÁI XỬ LÝ</th>
                  <th className="px-5 py-3.5">VẬN ĐƠN</th>
                  <th className="px-5 py-3.5 text-center">THAO TÁC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredOrders.map((o) => {
                  const stage = normalizeTo5Stages(o.status);
                  const isUnpaidOnline = o.paymentMethod !== 'cod' && o.paymentStatus !== 'paid';

                  const totalItemQty = o.items && o.items.length > 0
                    ? o.items.reduce((sum, item) => sum + (item.quantity || 1), 0)
                    : 1;

                  const sizeBreakdown = (o.items || []).reduce((acc: Record<string, number>, item) => {
                    const sz = item.size || 'XL';
                    acc[sz] = (acc[sz] || 0) + (item.quantity || 1);
                    return acc;
                  }, {});

                  const paymentBadge = (() => {
                    const isPaid = o.paymentStatus === 'paid';
                    if (o.paymentMethod === 'vnpay') {
                      if (isPaid) {
                        return (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold mt-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200">
                            VNPay • Đã thanh toán
                          </span>
                        );
                      }
                      if (o.paymentStatus === 'failed') {
                        return (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold mt-0.5 bg-rose-50 text-rose-700 border border-rose-200">
                            VNPay • Thanh toán thất bại
                          </span>
                        );
                      }
                      if (o.paymentStatus === 'cancelled') {
                        return (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold mt-0.5 bg-stone-100 text-stone-700 border border-stone-300">
                            VNPay • Đã hủy thanh toán
                          </span>
                        );
                      }
                      if (o.paymentStatus === 'refunded') {
                        return (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold mt-0.5 bg-purple-50 text-purple-700 border border-purple-200">
                            VNPay • Đã hoàn tiền
                          </span>
                        );
                      }
                      return (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold mt-0.5 bg-amber-50 text-amber-800 border border-amber-300">
                          VNPay • Chờ thanh toán
                        </span>
                      );
                    }
                    if (o.paymentMethod === 'vietqr') {
                      return (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold mt-0.5 bg-amber-50 text-amber-800 border border-amber-200">
                          VietQR • {isPaid ? 'Đã thanh toán' : 'Chờ chuyển khoản'}
                        </span>
                      );
                    }
                    if (o.paymentMethod === 'momo') {
                      return (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold mt-0.5 bg-pink-50 text-pink-700 border border-pink-200">
                          MoMo • {isPaid ? 'Đã thanh toán' : 'Chờ quét ví'}
                        </span>
                      );
                    }
                    return (
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold mt-0.5 bg-stone-100 text-stone-700 border border-stone-200">
                        COD • {isPaid ? 'Đã thu tiền' : 'Chờ thu COD'}
                      </span>
                    );
                  })();

                  return (
                    <tr key={o.id} className="hover:bg-stone-50/60 transition-colors">
                      {/* 1. Order ID & Date */}
                      <td className="px-5 py-4">
                        <span className="font-bold text-[#8B2535] text-sm block">
                          {o.id}
                        </span>
                        <span className="text-[11px] text-stone-400 font-medium block mt-0.5">
                          {o.createdAt || '10/10/2026'}
                        </span>
                      </td>

                      {/* 2. Customer & Address */}
                      <td className="px-5 py-4">
                        <span className="font-bold text-charcoal-900 block text-xs">
                          {o.shippingAddress?.fullName || 'Khách vãng lai'}
                        </span>
                        <span className="text-[11px] text-stone-500 block font-mono">
                          {o.shippingAddress?.phone || 'Chưa có SĐT'}
                        </span>
                        {o.shippingAddress?.addressDetail && (
                          <span className="text-[10px] text-stone-400 block line-clamp-1 max-w-[200px]" title={o.shippingAddress.addressDetail}>
                            {o.shippingAddress.addressDetail}
                          </span>
                        )}
                      </td>

                      {/* 3. Items & Size */}
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <span className="font-bold text-charcoal-900 block text-xs">
                            {totalItemQty} sản phẩm
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {Object.keys(sizeBreakdown).length > 0 ? (
                              Object.entries(sizeBreakdown).map(([sz, qty]) => (
                                <span
                                  key={sz}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-800 text-[10px] font-mono font-bold border border-stone-200"
                                >
                                  Cỡ {sz} ({qty})
                                </span>
                              ))
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-800 text-[10px] font-mono font-bold border border-stone-200">
                                Cỡ XL (1)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 4. Total Amount & Payment Method/Status */}
                      <td className="px-5 py-4">
                        <span className="font-bold text-charcoal-900 text-xs block">
                          {(o.total || 0).toLocaleString('vi-VN')}₫
                        </span>
                        {paymentBadge}
                      </td>

                      {/* 5. Order 5-Stage Status */}
                      <td className="px-5 py-4">
                        {stage === 'placed' && (
                          isUnpaidOnline ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              <Clock className="w-3 h-3 text-amber-700" />
                              <span>Chờ TT VNPay (Khóa giao)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                              <span>1. Chờ duyệt</span>
                            </span>
                          )
                        )}
                        {stage === 'confirmed' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-900 border border-indigo-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            <span>2. Đã đóng gói</span>
                          </span>
                        )}
                        {stage === 'shipping' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-900 border border-blue-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            <span>3. Đang giao hàng</span>
                          </span>
                        )}
                        {stage === 'delivered' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>4. Đã giao</span>
                          </span>
                        )}
                        {stage === 'cancelled' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-900 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            <span>Đã hủy</span>
                          </span>
                        )}
                      </td>

                      {/* 6. Tracking Code & Carrier */}
                      <td className="px-5 py-4">
                        {o.trackingCode ? (
                          <div className="space-y-0.5">
                            <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded-md border border-blue-200 block w-fit">
                              {o.trackingCode}
                            </span>
                            <span className="text-[10px] text-stone-400 block">
                              Đơn vị: {o.carrier || 'GHTK'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-stone-400 italic">
                            Chưa bàn giao
                          </span>
                        )}
                      </td>

                      {/* 7. Action Button: Quick Action + View */}
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {stage === 'placed' && (
                            isUnpaidOnline ? (
                              <button
                                type="button"
                                disabled
                                className="px-2.5 py-1.5 text-xs font-bold text-stone-400 bg-stone-100 border border-stone-200 rounded-xl cursor-not-allowed inline-flex items-center gap-1"
                                title="Đơn VNPay chưa thanh toán thành công — Không được phép xác nhận hoặc giao hàng"
                              >
                                <Clock className="w-3.5 h-3.5" />
                                <span>Chờ TT VNPay</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleConfirmOrder(o.id)}
                                className="px-2.5 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 rounded-xl transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1"
                                title="Xác nhận &amp; Đẩy GHN"
                              >
                                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Xác nhận &amp; Đẩy GHN</span>
                              </button>
                            )
                          )}
                          {stage === 'confirmed' && !o.trackingCode && canProcessOrderForFulfillment(o) && (
                            <button
                              type="button"
                              disabled={isSyncingGhn === o.id}
                              onClick={() => handleShipOrderWithGhn(o)}
                              className="px-2.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1 disabled:opacity-50"
                              title="Thử lại tạo vận đơn GHN"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>{isSyncingGhn === o.id ? 'Đang tạo...' : 'Thử lại tạo vận đơn'}</span>
                            </button>
                          )}
                          {['confirmed', 'shipping'].includes(stage) && (o.carrier === 'GHN' || (o.trackingCode && o.trackingCode.startsWith('GHN'))) && (
                            <button
                              type="button"
                              disabled={isSyncingGhn === o.id}
                              onClick={() => handleSyncGhnStatus(o)}
                              className="px-2.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1 disabled:opacity-50"
                              title="Đồng bộ trạng thái bưu tá tự động từ GHN API"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingGhn === o.id ? 'animate-spin' : ''}`} />
                              <span>{isSyncingGhn === o.id ? 'Đang check...' : 'Đồng bộ GHN'}</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedViewOrder(o)}
                            className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-all cursor-pointer"
                            title="Xem chi tiết đơn hàng"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: ORDER DETAILS & 4-STAGE PIPELINE WORKFLOW */}
      {liveSelectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-900/40 backdrop-blur-md animate-fadeIn overflow-y-auto"
          onClick={() => {
            setSelectedViewOrder(null);
            setIsEditingAddress(false);
          }}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl border border-stone-200 my-auto animate-scaleIn text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-stone-200">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-base text-charcoal-900">
                    Chi Tiết Đơn Hàng: <span className="font-mono text-brand-700">{liveSelectedOrder.id}</span>
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full ${
                      normalizeTo5Stages(liveSelectedOrder.status) === 'placed'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : normalizeTo5Stages(liveSelectedOrder.status) === 'confirmed'
                          ? 'bg-indigo-100 text-indigo-800'
                          : normalizeTo5Stages(liveSelectedOrder.status) === 'shipping'
                            ? 'bg-blue-100 text-blue-800'
                            : normalizeTo5Stages(liveSelectedOrder.status) === 'delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {normalizeTo5Stages(liveSelectedOrder.status) === 'placed'
                      ? liveSelectedOrder.paymentMethod !== 'cod' && liveSelectedOrder.paymentStatus !== 'paid'
                        ? '⏳ Chờ thanh toán VNPay (Khóa xử lý)'
                        : '⏳ 1. Chờ xác nhận'
                      : normalizeTo5Stages(liveSelectedOrder.status) === 'confirmed'
                        ? '📦 2. Đã đóng gói'
                        : normalizeTo5Stages(liveSelectedOrder.status) === 'shipping'
                          ? '🚚 3. Đang vận chuyển'
                          : normalizeTo5Stages(liveSelectedOrder.status) === 'delivered'
                            ? '✅ 4. Đã giao hàng'
                            : '❌ Đã hủy đơn'}
                  </span>
                </div>
                <p className="text-xs text-stone-400 mt-0.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Ngày đặt: {liveSelectedOrder.createdAt}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedViewOrder(null);
                  setIsEditingAddress(false);
                }}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Warning Banner if VNPay is Unpaid / Failed / Cancelled */}
            {liveSelectedOrder.paymentMethod !== 'cod' && liveSelectedOrder.paymentStatus !== 'paid' && (
              <div
                className={`mt-4 p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 ${
                  liveSelectedOrder.paymentStatus === 'pending'
                    ? 'bg-amber-50 border-amber-300 text-amber-950'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <div className="space-y-1">
                  <p className="font-bold">
                    {liveSelectedOrder.paymentStatus === 'pending'
                      ? 'Đơn hàng VNPay chưa hoàn tất thanh toán — Đã khóa chức năng duyệt & giao hàng'
                      : liveSelectedOrder.paymentStatus === 'failed'
                      ? 'Giao dịch VNPay thất bại — Không được phép xử lý giao hàng'
                      : 'Giao dịch VNPay đã hủy — Không được phép xử lý giao hàng'}
                  </p>
                  <p className="text-[11px] opacity-90">
                    {liveSelectedOrder.paymentStatus === 'pending'
                      ? 'Manager không được xác nhận, đóng gói hoặc bàn giao vận chuyển cho đến khi cổng VNPay xác nhận giao dịch thành công hợp lệ.'
                      : 'Đơn hàng này đã bị hủy do thanh toán không thành công và tồn kho tạm giữ (Reserved Stock) đã được giải phóng.'}
                  </p>
                </div>
              </div>
            )}

            {/* Visual 4-Stage Progress Bar */}
            <div className="my-5 p-4 bg-stone-50 rounded-2xl border border-stone-200">
              <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-3">
                Tiến Trình Xử Lý Đơn Hàng (Quy Trình Chuẩn Thương Mại Điện Tử)
              </div>
              <div className="grid grid-cols-4 gap-2 relative">
                {/* Stage 1: Chờ xác nhận */}
                <div
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    normalizeTo5Stages(liveSelectedOrder.status) === 'placed'
                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs ring-2 ring-amber-500/30'
                      : 'bg-white text-stone-700 border-stone-200'
                  }`}
                >
                  <Clock
                    className={`w-4 h-4 mx-auto mb-1 ${
                      normalizeTo5Stages(liveSelectedOrder.status) === 'placed' ? 'text-white' : 'text-amber-600'
                    }`}
                  />
                  <div className="font-bold text-[11px]">1. Chờ duyệt</div>
                  <div className="text-[9px] opacity-80 mt-0.5">Kiểm tồn & cỡ áo</div>
                </div>

                {/* Stage 2: Đã đóng gói */}
                <div
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    normalizeTo5Stages(liveSelectedOrder.status) === 'confirmed'
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                      : 'bg-white text-stone-700 border-stone-200'
                  }`}
                >
                  <Package
                    className={`w-4 h-4 mx-auto mb-1 ${
                      normalizeTo5Stages(liveSelectedOrder.status) === 'confirmed' ? 'text-white' : 'text-indigo-600'
                    }`}
                  />
                  <div className="font-bold text-[11px]">2. Đóng gói</div>
                  <div className="text-[9px] opacity-80 mt-0.5">Ủi & đóng hộp</div>
                </div>

                {/* Stage 3: Đang vận chuyển */}
                <div
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    normalizeTo5Stages(liveSelectedOrder.status) === 'shipping'
                      ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                      : 'bg-white text-stone-700 border-stone-200'
                  }`}
                >
                  <Truck
                    className={`w-4 h-4 mx-auto mb-1 ${
                      normalizeTo5Stages(liveSelectedOrder.status) === 'shipping' ? 'text-white' : 'text-blue-600'
                    }`}
                  />
                  <div className="font-bold text-[11px]">3. Vận chuyển</div>
                  <div className="text-[9px] opacity-80 mt-0.5">Bưu tá phát hàng</div>
                </div>

                {/* Stage 4: Đã giao */}
                <div
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    normalizeTo5Stages(liveSelectedOrder.status) === 'delivered'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                      : 'bg-white text-stone-700 border-stone-200'
                  }`}
                >
                  <CheckCircle2
                    className={`w-4 h-4 mx-auto mb-1 ${
                      normalizeTo5Stages(liveSelectedOrder.status) === 'delivered' ? 'text-white' : 'text-emerald-600'
                    }`}
                  />
                  <div className="font-bold text-[11px]">4. Đã giao</div>
                  <div className="text-[9px] opacity-80 mt-0.5">Thành công</div>
                </div>
              </div>
            </div>

            {/* Information Grid: Recipient & 3PL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              {/* Recipient Details */}
              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 text-xs space-y-2">
                <div className="flex items-center justify-between border-b border-stone-200 pb-1.5">
                  <span className="font-bold text-charcoal-900 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-stone-500" />
                    Thông Tin Người Nhận
                  </span>
                  {normalizeTo5Stages(liveSelectedOrder.status) !== 'delivered' && normalizeTo5Stages(liveSelectedOrder.status) !== 'cancelled' && (
                    !isEditingAddress ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleStartEditAddress(liveSelectedOrder)}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline cursor-pointer"
                          title="Chỉnh sửa họ tên, SĐT, hoặc bổ sung Phường/Xã để bàn giao GHN"
                        >
                          <Edit3 className="w-3 h-3" />
                          Sửa địa chỉ
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRequestReasonInput('Địa chỉ nhận hàng chưa hợp lệ hoặc thiếu thông tin, vui lòng cập nhật lại Phường / Quận / Tên đường để bàn giao đơn vị vận chuyển.');
                            setRequestAddressTarget(liveSelectedOrder);
                          }}
                          className="text-[10px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                          title="Gửi thông báo yêu cầu khách sửa địa chỉ trên website"
                        >
                          <Bell className="w-3 h-3 text-amber-600" />
                          Yêu cầu khách sửa
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsEditingAddress(false)}
                        className="text-[11px] font-semibold text-stone-500 hover:text-stone-800 cursor-pointer"
                      >
                        Hủy
                      </button>
                    )
                  )}
                </div>

                {!isEditingAddress ? (
                  <>
                    {liveSelectedOrder.yeuCauDiaChi?.trang_thai === 'cho_xu_ly' && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
                        <Bell className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">Đã gửi yêu cầu khách cập nhật địa chỉ:</p>
                          <p className="text-amber-700 italic text-[10px] mt-0.5">"{liveSelectedOrder.yeuCauDiaChi.ly_do}"</p>
                        </div>
                      </div>
                    )}
                    <div>
                      <span className="text-stone-400 text-[11px] block">Họ và tên:</span>
                      <span className="font-bold text-charcoal-800">{liveSelectedOrder.shippingAddress?.fullName || 'Khách vãng lai'}</span>
                    </div>
                    <div>
                      <span className="text-stone-400 text-[11px] block">Số điện thoại:</span>
                      <span className="font-mono font-semibold text-charcoal-800">{liveSelectedOrder.shippingAddress?.phone || 'Chưa có'}</span>
                    </div>
                    <div>
                      <span className="text-stone-400 text-[11px] block">Địa chỉ nhận hàng:</span>
                      <span className="text-charcoal-700 block">
                        {liveSelectedOrder.shippingAddress?.addressDetail ? `${liveSelectedOrder.shippingAddress.addressDetail}, ` : ''}
                        {liveSelectedOrder.shippingAddress?.ward ? `${liveSelectedOrder.shippingAddress.ward}, ` : ''}
                        {liveSelectedOrder.shippingAddress?.district ? `${liveSelectedOrder.shippingAddress.district}, ` : ''}
                        {liveSelectedOrder.shippingAddress?.province || 'Việt Nam'}
                      </span>
                    </div>
                  </>
                ) : (
                  <fieldset disabled={isSavingAddress} className="space-y-2 pt-1">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-stone-600 block mb-0.5">Họ tên *</label>
                        <input
                          type="text"
                          value={editAddressForm.fullName}
                          onChange={e => setEditAddressForm(prev => ({ ...prev, fullName: e.target.value }))}
                          className="w-full px-2 py-1 bg-white border border-stone-300 rounded-lg text-xs text-charcoal-900 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-stone-600 block mb-0.5">Số điện thoại *</label>
                        <input
                          type="tel"
                          value={editAddressForm.phone}
                          onChange={e => setEditAddressForm(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full px-2 py-1 bg-white border border-stone-300 rounded-lg text-xs font-mono text-charcoal-900 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-stone-600 block mb-0.5">Địa chỉ chi tiết (số nhà, tên đường) *</label>
                      <input
                        type="text"
                        placeholder="VD: 45 Lê Duẩn"
                        value={editAddressForm.addressDetail}
                        onChange={e => setEditAddressForm(prev => ({ ...prev, addressDetail: e.target.value }))}
                        className="w-full px-2 py-1 bg-white border border-stone-300 rounded-lg text-xs text-charcoal-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <div>
                        <label className="text-[10px] font-bold text-stone-600 block mb-0.5">Phường / Xã *</label>
                        <input
                          type="text"
                          placeholder="Phường Bến Nghé"
                          value={editAddressForm.ward}
                          onChange={e => setEditAddressForm(prev => ({ ...prev, ward: e.target.value }))}
                          className="w-full px-2 py-1 bg-white border border-stone-300 rounded-lg text-xs text-charcoal-900 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="order-district" className="text-[10px] font-bold text-stone-600 block mb-0.5">Quận / Huyện *</label>
                        <input
                          id="order-district"
                          type="text"
                          required
                          placeholder="Quận 1"
                          value={editAddressForm.district}
                          onChange={e => setEditAddressForm(prev => ({ ...prev, district: e.target.value }))}
                          className="w-full px-2 py-1 bg-white border border-stone-300 rounded-lg text-xs text-charcoal-900 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-stone-600 block mb-0.5">Tỉnh / TP *</label>
                        <input
                          type="text"
                          placeholder="TP. Hồ Chí Minh"
                          value={editAddressForm.province}
                          onChange={e => setEditAddressForm(prev => ({ ...prev, province: e.target.value }))}
                          className="w-full px-2 py-1 bg-white border border-stone-300 rounded-lg text-xs text-charcoal-900 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div className="pt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingAddress(false)}
                        className="px-2.5 py-1 text-xs font-semibold text-stone-600 bg-stone-200 hover:bg-stone-300 rounded-lg cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        disabled={isSavingAddress}
                        onClick={() => handleSaveAddress(liveSelectedOrder.id)}
                        className="px-3 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer shadow-xs disabled:opacity-50 inline-flex items-center gap-1"
                      >
                        {isSavingAddress ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        <span>{isSavingAddress ? 'Đang kiểm tra & lưu...' : 'Lưu địa chỉ'}</span>
                      </button>
                    </div>
                  </fieldset>
                )}
              </div>

              {/* Shipping & Payment Details */}
              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 text-xs space-y-2">
                <span className="font-bold text-charcoal-900 block border-b border-stone-200 pb-1.5 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-stone-500" />
                  Vận Chuyển & Thanh Toán
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-stone-400 text-[11px]">Đơn vị vận chuyển:</span>
                  <span className="font-bold text-charcoal-800">{liveSelectedOrder.carrier || 'Chưa bàn giao đơn vị vận chuyển'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-400 text-[11px]">Mã vận đơn:</span>
                  <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {liveSelectedOrder.trackingCode || 'Chưa tạo vận đơn'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-400 text-[11px]">Hình thức thanh toán:</span>
                  <span className="font-semibold text-charcoal-800">
                    {liveSelectedOrder.paymentMethod === 'vnpay'
                      ? 'Cổng thanh toán VNPay'
                      : liveSelectedOrder.paymentMethod === 'vietqr'
                      ? 'Chuyển khoản VietQR'
                      : liveSelectedOrder.paymentMethod === 'momo'
                      ? 'Ví điện tử MoMo'
                      : 'Thu tiền mặt khi nhận hàng (COD)'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-400 text-[11px]">Trạng thái thanh toán:</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      liveSelectedOrder.paymentStatus === 'paid'
                        ? 'bg-emerald-100 text-emerald-800'
                        : liveSelectedOrder.paymentStatus === 'failed'
                        ? 'bg-rose-100 text-rose-800'
                        : liveSelectedOrder.paymentStatus === 'cancelled'
                        ? 'bg-stone-200 text-stone-800'
                        : liveSelectedOrder.paymentStatus === 'refunded'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {liveSelectedOrder.paymentStatus === 'paid'
                      ? 'Đã thanh toán'
                      : liveSelectedOrder.paymentStatus === 'failed'
                      ? 'Thanh toán thất bại'
                      : liveSelectedOrder.paymentStatus === 'cancelled'
                      ? 'Đã hủy thanh toán'
                      : liveSelectedOrder.paymentStatus === 'refunded'
                      ? 'Đã hoàn tiền'
                      : liveSelectedOrder.paymentMethod === 'cod'
                      ? 'Chờ thu tiền khi giao (COD)'
                      : 'Chờ thanh toán'}
                  </span>
                </div>
                {liveSelectedOrder.stockHoldStatus && (
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400 text-[11px]">Tồn kho tạm giữ (Reserved Stock):</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        liveSelectedOrder.stockHoldStatus === 'Released'
                          ? 'bg-stone-100 text-stone-700 border border-stone-300'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {liveSelectedOrder.stockHoldStatus === 'Released'
                        ? 'Đã giải phóng (Released)'
                        : liveSelectedOrder.stockHoldStatus === 'Deducted'
                        ? 'Đã xuất kho (Deducted)'
                        : 'Đang tạm giữ (Reserved)'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-stone-200 rounded-2xl overflow-hidden mb-5">
              <div className="bg-stone-50 px-3.5 py-2 border-b border-stone-200 text-[11px] font-bold text-stone-600 uppercase tracking-wider">
                Sản Phẩm Đặt Mua ({liveSelectedOrder.items?.length || 0} món)
              </div>
              <div className="divide-y divide-stone-100 max-h-56 overflow-y-auto">
                {liveSelectedOrder.items?.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      {item.product?.images?.[0] ? (
                        <img
                          src={item.product.images[0]}
                          alt={item.product?.name || 'Sản phẩm'}
                          className="w-10 h-10 object-cover rounded-lg border border-stone-200"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-stone-100 rounded-lg flex items-center justify-center text-stone-400">
                          <Package className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <span className="font-bold text-charcoal-900 block">{item.product?.name || 'Sản phẩm Big Size'}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                            Cỡ: {item.size}
                          </span>
                          {item.colorName && (
                            <span className="text-[11px] text-stone-400">Màu: {item.colorName}</span>
                          )}
                          <span className="text-[11px] text-stone-500">x {item.quantity}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-charcoal-900 block">
                        {(item.price * item.quantity).toLocaleString('vi-VN')}₫
                      </span>
                      <span className="text-[10px] text-stone-400">
                        {item.price.toLocaleString('vi-VN')}₫/cái
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Financial Breakdown */}
              <div className="bg-stone-50/80 p-3.5 border-t border-stone-200 text-xs space-y-1.5">
                <div className="flex justify-between text-stone-500">
                  <span>Tạm tính:</span>
                  <span>{(liveSelectedOrder.subtotal || 0).toLocaleString('vi-VN')}₫</span>
                </div>
                {(liveSelectedOrder.discountAmount || 0) > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Giảm giá voucher ({liveSelectedOrder.voucherCode || 'Ưu đãi'}):</span>
                    <span>-{(liveSelectedOrder.discountAmount || 0).toLocaleString('vi-VN')}₫</span>
                  </div>
                )}
                <div className="flex justify-between text-stone-500">
                  <span>Phí vận chuyển:</span>
                  <span>{(liveSelectedOrder.shippingFee || 0) > 0 ? `${liveSelectedOrder.shippingFee.toLocaleString('vi-VN')}₫` : 'Miễn phí'}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-charcoal-900 pt-2 border-t border-stone-200">
                  <span>Tổng tiền thanh toán:</span>
                  <span className="text-brand-700">{(liveSelectedOrder.total || 0).toLocaleString('vi-VN')}₫</span>
                </div>
              </div>
            </div>

            {/* Quick Status Action Buttons */}
            <div className="pt-2 border-t border-stone-200 space-y-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 w-full sm:w-auto flex-wrap">
                  {/* Nếu đơn mới: Có nút Duyệt đơn (Khóa nếu VNPay chưa thanh toán) */}
                  {normalizeTo5Stages(liveSelectedOrder.status) === 'placed' && (
                    canProcessOrderForFulfillment(liveSelectedOrder) ? (
                      <button
                        type="button"
                        onClick={() => handleConfirmOrder(liveSelectedOrder.id)}
                        className="px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4 stroke-[2.5]" />
                        <span>Xác nhận &amp; Đẩy GHN</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="px-3.5 py-2 text-xs font-bold rounded-xl bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed flex items-center gap-1.5"
                        title="Đơn VNPay chưa thanh toán thành công — Không được phép xác nhận hoặc giao hàng"
                      >
                        <Clock className="w-4 h-4" />
                        <span>Chờ thanh toán VNPay (Khóa xử lý)</span>
                      </button>
                    )
                  )}

                  {normalizeTo5Stages(liveSelectedOrder.status) === 'confirmed' && liveSelectedOrder.trackingCode && (
                    <span className="text-xs font-semibold text-amber-700">Đã tạo vận đơn · Chờ GHN lấy hàng</span>
                  )}
                  {/* Đơn đã xác nhận nhưng chưa có vận đơn: cho phép thử lại nếu đã thanh toán hoặc COD */}
                  {normalizeTo5Stages(liveSelectedOrder.status) === 'confirmed' && !liveSelectedOrder.trackingCode && canProcessOrderForFulfillment(liveSelectedOrder) && (
                    <button
                      type="button"
                      disabled={isSyncingGhn === liveSelectedOrder.id}
                      onClick={() => handleShipOrderWithGhn(liveSelectedOrder)}
                      className="px-3.5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Truck className="w-4 h-4" />
                      <span>{isSyncingGhn === liveSelectedOrder.id ? 'Đang gửi GHN...' : 'Thử lại tạo vận đơn'}</span>
                    </button>
                  )}

                  {/* Nếu đang vận chuyển GHN hoặc đã tạo vận đơn: Nút Đồng bộ GHN & Nút xác nhận thủ công dự phòng */}
                  {['confirmed', 'shipping'].includes(normalizeTo5Stages(liveSelectedOrder.status)) && (liveSelectedOrder.carrier === 'GHN' || (liveSelectedOrder.trackingCode && liveSelectedOrder.trackingCode.startsWith('GHN'))) && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isSyncingGhn === liveSelectedOrder.id}
                        onClick={() => handleSyncGhnStatus(liveSelectedOrder)}
                        className="px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 ${isSyncingGhn === liveSelectedOrder.id ? 'animate-spin' : ''}`} />
                        <span>{isSyncingGhn === liveSelectedOrder.id ? 'Đang tra cứu...' : 'Đồng Bộ Tiến Trình GHN'}</span>
                      </button>
                      {normalizeTo5Stages(liveSelectedOrder.status) === 'shipping' && (
                        <button
                          type="button"
                          onClick={() => setOrderToManualDeliver(liveSelectedOrder)}
                          className="px-2.5 py-2 text-[11px] font-semibold rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-all cursor-pointer"
                          title="Xác nhận giao thành công thủ công (dự phòng)"
                        >
                          <span>Xác nhận thủ công</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Nút Hủy Đơn Hàng (Nếu chưa giao) */}
                  {liveSelectedOrder.status !== 'delivered' && liveSelectedOrder.status !== 'cancelled' && (
                    <button
                      type="button"
                      onClick={() => setCancelOrderTarget(liveSelectedOrder)}
                      className="px-3 py-2 text-xs font-bold rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Hủy Đơn</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {canProcessOrderForFulfillment(liveSelectedOrder) && (
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-1.5 px-3 py-2 border border-stone-200 hover:bg-stone-100 rounded-xl text-xs font-bold text-stone-700 transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>In Phiếu Giao</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedViewOrder(null)}
                    className="px-4 py-2 bg-stone-900 hover:bg-charcoal-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(dispatchTarget)}
        title="Xác nhận & Đẩy GHN"
        description="Kiểm tra người nhận, sản phẩm và tiền thu hộ trước khi gửi. Môi trường thử nghiệm GHN; tạo vận đơn chưa có nghĩa bưu tá đã nhận hàng."
        variant="primary"
        confirmText="Xác nhận & Đẩy GHN"
        confirmLoadingText="Đang kết nối & Đẩy GHN..."
        onCancel={() => { if (!dispatchBusy.current) setDispatchTarget(null); }}
        onConfirm={handleConfirmDispatch}
        details={dispatchTarget && <div className="space-y-2 max-h-64 overflow-y-auto">
          <p className="font-semibold">{dispatchTarget.shippingAddress?.fullName} · {dispatchTarget.shippingAddress?.phone}</p>
          <p>{[dispatchTarget.shippingAddress?.addressDetail, dispatchTarget.shippingAddress?.ward, dispatchTarget.shippingAddress?.district, dispatchTarget.shippingAddress?.province].filter(Boolean).join(', ')}</p>
          {dispatchTarget.items.map((item, index) => <p key={index}>{item.product.name} · {item.size} · Số lượng {item.quantity}</p>)}
          <p className="font-bold">Thu hộ: {(dispatchTarget.paymentMethod === 'cod' && dispatchTarget.paymentStatus !== 'paid' ? dispatchTarget.total : 0).toLocaleString('vi-VN')}₫</p>
        </div>}
      />

      {/* ConfirmModal Yêu Cầu Khách Cập Nhật Địa Chỉ */}
      <ConfirmModal
        isOpen={Boolean(requestAddressTarget)}
        title="Yêu Cầu Khách Cập Nhật Địa Chỉ"
        description={`Hệ thống sẽ gửi thông báo đến chuông thông báo (🔔) trên website của khách hàng ${requestAddressTarget?.shippingAddress?.fullName || ''} cho đơn #${requestAddressTarget?.id}.`}
        confirmText={isSendingAddressRequest ? 'Đang gửi...' : 'Gửi Thông Báo'}
        cancelText="Hủy"
        variant="warning"
        onConfirm={handleConfirmRequestAddress}
        onCancel={() => { if (!isSendingAddressRequest) setRequestAddressTarget(null); }}
        details={
          <div className="space-y-2 pt-1 text-left">
            <label className="block text-[11px] font-bold text-stone-700">Lý do yêu cầu / Hướng dẫn khách sửa:</label>
            <textarea
              rows={2}
              value={requestReasonInput}
              onChange={(e) => setRequestReasonInput(e.target.value)}
              className="w-full text-xs p-2.5 border border-stone-300 rounded-xl bg-white text-charcoal-900 focus:outline-none focus:border-amber-600"
            />
          </div>
        }
      />

      {/* ConfirmModal Hủy Đơn Hàng 2 Bước An Toàn */}
      <ConfirmModal
        isOpen={Boolean(cancelOrderTarget)}
        title="Xác Nhận Hủy Đơn Hàng"
        description={`Bạn có chắc chắn muốn hủy đơn hàng #${cancelOrderTarget?.id}? Hệ thống sẽ giải phóng lượng hàng giữ chỗ nếu đơn đủ điều kiện hủy.`}
        confirmText="Đồng Ý Hủy Đơn"
        cancelText="Đóng"
        variant="danger"
        onConfirm={handleConfirmCancelOrder}
        onCancel={() => setCancelOrderTarget(null)}
      />

      {/* ConfirmModal Xác Nhận Giao Hàng Thủ Công Ngoại Lệ Bắt Buộc Nhập Chứng Từ & Lý Do */}
      <ConfirmModal
        isOpen={Boolean(orderToManualDeliver)}
        title="Xác Nhận Giao Hàng Ngoại Lệ (Thủ Công)"
        description={`Bạn đang thực hiện xác nhận thủ công cho đơn #${orderToManualDeliver?.id}. Thao tác này bỏ qua webhook tự động của GHN và bắt buộc phải lưu trữ bằng chứng đối soát.`}
        confirmText="Xác Nhận & Lưu Bằng Chứng"
        cancelText="Hủy Bỏ"
        variant="warning"
        details={
          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-[11px] font-bold text-charcoal-800 mb-1">
                Lý do giao hàng ngoại lệ <span className="text-rose-500">*</span>:
              </label>
              <input
                type="text"
                required
                value={manualDeliveryReason}
                onChange={(e) => {
                  setManualDeliveryReason(e.target.value);
                  if (manualDeliveryError) setManualDeliveryError('');
                }}
                placeholder="Ví dụ: Khách nhận tại showroom, bưu tá giao ngoài hệ thống..."
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl bg-white text-charcoal-900 focus:outline-hidden focus:border-amber-600"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-charcoal-800 mb-1">
                Mã chứng từ / Bằng chứng giao hàng <span className="text-rose-500">*</span>:
              </label>
              <input
                type="text"
                required
                value={manualDeliveryProof}
                onChange={(e) => {
                  setManualDeliveryProof(e.target.value);
                  if (manualDeliveryError) setManualDeliveryError('');
                }}
                placeholder="Nhập mã phiếu ký nhận, số biên bản hoặc mã tham chiếu..."
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl bg-white text-charcoal-900 font-mono focus:outline-hidden focus:border-amber-600"
              />
            </div>
            {manualDeliveryError && (
              <p className="text-[11px] text-rose-600 font-medium">{manualDeliveryError}</p>
            )}
          </div>
        }
        onConfirm={async () => {
          if (!orderToManualDeliver) return;
          const reasonTrimmed = manualDeliveryReason.trim();
          const proofTrimmed = manualDeliveryProof.trim();
          if (!reasonTrimmed || !proofTrimmed) {
            setManualDeliveryError('Vui lòng nhập đầy đủ lý do ngoại lệ và mã chứng từ/bằng chứng!');
            return;
          }
          const targetId = orderToManualDeliver.id;
          if (!await handleDeliverOrder(targetId, reasonTrimmed, proofTrimmed)) {
            setManualDeliveryError('Chưa lưu được xác nhận. Vui lòng kiểm tra trạng thái đơn và thử lại.');
            return;
          }
          setOrderToManualDeliver(null);
          setManualDeliveryProof('');
        }}
        onCancel={() => {
          setOrderToManualDeliver(null);
          setManualDeliveryError('');
        }}
      />

      {/* ============================================================ */}
      {/* MẪU PHIẾU GIAO HÀNG / TEM DÁN KIỆN HÀNG CHUẨN VẬN CHUYỂN A5/A6 */}
      {/* LOẠI BỎ TOÀN BỘ POPUP, THANH TIẾN TRÌNH, CÁC NÚT BẤM KHI IN      */}
      {/* ============================================================ */}
      {liveSelectedOrder && (
        <div id="delivery-slip-print-portal">
          <div className="border-2 border-black p-4 text-black text-xs leading-tight font-sans bg-white">
            {/* 1. Header: Shop Branding, Order ID, Barcode, QR */}
            <div className="flex items-start justify-between border-b-2 border-black pb-3">
              <div className="max-w-[55%]">
                <h1 className="text-base font-black uppercase tracking-wider text-black">
                  CURVE & CONFIDENCE
                </h1>
                <p className="text-[10px] font-semibold uppercase text-gray-700 mt-0.5">
                  Thời Trang May Đo Big Size Cao Cấp (XL – 5XL)
                </p>
                <div className="text-[11px] mt-1 space-y-0.5 text-black">
                  <p><strong>Hotline CSKH:</strong> 0988.888.888</p>
                  <p><strong>Địa chỉ kho gửi:</strong> 123 Lê Văn Sỹ, P.14, Q.3, TP. Hồ Chí Minh</p>
                </div>
              </div>
              <div className="text-right flex flex-col items-end">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-gray-600 block">Mã đơn hàng</span>
                    <span className="text-base font-black font-mono">#{liveSelectedOrder.id}</span>
                    <span className="text-[10px] text-gray-600 block">Ngày: {liveSelectedOrder.createdAt || new Date().toLocaleDateString('vi-VN')}</span>
                  </div>
                  {/* Mã QR tra cứu bưu phẩm */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(liveSelectedOrder.id)}`}
                    alt="QR Tra Cứu"
                    className="w-16 h-16 border border-black p-0.5"
                  />
                </div>
                {/* Vector Barcode */}
                <BarcodeSvg code={liveSelectedOrder.id} />
              </div>
            </div>

            {/* 2. Routing / Shipping Carrier Strip */}
            <div className="grid grid-cols-2 border-b-2 border-black py-2 bg-gray-50">
              <div className="px-2 border-r border-black">
                <span className="text-[10px] uppercase font-bold text-gray-600 block">Đơn vị vận chuyển:</span>
                <span className="text-sm font-black uppercase">{liveSelectedOrder.carrier || 'GHTK - Giao Hàng Tiết Kiệm'}</span>
              </div>
              <div className="px-2">
                <span className="text-[10px] uppercase font-bold text-gray-600 block">Mã vận đơn đối soát:</span>
                <span className="text-sm font-black font-mono">{liveSelectedOrder.trackingCode || `CC-${liveSelectedOrder.id}`}</span>
              </div>
            </div>

            {/* 3. Sender & Recipient Box (2 Cột Cân Đối Hoàn Hảo) */}
            <div className="grid grid-cols-2 border-b-2 border-black">
              <div className="p-3 border-r-2 border-black">
                <span className="text-[10px] uppercase font-black text-gray-600 block mb-1">1. NGƯỜI GỬI (FROM):</span>
                <p className="font-bold text-[12px]">SHOP CURVE & CONFIDENCE</p>
                <p className="font-semibold text-[11px]">SĐT: 0988.888.888</p>
                <p className="text-[11px] text-gray-800 mt-0.5">123 Lê Văn Sỹ, Phường 14, Quận 3, TP. Hồ Chí Minh</p>
              </div>
              <div className="p-3 bg-gray-50/50">
                <span className="text-[10px] uppercase font-black text-gray-600 block mb-1">2. NGƯỜI NHẬN (TO):</span>
                <p className="font-black text-sm uppercase">{liveSelectedOrder.shippingAddress?.fullName || 'Khách hàng'}</p>
                <p className="font-black text-sm mt-0.5">
                  SĐT: {(() => {
                    const rawPhone = liveSelectedOrder.shippingAddress?.phone?.trim() || '';
                    if (!rawPhone) return 'Chưa có SĐT';
                    if (rawPhone.length < 7) return rawPhone;
                    return `${rawPhone.slice(0, 3)}****${rawPhone.slice(-3)}`;
                  })()}
                </p>
                <p className="text-[11px] font-medium text-black mt-1 leading-snug">
                  {liveSelectedOrder.shippingAddress?.addressDetail ? `${liveSelectedOrder.shippingAddress.addressDetail}, ` : ''}
                  {liveSelectedOrder.shippingAddress?.ward ? `${liveSelectedOrder.shippingAddress.ward}, ` : ''}
                  {liveSelectedOrder.shippingAddress?.district ? `${liveSelectedOrder.shippingAddress.district}, ` : ''}
                  {liveSelectedOrder.shippingAddress?.province || ''}
                </p>
              </div>
            </div>

            {/* 4. COD Box - Khung thu tiền nổi bật nhất cho bưu tá */}
            <div className="border-b-2 border-black p-3 text-center bg-gray-100">
              {liveSelectedOrder.paymentStatus !== 'paid' && (!liveSelectedOrder.paymentMethod || liveSelectedOrder.paymentMethod === 'cod') ? (
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider block">TIỀN THU NGƯỜI NHẬN (TIỀN MẶT COD):</span>
                  <span className="text-2xl font-black block mt-0.5">
                    {(liveSelectedOrder.total || 0).toLocaleString('vi-VN')}₫
                  </span>
                  <span className="text-[10px] italic text-gray-700 block mt-0.5">
                    (Bưu tá vui lòng thu đúng số tiền trên trước khi bàn giao bưu phẩm)
                  </span>
                </div>
              ) : (
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider block">HÌNH THỨC THANH TOÁN:</span>
                  <span className="text-lg font-black block mt-0.5">
                    ĐÃ THANH TOÁN TRƯỚC (COD: 0₫ - KHÔNG THU TIỀN)
                  </span>
                  <span className="text-[10px] italic text-gray-700 block mt-0.5">
                    ({liveSelectedOrder.paymentMethod === 'vnpay' ? 'Đã thanh toán qua VNPay' : liveSelectedOrder.paymentMethod === 'vietqr' ? 'Đã chuyển khoản VietQR' : 'Đã thanh toán trực tuyến'})
                  </span>
                </div>
              )}
            </div>

            {/* 5. Package Items Breakdown */}
            <div className="border-b-2 border-black">
              <div className="p-1.5 bg-gray-200 font-bold uppercase text-[10px] flex justify-between items-center">
                <span>Danh Sách Sản Phẩm May Đo Trong Kiện Hàng</span>
                <span>Tổng số món: {liveSelectedOrder.items?.reduce((sum, it) => sum + (it.quantity || 1), 0) || 0} sản phẩm</span>
              </div>
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-black bg-gray-50">
                    <th className="py-1 px-2 border-r border-black w-8 text-center">STT</th>
                    <th className="py-1 px-2 border-r border-black">Tên Sản Phẩm</th>
                    <th className="py-1 px-2 border-r border-black w-24 text-center">Kích Cỡ</th>
                    <th className="py-1 px-2 border-r border-black w-24 text-center">Màu Sắc</th>
                    <th className="py-1 px-2 w-12 text-center">SL</th>
                  </tr>
                </thead>
                <tbody>
                  {liveSelectedOrder.items?.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-300">
                      <td className="py-1.5 px-2 border-r border-black text-center">{idx + 1}</td>
                      <td className="py-1.5 px-2 border-r border-black font-semibold">{item.product?.name || 'Sản phẩm Big Size'}</td>
                      <td className="py-1.5 px-2 border-r border-black text-center font-bold">{item.size}</td>
                      <td className="py-1.5 px-2 border-r border-black text-center">{item.colorName || 'Mặc định'}</td>
                      <td className="py-1.5 px-2 text-center font-bold">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 6. Courier Instructions & Notes */}
            <div className="grid grid-cols-2 border-b-2 border-black">
              <div className="p-2 border-r-2 border-black text-[10px]">
                <span className="font-bold uppercase block mb-0.5">Ghi chú người mua:</span>
                <p className="italic">{liveSelectedOrder.notes || 'Cho khách xem hàng trước khi nhận. Không cho thử đồ.'}</p>
              </div>
              <div className="p-2 text-[10px]">
                <span className="font-bold uppercase block mb-0.5">Chỉ dẫn bưu tá giao hàng:</span>
                <p className="text-gray-800">
                  Cho khách kiểm tra số lượng và ngoại quan. Không thử đồ. Chuyển hoàn sau 3 lần phát không thành công.
                </p>
              </div>
            </div>

            {/* 7. Signatures */}
            <div className="grid grid-cols-2 pt-3 pb-8 text-center text-[10px]">
              <div>
                <p className="font-bold uppercase">Chữ Ký Người Nhận</p>
                <p className="italic text-gray-500 mt-0.5">(Ký và ghi rõ họ tên)</p>
              </div>
              <div>
                <p className="font-bold uppercase">Chữ Ký Bưu Tá Giao Hàng</p>
                <p className="italic text-gray-500 mt-0.5">(Xác nhận đã giao nguyên vẹn)</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSS Reset dành riêng cho chế độ In (Print Only) */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #delivery-slip-print-portal,
          #delivery-slip-print-portal * {
            visibility: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #delivery-slip-print-portal {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            display: block !important;
            background: #ffffff !important;
            color: #000000 !important;
            z-index: 99999999 !important;
            margin: 0 !important;
            padding: 4mm 6mm !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
          }
          @page {
            size: A5 portrait;
            margin: 4mm;
          }
        }
        @media screen {
          #delivery-slip-print-portal {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
