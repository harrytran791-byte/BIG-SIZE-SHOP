import React, { useState } from 'react';
import {
  Shield,
  Briefcase,
  User,
  CheckCircle2,
  ShieldCheck,
  Package,
  X,
  ArrowRight
} from 'lucide-react';
import { UserAccount } from '@/shared/types';
import { normalizeRole } from '@/shared/utils/roleUtils';
import { useToast } from '@/shared/context/ToastContext';
import {
  accessMatrixData,
  AccessMatrixSection
} from '../data/mockSystemAdmin';

interface RolePermissionTabProps {
  allUsers: UserAccount[];
  currentUser: UserAccount | null;
  onAppendAuditLog: (action: string, category: string, targetCode: string, targetDesc: string) => void;
  onNavigateToUsers?: () => void;
}

export const RolePermissionTab: React.FC<RolePermissionTabProps> = ({
  allUsers,
  currentUser,
  onAppendAuditLog,
  onNavigateToUsers,
}) => {
  const { showToast } = useToast();

  const [matrixData] = useState<AccessMatrixSection[]>(accessMatrixData);
  const [isRbacModalOpen, setIsRbacModalOpen] = useState(false);

  const adminUsers = allUsers.filter(u => normalizeRole(u.role, u.email, u.name) === 'admin');
  const managerUsers = allUsers.filter(u => normalizeRole(u.role, u.email, u.name) === 'manager');
  const customerUsers = allUsers.filter(u => normalizeRole(u.role, u.email, u.name) === 'customer');

  const adminCount = adminUsers.length;
  const managerCount = managerUsers.length;
  const customerCount = customerUsers.length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Title */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-charcoal-900 tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-[#5C1D24]" />
          <span>Vai Trò & Phân Quyền</span>
        </h1>
      </div>

      {/* 3 Role Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 1. Admin */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-sm text-charcoal-900">Admin</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                {adminCount} tài khoản
              </span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Quản trị tài khoản, phân quyền, cấu hình và giám sát hệ thống. Không vận hành kinh doanh.
            </p>
          </div>
        </div>

        {/* 2. Manager */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-sm text-charcoal-900">Manager</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                {managerCount} tài khoản
              </span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Vận hành sản phẩm, size, tồn kho, đơn hàng, 3PL, đổi trả, khuyến mãi và doanh thu.
            </p>
          </div>
        </div>

        {/* 3. Customer */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-brand-700" />
                <h3 className="font-bold text-sm text-charcoal-900">Customer</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-charcoal-700">
                {customerCount} tài khoản
              </span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Mua sắm và quản lý hồ sơ, địa chỉ, đơn hàng của chính mình. Không truy cập Admin.
            </p>
          </div>
        </div>
      </div>

      {/* Info Notice Banner */}
      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs flex items-center gap-3">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>
          Hệ thống phân định quyền hạn tự động theo chức vụ của nhân viên cửa hàng.
        </span>
      </div>

      {/* Access Control Matrix Card */}
      <div className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden shadow-2xs">
        <div className="p-6 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-base text-charcoal-900">Ma trận quyền truy cập</h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Quyền theo vai trò • Áp dụng nguyên tắc đặc quyền tối thiểu
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Thực thi bảo mật cấp máy chủ</span>
            </span>
            <button
              type="button"
              onClick={() => setIsRbacModalOpen(true)}
              className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors self-start sm:self-auto shadow-xs cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Nguyên tắc phân quyền RBAC</span>
            </button>
          </div>
        </div>

        {/* Table Matrix */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 text-[11px] font-bold text-stone-500">
                <th className="p-4 pl-6 w-1/2">Chức năng / Phạm vi</th>
                <th className="p-4 text-center">Admin</th>
                <th className="p-4 text-center">Manager</th>
                <th className="p-4 text-center pr-6">Customer</th>
              </tr>
            </thead>
            <tbody>
              {matrixData.map((sec) => {
                const isSystemAdmin = sec.title.includes('QUẢN TRỊ HỆ THỐNG');
                const isOperations = sec.title.includes('VẬN HÀNH KINH DOANH');
                const isPersonal = sec.title.includes('PHẠM VI CÁ NHÂN');

                return (
                  <React.Fragment key={sec.title}>
                    <tr
                      className={`border-y ${
                        isSystemAdmin
                          ? 'bg-gradient-to-r from-purple-100 via-purple-50/70 to-white border-purple-200'
                          : isOperations
                            ? 'bg-gradient-to-r from-amber-100 via-amber-50/70 to-white border-amber-200'
                            : 'bg-gradient-to-r from-stone-200 via-stone-100/70 to-white border-stone-300'
                      }`}
                    >
                      <td colSpan={4} className="px-6 py-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isSystemAdmin && (
                              <span className="p-1 rounded-md bg-purple-200 text-purple-900 shadow-2xs">
                                <ShieldCheck className="w-3.5 h-3.5" />
                              </span>
                            )}
                            {isOperations && (
                              <span className="p-1 rounded-md bg-amber-200 text-amber-900 shadow-2xs">
                                <Package className="w-3.5 h-3.5" />
                              </span>
                            )}
                            {isPersonal && (
                              <span className="p-1 rounded-md bg-stone-300 text-stone-900 shadow-2xs">
                                <User className="w-3.5 h-3.5" />
                              </span>
                            )}
                            <span
                              className={`text-xs font-black uppercase tracking-wider ${
                                isSystemAdmin
                                  ? 'text-purple-950'
                                  : isOperations
                                    ? 'text-amber-950'
                                    : 'text-stone-900'
                              }`}
                            >
                              {sec.title}
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Items */}
                    {sec.items.map((item) => (
                      <tr key={item.id} className="border-b border-stone-100 hover:bg-stone-50/50">
                        <td className="p-4 pl-6">
                          <span className="font-bold text-charcoal-900 block">{item.name}</span>
                          <span className="text-[11px] text-stone-500 block">{item.scope}</span>
                        </td>

                        <td className="p-4 text-center">
                          {item.admin === '—' ? (
                            <span className="text-stone-300 font-bold">—</span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-block">
                              {item.admin}
                            </span>
                          )}
                        </td>

                        <td className="p-4 text-center">
                          {item.manager === '—' ? (
                            <span className="text-stone-300 font-bold">—</span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-block">
                              {item.manager}
                            </span>
                          )}
                        </td>

                        <td className="p-4 text-center pr-6">
                          {item.customer === '—' ? (
                            <span className="text-stone-300 font-bold">—</span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-stone-100 text-charcoal-700 border border-stone-200 inline-block">
                              {item.customer}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-stone-50/60 border-t border-stone-200 text-[11px] text-stone-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>— Không có quyền • Cá nhân: chỉ dữ liệu của chính tài khoản</span>
          <span>Cập nhật: {currentUser?.name || 'Trần Quản Trị'} (Admin) • Cập nhật trực tiếp</span>
        </div>
      </div>

      {/* Sub-footer */}
      <div className="flex items-center justify-between pt-6 text-[11px] text-stone-400 border-t border-stone-200">
        <span>Curve & Confidence • Quản trị vai trò</span>
        <span className="text-emerald-700 font-medium">Hệ thống phân quyền Curve & Confidence • Cập nhật trực tiếp</span>
      </div>

      {/* MODAL: RBAC ARCHITECTURE & PRINCIPLES */}
      {isRbacModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-900/40 backdrop-blur-md animate-fadeIn"
          onClick={() => setIsRbacModalOpen(false)}
        >
          <div
            className="w-full max-w-3xl max-h-[88vh] bg-white rounded-3xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden my-auto animate-scaleIn text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/70 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#5C1D24] text-white flex items-center justify-center shadow-xs">
                  <ShieldCheck className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-charcoal-900 tracking-tight">
                    Kiến Trúc Phân Quyền Vai Trò (Strict RBAC)
                  </h3>
                  <p className="text-xs text-stone-500">
                    Bảo mật 3 cấp độ thực thi trực tiếp tại cơ sở dữ liệu Supabase Cloud
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsRbacModalOpen(false)}
                className="p-2 text-stone-400 hover:text-charcoal-800 rounded-xl hover:bg-stone-200/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              <div className="p-4 bg-emerald-50/90 border border-emerald-200/90 rounded-2xl flex items-start gap-3">
                <Shield className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1 text-emerald-950">
                  <p className="font-bold">Chính sách bảo mật hệ thống:</p>
                  <p className="text-emerald-900 leading-relaxed">
                    Ma trận quyền được cấu hình cố định theo chuẩn bảo mật máy chủ (Database-Level Role Enforcement). Để phân quyền hoặc thu hồi đặc quyền của nhân viên, vui lòng thay đổi vai trò tài khoản trong phân hệ <strong>Quản Lý Tài Khoản</strong>.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Admin Tier */}
                <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                      <h4 className="font-bold text-xs uppercase tracking-wider text-purple-900">1. Admin (Quản Trị Hệ Thống)</h4>
                    </div>
                    <span className="text-[11px] font-semibold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full">Toàn quyền kỹ thuật</span>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Quản trị danh sách tài khoản, phân định vai trò, kích hoạt/khóa tài khoản, xem nhật ký truy vết bảo mật (Audit Logs) và cấu hình máy chủ.
                  </p>
                </div>

                {/* Manager Tier */}
                <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span>
                      <h4 className="font-bold text-xs uppercase tracking-wider text-amber-900">2. Manager (Vận Hành Kinh Doanh)</h4>
                    </div>
                    <span className="text-[11px] font-semibold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">Vận hành cửa hàng</span>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Quản trị sản phẩm may đo, kiểm kê kho và cân bằng tồn kho thực tế, duyệt đơn hàng, đồng bộ vận chuyển GHN và quản lý voucher khuyến mãi.
                  </p>
                </div>

                {/* Customer Tier */}
                <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-stone-600"></span>
                      <h4 className="font-bold text-xs uppercase tracking-wider text-stone-900">3. Customer (Khách Hàng Mua Sắm)</h4>
                    </div>
                    <span className="text-[11px] font-semibold text-stone-700 bg-stone-200 px-2.5 py-0.5 rounded-full">Phạm vi cá nhân</span>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Đặt hàng thời trang may đo big size, theo dõi hành trình đơn, gửi yêu cầu đổi size và quản lý thông tin địa chỉ giao hàng cá nhân.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-stone-100 bg-stone-50/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <span className="text-[11px] text-stone-500">
                Tuân thủ tiêu chuẩn phân quyền bảo mật ISO/IEC 27001
              </span>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setIsRbacModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 hover:bg-stone-100 rounded-xl text-stone-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Đóng
                </button>
                {onNavigateToUsers && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsRbacModalOpen(false);
                      onNavigateToUsers();
                    }}
                    className="px-4 py-2 bg-[#5C1D24] hover:bg-[#47161c] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  >
                    <span>Đến Quản Lý Tài Khoản</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
