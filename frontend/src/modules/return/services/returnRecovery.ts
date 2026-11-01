import type { ReturnRequest } from '@/shared/types';
import { databaseId, transaction } from '@/shared/services/transactionService';

type Client = { rpc: (name: string, args?: Record<string, unknown>) => PromiseLike<{ data: any; error: any }> };
export type RecoveryAction = 'request_info' | 'repair' | 'close' | 'disposition' | 'customer_submit';
export interface RecoveryItem { order_item_id: number; quantity: number; target_variant_id: number | null }
export interface RecoveryInput {
  action: RecoveryAction; expected: string; note: string; customerVerified: boolean; items: RecoveryItem[];
}
export interface RecoverySnapshot {
  success: true; revision: string; status: string; received: boolean; type: string; tracking_code?: string;
  recovery: { state?: string; note?: string }; items: RecoveryItem[];
  order_items: { order_item_id: number; name: string; size: string; color: string; quantity: number; remaining: number;
    variants: { variant_id: number; size: string; available: number }[] }[];
}
export async function loadReturnRecovery(client: Client, id: string): Promise<RecoverySnapshot> {
  return transaction(client, 'cc_return_recovery_snapshot', { p_return_id: databaseId(id, 'RET-') });
}
export async function saveReturnRecovery(client: Client, id: string, input: RecoveryInput, key: string): Promise<RecoverySnapshot> {
  if (!input.expected || input.note.trim().length < 5 || input.note.length > 1000) throw new Error('Nhập nội dung xác minh từ 5 đến 1.000 ký tự.');
  if ((input.action === 'repair' || input.action === 'customer_submit')) {
    if (!input.customerVerified) throw new Error('Cần xác nhận đã đối chiếu lựa chọn với khách hàng.');
    if (!input.items.length || new Set(input.items.map(i => i.order_item_id)).size !== input.items.length || input.items.some(i =>
      !Number.isSafeInteger(i.order_item_id) || i.order_item_id < 1 || !Number.isSafeInteger(i.quantity) || i.quantity < 1 ||
      (i.target_variant_id !== null && (!Number.isSafeInteger(i.target_variant_id) || i.target_variant_id < 1)))) throw new Error('Vui lòng chọn đúng sản phẩm, số lượng và size đã xác minh.');
  }
  const result = await transaction(client, 'cc_manage_return_recovery', {
    p_return_id: databaseId(id, 'RET-'), p_action: input.action, p_expected: input.expected,
    p_note: input.note.trim(), p_customer_verified: input.customerVerified, p_items: input.items, p_key: key
  });
  const snapshot = await loadReturnRecovery(client, id);
  if (!result.revision || snapshot.revision !== result.revision) throw new Error('Hồ sơ vừa thay đổi hoặc chưa đọc lại được. Vui lòng tải lại trước khi tiếp tục.');
  if ((input.action === 'repair' || input.action === 'customer_submit') && (snapshot.items.length !== input.items.length || input.items.some(item => !snapshot.items.some(saved =>
    saved.order_item_id === item.order_item_id && saved.quantity === item.quantity && saved.target_variant_id === item.target_variant_id)))) {
    throw new Error('Chưa xác minh được chi tiết đã lưu. Vui lòng tải lại hồ sơ.');
  }
  return snapshot;
}

export function needsReturnRecovery(request: Pick<ReturnRequest, 'type' | 'items'>): boolean {
  return !request.items?.length || request.items.some(item =>
    !item.returnDetailId || !item.orderItemId || !Number.isSafeInteger(item.quantity) || item.quantity < 1 ||
    (request.type === 'exchange_size' && !item.requestedSize));
}
