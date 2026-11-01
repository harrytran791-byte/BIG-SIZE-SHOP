import { databaseId, transaction } from './transactionService';
import type { AuditLogEntry } from './auditLogService';
import {
  normalizeFullName,
  validateFullName,
  validateEmail,
  validateVietnamesePhone
} from '../utils/userInputValidation';

type Client = Parameters<typeof transaction>[0];
const roles = { customer: 'khach_hang', manager: 'quan_ly', admin: 'chu_he_thong' } as const;
export async function manageAdminAccount(client: Client, action: string, id: string | null, input: Record<string, unknown> = {}) {
  const data = { ...input };
  if (action === 'create') {
    const nameErr = validateFullName(typeof data.name === 'string' ? data.name : '', 'Tên tài khoản');
    if (nameErr) throw new Error(nameErr);
    const emailErr = validateEmail(typeof data.email === 'string' ? data.email : '');
    if (emailErr) throw new Error(emailErr);
    if (data.phone != null && String(data.phone).trim() !== '') {
      const phoneErr = validateVietnamesePhone(String(data.phone));
      if (phoneErr) throw new Error(phoneErr);
    }
    data.name = normalizeFullName(String(data.name));
    data.email = String(data.email).trim().toLowerCase();
  }
  if (action === 'create' || action === 'role') {
    if (typeof data.role !== 'string' || !Object.hasOwn(roles, data.role)) throw new Error('Vai trò không hợp lệ.');
    data.role = roles[data.role as keyof typeof roles];
  }
  if (action === 'set_enabled' && typeof data.enabled !== 'boolean') throw new Error('Trạng thái không hợp lệ.');
  if (!['create', 'role', 'set_enabled', 'delete'].includes(action) || (action !== 'create' && !id)) throw new Error('Thao tác không hợp lệ.');
  const accountId = id ? databaseId(id, 'usr_') : null;
  const capability = await transaction(client, 'cc_admin_account_capabilities', {});
  if (capability.version !== 1) throw new Error('Chức năng quản trị chưa sẵn sàng.');
  return transaction(client, 'cc_manage_account', { p_action: action, p_account: accountId, p_data: data });
}

export async function fetchAdminAccountEvents(client: { from: (table: string) => any }): Promise<AuditLogEntry[]> {
  const { data, error } = await client.from('cc_admin_account_events').select('id,recorded_at,actor_account,actor_name,action,target_account,before_state,after_state').order('id', { ascending: false }).limit(500);
  if (error || !Array.isArray(data)) throw new Error('Chưa tải được nhật ký quản trị.');
  const actions: Record<string, string> = { create: 'Tạo hồ sơ tài khoản', role: 'Thay đổi vai trò', set_enabled: 'Cập nhật trạng thái tài khoản', delete: 'Xóa hồ sơ tài khoản' };
  return data.map((row: any) => {
    const date = new Date(row.recorded_at);
    return { id: `account-event-${row.id}`, timestamp: row.recorded_at,
      timeFormatted: date.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false }),
      dateFormatted: date.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
      performedBy: { id: `usr_${row.actor_account}`, name: row.actor_name, role: 'Admin', code: 'Quản trị viên' },
      action: actions[row.action] || 'Thao tác quản trị tài khoản', category: 'Quản lý tài khoản',
      target: { code: 'Tài khoản người dùng', description: row.after_state?.name || row.before_state?.name || 'Hồ sơ tài khoản' }, result: 'success' };
  });
}
