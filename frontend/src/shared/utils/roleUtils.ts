import { UserRole, UserAccount } from '../types';

/**
 * Helper to strip Vietnamese accents for resilient matching
 */
const removeVietnameseTones = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
};

/**
 * Normalizes any role string from frontend, backend, or Supabase DB
 * Supports:
 * - 'admin', 'chu_he_thong', 'chủ hệ thống', 'super_admin', 'administrator' -> 'admin'
 * - 'manager', 'quan_ly', 'quản lý', 'store_manager', 'nhan_vien', 'nhân viên', 'staff' -> 'manager'
 * - 'customer', 'khach_hang', 'khách hàng', 'user', 'member' -> 'customer'
 * - 'guest' -> 'guest'
 * Also checks email hints (e.g. email containing 'admin' or 'manager') and name hints as a smart fallback
 */
export const normalizeRole = (
  role?: string | null,
  email?: string | null,
  name?: string | null
): UserRole => {
  const rawRole = (role || '').toLowerCase().trim();
  const rawEmail = (email || '').toLowerCase().trim();
  const rawName = (name || '').toLowerCase().trim();

  const cleanRole = removeVietnameseTones(rawRole).replace(/[\s_\-]+/g, '');
  const cleanName = removeVietnameseTones(rawName).replace(/[\s_\-]+/g, '');

  // 1. Direct admin matches (verified DB role or official system admin email)
  if (
    cleanRole === 'admin' ||
    cleanRole === 'chuhethong' ||
    cleanRole === 'superadmin' ||
    cleanRole === 'administrator' ||
    cleanRole === 'quantri' ||
    cleanRole === 'quantrivien' ||
    cleanRole === 'root'
  ) {
    return 'admin';
  }

  // 2. Direct manager & staff matches (verified DB role or official store manager email)
  if (
    cleanRole === 'manager' ||
    cleanRole === 'quanly' ||
    cleanRole === 'storemanager' ||
    cleanRole === 'nhanvien' ||
    cleanRole === 'staff' ||
    cleanRole === 'employee'
  ) {
    return 'manager';
  }

  // 3. Customer
  if (
    cleanRole === 'customer' ||
    cleanRole === 'khachhang' ||
    cleanRole === 'user' ||
    cleanRole === 'member' ||
    cleanRole.includes('khachhang') ||
    cleanRole.includes('customer')
  ) {
    return 'customer';
  }

  // 4. Guest
  if (cleanRole === 'guest') {
    return 'guest';
  }

  return cleanRole ? 'customer' : 'guest';
};

/**
 * Checks if user/role has permission to access Admin Portal (either Admin or Store Manager)
 */
export const hasAdminPortalAccess = (user?: UserAccount | null, role?: string | null): boolean => {
  if (!user) return false;
  const userRole = normalizeRole(user.role, user.email, user.name);
  const activeRole = normalizeRole(role, user.email, user.name);
  return userRole === 'admin' || userRole === 'manager' || activeRole === 'admin' || activeRole === 'manager';
};

/**
 * Checks if user is Super Admin
 */
export const isSuperAdmin = (user?: UserAccount | null, role?: string | null): boolean => {
  if (!user) return false;
  const userRole = normalizeRole(user.role, user.email, user.name);
  const activeRole = normalizeRole(role, user.email, user.name);
  return userRole === 'admin' || activeRole === 'admin';
};

/**
 * Checks if user is Store Manager
 */
export const isStoreManager = (user?: UserAccount | null, role?: string | null): boolean => {
  if (!user) return false;
  const userRole = normalizeRole(user.role, user.email);
  const activeRole = normalizeRole(role, user.email);
  return userRole === 'manager' || activeRole === 'manager';
};

/**
 * Returns formatted role display info
 */
export const getRoleDisplayInfo = (role?: string | null, email?: string | null) => {
  const normalized = normalizeRole(role, email);
  switch (normalized) {
    case 'admin':
      return {
        label: 'Super Admin',
        title: 'Quản trị viên hệ thống',
        badgeBg: 'bg-purple-100 text-purple-900 border-purple-300',
        color: '#6D28D9',
        initial: 'A'
      };
    case 'manager':
      return {
        label: 'Store Manager',
        title: 'Cửa hàng trưởng / Quản lý',
        badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
        color: '#D97706',
        initial: 'M'
      };
    case 'customer':
      return {
        label: 'Khách Hàng',
        title: 'Khách hàng thành viên',
        badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        color: '#059669',
        initial: 'C'
      };
    default:
      return {
        label: 'Khách Vãng Lai',
        title: 'Chưa đăng nhập',
        badgeBg: 'bg-stone-100 text-stone-700 border-stone-200',
        color: '#52525B',
        initial: 'G'
      };
  }
};

export type AdminTab =
  | 'system_dashboard'
  | 'user_management'
  | 'role_permission'
  | 'system_settings'
  | 'audit_logs'
  | 'products'
  | 'inventory'
  | 'orders'
  | 'returns'
  | 'vouchers'
  | 'reports';

export const canAccessPortalTab = (tab: AdminTab, verifiedRole: UserRole): boolean => {
  const role = normalizeRole(verifiedRole);
  if (role === 'admin') return ['system_dashboard', 'user_management', 'role_permission', 'system_settings', 'audit_logs'].includes(tab);
  if (role === 'manager') return ['products', 'inventory', 'orders', 'returns', 'vouchers', 'reports'].includes(tab);
  return false;
};

export const tabToSlug = (tab: AdminTab): string => {
  switch (tab) {
    case 'system_dashboard': return 'system-dashboard';
    case 'user_management': return 'user-management';
    case 'role_permission': return 'role-permission';
    case 'system_settings': return 'system-settings';
    case 'audit_logs': return 'audit-logs';
    case 'products': return 'products';
    case 'inventory': return 'inventory';
    case 'orders': return 'orders';
    case 'returns': return 'returns';
    case 'vouchers': return 'vouchers';
    case 'reports': return 'reports';
    default: return tab;
  }
};

export const slugToTab = (slug?: string): AdminTab | null => {
  if (!slug) return null;
  const clean = slug.toLowerCase().replace(/_/g, '-');
  switch (clean) {
    case 'system-dashboard':
    case 'dashboard':
      return 'system_dashboard';
    case 'user-management':
    case 'users':
      return 'user_management';
    case 'role-permission':
    case 'roles':
    case 'permissions':
      return 'role_permission';
    case 'system-settings':
    case 'settings':
      return 'system_settings';
    case 'audit-logs':
    case 'logs':
      return 'audit_logs';
    case 'products':
      return 'products';
    case 'inventory':
    case 'stock':
      return 'inventory';
    case 'orders':
      return 'orders';
    case 'returns':
      return 'returns';
    case 'vouchers':
      return 'vouchers';
    case 'reports':
    case 'analytics':
    case 'bao-cao':
      return 'reports';
    default:
      return null;
  }
};

/**
 * Returns the appropriate portal prefix for a given role ('/admin' for admin, '/manager' for manager)
 */
export const getPortalPrefix = (role?: string | null, email?: string | null): string => {
  const norm = normalizeRole(role, email);
  return norm === 'admin' ? '/admin' : '/manager';
};

/**
 * Returns default tab path for a given role:
 * Admin -> '/admin/system-dashboard'
 * Manager -> '/manager/products'
 */
export const getDefaultPortalPath = (role?: string | null, email?: string | null): string => {
  const norm = normalizeRole(role, email);
  return norm === 'admin' ? '/admin/system-dashboard' : '/manager/products';
};


