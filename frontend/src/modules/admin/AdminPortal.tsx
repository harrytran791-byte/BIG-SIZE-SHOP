import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../user/context/AuthContext';
import { useOrder } from '../order/context/OrderContext';
import { useInventory } from '../inventory/context/InventoryContext';
import { useReturn } from '../return/context/ReturnContext';
import { useProducts } from '../product/context/ProductContext';
import { useToast } from '@/shared/context/ToastContext';
import { fetchVouchersFromSupabase, SupabaseVoucher, supabase } from '@/shared/services/supabaseClient';
import { fetchAdminAccountEvents } from '@/shared/services/adminAccountService';
import { UserRole } from '@/shared/types';
import { normalizeRole, canAccessPortalTab, AdminTab, tabToSlug, slugToTab } from '@/shared/utils/roleUtils';
export { tabToSlug, slugToTab, type AdminTab } from '@/shared/utils/roleUtils';

// Modular Layout Components
import { AdminHeader } from './layout/AdminHeader';
import { AdminSidebar, ProductSubTab } from './layout/AdminSidebar';

// Modular Tab Components
import { SystemDashboardTab } from './tabs/SystemDashboardTab';
import { UserManagementTab } from './tabs/UserManagementTab';
import { RolePermissionTab } from './tabs/RolePermissionTab';
import { SystemSettingsTab } from './tabs/SystemSettingsTab';
import { AuditLogsTab } from './tabs/AuditLogsTab';
import { ProductsTab } from './tabs/ProductsTab';
import { InventoryTab } from './tabs/InventoryTab';
import { OrdersTab } from './tabs/OrdersTab';
import { ReturnsTab } from './tabs/ReturnsTab';
import { VouchersTab } from './tabs/VouchersTab';
import { ReportsTab } from './tabs/ReportsTab';

import {
  AuditLogEntry,
  getAuditLogs,
  appendAuditLog as appendAuditLogService
} from '@/shared/services/auditLogService';
import { AccessMatrixSection } from './data/mockSystemAdmin';

interface AdminPortalProps {
  onBackToStore: () => void;
  onNavigate: (path: string) => void;
  initialTab?: AdminTab;
}

const SYSTEM_ADMIN_TABS: AdminTab[] = [
  'system_dashboard',
  'user_management',
  'role_permission',
  'system_settings',
  'audit_logs'
];

const MANAGER_OPERATIONS_TABS: AdminTab[] = [
  'products',
  'inventory',
  'orders',
  'returns',
  'vouchers',
  'reports'
];

const TAB_TO_MATRIX_ID: Record<AdminTab, string> = {
  system_dashboard: 'am-1',
  user_management: 'am-2',
  role_permission: 'am-3',
  system_settings: 'am-4',
  audit_logs: 'am-5',
  products: 'am-6',
  inventory: 'am-6',
  orders: 'am-7',
  returns: 'am-7',
  vouchers: 'am-8',
  reports: 'am-8',
};

const getTabDisplayName = (tab: AdminTab): string => {
  switch (tab) {
    case 'system_dashboard': return 'Tổng Quan Hệ Thống';
    case 'user_management': return 'Quản Lý Tài Khoản';
    case 'role_permission': return 'Vai Trò & Phân Quyền';
    case 'system_settings': return 'Cấu Hình Hệ Thống';
    case 'audit_logs': return 'Nhật Ký Hoạt Động';
    case 'products': return 'Sản Phẩm & Bảng Size XL–5XL';
    case 'inventory': return 'Kho & Tồn Kho (Kiểm Kê Hàng Hóa)';
    case 'orders': return 'Đơn Hàng & Vận Đơn';
    case 'returns': return 'Đổi Size & Hậu Mãi 7 Ngày';
    case 'vouchers': return 'Quản Lý Khuyến Mãi & Voucher';
    case 'reports': return 'Báo Cáo & Thống Kê Doanh Thu';
    default: return tab;
  }
};

