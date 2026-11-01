import { ConfirmModal } from '@/shared/components/ConfirmModal';
import React, { useState, useMemo, useEffect } from 'react';
import { 
  RotateCcw, 
  Eye, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Package, 
  X,
  Ban,
  AlertTriangle,
  Truck
} from 'lucide-react';
import { ReturnRequest, CancellationRequest } from '@/shared/types';
import { useReturn } from '@/modules/return/context/ReturnContext';
import { useOrder } from '@/modules/order/context/OrderContext';
import { useToast } from '@/context/ToastContext';
import { ReturnDetailModal } from '../components/ReturnDetailModal';
import { ReturnRecoveryEditor } from '@/modules/return/components/ReturnRecoveryEditor';
import { needsReturnRecovery } from '@/modules/return/services/returnRecovery';
import type { RecoverySnapshot } from '@/modules/return/services/returnRecovery';
import { ghnService } from '@/shared/services/ghnService';
import { databaseId } from '@/shared/services/transactionService';

interface ReturnsTabProps {
  onAppendAuditLog?: (
    action: string,
    category: string,
    targetCode: string,
    targetDesc: string,
    result?: 'success' | 'denied',
    reason?: string
  ) => void;
}

const RETURN_REASON_LABELS: Record<string, string> = {
  too_tight: 'Hơi kích / chật bụng khi ngồi',
  too_loose: 'Rộng hơn so với mong muốn',
  wrong_item: 'Giao nhầm size hoặc sai màu',
  defective: 'Lỗi kỹ thuật / lỗi đường may',
  other: 'Lý do khác'
};

