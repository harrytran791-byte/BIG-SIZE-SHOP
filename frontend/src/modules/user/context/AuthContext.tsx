import { transaction, databaseId } from '@/shared/services/transactionService';
import { authenticatedAccount, signInAccount } from '@/shared/services/secureAuthService';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserAccount, UserRole, ShippingAddress } from '@/types';
import { normalizeRole } from '@/shared/utils/roleUtils';
import { fetchUsersFromSupabase, supabase } from '@/shared/services/supabaseClient';
import { useToast } from '@/shared/context/ToastContext';
import { appendAuditLog } from '@/shared/services/auditLogService';
import { getSystemSettings } from '@/shared/services/systemSettingsService';
import { manageAdminAccount } from '@/shared/services/adminAccountService';
import {
  normalizeFullName,
  validateFullName,
  validateVietnamesePhone,
  validateEmail,
  validateGender,
  validateBirthday,
  validateShippingAddressInput
} from '@/shared/utils/userInputValidation';

interface AuthContextType {
  currentUser: UserAccount | null;
  currentRole: UserRole;
  allUsers: UserAccount[];
  isSyncingUsers: boolean;
  syncUsersWithSupabase: () => Promise<void>;
  createUser: (userData: { name: string; email: string; phone?: string; role: UserRole }) => Promise<boolean>;
  isAuthModalOpen: boolean;
  authModalTab: 'login' | 'register' | 'forgot';
  openAuthModal: (tab?: 'login' | 'register' | 'forgot') => void;
  closeAuthModal: () => void;
  isLoginPromptOpen: boolean;
  loginPromptMessage?: string;
  openLoginPrompt: (message?: string) => void;
  closeLoginPrompt: () => void;
  switchRole: (role: UserRole) => void;
  login: (email: string, pass?: string) => Promise<boolean>;
  register: (name: string, email: string, phone: string, pass?: string) => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
  setAccountPassword: (newPassword: string) => Promise<boolean>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (data: Partial<UserAccount>) => Promise<boolean>;
  addAddress: (address: Omit<ShippingAddress, 'id'>) => Promise<boolean>;
  updateAddress: (id: string, address: Partial<ShippingAddress>) => Promise<boolean>;
  deleteAddress: (id: string) => Promise<boolean>;
  setDefaultAddress: (id: string) => Promise<boolean>;
  updateUserRole: (userId: string, newRole: UserRole) => Promise<boolean>;
  toggleUserStatus: (userId: string) => Promise<boolean>;
  deleteUser: (userId: string) => Promise<boolean>;
  resetDefaultUsers: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getLockedUsers = (): string[] => {
  try {
    const saved = localStorage.getItem('curve_locked_users');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const saveLockedUsers = (list: string[]) => {
  try {
    localStorage.setItem('curve_locked_users', JSON.stringify(list));
  } catch {}
};

const appendGlobalAuditLog = (
  action: string,
  category: string,
  targetCode: string,
  targetDesc: string,
  reason?: string,
  performer?: { id?: string; name: string; role: 'Admin' | 'Manager' | 'Customer'; code?: string }
) => {
  appendAuditLog(action, category, targetCode, targetDesc, 'success', reason, performer);
};

const AUTH_VERSION_KEY = 'curve_auth_version';
const CURRENT_AUTH_VERSION = 'curve_auth_v3_guest_default';

// Đảm bảo xóa sạch các phiên lưu admin tự động cũ trên trình duyệt để mọi khách truy cập đều ở trạng thái Logout (Guest)
try {
  if (typeof window !== 'undefined') {
    const version = localStorage.getItem(AUTH_VERSION_KEY);
    if (version !== CURRENT_AUTH_VERSION) {
      localStorage.removeItem('curve_current_user_obj');
      localStorage.removeItem('curve_current_role');
      localStorage.removeItem('curve_current_user_id');
      sessionStorage.removeItem('curve_current_user_obj');
      sessionStorage.removeItem('curve_current_role');
      sessionStorage.removeItem('curve_current_user_id');
      localStorage.setItem(AUTH_VERSION_KEY, CURRENT_AUTH_VERSION);
    }
  }
} catch {}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Session-based state: automatically resets when closing and reopening browser
  const [allUsers, setAllUsers] = useState<UserAccount[]>([]);

  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>('guest');

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);
  const [loginPromptMessage, setLoginPromptMessage] = useState<string | undefined>(undefined);
  const [isSyncingUsers, setIsSyncingUsers] = useState(false);

  const { showToast } = useToast();

  const syncUsersWithSupabase = async (accountOverride?: UserAccount | null) => {
    const acc = accountOverride !== undefined ? accountOverride : currentUser;
    const role = acc ? normalizeRole(acc.role, acc.email) : 'guest';
    // Chỉ Admin và Manager mới có quyền và nhu cầu tải toàn bộ danh sách tài khoản
    if (role !== 'admin' && role !== 'manager') {
      return;
    }

    setIsSyncingUsers(true);
    try {
      const supabaseUsers = await fetchUsersFromSupabase({ strict: true });
      if (supabaseUsers) {
        const mappedUsers = supabaseUsers.map(u => ({
          ...u,
          status: u.status
        }));
        setAllUsers(mappedUsers);
        sessionStorage.setItem('curve_all_users', JSON.stringify(mappedUsers));
        localStorage.setItem('curve_all_users', JSON.stringify(mappedUsers));
      }
    } catch (err) {
      console.warn('Sync users error:', err);
    } finally {
      setIsSyncingUsers(false);
    }
  };

  useEffect(() => {
    for (const storage of [sessionStorage, localStorage]) {
      for (const key of Object.keys(storage)) if (key.startsWith('curve_pass_')) storage.removeItem(key);
    }
    let active = true;
    const restore = async () => {
      const account = await authenticatedAccount(supabase).catch(() => null);
      if (active) {
        setCurrentUser(account);
        setCurrentRole(account?.role || 'guest');
        if (account) void syncUsersWithSupabase(account).catch(() => {});
      }
    };
    void restore();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'INITIAL_SESSION') return;
      setTimeout(() => { void restore(); }, 0);
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    sessionStorage.setItem('curve_all_users', JSON.stringify(allUsers));
  }, [allUsers]);

