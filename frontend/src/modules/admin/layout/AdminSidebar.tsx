import React, { useState } from 'react';
import {
  LayoutDashboard,
  Package,
  Tag,
  Warehouse,
  Truck,
  RotateCcw,
  Users,
  ShieldCheck,
  Settings,
  History,
  Lock,
  BarChart3,
  ChevronDown,
  FolderTree,
  Boxes,
  Ruler
} from 'lucide-react';
import { UserRole } from '../../../shared/types';
import { normalizeRole } from '../../../shared/utils/roleUtils';

export type ProductSubTab = 'categories' | 'list' | 'variants' | 'size_chart' | 'pricing';

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

interface AdminSidebarProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  pendingOrdersCount: number;
  pendingReturnsCount: number;
  lowStockCount: number;
  currentRole?: UserRole;
  onBackToStore?: () => void;
  activeProductSubTab?: ProductSubTab;
  onSelectProductSubTab?: (subTab: ProductSubTab) => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  setActiveTab,
  pendingOrdersCount,
  pendingReturnsCount,
  lowStockCount,
  currentRole = 'admin',
  activeProductSubTab = 'list',
  onSelectProductSubTab,
}) => {
  const normRole = normalizeRole(currentRole);
  const isManager = normRole === 'manager';
  const isAdmin = normRole === 'admin';
  const [isProductsMenuOpen, setIsProductsMenuOpen] = useState(true);

  return (
    <aside className="w-64 bg-white border-r border-stone-200 flex flex-col shrink-0 select-none h-full overflow-hidden">
      <div className="p-3 space-y-4 overflow-y-auto flex-1">
        {/* GROUP 1: QUẢN TRỊ HỆ THỐNG - CHỈ HIỂN THỊ CHO ADMIN */}
        {isAdmin && (
          <div>
            <div className="px-3 pb-2">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                QUẢN TRỊ HỆ THỐNG
              </span>
            </div>
            <div className="space-y-1">
              {/* 1. Dashboard */}
              <button
                onClick={() => setActiveTab('system_dashboard')}
                className={`w-full text-left px-3.5 py-2 rounded-xl transition-all flex items-center justify-between ${
                  activeTab === 'system_dashboard'
                    ? 'bg-[#5C1D24] text-white shadow-xs'
                    : 'text-charcoal-700 hover:bg-stone-100 hover:text-charcoal-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <LayoutDashboard className={`w-4 h-4 shrink-0 ${activeTab === 'system_dashboard' ? 'text-white' : 'text-stone-500'}`} />
                  <div>
                    <span className="font-bold text-xs block leading-tight">Tổng Quan Hệ Thống</span>
                    <span className={`text-[10px] block ${activeTab === 'system_dashboard' ? 'text-stone-200' : 'text-stone-400'}`}>
                      Thống kê & hiệu suất máy chủ
                    </span>
                  </div>
                </div>
              </button>

              {/* 2. User Management */}
              <button
                onClick={() => setActiveTab('user_management')}
                className={`w-full text-left px-3.5 py-2 rounded-xl transition-all flex items-center justify-between ${
                  activeTab === 'user_management'
                    ? 'bg-[#5C1D24] text-white shadow-xs'
                    : 'text-charcoal-700 hover:bg-stone-100 hover:text-charcoal-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users className={`w-4 h-4 shrink-0 ${activeTab === 'user_management' ? 'text-white' : 'text-stone-500'}`} />
                  <div>
                    <span className="font-bold text-xs block leading-tight">Quản Lý Tài Khoản</span>
                    <span className={`text-[10px] block ${activeTab === 'user_management' ? 'text-stone-200' : 'text-stone-400'}`}>
                      Danh sách & hồ sơ thành viên
                    </span>
                  </div>
                </div>
              </button>

              {/* 3. Role & Permission */}
              <button
                onClick={() => setActiveTab('role_permission')}
                className={`w-full text-left px-3.5 py-2 rounded-xl transition-all flex items-center justify-between ${
                  activeTab === 'role_permission'
                    ? 'bg-[#5C1D24] text-white shadow-xs'
                    : 'text-charcoal-700 hover:bg-stone-100 hover:text-charcoal-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className={`w-4 h-4 shrink-0 ${activeTab === 'role_permission' ? 'text-white' : 'text-stone-500'}`} />
                  <div>
                    <span className="font-bold text-xs block leading-tight">Vai Trò & Phân Quyền</span>
                    <span className={`text-[10px] block ${activeTab === 'role_permission' ? 'text-stone-200' : 'text-stone-400'}`}>
                      Cấp quyền Quản trị & Quản lý
                    </span>
                  </div>
                </div>
              </button>

              {/* 4. System Settings */}
              <button
                onClick={() => setActiveTab('system_settings')}
                className={`w-full text-left px-3.5 py-2 rounded-xl transition-all flex items-center justify-between ${
                  activeTab === 'system_settings'
                    ? 'bg-[#5C1D24] text-white shadow-xs'
                    : 'text-charcoal-700 hover:bg-stone-100 hover:text-charcoal-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Settings className={`w-4 h-4 shrink-0 ${activeTab === 'system_settings' ? 'text-white' : 'text-stone-500'}`} />
                  <div>
                    <span className="font-bold text-xs block leading-tight">Cấu Hình Hệ Thống</span>
                    <span className={`text-[10px] block ${activeTab === 'system_settings' ? 'text-stone-200' : 'text-stone-400'}`}>
                      Thiết lập bảo mật & vận hành
                    </span>
                  </div>
                </div>
              </button>

              {/* 5. Audit Logs */}
              <button
                onClick={() => setActiveTab('audit_logs')}
                className={`w-full text-left px-3.5 py-2 rounded-xl transition-all flex items-center justify-between ${
                  activeTab === 'audit_logs'
                    ? 'bg-[#5C1D24] text-white shadow-xs'
                    : 'text-charcoal-700 hover:bg-stone-100 hover:text-charcoal-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <History className={`w-4 h-4 shrink-0 ${activeTab === 'audit_logs' ? 'text-white' : 'text-stone-500'}`} />
                  <div>
                    <span className="font-bold text-xs block leading-tight">Nhật Ký Hoạt Động</span>
                    <span className={`text-[10px] block ${activeTab === 'audit_logs' ? 'text-stone-200' : 'text-stone-400'}`}>
                      Lịch sử thao tác quản trị
                    </span>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* GROUP 2: VẬN HÀNH KINH DOANH - CHỈ HIỂN THỊ CHO MANAGER */}
        {isManager && (
          <div>
            <div className="px-3 pb-2">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                VẬN HÀNH KINH DOANH
              </span>
            </div>
            <div className="space-y-1">
              {/* 6. Sản phẩm & Size (Collapsible Submenu - 5 Phân Hệ) */}
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab !== 'products') {
                      setActiveTab('products');
                      setIsProductsMenuOpen(true);
                      onSelectProductSubTab?.(activeProductSubTab || 'list');
                    } else {
                      setIsProductsMenuOpen(!isProductsMenuOpen);
                    }
                  }}
                  className={`w-full text-left px-3.5 py-2 rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                    activeTab === 'products'
                      ? 'bg-[#5C1D24] text-white shadow-xs'
                      : 'text-charcoal-700 hover:bg-stone-100 hover:text-charcoal-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Package className={`w-4 h-4 shrink-0 ${activeTab === 'products' ? 'text-white' : 'text-stone-500'}`} />
                    <div>
                      <span className="font-bold text-xs block leading-tight">Sản Phẩm & Size</span>
                      <span className={`text-[10px] block ${activeTab === 'products' ? 'text-stone-200' : 'text-stone-400'}`}>
                        Bảng size XL–5XL & giá
                      </span>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 shrink-0 ${
                      isProductsMenuOpen ? 'rotate-180' : ''
                    } ${activeTab === 'products' ? 'text-stone-200' : 'text-stone-400'}`}
                  />
                </button>

                {/* Submenu: 3 Phân Hệ Quản Lý Tinh Gọn (Hợp Nhất Danh Mục + Sản Phẩm + Giá Bán) */}
                {isProductsMenuOpen && (
                  <div className="pl-4 pr-1 py-1 space-y-1 animate-fadeIn">
                    {[
                      { id: 'list' as ProductSubTab, label: 'Danh Mục Sản Phẩm', icon: Package },
                      { id: 'variants' as ProductSubTab, label: 'Biến Thể Sản Phẩm', icon: Boxes },
                      { id: 'size_chart' as ProductSubTab, label: 'Bảng Đo Kích Cỡ', icon: Ruler },
                    ].map((sub) => {
                      const isSubActive =
                        activeTab === 'products' &&
                        (activeProductSubTab === sub.id || (!activeProductSubTab && sub.id === 'list') || (activeProductSubTab === 'categories' && sub.id === 'list') || (activeProductSubTab === 'pricing' && sub.id === 'list'));
                      const SubIcon = sub.icon;
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => {
                            if (activeTab !== 'products') setActiveTab('products');
                            onSelectProductSubTab?.(sub.id);
                          }}
                          className={`w-full text-left pl-3 pr-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                            isSubActive
                              ? 'bg-[#5C1D24]/10 text-[#5C1D24] font-bold border-l-2 border-[#5C1D24]'
                              : 'text-stone-600 hover:bg-stone-100 hover:text-charcoal-900'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <SubIcon className={`w-3.5 h-3.5 shrink-0 ${isSubActive ? 'text-[#5C1D24]' : 'text-stone-400'}`} />
                            <span className="text-[11px] truncate">{sub.label}</span>
                          </div>
                          {isSubActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#5C1D24] shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 7. Kiểm Kê & Tồn Kho (Đổi tên theo thống nhất nhóm) */}
              <button
                type="button"
                onClick={() => setActiveTab('inventory')}
                className={`w-full text-left px-3.5 py-2 rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                  activeTab === 'inventory'
                    ? 'bg-[#5C1D24] text-white shadow-xs'
                    : 'text-charcoal-700 hover:bg-stone-100 hover:text-charcoal-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Warehouse className={`w-4 h-4 shrink-0 ${activeTab === 'inventory' ? 'text-white' : 'text-stone-500'}`} />
                  <div>
                    <span className="font-bold text-xs block leading-tight">Kiểm Kê & Tồn Kho</span>
                    <span className={`text-[10px] block ${activeTab === 'inventory' ? 'text-stone-200' : 'text-stone-400'}`}>
                      Kiểm kê & cảnh báo hàng hóa
                    </span>
                  </div>
                </div>
                {lowStockCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[10px] font-bold rounded-full">
                    {lowStockCount}
                  </span>
                )}
              </button>

              {/* 8. Đơn hàng */}
              <button
                onClick={() => setActiveTab('orders')}
                className={`w-full text-left px-3.5 py-2 rounded-xl transition-all flex items-center justify-between ${
                  activeTab === 'orders'
                    ? 'bg-[#5C1D24] text-white shadow-xs'
                    : 'text-charcoal-700 hover:bg-stone-100 hover:text-charcoal-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Truck className={`w-4 h-4 shrink-0 ${activeTab === 'orders' ? 'text-white' : 'text-stone-500'}`} />
                  <div>
                    <span className="font-bold text-xs block leading-tight">Đơn Hàng & Vận Đơn</span>
                    <span className={`text-[10px] block ${activeTab === 'orders' ? 'text-stone-200' : 'text-stone-400'}`}>
                      Quản lý đơn hàng và giao nhận
                    </span>
                  </div>
                </div>
                {pendingOrdersCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full">
                    {pendingOrdersCount}
                  </span>
                )}
              </button>

              {/* 9. Đổi trả */}
              <button
                onClick={() => setActiveTab('returns')}
                className={`w-full text-left px-3.5 py-2 rounded-xl transition-all flex items-center justify-between ${
                  activeTab === 'returns'
                    ? 'bg-[#5C1D24] text-white shadow-xs'
                    : 'text-charcoal-700 hover:bg-stone-100 hover:text-charcoal-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <RotateCcw className={`w-4 h-4 shrink-0 ${activeTab === 'returns' ? 'text-white' : 'text-stone-500'}`} />
                  <div>
                    <span className="font-bold text-xs block leading-tight">Đổi Size & Hậu Mãi</span>
                    <span className={`text-[10px] block ${activeTab === 'returns' ? 'text-stone-200' : 'text-stone-400'}`}>
                      Đổi size 7 ngày tận nơi
                    </span>
                  </div>
                </div>
                {pendingReturnsCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-purple-600 text-white text-[10px] font-bold rounded-full">
                    {pendingReturnsCount}
                  </span>
                )}
              </button>

              {/* 10. Voucher */}
              <button
                onClick={() => setActiveTab('vouchers')}
                className={`w-full text-left px-3.5 py-2 rounded-xl transition-all flex items-center justify-between ${
                  activeTab === 'vouchers'
                    ? 'bg-[#5C1D24] text-white shadow-xs'
                    : 'text-charcoal-700 hover:bg-stone-100 hover:text-charcoal-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Tag className={`w-4 h-4 shrink-0 ${activeTab === 'vouchers' ? 'text-white' : 'text-stone-500'}`} />
                  <div>
                    <span className="font-bold text-xs block leading-tight">Khuyến Mãi & Voucher</span>
                    <span className={`text-[10px] block ${activeTab === 'vouchers' ? 'text-stone-200' : 'text-stone-400'}`}>
                      Mã giảm giá & ưu đãi
                    </span>
                  </div>
                </div>
              </button>

              {/* 11. Báo cáo & Thống kê (FR-M05) */}
              <button
                onClick={() => setActiveTab('reports')}
                className={`w-full text-left px-3.5 py-2 rounded-xl transition-all flex items-center justify-between ${
                  activeTab === 'reports'
                    ? 'bg-[#5C1D24] text-white shadow-xs'
                    : 'text-charcoal-700 hover:bg-stone-100 hover:text-charcoal-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <BarChart3 className={`w-4 h-4 shrink-0 ${activeTab === 'reports' ? 'text-white' : 'text-stone-500'}`} />
                  <div>
                    <span className="font-bold text-xs block leading-tight">Báo Cáo & Thống Kê</span>
                    <span className={`text-[10px] block ${activeTab === 'reports' ? 'text-stone-200' : 'text-stone-400'}`}>
                      Doanh thu & chỉ tiêu kinh doanh
                    </span>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