const initialVouchersList: SupabaseVoucher[] = [
  { id: 1, code: 'BIGSIZE10', name: 'Giảm 10% Cho Đơn Hàng Đầu Tiên', voucherType: 'discount', discountType: 'percent', discountValue: 10, maxDiscount: 100000, minOrderValue: 300000, startDate: '2026-10-01', endDate: '2026-12-31', status: 'Đang hoạt động' },
  { id: 2, code: 'FREESHIP', name: 'Miễn Phí Vận Chuyển Đơn Từ 500k', voucherType: 'shipping', discountType: 'fixed', discountValue: 30000, maxDiscount: 30000, minOrderValue: 500000, startDate: '2026-10-01', endDate: '2026-12-31', status: 'Đang hoạt động' },
  { id: 3, code: 'VIP50K', name: 'Giảm 50.000đ Tri Ân Khách Thân Thiết', voucherType: 'discount', discountType: 'fixed', discountValue: 50000, maxDiscount: 50000, minOrderValue: 400000, startDate: '2026-10-01', endDate: '2026-12-31', status: 'Đang hoạt động' },
  { id: 5, code: 'FREESHIP50', name: 'Miễn Phí Vận Chuyển Đơn Từ 500k', voucherType: 'shipping', discountType: 'fixed', discountValue: 35000, maxDiscount: 35000, minOrderValue: 500000, startDate: '2026-10-01', endDate: '2026-12-31', status: 'Đang hoạt động' },
  { id: 6, code: 'WELCOME50K', name: 'Giảm Ngay 50k Cho Khách Hàng Mới', voucherType: 'discount', discountType: 'fixed', discountValue: 50000, maxDiscount: 50000, minOrderValue: 600000, startDate: '2026-10-01', endDate: '2026-12-31', status: 'Đang hoạt động' }
];

