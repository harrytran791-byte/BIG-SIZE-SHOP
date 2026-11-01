import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  User,
  MapPin,
  Package,
  RotateCcw,
  Plus,
  Trash2,
  Edit3,
  CheckCircle,
  Clock,
  ShieldCheck,
  ArrowRight,
  XCircle,
  Camera,
  Phone,
  Mail,
  Calendar,
  Lock,
  Headphones,
  ExternalLink,
  Ruler,
  Truck,
  Check,
  ChevronRight,
  LogOut,
  Sparkles,
  Info,
  UserCheck,
  ShoppingBag,
  RefreshCw,
  Zap,
  Tag,
  Copy,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useOrder } from '@/context/OrderContext';
import { useReturn } from '@/context/ReturnContext';
import { useToast } from '@/context/ToastContext';
import { useBodyProfile } from '@/context/BodyProfileContext';
import { useCart } from '@/context/CartContext';
import { ShippingAddress } from '@/types';
import { ReturnModal } from '@/modules/return/components/ReturnModal';
import { CustomerReturnSupplements } from '@/modules/return/components/CustomerReturnSupplements';
import { CancelOrderModal } from '@/modules/return/components/CancelOrderModal';
import { availableVouchers } from '@/modules/product/data/products';
import { resolveProductRealDetails } from '@/shared/services/supabaseClient';
import { normalizeRole } from '@/shared/utils/roleUtils';
import {
  normalizeFullName,
  validateFullName,
  validateVietnamesePhone,
  clampPhoneInput,
  validateEmail,
  ALLOWED_GENDERS,
  validateGender,
  validateBirthday,
  getBirthdayBounds,
  validateShippingAddressInput,
  detectLegacyInvalidProfileData
} from '@/shared/utils/userInputValidation';

export type ProfileTab = 'info' | 'orders' | 'body' | 'returns' | 'vouchers' | 'addresses';

interface ProfilePageProps {
  onNavigate: (path: string) => void;
  initialTab?: ProfileTab;
}

/**
 * Hàm nghiệp vụ kiểm tra thời hạn bảo hiểm đổi size 7 ngày
 * Rule 3: Chỉ đơn hàng giao thành công trong vòng 7 ngày mới được gửi yêu cầu đổi size 1:1. Quá hạn 7 ngày nút đổi trả phải bị khóa.
 */
export const checkOrderReturnEligibility = (order: any): { isEligible: boolean; daysRemaining: number; daysPassed: number; missingDeliveryDate?: boolean } => {
  if (!order || order.status !== 'delivered') {
    return { isEligible: false, daysRemaining: 0, daysPassed: 999 };
  }
  let dateObj: Date | null = null;
  const rawDate = order.deliveredAt || order.timeline?.find((s: any) => s.title?.toLowerCase().includes('giao hàng thành công') || s.title?.toLowerCase().includes('đã giao') || s.status === 'delivered')?.time;
  if (!rawDate) {
    // Đơn hàng đã giao nhưng chưa có mốc thời gian giao hàng cụ thể: Mặc định bảo vệ quyền lợi 7 ngày đổi size cho khách
    return { isEligible: true, daysRemaining: 7, daysPassed: 0, missingDeliveryDate: true };
  }
  if (rawDate) {
    if (rawDate instanceof Date) {
      dateObj = isNaN(rawDate.getTime()) ? null : rawDate;
    } else {
      const str = String(rawDate).trim();
      // Check Vietnamese DD/MM/YYYY format first to prevent US MM/DD parsing
      const vnMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
      if (vnMatch) {
        const d = parseInt(vnMatch[1], 10);
        const m = parseInt(vnMatch[2], 10) - 1;
        const y = parseInt(vnMatch[3], 10);
        const h = vnMatch[4] ? parseInt(vnMatch[4], 10) : 0;
        const min = vnMatch[5] ? parseInt(vnMatch[5], 10) : 0;
        const s = vnMatch[6] ? parseInt(vnMatch[6], 10) : 0;
        const parsed = new Date(y, m, d, h, min, s);
        if (!isNaN(parsed.getTime())) {
          dateObj = parsed;
        }
      } else {
        const directDate = new Date(str);
        if (!isNaN(directDate.getTime())) {
          dateObj = directDate;
        }
      }
    }
  }
  if (!dateObj) {
    return { isEligible: false, daysRemaining: 0, daysPassed: 999, missingDeliveryDate: !order.deliveredAt };
  }
  const diffMs = Date.now() - dateObj.getTime();
  if (diffMs < 0) {
    return { isEligible: false, daysRemaining: 7, daysPassed: 0 };
  }
  const daysPassed = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, 7 - daysPassed);
  const isEligible = diffMs <= 7 * 24 * 60 * 60 * 1000;
  return { isEligible, daysRemaining, daysPassed, missingDeliveryDate: !order.deliveredAt };
};

