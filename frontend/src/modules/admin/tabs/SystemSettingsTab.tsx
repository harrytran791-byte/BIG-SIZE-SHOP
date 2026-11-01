import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  ShieldCheck,
  Clock,
  Bell,
  RotateCw,
  Save,
  Settings,
  Shield
} from 'lucide-react';
import { UserAccount } from '@/shared/types';
import { useToast } from '@/shared/context/ToastContext';
import { ConfirmModal } from '@/shared/components/ConfirmModal';
import {
  SystemSettingsState,
  defaultSystemSettings,
  getSystemSettings,
  saveSystemSettings,
  resetSystemSettings,
  fetchSystemSettingsFromSupabase
} from '@/shared/services/systemSettingsService';

interface SystemSettingsTabProps {
  currentUser: UserAccount | null;
  onAppendAuditLog: (action: string, category: string, targetCode: string, targetDesc: string) => void;
}

export const SystemSettingsTab: React.FC<SystemSettingsTabProps> = ({
  currentUser,
  onAppendAuditLog,
}) => {
  const { showToast } = useToast();

  const [settings, setSettings] = useState<SystemSettingsState>(() => getSystemSettings());
  const [isSaving, setIsSaving] = useState(false);
  const [isSettingsSaved, setIsSettingsSaved] = useState(false);
  const [isResetConfirmModalOpen, setIsResetConfirmModalOpen] = useState(false);

  useEffect(() => {
    void fetchSystemSettingsFromSupabase().then((data) => {
      if (data) setSettings(data);
    });
  }, []);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const saved = await saveSystemSettings(settings);
      setSettings(saved);
      onAppendAuditLog(
        'Cập nhật cấu hình hệ thống',
        'Cấu hình hệ thống',
        'SYSTEM_SETTINGS',
        `Đã lưu cấu hình lên Supabase Cloud: Đăng ký=${settings.allowRegistration ? 'Bật' : 'Tắt'}, Timeout=${settings.idleTimeoutMinutes}m, Mật khẩu=${settings.minPasswordLength} ký tự`
      );
      showToast('Lưu cấu hình thành công', 'Cấu hình đã được lưu lên Supabase Cloud và có hiệu lực đồng bộ cho toàn bộ hệ thống.', 'success');
    } catch (err: any) {
      showToast('Lỗi lưu cấu hình', err?.message || 'Không thể lưu cấu hình lên máy chủ.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetSettings = async () => {
    setIsSaving(true);
    try {
      const res = await resetSystemSettings();
      setSettings(res);
      setIsResetConfirmModalOpen(false);
      onAppendAuditLog(
        'Khôi phục cấu hình mặc định',
        'Cấu hình hệ thống',
        'SYSTEM_SETTINGS',
        'Đã đưa các tham số cấu hình về giá trị mặc định ban đầu trên Supabase Cloud'
      );
      showToast('Đã khôi phục mặc định', 'Cấu hình hệ thống đã trở về giá trị mặc định tiêu chuẩn trên Cloud.', 'info');
    } catch (err: any) {
      showToast('Lỗi khôi phục', err?.message || 'Không thể khôi phục cấu hình.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-charcoal-900 tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-[#5C1D24]" />
            <span>Cấu Hình Hệ Thống</span>
          </h1>
        </div>

        <span className="text-[11px] text-stone-500 self-start sm:self-auto font-medium">
          Thiết lập vận hành & chính sách an toàn Curve & Confidence
        </span>
      </div>

      {/* 4 Cards Grid (2x2) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Tài khoản & đăng ký */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-2xs space-y-4">
          <div className="bg-indigo-50/80 border border-indigo-100 rounded-xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-2xs">
                <UserCheck className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-extrabold text-sm text-indigo-950">Tài khoản & Đăng ký</h3>
                <p className="text-[11px] text-indigo-700/80">Quy định tạo tài khoản và xác minh danh tính</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
              Mục 1
            </span>
          </div>

          {/* Toggle: Cho phép đăng ký */}
          <div className="flex items-center justify-between py-1">
            <div>
              <span className="font-bold text-xs text-charcoal-900 block">Cho phép đăng ký tài khoản</span>
              <span className="text-[11px] text-stone-400">Khách hàng có thể tự tạo tài khoản mới.</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSettings((s) => ({ ...s, allowRegistration: !s.allowRegistration }));
                setIsSettingsSaved(false);
              }}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                settings.allowRegistration ? 'bg-[#5C1D24]' : 'bg-stone-300'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  settings.allowRegistration ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Xác minh email */}
          <div className="flex items-center justify-between py-1">
            <div>
              <span className="font-bold text-xs text-charcoal-900 block">Xác minh email tài khoản</span>
              <span className="text-[11px] text-stone-400">Kích hoạt tài khoản ngay sau khi đăng ký.</span>
            </div>
            <span className="px-2.5 py-1 bg-stone-100 text-stone-600 border border-stone-200 rounded-lg text-xs font-semibold">
              Tự động kích hoạt
            </span>
          </div>

          {/* Select: Vai trò mặc định */}
          <div className="flex items-center justify-between py-1">
            <div>
              <span className="font-bold text-xs text-charcoal-900 block">Vai trò mặc định</span>
              <span className="text-[11px] text-stone-400">Áp dụng khi người dùng tự đăng ký.</span>
            </div>
            <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Customer (Khách hàng)
            </span>
          </div>

          {/* Cấp tài khoản nội bộ */}
          <div className="flex items-center justify-between py-1">
            <div>
              <span className="font-bold text-xs text-charcoal-900 block">Cấp tài khoản nội bộ</span>
              <span className="text-[11px] text-stone-400">Quản trị viên trực tiếp phân quyền tại tab Quản Lý Tài Khoản.</span>
            </div>
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold">
              Admin phân quyền (RBAC)
            </span>
          </div>
        </div>

        {/* 2. Bảo mật & xác thực */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-2xs space-y-4">
          <div className="bg-purple-50/80 border border-purple-100 rounded-xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-purple-700 text-white shadow-2xs">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-extrabold text-sm text-purple-950">Bảo Mật & Xác Thực</h3>
                <p className="text-[11px] text-purple-700/80">Giảm rủi ro truy cập và bảo vệ tài khoản đặc quyền</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
              Mục 2
            </span>
          </div>

          {/* Select: Độ dài mật khẩu */}
          <div className="flex items-center justify-between py-1">
            <div>
              <span className="font-bold text-xs text-charcoal-900 block">Độ dài mật khẩu tối thiểu</span>
              <span className="text-[11px] text-stone-400">Áp dụng kiểm tra khi đăng ký và đổi mật khẩu.</span>
            </div>
            <select
              value={settings.minPasswordLength}
              onChange={(e) => {
                setSettings((s) => ({ ...s, minPasswordLength: Number(e.target.value) }));
                setIsSettingsSaved(false);
              }}
              className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-charcoal-800 cursor-pointer focus:outline-hidden focus:border-[#5C1D24]"
            >
              <option value={8}>8 ký tự</option>
              <option value={10}>10 ký tự</option>
              <option value={12}>12 ký tự</option>
            </select>
          </div>

          {/* MFA */}
          <div className="flex items-center justify-between py-1">
            <div>
              <span className="font-bold text-xs text-charcoal-900 block">Xác thực tài khoản</span>
              <span className="text-[11px] text-stone-400">Mã hóa mật khẩu chuẩn Bcrypt và token Supabase.</span>
            </div>
            <span className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold">
              Bảo mật tiêu chuẩn
            </span>
          </div>

          {/* Giới hạn đăng nhập sai */}
          <div className="flex items-center justify-between py-1">
            <div>
              <span className="font-bold text-xs text-charcoal-900 block">Giới hạn đăng nhập sai</span>
              <span className="text-[11px] text-stone-400">Ngưỡng cảnh báo xác thực thất bại.</span>
            </div>
            <span className="px-2.5 py-1 bg-stone-100 text-stone-700 border border-stone-200 rounded-lg text-xs font-bold">
              5 lần thử
            </span>
          </div>

          {/* Thời gian khóa tạm */}
          <div className="flex items-center justify-between py-1">
            <div>
              <span className="font-bold text-xs text-charcoal-900 block">Khóa an toàn tài khoản</span>
              <span className="text-[11px] text-stone-400">Khóa tài khoản tức thì khi Admin phát hiện bất thường.</span>
            </div>
            <span className="px-2.5 py-1 bg-stone-100 text-stone-700 border border-stone-200 rounded-lg text-xs font-bold">
              Chủ động 2 bước (ConfirmModal)
            </span>
          </div>
        </div>

        {/* 3. Phiên đăng nhập */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-2xs space-y-4">
          <div className="bg-amber-50/80 border border-amber-100 rounded-xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-amber-600 text-white shadow-2xs">
                <Clock className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-extrabold text-sm text-amber-950">Phiên Đăng Nhập</h3>
                <p className="text-[11px] text-amber-700/80">Chính sách dành cho không gian Admin / Manager</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              Mục 3
            </span>
          </div>

          {/* Select: Hết phiên khi không hoạt động */}
          <div className="flex items-center justify-between py-1">
            <div>
              <span className="font-bold text-xs text-charcoal-900 block">Hết phiên khi không hoạt động</span>
              <span className="text-[11px] text-stone-400">Tự đăng xuất sau thời gian chờ.</span>
            </div>
            <select
              value={settings.idleTimeoutMinutes}
              onChange={(e) => {
                setSettings((s) => ({ ...s, idleTimeoutMinutes: Number(e.target.value) }));
                setIsSettingsSaved(false);
              }}
              className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-charcoal-800 cursor-pointer"
            >
              <option value={15}>15 phút</option>
              <option value={30}>30 phút</option>
              <option value={60}>60 phút</option>
            </select>
          </div>

          {/* Số phiên đồng thời */}
          <div className="flex items-center justify-between py-1">
            <div>
              <span className="font-bold text-xs text-charcoal-900 block">Số phiên đồng thời tối đa</span>
              <span className="text-[11px] text-stone-400">Giới hạn trên mỗi tài khoản nội bộ.</span>
            </div>
            <span className="px-2.5 py-1 bg-stone-100 text-stone-700 border border-stone-200 rounded-lg text-xs font-bold">
              3 thiết bị (Tiêu chuẩn)
            </span>
          </div>

          {/* Toggle: Thu hồi phiên khi đổi mật khẩu */}
          <div className="flex items-center justify-between py-1">
            <div>
              <span className="font-bold text-xs text-charcoal-900 block">Thu hồi phiên khi đổi mật khẩu</span>
              <span className="text-[11px] text-stone-400">Đăng xuất các thiết bị khác ngay lập tức.</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSettings((s) => ({ ...s, revokeSessionsOnPasswordChange: !s.revokeSessionsOnPasswordChange }));
                setIsSettingsSaved(false);
              }}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                settings.revokeSessionsOnPasswordChange ? 'bg-[#5C1D24]' : 'bg-stone-300'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  settings.revokeSessionsOnPasswordChange ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>

          <p className="text-[10px] text-stone-400 pt-2 border-t border-stone-100">
            Chính sách phiên làm việc được áp dụng đồng bộ trên toàn hệ thống.
          </p>
        </div>

        {/* 4. Thông báo quản trị */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-2xs space-y-4">
          <div className="bg-emerald-50/80 border border-emerald-100 rounded-xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-2xs">
                <Bell className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-extrabold text-sm text-emerald-950">Thông Báo Quản Trị</h3>
                <p className="text-[11px] text-emerald-700/80">Cảnh báo hệ thống và quản lý nhật ký kiểm toán</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              Mục 4
            </span>
          </div>

          {/* Nhật ký kiểm toán */}
          <div className="flex items-center justify-between py-1">
            <div>
              <span className="font-bold text-xs text-charcoal-900 block">Nhật ký kiểm toán (Audit Log)</span>
              <span className="text-[11px] text-stone-400">Ghi lại toàn bộ hành động quản trị quan trọng.</span>
            </div>
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold">
              Tự động ghi nhận
            </span>
          </div>

          {/* Giám sát vai trò */}
          <div className="flex items-center justify-between py-1">
            <div>
              <span className="font-bold text-xs text-charcoal-900 block">Giám sát phân quyền vai trò</span>
              <span className="text-[11px] text-stone-400">Kiểm soát chặt chẽ 3 vai trò ADMIN, MANAGER, USER.</span>
            </div>
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold">
              Chống leo quyền (RBAC)
            </span>
          </div>

          {/* Select: Bản tổng hợp hoạt động */}
          <div className="flex items-center justify-between py-1">
            <div>
              <span className="font-bold text-xs text-charcoal-900 block">Chu kỳ tổng hợp nhật ký</span>
              <span className="text-[11px] text-stone-400">Thời điểm chốt số liệu báo cáo hàng ngày.</span>
            </div>
            <select
              value={settings.dailyDigestTime}
              onChange={(e) => {
                setSettings((s) => ({ ...s, dailyDigestTime: e.target.value }));
                setIsSettingsSaved(false);
              }}
              className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-charcoal-800 cursor-pointer focus:outline-hidden focus:border-[#5C1D24]"
            >
              <option value="09:00">09:00 mỗi ngày</option>
              <option value="18:00">18:00 mỗi ngày</option>
            </select>
          </div>

          {/* Email nhận cảnh báo */}
          <div className="pt-2 border-t border-stone-100 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-charcoal-900">Email nhận cảnh báo</span>
              <span className="text-[10px] text-stone-400">Hộp thư nhận alert</span>
            </div>
            <input
              type="email"
              value={settings.adminNotificationEmail || 'security@curveconfidence.vn'}
              onChange={(e) => {
                setSettings((s) => ({ ...s, adminNotificationEmail: e.target.value }));
                setIsSettingsSaved(false);
              }}
              placeholder="security@curveconfidence.vn"
              className="w-full px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-charcoal-800 focus:outline-hidden focus:border-[#5C1D24]"
            />
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-stone-200/90 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-stone-600 font-medium">
            Hệ thống đang hoạt động ổn định • Cấu hình được áp dụng tức thì khi lưu
          </span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => setIsResetConfirmModalOpen(true)}
            className="px-4 py-2.5 bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-800 border border-rose-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Khôi phục mặc định ban đầu</span>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveSettings}
            className="px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer bg-[#5C1D24] hover:bg-[#4A121D] text-white shadow-md shadow-[#5C1D24]/20 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                <span>Đang lưu lên Cloud...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-amber-300" />
                <span>Lưu Cấu Hình Hệ Thống</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sub-footer */}
      <div className="flex items-center justify-between pt-6 text-[11px] text-stone-400 border-t border-stone-200">
        <span>Curve & Confidence • Cấu hình hệ thống</span>
        <span className="text-stone-500 font-medium">Chính sách vận hành TMĐT chuẩn IS2004/ISP392</span>
      </div>

      {/* Confirm Reset System Settings Modal */}
      <ConfirmModal
        isOpen={isResetConfirmModalOpen}
        title="Khôi phục cấu hình mặc định?"
        description="Hệ thống sẽ đặt lại toàn bộ các tham số về đăng ký, thời gian phiên làm việc và bảo mật về giá trị mặc định ban đầu. Bạn có chắc chắn muốn khôi phục không?"
        confirmText="Xác nhận khôi phục"
        cancelText="Hủy bỏ"
        variant="warning"
        onConfirm={handleResetSettings}
        onCancel={() => setIsResetConfirmModalOpen(false)}
      />
    </div>
  );
};
