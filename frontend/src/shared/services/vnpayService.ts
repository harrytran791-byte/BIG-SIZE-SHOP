/**
 * VNPay Payment Gateway Service
 * Bảo mật: Chuyển toàn bộ thao tác ký & xác thực HMAC-SHA512 sang Serverless Function /api/vnpay
 * Tuyệt đối không để lộ mã bí mật Hash Secret ở Client hay Build Bundle
 */

import { supabase } from './supabaseClient';
import type { PaymentStatus } from '../types';

export const VNPAY_CONFIG = {
  vnp_Version: '2.1.0',
  vnp_Command: 'pay',
  vnp_TmnCode: 'X23LQ8KA',
  vnp_PayUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  vnp_CurrCode: 'VND',
  vnp_Locale: 'vn',
  vnp_OrderType: 'other',
};

/**
 * Thông tin thẻ ATM nội địa mẫu của ngân hàng NCB dùng để test trên cổng Sandbox
 */
export const VNPAY_TEST_CARD = {
  bank: 'NCB (Ngân hàng Quốc Dân)',
  cardNumber: '9704198526191432198',
  cardHolder: 'NGUYEN VAN A',
  issueDate: '07/15',
  otp: '123456',
};

export interface VNPayVerifyResult {
  isValid: boolean;
  isSuccess: boolean;
  isCancelled?: boolean;
  alreadyConfirmed?: boolean;
  orderId?: string;
  amount?: number;
  responseCode?: string;
  transactionStatus?: string;
  transactionNo?: string;
  bankCode?: string;
  paymentStatus?: PaymentStatus;
  orderStatus?: string;
  stockHoldStatus?: string;
  message?: string;
}

/**
 * Gọi Serverless Function /api/vnpay để tạo URL thanh toán VNPay có chữ ký HMAC bảo mật từ Server
 */
export const createVNPayPaymentUrl = async (
  orderId: string | number,
  _amount?: number,
  _orderInfo?: string,
  returnUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/order-success`,
  retry = false
): Promise<{ success: boolean; paymentUrl?: string; holdExpiresAt?: string; errorMessage?: string }> => {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) {
      return { success: false, errorMessage: 'Vui lòng đăng nhập lại để tiếp tục thanh toán VNPay.' };
    }

    const res = await fetch('/api/vnpay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'create',
        orderId: String(orderId),
        returnUrl,
        retry,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success || !data.paymentUrl) {
      return {
        success: false,
        errorMessage: data.errorMessage || 'Không thể tạo phiên thanh toán VNPay. Vui lòng thử lại.',
      };
    }

    return {
      success: true,
      paymentUrl: data.paymentUrl,
      holdExpiresAt: data.holdExpiresAt,
    };
  } catch (err: any) {
    console.error('⚠️ Lỗi gọi serverless VNPay create:', err);
    return {
      success: false,
      errorMessage: 'Không thể kết nối cổng thanh toán VNPay. Vui lòng kiểm tra đường truyền.',
    };
  }
};

/**
 * Gọi Serverless Function /api/vnpay để xác minh chữ ký bảo mật và cập nhật kết quả giao dịch từ VNPay callback
 */
export const verifyVNPayCallback = async (
  searchParamsOrQuery: URLSearchParams | string,
  orderId: string
): Promise<VNPayVerifyResult> => {
  try {
    const queryString =
      typeof searchParamsOrQuery === 'string'
        ? searchParamsOrQuery.replace(/^\?/, '')
        : searchParamsOrQuery.toString();

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch('/api/vnpay', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'verify',
        orderId,
        query: queryString,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        isValid: false,
        isSuccess: false,
        message: data.errorMessage || 'Lỗi xác minh kết quả thanh toán VNPay',
      };
    }

    return {
      isValid: Boolean(data.isValid),
      isSuccess: Boolean(data.isSuccess),
      isCancelled: Boolean(data.isCancelled || data.responseCode === '24'),
      alreadyConfirmed: Boolean(data.alreadyConfirmed),
      orderId: data.orderId,
      amount: data.amount,
      responseCode: data.responseCode,
      transactionStatus: data.transactionStatus,
      transactionNo: data.transactionNo,
      paymentStatus: data.paymentStatus,
      orderStatus: data.orderStatus,
      stockHoldStatus: data.stockHoldStatus,
      message: data.errorMessage || data.message,
    };
  } catch (err: any) {
    console.error('⚠️ Lỗi gọi serverless VNPay verify:', err);
    return {
      isValid: false,
      isSuccess: false,
      message: 'Không thể kết nối máy chủ xác minh thanh toán VNPay',
    };
  }
};

/**
 * Đối soát trạng thái đơn hàng chờ thanh toán VNPay & giải phóng tồn kho nếu quá thời hạn giữ hàng 15 phút
 */
export const syncPendingVNPayOrder = async (
  orderId: string
): Promise<{
  success: boolean;
  expired?: boolean;
  paymentStatus?: PaymentStatus;
  orderStatus?: string;
  stockHoldStatus?: string;
  holdExpiresAt?: string | null;
  transactionNo?: string | null;
}> => {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch('/api/vnpay', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'sync_pending',
        orderId,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) return { success: false };
    return {
      success: true,
      expired: Boolean(data.expired),
      paymentStatus: data.paymentStatus,
      orderStatus: data.orderStatus,
      stockHoldStatus: data.stockHoldStatus,
      holdExpiresAt: data.holdExpiresAt,
      transactionNo: data.transactionNo,
    };
  } catch {
    return { success: false };
  }
};

/**
 * Khách hàng chủ động hủy thanh toán VNPay cho đơn hàng đang chờ thanh toán -> Giải phóng Reserved Stock
 */
export const cancelPendingVNPayPayment = async (
  orderId: string,
  reason?: string
): Promise<{
  success: boolean;
  paymentStatus?: PaymentStatus;
  orderStatus?: string;
  message?: string;
  errorMessage?: string;
}> => {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) {
      return {
        success: false,
        message: 'Vui lòng đăng nhập để hủy thanh toán.',
        errorMessage: 'Vui lòng đăng nhập để hủy thanh toán.',
      };
    }

    const res = await fetch('/api/vnpay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'cancel_payment',
        orderId,
        reason,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      const msg = data.errorMessage || data.message || 'Không thể hủy giao dịch lúc này.';
      return {
        success: false,
        message: msg,
        errorMessage: msg,
      };
    }
    return {
      success: true,
      paymentStatus: data.paymentStatus || 'cancelled',
      orderStatus: data.orderStatus || 'Cancelled',
      message: data.message,
    };
  } catch {
    return {
      success: false,
      message: 'Lỗi kết nối máy chủ khi hủy thanh toán.',
      errorMessage: 'Lỗi kết nối máy chủ khi hủy thanh toán.',
    };
  }
};

export const vnpayService = {
  config: VNPAY_CONFIG,
  testCard: VNPAY_TEST_CARD,
  createPaymentUrl: createVNPayPaymentUrl,
  verifyCallback: verifyVNPayCallback,
  syncPendingOrder: syncPendingVNPayOrder,
  cancelPendingPayment: cancelPendingVNPayPayment,
};