export const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigate, initialTab }) => {
  const { currentUser, currentRole, updateProfile, addAddress, updateAddress, deleteAddress, setDefaultAddress, logout, setAccountPassword, changePassword } = useAuth();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const { orders } = useOrder();
  const { returnRequests, cancellationRequests } = useReturn();
  const { profiles, activeProfile } = useBodyProfile();
  const { vouchersList } = useCart();
  const { showToast } = useToast();

  const activeVouchersList = vouchersList || [];

  const isGoogleUser = Boolean(
    currentUser?.authProvider === 'google' ||
    (currentUser?.avatar && currentUser.avatar.includes('googleusercontent.com')) ||
    (currentUser?.email && currentUser.email.toLowerCase().endsWith('@gmail.com') && !currentUser?.hasCustomPassword)
  );

  const effectiveRole = normalizeRole(currentUser?.role || currentRole, currentUser?.email);
  const isCustomer = effectiveRole === 'customer';

  const [activeSection, setActiveSection] = useState<ProfileTab>(() => {
    if (initialTab && ['info', 'orders', 'body', 'returns', 'vouchers', 'addresses'].includes(initialTab)) {
      return initialTab;
    }
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') as ProfileTab;
    if (tabParam && ['info', 'orders', 'body', 'returns', 'vouchers', 'addresses'].includes(tabParam)) {
      return tabParam;
    }
    return 'info';
  });

  useEffect(() => {
    if (currentRole === 'manager' || currentRole === 'admin') {
      setActiveSection('info');
    } else if (initialTab && ['info', 'orders', 'body', 'returns', 'vouchers', 'addresses'].includes(initialTab)) {
      setActiveSection(initialTab);
    }
  }, [initialTab, currentRole]);

  const handleSelectTab = (tab: ProfileTab) => {
    if (currentRole === 'manager' || currentRole === 'admin') {
      setActiveSection('info');
      return;
    }
    setActiveSection(tab);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState({}, '', url.toString());
    } catch {
      // Ignore URL state error in non-browser context
    }
  };

  // Personal Info Form State - KHÔNG BỊA DỮ LIỆU MẶC ĐỊNH
  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [gender, setGender] = useState<'Nam' | 'Nữ' | 'Khác' | ''>((currentUser?.gender as any) || '');
  const [birthday, setBirthday] = useState(currentUser?.birthday || '');
  const [birthdayBadInput, setBirthdayBadInput] = useState(false);
  const birthdayInputRef = useRef<HTMLInputElement | null>(null);
  const { minDate: minBirthdayDate, maxDate: maxBirthdayDate } = useMemo(() => getBirthdayBounds(), []);

  // Validation error states for Personal Info & Address Modal
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});

  // Kiểm tra dữ liệu cũ không hợp lệ đã lưu trong Supabase của tài khoản hiện tại
  const legacyProfileCheck = useMemo(
    () => detectLegacyInvalidProfileData(currentUser),
    [currentUser]
  );

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setPhone(currentUser.phone || '');
      setEmail(currentUser.email || '');
      setGender((currentUser.gender as any) || '');
      setBirthday(currentUser.birthday || '');
      setBirthdayBadInput(false);

      const detected = detectLegacyInvalidProfileData(currentUser);
      setProfileErrors(detected.fieldErrors);
    }
  }, [currentUser]);

  // Standard Password Modal (For local accounts)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Google Backup Password Modal (For Google SSO accounts - NO old password required!)
  const [isSetPasswordModalOpen, setIsSetPasswordModalOpen] = useState(false);
  const [backupPassword, setBackupPassword] = useState('');
  const [confirmBackupPassword, setConfirmBackupPassword] = useState('');
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // Address Modal State
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [newAddr, setNewAddr] = useState<Omit<ShippingAddress, 'id'>>({
    fullName: currentUser?.name || '',
    phone: currentUser?.phone || '',
    email: currentUser?.email || '',
    province: 'TP. Hồ Chí Minh',
    district: '',
    ward: '',
    addressDetail: '',
    label: 'Nhà riêng',
    isDefault: false
  });

  // Action Modals
  const [selectedOrderForReturn, setSelectedOrderForReturn] = useState<any>(null);
  const [selectedOrderForCancel, setSelectedOrderForCancel] = useState<any>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Voucher Vault Category Tab State
  const [voucherTab, setVoucherTab] = useState<'all' | 'discount' | 'shipping'>('all');

  // Đóng modal khi bấm phím Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isAddressModalOpen) setIsAddressModalOpen(false);
        if (isPasswordModalOpen) setIsPasswordModalOpen(false);
        if (isSetPasswordModalOpen) setIsSetPasswordModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddressModalOpen, isPasswordModalOpen, isSetPasswordModalOpen]);

  const isShippingVoucher = (v: any) =>
    v.voucherType === 'shipping' || (v.code && v.code.toUpperCase().includes('FREESHIP'));

  const discountVouchersCount = activeVouchersList.filter((v) => !isShippingVoucher(v)).length;
  const shippingVouchersCount = activeVouchersList.filter((v) => isShippingVoucher(v)).length;

  const filteredVouchers = activeVouchersList.filter((v) => {
    if (voucherTab === 'discount') return !isShippingVoucher(v);
    if (voucherTab === 'shipping') return isShippingVoucher(v);
    return true;
  });

  const validateProfileField = (
    field: 'name' | 'phone' | 'email' | 'gender' | 'birthday',
    customValue?: string,
    hasBadDateInput?: boolean
  ): string | null => {
    switch (field) {
      case 'name':
        return validateFullName(customValue !== undefined ? customValue : name, 'Họ và tên');
      case 'phone':
        return validateVietnamesePhone(customValue !== undefined ? customValue : phone);
      case 'email': {
        const val = customValue !== undefined ? customValue : email;
        const formatErr = validateEmail(val);
        if (formatErr) return formatErr;
        if (currentUser?.email && val.trim().toLowerCase() !== currentUser.email.trim().toLowerCase()) {
          return 'Không được phép thay đổi email chỉ bằng cách sửa hồ sơ mà bỏ qua bước xác minh.';
        }
        return null;
      }
      case 'gender':
        return validateGender(customValue !== undefined ? customValue : gender);
      case 'birthday':
        return validateBirthday(
          customValue !== undefined ? customValue : birthday,
          hasBadDateInput !== undefined ? hasBadDateInput : birthdayBadInput
        );
      default:
        return null;
    }
  };

  const handleBlurProfileField = (
    field: 'name' | 'phone' | 'email' | 'gender' | 'birthday',
    customValue?: string,
    hasBadDateInput?: boolean
  ) => {
    let val = customValue;
    if (field === 'name') {
      const normalized = normalizeFullName(val !== undefined ? val : name);
      setName(normalized);
      val = normalized;
    }
    const err = validateProfileField(field, val, hasBadDateInput);
    setProfileErrors((prev) => {
      const next = { ...prev };
      if (err) {
        next[field] = err;
      } else {
        delete next[field];
      }
      return next;
    });
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = normalizeFullName(name);
    setName(cleanName);

    const hasBadDate = Boolean(birthdayInputRef.current?.validity?.badInput) || birthdayBadInput;
    const errors: Record<string, string> = {};

    const nameErr = validateFullName(cleanName, 'Họ và tên');
    if (nameErr) errors.name = nameErr;

    const phoneErr = validateVietnamesePhone(phone);
    if (phoneErr) errors.phone = phoneErr;

    const emailErr = validateProfileField('email', email);
    if (emailErr) errors.email = emailErr;

    const genderErr = validateGender(gender);
    if (genderErr) errors.gender = genderErr;

    if (isCustomer) {
      const birthdayErr = validateBirthday(birthday, hasBadDate);
      if (birthdayErr) errors.birthday = birthdayErr;
    }

    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      showToast(
        'Thông tin chưa hợp lệ',
        Object.values(errors)[0] || 'Vui lòng kiểm tra lại các trường thông tin được đánh dấu đỏ.',
        'error'
      );
      return;
    }

    setProfileErrors({});
    setIsSavingProfile(true);
    const ok = await updateProfile({
      name: cleanName,
      phone,
      email: currentUser?.email || email.trim(),
      gender: (gender || undefined) as any,
      birthday
    });
    setIsSavingProfile(false);
    if (ok) {
      showToast(
        'Cập nhật thông tin cá nhân thành công!',
        'Thông tin cá nhân đã được lưu an toàn vào hệ thống tài khoản!',
        'success'
      );
    } else {
      showToast(
        'Chưa lưu đầy đủ thông tin',
        'Vui lòng kiểm tra thông tin, kết nối và tải lại hồ sơ để xác nhận những mục đã được lưu.',
        'error'
      );
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword) {
      showToast('Mật khẩu hiện tại', 'Vui lòng nhập mật khẩu hiện tại để xác thực.', 'error');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      showToast('Mật khẩu chưa hợp lệ', 'Mật khẩu mới cần tối thiểu 6 ký tự.', 'error');
      return;
    }
    setIsChangingPassword(true);
    const ok = await changePassword(oldPassword, newPassword);
    setIsChangingPassword(false);
    if (ok) {
      setIsPasswordModalOpen(false);
      setOldPassword('');
      setNewPassword('');
    }
  };

  const handleSetBackupPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backupPassword || backupPassword.length < 6) {
      showToast('Mật khẩu chưa đủ dài', 'Mật khẩu cần tối thiểu 6 ký tự để bảo vệ tài khoản.', 'error');
      return;
    }
    if (backupPassword !== confirmBackupPassword) {
      showToast('Mật khẩu không khớp', 'Mật khẩu xác nhận không trùng khớp, vui lòng kiểm tra lại.', 'error');
      return;
    }
    setIsSubmittingPassword(true);
    const ok = await setAccountPassword(backupPassword);
    setIsSubmittingPassword(false);
    if (ok) {
      setIsSetPasswordModalOpen(false);
      setBackupPassword('');
      setConfirmBackupPassword('');
    }
  };

  const handleCreateOrUpdateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedAddr = {
      ...newAddr,
      fullName: normalizeFullName(newAddr.fullName),
      phone: newAddr.phone.trim(),
      province: newAddr.province.trim(),
      district: newAddr.district.trim(),
      ward: newAddr.ward.trim(),
      addressDetail: newAddr.addressDetail.trim()
    };
    setNewAddr(cleanedAddr);

    const addrValidation = validateShippingAddressInput(cleanedAddr, {
      requireEmail: false,
      requireWard: true
    });
    if (Object.keys(addrValidation).length > 0) {
      setAddressErrors(addrValidation);
      showToast(
        'Thông tin địa chỉ chưa hợp lệ',
        Object.values(addrValidation)[0] || 'Vui lòng kiểm tra lại các trường địa chỉ nhận hàng.',
        'error'
      );
      return;
    }

    setAddressErrors({});
    if (editingAddressId) {
      const ok = await updateAddress(editingAddressId, cleanedAddr);
      if (ok) {
        showToast('Thành công', 'Địa chỉ giao hàng đã được cập nhật thành công!', 'success');
        setIsAddressModalOpen(false);
        setEditingAddressId(null);
      } else {
        showToast('Lỗi lưu địa chỉ', 'Không thể cập nhật địa chỉ lúc này.', 'error');
      }
    } else {
      const ok = await addAddress(cleanedAddr);
      if (ok) {
        showToast('Thành công', 'Đã thêm địa chỉ giao hàng mới thành công!', 'success');
        setIsAddressModalOpen(false);
        setEditingAddressId(null);
      } else {
        showToast('Lỗi lưu địa chỉ', 'Không thể thêm địa chỉ lúc này.', 'error');
      }
    }
  };

  // 1. Địa chỉ thật từ tài khoản người dùng hiện tại (Không bịa thông tin)
  const displayedAddresses = currentUser?.addresses || [];

  // 2. Lọc đơn hàng thật thuộc về tài khoản người dùng hiện tại
  const userOrders = useMemo(() => {
    if (!currentUser) return [];
    const userEmail = (currentUser.email || '').toLowerCase().trim();
    const userPhone = (currentUser.phone || '').replace(/\D/g, '');

    return orders.filter((o) => {
      const orderEmail = (o.shippingAddress?.email || '').toLowerCase().trim();
      const orderPhone = (o.shippingAddress?.phone || '').replace(/\D/g, '');
      const matchEmail = Boolean(userEmail && orderEmail && userEmail === orderEmail);
      const matchPhone = Boolean(userPhone && orderPhone && userPhone === orderPhone);
      return matchEmail || matchPhone;
    });
  }, [orders, currentUser]);

  // 3. Lọc yêu cầu đổi/trả & hủy đơn thật thuộc về đơn của tài khoản này
  const userReturnRequests = useMemo(() => {
    if (!currentUser) return [];
    const userPhone = (currentUser.phone || '').replace(/\D/g, '');
    const userOrderIds = new Set(userOrders.map((o) => o.id));

    return returnRequests.filter((r) => {
      const matchOrder = userOrderIds.has(r.orderId);
      const matchPhone = Boolean(userPhone && r.customerPhone?.replace(/\D/g, '') === userPhone);
      return matchOrder || matchPhone;
    });
  }, [returnRequests, userOrders, currentUser]);

  const userCancellationRequests = useMemo(() => {
    if (!currentUser) return [];
    const userOrderIds = new Set(userOrders.map((o) => o.id));
    return cancellationRequests.filter((c) => userOrderIds.has(c.orderId));
  }, [cancellationRequests, userOrders, currentUser]);

  const totalOrdersCount = userOrders.length;
  const displayedReturns = userReturnRequests;
  const displayedCancellations = userCancellationRequests;
  const totalReturnsCount = userReturnRequests.length + userCancellationRequests.length;

  type OrderFilterType = 'all' | 'placed' | 'processing' | 'shipping' | 'delivered' | 'cancelled';
  const [orderFilter, setOrderFilter] = useState<OrderFilterType>('all');

  const orderCounts = useMemo(() => ({
    all: userOrders.length,
    placed: userOrders.filter((o) => o.status === 'placed').length,
    processing: userOrders.filter((o) => o.status === 'confirmed' || o.status === 'preparing').length,
    shipping: userOrders.filter((o) => o.status === 'shipping').length,
    delivered: userOrders.filter((o) => o.status === 'delivered').length,
    cancelled: userOrders.filter((o) => o.status === 'cancelled').length,
  }), [userOrders]);

  const filteredOrders = useMemo(() => {
    if (orderFilter === 'all') return userOrders;
    if (orderFilter === 'placed') return userOrders.filter((o) => o.status === 'placed');
    if (orderFilter === 'processing') return userOrders.filter((o) => o.status === 'confirmed' || o.status === 'preparing');
    if (orderFilter === 'shipping') return userOrders.filter((o) => o.status === 'shipping');
    if (orderFilter === 'delivered') return userOrders.filter((o) => o.status === 'delivered');
    if (orderFilter === 'cancelled') return userOrders.filter((o) => o.status === 'cancelled');
    return userOrders;
  }, [userOrders, orderFilter]);

  return (
    <div className="bg-[#FAF8F5] min-h-screen py-8 text-stone-900 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Breadcrumb Bar matching Image 1 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-6 border-b border-stone-200/80 mb-8 text-xs">
          <div className="flex items-center gap-1.5 text-stone-500">
            <button onClick={() => onNavigate('/')} className="hover:text-stone-900 transition-colors">
              Trang chủ
            </button>
            <span>›</span>
            <span className="text-stone-500">Tài khoản</span>
            <span>›</span>
            <span className="font-bold text-stone-900">
              {currentRole === 'manager' || currentRole === 'admin'
                ? 'Thông tin tài khoản quản trị'
                : 'Thông tin cá nhân & Đơn hàng'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold text-stone-600">Hồ sơ xác thực đa tầng</span>
          </div>
        </div>

        {/* 2-Column Responsive Dashboard Layout */}
        <div className="flex flex-col lg:flex-row items-start gap-8">
          {/* ================= LEFT SIDEBAR (STICKY NAVIGATION) ================= */}
          <div className="w-full lg:w-72 xl:w-80 shrink-0 space-y-5 lg:sticky lg:top-24">
            {/* User Profile Card */}
            <div className="bg-white rounded-2xl p-5 shadow-xs border border-stone-200/90 flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="w-14 h-14 rounded-full bg-[#5C1D24] text-white flex items-center justify-center font-bold text-xl shadow-xs overflow-hidden">
                  {currentUser?.avatar ? (
                    <img src={currentUser.avatar} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <button
                  type="button"
                  title="Đổi ảnh đại diện"
                  className="absolute -bottom-1 -right-1 w-6 h-6 bg-stone-900 hover:bg-[#5C1D24] text-white rounded-full flex items-center justify-center border-2 border-white transition-colors cursor-pointer"
                >
                  <Camera className="w-3 h-3" />
                </button>
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-stone-900 text-sm leading-snug truncate">{name}</h3>
                <p className="text-[11px] text-stone-500 truncate mt-0.5">{email}</p>
                <p className="text-[11px] text-stone-500 truncate mt-0.5 flex items-center gap-1">
                  <Phone className="w-3 h-3 inline text-stone-400" />
                  <span>{phone || 'Chưa cập nhật SĐT'}</span>
                </p>
                {isGoogleUser && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                      <svg className="w-3 h-3" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      Google SSO
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Vertical Navigation Menu Card */}
            <div className="bg-white rounded-2xl p-2.5 shadow-xs border border-stone-200/90 space-y-1">
              {/* Item 1: Thông tin cá nhân & tài khoản */}
              <button
                onClick={() => handleSelectTab('info')}
                className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer bg-[#5C1D24] text-white shadow-xs"
              >
                <div className="flex items-center gap-2.5">
                  <User className="w-4 h-4" />
                  <span>
                    {currentRole === 'manager' || currentRole === 'admin'
                      ? 'Thông tin tài khoản quản trị'
                      : 'Thông tin cá nhân'}
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-80" />
              </button>

              {/* Chỉ hiển thị các mục Mua sắm đối với Khách hàng (Role Customer) */}
              {currentRole !== 'manager' && currentRole !== 'admin' && (
                <>
                  {/* Item 2: Đơn hàng của tôi */}
                  <button
                    onClick={() => handleSelectTab('orders')}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${activeSection === 'orders'
                        ? 'bg-[#5C1D24] text-white shadow-xs'
                        : 'text-stone-700 hover:bg-stone-50'
                      }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Package className="w-4 h-4" />
                      <span>Đơn hàng của tôi</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-80" />
                  </button>

                  {/* Item 3: Hồ sơ số đo cơ thể */}
                  <button
                    onClick={() => handleSelectTab('body')}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${activeSection === 'body'
                        ? 'bg-[#5C1D24] text-white shadow-xs'
                        : 'text-stone-700 hover:bg-stone-50'
                      }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Ruler className="w-4 h-4" />
                      <span>Hồ sơ số đo cơ thể</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-80" />
                  </button>

                  {/* Item 4: Yêu cầu đổi/trả & hủy */}
                  <button
                    onClick={() => handleSelectTab('returns')}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${activeSection === 'returns'
                        ? 'bg-[#5C1D24] text-white shadow-xs'
                        : 'text-stone-700 hover:bg-stone-50'
                      }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <RotateCcw className="w-4 h-4" />
                      <span>Yêu cầu đổi/trả & hủy</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-80" />
                  </button>

                  {/* Item: Kho Voucher của tôi */}
                  <button
                    onClick={() => handleSelectTab('vouchers')}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${activeSection === 'vouchers'
                        ? 'bg-[#5C1D24] text-white shadow-xs'
                        : 'text-stone-700 hover:bg-stone-50'
                      }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Tag className="w-4 h-4" />
                      <span>Kho Voucher của tôi</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-80" />
                  </button>

                  {/* Item 5: Sổ địa chỉ giao hàng */}
                  <button
                    onClick={() => handleSelectTab('addresses')}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${activeSection === 'addresses'
                        ? 'bg-[#5C1D24] text-white shadow-xs'
                        : 'text-stone-700 hover:bg-stone-50'
                      }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <MapPin className="w-4 h-4" />
                      <span>Sổ địa chỉ giao hàng</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-80" />
                  </button>
                </>
              )}

              {/* Divider */}
              <div className="my-1.5 border-t border-stone-100" />

              {/* Item 6: Đăng xuất */}
              <button
                onClick={() => {
                  logout();
                  onNavigate('/');
                }}
                className="w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2.5 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Đăng xuất</span>
              </button>
            </div>

            {/* Stylist Support Card (Chỉ hiện cho khách mua hàng) */}
            {currentRole !== 'manager' && currentRole !== 'admin' && (
              <div className="bg-white rounded-2xl p-4 shadow-xs border border-stone-200/90 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#F7EFEA] text-[#5C1D24] flex items-center justify-center shrink-0">
                  <Headphones className="w-4 h-4 stroke-[2]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-stone-900">Cần đổi size 1:1 tận nơi?</h4>
                  <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">
                    Chuyên viên stylist hỗ trợ giao tận nhà 2 size thử trực tiếp.
                  </p>
                  <a
                    href="tel:19006868"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#5C1D24] hover:underline mt-1.5"
                  >
                    <span>Hotline 1900 6868</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}

            {/* Lối tắt Cổng Quản Lý cho Manager / Admin */}
            {(currentRole === 'manager' || currentRole === 'admin') && (
              <div className="bg-gradient-to-br from-stone-900 to-stone-800 rounded-2xl p-4 shadow-xs text-white space-y-2">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Khu vực vận hành</span>
                </div>
                <p className="text-[11px] text-stone-300">
                  Quay lại cổng làm việc để điều hành quản lý sản phẩm, đơn hàng và kho bãi.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate(currentRole === 'admin' ? '/admin/dashboard' : '/manager/products')}
                  className="w-full mt-2 py-2 bg-[#5C1D24] hover:bg-[#4A151B] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>MỞ CỔNG QUẢN LÝ</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* ================= RIGHT MAIN DASHBOARD CONTENT ================= */}
          <div className="flex-1 w-full space-y-6">
            {/* ================= TAB 1: THÔNG TIN CÁ NHÂN & TÀI KHOẢN ================= */}
            {activeSection === 'info' && (
              <div id="section-info" className="bg-white rounded-2xl p-6 sm:p-7 shadow-xs border border-stone-200/90 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-stone-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#F7EFEA] text-[#5C1D24] flex items-center justify-center shrink-0">
                      <UserCheck className="w-5 h-5 stroke-[2]" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-stone-900">Thông Tin Cá Nhân & Tài Khoản</h2>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Cập nhật thông tin nhận diện tài khoản và kích hoạt bảo mật may đo
                      </p>
                    </div>
                  </div>

                  <span className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1 bg-stone-50 text-stone-700 text-xs font-bold rounded-full border border-stone-200">
                    <ShieldCheck className="w-3.5 h-3.5 stroke-[2] text-[#5C1D24]" />
                    <span>Bảo mật tài khoản</span>
                  </span>
                </div>

                {legacyProfileCheck.hasInvalidData && (
                  <div className="mt-4 p-4 rounded-xl bg-amber-50/90 border border-amber-300 text-amber-900 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-amber-950">
                        Cảnh báo: Hồ sơ tài khoản của bạn đang có dữ liệu chưa đúng chuẩn định dạng
                      </p>
                      <p className="text-amber-800 leading-relaxed">
                        Hệ thống phát hiện thông tin lưu trước đây chưa hợp lệ ({legacyProfileCheck.reasons.join(' ')}). Vui lòng kiểm tra, chỉnh sửa lại và nhấn <strong>&ldquo;Lưu thay đổi&rdquo;</strong> để đồng bộ chính xác hồ sơ tài khoản.
                      </p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleUpdateProfile} noValidate className="mt-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Họ và tên */}
                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1.5">
                        Họ và tên <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          maxLength={100}
                          value={name}
                          onChange={(e) => {
                            const nextVal = e.target.value;
                            setName(nextVal);
                            if (profileErrors.name) {
                              const err = validateProfileField('name', nextVal);
                              setProfileErrors((prev) => {
                                const next = { ...prev };
                                if (err) next.name = err;
                                else delete next.name;
                                return next;
                              });
                            }
                          }}
                          onBlur={(e) => handleBlurProfileField('name', e.target.value)}
                          className={`w-full pl-10 pr-3.5 py-2.5 text-xs border rounded-xl focus:bg-white transition-all ${profileErrors.name
                              ? 'bg-rose-50/40 border-rose-500 focus:border-rose-600 focus:ring-1 focus:ring-rose-500'
                              : 'bg-stone-50/50 border-stone-300 focus:border-[#5C1D24] focus:ring-1 focus:ring-[#5C1D24]'
                            }`}
                        />
                      </div>
                      {profileErrors.name && (
                        <p className="text-[11px] text-rose-600 mt-1 font-medium">{profileErrors.name}</p>
                      )}
                    </div>

                    {/* Số điện thoại */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-stone-800">
                          Số điện thoại <span className="text-rose-500">*</span>
                        </label>
                      </div>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          required
                          maxLength={10}
                          placeholder="Nhập số điện thoại 10 chữ số..."
                          value={phone}
                          onChange={(e) => {
                            const nextVal = clampPhoneInput(e.target.value);
                            setPhone(nextVal);
                            if (profileErrors.phone) {
                              const err = validateProfileField('phone', nextVal);
                              setProfileErrors((prev) => {
                                const next = { ...prev };
                                if (err) next.phone = err;
                                else delete next.phone;
                                return next;
                              });
                            }
                          }}
                          onBlur={(e) => handleBlurProfileField('phone', e.target.value)}
                          className={`w-full pl-10 pr-3.5 py-2.5 text-xs border rounded-xl focus:bg-white transition-all font-mono ${profileErrors.phone
                              ? 'bg-rose-50/40 border-rose-500 focus:border-rose-600 focus:ring-1 focus:ring-rose-500'
                              : !phone
                                ? 'bg-amber-50/40 border-amber-300 focus:border-[#5C1D24] focus:ring-1 focus:ring-[#5C1D24]'
                                : 'bg-stone-50/50 border-stone-300 focus:border-[#5C1D24] focus:ring-1 focus:ring-[#5C1D24]'
                            }`}
                        />
                      </div>
                      {profileErrors.phone ? (
                        <p className="text-[11px] text-rose-600 mt-1 font-medium">{profileErrors.phone}</p>
                      ) : (
                        isCustomer &&
                        !phone && (
                          <p className="text-[10px] text-amber-700 mt-1 flex items-center gap-1 font-medium">
                            <span>💡 Vui lòng nhập số điện thoại để nhân viên giao hàng liên hệ & hỗ trợ thử size 1:1.</span>
                          </p>
                        )
                      )}
                    </div>

                    {/* Email đăng ký */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-stone-800">
                          Email đăng ký <span className="text-rose-500">*</span>
                        </label>
                        {isGoogleUser && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <Check className="w-3 h-3 stroke-[2.5]" />
                            <span>Đã xác thực bởi Google</span>
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          required
                          maxLength={254}
                          readOnly={isGoogleUser || Boolean(currentUser?.email)}
                          value={email}
                          onChange={(e) => {
                            if (isGoogleUser || Boolean(currentUser?.email)) return;
                            const nextVal = e.target.value;
                            setEmail(nextVal);
                            if (profileErrors.email) {
                              const err = validateProfileField('email', nextVal);
                              setProfileErrors((prev) => {
                                const next = { ...prev };
                                if (err) next.email = err;
                                else delete next.email;
                                return next;
                              });
                            }
                          }}
                          onBlur={(e) => handleBlurProfileField('email', e.target.value)}
                          className={`w-full pl-10 pr-3.5 py-2.5 text-xs border rounded-xl transition-all font-mono ${profileErrors.email
                              ? 'bg-rose-50/40 border-rose-500 text-rose-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-500'
                              : isGoogleUser || Boolean(currentUser?.email)
                                ? 'bg-stone-100 text-stone-600 border-stone-200 cursor-not-allowed select-none'
                                : 'bg-stone-50/50 border-stone-300 focus:bg-white focus:border-[#5C1D24] focus:ring-1 focus:ring-[#5C1D24]'
                            }`}
                        />
                      </div>
                      {profileErrors.email ? (
                        <p className="text-[11px] text-rose-600 mt-1 font-medium">{profileErrors.email}</p>
                      ) : isGoogleUser ? (
                        <p className="text-[10px] text-stone-400 mt-1">
                          Email được liên kết an toàn qua Google SSO và không thể sửa đổi tại đây.
                        </p>
                      ) : (
                        <p className="text-[10px] text-stone-400 mt-1">
                          Email đăng nhập được quản lý bởi hệ thống xác thực và hiển thị ở chế độ chỉ đọc để bảo mật tài khoản.
                        </p>
                      )}
                    </div>

                    {/* Giới tính */}
                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1.5">Giới tính</label>
                      <div className="grid grid-cols-3 gap-2">
                        {ALLOWED_GENDERS.map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => {
                              setGender(g);
                              handleBlurProfileField('gender', g);
                            }}
                            onBlur={() => handleBlurProfileField('gender', gender)}
                            className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${gender === g
                                ? 'bg-stone-100 border-[#5C1D24] text-[#5C1D24] shadow-xs'
                                : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                              }`}
                          >
                            {g === 'Nam' ? '♂ Nam' : g === 'Nữ' ? '♀ Nữ' : 'Khác'}
                          </button>
                        ))}
                      </div>
                      {profileErrors.gender && (
                        <p className="text-[11px] text-rose-600 mt-1 font-medium">{profileErrors.gender}</p>
                      )}
                    </div>

                    {/* Ngày sinh (Chỉ hiển thị cho khách hàng nhận ưu đãi sinh nhật) */}
                    {isCustomer && (
                      <div>
                        <label className="block text-xs font-bold text-stone-800 mb-1.5">
                          Ngày sinh <span className="text-stone-400 font-normal">(Nhận quà ưu đãi sinh nhật)</span>
                        </label>
                        <div className="relative">
                          <Calendar className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            ref={birthdayInputRef}
                            type="date"
                            min={minBirthdayDate}
                            max={maxBirthdayDate}
                            value={birthday}
                            onChange={(e) => {
                              const nextVal = e.target.value;
                              const isBad = Boolean(e.target.validity?.badInput);
                              setBirthday(nextVal);
                              setBirthdayBadInput(isBad);
                              const err = validateProfileField('birthday', nextVal, isBad);
                              setProfileErrors((prev) => {
                                const next = { ...prev };
                                if (err) next.birthday = err;
                                else delete next.birthday;
                                return next;
                              });
                            }}
                            onBlur={(e) => {
                              const isBad = Boolean(e.target.validity?.badInput);
                              setBirthdayBadInput(isBad);
                              handleBlurProfileField('birthday', e.target.value, isBad);
                            }}
                            className={`w-full pl-10 pr-3.5 py-2.5 text-xs border rounded-xl focus:bg-white transition-all ${profileErrors.birthday
                                ? 'bg-rose-50/40 border-rose-500 focus:border-rose-600 focus:ring-1 focus:ring-rose-500'
                                : 'bg-stone-50/50 border-stone-300 focus:border-[#5C1D24] focus:ring-1 focus:ring-[#5C1D24]'
                              }`}
                          />
                        </div>
                        {profileErrors.birthday && (
                          <p className="text-[11px] text-rose-600 mt-1 font-medium">{profileErrors.birthday}</p>
                        )}
                      </div>
                    )}

                    {/* Mật khẩu bảo mật */}
                    <div>
                      <label className="block text-xs font-bold text-stone-800 mb-1.5">Mật khẩu & Đăng nhập</label>
                      {isGoogleUser && !currentUser?.hasCustomPassword ? (
                        /* Trường hợp tài khoản Google chưa tạo mật khẩu dự phòng */
                        <div className="p-3.5 bg-gradient-to-r from-stone-50 to-amber-50/40 border border-stone-200/90 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-white border border-stone-200 flex items-center justify-center shrink-0 shadow-2xs">
                              <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-stone-900 leading-tight">Đăng nhập nhanh qua Google</p>
                              <p className="text-[10px] text-stone-500">Bảo mật đa tầng bởi tài khoản Google</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsSetPasswordModalOpen(true)}
                            className="px-3.5 py-1.5 bg-white hover:bg-stone-50 text-[#5C1D24] border border-[#5C1D24]/30 rounded-lg text-xs font-bold transition-all shadow-2xs self-start sm:self-auto cursor-pointer whitespace-nowrap"
                          >
                            + Thiết lập mật khẩu dự phòng
                          </button>
                        </div>
                      ) : isGoogleUser && currentUser?.hasCustomPassword ? (
                        /* Trường hợp tài khoản Google đã thiết lập mật khẩu dự phòng */
                        <div className="p-3.5 bg-stone-50 border border-stone-200/90 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                            <div>
                              <p className="text-xs font-bold text-stone-900 leading-tight">Đã kích hoạt Mật khẩu dự phòng</p>
                              <p className="text-[10px] text-stone-500">Đăng nhập linh hoạt qua cả Google SSO hoặc Email + Mật khẩu</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsSetPasswordModalOpen(true)}
                            className="px-3.5 py-1.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 rounded-lg text-xs font-bold transition-all shadow-2xs self-start sm:self-auto cursor-pointer whitespace-nowrap"
                          >
                            Đổi mật khẩu
                          </button>
                        </div>
                      ) : (
                        /* Tài khoản thông thường */
                        <div className="relative flex items-center">
                          <Lock className="w-4 h-4 text-stone-400 absolute left-3.5" />
                          <input
                            type="password"
                            readOnly
                            value="••••••••••••"
                            className="w-full pl-10 pr-24 py-2.5 text-xs bg-stone-50/50 border border-stone-300 rounded-xl cursor-default"
                          />
                          <button
                            type="button"
                            onClick={() => setIsPasswordModalOpen(true)}
                            className="absolute right-3 text-[11px] font-bold text-[#5C1D24] hover:underline cursor-pointer"
                          >
                            Đổi mật khẩu
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Form Footer */}
                  <div className={`pt-4 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center ${isCustomer ? 'justify-between' : 'justify-end'} gap-3 text-xs`}>
                    {isCustomer && (
                      <div className="flex items-center gap-1.5 text-stone-500 text-[11px]">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Thông tin được mã hóa theo chuẩn bảo mật thời trang may đo cá nhân.</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="px-6 py-2.5 bg-[#5C1D24] hover:bg-[#4A121D] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <span>{isSavingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ================= TAB 3: HỒ SƠ SỐ ĐO CƠ THỂ ================= */}
            {activeSection === 'body' && (
              <div id="section-body" className="bg-white rounded-2xl p-6 sm:p-7 shadow-xs border border-stone-200/90 space-y-5 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-stone-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#F7EFEA] text-[#5C1D24] flex items-center justify-center shrink-0">
                      <Ruler className="w-5 h-5 stroke-[2]" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-stone-900">Hồ Sơ Số Đo Cơ Thể & AI Stylist</h2>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Lưu trữ số đo 3 vòng để thuật toán AI Stylist gợi ý size chuẩn 100% không lo chật bó
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigate('/account/body-profiles')}
                    className="px-3.5 py-2 bg-[#5C1D24] hover:bg-[#4A151B] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                  >
                    <span>Quản lý hồ sơ số đo</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="bg-[#FAF5F2] rounded-2xl p-6 border border-stone-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#5C1D24] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Ruler className="w-6 h-6 stroke-[2]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-stone-900 text-sm">Hồ sơ số đo vóc dáng</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          {profiles.length > 0 ? `Đã lưu ${profiles.length} hồ sơ vóc dáng` : 'Chưa có hồ sơ số đo'}
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 mt-1 max-w-xl leading-relaxed">
                        Cập nhật số đo vòng bụng, ngực để thuật toán AI gợi ý size vừa vặn 100% không lo chật bó. Tự động áp dụng kích cỡ khi mua sắm.
                      </p>
                      {activeProfile ? (
                        <div className="flex items-center gap-4 mt-2.5 text-[11px] text-stone-600 flex-wrap">
                          <span className="flex items-center gap-1 font-medium text-stone-800">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>Hồ sơ chính: Chiều cao {activeProfile.height}cm • Cân nặng {activeProfile.weight}kg</span>
                          </span>
                          <span className="text-stone-400">•</span>
                          <span className="font-bold text-[#5C1D24]">
                            Gu mặc: {activeProfile.fitPreference === 'loose' ? 'Thoải mái rộng rãi' : activeProfile.fitPreference === 'snug' ? 'Ôm nhẹ' : 'Vừa vặn chuẩn phom'}
                          </span>
                        </div>
                      ) : (
                        <div className="mt-2.5 text-[11px] text-stone-500">
                          Chưa thiết lập hồ sơ số đo. Bấm nút quản lý bên cạnh để lưu số đo và nhận khuyến nghị size chuẩn xác.
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigate('/account/body-profiles')}
                    className="px-4 py-2.5 bg-white hover:bg-stone-50 border border-stone-300 text-stone-800 text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 shrink-0 self-start md:self-center cursor-pointer"
                  >
                    <span>Xem & Quản lý hồ sơ số đo</span>
                    <ExternalLink className="w-3.5 h-3.5 text-stone-500" />
                  </button>
                </div>
              </div>
            )}

            {/* ================= SECTION 2: ĐƠN HÀNG GẦN ĐÂY CỦA TÔI ================= */}
            {activeSection === 'orders' && (
              <div id="section-orders" className="bg-white rounded-2xl p-6 sm:p-7 shadow-xs border border-stone-200/90 space-y-5 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-stone-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#F7EFEA] text-[#5C1D24] flex items-center justify-center shrink-0">
                      <ShoppingBag className="w-5 h-5 stroke-[2]" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-stone-900">Đơn Hàng Gần Đây Của Tôi</h2>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Theo dõi lộ trình giao nhận và yêu cầu đổi size nhanh tại nhà
                      </p>
                    </div>
                  </div>

                  <span className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1 bg-stone-100 text-stone-800 text-xs font-bold rounded-full border border-stone-200">
                    <span>{totalOrdersCount} đơn hàng</span>
                  </span>
                </div>

                {/* Order Filter Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-stone-100 text-xs font-semibold">
                  {[
                    { id: 'all', label: 'Tất cả', count: orderCounts.all },
                    { id: 'placed', label: 'Chờ xác nhận', count: orderCounts.placed },
                    { id: 'processing', label: 'Đang xử lý', count: orderCounts.processing },
                    { id: 'shipping', label: 'Đang giao', count: orderCounts.shipping },
                    { id: 'delivered', label: 'Đã hoàn thành', count: orderCounts.delivered },
                    { id: 'cancelled', label: 'Đã hủy', count: orderCounts.cancelled },
                  ].map((tab) => {
                    const isActive = orderFilter === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setOrderFilter(tab.id as any)}
                        className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${isActive
                            ? 'bg-[#5C1D24] text-white shadow-xs font-bold'
                            : 'bg-stone-50 text-stone-600 hover:bg-stone-100 hover:text-stone-900 border border-stone-200/60'
                          }`}
                      >
                        <span>{tab.label}</span>
                        {tab.count > 0 && (
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-700'
                              }`}
                          >
                            {tab.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Order Cards List or Real Empty State */}
                {userOrders.length === 0 ? (
                  <div className="text-center py-14 px-4 bg-stone-50/70 rounded-2xl border border-dashed border-stone-300">
                    <div className="w-16 h-16 rounded-full bg-[#F7EFEA] text-[#5C1D24] flex items-center justify-center mx-auto mb-3.5 shadow-2xs">
                      <ShoppingBag className="w-8 h-8" />
                    </div>
                    <h3 className="font-bold text-stone-900 text-sm">Bạn chưa có đơn hàng nào</h3>
                    <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto leading-relaxed">
                      Khi bạn đặt hàng, toàn bộ thông tin đơn hàng và hành trình vận chuyển sẽ được lưu trữ an toàn tại tài khoản của bạn.
                    </p>
                    <button
                      type="button"
                      onClick={() => onNavigate('/products')}
                      className="mt-5 px-5 py-2.5 bg-[#5C1D24] hover:bg-[#4A121D] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer inline-flex items-center gap-2"
                    >
                      <span>Khám phá sản phẩm ngay</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="text-center py-12 px-4 bg-stone-50/50 rounded-2xl border border-dashed border-stone-200">
                    <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-2.5">
                      <ShoppingBag className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-stone-700 text-xs">Không có đơn hàng nào trong trạng thái này</h4>
                    <p className="text-[11px] text-stone-400 mt-0.5">Chọn mục khác hoặc đặt thêm sản phẩm mới để trải nghiệm.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredOrders.map((order: any) => {
                      const isDelivered = order.status === 'delivered';
                      const isPlaced = order.status === 'placed';
                      const isConfirmed = order.status === 'confirmed';
                      const isPreparing = order.status === 'preparing';
                      const isShipping = order.status === 'shipping';
                      const isCancelled = order.status === 'cancelled';
                      const orderCode = order.id.startsWith('#') ? order.id : `#${order.id}`;

                      return (
                        <div
                          key={order.id}
                          className="border border-stone-200/80 rounded-2xl p-5 hover:border-stone-300 transition-all bg-white"
                        >
                          {/* Order Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-stone-100 text-xs">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-stone-900">Mã đơn: {orderCode}</span>
                              <span className="text-stone-300">•</span>
                              <span className="text-stone-500">
                                {isDelivered ? `Giao thành công • ${order.createdAt}` : `Đặt ngày ${order.createdAt}`}
                              </span>
                            </div>

                            {/* Status Badges: Tách biệt Trạng thái thanh toán & Trạng thái xử lý đơn hàng */}
                            <div className="self-start sm:self-auto flex items-center gap-2 flex-wrap">
                              {/* Payment Status Badge */}
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                                  order.paymentStatus === 'paid'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : order.paymentStatus === 'failed'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : order.paymentStatus === 'cancelled'
                                    ? 'bg-stone-100 text-stone-700 border-stone-300'
                                    : order.paymentStatus === 'refunded'
                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}
                              >
                                <span>
                                  {order.paymentMethod === 'cod' ? 'COD' : 'VNPay'}:{' '}
                                  {order.paymentStatus === 'paid'
                                    ? 'Đã thanh toán'
                                    : order.paymentStatus === 'failed'
                                    ? 'Thanh toán thất bại'
                                    : order.paymentStatus === 'cancelled'
                                    ? 'Đã hủy thanh toán'
                                    : order.paymentStatus === 'refunded'
                                    ? 'Đã hoàn tiền'
                                    : 'Chờ thanh toán'}
                                </span>
                              </span>

                              {/* Order Processing Status Badge */}
                              {isPlaced && (
                                order.paymentMethod !== 'cod' && order.paymentStatus !== 'paid' ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                    <Clock className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
                                    <span>Chờ thanh toán VNPay (Chưa giao hàng)</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                    <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                                    <span>Đang chờ xác nhận</span>
                                  </span>
                                )
                              )}
                              {isConfirmed && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                  <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Đã xác nhận đơn</span>
                                </span>
                              )}
                              {isPreparing && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                                  <Package className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>Đang đóng gói hàng</span>
                                </span>
                              )}
                              {isShipping && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-800 border border-sky-200">
                                  <Truck className="w-3.5 h-3.5 text-sky-600" />
                                  <span>Đang vận chuyển giao hàng</span>
                                </span>
                              )}
                              {isDelivered && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                  <span>Đã hoàn thành</span>
                                </span>
                              )}
                              {isCancelled && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Đã hủy đơn</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Items List */}
                          <div className="py-4 space-y-3">
                            {(order.items || []).map((it: any, idx: number) => {
                              const itemName = it.product?.name || it.name || 'Sản phẩm Big Size cao cấp';
                              let rawImg = it.product?.images?.[0] || it.image;
                              // Sanitize beard man placeholder fallback to real product catalogue image
                              if (!rawImg || rawImg.includes('photo-1521572267360-ee0c2909d518') || rawImg.includes('photo-1581655353564')) {
                                rawImg = resolveProductRealDetails(itemName, undefined, it.sku || it.sku_mua).images[0];
                              }
                              const itemImg = rawImg || 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=300';
                              const itemVariant = it.variant || `Phân loại: ${it.colorName || 'Màu tiêu chuẩn'} • Size ${it.size || '2XL'}`;
                              const itemPrice = it.price || 450000;
                              const itemQty = it.quantity || it.qty || 1;

                              return (
                                <div key={idx} className="flex items-center gap-3.5">
                                  <img
                                    src={itemImg}
                                    alt={itemName}
                                    className="w-14 h-14 object-cover rounded-xl border border-stone-200 shrink-0 bg-stone-100"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <h4 className="text-xs font-bold text-stone-900 truncate">{itemName}</h4>
                                    <p className="text-[11px] text-stone-500 mt-0.5 truncate">{itemVariant}</p>
                                    <p className="text-[11px] text-stone-400 mt-0.5">Số lượng: 0{itemQty}</p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="text-xs font-bold text-stone-900">
                                      {itemPrice.toLocaleString('vi-VN')}₫
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Order Footer & Actions */}
                          <div className="pt-3.5 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                            <div className="font-bold text-stone-900">
                              <span>Tổng thanh toán ({order.itemCount || order.items?.length || 1} sản phẩm): </span>
                              <span className="text-sm text-[#5C1D24]">{order.total.toLocaleString('vi-VN')}₫</span>
                            </div>

                            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                              {/* 1. If Placed: Direct Cancel + Order Tracking (+ Continue VNPay if unpaid) */}
                              {isPlaced && (
                                <>
                                  {order.paymentMethod !== 'cod' && order.paymentStatus !== 'paid' && (
                                    <button
                                      type="button"
                                      onClick={() => onNavigate(`/order-success/${order.id.replace('#', '')}`)}
                                      className="px-3.5 py-2 bg-[#0066cc] hover:bg-[#0052a3] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                                    >
                                      <span>Thanh toán VNPay ngay</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setSelectedOrderForCancel(order)}
                                    className="px-3.5 py-2 bg-white hover:bg-rose-50 border border-stone-300 hover:border-rose-300 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>Hủy đơn hàng</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onNavigate(`/order-tracking?code=${order.id.replace('#', '')}`)}
                                    className="px-3.5 py-2 bg-[#5C1D24] hover:bg-[#4A121D] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                                  >
                                    <Truck className="w-3.5 h-3.5" />
                                    <span>Theo dõi đơn hàng</span>
                                  </button>
                                </>
                              )}

                              {/* 2. If Confirmed or Preparing: Request Cancel + Tracking */}
                              {(isConfirmed || isPreparing) && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedOrderForCancel(order)}
                                    className="px-3.5 py-2 bg-white hover:bg-stone-50 border border-stone-300 text-stone-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                                  >
                                    <span>Yêu cầu hủy đơn</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onNavigate(`/order-tracking?id=${order.id.replace('#', '')}`)}
                                    className="px-3.5 py-2 bg-[#5C1D24] hover:bg-[#4A121D] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                                  >
                                    <Truck className="w-3.5 h-3.5" />
                                    <span>Theo dõi đơn hàng</span>
                                  </button>
                                </>
                              )}

                              {/* 3. If Shipping: Track Order */}
                              {isShipping && (
                                <button
                                  type="button"
                                  onClick={() => onNavigate(`/order-tracking?id=${order.id.replace('#', '')}`)}
                                  className="px-3.5 py-2 bg-[#5C1D24] hover:bg-[#4A121D] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                                >
                                  <Truck className="w-3.5 h-3.5" />
                                  <span>Theo dõi đơn hàng</span>
                                </button>
                              )}

                              {/* 4. If Delivered: 7-day Return/Exchange Eligibility Check + Buy Again */}
                              {isDelivered && (() => {
                                const { isEligible, daysRemaining, daysPassed } = checkOrderReturnEligibility(order);
                                return (
                                  <>
                                    {isEligible ? (
                                      <button
                                        type="button"
                                        onClick={() => setSelectedOrderForReturn(order)}
                                        className="px-3.5 py-2 bg-white hover:bg-stone-50 border border-stone-300 text-stone-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                                        title={`Đơn hàng đủ điều kiện bảo hiểm đổi size miễn phí (Còn ${daysRemaining} ngày)`}
                                      >
                                        <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
                                        <span>Đổi size / Trả hàng (Còn {daysRemaining} ngày)</span>
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        disabled
                                        className="px-3.5 py-2 bg-stone-100 border border-stone-200 text-stone-400 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-not-allowed opacity-60"
                                        title={`Đã quá thời hạn đổi size miễn phí 7 ngày kể từ khi nhận hàng (Đã qua ${daysPassed} ngày)`}
                                      >
                                        <RotateCcw className="w-3.5 h-3.5 text-stone-400" />
                                        <span>Quá hạn đổi size (Đã qua {daysPassed} ngày)</span>
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onNavigate('/products');
                                        showToast('Đang chọn mua lại', 'Đã chuyển sang trang sản phẩm để chọn size mới.', 'success');
                                      }}
                                      className="px-3.5 py-2 bg-[#5C1D24] hover:bg-[#4A121D] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                      <span>Mua lại</span>
                                    </button>
                                  </>
                                );
                              })()}

                              {/* 5. If Cancelled: Buy Again */}
                              {isCancelled && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onNavigate('/products');
                                    showToast('Đang chọn mua lại', 'Đã chuyển sang trang sản phẩm để đặt lại.', 'success');
                                  }}
                                  className="px-3.5 py-2 bg-[#5C1D24] hover:bg-[#4A121D] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Mua lại</span>
                                </button>
                              )}

                              {/* Support Button (Always available) */}
                              <button
                                type="button"
                                onClick={() => showToast('Hỗ trợ đơn hàng', 'Chuyên viên stylist sẽ gọi hỗ trợ bạn trong vòng 5 phút.', 'info')}
                                className="px-3 py-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl text-xs font-medium flex items-center gap-1 transition-all cursor-pointer"
                              >
                                <Headphones className="w-3.5 h-3.5 text-stone-400" />
                                <span className="hidden sm:inline">Hỗ trợ</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ================= SECTION 3: YÊU CẦU ĐỔI/TRẢ & HỦY ================= */}
            {activeSection === 'returns' && (
              <div id="section-returns" className="bg-white rounded-2xl p-6 sm:p-7 shadow-xs border border-stone-200/90 space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#F7EFEA] text-[#5C1D24] flex items-center justify-center shrink-0">
                      <RotateCcw className="w-5 h-5 stroke-[2]" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-stone-900">Yêu Cầu Đổi/Trả & Hủy Đơn</h2>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Theo dõi tiến trình đổi size 1:1 tận nơi miễn phí 7 ngày và trạng thái hủy đơn
                      </p>
                    </div>
                  </div>

                  <span className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1 bg-[#F7EFEA] text-[#5C1D24] text-xs font-bold rounded-full border border-[#5C1D24]/20">
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{totalReturnsCount} yêu cầu đang xử lý</span>
                  </span>
                </div>

                <CustomerReturnSupplements />

                {totalReturnsCount === 0 ? (
                  <div className="text-center py-14 px-4 bg-stone-50/70 rounded-2xl border border-dashed border-stone-300">
                    <div className="w-16 h-16 rounded-full bg-[#F7EFEA] text-[#5C1D24] flex items-center justify-center mx-auto mb-3.5 shadow-2xs">
                      <RotateCcw className="w-8 h-8" />
                    </div>
                    <h3 className="font-bold text-stone-900 text-sm">Chưa có yêu cầu đổi/trả hay hủy đơn nào</h3>
                    <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto leading-relaxed">
                      Khi bạn cần đổi size tận nơi hoặc gửi yêu cầu hủy đơn, toàn bộ tiến trình xử lý sẽ xuất hiện tại đây.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Sub-section 1: Đổi size & Trả hàng */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-2">
                          <RefreshCw className="w-3.5 h-3.5 text-[#5C1D24]" />
                          <span>Yêu cầu đổi size & trả hàng ({displayedReturns.length})</span>
                        </h3>
                        <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                          Đổi size tận nơi 0đ shipper
                        </span>
                      </div>

                      {displayedReturns.length === 0 ? (
                        <div className="text-center py-8 bg-stone-50/60 rounded-xl border border-dashed border-stone-200">
                          <RotateCcw className="w-8 h-8 text-stone-300 mx-auto mb-1.5" />
                          <p className="text-xs text-stone-500">Bạn chưa có yêu cầu đổi/trả sản phẩm nào.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {displayedReturns.map((req: any) => {
                            const isExchange = req.type === 'exchange_size';
                            return (
                              <div
                                key={req.id}
                                className="p-4 rounded-xl border border-stone-200/90 bg-white hover:border-[#5C1D24]/40 transition-all space-y-3 shadow-2xs"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-stone-100">
                                  <div className="flex items-center gap-2 flex-wrap text-xs">
                                    <span className="font-mono font-bold text-[#5C1D24] bg-[#F7EFEA] px-2 py-0.5 rounded-md">
                                      {req.id}
                                    </span>
                                    <span className="text-stone-300">•</span>
                                    <span className="text-stone-600">Đơn hàng: <strong className="text-stone-900">{req.orderId}</strong></span>
                                    <span className="text-stone-300">•</span>
                                    <span className="text-[11px] text-stone-400">{req.createdAt}</span>
                                  </div>

                                  {/* Status Badge */}
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold self-start sm:self-auto border ${req.status === 'pending_review' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                                      req.status === 'approved' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                                        req.status === 'received_goods' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                                          req.status === 'exchange_sent' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                                            req.status === 'refunded' ? 'bg-stone-100 text-stone-800 border-stone-200' :
                                              'bg-rose-50 text-rose-800 border-rose-200'
                                    }`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                    <span>
                                      {req.status === 'pending_review' && 'Chờ xét duyệt'}
                                      {req.status === 'approved' && 'Đã duyệt yêu cầu'}
                                      {req.status === 'received_goods' && 'Đã nhận hàng về kho'}
                                      {req.status === 'exchange_sent' && 'Đã gửi size mới'}
                                      {req.status === 'refunded' && 'Đã hoàn tiền'}
                                      {req.status === 'rejected' && 'Từ chối'}
                                    </span>
                                  </span>
                                </div>

                                {/* Product Info */}
                                <div className="flex items-start gap-3.5">
                                  <img
                                    src={req.productImage}
                                    alt={req.productName}
                                    className="w-14 h-14 object-cover rounded-xl border border-stone-200 shrink-0"
                                  />
                                  <div className="min-w-0 flex-1 text-xs space-y-1">
                                    <h4 className="font-bold text-stone-900 leading-snug">{req.productName}</h4>
                                    <div className="flex items-center gap-2 flex-wrap text-[11px]">
                                      <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-800 font-medium">
                                        {isExchange
                                          ? `Đổi size: ${req.currentSize} ➔ sang ${req.requestedSize}`
                                          : 'Trả hàng & hoàn tiền'}
                                      </span>
                                      {req.refundAmount && (
                                        <span className="text-emerald-700 font-bold">
                                          Hoàn: {req.refundAmount.toLocaleString('vi-VN')}₫
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-stone-500 italic">
                                      "{req.reasonDetail || (req.reason === 'too_tight' ? 'Chật bụng bia, muốn đổi rộng hơn' : 'Sản phẩm không vừa ý')}"
                                    </p>
                                  </div>
                                </div>

                                {/* Admin Note / Shipper Tracking */}
                                {req.adminNote && (
                                  <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200/80 text-[11px] text-stone-700 flex items-start gap-2">
                                    <Info className="w-3.5 h-3.5 text-[#5C1D24] shrink-0 mt-0.5" />
                                    <p className="leading-relaxed">
                                      <strong className="text-stone-900">Phản hồi từ Stylist / Quản lý:</strong> {req.adminNote}
                                    </p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Sub-section 2: Hủy đơn hàng */}
                    {displayedCancellations.length > 0 && (
                      <div className="pt-4 border-t border-stone-100 space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-2">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Yêu cầu hủy đơn hàng ({displayedCancellations.length})</span>
                        </h3>

                        <div className="space-y-3">
                          {displayedCancellations.map((can: any) => (
                            <div
                              key={can.id}
                              className="p-3.5 rounded-xl border border-stone-200/90 bg-white text-xs space-y-2 shadow-2xs"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                                    {can.id}
                                  </span>
                                  <span className="text-stone-300">•</span>
                                  <span className="text-stone-600">Đơn hàng: <strong className="text-stone-900">{can.orderId}</strong></span>
                                  <span className="text-stone-300">•</span>
                                  <span className="text-[11px] text-stone-400">{can.createdAt}</span>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${can.status === 'approved'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                  }`}>
                                  {can.status === 'approved' ? 'Đã duyệt hủy' : 'Đang chờ duyệt'}
                                </span>
                              </div>
                              <p className="text-[11px] text-stone-600">
                                <strong>Lý do:</strong> {can.reason}
                              </p>
                              {can.adminNote && (
                                <p className="text-[11px] text-emerald-800 font-semibold bg-emerald-50/70 p-2 rounded-lg border border-emerald-200/50">
                                  Ghi chú: {can.adminNote}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ================= SECTION 4: KHO VOUCHER ƯU ĐÃI CỦA TÔI ================= */}
            {activeSection === 'vouchers' && (
              <div id="section-vouchers" className="bg-white rounded-2xl p-6 sm:p-7 shadow-xs border border-stone-200/90 space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#F7EFEA] text-[#5C1D24] flex items-center justify-center shrink-0">
                      <Tag className="w-5 h-5 stroke-[2]" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-stone-900">Kho Voucher Ưu Đãi Của Tôi</h2>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Danh sách mã giảm giá và hỗ trợ vận chuyển độc quyền dành riêng cho bạn
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-800 text-xs font-bold rounded-full border border-rose-200">
                      <Tag className="w-3.5 h-3.5" />
                      <span>{filteredVouchers.length} mã khả dụng</span>
                    </span>
                  </div>
                </div>

                {/* Voucher Category Filter Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold">
                  {[
                    { id: 'all', label: 'Tất cả', count: activeVouchersList.length, icon: null },
                    { id: 'discount', label: 'Voucher Giảm Giá', count: discountVouchersCount, icon: Tag },
                    { id: 'shipping', label: 'Miễn Phí Vận Chuyển', count: shippingVouchersCount, icon: Truck },
                  ].map((tab) => {
                    const isActive = voucherTab === tab.id;
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setVoucherTab(tab.id as any)}
                        className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${isActive
                            ? 'bg-[#5C1D24] text-white shadow-xs font-bold'
                            : 'bg-stone-50 text-stone-600 hover:bg-stone-100 hover:text-stone-900 border border-stone-200/70'
                          }`}
                      >
                        {Icon && <Icon className="w-3.5 h-3.5" />}
                        <span>{tab.label}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-700'
                            }`}
                        >
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Voucher Cards Grid or Empty State */}
                {filteredVouchers.length === 0 ? (
                  <div className="text-center py-12 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                    <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-400 mb-2">
                      <Tag className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-stone-700">Chưa có voucher trong danh mục này</p>
                    <p className="text-[11px] text-stone-500 mt-0.5">Vui lòng chọn tab khác để xem các ưu đãi có sẵn.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {filteredVouchers.map((voucher) => {
                      const isShipping = isShippingVoucher(voucher);
                      return (
                        <div
                          key={voucher.id}
                          className="border border-stone-200/90 rounded-2xl p-4 bg-white hover:border-[#5C1D24]/40 transition-all flex flex-col justify-between gap-3 shadow-2xs group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isShipping ? 'bg-sky-50 text-sky-800' : 'bg-rose-50 text-rose-800'
                                }`}>
                                {isShipping ? <Truck className="w-4 h-4" /> : <Tag className="w-4 h-4" />}
                              </div>
                              <div>
                                <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-stone-100 text-stone-900 border border-stone-200">
                                  {voucher.code}
                                </span>
                                <span className={`text-[10px] ml-2 px-1.5 py-0.2 rounded font-bold ${isShipping ? 'bg-sky-100 text-sky-800' : 'bg-rose-100 text-rose-800'
                                  }`}>
                                  {isShipping ? 'Freeship' : 'Giảm đơn'}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(voucher.code);
                                showToast('Đã sao chép mã', `Mã ${voucher.code} đã lưu vào bộ nhớ tạm`, 'info');
                              }}
                              className="text-stone-400 hover:text-stone-700 transition-colors cursor-pointer p-1"
                              title="Sao chép mã"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div>
                            <h4 className="font-bold text-xs text-stone-900 leading-snug">{voucher.name}</h4>
                            <p className="text-[11px] text-stone-500 mt-1">{voucher.description}</p>
                          </div>

                          <div className="flex items-center justify-between pt-2.5 border-t border-stone-100 text-[11px]">
                            <span className="text-stone-500">
                              Đơn tối thiểu: <strong className="text-stone-800">{voucher.minOrderValue.toLocaleString('vi-VN')}₫</strong>
                            </span>
                            <button
                              type="button"
                              onClick={() => onNavigate('/products')}
                              className="font-bold text-[#5C1D24] hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              <span>Dùng ngay</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ================= SECTION 5: SỔ ĐỊA CHỈ GIAO HÀNG ================= */}
            {activeSection === 'addresses' && (
              <div id="section-addresses" className="bg-white rounded-2xl p-6 sm:p-7 shadow-xs border border-stone-200/90 space-y-5 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#F7EFEA] text-[#5C1D24] flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 stroke-[2]" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-stone-900">Sổ Địa Chỉ Giao Hàng</h2>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Danh sách địa chỉ để shipper giao hàng và nhân viên hỗ trợ thử size 1:1
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setEditingAddressId(null);
                      setAddressErrors({});
                      setNewAddr({
                        fullName: name || currentUser?.name || '',
                        phone: phone || currentUser?.phone || '',
                        email: email || currentUser?.email || '',
                        province: 'TP. Hồ Chí Minh',
                        district: '',
                        ward: '',
                        addressDetail: '',
                        label: 'Nhà riêng',
                        isDefault: displayedAddresses.length === 0
                      });
                      setIsAddressModalOpen(true);
                    }}
                    className="px-3.5 py-2 bg-white hover:bg-stone-50 border border-stone-300 text-stone-800 rounded-xl text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-xs"
                  >
                    <Plus className="w-4 h-4 text-stone-600" />
                    <span>Thêm địa chỉ mới</span>
                  </button>
                </div>

                {/* Empty State or Real Address Cards Grid */}
                {displayedAddresses.length === 0 ? (
                  <div className="text-center py-14 px-4 bg-stone-50/70 rounded-2xl border border-dashed border-stone-300">
                    <div className="w-16 h-16 rounded-full bg-[#F7EFEA] text-[#5C1D24] flex items-center justify-center mx-auto mb-3.5 shadow-2xs">
                      <MapPin className="w-8 h-8" />
                    </div>
                    <h3 className="font-bold text-stone-900 text-sm">Bạn chưa lưu địa chỉ nhận hàng nào</h3>
                    <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto leading-relaxed">
                      Lưu địa chỉ nhận hàng để thanh toán nhanh chóng hơn khi mua sắm tại Curve and Confidence.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAddressId(null);
                        setAddressErrors({});
                        setNewAddr({
                          fullName: name || currentUser?.name || '',
                          phone: phone || currentUser?.phone || '',
                          email: email || currentUser?.email || '',
                          province: 'TP. Hồ Chí Minh',
                          district: '',
                          ward: '',
                          addressDetail: '',
                          label: 'Nhà riêng',
                          isDefault: true
                        });
                        setIsAddressModalOpen(true);
                      }}
                      className="mt-5 px-5 py-2.5 bg-[#5C1D24] hover:bg-[#4A121D] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer inline-flex items-center gap-2"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm địa chỉ nhận hàng đầu tiên</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {displayedAddresses.map((addr: any) => {
                      const isDefault = addr.isDefault;
                      const isHome = (addr.label || '').includes('Nhà') || isDefault;

                      return (
                        <div
                          key={addr.id}
                          className={`rounded-2xl p-5 border transition-all flex flex-col justify-between ${isDefault
                              ? 'border-[#5C1D24]/40 bg-white shadow-xs'
                              : 'border-stone-200/90 bg-white hover:border-stone-300'
                            }`}
                        >
                          <div>
                            {/* Address Card Top */}
                            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-stone-100">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-xs text-stone-900">{addr.fullName}</span>
                                {isDefault && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#5C1D24] text-white">
                                    Mặc định
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-stone-500 font-medium bg-stone-100 px-2 py-0.5 rounded-md">
                                {addr.label || (isHome ? 'Nhà riêng' : 'Văn phòng')}
                              </span>
                            </div>

                            {/* Details */}
                            <div className="py-3 space-y-1 text-xs">
                              <p className="text-stone-700">
                                <strong className="text-stone-500 font-normal">Điện thoại:</strong> {addr.phone}
                              </p>
                              <p className="text-stone-600 leading-relaxed text-[11px] mt-1">
                                {addr.addressDetail}
                                {addr.ward && !addr.addressDetail?.includes(addr.ward) ? `, ${addr.ward}` : ''}
                                {addr.district && !addr.addressDetail?.includes(addr.district) ? `, ${addr.district}` : ''}
                                {addr.province && !addr.addressDetail?.includes(addr.province) ? `, ${addr.province}` : ''}
                              </p>
                            </div>
                          </div>

                          {/* Bottom Footer Actions */}
                          <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs mt-2">
                            {isDefault ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                                <Zap className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
                                <span>Đủ điều kiện giao hỏa tốc 2H</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => {
                                  setDefaultAddress(addr.id);
                                  showToast('Thành công', 'Đã đặt địa chỉ làm mặc định!', 'success');
                                }}
                                className="text-[11px] font-bold text-stone-500 hover:text-stone-900 cursor-pointer"
                              >
                                Đặt làm mặc định
                              </button>
                            )}

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingAddressId(addr.id);
                                  setAddressErrors({});
                                  setNewAddr({
                                    fullName: addr.fullName,
                                    phone: addr.phone,
                                    email: addr.email || email,
                                    province: addr.province || 'TP. Hồ Chí Minh',
                                    district: addr.district || '',
                                    ward: addr.ward || '',
                                    addressDetail: addr.addressDetail,
                                    label: addr.label || 'Nhà riêng',
                                    isDefault: addr.isDefault
                                  });
                                  setIsAddressModalOpen(true);
                                }}
                                className="text-[11px] font-bold text-stone-700 hover:text-[#5C1D24] cursor-pointer"
                              >
                                Chỉnh sửa
                              </button>

                              {!isDefault && (
                                <button
                                  onClick={() => {
                                    deleteAddress(addr.id);
                                    showToast('Đã xóa', 'Địa chỉ đã được gỡ bỏ khỏi sổ.', 'info');
                                  }}
                                  className="text-[11px] font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
                                >
                                  Xóa
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= MODAL: THÊM / CHỈNH SỬA ĐỊA CHỈ ================= */}
      {isAddressModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-900/40 backdrop-blur-md animate-fadeIn"
          onClick={() => setIsAddressModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-stone-200 my-auto animate-scaleIn text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
              <h3 className="font-bold text-sm text-stone-900">
                {editingAddressId ? 'Chỉnh Sửa Địa Chỉ Giao Hàng' : 'Thêm Địa Chỉ Giao Hàng Mới'}
              </h3>
              <button onClick={() => setIsAddressModalOpen(false)} className="text-stone-400 hover:text-stone-700 cursor-pointer">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdateAddress} noValidate className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Họ tên người nhận <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={newAddr.fullName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewAddr({ ...newAddr, fullName: val });
                      if (addressErrors.fullName) {
                        const err = validateFullName(val, 'Họ tên người nhận');
                        setAddressErrors((prev) => {
                          const next = { ...prev };
                          if (err) next.fullName = err;
                          else delete next.fullName;
                          return next;
                        });
                      }
                    }}
                    onBlur={(e) => {
                      const normalized = normalizeFullName(e.target.value);
                      setNewAddr((prev) => ({ ...prev, fullName: normalized }));
                      const err = validateFullName(normalized, 'Họ tên người nhận');
                      setAddressErrors((prev) => {
                        const next = { ...prev };
                        if (err) next.fullName = err;
                        else delete next.fullName;
                        return next;
                      });
                    }}
                    className={`w-full px-3 py-2 text-xs border rounded-xl ${addressErrors.fullName ? 'border-rose-500 bg-rose-50/40' : 'border-stone-300'
                      }`}
                  />
                  {addressErrors.fullName && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{addressErrors.fullName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Số điện thoại <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={newAddr.phone}
                    onChange={(e) => {
                      const val = clampPhoneInput(e.target.value);
                      setNewAddr({ ...newAddr, phone: val });
                      if (addressErrors.phone) {
                        const err = validateVietnamesePhone(val);
                        setAddressErrors((prev) => {
                          const next = { ...prev };
                          if (err) next.phone = err;
                          else delete next.phone;
                          return next;
                        });
                      }
                    }}
                    onBlur={(e) => {
                      const err = validateVietnamesePhone(e.target.value);
                      setAddressErrors((prev) => {
                        const next = { ...prev };
                        if (err) next.phone = err;
                        else delete next.phone;
                        return next;
                      });
                    }}
                    className={`w-full px-3 py-2 text-xs border rounded-xl font-mono ${addressErrors.phone ? 'border-rose-500 bg-rose-50/40' : 'border-stone-300'
                      }`}
                  />
                  {addressErrors.phone && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{addressErrors.phone}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Tỉnh / Thành phố <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newAddr.province}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewAddr({ ...newAddr, province: val });
                      if (addressErrors.province && val.trim()) {
                        setAddressErrors((prev) => {
                          const next = { ...prev };
                          delete next.province;
                          return next;
                        });
                      }
                    }}
                    onBlur={(e) => {
                      const val = e.target.value.trim();
                      setNewAddr((prev) => ({ ...prev, province: val }));
                      setAddressErrors((prev) => {
                        const next = { ...prev };
                        if (!val) next.province = 'Vui lòng nhập Tỉnh / Thành phố.';
                        else delete next.province;
                        return next;
                      });
                    }}
                    className={`w-full px-3 py-2 text-xs border rounded-xl ${addressErrors.province ? 'border-rose-500 bg-rose-50/40' : 'border-stone-300'
                      }`}
                  />
                  {addressErrors.province && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{addressErrors.province}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Quận / Huyện <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newAddr.district}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewAddr({ ...newAddr, district: val });
                      if (addressErrors.district && val.trim()) {
                        setAddressErrors((prev) => {
                          const next = { ...prev };
                          delete next.district;
                          return next;
                        });
                      }
                    }}
                    onBlur={(e) => {
                      const val = e.target.value.trim();
                      setNewAddr((prev) => ({ ...prev, district: val }));
                      setAddressErrors((prev) => {
                        const next = { ...prev };
                        if (!val) next.district = 'Vui lòng nhập Quận / Huyện.';
                        else delete next.district;
                        return next;
                      });
                    }}
                    className={`w-full px-3 py-2 text-xs border rounded-xl ${addressErrors.district ? 'border-rose-500 bg-rose-50/40' : 'border-stone-300'
                      }`}
                  />
                  {addressErrors.district && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{addressErrors.district}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Phường / Xã <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newAddr.ward}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewAddr({ ...newAddr, ward: val });
                      if (addressErrors.ward && val.trim()) {
                        setAddressErrors((prev) => {
                          const next = { ...prev };
                          delete next.ward;
                          return next;
                        });
                      }
                    }}
                    onBlur={(e) => {
                      const val = e.target.value.trim();
                      setNewAddr((prev) => ({ ...prev, ward: val }));
                      setAddressErrors((prev) => {
                        const next = { ...prev };
                        if (!val) next.ward = 'Vui lòng nhập Phường / Xã.';
                        else delete next.ward;
                        return next;
                      });
                    }}
                    className={`w-full px-3 py-2 text-xs border rounded-xl ${addressErrors.ward ? 'border-rose-500 bg-rose-50/40' : 'border-stone-300'
                      }`}
                  />
                  {addressErrors.ward && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{addressErrors.ward}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Địa chỉ chi tiết (Số nhà, tên đường, tòa nhà) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={250}
                  placeholder="Ví dụ: Số 18, Ngõ 92 Trần Thái Tông..."
                  value={newAddr.addressDetail}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewAddr({ ...newAddr, addressDetail: val });
                    if (addressErrors.addressDetail && val.trim().length >= 3) {
                      setAddressErrors((prev) => {
                        const next = { ...prev };
                        delete next.addressDetail;
                        return next;
                      });
                    }
                  }}
                  onBlur={(e) => {
                    const val = e.target.value.trim();
                    setNewAddr((prev) => ({ ...prev, addressDetail: val }));
                    setAddressErrors((prev) => {
                      const next = { ...prev };
                      if (!val || val.length < 3) {
                        next.addressDetail = 'Vui lòng nhập địa chỉ chi tiết tối thiểu 3 ký tự (Số nhà, tên đường).';
                      } else {
                        delete next.addressDetail;
                      }
                      return next;
                    });
                  }}
                  className={`w-full px-3 py-2 text-xs border rounded-xl ${addressErrors.addressDetail ? 'border-rose-500 bg-rose-50/40' : 'border-stone-300'
                    }`}
                />
                {addressErrors.addressDetail && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">{addressErrors.addressDetail}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Loại địa chỉ</label>
                <div className="flex gap-2">
                  {['Nhà riêng', 'Văn phòng'].map((lbl) => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => setNewAddr({ ...newAddr, label: lbl })}
                      className={`px-4 py-1.5 text-xs font-bold rounded-xl border cursor-pointer ${newAddr.label === lbl
                          ? 'bg-[#5C1D24] text-white border-[#5C1D24]'
                          : 'bg-white text-stone-700 border-stone-200'
                        }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(false)}
                  className="w-1/3 py-2.5 bg-stone-100 hover:bg-stone-200 text-xs font-bold rounded-xl cursor-pointer"
                >
                  HỦY
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#5C1D24] hover:bg-[#4A121D] text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  LƯU ĐỊA CHỈ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ĐỔI MẬT KHẨU TÀI KHOẢN THƯỜNG ================= */}
      {isPasswordModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-900/40 backdrop-blur-md animate-fadeIn"
          onClick={() => setIsPasswordModalOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-stone-200 my-auto animate-scaleIn text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
              <h3 className="font-bold text-sm text-stone-900">Đổi Mật Khẩu Bảo Mật</h3>
              <button onClick={() => setIsPasswordModalOpen(false)} className="text-stone-400 hover:text-stone-700 cursor-pointer">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Mật khẩu hiện tại</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Mật khẩu mới (tối thiểu 6 ký tự)</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="w-1/3 py-2 bg-stone-100 text-xs font-bold rounded-xl cursor-pointer"
                >
                  HỦY
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="flex-1 py-2 bg-[#5C1D24] hover:bg-[#47151a] disabled:opacity-50 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
                >
                  {isChangingPassword ? 'ĐANG CẬP NHẬT...' : 'CẬP NHẬT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: THIẾT LẬP MẬT KHẨU DỰ PHÒNG CHO TÀI KHOẢN GOOGLE ================= */}
      {isSetPasswordModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-900/40 backdrop-blur-md animate-fadeIn"
          onClick={() => setIsSetPasswordModalOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-stone-200 my-auto animate-scaleIn text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#5C1D24]" />
                <h3 className="font-bold text-sm text-stone-900">
                  {currentUser?.hasCustomPassword ? 'Cập Nhật Mật Khẩu' : 'Thiết Lập Mật Khẩu Dự Phòng'}
                </h3>
              </div>
              <button
                onClick={() => setIsSetPasswordModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-600 mb-4 leading-relaxed">
              Tài khoản này được đăng nhập bảo mật qua Google. Việc thiết lập mật khẩu dự phòng giúp bạn có thể đăng nhập bằng email và mật khẩu độc lập khi cần thiết mà không phụ thuộc Google.
            </p>

            <form onSubmit={handleSetBackupPassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Mật khẩu mới (tối thiểu 6 ký tự)</label>
                <input
                  type="password"
                  required
                  placeholder="Nhập mật khẩu mới..."
                  value={backupPassword}
                  onChange={(e) => setBackupPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-stone-300 rounded-xl focus:border-[#5C1D24] focus:ring-1 focus:ring-[#5C1D24]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Xác nhận mật khẩu mới</label>
                <input
                  type="password"
                  required
                  placeholder="Nhập lại mật khẩu mới..."
                  value={confirmBackupPassword}
                  onChange={(e) => setConfirmBackupPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-stone-300 rounded-xl focus:border-[#5C1D24] focus:ring-1 focus:ring-[#5C1D24]"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsSetPasswordModalOpen(false)}
                  className="w-1/3 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                >
                  HỦY
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPassword}
                  className="flex-1 py-2.5 bg-[#5C1D24] hover:bg-[#4A121D] text-white text-xs font-bold rounded-xl cursor-pointer transition-colors disabled:opacity-50"
                >
                  {isSubmittingPassword ? 'ĐANG LƯU...' : 'LƯU MẬT KHẨU'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {selectedOrderForReturn && (
        <ReturnModal
          order={selectedOrderForReturn}
          isOpen={!!selectedOrderForReturn}
          onClose={() => setSelectedOrderForReturn(null)}
        />
      )}

      {/* Cancel Order Modal */}
      {selectedOrderForCancel && (
        <CancelOrderModal
          order={selectedOrderForCancel}
          isOpen={!!selectedOrderForCancel}
          onClose={() => setSelectedOrderForCancel(null)}
        />
      )}
    </div>
  );
};
