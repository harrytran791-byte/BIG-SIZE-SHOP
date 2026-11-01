export interface AuditLogEntry {
  id: string;
  timestamp: string;
  timeFormatted: string;
  dateFormatted: string;
  performedBy: {
    id?: string;
    name: string;
    role: 'Admin' | 'Manager' | 'Customer';
    code?: string;
  };
  action: string;
  category: string;
  target: {
    code: string;
    description: string;
  };
  result: 'success' | 'denied';
  details?: {
    ip?: string;
    userAgent?: string;
    reason?: string;
    payload?: Record<string, any>;
  };
}

const AUDIT_STORAGE_KEY = 'curve_audit_logs';

/**
 * Lấy thông tin tài khoản đang đăng nhập từ session để làm người thực hiện chuẩn xác thời gian thực
 */
export const getActivePerformer = (): {
  id?: string;
  name: string;
  role: 'Admin' | 'Manager' | 'Customer';
  code?: string;
} => {
  try {
    if (typeof window !== 'undefined') {
      const savedUserStr =
        sessionStorage.getItem('curve_current_user_obj') ||
        localStorage.getItem('curve_current_user_obj');
      if (savedUserStr) {
        const user = JSON.parse(savedUserStr);
        if (user && (user.name || user.id || user.email)) {
          const rawRole = (user.role || '').toLowerCase();
          const role: 'Admin' | 'Manager' | 'Customer' =
            rawRole === 'admin' ? 'Admin' : rawRole === 'manager' ? 'Manager' : 'Customer';
          const code =
            role === 'Admin' ? 'Quản trị viên' : role === 'Manager' ? 'Quản lý cửa hàng' : 'Khách hàng';
          return {
            id: user.id || undefined,
            name: user.name || (role === 'Admin' ? 'Quản trị viên' : 'Khách hàng'),
            role,
            code,
          };
        }
      }
    }
  } catch (err) {
    console.warn('Lỗi phân tích active performer từ bộ nhớ phiên:', err);
  }

  return {
    name: 'Trần Quản Trị',
    role: 'Admin',
    code: 'Quản trị viên',
  };
};

/**
 * Tạo dữ liệu nhật ký mẫu ban đầu với ngôn ngữ tiếng Việt tự nhiên và ngày giờ hôm nay
 */
export const getCleanInitialAuditLogs = (): AuditLogEntry[] => {
  const now = new Date();
  const formatTime = (minutesAgo: number) => {
    const d = new Date(now.getTime() - minutesAgo * 60 * 1000);
    return d.toLocaleTimeString('vi-VN', { hour12: false });
  };
  const todayStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;

  return [
    {
      id: 'log-init-001',
      timestamp: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
      timeFormatted: formatTime(15),
      dateFormatted: todayStr,
      performedBy: {
        id: 'usr_01',
        name: 'Trần Quản Trị',
        role: 'Admin',
        code: 'Quản trị viên',
      },
      action: 'Kiểm tra trạng thái tài khoản',
      category: 'Quản lý tài khoản',
      target: {
        code: 'Tài khoản thành viên',
        description: 'Trương Khánh Ngân (Khách hàng)',
      },
      result: 'success',
      details: {
        ip: '113.161.42.19',
        reason: 'Đồng bộ dữ liệu thời gian thực từ hệ thống đám mây',
      },
    },
    {
      id: 'log-init-002',
      timestamp: new Date(now.getTime() - 28 * 60 * 1000).toISOString(),
      timeFormatted: formatTime(28),
      dateFormatted: todayStr,
      performedBy: {
        id: 'usr_13',
        name: 'Phan Nho Toàn',
        role: 'Admin',
        code: 'Quản trị viên',
      },
      action: 'Cập nhật thời hạn phiên',
      category: 'Cấu hình hệ thống',
      target: {
        code: 'Phiên làm việc',
        description: 'Tự động đăng xuất an toàn sau 30 phút rảnh',
      },
      result: 'success',
      details: {
        ip: '14.241.112.50',
      },
    },
    {
      id: 'log-init-003',
      timestamp: new Date(now.getTime() - 42 * 60 * 1000).toISOString(),
      timeFormatted: formatTime(42),
      dateFormatted: todayStr,
      performedBy: {
        id: 'usr_01',
        name: 'Trần Quản Trị',
        role: 'Admin',
        code: 'Quản trị viên',
      },
      action: 'Xác nhận phân quyền quản lý',
      category: 'Vai trò và phân quyền',
      target: {
        code: 'Phân quyền nhân sự',
        description: 'Nguyễn Cửa Hàng Trưởng (Quản lý)',
      },
      result: 'success',
      details: {
        ip: '113.161.42.19',
        reason: 'Phân định thẩm quyền vận hành sản phẩm và đơn hàng',
      },
    },
    {
      id: 'log-init-004',
      timestamp: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
      timeFormatted: formatTime(60),
      dateFormatted: todayStr,
      performedBy: {
        id: 'usr_mgr_01',
        name: 'Nguyễn Cửa Hàng Trưởng',
        role: 'Manager',
        code: 'Quản lý cửa hàng',
      },
      action: 'Truy cập cấu hình máy chủ',
      category: 'Kiểm soát truy cập',
      target: {
        code: 'Khu vực quản trị',
        description: 'Chỉ dành riêng cho Quản trị viên hệ thống',
      },
      result: 'denied',
      details: {
        ip: '118.69.182.204',
        reason: 'Chặn quyền theo nguyên tắc đặc quyền tối thiểu (RBAC)',
      },
    },
    {
      id: 'log-init-005',
      timestamp: new Date(now.getTime() - 85 * 60 * 1000).toISOString(),
      timeFormatted: formatTime(85),
      dateFormatted: todayStr,
      performedBy: {
        id: 'usr_cus_01',
        name: 'Đỗ Mỹ Linh',
        role: 'Customer',
        code: 'Khách hàng',
      },
      action: 'Đăng nhập tài khoản khách hàng',
      category: 'Tài khoản và xác thực',
      target: {
        code: 'Đăng nhập thành công',
        description: 'Khách hàng thành viên Big Size',
      },
      result: 'success',
      details: {
        ip: '42.119.155.8',
        reason: 'Phiên mua sắm trực tuyến',
      },
    },
  ];
};

