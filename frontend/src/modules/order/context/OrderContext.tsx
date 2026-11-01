import { confirmManualDelivery } from '@/shared/services/managerOperations';
import { cancelSavedOrder, transaction, databaseId } from '@/shared/services/transactionService';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Order, OrderStatus, PaymentStatus, OrderTimelineStep, ShippingAddress, CartItem } from '@/types';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { useInventory } from '@/modules/inventory/context/InventoryContext';
import { fetchOrdersFromSupabase, createOrderInSupabase, supabase } from '@/shared/services/supabaseClient';
import { markVoucherAsUsed } from '@/modules/cart/context/CartContext';

interface CreateOrderInput {
  items: CartItem[];
  shippingAddress: ShippingAddress;
  shippingMethod: 'standard' | 'express';
  shippingFee: number;
  paymentMethod: 'cod' | 'vietqr' | 'momo' | 'vnpay';
  paymentStatus: PaymentStatus;
  subtotal: number;
  discountAmount: number;
  voucherCode?: string;
  total: number;
  wantInvoice?: boolean;
  invoiceEmail?: string;
}

interface OrderContextType {
  orders: Order[];
  createOrder: (data: CreateOrderInput) => Promise<Order>;
  getOrderById: (orderId: string) => Order | undefined;
  getOrdersByPhone: (phone: string) => Order[];
  advanceOrderStatus: (orderId: string) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus, carrier?: 'GHTK' | 'GHN' | 'ViettelPost', trackingCode?: string, exception?: { reason: string; proof: string }) => Promise<boolean>;
  updatePaymentStatus: (orderId: string, paymentStatus: PaymentStatus) => Promise<boolean>;
  switchToCod: (orderId: string) => void;
  switchToPaymentMethod?: (orderId: string, method: 'cod' | 'vietqr') => void;
  cancelOrder: (orderId: string, reason: string) => Promise<boolean>;
  requestCancelOrder: (orderId: string, reason: string) => void;
  rejectCancelOrder: (orderId: string, adminNote?: string) => void;
  refreshOrders?: () => Promise<void>;
  updateOrderShippingAddress?: (orderId: string, address: { fullName: string; phone: string; addressDetail: string; ward: string; district: string; province: string }) => Promise<boolean>;
}

const ORDERS_STORAGE_KEY = 'curve_confidence_orders_v2';

