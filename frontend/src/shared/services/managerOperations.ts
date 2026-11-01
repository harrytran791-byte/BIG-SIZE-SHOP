import { transaction } from './transactionService';

type Client = Parameters<typeof transaction>[0];
export async function requireManagerProtocol(client: Client) {
  const value = await transaction(client, 'cc_manager_capabilities', {});
  if (value.version !== 1) throw new Error('Chức năng chưa sẵn sàng. Vui lòng liên hệ quản trị viên.');
}
export async function countInventory(client: Client, sku: string, actual: number, expected: number, reason: string, key: string) {
  if (!sku.trim() || sku.length > 100 || !Number.isSafeInteger(actual) || actual < 0 || actual > 2147483647
    || !Number.isSafeInteger(expected) || expected < 0 || reason.length > 2000 || (actual !== expected && !reason.trim()) || !key)
    throw new Error('Số lượng hoặc lý do kiểm kê chưa hợp lệ.');
  await requireManagerProtocol(client);
  return transaction(client, 'cc_inventory_count', { p_key: key, p_sku: sku, p_actual: actual, p_expected: expected, p_reason: reason.trim() });
}
export async function confirmManualDelivery(client: Client, orderId: number, reason: string, proof: string, key: string) {
  if (!Number.isSafeInteger(orderId) || orderId < 1 || reason.trim().length < 5 || reason.length > 1000
    || proof.trim().length < 3 || proof.length > 500 || !key) throw new Error('Vui lòng nhập lý do và mã chứng từ hợp lệ.');
  await requireManagerProtocol(client);
  return transaction(client, 'cc_manager_delivery', { p_order_id: orderId, p_reason: reason.trim(), p_proof: proof.trim(), p_key: key });
}
export async function sendExchange(client: Client, id: number, tracking: string, carrier: string, key: string) {
  if (!['GHN', 'GHTK'].includes(carrier) || tracking.trim().length < 3 || tracking.length > 100 || !key)
    throw new Error('Thông tin giao hàng đổi chưa hợp lệ.');
  await requireManagerProtocol(client);
  return transaction(client, 'cc_manager_exchange', { p_return_id: id, p_tracking: tracking.trim(), p_carrier: carrier, p_key: key });
}

export const measurementFields = ['min_chieu_cao', 'max_chieu_cao', 'min_can_nang', 'max_can_nang',
  'min_vong_nguc', 'max_vong_nguc', 'min_vong_eo', 'max_vong_eo', 'min_vong_hong', 'max_vong_hong'] as const;
export type Measurements = Record<typeof measurementFields[number], number | null>;
export function validateMeasurements(input: Measurements) {
  for (let i = 0; i < measurementFields.length; i += 2) {
    const min = input[measurementFields[i]], max = input[measurementFields[i + 1]];
    if ((min == null) !== (max == null) || (min != null && max != null
      && (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max > 999.9 || min > max
        || Math.abs(min * 10 - Math.round(min * 10)) > 1e-8 || Math.abs(max * 10 - Math.round(max * 10)) > 1e-8)))
      throw new Error('Số đo cần đủ cặp, lớn hơn 0 và tối thiểu không vượt tối đa; tối đa một chữ số thập phân.');
  }
}
export async function saveProductMeasurements(client: Client, id: number, input: Measurements, expected: Measurements, key: string) {
  if (!Number.isSafeInteger(id) || id < 1 || !key) throw new Error('Chưa chọn dòng kích cỡ.');
  validateMeasurements(input);
  await requireManagerProtocol(client);
  return transaction(client, 'cc_manager_size', { p_size_id: id, p_values: input, p_expected: expected, p_key: key });
}