export const getAuditLogs = (): AuditLogEntry[] => {
  try {
    const saved = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (saved) {
      const parsed: AuditLogEntry[] = JSON.parse(saved);
      // Nếu dữ liệu cũ còn sót mã kỹ thuật thô như "session.idle_timeout" hoặc "ACC-0005", tự động dọn sạch
      const hasStaleDebugStrings = parsed.some(
        (log) =>
          log.target?.code === 'session.idle_timeout' ||
          log.target?.code === 'ACC-0005' ||
          log.target?.code === '/admin/settings' ||
          log.target?.code === 'SYS-CONFIG' ||
          log.target?.code === 'ROLE-MATRIX'
      );
      if (!hasStaleDebugStrings && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Lỗi đọc nhật ký hoạt động:', err);
  }

  const initial = getCleanInitialAuditLogs();
  try {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(initial));
  } catch {}
  return initial;
};

export const appendAuditLog = (
  action: string,
  category: string,
  targetCode: string,
  targetDesc: string,
  result: 'success' | 'denied' = 'success',
  reason?: string,
  performer?: { id?: string; name: string; role: 'Admin' | 'Manager' | 'Customer'; code?: string }
): AuditLogEntry => {
  const currentLogs = getAuditLogs();
  const now = new Date();
  const timeFormatted = now.toLocaleTimeString('vi-VN', { hour12: false });
  const dateFormatted = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;

  const activeFallback = getActivePerformer();
  const finalPerformer = {
    id: performer?.id || activeFallback.id,
    name: performer?.name || activeFallback.name,
    role: performer?.role || activeFallback.role,
    code: performer?.code || activeFallback.code,
  };

  const newLog: AuditLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: now.toISOString(),
    timeFormatted,
    dateFormatted,
    performedBy: finalPerformer,
    action,
    category,
    target: {
      code: targetCode,
      description: targetDesc,
    },
    result,
    details: {
      ip: '113.161.42.19',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      reason: reason || 'Hoạt động quản trị hệ thống',
    },
  };

  const nextLogs = [newLog, ...currentLogs];
  try {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(nextLogs));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('curve_audit_logs_updated', { detail: nextLogs }));
    }
  } catch (err) {
    console.error('Lỗi ghi nhật ký hoạt động:', err);
  }

  return newLog;
};

export const clearAuditLogs = (): void => {
  const initial = getCleanInitialAuditLogs();
  try {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(initial));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('curve_audit_logs_updated', { detail: initial }));
    }
  } catch {}
};