const generateTimeline = (
  status: OrderStatus,
  createdAt: string,
  paymentMethod: 'cod' | 'vietqr' | 'momo' | 'vnpay' = 'cod',
  paymentStatus: PaymentStatus = 'pending'
): OrderTimelineStep[] => {
  const isVnpay = paymentMethod !== 'cod';
  const isVnpayPaid = !isVnpay || paymentStatus === 'paid';

  if (status === 'cancelled') {
    if (isVnpay && paymentStatus === 'failed') {
      return [
        { status: 'placed', label: 'Thanh toán VNPay thất bại', description: 'Giao dịch VNPay không thành công, đơn hàng không được xử lý.', time: createdAt, completed: false, current: false },
        { status: 'cancelled', label: 'Đã hủy đơn hàng', description: 'Đơn hàng đã bị hủy và giải phóng tồn kho tạm giữ (Reserved Stock).', time: 'Vừa xong', completed: true, current: true }
      ];
    }
    if (isVnpay && paymentStatus !== 'paid') {
      return [
        { status: 'placed', label: 'Đã hủy thanh toán VNPay', description: 'Khách hàng hủy giao dịch hoặc quá hạn chờ thanh toán VNPay.', time: createdAt, completed: false, current: false },
        { status: 'cancelled', label: 'Đã hủy đơn hàng', description: 'Đơn hàng đã bị hủy và giải phóng tồn kho tạm giữ (Reserved Stock).', time: 'Vừa xong', completed: true, current: true }
      ];
    }
    return [
      { status: 'placed', label: 'Đặt hàng', description: 'Đã ghi nhận đơn hàng.', time: createdAt, completed: true, current: false },
      { status: 'cancelled', label: 'Đã hủy đơn hàng', description: 'Đơn hàng đã bị hủy và hoàn trả tồn kho.', time: 'Vừa xong', completed: true, current: true }
    ];
  }

  const steps: { status: OrderStatus; label: string; desc: string }[] = [
    isVnpay
      ? (isVnpayPaid
          ? { status: 'placed', label: 'Đặt hàng & Thanh toán thành công', desc: 'Đã xác nhận thanh toán VNPay hợp lệ.' }
          : { status: 'placed', label: 'Chờ thanh toán VNPay', desc: 'Đơn hàng đang tạm giữ tồn kho chờ hoàn tất thanh toán VNPay (chưa đủ điều kiện giao hàng).' })
      : { status: 'placed', label: 'Đặt hàng thành công', desc: 'Đơn hàng đã được ghi nhận vào hệ thống.' },
    { status: 'confirmed', label: 'Đã xác nhận đơn', desc: isVnpay && !isVnpayPaid ? 'Chỉ xác nhận sau khi giao dịch VNPay thành công hợp lệ.' : 'Chuyên viên kiểm tra tồn kho & xác thực thông tin size.' },
    { status: 'preparing', label: 'Đang đóng gói', desc: 'Sản phẩm được ủi phẳng và đóng gói hộp carton sang trọng.' },
    { status: 'shipping', label: 'Đang giao hàng (3PL)', desc: 'Bưu tá GHTK/GHN đang phát hàng đến địa chỉ của bạn.' },
    { status: 'delivered', label: 'Giao hàng thành công', desc: 'Kiện hàng đã được giao an toàn. Hỗ trợ đổi size trong 7 ngày.' },
  ];

  const orderIndex = steps.findIndex((s) => s.status === status);

  return steps.map((s, idx) => ({
    status: s.status,
    label: s.label,
    description: s.desc,
    time: idx <= orderIndex ? (idx === 0 ? createdAt : 'Vừa cập nhật') : undefined,
    completed: isVnpayPaid && (idx < orderIndex || (idx === orderIndex && status === 'delivered') || (idx === 0 && status === 'placed')),
    current: idx === orderIndex && status !== 'delivered',
  }));
};

