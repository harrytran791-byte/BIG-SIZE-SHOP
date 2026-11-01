/**
 * Giao Hàng Nhanh (GHN Express) 3PL Gateway Integration Service
 * Credentials and provider requests live exclusively in the server gateway api/ghn.js.
 * - Tuyệt đối không sinh mock data / mã giả khi mất mạng hoặc API lỗi
 * - Tuyệt đối không tự suy đoán trạng thái phát hàng thành công
 */

import { Order, OrderStatus } from '@/shared/types';
import { supabase } from './supabaseClient';

export interface GhnTrackingEvent {
  status: string;
  statusText: string;
  time?: string;
  location?: string;
  description: string;
}

export interface GhnOrderDetailResponse {
  orderCode: string;
  clientOrderCode?: string;
  status: string;
  statusText: string;
  leadtime?: string;
  createdDate?: string;
  updatedDate?: string;
  totalFee?: number;
  codAmount?: number;
  isCodCollected?: boolean;
  history?: GhnTrackingEvent[];
}

/**
 * Bản đồ chuyển đổi trạng thái từ GHN sang trạng thái chuẩn của hệ thống Curve & Confidence
 */
export const mapGhnStatusToSystemStatus = (ghnStatus: string): OrderStatus => {
  const s = (ghnStatus || '').toLowerCase();
  switch (s) {
    case 'ready_to_pick':
    case 'picking':
    case 'money_collect_picking':
      return 'preparing';
    case 'picked':
    case 'storing':
    case 'sorting':
    case 'transporting':
    case 'delivering':
    case 'money_collect_delivering':
      return 'shipping';
    case 'delivered':
      return 'delivered';
    case 'cancel':
      return 'cancelled';
    default:
      return 'shipping';
  }
};

/**
 * Lấy mô tả tiếng Việt thân thiện theo chuẩn bưu cục GHN
 */
export const getGhnStatusDescription = (ghnStatus: string): { label: string; description: string; stepIndex: number } => {
  const s = (ghnStatus || '').toLowerCase();
  switch (s) {
    case 'ready_to_pick':
      return {
        label: 'Chờ bưu tá lấy hàng',
        description: 'Đơn hàng đã được tiếp nhận, đang điều phối bưu tá đến kho shop lấy hàng.',
        stepIndex: 1,
      };
    case 'picking':
      return {
        label: 'Bưu tá đang lấy hàng',
        description: 'Tài xế GHN đang trên đường di chuyển đến kho shop nhận bưu kiện.',
        stepIndex: 1,
      };
    case 'picked':
      return {
        label: 'Đã lấy hàng thành công',
        description: 'Bưu tá GHN đã quét mã và nhận kiện hàng từ kho Curve & Confidence.',
        stepIndex: 2,
      };
    case 'storing':
    case 'sorting':
      return {
        label: 'Đang xử lý tại bưu cục',
        description: 'Bưu kiện đã nhập kho trung chuyển GHN và đang được phân loại tự động.',
        stepIndex: 2,
      };
    case 'transporting':
      return {
        label: 'Đang luân chuyển kho',
        description: 'Kiện hàng đang được xe tải chuyên dụng vận chuyển đến bưu cục phát gần bạn nhất.',
        stepIndex: 2,
      };
    case 'delivering':
    case 'money_collect_delivering':
      return {
        label: 'Bưu tá đang giao hàng',
        description: 'Shipper GHN đang trên tuyến đường giao hàng đến địa chỉ người nhận. Vui lòng để ý điện thoại!',
        stepIndex: 3,
      };
    case 'delivered':
      return {
        label: 'Giao hàng thành công',
        description: 'Kiện hàng đã được phát thành công đến người nhận. Cảm ơn bạn đã mua sắm tại Curve & Confidence!',
        stepIndex: 4,
      };
    case 'delivery_fail':
      return {
        label: 'Giao hàng chưa thành công',
        description: 'Không liên hệ được người nhận hoặc hẹn giao lại vào ca kế tiếp.',
        stepIndex: 3,
      };
    case 'cancel':
      return {
        label: 'Đơn giao hàng đã hủy',
        description: 'Yêu cầu vận chuyển đã được hủy trên hệ thống GHN.',
        stepIndex: 0,
      };
    default:
      return {
        label: 'Đang vận chuyển qua GHN',
        description: 'Kiện hàng đang được xử lý trong mạng lưới giao vận GHN Express.',
        stepIndex: 2,
      };
  }
};

/**
 * 1. Tự động tạo đơn hàng vận chuyển sang GHN (POST /v2/shipping-order/create)
 * Kiểm tra dữ liệu thực tế, từ chối khi thiếu dữ liệu hoặc kết nối thất bại, TUYỆT ĐỐI KHÔNG MOCK
 */
class GhnGatewayError extends Error {
  constructor(message: string, public readonly confirmed?: boolean) { super(message); }
}