export const ReturnsTab: React.FC<ReturnsTabProps> = ({ onAppendAuditLog }) => {
  const {
    inspectReturn,
    returnRequests,
    reviewReturnRequest,
    cancellationRequests,
    reviewCancellation,
    receiveReturnedGoods,
    refreshReturns,
    loadRecovery,
    saveRecovery
  } = useReturn();
  const { cancelOrder, rejectCancelOrder } = useOrder();
  const { showToast } = useToast();

  const [inspection, setInspection] = useState<ReturnRequest | null>(null);
  const [inspectionChoices, setInspectionChoices] = useState<Record<number, boolean>>({});
  const [receiveTarget, setReceiveTarget] = useState<ReturnRequest | null>(null);
  const [recoveryTarget, setRecoveryTarget] = useState<{ request: ReturnRequest; snapshot: RecoverySnapshot } | null>(null);
  const openRecovery = async (request: ReturnRequest) => {
    try { setRecoveryTarget({ request, snapshot: await loadRecovery(request.id) }); }
    catch (e) { showToast('Chưa tải được hồ sơ', e instanceof Error ? e.message : 'Vui lòng thử lại.', 'error'); }
  };
  // Active section: returns or cancellations
  const [activeSection, setActiveSection] = useState<'returns' | 'cancellations'>('returns');

  // Modal and Filter states for Returns
  const [selectedReturnDetail, setSelectedReturnDetail] = useState<ReturnRequest | null>(null);
  const [confirmReturnAction, setConfirmReturnAction] = useState<{
    request: ReturnRequest;
    action: 'approved' | 'rejected';
  } | null>(null);
  const [actionNote, setActionNote] = useState('');

  // State for shipping exchange item
  const [shippingExchangeRequest, setShippingExchangeRequest] = useState<ReturnRequest | null>(null);


  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_review' | 'approved' | 'received_goods' | 'exchange_sent' | 'rejected' | 'completed'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'exchange_size' | 'return_refund'>('all');

  // Filter states for Cancellations
  const [cancelSearchQuery, setCancelSearchQuery] = useState('');
  const [cancelStatusFilter, setCancelStatusFilter] = useState<'all' | 'pending_review' | 'approved' | 'rejected'>('all');
  const [confirmCancelAction, setConfirmCancelAction] = useState<{
    request: CancellationRequest;
    action: 'approved' | 'rejected';
  } | null>(null);
  const [cancelActionNote, setCancelActionNote] = useState('');

  // KPI Counts for Returns
  const kpiCounts = useMemo(() => {
    return {
      total: returnRequests.length,
      pending: returnRequests.filter(r => r.status === 'pending_review').length,
      approved: returnRequests.filter(r => r.status === 'approved' || r.status === 'received_goods' || r.status === 'exchange_sent').length,
      rejected: returnRequests.filter(r => r.status === 'rejected').length,
    };
  }, [returnRequests]);

  // KPI Counts for Cancellations
  const cancelKpiCounts = useMemo(() => {
    return {
      total: cancellationRequests.length,
      pending: cancellationRequests.filter(c => c.status === 'pending_review').length,
      approved: cancellationRequests.filter(c => c.status === 'approved').length,
      rejected: cancellationRequests.filter(c => c.status === 'rejected').length,
    };
  }, [cancellationRequests]);

  // Filtered returns list
  const filteredReturns = useMemo(() => {
    return returnRequests.filter((r) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchId = r.id.toLowerCase().includes(q);
        const matchOrder = r.orderId.toLowerCase().includes(q);
        const matchCustomer = (r.customerName || '').toLowerCase().includes(q);
        const matchPhone = (r.customerPhone || '').includes(q);
        const matchProduct = (r.productName || '').toLowerCase().includes(q);
        if (!matchId && !matchOrder && !matchCustomer && !matchPhone && !matchProduct) {
          return false;
        }
      }

      // Status
      if (statusFilter !== 'all') {
        if (statusFilter === 'completed') {
          if (r.status !== 'refunded' && r.status !== 'exchange_sent') return false;
        } else if (r.status !== statusFilter) {
          return false;
        }
      }

      // Type
      if (typeFilter !== 'all' && r.type !== typeFilter) {
        return false;
      }

      return true;
    });
  }, [returnRequests, searchQuery, statusFilter, typeFilter]);

  // Filtered cancellations list
  const filteredCancellations = useMemo(() => {
    return cancellationRequests.filter((c) => {
      if (cancelSearchQuery.trim()) {
        const q = cancelSearchQuery.toLowerCase().trim();
        const matchId = c.id.toLowerCase().includes(q);
        const matchOrder = c.orderId.toLowerCase().includes(q);
        const matchCustomer = (c.customerName || '').toLowerCase().includes(q);
        const matchReason = (c.reason || '').toLowerCase().includes(q);
        if (!matchId && !matchOrder && !matchCustomer && !matchReason) {
          return false;
        }
      }

      if (cancelStatusFilter !== 'all' && c.status !== cancelStatusFilter) {
        return false;
      }

      return true;
    });
  }, [cancellationRequests, cancelSearchQuery, cancelStatusFilter]);

  // Đóng mọi modal bằng phím ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedReturnDetail(null);
        setConfirmReturnAction(null);
        setConfirmCancelAction(null);
        setInspection(null);
        setReceiveTarget(null);
        setShippingExchangeRequest(null);
        setRecoveryTarget(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handlers for Returns
  const handleApprove = async (request: ReturnRequest, note: string) => {
    if (needsReturnRecovery(request)) { setConfirmReturnAction(null); setSelectedReturnDetail(null); await openRecovery(request); return; }
    if (!await reviewReturnRequest(request.id, 'approved', note)) { showToast('Chưa thể duyệt', 'Vui lòng thử lại.', 'error'); return; }
    showToast('Phê duyệt thành công', `Đã chấp thuận yêu cầu đổi size ${request.id} cho khách ${request.customerName}!`, 'success');
    onAppendAuditLog?.(
      'Phê duyệt yêu cầu đổi size',
      'Đổi size & Hậu mãi',
      request.id,
      `Đơn hàng ${request.orderId} - Khách ${request.customerName} - Đổi sang size ${request.requestedSize || ''}`,
      'success',
      note
    );
    setSelectedReturnDetail(null);
    setConfirmReturnAction(null);
    setActionNote('');
  };

  const handleReject = async (request: ReturnRequest, note: string) => {
    if (needsReturnRecovery(request) || !['pending_review', 'approved'].includes(request.status)) { setConfirmReturnAction(null); setSelectedReturnDetail(null); await openRecovery(request); return; }
    if (!await reviewReturnRequest(request.id, 'rejected', note)) { showToast('Chưa thể từ chối', 'Vui lòng thử lại.', 'error'); return; }
    showToast('Đã từ chối yêu cầu', `Đã từ chối yêu cầu ${request.id}`, 'info');
    onAppendAuditLog?.(
      'Từ chối yêu cầu đổi size',
      'Đổi size & Hậu mãi',
      request.id,
      `Đơn hàng ${request.orderId} - Khách ${request.customerName}`,
      'denied',
      note
    );
    setSelectedReturnDetail(null);
    setConfirmReturnAction(null);
    setActionNote('');
  };

  const handleReceiveGoods = async (request: ReturnRequest) => {
    if (!await receiveReturnedGoods(request.id, 'Đã nhận hàng trả')) { showToast('Chưa thể nhận hàng', 'Vui lòng thử lại.', 'error'); return; }
    showToast('Đã nhận hàng trả', `Đã xác nhận nhận hàng trả ${request.id}. Sẵn sàng xuất giao size mới!`, 'success');
    onAppendAuditLog?.(
      'Xác nhận nhận hàng đổi size',
      'Đổi size & Hậu mãi',
      request.id,
      `Đơn hàng ${request.orderId} - Khách ${request.customerName}`
    );
  };

  const handleSendExchange = async () => {
    if (!shippingExchangeRequest || needsReturnRecovery(shippingExchangeRequest)) return;
    try {
      const snapshot = await loadRecovery(shippingExchangeRequest.id);
      if (['awaiting_info', 'disposition_required'].includes(snapshot.recovery.state || '')) {
        showToast('Hồ sơ đang chờ đối soát', 'Hoàn tất thông tin bổ sung trước khi tạo vận đơn.', 'error'); return;
      }
      const result = await ghnService.createExchangeShippingOrder(shippingExchangeRequest.orderId, databaseId(shippingExchangeRequest.id, 'RET-'));
      if (!result.success || !result.orderCode) { showToast('Chưa tạo được vận đơn', result.errorMessage || 'Vui lòng thử lại.', 'error'); return; }
      await refreshReturns();
      const saved = await loadRecovery(shippingExchangeRequest.id);
      if (saved.tracking_code !== result.orderCode) throw new Error('Chưa xác minh được mã vận đơn đã lưu. Vui lòng tải lại hồ sơ.');
      showToast('Đã tạo vận đơn đổi size', `Mã vận đơn GHN: ${result.orderCode}. Chờ bưu tá lấy hàng; chưa trừ tồn kho.`, 'success');
      onAppendAuditLog?.('Tạo vận đơn đổi size GHN', 'Đổi size & Hậu mãi', shippingExchangeRequest.id, `Vận đơn ${result.orderCode} · Chờ lấy hàng`);
      setShippingExchangeRequest(null);
    } catch (e) { showToast('Chưa xác minh được vận đơn', e instanceof Error ? e.message : 'Vui lòng tải lại hồ sơ.', 'error'); }
  };

  // Handlers for Cancellations
  const handleConfirmCancelAction = async () => {
    if (!confirmCancelAction) return;
    const { request, action } = confirmCancelAction;

    if (action === 'approved') {
      if (!await reviewCancellation(request.id, 'approved', cancelActionNote || request.reason)) { showToast('Chưa thể hủy đơn', 'Vui lòng thử lại.', 'error'); return; }
      showToast('Đã chấp thuận hủy đơn', `Đã hủy đơn ${request.orderId} và tự động hoàn trả số lượng vào kho.`, 'success');
      onAppendAuditLog?.(
        'Chấp thuận hủy đơn hàng',
        'Đơn hàng & Hậu mãi',
        request.orderId,
        `Yêu cầu hủy ${request.id} - ${request.customerName}`,
        'success',
        cancelActionNote || request.reason
      );
    } else {
      if (!await reviewCancellation(request.id, 'rejected', cancelActionNote)) { showToast('Chưa thể từ chối', 'Vui lòng thử lại.', 'error'); return; }
      showToast('Đã từ chối yêu cầu', `Đã từ chối yêu cầu hủy đơn ${request.orderId}`, 'info');
      onAppendAuditLog?.(
        'Từ chối yêu cầu hủy đơn hàng',
        'Đơn hàng & Hậu mãi',
        request.orderId,
        `Yêu cầu hủy ${request.id} - ${request.customerName}`,
        'denied',
        cancelActionNote || 'Đơn hàng đang giao, không thể hủy'
      );
    }

    setConfirmCancelAction(null);
    setCancelActionNote('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <ConfirmModal isOpen={!!receiveTarget} title="Xác nhận đã nhận hàng trả" description="Chỉ xác nhận khi đã nhận kiện hàng thực tế. Bước này chưa cộng tồn kho."
        onCancel={() => setReceiveTarget(null)} onConfirm={async () => { if (receiveTarget) await handleReceiveGoods(receiveTarget); setReceiveTarget(null); }} />
      <ConfirmModal isOpen={!!inspection} title="Kiểm định sản phẩm trả về" description="Chọn kết quả cho từng món đã kiểm tra. Chỉ món đủ điều kiện bán lại mới được cộng vào tồn thực tế."
        details={<div className="space-y-3">{inspection?.items?.map(item => <label key={item.returnDetailId} className="block">{item.productName} · {item.quantity} sản phẩm
          <select className="block w-full border rounded p-2" value={inspectionChoices[item.returnDetailId!] === undefined ? '' : String(inspectionChoices[item.returnDetailId!])}
            onChange={e => setInspectionChoices(prev => ({ ...prev, [item.returnDetailId!]: e.target.value === 'true' }))}>
            <option value="" disabled>Chọn kết quả kiểm định</option><option value="true">Đủ điều kiện bán lại</option><option value="false">Không nhập lại hàng bán</option>
          </select></label>)}</div>}
        onCancel={() => setInspection(null)} onConfirm={async () => {
          if (!inspection || !inspection.items?.length || inspection.items.some(i => !i.returnDetailId || inspectionChoices[i.returnDetailId] === undefined)) { showToast('Thiếu kết quả', 'Vui lòng kiểm định từng món.', 'info'); return; }
          if (!await inspectReturn(inspection.id, inspection.items.map(i => ({ id: i.returnDetailId!, resellable: inspectionChoices[i.returnDetailId!], note: 'Đã kiểm định thực tế' })))) { showToast('Chưa lưu được kiểm định', 'Vui lòng thử lại.', 'error'); return; }
          setShippingExchangeRequest(inspection); setInspection(null);
        }} />
      {/* Title & Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-900 flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-[#5C1D24]" />
            <span>Xét Duyệt Hậu Mãi, Đổi Size & Hủy Đơn</span>
          </h1>
        </div>
      </div>

      {/* Sub-tab Section Switcher */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveSection('returns')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSection === 'returns'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Đổi Size & Trả Hàng ({kpiCounts.total})</span>
          {kpiCounts.pending > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-400 text-amber-950 font-black animate-pulse">
              {kpiCounts.pending} chờ duyệt
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('cancellations')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSection === 'cancellations'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200'
          }`}
        >
          <Ban className="w-4 h-4" />
          <span>Yêu Cầu Hủy Đơn ({cancelKpiCounts.total})</span>
          {cancelKpiCounts.pending > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-black animate-pulse">
              {cancelKpiCounts.pending} cần xử lý
            </span>
          )}
        </button>
      </div>

      {/* ===================== SECTION 1: RETURNS ===================== */}
      {activeSection === 'returns' && (
        <div className="space-y-6">
          {/* KPI Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
              <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                Tổng Yêu Cầu
              </div>
              <div className="text-2xl font-black text-charcoal-900 font-mono">
                {kpiCounts.total}
              </div>
              <div className="text-[10px] text-stone-400 mt-0.5">Tất cả hồ sơ đổi trả</div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 shadow-2xs">
              <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Cần Xét Duyệt
              </div>
              <div className="text-2xl font-black text-amber-900 font-mono">
                {kpiCounts.pending}
              </div>
              <div className="text-[10px] text-amber-700 mt-0.5">Yêu cầu đang chờ duyệt</div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 shadow-2xs">
              <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Đang Xử Lý / Đã Duyệt
              </div>
              <div className="text-2xl font-black text-emerald-900 font-mono">
                {kpiCounts.approved}
              </div>
              <div className="text-[10px] text-emerald-700 mt-0.5">Đã duyệt / nhận hàng / giao đổi</div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200/80 shadow-2xs">
              <div className="text-[11px] font-bold text-rose-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                Đã Từ Chối
              </div>
              <div className="text-2xl font-black text-rose-900 font-mono">
                {kpiCounts.rejected}
              </div>
              <div className="text-[10px] text-rose-700 mt-0.5">Không đủ điều kiện</div>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="p-4 bg-white rounded-2xl border border-stone-200/90 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo mã yêu cầu, mã đơn, khách hàng, SĐT..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                />
              </div>

              {/* Type Filter */}
              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <span className="text-[11px] text-stone-400 font-medium">Loại:</span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="text-xs py-1.5 px-3 rounded-xl border border-stone-200 bg-white font-medium text-stone-700 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                >
                  <option value="all">Tất cả loại hậu mãi</option>
                  <option value="exchange_size">Đổi Size Tận Nhà</option>
                  <option value="return_refund">Trả Hàng Hoàn Tiền</option>
                </select>
              </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-stone-100 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-purple-700 text-white shadow-2xs'
                    : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200/70'
                }`}
              >
                Tất cả ({kpiCounts.total})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pending_review')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'pending_review'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200/70'
                }`}
              >
                <span>Chờ duyệt</span>
                {kpiCounts.pending > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === 'pending_review' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`}>
                    {kpiCounts.pending}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('approved')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  statusFilter === 'approved'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200/70'
                }`}
              >
                Đã duyệt
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('received_goods')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  statusFilter === 'received_goods'
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200/70'
                }`}
              >
                Đã nhận hàng cũ
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('exchange_sent')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  statusFilter === 'exchange_sent'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200/70'
                }`}
              >
                Đang giao đổi
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('rejected')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  statusFilter === 'rejected'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200/70'
                }`}
              >
                Đã từ chối ({kpiCounts.rejected})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('completed')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  statusFilter === 'completed'
                    ? 'bg-stone-800 text-white shadow-2xs'
                    : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200/70'
                }`}
              >
                Hoàn tất
              </button>
            </div>
          </div>

          {/* Returns List Table */}
          <div className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px] font-bold">
                  <tr>
                    <th className="p-4 pl-6">MÃ YÊU CẦU</th>
                    <th className="p-4">ĐƠN HÀNG</th>
                    <th className="p-4">KHÁCH HÀNG</th>
                    <th className="p-4">LOẠI HẬU MÃI</th>
                    <th className="p-4">LÝ DO ĐỔI/TRẢ</th>
                    <th className="p-4 text-center">CHI TIẾT</th>
                    <th className="p-4 text-center">TRẠNG THÁI</th>
                    <th className="p-4 pr-6 text-right">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredReturns.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-stone-400">
                        <Package className="w-8 h-8 mx-auto mb-2 text-stone-300" />
                        Không tìm thấy yêu cầu đổi size hoặc hậu mãi nào phù hợp
                      </td>
                    </tr>
                  ) : (
                    filteredReturns.map((r) => (
                      <tr key={r.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="p-4 pl-6 font-mono font-bold text-purple-700">
                          {r.id}
                        </td>
                        <td className="p-4 font-mono font-semibold text-stone-700">
                          {r.orderId}
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-charcoal-900 block">
                            {r.customerName || 'Khách hàng'}
                          </span>
                          <span className="text-[11px] text-stone-400 font-mono block mt-0.5">
                            {r.customerPhone || '098...'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            r.type === 'exchange_size'
                              ? 'bg-purple-50 text-purple-800 border border-purple-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}>
                            <RotateCcw className="w-3 h-3" />
                            <span>{r.type === 'exchange_size' ? 'Đổi Size Tận Nhà' : 'Trả Hàng Hoàn Tiền'}</span>
                          </span>
                        </td>
                        <td className="p-4 text-stone-600 max-w-xs">
                          <p className="truncate font-medium">{r.reasonDetail || RETURN_REASON_LABELS[r.reason] || r.reason}</p>
                          {r.requestedSize && (
                            <span className="text-[10px] text-purple-700 font-semibold block mt-0.5">
                              Đổi sang: Size {r.requestedSize}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedReturnDetail(r)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs border border-purple-200 transition-colors cursor-pointer shadow-2xs active:scale-95"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Xem chi tiết</span>
                          </button>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center justify-center whitespace-nowrap px-3 py-1 rounded-full text-[11px] font-bold ${
                            r.newTrackingCode
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : r.status === 'pending_review'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : r.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : r.status === 'received_goods'
                              ? 'bg-sky-100 text-sky-800 border border-sky-200'
                              : r.status === 'exchange_sent'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : r.status === 'rejected'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-stone-100 text-stone-800 border border-stone-200'
                          }`}>
                            {r.newTrackingCode
                              ? 'Đã tạo vận đơn'
                              : r.status === 'pending_review'
                              ? 'Chờ duyệt'
                              : r.status === 'approved'
                              ? 'Đã duyệt'
                              : r.status === 'received_goods'
                              ? 'Đã nhận hàng cũ'
                              : r.status === 'exchange_sent'
                              ? 'Đang giao đổi'
                              : r.status === 'rejected'
                              ? 'Đã từ chối'
                              : 'Hoàn tất'}
                          </span>
                        </td>
                        <td className="p-4 pr-6 text-right">
                          {needsReturnRecovery(r) && ['pending_review', 'approved', 'received_goods'].includes(r.status) && (
                            <button
                              type="button"
                              onClick={() => openRecovery(r)}
                              className="block ml-auto mb-1.5 px-2.5 py-1 text-xs font-bold text-[#5C1D24] bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                            >
                              Yêu cầu khách bổ sung
                            </button>
                          )}
                          {needsReturnRecovery(r) && ['pending_review', 'approved', 'received_goods'].includes(r.status) ? (
                            <span className="block text-[11px] text-amber-800 font-semibold">Chờ xác minh sản phẩm và size</span>
                          ) : r.status === 'pending_review' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setActionNote('');
                                  setConfirmReturnAction({ request: r, action: 'approved' });
                                }}
                                className="px-3 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                              >
                                Duyệt
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActionNote('');
                                  setConfirmReturnAction({ request: r, action: 'rejected' });
                                }}
                                className="px-3 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                              >
                                Từ chối
                              </button>
                            </div>
                          ) : r.status === 'approved' ? (
                            <button
                              type="button"
                              onClick={() => setReceiveTarget(r)}
                              className="px-2.5 py-1 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                            >
                              Nhận hàng cũ
                            </button>
                          ) : r.status === 'received_goods' ? (
                            r.newTrackingCode ? (
                              <div className="text-right inline-block">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 rounded-lg font-mono shadow-2xs">
                                  <Truck className="w-3 h-3" />
                                  <span>{r.newTrackingCode}</span>
                                </span>
                                <span className="block text-[10px] text-purple-600 mt-0.5">Chờ bưu tá lấy hàng</span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  if (needsReturnRecovery(r)) { void openRecovery(r); return; }
                                  if (r.type !== 'exchange_size') { showToast('Hồ sơ trả hàng', 'Cần đối soát phương án hoàn tiền, không tạo kiện đổi size.', 'info'); void openRecovery(r); return; }
                                  if (r.items?.some(i => !i.inspected)) {
                                    setInspection(r);
                                    setInspectionChoices({});
                                  } else {
                                    setShippingExchangeRequest(r);
                                  }
                                }}
                                className="px-2.5 py-1 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors cursor-pointer shadow-2xs flex items-center gap-1 ml-auto"
                              >
                                <Truck className="w-3 h-3" />
                                <span>Giao size mới</span>
                              </button>
                            )
                          ) : (
                            <span className="text-[11px] font-bold text-stone-500">
                              {r.status === 'exchange_sent' ? '✓ Đang giao đổi 3PL' : r.status === 'rejected' ? '✕ Đã từ chối' : '✓ Hoàn tất'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== SECTION 2: CANCELLATIONS ===================== */}
      {activeSection === 'cancellations' && (
        <div className="space-y-6">
          {/* KPI Stats Cards for Cancellations */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
              <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                Tổng Yêu Cầu Hủy
              </div>
              <div className="text-2xl font-black text-charcoal-900 font-mono">
                {cancelKpiCounts.total}
              </div>
              <div className="text-[10px] text-stone-400 mt-0.5">Tất cả đơn đề nghị hủy</div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 shadow-2xs">
              <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Cần Xét Duyệt
              </div>
              <div className="text-2xl font-black text-amber-900 font-mono">
                {cancelKpiCounts.pending}
              </div>
              <div className="text-[10px] text-amber-700 mt-0.5">Đơn hàng chờ Manager duyệt</div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 shadow-2xs">
              <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Đã Chấp Thuận
              </div>
              <div className="text-2xl font-black text-emerald-900 font-mono">
                {cancelKpiCounts.approved}
              </div>
              <div className="text-[10px] text-emerald-700 mt-0.5">Đã hủy & hoàn lại kho</div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200/80 shadow-2xs">
              <div className="text-[11px] font-bold text-rose-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                Đã Bác Bỏ
              </div>
              <div className="text-2xl font-black text-rose-900 font-mono">
                {cancelKpiCounts.rejected}
              </div>
              <div className="text-[10px] text-rose-700 mt-0.5">Từ chối (đang vận chuyển)</div>
            </div>
          </div>

          {/* Filter and Search Bar for Cancellations */}
          <div className="p-4 bg-white rounded-2xl border border-stone-200/90 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={cancelSearchQuery}
                  onChange={(e) => setCancelSearchQuery(e.target.value)}
                  placeholder="Tìm theo mã yêu cầu, mã đơn, khách hàng, lý do..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setCancelStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    cancelStatusFilter === 'all'
                      ? 'bg-purple-700 text-white shadow-2xs'
                      : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200/70'
                  }`}
                >
                  Tất cả ({cancelKpiCounts.total})
                </button>
                <button
                  type="button"
                  onClick={() => setCancelStatusFilter('pending_review')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    cancelStatusFilter === 'pending_review'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200/70'
                  }`}
                >
                  <span>Chờ duyệt</span>
                  {cancelKpiCounts.pending > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${cancelStatusFilter === 'pending_review' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`}>
                      {cancelKpiCounts.pending}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setCancelStatusFilter('approved')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    cancelStatusFilter === 'approved'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200/70'
                  }`}
                >
                  Đã chấp thuận ({cancelKpiCounts.approved})
                </button>
                <button
                  type="button"
                  onClick={() => setCancelStatusFilter('rejected')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    cancelStatusFilter === 'rejected'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200/70'
                  }`}
                >
                  Đã từ chối ({cancelKpiCounts.rejected})
                </button>
              </div>
            </div>
          </div>

          {/* Cancellation Requests Table */}
          <div className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px] font-bold">
                  <tr>
                    <th className="p-4 pl-6">MÃ YÊU CẦU</th>
                    <th className="p-4">ĐƠN HÀNG</th>
                    <th className="p-4">KHÁCH HÀNG</th>
                    <th className="p-4">LÝ DO HỦY ĐƠN</th>
                    <th className="p-4">THỜI GIAN</th>
                    <th className="p-4 text-center">TRẠNG THÁI</th>
                    <th className="p-4 pr-6 text-right">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredCancellations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-stone-400">
                        <Ban className="w-8 h-8 mx-auto mb-2 text-stone-300" />
                        Không có yêu cầu hủy đơn hàng nào phù hợp
                      </td>
                    </tr>
                  ) : (
                    filteredCancellations.map((c) => (
                      <tr key={c.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="p-4 pl-6 font-mono font-bold text-rose-700">
                          {c.id}
                        </td>
                        <td className="p-4 font-mono font-bold text-charcoal-900">
                          {c.orderId}
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-charcoal-900 block">
                            {c.customerName || 'Khách hàng'}
                          </span>
                        </td>
                        <td className="p-4 text-stone-700 max-w-sm">
                          <p className="font-medium">{c.reason}</p>
                          {c.adminNote && (
                            <span className="text-[11px] text-stone-500 block mt-1 italic">
                              Phản hồi: {c.adminNote}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-stone-500 font-mono text-[11px]">
                          {c.createdAt}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center justify-center whitespace-nowrap px-3 py-1 rounded-full text-[11px] font-bold ${
                            c.status === 'pending_review'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : c.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}>
                            {c.status === 'pending_review' ? 'Chờ duyệt' : c.status === 'approved' ? 'Đã chấp thuận' : 'Đã từ chối'}
                          </span>
                        </td>
                        <td className="p-4 pr-6 text-right">
                          {c.status === 'pending_review' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setCancelActionNote('');
                                  setConfirmCancelAction({ request: c, action: 'approved' });
                                }}
                                className="px-3 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                              >
                                Chấp thuận hủy
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCancelActionNote('');
                                  setConfirmCancelAction({ request: c, action: 'rejected' });
                                }}
                                className="px-3 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                              >
                                Từ chối
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] font-bold text-stone-500">
                              {c.status === 'approved' ? '✓ Đã hủy đơn & trả kho' : '✕ Đã từ chối'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Return Detail Modal */}
      <ReturnDetailModal
        isOpen={Boolean(selectedReturnDetail)}
        request={selectedReturnDetail}
        onClose={() => setSelectedReturnDetail(null)}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      <ConfirmModal isOpen={!!shippingExchangeRequest} title="Tạo vận đơn đổi size GHN" variant="warning"
        description="Tạo vận đơn thật từ địa chỉ đơn gốc và sản phẩm đã kiểm định. Tồn kho chỉ được trừ khi hãng vận chuyển xác nhận đã lấy hàng."
        details={<div className="space-y-2">{shippingExchangeRequest?.items?.map(item => <p key={item.returnDetailId}>{item.productName} · {item.quantity} sản phẩm · Size {item.requestedSize || 'Chưa xác nhận'}</p>)}
          {shippingExchangeRequest?.newTrackingCode && <p>Vận đơn đã ghi nhận: {shippingExchangeRequest.newTrackingCode}. Thao tác sẽ đối soát, không tạo trùng.</p>}</div>}
        confirmText="Tạo vận đơn GHN" onCancel={() => setShippingExchangeRequest(null)} onConfirm={handleSendExchange} />
      {recoveryTarget && <ReturnRecoveryEditor snapshot={recoveryTarget.snapshot} returnId={recoveryTarget.request.id} onClose={() => setRecoveryTarget(null)} onSave={async (input, key) => {
        await saveRecovery(recoveryTarget.request.id, input, key);
        showToast('Đã lưu hồ sơ', input.action === 'request_info' ? 'Khách có thể xem và bổ sung lựa chọn trong tài khoản.' : 'Thông tin đã được lưu và đọc lại từ hồ sơ.', 'success');
        onAppendAuditLog?.('Đối soát hồ sơ đổi trả', 'Đổi size & Hậu mãi', recoveryTarget.request.id, input.note);
              }} />}

      {/* Fast Confirm Modal for Returns */}
      {confirmReturnAction && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-md animate-fadeIn"
          onClick={() => setConfirmReturnAction(null)}
        >
          <div 
            className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-stone-200 animate-scaleIn space-y-4 my-auto overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
                  confirmReturnAction.action === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {confirmReturnAction.action === 'approved' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-charcoal-900">
                    {confirmReturnAction.action === 'approved' ? 'Xác Nhận Phê Duyệt Đổi Size' : 'Xác Nhận Từ Chối Đổi/Trả'}
                  </h3>
                  <p className="text-[11px] text-stone-500 font-mono">
                    Mã yêu cầu: {confirmReturnAction.request.id} ({confirmReturnAction.request.orderId})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmReturnAction(null)}
                className="text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-stone-600 space-y-2">
              <p>
                Khách hàng <strong>{confirmReturnAction.request.customerName}</strong> ({confirmReturnAction.request.customerPhone}) yêu cầu đổi sang size <strong>{confirmReturnAction.request.requestedSize || 'N/A'}</strong>.
              </p>
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Ghi chú xử lý / Phản hồi cho khách hàng:
                </label>
                <input
                  type="text"
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder={
                    confirmReturnAction.action === 'approved'
                      ? 'Chuyên viên đã duyệt đổi size...'
                      : 'Lý do từ chối...'
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="flex gap-2.5 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setConfirmReturnAction(null)}
                className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmReturnAction.action === 'approved') {
                    handleApprove(confirmReturnAction.request, actionNote);
                  } else {
                    handleReject(confirmReturnAction.request, actionNote);
                  }
                }}
                className={`flex-1 py-2.5 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer ${
                  confirmReturnAction.action === 'approved'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {confirmReturnAction.action === 'approved' ? 'Xác nhận duyệt' : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Cancellation Action */}
      {confirmCancelAction && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-md animate-fadeIn"
          onClick={() => setConfirmCancelAction(null)}
        >
          <div 
            className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-stone-200 animate-scaleIn space-y-4 my-auto overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
                  confirmCancelAction.action === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {confirmCancelAction.action === 'approved' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-charcoal-900">
                    {confirmCancelAction.action === 'approved' ? 'Xác Nhận Chấp Thuận Hủy Đơn' : 'Xác Nhận Từ Chối Yêu Cầu Hủy'}
                  </h3>
                  <p className="text-[11px] text-stone-500 font-mono">
                    Mã đơn: <strong>{confirmCancelAction.request.orderId}</strong> ({confirmCancelAction.request.id})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmCancelAction(null)}
                className="text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-stone-600 space-y-2">
              <p>
                Khách hàng: <strong>{confirmCancelAction.request.customerName}</strong>
              </p>
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                <span className="text-[11px] font-bold text-stone-600 block mb-0.5">Lý do khách hàng yêu cầu hủy:</span>
                <p className="font-medium text-charcoal-800">{confirmCancelAction.request.reason}</p>
              </div>

              {confirmCancelAction.action === 'approved' ? (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Hệ thống sẽ tự động chuyển đơn sang <strong>ĐÃ HỦY</strong> và <strong>hoàn trả lại toàn bộ số lượng tồn kho</strong> vào dữ liệu cửa hàng.
                  </span>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 text-[11px] flex items-start gap-2">
                  <Clock className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <span>
                    Khi từ chối hủy, đơn hàng sẽ được <strong>tiếp tục giao bình thường</strong> và trạng thái của khách sẽ được cập nhật minh bạch.
                  </span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Ghi chú phản hồi cho khách hàng:
                </label>
                <input
                  type="text"
                  value={cancelActionNote}
                  onChange={(e) => setCancelActionNote(e.target.value)}
                  placeholder={
                    confirmCancelAction.action === 'approved'
                      ? 'Quản lý đã duyệt chấp thuận hủy đơn...'
                      : 'Đơn hàng đang đóng gói/giao, từ chối hủy...'
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="flex gap-2.5 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setConfirmCancelAction(null)}
                className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelAction}
                className={`flex-1 py-2.5 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer ${
                  confirmCancelAction.action === 'approved'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {confirmCancelAction.action === 'approved' ? 'Xác nhận duyệt hủy' : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