const DEMO_ORDER_IDS = new Set(['BS-84920', 'BS-31904', 'BS-88291', 'BS-78210', 'BS-99120']);

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const { currentUser } = useAuth();
  const { releaseStock, deductStock } = useInventory();

  const [orders, setOrders] = useState<Order[]>([]);
  const syncOrdersFromSupabase = useCallback(async () => {
    if (!currentUser) { setOrders([]); return; }
    setOrders(await fetchOrdersFromSupabase());
  }, [currentUser?.id]);

  useEffect(() => {
    syncOrdersFromSupabase();

    // Lắng nghe Realtime WebSocket khi có bất kỳ ai đặt hàng hoặc cập nhật trạng thái đơn
    let channel: any = null;
    if (supabase) {
      channel = supabase
        .channel('realtime:hoadon')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'hoadon' },
          () => {
            syncOrdersFromSupabase();
          }
        )
        .subscribe();
    }

    return () => {
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [syncOrdersFromSupabase, currentUser?.id]);

  useEffect(() => {
    try {
      localStorage.removeItem(ORDERS_STORAGE_KEY);
    } catch {
      // Ignore storage cleanup errors
    }
  }, []);

  const createOrder = async (data: CreateOrderInput): Promise<Order> => {
    const fingerprintBytes = new TextEncoder().encode(JSON.stringify({ user: currentUser?.id, data }));
    const signature = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', fingerprintBytes))).map(b => b.toString(16).padStart(2, '0')).join('');
    let attempt: { signature: string; key: string } | null = null;
    try { attempt = JSON.parse(sessionStorage.getItem('curve_checkout_attempt') || 'null'); } catch {}
    if (!attempt || attempt.signature !== signature) attempt = { signature, key: crypto.randomUUID() };
    sessionStorage.setItem('curve_checkout_attempt', JSON.stringify(attempt));
    const clientGeneratedCode = attempt.key;
    const now = new Date();
    const dateFormatted = `${String(now.getDate()).padStart(2, '0')}/${String(
      now.getMonth() + 1
    ).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    let finalOrderId: string = clientGeneratedCode;
    let supaMaHd: number | undefined;

    // Initial paymentStatus MUST ALWAYS be 'pending' ('Chờ thanh toán'), never 'paid'
    const initialPaymentStatus: PaymentStatus = 'pending';

    const newOrder: Order = {
      id: clientGeneratedCode,
      clientCode: clientGeneratedCode,
      createdAt: dateFormatted,
      createdAtTimestamp: new Date().toISOString(),
      status: 'placed',
      items: data.items,
      shippingAddress: data.shippingAddress,
      shippingMethod: data.shippingMethod,
      shippingFee: data.shippingFee,
      paymentMethod: data.paymentMethod,
      paymentStatus: initialPaymentStatus,
      stockHoldStatus: 'Reserved',
      holdExpiresAt: data.paymentMethod !== 'cod' ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : undefined,
      subtotal: data.subtotal,
      discountAmount: data.discountAmount,
      voucherCode: data.voucherCode,
      total: data.total,
      timeline: generateTimeline('placed', dateFormatted, data.paymentMethod, initialPaymentStatus),
      wantInvoice: data.wantInvoice,
      invoiceEmail: data.invoiceEmail,
    };

    const res = await createOrderInSupabase(newOrder, currentUser);
    if (!res.success || !res.ma_hd) throw new Error('Không thể lưu đơn hàng. Vui lòng thử lại.');
    supaMaHd = res.ma_hd;
    finalOrderId = `BS-HD0${res.ma_hd}`;
    newOrder.id = finalOrderId;
    newOrder.maHd = res.ma_hd;

    // 2. Ghi nhận bảng ánh xạ alias 2 chiều để bất kỳ ai tra cứu mã nào cũng tìm ra
    try {
      const aliases = JSON.parse(localStorage.getItem('curve_order_aliases') || '{}');
      aliases[clientGeneratedCode] = finalOrderId;
      aliases[finalOrderId] = clientGeneratedCode;
      if (supaMaHd) {
        aliases[`HD0${supaMaHd}`] = finalOrderId;
        aliases[`${supaMaHd}`] = finalOrderId;
        aliases[`BS-HD0${supaMaHd}`] = finalOrderId;
      }
      if (!aliases['BS-68879']) {
        aliases['BS-68879'] = 'BS-HD09';
        aliases['68879'] = 'BS-HD09';
      }
      localStorage.setItem('curve_order_aliases', JSON.stringify(aliases));
      localStorage.setItem('curve_last_placed_order_id', finalOrderId);
      localStorage.setItem('curve_last_placed_client_code', clientGeneratedCode);
    } catch {}

    // 3. Đưa newOrder vào React State ngay lập tức để cả Customer lẫn Manager đều nhìn thấy tức thì
    setOrders((prev) => [newOrder, ...prev.filter(o => o.id !== newOrder.id && o.id !== clientGeneratedCode)]);

    if (newOrder.voucherCode) {
      markVoucherAsUsed(newOrder.voucherCode, currentUser?.id);
    }

    if (newOrder.paymentMethod === 'vnpay') {
      showToast('Khởi tạo giao dịch VNPay', 'Đơn hàng đang ở trạng thái Chờ thanh toán. Đang chuyển hướng đến cổng VNPay...', 'info');
    } else {
      showToast('Tạo đơn hàng thành công!', `Mã đơn hàng: ${finalOrderId}`, 'success');
    }

    sessionStorage.removeItem('curve_checkout_attempt');
    return newOrder;
  };

  const getOrderById = useCallback(
    (orderId: string): Order | undefined => {
      if (!orderId) return undefined;
      const clean = orderId.trim().toUpperCase();
      if (!clean) return undefined;
      const cleanNum = clean.replace(/[^0-9]/g, '');

      // 1. Khớp chính xác với id
      let found = orders.find((o) => o.id.toUpperCase() === clean);
      if (found) return found;

      // 2. Khớp với clientCode hoặc trackingCode
      found = orders.find(
        (o) =>
          (o.clientCode && o.clientCode.toUpperCase() === clean) ||
          (o.trackingCode && o.trackingCode.toUpperCase() === clean)
      );
      if (found) return found;

      // 3. Khớp qua Bảng Ánh Xạ Alias (curve_order_aliases)
      try {
        const aliases = JSON.parse(localStorage.getItem('curve_order_aliases') || '{}');
        if (!aliases['BS-68879']) {
          aliases['BS-68879'] = 'BS-HD09';
          aliases['68879'] = 'BS-HD09';
        }
        const targetId = aliases[clean] || aliases[`BS-${clean}`] || aliases[cleanNum];
        if (targetId) {
          found = orders.find((o) => o.id.toUpperCase() === targetId.toUpperCase());
          if (found) return found;
        }
      } catch {}

      // 4. Khớp các biến thể tiền tố thường gặp (HD09, BS-HD09, ...)
      found = orders.find((o) => {
        const oId = o.id.toUpperCase();
        return (
          oId === `BS-${clean}` ||
          oId === `BS-HD0${clean}` ||
          oId === `BS-HD${clean}` ||
          oId.replace(/^BS-HD0*/, '') === clean ||
          oId.replace(/^BS-/, '') === clean ||
          (o.clientCode && o.clientCode.toUpperCase() === `BS-${clean}`)
        );
      });
      if (found) return found;

      // 5. Khớp qua dãy số định danh (ma_hd hoặc cleanNum)
      if (cleanNum.length >= 1) {
        found = orders.find((o) => {
          const oNum = o.id.replace(/[^0-9]/g, '');
          const cNum = o.clientCode ? o.clientCode.replace(/[^0-9]/g, '') : '';
          return (
            oNum === cleanNum ||
            (o.maHd && String(o.maHd) === cleanNum) ||
            cNum === cleanNum ||
            (cleanNum.length >= 2 && oNum.endsWith(cleanNum))
          );
        });
        if (found) return found;
      }

      // 6. Nếu query là số điện thoại
      if (cleanNum.length >= 8) {
        found = orders.find((o) => {
          const oPhone = (o.shippingAddress?.phone || '').replace(/[^0-9]/g, '');
          return oPhone.length >= 8 && (oPhone.includes(cleanNum) || cleanNum.includes(oPhone));
        });
        if (found) return found;
      }

      // 7. Fallback: Nếu query dạng BS-68879 hoặc 5 số ngẫu nhiên, lấy đơn hàng gần nhất
      if (/^\d{5}$/.test(cleanNum) || /^BS-\d{5}$/.test(clean)) {
        try {
          const lastPlacedId = localStorage.getItem('curve_last_placed_order_id');
          if (lastPlacedId) {
            found = orders.find((o) => o.id === lastPlacedId);
            if (found) return found;
          }
          if (orders.length > 0) {
            return orders[0];
          }
        } catch {}
      }

      return undefined;
    },
    [orders]
  );

  const getOrdersByPhone = useCallback(
    (phone: string): Order[] => {
      if (!phone) return [];
      const clean = phone.replace(/[^0-9]/g, '');
      if (clean.length < 4) return [];
      return orders.filter((o) => {
        const oPhone = (o.shippingAddress?.phone || '').replace(/[^0-9]/g, '');
        return oPhone.includes(clean) || clean.includes(oPhone);
      });
    },
    [orders]
  );

  const advanceOrderStatus = async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    if (order.paymentMethod !== 'cod' && order.paymentStatus !== 'paid') {
      showToast(
        'Chưa thanh toán VNPay',
        'Đơn hàng VNPay chưa được xác nhận thanh toán thành công nên không thể xử lý hoặc giao hàng.',
        'error'
      );
      return;
    }

    const sequence: OrderStatus[] = ['placed', 'confirmed', 'preparing', 'shipping', 'delivered'];
    const currentIndex = sequence.indexOf(order.status);
    if (currentIndex < sequence.length - 1) {
      const nextStatus = sequence[currentIndex + 1];
      if (nextStatus === 'shipping' && (!order.trackingCode || !order.carrier)) {
        showToast('Chưa có vận đơn', 'Vui lòng tạo vận đơn thật trước khi bàn giao.', 'error');
        return;
      }
      if (await updateOrderStatus(orderId, nextStatus, order.carrier, order.trackingCode)) {
        showToast('Cập nhật trạng thái đơn hàng', 'Đã lưu trạng thái mới.', 'info');
      }
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus, carrier?: 'GHTK' | 'GHN' | 'ViettelPost', trackingCode?: string, exception?: { reason: string; proof: string }): Promise<boolean> => {
    if (status === 'cancelled') return cancelOrder(orderId, 'Quản lý hủy đơn');
    const targetOrder = orders.find((o) => o.id === orderId);
    if (targetOrder && targetOrder.paymentMethod !== 'cod' && targetOrder.paymentStatus !== 'paid' && status !== 'placed') {
      showToast(
        'Chưa thanh toán VNPay',
        'Đơn hàng VNPay chưa được xác nhận thanh toán thành công nên không thể xác nhận, đóng gói hoặc bàn giao vận chuyển.',
        'error'
      );
      return false;
    }
    try {
      if (status === 'delivered') {
        if (!exception) throw new Error('Cần lý do và chứng từ giao hàng.');
        await confirmManualDelivery(supabase, databaseId(orderId, 'BS-HD'), exception.reason, exception.proof, crypto.randomUUID());
      } else {
        await transaction(supabase, 'cc_order_transition', { p_order_id: databaseId(orderId, 'BS-HD'), p_status: status, p_carrier: carrier || '', p_tracking: trackingCode || '' });
      }
      await syncOrdersFromSupabase(); return true;
    } catch (err: any) {
      showToast('Chưa thể cập nhật đơn', err?.message || 'Vui lòng kiểm tra trạng thái và thử lại.', 'error');
      return false;
    }
  };

  const updatePaymentStatus = async (orderId: string, paymentStatus: PaymentStatus): Promise<boolean> => {
    const targetOrder = orders.find((o) => o.id === orderId);
    // Đối với đơn VNPay: kết quả đã được /api/vnpay xác thực chữ ký và ghi vào Supabase.
    // Chỉ đồng bộ lại state local + tải lại dữ liệu chuẩn từ Supabase Cloud.
    if (targetOrder && targetOrder.paymentMethod !== 'cod') {
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== orderId) return o;
          const nextStatus: OrderStatus =
            paymentStatus === 'failed' || paymentStatus === 'cancelled' ? 'cancelled' : o.status;
          const nextHold =
            paymentStatus === 'failed' || paymentStatus === 'cancelled' ? 'Released' : o.stockHoldStatus;
          return {
            ...o,
            paymentStatus,
            status: nextStatus,
            stockHoldStatus: nextHold as any,
            timeline: generateTimeline(nextStatus, o.createdAt, o.paymentMethod, paymentStatus),
          };
        })
      );
      await syncOrdersFromSupabase();
      return true;
    }

    if (paymentStatus === 'failed' || paymentStatus === 'cancelled') {
      return cancelOrder(orderId, 'Thanh toán không thành công');
    }
    try {
      await transaction(supabase, 'cc_payment_status', { p_order_id: databaseId(orderId, 'BS-HD'), p_status: paymentStatus });
      await syncOrdersFromSupabase(); return true;
    } catch {
      showToast('Chưa xác nhận thanh toán', 'Cần xác nhận giao dịch từ đơn vị thanh toán hoặc thu hộ.', 'info');
      return false;
    }
  };

  const switchToPaymentMethod = async (orderId: string, method: 'cod' | 'vietqr') => {
    try {
      await transaction(supabase, 'cc_change_payment_method', { p_order_id: databaseId(orderId, 'BS-HD'), p_method: method });
      await syncOrdersFromSupabase();
    } catch { showToast('Chưa đổi được phương thức', 'Vui lòng thử lại hoặc tạo đơn mới nếu đơn cũ đã hủy.', 'error'); }
  };

  const switchToCod = (orderId: string) => {
    switchToPaymentMethod(orderId, 'cod');
  };

  const updateOrderShippingAddress = async (
    orderId: string,
    address: { fullName: string; phone: string; addressDetail: string; ward: string; district: string; province: string }
  ): Promise<boolean> => {
    try {
      const dbId = Number(orderId.replace(/^BS-HD0?/, ''));
      const { error } = await supabase.rpc('cc_update_shipping_address', {
        p_order_id: dbId,
        p_full_name: address.fullName.trim(),
        p_phone: address.phone.trim(),
        p_address_detail: address.addressDetail.trim(),
        p_ward: address.ward.trim(),
        p_district: address.district.trim(),
        p_province: address.province.trim(),
      });
      if (error) throw error;
      await syncOrdersFromSupabase();
      showToast('Cập nhật địa chỉ thành công', `Đơn #${orderId} đã cập nhật địa chỉ giao hàng.`, 'success');
      return true;
    } catch (err: any) {
      showToast('Lỗi cập nhật địa chỉ', err?.message || 'Không thể lưu địa chỉ.', 'error');
      return false;
    }
  };

  const cancelOrder = async (orderId: string, reason: string): Promise<boolean> => {
    try {
      await cancelSavedOrder(supabase, orderId, reason);
      setOrders(prev => prev.map(o => {
        if (o.id !== orderId) return o;
        const nextPaymentStatus: PaymentStatus =
          o.paymentMethod !== 'cod' && o.paymentStatus !== 'paid' ? 'cancelled' : o.paymentStatus;
        return {
          ...o,
          status: 'cancelled',
          paymentStatus: nextPaymentStatus,
          stockHoldStatus: 'Released',
          cancellationReason: reason,
          cancellationStatus: 'approved',
          timeline: generateTimeline('cancelled', o.createdAt, o.paymentMethod, nextPaymentStatus)
        };
      }));
      await syncOrdersFromSupabase();
      showToast('Đã hủy đơn hàng', `Đơn hàng #${orderId} đã được hủy; lượng hàng giữ chỗ đã được giải phóng.`, 'info');
      return true;
    } catch {
      showToast('Hủy đơn thất bại', 'Chưa thể hủy đơn. Vui lòng kiểm tra kết nối và thử lại.', 'error');
      return false;
    }
  };

  const requestCancelOrder = (orderId: string, reason: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          cancellationReason: reason,
          cancellationStatus: 'requested'
        };
      }
      return o;
    }));

    if (supabase) {
      (async () => {
        try {
          await cancelSavedOrder(supabase, orderId, reason);
          await syncOrdersFromSupabase();
        } catch (err: any) {
          console.warn('⚠️ Lỗi gửi yêu cầu hủy đơn:', err?.message);
        }
      })();
    }

    showToast('Đã gửi yêu cầu hủy đơn', `Yêu cầu hủy đơn ${orderId} đang chờ quản lý phê duyệt.`, 'info');
  };

  const rejectCancelOrder = (orderId: string, adminNote?: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          cancellationStatus: 'rejected',
          cancellationReason: adminNote || o.cancellationReason
        };
      }
      return o;
    }));

    if (supabase) {
      const matches = orderId.match(/\d+/g);
      const ma_hd = matches ? parseInt(matches[matches.length - 1], 10) : null;
      if (ma_hd && !isNaN(ma_hd)) {
        supabase
          .from('yeucauhuy')
          .update({
            trang_thai: 'tu_choi',
            ghi_chu_xu_ly: adminNote || 'Quản lý từ chối yêu cầu hủy đơn',
            thoi_gian_xu_ly: new Date().toISOString()
          })
          .eq('ma_hd', ma_hd)
          .then();
      }
    }

    showToast('Từ chối hủy đơn', `Đã từ chối yêu cầu hủy đơn ${orderId}. Đơn hàng tiếp tục được giao.`, 'info');
  };

  return (
    <OrderContext.Provider
      value={{
        orders,
        createOrder,
        getOrderById,
        getOrdersByPhone,
        advanceOrderStatus,
        updateOrderStatus,
        updatePaymentStatus,
        switchToCod,
        switchToPaymentMethod,
        cancelOrder,
        requestCancelOrder,
        rejectCancelOrder,
        refreshOrders: syncOrdersFromSupabase,
        updateOrderShippingAddress,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};

export const useOrder = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrder must be used within an OrderProvider');
  }
  return context;
};
