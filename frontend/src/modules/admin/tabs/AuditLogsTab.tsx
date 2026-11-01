import React, { useState } from 'react';
import {
  Download,
  AlertCircle,
  Search,
  ShieldCheck,
  Activity
} from 'lucide-react';
import { useToast } from '@/shared/context/ToastContext';
import { AuditLogEntry } from '../data/mockSystemAdmin';
import { csvCell } from '@/shared/utils/adminExport';

interface AuditLogsTabProps {
  auditLogsList: AuditLogEntry[];
  loadError?: boolean;
}

export const AuditLogsTab: React.FC<AuditLogsTabProps> = ({ auditLogsList, loadError = false }) => {
  const { showToast } = useToast();

  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('all');
  const [auditResultFilter, setAuditResultFilter] = useState<'all' | 'success' | 'denied'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  if (loadError) return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-charcoal-900">Nhật Ký Hoạt Động</h1>
      <p role="alert" className="text-sm text-amber-800">Chưa tải được lịch sử quản trị. Chưa thể tra cứu hoặc xuất nhật ký lúc này.</p>
    </div>
  );

  // Reset to page 1 on search / filter change
  const handleSearchChange = (val: string) => {
    setAuditSearchQuery(val);
    setCurrentPage(1);
  };
  const handleActionFilterChange = (val: string) => {
    setAuditActionFilter(val);
    setCurrentPage(1);
  };
  const handleResultFilterChange = (val: 'all' | 'success' | 'denied') => {
    setAuditResultFilter(val);
    setCurrentPage(1);
  };

  const filteredAuditLogs = auditLogsList.filter((log) => {
    const matchSearch =
      !auditSearchQuery ||
      log.action.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
      log.performedBy.name.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
      (log.performedBy.id && log.performedBy.id.toLowerCase().includes(auditSearchQuery.toLowerCase())) ||
      log.target.code.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
      log.target.description.toLowerCase().includes(auditSearchQuery.toLowerCase());
    const matchResult =
      auditResultFilter === 'all' || log.result === auditResultFilter;
    const matchAction =
      auditActionFilter === 'all' || log.category === auditActionFilter;
    return matchSearch && matchResult && matchAction;
  });

  const totalPages = Math.max(1, Math.ceil(filteredAuditLogs.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const pagedAuditLogs = filteredAuditLogs.slice(startIndex, startIndex + pageSize);

  const handleExportAuditLogs = () => {
    const headers = ['Thời gian', 'Ngày', 'Mã người thực hiện', 'Người thực hiện', 'Vai trò', 'Hành động', 'Phạm vi', 'Đối tượng', 'Mô tả', 'Kết quả'];
    const rows = filteredAuditLogs.map((log) => [
      log.timeFormatted, log.dateFormatted, log.performedBy.id || '', log.performedBy.name,
      log.performedBy.role, log.action, log.category, log.target.code, log.target.description,
      log.result === 'success' ? 'Thành công' : 'Bị từ chối',
    ]);
    const csvContent = '\uFEFF' + [headers.map(csvCell).join(','), ...rows.map((r) => r.map(csvCell).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Nhat_Ky_Audit_Logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Xuất nhật ký thành công', 'File CSV nhật ký hoạt động đã được tải về máy.', 'success');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Title with Export button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-charcoal-900 tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-[#5C1D24]" />
            <span>Nhật Ký Hoạt Động</span>
          </h1>
        </div>

        <button
          type="button"
          onClick={handleExportAuditLogs}
          className="px-4 py-2 bg-white hover:bg-stone-100 text-charcoal-800 border border-stone-300 rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Xuất nhật ký</span>
        </button>
      </div>

      {/* Info Notice Banner */}
      <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 text-xs flex items-center gap-3">
        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
        <span>
          Nhật ký hiển thị tối đa 500 thay đổi tài khoản gần nhất đã được hệ thống xác nhận. Không thể chỉnh sửa tại đây.
        </span>
      </div>

      {/* Main Audit History Card */}
      <div className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden shadow-2xs">
        <div className="p-6 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-base text-charcoal-900">Lịch sử hoạt động hệ thống</h3>
            <p className="text-xs text-stone-500 mt-0.5">
              {auditLogsList.length} sự kiện được ghi nhận • {auditLogsList.filter((l) => l.result === 'success').length} thành công, {auditLogsList.filter((l) => l.result === 'denied').length} bị từ chối
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-stone-100 text-stone-600 self-start sm:self-auto">
            Lưu trữ an toàn
          </span>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 bg-stone-50/50 border-b border-stone-100 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={auditSearchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Tìm người thực hiện, hành động, đối tượng..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-stone-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-brand-700/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <select
              value={auditActionFilter}
              onChange={(e) => handleActionFilterChange(e.target.value)}
              className="px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium text-charcoal-800 cursor-pointer"
            >
              <option value="all">Tất cả hành động</option>
              <option value="Quản lý tài khoản">Quản lý tài khoản</option>
              <option value="Vai trò và phân quyền">Vai trò và phân quyền</option>
              <option value="Cấu hình hệ thống">Cấu hình hệ thống</option>
              <option value="Tài khoản và xác thực">Tài khoản và xác thực</option>
              <option value="Kiểm soát truy cập">Kiểm soát truy cập</option>
            </select>

            <select
              value={auditResultFilter}
              onChange={(e) => handleResultFilterChange(e.target.value as any)}
              className="px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium text-charcoal-800 cursor-pointer"
            >
              <option value="all">Tất cả kết quả</option>
              <option value="success">Thành công</option>
              <option value="denied">Bị từ chối</option>
            </select>
          </div>
        </div>

        {/* Audit Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-4 pl-6">Thời gian</th>
                <th className="p-4">Người thực hiện</th>
                <th className="p-4">Hành động</th>
                <th className="p-4">Đối tượng liên quan</th>
                <th className="p-4 text-center pr-6">Kết quả</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {pagedAuditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-stone-400">
                    Không tìm thấy bản ghi nhật ký phù hợp với bộ lọc tìm kiếm.
                  </td>
                </tr>
              ) : (
                pagedAuditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-stone-50/50">
                    <td className="p-4 pl-6">
                      <span className="font-bold text-charcoal-900 block font-mono">{log.timeFormatted}</span>
                      <span className="text-[10px] text-stone-400 block font-mono">{log.dateFormatted}</span>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-charcoal-900">{log.performedBy.name}</span>
                      </div>
                      <span className="text-[11px] text-stone-500 block">
                        {log.performedBy.role} {log.performedBy.code ? `• ${log.performedBy.code}` : ''}
                      </span>
                    </td>

                    <td className="p-4">
                      <span className="font-bold text-charcoal-900 block">{log.action}</span>
                      <span className="text-[11px] text-stone-400 block">{log.category}</span>
                    </td>

                    <td className="p-4">
                      <span className="font-bold text-charcoal-900 block">
                        {log.target.description || log.target.code}
                      </span>
                      <span className="text-[11px] text-stone-500 block">{log.target.code}</span>
                    </td>

                    <td className="p-4 text-center pr-6">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                        log.result === 'success'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {log.result === 'success' ? 'Thành công' : 'Bị từ chối'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span className="text-stone-500 text-[11px]">
            Hiển thị {filteredAuditLogs.length === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + pageSize, filteredAuditLogs.length)} trong {filteredAuditLogs.length} sự kiện
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className={`px-3 py-1 rounded-lg border text-xs font-medium cursor-pointer ${
                currentPage <= 1 ? 'border-stone-200 text-stone-300 cursor-not-allowed' : 'border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              Trước
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                  pageNum === currentPage
                    ? 'bg-[#5C1D24] text-white'
                    : 'border border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                {pageNum}
              </button>
            ))}
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className={`px-3 py-1 rounded-lg border text-xs font-medium cursor-pointer ${
                currentPage >= totalPages ? 'border-stone-200 text-stone-300 cursor-not-allowed' : 'border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      {/* Status footer */}
      <div className="flex items-center justify-between pt-2 text-[11px] text-stone-500">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Bảo toàn lịch sử • Chỉ Admin được tra cứu và xuất log</span>
        </div>
        <span>Múi giờ: Asia/Ho_Chi_Minh (UTC+7)</span>
      </div>

      {/* Sub-footer */}
      <div className="flex items-center justify-between pt-6 text-[11px] text-stone-400 border-t border-stone-200">
        <span>Curve & Confidence • Nhật ký hoạt động</span>
        <span className="text-emerald-700 font-medium">Dữ liệu hệ thống thời gian thực • Cập nhật trực tiếp</span>
      </div>
    </div>
  );
};
