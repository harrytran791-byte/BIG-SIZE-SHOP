import React, { useState, useMemo } from 'react';
import {
  Users,
  UserCheck,
  Lock,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Server,
  LayoutDashboard
} from 'lucide-react';
import { UserAccount } from '@/shared/types';
import { registrationBuckets } from '@/shared/utils/adminMetrics';
import { normalizeRole } from '@/shared/utils/roleUtils';
import { AuditLogEntry } from '../data/mockSystemAdmin';

interface SystemDashboardTabProps {
  allUsers: UserAccount[];
  auditLogsList: AuditLogEntry[];
  auditLoadError?: boolean;
  onNavigateToAuditLogs: () => void;
}

export const SystemDashboardTab: React.FC<SystemDashboardTabProps> = ({
  allUsers,
  auditLogsList,
  auditLoadError = false,
  onNavigateToAuditLogs,
}) => {
  const [timeRange, setTimeRange] = useState('30_days');

  // Key metrics calculated dynamically from live allUsers
  const totalUsersCount = allUsers.length;
  const activeUsersCount = allUsers.filter(u => u.status === 'active').length;
  const lockedUsersCount = allUsers.filter(u => u.status === 'locked').length;
  const adminUsers = allUsers.filter(u => normalizeRole(u.role, u.email, u.name) === 'admin');
  const managerUsers = allUsers.filter(u => normalizeRole(u.role, u.email, u.name) === 'manager');
  const customerUsers = allUsers.filter(u => normalizeRole(u.role, u.email, u.name) === 'customer');

  const adminCount = adminUsers.length;
  const managerCount = managerUsers.length;
  const customerCount = customerUsers.length;

  const activePercent = totalUsersCount > 0 ? ((activeUsersCount / totalUsersCount) * 100).toFixed(1) : '0';
  const lockedPercent = totalUsersCount > 0 ? ((lockedUsersCount / totalUsersCount) * 100).toFixed(1) : '0';

  const customerPercent = totalUsersCount > 0 ? ((customerCount / totalUsersCount) * 100).toFixed(1) : '0';
  const managerPercent = totalUsersCount > 0 ? ((managerCount / totalUsersCount) * 100).toFixed(1) : '0';
  const adminPercent = totalUsersCount > 0 ? ((adminCount / totalUsersCount) * 100).toFixed(1) : '0';

  // SVG Donut Calculations (Circumference C = 2 * PI * 38 ≈ 238.76)
  const donutCircumference = 238.76;
  const customerDonutDash = totalUsersCount > 0 ? (customerCount / totalUsersCount) * donutCircumference : 0;
  const managerDonutDash = totalUsersCount > 0 ? (managerCount / totalUsersCount) * donutCircumference : 0;
  const adminDonutDash = totalUsersCount > 0 ? (adminCount / totalUsersCount) * donutCircumference : 0;

  const customerOffset = 0;
  const managerOffset = -customerDonutDash;
  const adminOffset = -(customerDonutDash + managerDonutDash);

  // SVG Line Chart Points computed dynamically from allUsers with rolling weekly labels
  const userRegistrationPoints = useMemo(() => {
    const days = timeRange === '7_days' ? 7 : timeRange === '90_days' ? 90 : 30;
    const buckets = registrationBuckets(allUsers, days);
    const maxVal = Math.max(3, Math.ceil(Math.max(...buckets.map(b => b.count)) / 3) * 3);
    return buckets.map((bucket, i) => ({ cx: 90 + i * 140, cy: Math.round(170 - bucket.count / maxVal * 140), val: bucket.count, label: bucket.label, maxVal }));
  }, [allUsers, timeRange]);

  const userAreaPath = userRegistrationPoints.length > 0
    ? `M ${userRegistrationPoints[0].cx} ${userRegistrationPoints[0].cy} ` +
      userRegistrationPoints.slice(1).map(p => `L ${p.cx} ${p.cy}`).join(' ') +
      ` L ${userRegistrationPoints[userRegistrationPoints.length - 1].cx} 170 L ${userRegistrationPoints[0].cx} 170 Z`
    : '';

  const userLinePath = userRegistrationPoints.length > 0
    ? `M ${userRegistrationPoints[0].cx} ${userRegistrationPoints[0].cy} ` +
      userRegistrationPoints.slice(1).map(p => `L ${p.cx} ${p.cy}`).join(' ')
    : '';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Title with Dropdown Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-charcoal-900 tracking-tight flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-[#5C1D24]" />
            <span>Tổng Quan Hệ Thống</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-1.5 bg-white border border-stone-200 rounded-xl text-xs font-bold text-charcoal-800 shadow-2xs hover:border-stone-300 cursor-pointer"
          >
            <option value="7_days">7 ngày gần nhất</option>
            <option value="30_days">30 ngày gần nhất</option>
            <option value="90_days">90 ngày gần nhất</option>
          </select>
        </div>
      </div>

      {/* Row 1: Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-4">
        {/* 1. Tổng số tài khoản */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-medium text-stone-600">Tổng số tài khoản</span>
            <Users className="w-5 h-5 text-stone-400" />
          </div>
          <p className="text-3xl font-black text-charcoal-900 tracking-tight">{totalUsersCount}</p>
          <p className="text-[11px] text-stone-500 mt-1.5">
            {adminCount} Admin • {managerCount} Manager • {customerCount} Khách
          </p>
        </div>

        {/* 2. Tài khoản đang hoạt động */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-medium text-stone-600">Tài khoản đang hoạt động</span>
            <UserCheck className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-black text-emerald-600 tracking-tight">{activeUsersCount}</p>
          <p className="text-[11px] text-stone-500 mt-1.5">{activePercent}% tổng số tài khoản</p>
        </div>

        {/* 3. Tài khoản bị khóa */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-medium text-stone-600">Tài khoản bị khóa</span>
            <Lock className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-3xl font-black text-amber-500 tracking-tight">{lockedUsersCount}</p>
          <p className="text-[11px] text-stone-500 mt-1.5">{lockedPercent}% • Cần theo dõi bảo mật</p>
        </div>
      </div>

      {/* Row 2: 2 Visualizations (Line Chart + Donut Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Line chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-stone-200/90 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="font-bold text-base text-charcoal-900">
                Đăng ký tài khoản theo thời gian
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">Số tài khoản mới được tạo trong hệ thống</p>
            </div>
          </div>

          {/* SVG Line Chart */}
          <div className="h-56 w-full pt-4">
            <svg viewBox="0 0 600 200" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#70222B" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#70222B" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              <line x1="30" y1="30" x2="570" y2="30" stroke="#E5E7EB" strokeDasharray="3 3" />
              <line x1="30" y1="76.67" x2="570" y2="76.67" stroke="#E5E7EB" strokeDasharray="3 3" />
              <line x1="30" y1="123.33" x2="570" y2="123.33" stroke="#E5E7EB" strokeDasharray="3 3" />
              <line x1="30" y1="170" x2="570" y2="170" stroke="#E5E7EB" />

              {/* Axis labels */}
              <text x="20" y="35" fontSize="10" fill="#9CA3AF" textAnchor="end">{userRegistrationPoints[0].maxVal}</text>
              <text x="20" y="81.67" fontSize="10" fill="#9CA3AF" textAnchor="end">{userRegistrationPoints[0].maxVal * 2 / 3}</text>
              <text x="20" y="128.33" fontSize="10" fill="#9CA3AF" textAnchor="end">{userRegistrationPoints[0].maxVal / 3}</text>
              <text x="20" y="175" fontSize="10" fill="#9CA3AF" textAnchor="end">0</text>

              {/* Area Fill */}
              <path d={userAreaPath} fill="url(#lineGrad)" />

              {/* Line Path */}
              <path
                d={userLinePath}
                fill="none"
                stroke="#70222B"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Data Dots & Text */}
              {userRegistrationPoints.map((pt, i) => (
                <g key={i}>
                  <circle cx={pt.cx} cy={pt.cy} r={i === 3 ? "5" : "4.5"} fill="#70222B" stroke="#FFFFFF" strokeWidth="2" />
                  <text x={pt.cx} y={pt.cy - 12} fontSize="11" fontWeight="bold" fill="#70222B" textAnchor="middle">{pt.val}</text>
                  <text x={pt.cx} y={190} fontSize="10" fill="#6B7280" textAnchor="middle">{pt.label}</text>
                </g>
              ))}
            </svg>
          </div>

          <p className="text-[11px] text-stone-500 pt-2 border-t border-stone-100">
            Thống kê theo ngày tạo tài khoản • Múi giờ Việt Nam
          </p>
        </div>

        {/* Right: Donut Chart (User Distribution) */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-base text-charcoal-900">
              Biểu đồ phân bổ người dùng
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">Phân bổ theo vai trò trong hệ thống</p>
          </div>

          {/* SVG Donut */}
          <div className="flex items-center justify-center py-4">
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {/* Background track */}
                <circle cx="50" cy="50" r="38" fill="none" stroke="#F3F4F6" strokeWidth="12" />
                {/* Customer */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#70222B"
                  strokeWidth="12"
                  strokeDasharray={`${customerDonutDash.toFixed(1)} ${donutCircumference}`}
                  strokeDashoffset={customerOffset.toString()}
                />
                {/* Manager */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="12"
                  strokeDasharray={`${managerDonutDash.toFixed(1)} ${donutCircumference}`}
                  strokeDashoffset={managerOffset.toString()}
                />
                {/* Admin */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#7C3AED"
                  strokeWidth="12"
                  strokeDasharray={`${adminDonutDash.toFixed(1)} ${donutCircumference}`}
                  strokeDashoffset={adminOffset.toString()}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-charcoal-900">{totalUsersCount}</span>
                <span className="text-[10px] text-stone-500 font-medium">tài khoản</span>
              </div>
            </div>
          </div>

          {/* Legend list */}
          <div className="space-y-2 pt-2 border-t border-stone-100 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-700" />
                <span className="font-medium text-charcoal-800">Customer</span>
              </div>
              <span className="font-bold text-charcoal-900">
                {customerCount} <span className="text-stone-400 font-normal">({customerPercent}%)</span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="font-medium text-charcoal-800">Manager</span>
              </div>
              <span className="font-bold text-charcoal-900">
                {managerCount} <span className="text-stone-400 font-normal">({managerPercent}%)</span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                <span className="font-medium text-charcoal-800">Admin</span>
              </div>
              <span className="font-bold text-charcoal-900">
                {adminCount} <span className="text-stone-400 font-normal">({adminPercent}%)</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Hoạt động quản trị gần đây */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-base text-charcoal-900">Hoạt động quản trị gần đây</h3>
            <p className="text-xs text-stone-500 mt-0.5">Các thay đổi tài khoản và bảo mật mới nhất</p>
          </div>
          <button
            type="button"
            onClick={onNavigateToAuditLogs}
            className="text-xs font-bold text-brand-700 hover:text-brand-800 flex items-center gap-1 cursor-pointer"
          >
            <span>Xem nhật ký</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3">
          {auditLogsList.length === 0 ? (
            <div className="py-6 text-center text-xs text-stone-400">
              {auditLoadError ? 'Chưa tải được nhật ký quản trị. Chưa thể xác nhận lịch sử hoạt động.' : 'Chưa có thay đổi tài khoản được ghi nhận.'}
            </div>
          ) : (
            auditLogsList.slice(0, 5).map((item) => (
              <div key={item.id} className="p-3.5 rounded-xl bg-stone-50/80 hover:bg-stone-50 border border-stone-100 flex items-center justify-between text-xs transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono text-stone-500 shrink-0">{item.timeFormatted}</span>
                  <div>
                    <span className="font-bold text-charcoal-900 block">{item.performedBy.name}</span>
                    <span className="text-[11px] text-stone-500 block">
                      {item.action} • <span className="text-charcoal-700 font-medium">{item.target.description || item.target.code}</span>
                    </span>
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                  item.result === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {item.result === 'success' ? 'Thành công' : 'Bị từ chối'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Sub-footer */}
      <div className="flex items-center justify-between pt-6 text-[11px] text-stone-400 border-t border-stone-200">
        <span>Curve & Confidence • Phân hệ Quản trị hệ thống</span>
        <span className="text-emerald-700 font-medium">Dữ liệu hệ thống thời gian thực • Cập nhật trực tiếp</span>
      </div>
    </div>
  );
};