export const AdminPortal: React.FC<AdminPortalProps> = ({ onBackToStore, onNavigate, initialTab }) => {
  const {
    currentRole,
    currentUser,
    switchRole,
    allUsers,
    createUser,
    updateUserRole,
    toggleUserStatus,
    deleteUser,
    syncUsersWithSupabase,
    isSyncingUsers
  } = useAuth();

  const { products } = useProducts();
  const { orders, updateOrderStatus, updatePaymentStatus, updateOrderShippingAddress } = useOrder();
  const { inventory, lowStockItems, restock, adjustStock } = useInventory();
  const { returnRequests } = useReturn();
  const { showToast } = useToast();

  const effectiveRole = normalizeRole(currentUser?.role || currentRole, currentUser?.email);

  // Vouchers state synced with Supabase Cloud
  const [vouchersList, setVouchersList] = useState<SupabaseVoucher[]>(initialVouchersList);

  useEffect(() => {
    fetchVouchersFromSupabase().then((supaVouchers) => {
      if (supaVouchers && supaVouchers.length > 0) {
        setVouchersList(supaVouchers);
      }
    });
  }, []);

  // Audit Logs state synced globally via auditLogService
  const [auditLogsList, setAuditLogsList] = useState<AuditLogEntry[]>([]);
  const [adminAuditError, setAdminAuditError] = useState(false);
  useEffect(() => {
    if (effectiveRole !== 'admin') return;
    let active = true;
    const refresh = async () => {
      try { const rows = await fetchAdminAccountEvents(supabase); if (active) { setAuditLogsList(rows); setAdminAuditError(false); } }
      catch { if (active) { setAuditLogsList([]); setAdminAuditError(true); } }
    };
    void refresh();
    const timer = setInterval(() => { void refresh(); }, 15000);
    return () => { active = false; clearInterval(timer); };
  }, [effectiveRole]);
  const [, setMatrixVersion] = useState(0);

  useEffect(() => {
    const handleLogsUpdate = (e: any) => {
      if (effectiveRole === 'admin') return;
      if (e.detail && Array.isArray(e.detail)) {
        setAuditLogsList(e.detail);
      } else {
        setAuditLogsList(getAuditLogs());
      }
    };
    const handleMatrixUpdate = () => setMatrixVersion((v) => v + 1);

    window.addEventListener('curve_audit_logs_updated', handleLogsUpdate);
    window.addEventListener('curve_access_matrix_updated', handleMatrixUpdate);
    return () => {
      window.removeEventListener('curve_audit_logs_updated', handleLogsUpdate);
      window.removeEventListener('curve_access_matrix_updated', handleMatrixUpdate);
    };
  }, [effectiveRole]);

  const appendAuditLog = (
    action: string,
    category: string,
    targetCode: string,
    targetDesc: string,
    result: 'success' | 'denied' = 'success',
    reason?: string
  ) => {
    // Account events are recorded by the database transaction, never asserted by browser storage.
    if (effectiveRole === 'admin') return;
    const performer = {
      id: currentUser?.id,
      name: currentUser?.name || 'Người quản lý',
      role: 'Manager' as const,
      code: 'Quản lý cửa hàng',
    };
    const newLog = appendAuditLogService(action, category, targetCode, targetDesc, result, reason, performer);
    setAuditLogsList((prev) => [newLog, ...prev.filter((l) => l.id !== newLog.id)]);
  };

  // Dynamic RBAC Permission Checker respecting custom matrix from RolePermissionTab
  const isTabAllowed = (tab: AdminTab, role: UserRole): boolean => {
    return canAccessPortalTab(tab, role);
  };

  // Active Tab state
  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    if (initialTab) return initialTab;
    return effectiveRole === 'manager' ? 'products' : 'system_dashboard';
  });

  const [productSubTab, setProductSubTab] = useState<ProductSubTab>('list');

  // Sync when initialTab changes from URL
  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Normalize initial URL
  useEffect(() => {
    if (!initialTab) {
      const defaultTab: AdminTab = effectiveRole === 'manager' ? 'products' : 'system_dashboard';
      const prefix = effectiveRole === 'manager' ? '/manager' : '/admin';
      onNavigate(`${prefix}/${tabToSlug(defaultTab)}`);
    }
  }, []);

  // Auto switch tab if role changes
  useEffect(() => {
    if (effectiveRole === 'admin' && !SYSTEM_ADMIN_TABS.includes(activeTab)) {
      const defaultTab: AdminTab = 'system_dashboard';
      setActiveTab(defaultTab);
      onNavigate(`/admin/${tabToSlug(defaultTab)}`);
    } else if (effectiveRole === 'manager' && !MANAGER_OPERATIONS_TABS.includes(activeTab)) {
      const defaultTab: AdminTab = 'products';
      setActiveTab(defaultTab);
      onNavigate(`/manager/${tabToSlug(defaultTab)}`);
    }
  }, [effectiveRole]);

  const handleTabChange = (tab: AdminTab) => {
    setActiveTab(tab);
    const prefix = effectiveRole === 'manager' ? '/manager' : '/admin';
    onNavigate(`${prefix}/${tabToSlug(tab)}`);

    if (!isTabAllowed(tab, effectiveRole)) {
      appendAuditLog(
        `Truy cập phân hệ ${getTabDisplayName(tab)}`,
        'Kiểm soát truy cập (RBAC)',
        `/admin/${tab}`,
        'Bị từ chối truy cập (403 Forbidden)',
        'denied',
        `${effectiveRole === 'admin' ? 'Administrator' : 'Store Manager'} không có thẩm quyền truy cập phân hệ này`
      );
    }
  };

  // Inventory filter state when navigating from other tabs (Reports / Products)
  const [inventoryInitialFilter, setInventoryInitialFilter] = useState<'all' | 'safe' | 'low_stock' | 'out_of_stock'>('all');

  const [inventoryInitialSku, setInventoryInitialSku] = useState('');

  const handleNavigateToInventory = (subTab?: string, alertScope?: string) => {
    setInventoryInitialSku('');
    if (alertScope === 'out_of_stock') {
      setInventoryInitialFilter('out_of_stock');
    } else if (alertScope === 'low_stock' || subTab === 'alerts') {
      setInventoryInitialFilter('low_stock');
    } else {
      setInventoryInitialFilter('all');
    }
    handleTabChange('inventory');
  };

  // Pending counts for sidebar notification badges
  const pendingOrders = orders.filter((o) => o.status === 'placed').length;
  const pendingReturns = returnRequests.filter((r) => r.status === 'pending_review').length;

  return (
    <div className="h-screen bg-[#F4F4F5] flex flex-col font-sans text-charcoal-900 overflow-hidden">
      {/* Top Header */}
      <AdminHeader
        currentRole={effectiveRole}
        onBackToStore={onBackToStore}
        onShowNotification={() => showToast('Thông báo hệ thống', 'Không có cảnh báo bảo mật mới.', 'info')}
        onSwitchRole={switchRole}
        onNavigate={onNavigate}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <AdminSidebar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          pendingOrdersCount={pendingOrders}
          pendingReturnsCount={pendingReturns}
          lowStockCount={lowStockItems.length}
          currentRole={effectiveRole}
          onBackToStore={onBackToStore}
          activeProductSubTab={productSubTab}
          onSelectProductSubTab={setProductSubTab}
        />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-[#F4F4F5]">
          {effectiveRole === 'admin' && adminAuditError && (
            <p role="alert" className="mb-4 text-sm text-amber-800">Chưa tải được nhật ký quản trị từ hệ thống. Không thể xác nhận lịch sử hoạt động lúc này.</p>
          )}
          {/* RBAC Permission Guard */}
          {!isTabAllowed(activeTab, effectiveRole) ? (
            <div className="max-w-3xl mx-auto py-12 px-4 animate-scaleIn">
              <div className="bg-white rounded-3xl border border-stone-200/90 p-8 sm:p-10 shadow-sm text-center space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                  <ShieldAlert className="w-8 h-8" />
                </div>

                <div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200 inline-block">
                    Truy Cập Bị Từ Chối (Mã 403) • Phân Quyền Giới Hạn
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-charcoal-900 mt-3">
                    Không Có Thẩm Quyền Truy Cập
                  </h2>
                  <p className="text-sm font-semibold text-brand-700 mt-1">
                    Phân hệ: {getTabDisplayName(activeTab)}
                  </p>
                </div>

                <div className="p-5 bg-stone-50 rounded-2xl border border-stone-200 text-left text-xs text-charcoal-600 space-y-2.5">
                  <p className="font-bold text-charcoal-800 text-xs flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-stone-500" />
                    Chính sách kiểm soát phân quyền hạn ngạch:
                  </p>
                  {effectiveRole === 'admin' ? (
                    <p className="leading-relaxed">
                      Bạn đang đăng nhập với vai trò <strong>Quản trị viên hệ thống</strong>. Theo ma trận phân quyền chuẩn của Curve & Confidence, Quản trị viên phụ trách hạ tầng kỹ thuật, tài khoản và an ninh. Toàn bộ nghiệp vụ <strong>Vận hành kinh doanh (Voucher, Đơn hàng, Tồn kho, Đổi size)</strong> thuộc thẩm quyền độc lập của <strong>Quản lý cửa hàng</strong>.
                    </p>
                  ) : effectiveRole === 'manager' ? (
                    <p className="leading-relaxed">
                      Bạn đang đăng nhập với vai trò <strong>Quản lý cửa hàng</strong>. Quản lý cửa hàng không có thẩm quyền truy cập cấu hình hệ thống máy chủ, phân bổ quyền hạn nhân sự hoặc kiểm tra nhật ký bảo mật toàn hệ thống của <strong>Quản trị viên</strong>.
                    </p>
                  ) : (
                    <p className="leading-relaxed">
                      Tài khoản của bạn đang ở vai trò <strong>Khách hàng</strong>. Cổng Quản Trị chỉ dành riêng cho nhân sự có quyền hạn (Quản lý cửa hàng và Quản trị viên).
                    </p>
                  )}
                  <div className="pt-2 text-[11px] text-stone-500 border-t border-stone-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Quyền truy cập được giới hạn theo vai trò tài khoản đã xác thực.
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  {effectiveRole === 'admin' ? (
                    <>
                      <button
                        onClick={() => {
                          setActiveTab('system_dashboard');
                          onNavigate('/admin/system-dashboard');
                        }}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-charcoal-900 hover:bg-black text-white font-bold text-xs transition-colors cursor-pointer"
                      >
                        Về Trang Quản Trị
                      </button>
                      <button
                        onClick={onBackToStore}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-charcoal-700 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Quay về Cửa Hàng</span>
                      </button>
                    </>
                  ) : effectiveRole === 'manager' ? (
                    <>
                      <button
                        onClick={() => {
                          setActiveTab('products');
                          onNavigate('/manager/products');
                        }}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-charcoal-900 font-bold text-xs transition-colors cursor-pointer"
                      >
                        Về Vận Hành Cửa Hàng
                      </button>
                      <button
                        onClick={onBackToStore}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-charcoal-700 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Quay về Cửa Hàng</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={onBackToStore}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Quay về cửa hàng</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* ================= ADMIN ROLE TABS ================= */}
              {activeTab === 'system_dashboard' && (
                <SystemDashboardTab
                  allUsers={allUsers}
                  auditLogsList={auditLogsList}
                  auditLoadError={adminAuditError}
                  onNavigateToAuditLogs={() => handleTabChange('audit_logs')}
                />
              )}

              {activeTab === 'user_management' && (
                <UserManagementTab
                  allUsers={allUsers}
                  currentUser={currentUser}
                  isSyncingUsers={isSyncingUsers}
                  syncUsersWithSupabase={syncUsersWithSupabase}
                  createUser={createUser}
                  updateUserRole={updateUserRole}
                  toggleUserStatus={toggleUserStatus}
                  deleteUser={deleteUser}
                  onAppendAuditLog={(action, category, targetCode, targetDesc) =>
                    appendAuditLog(action, category, targetCode, targetDesc)
                  }
                />
              )}

              {activeTab === 'role_permission' && (
                <RolePermissionTab
                  allUsers={allUsers}
                  currentUser={currentUser}
                  onAppendAuditLog={(action, category, targetCode, targetDesc) =>
                    appendAuditLog(action, category, targetCode, targetDesc)
                  }
                  onNavigateToUsers={() => handleTabChange('user_management')}
                />
              )}

              {activeTab === 'system_settings' && (
                <SystemSettingsTab
                  currentUser={currentUser}
                  onAppendAuditLog={(action, category, targetCode, targetDesc) =>
                    appendAuditLog(action, category, targetCode, targetDesc)
                  }
                />
              )}

              {activeTab === 'audit_logs' && (
                <AuditLogsTab auditLogsList={auditLogsList} loadError={adminAuditError} />
              )}

              {/* ================= MANAGER ROLE TABS ================= */}
              {activeTab === 'products' && (
                <ProductsTab
                  productSubTab={productSubTab}
                  onSelectProductSubTab={setProductSubTab}
                  onNavigateToInventory={handleNavigateToInventory}
                  onRestockSku={(sku) => { setInventoryInitialFilter('all'); setInventoryInitialSku(sku); handleTabChange('inventory'); }}
                  appendAuditLog={appendAuditLog}
                />
              )}

              {activeTab === 'inventory' && (
                <InventoryTab
                  key={`inv-${inventoryInitialFilter}-${inventoryInitialSku}`}
                  inventory={inventory}
                  initialStatusFilter={inventoryInitialFilter}
                  initialSkuSearch={inventoryInitialSku}
                  restock={(sku, qty, reason) => restock(sku, qty, reason || 'Nhập bổ sung')}
                  adjustStock={(sku, actualQty, reason, performer, expectedQty) => adjustStock(sku, actualQty, reason, performer, expectedQty)}
                  onAppendAuditLog={(action, category, targetCode, targetDesc) =>
                    appendAuditLog(action, category, targetCode, targetDesc)
                  }
                />
              )}

              {activeTab === 'orders' && (
                <OrdersTab
                  orders={orders}
                  updateOrderStatus={updateOrderStatus}
                  updatePaymentStatus={updatePaymentStatus}
                  updateOrderShippingAddress={updateOrderShippingAddress}
                  onAppendAuditLog={(action, category, targetCode, targetDesc) =>
                    appendAuditLog(action, category, targetCode, targetDesc)
                  }
                />
              )}

              {activeTab === 'returns' && (
                <ReturnsTab
                  onAppendAuditLog={(action, category, targetCode, targetDesc, result, reason) =>
                    appendAuditLog(action, category, targetCode, targetDesc, result, reason)
                  }
                />
              )}

              {activeTab === 'vouchers' && (
                <VouchersTab
                  vouchersList={vouchersList}
                  setVouchersList={setVouchersList}
                  onAppendAuditLog={(action, category, targetCode, targetDesc, result, reason) =>
                    appendAuditLog(action, category, targetCode, targetDesc, result, reason)
                  }
                />
              )}

              {activeTab === 'reports' && (
                <ReportsTab
                  orders={orders}
                  inventory={inventory}
                  products={products}
                  returnRequests={returnRequests}
                  onNavigateToInventory={handleNavigateToInventory}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};
