import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  Plus,
  Trash2,
  X
} from 'lucide-react';
import { UserAccount, UserRole } from '@/shared/types';
import { normalizeRole } from '@/shared/utils/roleUtils';
import { useToast } from '@/shared/context/ToastContext';
import { ConfirmModal } from '@/shared/components/ConfirmModal';
import { supabase } from '@/shared/services/supabaseClient';

interface UserManagementTabProps {
  allUsers: UserAccount[];
  currentUser: UserAccount | null;
  isSyncingUsers: boolean;
  syncUsersWithSupabase: () => Promise<void>;
  createUser: (userData: { name: string; email: string; phone?: string; role: UserRole }) => Promise<boolean | any>;
  updateUserRole: (userId: string, role: UserRole) => Promise<boolean>;
  toggleUserStatus: (userId: string) => Promise<boolean>;
  deleteUser: (userId: string) => Promise<boolean>;
  onAppendAuditLog: (action: string, category: string, targetCode: string, targetDesc: string) => void;
}

export const UserManagementTab: React.FC<UserManagementTabProps> = ({
  allUsers,
  currentUser,
  isSyncingUsers,
  syncUsersWithSupabase,
  createUser,
  updateUserRole,
  toggleUserStatus,
  deleteUser,
  onAppendAuditLog,
}) => {
  const { showToast } = useToast();

  // Filters
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'admin' | 'manager' | 'customer'>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'locked'>('all');

  // Modals
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('customer');
  const [deletingUser, setDeletingUser] = useState<UserAccount | null>(null);
  const [lockingUser, setLockingUser] = useState<{ user: UserAccount; action: 'lock' | 'unlock' } | null>(null);
  const [roleChange, setRoleChange] = useState<{ user: UserAccount; role: UserRole } | null>(null);

  const [resettingUser, setResettingUser] = useState<UserAccount | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!isAddUserModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isCreating) setIsAddUserModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddUserModalOpen, isCreating]);
  const roleLabel = (role: UserRole) => role === 'admin' ? 'Quản trị viên' : role === 'manager' ? 'Quản lý' : 'Khách hàng';

  // Filtered Users
  const filteredUsers = allUsers.filter((u) => {
    const matchSearch =
      !userSearchQuery ||
      u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      (u.phone && u.phone.includes(userSearchQuery));
    const userNormRole = normalizeRole(u.role, u.email, u.name);
    const matchRole = userRoleFilter === 'all' || userNormRole === userRoleFilter;
    const matchStatus = userStatusFilter === 'all' || u.status === userStatusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-charcoal-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-[#5C1D24]" />
            <span>Quản Lý Tài Khoản</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              try {
                await syncUsersWithSupabase();
                showToast('Đồng bộ dữ liệu', 'Đã tải danh sách tài khoản thành công', 'success');
              } catch { showToast('Chưa thể đồng bộ', 'Không tải được danh sách tài khoản. Vui lòng thử lại.', 'error'); }
            }}
            disabled={isSyncingUsers}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isSyncingUsers ? 'animate-spin' : ''}`} />
            <span>{isSyncingUsers ? 'Đang đồng bộ...' : 'Đồng bộ dữ liệu'}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAddUserModalOpen(true)}
            className="px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm tài khoản mới</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={userSearchQuery}
            onChange={(e) => setUserSearchQuery(e.target.value)}
            placeholder="Tìm tên, email, số điện thoại..."
            className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-brand-700/20"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={userRoleFilter}
            onChange={(e) => setUserRoleFilter(e.target.value as any)}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-charcoal-800 cursor-pointer"
          >
            <option value="all">Tất cả vai trò</option>
            <option value="admin">Administrator (Admin)</option>
            <option value="manager">Manager (Quản lý)</option>
            <option value="customer">Customer (Khách hàng)</option>
          </select>

          <select
            value={userStatusFilter}
            onChange={(e) => setUserStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-charcoal-800 cursor-pointer"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="locked">Bị khóa</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden shadow-2xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="p-4">Tài Khoản & Thành Viên</th>
              <th className="p-4">Email / Số Điện Thoại</th>
              <th className="p-4">Vai Trò</th>
              <th className="p-4">Trạng Thái</th>
              <th className="p-4 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filteredUsers.map((u, idx) => (
              <tr key={u.id} className="hover:bg-stone-50/50">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-stone-200 flex items-center justify-center font-bold text-charcoal-700 shrink-0">
                      {u.avatar ? <img src={u.avatar} alt={u.name} className="w-full h-full object-cover rounded-full" /> : u.name[0]}
                    </div>
                    <div>
                      <span className="font-bold text-charcoal-900 block">{u.name}</span>
                      <span className="text-[10px] text-stone-400 font-mono">TK-{String(idx + 1).padStart(3, '0')}</span>
                    </div>
                  </div>
                </td>

                <td className="p-4">
                  <p className="text-charcoal-800 font-medium">{u.email}</p>
                  <p className="text-stone-400 text-[11px]">{u.phone || 'Chưa cập nhật SĐT'}</p>
                </td>

                <td className="p-4">
                  <select
                    value={u.role}
                    disabled={u.id === currentUser?.id || normalizeRole(u.role) === 'admin'}
                    onChange={(e) => {
                      const newR = e.target.value as UserRole;
                      if (newR !== u.role) setRoleChange({ user: u, role: newR });
                    }}
                    className={`px-2.5 py-1 text-xs border rounded-lg font-bold cursor-pointer ${
                      u.role === 'admin'
                        ? 'bg-purple-50 text-purple-800 border-purple-200'
                        : u.role === 'manager'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-stone-50 text-charcoal-700 border-stone-200'
                    }`}
                  >
                    <option value="customer">Customer</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Administrator</option>
                  </select>
                </td>

                <td className="p-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    u.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {u.status === 'active' ? 'Đang hoạt động' : 'Đã khóa'}
                  </span>
                </td>

                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {(() => {
                      const isSelf = u.id === currentUser?.id || (!!currentUser?.email && u.email.toLowerCase() === currentUser.email.toLowerCase());
                      const protectedAccount = isSelf || normalizeRole(u.role) === 'admin';
                      return (
                        <>
                          <button
                            type="button"
                            disabled={protectedAccount}
                            onClick={() => {
                              if (isSelf && u.status === 'active') {
                                showToast('Bảo vệ an toàn', 'Bạn không thể tự khóa tài khoản của chính mình!', 'error');
                                return;
                              }
                              setLockingUser({
                                user: u,
                                action: u.status === 'active' ? 'lock' : 'unlock',
                              });
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                              isSelf && u.status === 'active'
                                ? 'opacity-40 cursor-not-allowed text-stone-400 bg-stone-100 border border-stone-200'
                                : u.status === 'active'
                                  ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 cursor-pointer'
                                  : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 cursor-pointer'
                            }`}
                            title={isSelf && u.status === 'active' ? 'Không thể tự khóa tài khoản đang đăng nhập' : undefined}
                          >
                            {u.status === 'active' ? 'Khóa' : 'Mở khóa'}
                          </button>

                          <button
                            type="button"
                            onClick={() => setResettingUser(u)}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 cursor-pointer"
                            title="Gửi yêu cầu khôi phục mật khẩu"
                          >
                            Khôi phục MK
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (u.email === 'binh98@gmail.com' || u.email === 'harrytran791@gmail.com' || u.email === 'kieuduyen@gmail.com' || u.id === 'usr_1' || u.id === 'usr_7' || u.id === 'usr_13') {
                                showToast('Bảo vệ hệ thống', 'Tài khoản Quản trị viên hệ thống gốc được bảo vệ, không thể xóa!', 'error');
                                return;
                              }
                              if (isSelf) {
                                showToast('Bảo vệ an toàn', 'Bạn không thể tự xóa tài khoản của chính mình!', 'error');
                                return;
                              }
                              setDeletingUser(u);
                            }}
                            className={`p-1 rounded-lg transition-colors ${
                              isSelf
                                ? 'opacity-30 cursor-not-allowed text-stone-300'
                                : 'text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer'
                            }`}
                            title={isSelf ? 'Không thể tự xóa tài khoản đang đăng nhập' : 'Xóa tài khoản'}
                            disabled={protectedAccount}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      );
                    })()}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sub-footer */}
      <div className="flex items-center justify-between pt-6 text-[11px] text-stone-400 border-t border-stone-200">
        <span>Curve & Confidence • Quản trị tài khoản</span>
        <span className="text-emerald-700 font-medium">Đồng bộ dữ liệu tài khoản • {allUsers.length} người dùng trên hệ thống</span>
      </div>

      {/* MODAL: CREATE USER */}
      {isAddUserModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-900/40 backdrop-blur-md animate-fadeIn"
          onClick={() => { if (!isCreating) setIsAddUserModalOpen(false); }}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-stone-200 my-auto animate-scaleIn text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
              <h3 className="font-bold text-sm text-charcoal-900">Thêm Tài Khoản Người Dùng Mới</h3>
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(false)}
                className="text-stone-400 hover:text-charcoal-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (isCreating) return;
                if (!newUserName.trim() || !newUserEmail.trim()) {
                  showToast('Thiếu thông tin', 'Vui lòng nhập tên và email.', 'error');
                  return;
                }
                const createdName = newUserName.trim();
                const createdRole = newUserRole;
                setIsCreating(true);
                let created = false;
                try { created = Boolean(await createUser({
                  name: createdName,
                  email: newUserEmail.trim(),
                  phone: newUserPhone.trim(),
                  role: createdRole,
                })); } finally { setIsCreating(false); }
                if (!created) return;
                showToast('Đã tạo hồ sơ tài khoản', `Đã lưu hồ sơ cho ${createdName}. Người dùng cần có đăng nhập đã xác minh để truy cập.`, 'success');
                setIsAddUserModalOpen(false);
                setNewUserName('');
                setNewUserEmail('');
                setNewUserPhone('');
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block text-stone-600 font-bold mb-1">Họ và tên:</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-bold mb-1">Email:</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-bold mb-1">Số điện thoại:</label>
                <input
                  type="text"
                  value={newUserPhone}
                  onChange={(e) => setNewUserPhone(e.target.value)}
                  placeholder="0912 345 678"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-bold mb-1">Vai trò:</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold cursor-pointer"
                >
                  <option value="customer">Customer (Khách hàng)</option>
                  <option value="manager">Manager (Quản lý)</option>
                  <option value="admin">Administrator (Admin)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 rounded-xl text-stone-600 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-xl font-bold cursor-pointer"
                >
                  Lưu tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE USER MODAL */}
      {roleChange && (
        <ConfirmModal isOpen title="Xác nhận thay đổi vai trò"
          description={`Đổi vai trò của ${roleChange.user.name} thành ${roleLabel(roleChange.role)}? Quyền truy cập của tài khoản sẽ thay đổi.`}
          confirmText="Xác nhận đổi vai trò" variant="warning"
          onCancel={() => setRoleChange(null)}
          onConfirm={async () => {
            if (!await updateUserRole(roleChange.user.id, roleChange.role)) return;
            showToast('Đã cập nhật vai trò', `Đã đổi vai trò thành ${roleLabel(roleChange.role)}.`, 'success');
            setRoleChange(null);
          }} />
      )}
      {resettingUser && (
        <ConfirmModal isOpen title="Xác nhận gửi yêu cầu khôi phục mật khẩu"
          description={`Gửi yêu cầu khôi phục đến ${resettingUser.email}? Chỉ chủ sở hữu hộp thư mới có thể hoàn tất đổi mật khẩu.`}
          confirmText="Gửi yêu cầu" variant="warning"
          onCancel={() => setResettingUser(null)}
          onConfirm={async () => {
            try {
              const { error } = await supabase.auth.resetPasswordForEmail(resettingUser.email, { redirectTo: `${window.location.origin}/login` });
              if (error) throw error;
              showToast('Đã tiếp nhận yêu cầu', 'Nếu tài khoản đủ điều kiện, hướng dẫn khôi phục sẽ được gửi đến hộp thư.', 'info');
              setResettingUser(null);
            } catch { showToast('Chưa thể gửi yêu cầu', 'Vui lòng kiểm tra kết nối và thử lại.', 'error'); }
          }} />
      )}
      {deletingUser && (
        <ConfirmModal
          isOpen={true}
          title="Xác Nhận Xóa Tài Khoản"
          description={`Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản ${deletingUser.name} (${deletingUser.email})? Tài khoản còn liên kết đăng nhập hoặc lịch sử nghiệp vụ sẽ được bảo vệ; hãy dùng Khóa để ngừng truy cập trong trường hợp đó.`}
          confirmText="Xóa Tài Khoản"
          cancelText="Hủy bỏ"
          variant="danger"
          onConfirm={async () => {
            const ok = await deleteUser(deletingUser.id);
            if (!ok) return;
            showToast('Đã xóa tài khoản', `Tài khoản ${deletingUser.name} đã được xóa vĩnh viễn khỏi hệ thống.`, 'success');
            setDeletingUser(null);
          }}
          onCancel={() => setDeletingUser(null)}
        />
      )}

      {/* CONFIRM LOCK/UNLOCK USER MODAL (2 BƯỚC AN TOÀN) */}
      {lockingUser && (
        <ConfirmModal
          isOpen={true}
          title={lockingUser.action === 'lock' ? 'Xác Nhận Khóa Tài Khoản' : 'Xác Nhận Mở Khóa Tài Khoản'}
          description={
            lockingUser.action === 'lock'
              ? `Bạn có chắc chắn muốn tạm khóa tài khoản của "${lockingUser.user.name}" (${lockingUser.user.email})? Hệ thống sẽ từ chối truy cập dữ liệu và thao tác của tài khoản này cho đến khi được mở khóa.`
              : `Bạn có chắc chắn muốn mở khóa cho tài khoản của "${lockingUser.user.name}" (${lockingUser.user.email}) hoạt động trở lại?`
          }
          confirmText={lockingUser.action === 'lock' ? 'Khóa Tài Khoản' : 'Mở Khóa Tài Khoản'}
          cancelText="Hủy bỏ"
          variant={lockingUser.action === 'lock' ? 'danger' : 'primary'}
          onConfirm={async () => {
            if (!await toggleUserStatus(lockingUser.user.id)) return;
            const newStat = lockingUser.action === 'lock' ? 'Khóa tài khoản' : 'Mở khóa tài khoản';
            showToast('Cập nhật tài khoản', `${newStat} ${lockingUser.user.name} thành công.`, 'info');
            onAppendAuditLog(
              newStat,
              'Quản lý tài khoản',
              'Tài khoản người dùng',
              `${lockingUser.user.name} (${lockingUser.user.email})`
            );
            setLockingUser(null);
          }}
          onCancel={() => setLockingUser(null)}
        />
      )}
    </div>
  );
};
