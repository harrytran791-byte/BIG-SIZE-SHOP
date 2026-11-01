// Every business mutation below is one server transaction. Never fall back to local success.
import {
  normalizeFullName,
  validateFullName,
  validateVietnamesePhone,
  validateShippingAddressInput
} from '../utils/userInputValidation';

type Client = { rpc: (name: string, args?: Record<string, unknown>) => PromiseLike<{ data: any; error: any }> };
const message = 'Không thể hoàn tất thao tác. Vui lòng kiểm tra kết nối và thử lại.';
export const databaseId = (value: string, prefix: string): number => {
  const match = value.match(new RegExp(`^${prefix}(\\d+)$`));
  const id = match ? Number(match[1]) : NaN;
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Mã dữ liệu không hợp lệ.');
  return id;
};
export async function transaction(client: Client, name: string, args: Record<string, unknown>) {
  let finalArgs = { ...args };
  if (name === 'cc_update_profile') {
    const rawName = String(finalArgs.p_name ?? '');
    const rawPhone = String(finalArgs.p_phone ?? '');
    const nameError = validateFullName(rawName, 'Họ và tên');
    if (nameError) throw new Error(nameError);
    const phoneError = validateVietnamesePhone(rawPhone);
    if (phoneError) throw new Error(phoneError);
    finalArgs = {
      ...finalArgs,
      p_name: normalizeFullName(rawName),
      p_phone: rawPhone
    };
  }
  const { data, error } = await client.rpc(name, finalArgs);
  if (error) {
    const rawMsg = error.message || '';
    const code = error.code;
    if (rawMsg.includes('Invalid profile')) {
      throw new Error('Thông tin cá nhân không hợp lệ. Vui lòng kiểm tra lại họ và tên (2-100 ký tự) và số điện thoại Việt Nam (10 chữ số).');
    }
    if (rawMsg.includes('Account has dependencies; lock instead')) {
      throw new Error('Tài khoản còn liên kết đăng nhập hoặc dữ liệu nghiệp vụ nên chưa thể xóa vĩnh viễn. Hãy khóa tài khoản để ngừng truy cập và giữ nguyên lịch sử.');
    }
    if (rawMsg.includes('Protected account')) {
      throw new Error('Không thể thay đổi hoặc xóa tài khoản quản trị được bảo vệ hay tài khoản đang đăng nhập.');
    }
    if (rawMsg.includes('Stock changed; refresh before counting')) {
      throw new Error('Tồn kho vừa thay đổi. Vui lòng tải lại số lượng trước khi xác nhận kiểm kê.');
    }
    if (rawMsg.includes('Held stock or reason invalid')) {
      throw new Error('Số lượng kiểm kê không được thấp hơn lượng hàng đang giữ cho đơn; khi có chênh lệch cần nhập lý do.');
    }
    if (rawMsg.includes('Employee profile missing')) {
      throw new Error('Tài khoản quản lý chưa có hồ sơ nhân viên hợp lệ. Vui lòng liên hệ quản trị viên.');
    }
    if (rawMsg.includes('SKU missing')) throw new Error('Biến thể sản phẩm không còn khả dụng. Vui lòng tải lại danh sách.');
    if (code === '23503' || rawMsg.includes('Stock history must be retained')) {
      throw new Error('Dữ liệu đang được sử dụng trong lịch sử nghiệp vụ nên chưa thể xóa. Hãy ngừng sử dụng hoặc khóa thay vì xóa vĩnh viễn.');
    }
    if (code === '23505') throw new Error('Thông tin đã tồn tại. Vui lòng kiểm tra lại trước khi lưu.');
    if (code === 'PGRST202' || code === '42883') {
      throw new Error('Chức năng máy chủ chưa được cập nhật đầy đủ. Vui lòng liên hệ quản trị viên để đồng bộ hệ thống.');
    }
    if (rawMsg.includes('Request conflict') || rawMsg.includes('Idempotency key reused')) {
      throw new Error('Thông tin đã thay đổi so với lần xác nhận trước. Vui lòng tải lại và xác nhận lại thao tác.');
    }
    if (rawMsg.includes('Forbidden') || code === '42501' || code === 'PGRST301') {
      throw new Error('Phiên đăng nhập không có quyền thực hiện thao tác này. Vui lòng đăng nhập lại bằng đúng vai trò.');
    }
    if (rawMsg.includes('Invalid shipping address')) {
      throw new Error('Địa chỉ hoặc số điện thoại nhận hàng không hợp lệ (Số điện thoại cần từ 10 chữ số).');
    }
    if (rawMsg.includes('Insufficient stock')) {
      throw new Error('Số lượng sản phẩm trong kho không đủ để đáp ứng đơn hàng.');
    }
    if (rawMsg.includes('Voucher unavailable')) {
      throw new Error('Mã ưu đãi không hợp lệ, chưa đến ngày áp dụng hoặc đã hết hạn.');
    }
    if (rawMsg.includes('Price changed; reload checkout')) {
      throw new Error('Giá sản phẩm hoặc phí vận chuyển đã thay đổi. Vui lòng tải lại trang thanh toán.');
    }
    if (rawMsg.includes('Invalid quantity')) {
      throw new Error('Số lượng đặt hàng không hợp lệ.');
    }
    if (rawMsg.includes('Online order requires confirmed payment') || rawMsg.includes('Online payment requires gateway verification')) {
      throw new Error('Đơn hàng VNPay chưa được xác nhận thanh toán thành công nên không thể xác nhận, đóng gói hoặc bàn giao vận chuyển.');
    }
    if (rawMsg.includes('Authentication required')) {
      throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.');
    }
    throw new Error(message);
  }
  if (!data || data.success !== true) throw new Error(message);
  return data;
}
export function variantSku(item: any): string {
  const sku = item.sku || item.product?.variants?.find((v: any) => v.size === item.size && v.colorName === item.colorName)?.sku;
  if (typeof sku !== 'string' || !sku.trim() || sku.length > 100) {
    const name = item.product?.name || 'Sản phẩm';
    throw new Error(`Sản phẩm "${name}" (Size ${item.size || ''} - ${item.colorName || ''}) chưa có mã SKU hợp lệ trong kho. Vui lòng kiểm tra lại giỏ hàng.`);
  }
  return sku;
}
export async function placeOrder(client: Client, order: any, requestId: string) {
  if (!order.items?.length) throw new Error('Giỏ hàng đang trống.');
  const shippingErrors = validateShippingAddressInput(order.shippingAddress || {}, {
    requireEmail: false,
    requireWard: false
  });
  const firstShippingError = Object.values(shippingErrors)[0];
  if (firstShippingError) {
    throw new Error(firstShippingError);
  }
  const normalizedShipping = {
    ...order.shippingAddress,
    fullName: normalizeFullName(order.shippingAddress?.fullName),
    phone: String(order.shippingAddress?.phone ?? '').trim(),
    addressDetail: String(order.shippingAddress?.addressDetail ?? '').trim(),
    ward: String(order.shippingAddress?.ward ?? '').trim(),
    district: String(order.shippingAddress?.district ?? '').trim(),
    province: String(order.shippingAddress?.province ?? '').trim()
  };
  const items = order.items.map((item: any) => {
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) throw new Error('Số lượng không hợp lệ.');
    return { sku: variantSku(item), quantity: item.quantity };
  });
  return transaction(client, 'cc_place_order', { p_request_id: requestId, p_items: items,
    p_shipping: normalizedShipping, p_method: order.paymentMethod === 'cod' ? 'COD' : 'vnpay', p_voucher: order.voucherCode || null,
    p_shipping_method: order.shippingMethod || 'standard', p_expected_total: order.total });
}
export async function cancelSavedOrder(client: Client, id: string, reason: string) {
  if (!reason.trim() || reason.length > 1000) throw new Error('Vui lòng nhập lý do tối đa 1.000 ký tự.');
  return transaction(client, 'cc_cancel_order', { p_order_id: databaseId(id, 'BS-HD'), p_reason: reason.trim() });
}
export async function submitReturn(client: Client, input: any, requestId: string) {
  if (!input.items?.length) throw new Error('Vui lòng chọn sản phẩm cần đổi trả.');
  const items = input.items.map((item: any) => {
    if (!Number.isSafeInteger(item.orderItemId) || item.orderItemId <= 0 || !Number.isSafeInteger(item.quantity) || item.quantity < 1)
      throw new Error('Thông tin sản phẩm đổi trả không hợp lệ.');
    return { order_item_id: item.orderItemId, quantity: item.quantity, requested_size: item.requestedSize || null };
  });
  return transaction(client, 'cc_create_return', { p_request_id: requestId, p_order_id: databaseId(input.orderId, 'BS-HD'),
    p_type: input.type === 'exchange_size' ? 'doi_size' : 'tra_hang', p_items: items,
    p_reason: input.reason, p_note: input.reasonDetail || '', p_images: input.images || [], p_video: input.videoUrl || null });
}