  useEffect(() => {
    sessionStorage.setItem('curve_current_role', currentRole);
    if (currentUser) {
      sessionStorage.setItem('curve_current_user_id', currentUser.id);
      sessionStorage.setItem('curve_current_user_obj', JSON.stringify(currentUser));
    } else {
      sessionStorage.removeItem('curve_current_user_id');
      sessionStorage.removeItem('curve_current_user_obj');
    }
  }, [currentRole, currentUser]);

  // Session Inactivity / Idle Timeout Security Hook for Admin / Manager
  useEffect(() => {
    if (!currentUser) return;
    const norm = normalizeRole(currentUser.role, currentUser.email);
    if (norm !== 'admin' && norm !== 'manager') return;

    let lastActivityTime = Date.now();
    const updateActivity = () => {
      lastActivityTime = Date.now();
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'scroll', 'touchstart'];
    events.forEach((evt) => window.addEventListener(evt, updateActivity, { passive: true }));

    const checkInterval = setInterval(() => {
      const settings = getSystemSettings();
      const timeoutMs = (settings.idleTimeoutMinutes || 30) * 60 * 1000;
      if (Date.now() - lastActivityTime > timeoutMs) {
        appendGlobalAuditLog(
          'Hết hạn phiên do không hoạt động',
          'Cấu hình hệ thống',
          'Phiên làm việc',
          `Tự động đăng xuất sau ${settings.idleTimeoutMinutes || 30} phút không có thao tác`,
          'Chính sách bảo mật phiên làm việc'
        );
        logout();
        showToast(
          'Hết hạn phiên làm việc',
          `Phiên đăng nhập đã tự động kết thúc sau ${settings.idleTimeoutMinutes || 30} phút không hoạt động để bảo vệ an toàn.`,
          'info'
        );
      }
    }, 30000);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, updateActivity));
      clearInterval(checkInterval);
    };
  }, [currentUser]);

  const openAuthModal = (tab: 'login' | 'register' | 'forgot' = 'login') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(false);
    if (tab === 'register') {
      window.location.href = '/register';
    } else {
      window.location.href = '/login';
    }
  };

  const closeAuthModal = () => setIsAuthModalOpen(false);

  const openLoginPrompt = (message?: string) => {
    setLoginPromptMessage(message);
    setIsLoginPromptOpen(true);
  };

  const closeLoginPrompt = () => {
    setIsLoginPromptOpen(false);
    setLoginPromptMessage(undefined);
  };

  const switchRole = (role: UserRole) => {
    if (role === 'guest') { void supabase.auth.signOut(); setCurrentUser(null); setCurrentRole('guest'); }
    // A display preference cannot grant a role. Only a verified server profile can.
  };

  const login = async (email: string, pass?: string): Promise<boolean> => {
    try {
      const cleanEmail = email.toLowerCase().trim();
      const account = await signInAccount(supabase, cleanEmail, pass);
      if (!account) return false;
      setCurrentUser(account);
      setCurrentRole(account.role);
      closeAuthModal();
      return true;
    } catch { return false; }
  };

  const register = async (name: string, email: string, phone: string, pass?: string): Promise<boolean> => {
    if (!getSystemSettings().allowRegistration) return false;
    const normalizedName = normalizeFullName(name);
    const nameError = validateFullName(normalizedName, 'Họ và tên');
    if (nameError) {
      showToast('Họ và tên chưa hợp lệ', nameError, 'error');
      return false;
    }
    const emailError = validateEmail(email);
    if (emailError) {
      showToast('Email chưa hợp lệ', emailError, 'error');
      return false;
    }
    const phoneError = validateVietnamesePhone(phone);
    if (phoneError) {
      showToast('Số điện thoại chưa hợp lệ', phoneError, 'error');
      return false;
    }
    const minPassLen = getSystemSettings().minPasswordLength || 8;
    if (!pass || pass.length < minPassLen) {
      showToast('Mật khẩu chưa hợp lệ', `Mật khẩu phải có tối thiểu ${minPassLen} ký tự.`, 'error');
      return false;
    }
    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: pass,
      options: { data: { full_name: normalizedName, phone: phone.trim() } }
    });
    if (error) {
      showToast('Đăng ký chưa thành công', 'Vui lòng kiểm tra thông tin và thử lại.', 'error');
      return false;
    }
    showToast('Kiểm tra email', 'Vui lòng xác nhận email để hoàn tất đăng ký và đăng nhập.', 'info');
    return true;
  };

  const setAccountPassword = async (newPassword: string): Promise<boolean> => {
    if (!currentUser) {
      showToast('Lỗi xác thực', 'Vui lòng đăng nhập trước khi thiết lập mật khẩu!', 'error');
      return false;
    }
    if (!newPassword || newPassword.length < 6) {
      showToast('Mật khẩu yếu', 'Mật khẩu cần tối thiểu 6 ký tự để bảo đảm an toàn!', 'error');
      return false;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      const updated: UserAccount = {
        ...currentUser,
        hasCustomPassword: true
      };
      setCurrentUser(updated);
      setAllUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      sessionStorage.setItem('curve_current_user_obj', JSON.stringify(updated));

      showToast(
        'Thiết lập mật khẩu thành công',
        'Bạn có thể dùng mật khẩu này kết hợp email để đăng nhập hoặc tiếp tục dùng Google SSO!',
        'success'
      );
      return true;
    } catch (err: any) {
      console.error('Error setting password:', err);
      showToast('Lỗi hệ thống', 'Không thể lưu mật khẩu lúc này. Vui lòng thử lại!', 'error');
      return false;
    }
  };

  const changePassword = async (oldPassword: string, newPassword: string): Promise<boolean> => {
    if (!currentUser) {
      showToast('Lỗi xác thực', 'Vui lòng đăng nhập trước khi đổi mật khẩu!', 'error');
      return false;
    }
    if (!oldPassword) {
      showToast('Mật khẩu hiện tại', 'Vui lòng nhập mật khẩu hiện tại để xác thực.', 'error');
      return false;
    }
    if (!newPassword || newPassword.length < 6) {
      showToast('Mật khẩu mới yếu', 'Mật khẩu mới cần tối thiểu 6 ký tự để bảo đảm an toàn!', 'error');
      return false;
    }

    try {
      if (currentUser.email) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: currentUser.email,
          password: oldPassword,
        });
        if (signInError) {
          showToast('Xác thực thất bại', 'Mật khẩu hiện tại không chính xác.', 'error');
          return false;
        }
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      showToast('Đổi mật khẩu thành công', 'Mật khẩu mới đã được cập nhật an toàn vào hệ thống!', 'success');
      return true;
    } catch (err: any) {
      console.error('Lỗi đổi mật khẩu:', err);
      showToast('Lỗi hệ thống', 'Không thể đổi mật khẩu lúc này. Vui lòng thử lại!', 'error');
      return false;
    }
  };

  const logout = () => {
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith('curve_toast_shown_')) {
        sessionStorage.removeItem(key);
      }
    });
    sessionStorage.removeItem('curve_current_user_obj');
    sessionStorage.removeItem('curve_current_role');
    sessionStorage.removeItem('curve_current_user_id');
    sessionStorage.removeItem('curve_guest_body_profiles');
    sessionStorage.removeItem('curve_guest_active_profile');
    localStorage.removeItem('curve_current_user_obj');
    localStorage.removeItem('curve_current_role');
    localStorage.removeItem('curve_current_user_id');
    localStorage.removeItem('curve_guest_body_profiles');
    localStorage.removeItem('curve_guest_active_profile');
    localStorage.removeItem('curve_confidence_body_profiles_v2');
    localStorage.removeItem('curve_confidence_active_profile_id_v2');
    supabase.auth.signOut().catch(() => {});
    setCurrentUser(null);
    setCurrentRole('guest');
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/login` });
    return !error;
  };

  const updateProfile = async (data: Partial<UserAccount>): Promise<boolean> => {
    try {
      const isUpdatingPersonalFields =
        data.name !== undefined ||
        data.phone !== undefined ||
        data.email !== undefined ||
        data.gender !== undefined ||
        data.birthday !== undefined;

      let normalizedName: string | undefined;
      let targetPhone: string | undefined;

      if (isUpdatingPersonalFields) {
        normalizedName = normalizeFullName(data.name ?? currentUser?.name ?? '');
        targetPhone = String(data.phone ?? currentUser?.phone ?? '');
        const targetEmail = String(data.email ?? currentUser?.email ?? '');
        const targetGender = data.gender !== undefined ? data.gender : currentUser?.gender;
        const targetBirthday = data.birthday !== undefined ? data.birthday : currentUser?.birthday;

        if (validateFullName(normalizedName, 'Họ và tên')) return false;
        if (validateVietnamesePhone(targetPhone)) return false;
        if (validateEmail(targetEmail)) return false;
        // Không cho phép thay đổi email chỉ bằng cách sửa dữ liệu hồ sơ mà bỏ qua bước xác minh Supabase Auth
        if (currentUser?.email && targetEmail.trim().toLowerCase() !== currentUser.email.trim().toLowerCase()) {
          return false;
        }
        if (validateGender(targetGender)) return false;
        if (validateBirthday(targetBirthday)) return false;

        await transaction(supabase, 'cc_update_profile', {
          p_name: normalizedName,
          p_phone: targetPhone
        });

        if (supabase.auth?.updateUser) {
          const { error: metadataError } = await supabase.auth.updateUser({
            data: {
              full_name: normalizedName,
              phone: targetPhone,
              gender: targetGender ?? '',
              birthday: targetBirthday ?? ''
            }
          });
          if (metadataError) throw metadataError;
        }
      }

      const account = await authenticatedAccount(supabase);
      if (!account) return false;

      if (
        isUpdatingPersonalFields &&
        (account.name !== normalizedName || account.phone !== targetPhone)
      ) {
        return false;
      }

      const preservedAddrs = data.addresses ?? currentUser?.addresses ?? account.addresses ?? [];
      const updatedAccount: UserAccount = {
        ...account,
        addresses: preservedAddrs,
        gender: data.gender !== undefined ? data.gender : (account.gender ?? currentUser?.gender),
        birthday: data.birthday !== undefined ? data.birthday : (account.birthday ?? currentUser?.birthday),
      };
      if (typeof localStorage !== 'undefined' && account.id) {
        try {
          localStorage.setItem(`curve_addresses_${account.id}`, JSON.stringify(preservedAddrs));
        } catch {}
      }
      setCurrentUser(updatedAccount);
      setCurrentRole(updatedAccount.role);
      setAllUsers((prev) => prev.map((u) => (u.id === updatedAccount.id ? updatedAccount : u)));
      return true;
    } catch {
      return false;
    }
  };

  const addAddress = async (address: Omit<ShippingAddress, 'id'>): Promise<boolean> => {
    if (!currentUser) return false;
    const addrErrors = validateShippingAddressInput(address, {
      requireEmail: false,
      requireWard: Boolean(address.ward)
    });
    if (Object.keys(addrErrors).length > 0) return false;

    const newAddr: ShippingAddress = {
      ...address,
      fullName: normalizeFullName(address.fullName),
      phone: String(address.phone ?? '').trim(),
      province: String(address.province ?? '').trim(),
      district: String(address.district ?? '').trim(),
      ward: String(address.ward ?? '').trim(),
      addressDetail: String(address.addressDetail ?? '').trim(),
      id: `addr_${Date.now()}`,
      isDefault: currentUser.addresses.length === 0 ? true : address.isDefault
    };
    let updatedAddrs = [...currentUser.addresses];
    if (newAddr.isDefault) {
      updatedAddrs = updatedAddrs.map(a => ({ ...a, isDefault: false }));
    }
    updatedAddrs.push(newAddr);
    return await updateProfile({ addresses: updatedAddrs });
  };

  const updateAddress = async (id: string, partial: Partial<ShippingAddress>): Promise<boolean> => {
    if (!currentUser) return false;
    const existing = currentUser.addresses.find(a => a.id === id);
    if (!existing) return false;
    const merged: ShippingAddress = { ...existing, ...partial };
    const addrErrors = validateShippingAddressInput(merged, {
      requireEmail: false,
      requireWard: Boolean(merged.ward)
    });
    if (Object.keys(addrErrors).length > 0) return false;

    const normalizedMerged: ShippingAddress = {
      ...merged,
      fullName: normalizeFullName(merged.fullName),
      phone: String(merged.phone ?? '').trim(),
      province: String(merged.province ?? '').trim(),
      district: String(merged.district ?? '').trim(),
      ward: String(merged.ward ?? '').trim(),
      addressDetail: String(merged.addressDetail ?? '').trim()
    };

    const updatedAddrs = currentUser.addresses.map(a => {
      if (a.id === id) {
        return normalizedMerged;
      }
      if (partial.isDefault) {
        return { ...a, isDefault: false };
      }
      return a;
    });
    return await updateProfile({ addresses: updatedAddrs });
  };

  const deleteAddress = async (id: string): Promise<boolean> => {
    if (!currentUser) return false;
    const updatedAddrs = currentUser.addresses.filter(a => a.id !== id);
    if (updatedAddrs.length > 0 && !updatedAddrs.some(a => a.isDefault)) {
      updatedAddrs[0].isDefault = true;
    }
    return await updateProfile({ addresses: updatedAddrs });
  };

  const setDefaultAddress = async (id: string): Promise<boolean> => {
    if (!currentUser) return false;
    const updatedAddrs = currentUser.addresses.map(a => ({
      ...a,
      isDefault: a.id === id
    }));
    return await updateProfile({ addresses: updatedAddrs });
  };

  const isProtectedAdmin = (user?: UserAccount | null) => {
    if (!user) return false;
    const email = user.email.toLowerCase();
    return (
      email === 'binh98@gmail.com' ||
      email === 'harrytran791@gmail.com' ||
      email === 'kieuduyen@gmail.com' ||
      user.id === 'usr_1' ||
      user.id === 'usr_7' ||
      user.id === 'usr_13'
    );
  };

  const manageAccount = async (action: string, userId: string | null, data: Record<string, unknown> = {}) => {
    try {
      await manageAdminAccount(supabase, action, userId, data);
      try { await syncUsersWithSupabase(); }
      catch { showToast('Đã lưu thay đổi', 'Chưa tải lại được danh sách. Vui lòng bấm Đồng bộ dữ liệu trước thao tác tiếp theo.', 'info'); }
      return true;
    } catch (error) {
      showToast('Chưa thể cập nhật tài khoản', error instanceof Error ? error.message : 'Không thể hoàn tất thao tác. Vui lòng thử lại.', 'error');
      return false;
    }
  };
  const updateUserRole = (id: string, role: UserRole) => manageAccount('role', id, { role });
  const toggleUserStatus = (id: string) => {
    const user = allUsers.find(u => u.id === id);
    return user ? manageAccount('set_enabled', id, { enabled: user.status !== 'active' }) : Promise.resolve(false);
  };
  const deleteUser = (id: string) => manageAccount('delete', id);
  const createUser = (data: { name: string; email: string; phone?: string; role: UserRole }) => manageAccount('create', null,
    { ...data });
  const resetDefaultUsers = () => { void syncUsersWithSupabase().catch(() => {}); };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole,
        allUsers,
        isSyncingUsers,
        syncUsersWithSupabase,
        createUser,
        isAuthModalOpen,
        authModalTab,
        openAuthModal,
        closeAuthModal,
        isLoginPromptOpen,
        loginPromptMessage,
        openLoginPrompt,
        closeLoginPrompt,
        switchRole,
        login,
        register,
        setAccountPassword,
        changePassword,
        logout,
        resetPassword,
        updateProfile,
        addAddress,
        updateAddress,
        deleteAddress,
        setDefaultAddress,
        updateUserRole,
        toggleUserStatus,
        deleteUser,
        resetDefaultUsers
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