async function requestGateway(action: 'create' | 'create_exchange' | 'tracking', orderId: string, region?: { ward: string; district: string; province: string }, returnId?: number) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Vui lòng đăng nhập lại để sử dụng dịch vụ vận chuyển.');
  const response = await fetch('/api/ghn', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, orderId, region, returnId }), signal: AbortSignal.timeout(45000),
  });
  const result = await response.json();
  if (!response.ok || result.success !== true) throw new GhnGatewayError(result.errorMessage || 'Dịch vụ vận chuyển hiện chưa sẵn sàng.', typeof result.confirmed === 'boolean' ? result.confirmed : undefined);
  return result;
}

export const createGhnShippingOrder = async (order: Order): Promise<{
  success: boolean; orderCode?: string; totalFee?: number; expectedDelivery?: string; errorMessage?: string; confirmed?: boolean;
}> => {
  if (!order.shippingAddress?.phone || !order.shippingAddress?.addressDetail) {
    return { success: false, errorMessage: 'Vui lòng bổ sung số điện thoại và địa chỉ nhận hàng hợp lệ.' };
  }
  try {
    return await requestGateway('create', order.id, {
      ward: order.shippingAddress.ward, district: order.shippingAddress.district, province: order.shippingAddress.province,
    });
  } catch (error) {
    return { success: false, confirmed: error instanceof GhnGatewayError ? error.confirmed : undefined, errorMessage: error instanceof Error ? error.message : 'Không thể tạo vận đơn. Vui lòng thử lại sau.' };
  }
};

export const getGhnOrderTracking = async (_trackingCode: string, orderId?: string): Promise<GhnOrderDetailResponse | null> => {
  if (!orderId) return null;
  try {
    const result = await requestGateway('tracking', orderId);
    if (!result.data?.status) return null;
    return { ...result.data, statusText: getGhnStatusDescription(result.data.status).label };
  } catch {
    return null;
  }
};

export const createGhnExchangeShippingOrder = async (orderId: string, returnId: number): Promise<{
  success: boolean; orderCode?: string; errorMessage?: string;
}> => {
  if (!Number.isSafeInteger(returnId) || returnId < 1) return { success: false, errorMessage: 'Hồ sơ đổi hàng không hợp lệ.' };
  try {
    return await requestGateway('create_exchange', orderId, undefined, returnId);
  } catch (error) {
    return { success: false, errorMessage: error instanceof Error ? error.message : 'Chưa thể tạo vận đơn đổi hàng. Vui lòng thử lại sau.' };
  }
};

export const syncCarrierOrders = async (): Promise<{
  success: boolean; synced?: number; failed?: number; errorMessage?: string;
}> => {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return { success: false, errorMessage: 'Vui lòng đăng nhập lại.' };
    const response = await fetch('/api/ghn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'sync' }),
      signal: AbortSignal.timeout(30000),
    });
    const result = await response.json();
    return result;
  } catch (error) {
    return { success: false, errorMessage: error instanceof Error ? error.message : 'Chưa thể đồng bộ vận đơn. Vui lòng thử lại sau.' };
  }
};

export interface GhnCalculateFeeResult {
  success: boolean;
  fee?: number;
  serviceFee?: number;
  insuranceFee?: number;
  errorMessage?: string;
}

export const calculateGhnShippingFee = async (
  region: { province: string; district: string; ward: string },
  weight = 500,
  insuranceValue = 0
): Promise<GhnCalculateFeeResult> => {
  if (!region?.province || !region?.district || !region?.ward) {
    return { success: false, errorMessage: 'Vui lòng chọn đầy đủ Tỉnh/Thành, Quận/Huyện, Phường/Xã.' };
  }
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return { success: false, errorMessage: 'Vui lòng đăng nhập lại để tính cước phí.' };

    const response = await fetch('/api/ghn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        action: 'calculate_fee',
        region,
        weight,
        insuranceValue
      }),
      signal: AbortSignal.timeout(15000),
    });

    const result = await response.json();
    if (!response.ok || result.success !== true) {
      return { success: false, errorMessage: result.errorMessage || 'Không thể tính phí vận chuyển từ GHN.' };
    }

    return {
      success: true,
      fee: result.fee,
      serviceFee: result.serviceFee,
      insuranceFee: result.insuranceFee
    };
  } catch (err: any) {
    return { success: false, errorMessage: err?.message || 'Lỗi kết nối tới dịch vụ tính cước GHN.' };
  }
};

export const ghnService = {
  createShippingOrder: createGhnShippingOrder,
  createExchangeShippingOrder: createGhnExchangeShippingOrder,
  getOrderTracking: getGhnOrderTracking,
  calculateShippingFee: calculateGhnShippingFee,
  syncOrders: syncCarrierOrders,
  mapStatus: mapGhnStatusToSystemStatus,
  getStatusDescription: getGhnStatusDescription,
};
