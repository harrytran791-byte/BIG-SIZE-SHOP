import {
  SystemSettingsState,
  defaultSystemSettings
} from '@/shared/services/systemSettingsService';

import {
  AuditLogEntry,
  getCleanInitialAuditLogs
} from '@/shared/services/auditLogService';

export type { SystemSettingsState, AuditLogEntry };
export { defaultSystemSettings };

export const initialAuditLogs: AuditLogEntry[] = getCleanInitialAuditLogs();

export interface AccessMatrixItem {
  id: string;
  name: string;
  scope: string;
  admin: 'Quản lý' | 'Xem' | 'Xem / xuất' | '—';
  manager: 'Quản lý' | 'Xem' | 'Xem / xuất' | '—';
  customer: 'Cá nhân' | 'Xem' | '—';
}

export interface AccessMatrixSection {
  title: string;
  items: AccessMatrixItem[];
}

export const accessMatrixData: AccessMatrixSection[] = [
  {
    title: 'QUẢN TRỊ HỆ THỐNG',
    items: [
      {
        id: 'am-1',
        name: 'Tổng quan hệ thống',
        scope: 'Tài khoản, dịch vụ, cảnh báo bảo mật',
        admin: 'Xem',
        manager: '—',
        customer: '—',
      },
      {
        id: 'am-2',
        name: 'Quản lý tài khoản',
        scope: 'Tạo, chỉnh sửa, khóa / mở khóa, đặt lại mật khẩu',
        admin: 'Quản lý',
        manager: '—',
        customer: '—',
      },
      {
        id: 'am-3',
        name: 'Vai trò và phân quyền',
        scope: 'Gán vai trò, cập nhật ma trận quyền',
        admin: 'Quản lý',
        manager: '—',
        customer: '—',
      },
      {
        id: 'am-4',
        name: 'Cấu hình hệ thống',
        scope: 'Bảo mật, phiên đăng nhập, thông báo',
        admin: 'Quản lý',
        manager: '—',
        customer: '—',
      },
      {
        id: 'am-5',
        name: 'Nhật ký hoạt động',
        scope: 'Tra cứu, xuất log quản trị và bảo mật',
        admin: 'Xem / xuất',
        manager: '—',
        customer: '—',
      },
    ],
  },
  {
    title: 'VẬN HÀNH KINH DOANH',
    items: [
      {
        id: 'am-6',
        name: 'Sản phẩm, bảng size và tồn kho',
        scope: 'Danh mục, thông số kích cỡ và số lượng hàng',
        admin: '—',
        manager: 'Quản lý',
        customer: '—',
      },
      {
        id: 'am-7',
        name: 'Đơn hàng và hậu cần',
        scope: 'Đơn hàng / 3PL, đổi trả và hủy đơn',
        admin: '—',
        manager: 'Quản lý',
        customer: '—',
      },
      {
        id: 'am-8',
        name: 'Khuyến mãi và doanh thu',
        scope: 'Chương trình ưu đãi và báo cáo kinh doanh',
        admin: '—',
        manager: 'Quản lý',
        customer: '—',
      },
    ],
  },
  {
    title: 'PHẠM VI CÁ NHÂN',
    items: [
      {
        id: 'am-9',
        name: 'Mua sắm và đơn hàng cá nhân',
        scope: 'Xem sản phẩm, đặt hàng, theo dõi đơn của mình',
        admin: '—',
        manager: '—',
        customer: 'Cá nhân',
      },
      {
        id: 'am-10',
        name: 'Hồ sơ và bảo mật cá nhân',
        scope: 'Thông tin, địa chỉ và mật khẩu của mình',
        admin: 'Quản lý',
        manager: 'Quản lý',
        customer: 'Cá nhân',
      },
    ],
  },
];
