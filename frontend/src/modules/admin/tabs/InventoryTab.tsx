import React, { useState, useRef, useEffect } from 'react';
import {
  Package,
  AlertTriangle,
  AlertCircle,
  Search,
  X,
  CheckCircle2,
  Check,
  Plus,
  ClipboardCheck
} from 'lucide-react';
import { StockItem } from '@/shared/types';
import { useToast } from '@/shared/context/ToastContext';
import { useAuth } from '@/modules/user/context/AuthContext';
import { useInventory } from '@/modules/inventory/context/InventoryContext';

export type InventoryStatusFilter = 'all' | 'safe' | 'low_stock' | 'out_of_stock';

interface InventoryTabProps {
  inventory: StockItem[];
  restock?: (sku: string, quantity: number, reason?: string) => void;
  adjustStock?: (sku: string, actualQty: number, reason: string, performer?: string, expectedQty?: number) => Promise<boolean>;
  onAppendAuditLog: (action: string, category: string, targetCode: string, targetDesc: string) => void;
  initialStatusFilter?: InventoryStatusFilter;
  initialSkuSearch?: string;
  initialSubTab?: string;
  initialAlertScope?: string;
}

export const InventoryTab: React.FC<InventoryTabProps> = ({
  inventory,
  restock: _restock,
  adjustStock,
  onAppendAuditLog,
  initialStatusFilter,
  initialSkuSearch = '',
  initialSubTab,
}) => {
  const { showToast } = useToast();
  const { currentUser } = useAuth();
  const inventoryContext = useInventory();
  const handleAdjustStock = adjustStock || inventoryContext.adjustStock;

  const [statusFilter, setStatusFilter] = useState<InventoryStatusFilter>(
    initialStatusFilter || (initialSubTab === 'alerts' ? 'low_stock' : 'all')
  );
  const [skuSearch, setSkuSearch] = useState(initialSkuSearch);
  const [invSizeFilter, setInvSizeFilter] = useState('all');

  // Kiểm kê & Nhập kho modal state
  const [auditModalItem, setAuditModalItem] = useState<StockItem | null>(null);
  const [modalMode, setModalMode] = useState<'restock' | 'audit'>('audit');
  const [addQty, setAddQty] = useState<string>('');
  const [actualQty, setActualQty] = useState<string | number>(0);
  const [auditReason, setAuditReason] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [isSubmittingAudit, setIsSubmittingAudit] = useState(false);
  const auditLock = useRef(false);

  useEffect(() => {
    if (!auditModalItem) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmittingAudit) setAuditModalItem(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [auditModalItem, isSubmittingAudit]);

  // Inventory 3-tier status buckets
  const safeItems = inventory.filter((item) => item.quantity > item.lowStockThreshold);
  const lowStockItems = inventory.filter((item) => item.quantity > 0 && item.quantity <= item.lowStockThreshold);
  const outOfStockItems = inventory.filter((item) => item.quantity === 0);

  // Filter inventory
  const displayedInventory = inventory
    .filter((item) => {
      // 1. Status Filter (from 3 cards)
      if (statusFilter === 'safe') {
        if (item.quantity <= item.lowStockThreshold) return false;
      } else if (statusFilter === 'low_stock') {
        if (item.quantity === 0 || item.quantity > item.lowStockThreshold) return false;
      } else if (statusFilter === 'out_of_stock') {
        if (item.quantity !== 0) return false;
      }

      // 2. Search keyword
      if (skuSearch.trim()) {
        const q = skuSearch.toLowerCase().trim();
        const matchSku = item.sku.toLowerCase().includes(q);
        const matchName = item.productName.toLowerCase().includes(q);
        if (!matchSku && !matchName) return false;
      }

      // 3. Size filter
      if (invSizeFilter !== 'all' && item.size !== invSizeFilter) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (statusFilter === 'low_stock' || statusFilter === 'out_of_stock') {
        return a.quantity - b.quantity;
      }
      return 0;
    });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-[#5C1D24]" />
            Quản Lý Kiểm Kê & Tồn Kho Hàng Hóa
          </h1>
        </div>
        {/* Stats Summary Badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3 py-1.5 bg-stone-100 rounded-xl text-xs font-semibold text-charcoal-700">
            Tổng số mã hàng: <strong className="text-charcoal-900">{inventory.length}</strong>
          </div>
        </div>
      </div>

      {/* 3 Status Pipeline Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* 1. An toàn */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'safe' ? 'all' : 'safe')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'safe'
              ? 'bg-emerald-900 text-white border-emerald-900 shadow-sm ring-2 ring-emerald-900/20'
              : 'bg-white hover:bg-emerald-50/50 text-stone-700 border-stone-200/90 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider ${
                statusFilter === 'safe' ? 'text-emerald-200' : 'text-emerald-700'
              } opacity-90`}
            >
              1. AN TOÀN
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                statusFilter === 'safe' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {safeItems.length}
            </span>
          </div>
          <strong className="text-lg font-bold block">{safeItems.length} mã</strong>
          <span className="text-[10px] block opacity-80 truncate mt-0.5">
            Tồn kho ổn định, trên ngưỡng tối thiểu
          </span>
        </button>

        {/* 2. Sắp hết hàng */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'low_stock' ? 'all' : 'low_stock')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'low_stock'
              ? 'bg-amber-800 text-white border-amber-800 shadow-sm ring-2 ring-amber-800/20'
              : 'bg-white hover:bg-amber-50/50 text-stone-700 border-stone-200/90 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider ${
                statusFilter === 'low_stock' ? 'text-amber-200' : 'text-amber-700'
              } opacity-90`}
            >
              2. SẮP HẾT HÀNG
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                statusFilter === 'low_stock' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {lowStockItems.length}
            </span>
          </div>
          <strong className="text-lg font-bold block">{lowStockItems.length} mã</strong>
          <span className="text-[10px] block opacity-80 truncate mt-0.5">
            ≤ Ngưỡng cảnh báo, cần dự trù
          </span>
        </button>

        {/* 3. Cần nhập gấp */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'out_of_stock' ? 'all' : 'out_of_stock')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'out_of_stock'
              ? 'bg-rose-900 text-white border-rose-900 shadow-sm ring-2 ring-rose-900/20'
              : 'bg-white hover:bg-rose-50/50 text-stone-700 border-stone-200/90 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider ${
                statusFilter === 'out_of_stock' ? 'text-rose-200' : 'text-rose-700'
              } opacity-90`}
            >
              3. CẦN NHẬP GẤP
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                statusFilter === 'out_of_stock' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'
              }`}
            >
              {outOfStockItems.length}
            </span>
          </div>
          <strong className="text-lg font-bold block">{outOfStockItems.length} mã</strong>
          <span className="text-[10px] block opacity-80 truncate mt-0.5">
            Đã cạn kho (0 cái), ưu tiên bổ sung ngay
          </span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-stone-200/90 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={skuSearch}
            onChange={(e) => setSkuSearch(e.target.value)}
            placeholder="Tìm theo mã SKU, tên sản phẩm..."
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:border-[#5C1D24] font-medium"
          />
          {skuSearch && (
            <button
              type="button"
              onClick={() => setSkuSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-stone-400 text-[11px] font-medium">Lọc kích cỡ:</span>
            <select
              value={invSizeFilter}
              onChange={(e) => setInvSizeFilter(e.target.value)}
              aria-label="Lọc theo kích cỡ"
              className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-stone-200 bg-stone-50 text-charcoal-800 focus:outline-hidden cursor-pointer"
            >
              <option value="all">Tất cả kích cỡ (XL-5XL)</option>
              <option value="XL">Cỡ XL</option>
              <option value="2XL">Cỡ 2XL</option>
              <option value="3XL">Cỡ 3XL</option>
              <option value="4XL">Cỡ 4XL</option>
              <option value="5XL">Cỡ 5XL</option>
            </select>
          </div>

          {(statusFilter !== 'all' || skuSearch || invSizeFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all');
                setSkuSearch('');
                setInvSizeFilter('all');
              }}
              className="px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
            >
              Xóa lọc
            </button>
          )}
        </div>
      </div>

      {/* SKU Table */}
      <div className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden shadow-2xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="p-4">MÃ SKU</th>
              <th className="p-4">SẢN PHẨM & KÍCH CỠ</th>
              <th className="p-4">TỒN KHO HIỆN TẠI</th>
              <th className="p-4">TÌNH TRẠNG</th>
              <th className="p-4 text-right">THAO TÁC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {displayedInventory.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-10 text-center text-stone-500">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                  <p className="font-bold text-sm text-charcoal-800">Không có sản phẩm nào thỏa mãn điều kiện</p>
                  <p className="text-xs text-stone-400 mt-1">
                    Vui lòng thử đổi từ khóa tìm kiếm hoặc chọn bộ lọc trạng thái / kích cỡ khác.
                  </p>
                </td>
              </tr>
            ) : (
              displayedInventory.map((inv) => {
                const isOutOfStock = inv.quantity === 0;
                const isCritical = inv.quantity <= inv.lowStockThreshold;

                return (
                  <tr key={inv.sku} className="hover:bg-stone-50/60 transition-colors">
                    <td className="p-4 font-mono font-bold text-charcoal-800">{inv.sku}</td>
                    <td className="p-4">
                      <span className="font-bold text-charcoal-900 block leading-snug">{inv.productName}</span>
                      <div className="flex items-center gap-2 mt-1 text-[11px]">
                        <span className="px-1.5 py-0.5 bg-stone-100 border border-stone-200/80 rounded-md font-bold text-charcoal-800">
                          Size {inv.size}
                        </span>
                        <span className="text-stone-400">•</span>
                        <span className="text-stone-600 font-medium">Màu: {inv.color}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`font-bold text-sm ${
                          isOutOfStock
                            ? 'text-rose-600'
                            : isCritical
                              ? 'text-amber-600'
                              : 'text-emerald-700'
                        }`}
                      >
                        {inv.quantity}{' '}
                        <span className="text-xs font-normal text-stone-500">sản phẩm</span>
                      </span>
                    </td>
                    <td className="p-4">
                      {isOutOfStock ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
                          Cần nhập gấp (0 cái)
                        </span>
                      ) : isCritical ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 border border-amber-200 text-amber-700">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          Sắp hết hàng ({inv.quantity} cái)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
                          <Check className="w-3 h-3 text-emerald-600" />
                          An toàn
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setAuditModalItem(inv);
                            setModalMode('restock');
                            setAddQty('');
                            setActualQty(inv.quantity);
                            setAuditReason('Nhập bổ sung hàng mới vào kho');
                            setFormError('');
                          }}
                          className="px-2.5 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                          title={`Nhập thêm hàng cho mã ${inv.sku}`}
                        >
                          <Plus className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Nhập hàng</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAuditModalItem(inv);
                            setModalMode('audit');
                            setAddQty('');
                            setActualQty(inv.quantity);
                            setAuditReason('');
                            setFormError('');
                          }}
                          className="px-2.5 py-1.5 text-xs font-bold text-[#5C1D24] bg-[#5C1D24]/10 hover:bg-[#5C1D24]/20 rounded-xl transition-colors shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                          title={`Kiểm kê đối chiếu số lượng thực tế mã ${inv.sku}`}
                        >
                          <ClipboardCheck className="w-3.5 h-3.5 text-[#5C1D24]" />
                          <span>Kiểm kê</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {displayedInventory.length > 0 && (
          <div className="p-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-[11px] text-stone-500">
            <span>
              Đang hiển thị <strong>{displayedInventory.length}</strong> / {inventory.length} mã hàng
            </span>
            <span className="italic">
              Tự động làm mới khi kiểm kê điều chỉnh hoặc xuất hàng
            </span>
          </div>
        )}
      </div>

      {/* MODAL: NHẬP THÊM HÀNG & KIỂM KÊ TỒN KHO */}
      {auditModalItem && (() => {
        const currentQty = auditModalItem.quantity;
        const heldQty = auditModalItem.heldQuantity || 0;
        const parsedAdd = /^\d+$/.test(addQty.trim()) ? parseInt(addQty.trim(), 10) : 0;
        const restockNewTotal = currentQty + parsedAdd;
        const parsedActual = actualQty === '' ? 0 : Number(actualQty);
        const diff = parsedActual - currentQty;

        const handleConfirmAudit = async (e: React.FormEvent) => {
          e.preventDefault();
          const reasonTrimmed = auditReason.trim();
          const performer = currentUser?.name || 'Văn Hoàng Nguyễn';

          if (modalMode === 'restock') {
            const addStr = addQty.trim();
            if (!/^\d+$/.test(addStr)) {
              setFormError('Vui lòng nhập số lượng nhập thêm là số nguyên dương (ví dụ: 10, 20)!');
              return;
            }
            const addNum = parseInt(addStr, 10);
            if (!Number.isSafeInteger(addNum) || addNum <= 0) {
              setFormError('Số lượng nhập thêm phải lớn hơn 0!');
              return;
            }
            const newTotal = currentQty + addNum;
            const finalReason = reasonTrimmed
              ? `[Nhập thêm +${addNum}] ${reasonTrimmed}`
              : `[Nhập thêm +${addNum}] Nhập bổ sung hàng mới vào kho`;

            if (auditLock.current) return;
            auditLock.current = true;
            setIsSubmittingAudit(true);
            try {
              const success = await handleAdjustStock(auditModalItem.sku, newTotal, finalReason, performer, currentQty);
              if (success !== true) {
                setFormError('Chưa xác nhận được phiếu nhập kho. Vui lòng kiểm tra kết nối và thử lại.');
                return;
              }
              onAppendAuditLog(
                'Nhập thêm hàng vào kho',
                'Kho & Tồn kho',
                auditModalItem.sku,
                `Nhập thêm +${addNum} sản phẩm cho mã ${auditModalItem.sku} (${auditModalItem.productName} - Màu ${auditModalItem.color} - Cỡ ${auditModalItem.size}): Tồn kho từ ${currentQty} -> ${newTotal} cái. Ghi chú: ${reasonTrimmed || 'Nhập bổ sung'}`
              );
              showToast(
                'Nhập kho thành công',
                `Đã cộng thêm +${addNum} sản phẩm cho mã ${auditModalItem.sku}. Tồn kho mới: ${newTotal} cái.`,
                'success'
              );
              setAuditModalItem(null);
            } catch {
              setFormError('Chưa xác nhận được phiếu nhập kho. Vui lòng kiểm tra kết nối và thử lại.');
            } finally {
              auditLock.current = false;
              setIsSubmittingAudit(false);
            }
            return;
          }

          // Mode === 'audit' (Kiểm kê đối chiếu thực tế)
          const qtyStr = String(actualQty).trim();
          if (!/^\d+$/.test(qtyStr)) {
            setFormError('Số lượng kiểm kê phải là số nguyên không âm (ví dụ: 0, 10, 45)!');
            return;
          }
          const parsedActualNum = parseInt(qtyStr, 10);
          const auditDiff = parsedActualNum - currentQty;

          if (heldQty && parsedActualNum < heldQty) {
            setFormError(`Số lượng kiểm kê (${parsedActualNum} cái) không thể nhỏ hơn số lượng đang giữ chỗ cho đơn hàng (${heldQty} cái)!`);
            return;
          }

          if (auditDiff !== 0 && !reasonTrimmed) {
            setFormError('Vui lòng nhập lý do điều chỉnh khi số lượng thực tế có chênh lệch!');
            return;
          }

          if (auditLock.current) return;
          auditLock.current = true;
          setIsSubmittingAudit(true);
          try {
            const success = await handleAdjustStock(
              auditModalItem.sku,
              parsedActualNum,
              reasonTrimmed ? `[Kiểm kê] ${reasonTrimmed}` : '[Kiểm kê] Đối chiếu khớp sổ sách',
              performer,
              currentQty
            );
            if (success !== true) {
              setFormError('Chưa xác nhận được kiểm kê. Vui lòng tải lại tồn kho, kiểm tra kết nối và thử lại.');
              return;
            }
            if (auditDiff !== 0) {
              onAppendAuditLog(
                'Kiểm kê & Điều chỉnh tồn kho',
                'Kho & Tồn kho',
                auditModalItem.sku,
                `Kiểm kê mã ${auditModalItem.sku} (${auditModalItem.productName} - Cỡ ${auditModalItem.size}): Trước ${currentQty} -> Sau ${parsedActualNum} (Chênh lệch: ${auditDiff > 0 ? '+' : ''}${auditDiff} cái). Lý do: ${reasonTrimmed}`
              );

              showToast(
                'Kiểm kê thành công',
                `Đã điều chỉnh tồn kho mã ${auditModalItem.sku} thành ${parsedActualNum} sản phẩm (${auditDiff > 0 ? '+' : ''}${auditDiff} cái)`,
                'success'
              );
            } else {
              onAppendAuditLog(
                'Kiểm kê tồn kho',
                'Kho & Tồn kho',
                auditModalItem.sku,
                `Kiểm kê mã ${auditModalItem.sku} (${auditModalItem.productName} - Cỡ ${auditModalItem.size}): Khớp 100% với hệ thống (${parsedActualNum} cái).${reasonTrimmed ? ` Ghi chú: ${reasonTrimmed}` : ''}`
              );

              showToast(
                'Kiểm kê hoàn tất',
                `Số lượng tồn kho mã ${auditModalItem.sku} khớp 100% với hệ thống (${parsedActualNum} sản phẩm)`,
                'success'
              );
            }

            setAuditModalItem(null);
          } catch {
            setFormError('Chưa xác nhận được kiểm kê. Vui lòng kiểm tra kết nối và thử lại.');
          } finally {
            auditLock.current = false;
            setIsSubmittingAudit(false);
          }
        };

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-900/45 animate-fadeIn"
            onClick={() => { if (!isSubmittingAudit) setAuditModalItem(null); }}
          >
            <div
              className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-stone-200 my-auto animate-scaleIn text-left"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-bold text-base text-charcoal-900 flex items-center gap-2">
                    {modalMode === 'restock' ? (
                      <>
                        <Plus className="w-5 h-5 text-emerald-700" />
                        <span>Nhập Thêm Hàng Vào Kho</span>
                      </>
                    ) : (
                      <>
                        <ClipboardCheck className="w-5 h-5 text-[#5C1D24]" />
                        <span>Kiểm Kê & Điều Chỉnh Thực Tế</span>
                      </>
                    )}
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {modalMode === 'restock'
                      ? 'Cộng thêm số lượng hàng mới nhập vào tồn kho hiện tại'
                      : 'Đối chiếu số đếm thực tế tại kho để điều chỉnh tồn kho (không tự cộng dồn)'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAuditModalItem(null)}
                  className="w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
                  title="Đóng popup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Chuyển đổi rõ 2 nghiệp vụ: Nhập thêm hàng vs Kiểm kê thực tế */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-100 rounded-xl mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setModalMode('restock');
                    setFormError('');
                    if (!auditReason) setAuditReason('Nhập bổ sung hàng mới vào kho');
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    modalMode === 'restock'
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'text-stone-600 hover:text-charcoal-900'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nhập thêm hàng (+ Cộng)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalMode('audit');
                    setActualQty(auditModalItem.quantity);
                    setFormError('');
                    if (auditReason === 'Nhập bổ sung hàng mới vào kho') setAuditReason('');
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    modalMode === 'audit'
                      ? 'bg-[#5C1D24] text-white shadow-2xs'
                      : 'text-stone-600 hover:text-charcoal-900'
                  }`}
                >
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  <span>Kiểm kê thực tế (= Đối chiếu)</span>
                </button>
              </div>

              {/* Thông tin nhận diện sản phẩm: Mã SKU, Tên, Size, Màu, Tồn hiện tại */}
              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/90 mb-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">Sản phẩm</span>
                    <h4 className="font-bold text-xs text-charcoal-900 leading-snug truncate" title={auditModalItem.productName}>
                      {auditModalItem.productName}
                    </h4>
                  </div>
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-white border border-stone-200 rounded-md text-charcoal-700 shrink-0">
                    {auditModalItem.sku}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-200/60 text-xs">
                  <div>
                    <span className="text-stone-400 text-[10px] block">Kích cỡ:</span>
                    <span className="font-bold text-charcoal-800 bg-white px-2 py-0.5 rounded border border-stone-200/80 inline-block mt-0.5">
                      {auditModalItem.size}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-400 text-[10px] block">Màu sắc:</span>
                    <span className="font-medium text-stone-700 block truncate mt-0.5">
                      {auditModalItem.color}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-stone-400 text-[10px] block">Tồn hiện tại:</span>
                    <span className="font-bold text-sm text-[#5C1D24] block mt-0.5">
                      {auditModalItem.quantity} <span className="text-[10px] font-normal text-stone-500">cái</span>
                    </span>
                  </div>
                </div>
                {heldQty > 0 && (
                  <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200/80 rounded-lg px-2.5 py-1 flex items-center justify-between">
                    <span>Đang giữ cho đơn chờ giao (Reserved): <strong>{heldQty} cái</strong></span>
                    <span>Có thể bán: <strong>{Math.max(0, currentQty - heldQty)} cái</strong></span>
                  </div>
                )}
              </div>

              <form onSubmit={handleConfirmAudit} className="space-y-4">
                {modalMode === 'restock' ? (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-charcoal-800 mb-1.5">
                        Số lượng nhập thêm vào kho <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        required
                        value={addQty}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val.includes('.') || val.includes(',')) {
                            setFormError('Số lượng nhập thêm phải là số nguyên dương.');
                          } else {
                            setFormError('');
                          }
                          setAddQty(val.replace(/[^\d]/g, ''));
                        }}
                        placeholder="Ví dụ: 10"
                        className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-base font-bold bg-white text-charcoal-900 focus:outline-hidden focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/20 transition-all font-mono"
                      />
                      <p className="text-[11px] text-stone-400 mt-1">
                        Ví dụ: Tồn hiện tại {currentQty} cái, nhập thêm 10 cái → Tồn kho mới sẽ là {currentQty + 10} cái.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl border bg-emerald-50/80 border-emerald-200 text-emerald-900 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold block">
                          Tồn kho mới sau khi nhập: {restockNewTotal} cái
                        </span>
                        <span className="text-[11px] opacity-80 block">
                          Tồn hiện tại ({currentQty}) + Nhập thêm ({parsedAdd}) = {restockNewTotal} sản phẩm
                        </span>
                      </div>
                      <span className="font-mono font-bold text-sm px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800">
                        +{parsedAdd} → {restockNewTotal}
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-charcoal-800 mb-1.5">
                        Ghi chú lô nhập hàng <span className="text-stone-400 font-normal">(Tùy chọn)</span>
                      </label>
                      <input
                        type="text"
                        value={auditReason}
                        onChange={(e) => {
                          setAuditReason(e.target.value);
                          if (formError) setFormError('');
                        }}
                        placeholder="Ví dụ: Nhập bổ sung lô hàng mới từ xưởng..."
                        className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-xs bg-white text-charcoal-900 focus:outline-hidden focus:border-emerald-700"
                      />
                      {formError && (
                        <p className="text-rose-600 text-[11px] font-medium mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{formError}</span>
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Số lượng kiểm kê thực tế */}
                    <div>
                      <label className="block text-xs font-bold text-charcoal-800 mb-1.5">
                        Số lượng đếm thực tế tại kho <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        required
                        value={actualQty}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val.includes('.') || val.includes(',')) {
                            setFormError('Số lượng kiểm kê phải là số nguyên, không được nhập số thập phân.');
                          } else {
                            setFormError('');
                          }
                          setActualQty(val);
                        }}
                        placeholder="Nhập số lượng đếm được thực tế..."
                        className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-base font-bold bg-white text-charcoal-900 focus:outline-hidden focus:border-[#5C1D24] focus:ring-1 focus:ring-[#5C1D24]/20 transition-all font-mono"
                      />
                      <p className="text-[11px] text-stone-400 mt-1">
                        Nhập tổng số lượng thực tế đếm được tại kệ để đối chiếu và đặt lại tồn kho (không tự cộng dồn).
                      </p>
                    </div>

                    {/* Chênh lệch (Tự động tính) */}
                    <div
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                        diff === 0
                          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                          : diff > 0
                            ? 'bg-blue-50/80 border-blue-200 text-blue-900'
                            : 'bg-rose-50/80 border-rose-200 text-rose-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {diff === 0 ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : diff > 0 ? (
                          <Plus className="w-4 h-4 text-blue-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <div>
                          <span className="font-bold block">
                            Chênh lệch đối chiếu: {diff > 0 ? `+${diff}` : diff} cái (Tồn mới: {parsedActual} cái)
                          </span>
                          <span className="text-[11px] opacity-80 block">
                            {diff === 0
                              ? 'Khớp 100% với số lượng tồn trên hệ thống'
                              : diff > 0
                                ? `Thực đếm dư ${diff} sản phẩm so với sổ sách`
                                : `Hao hụt / Thiếu ${Math.abs(diff)} sản phẩm so với sổ sách`}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`font-mono font-bold text-sm px-2 py-0.5 rounded-lg ${
                          diff === 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : diff > 0
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {diff > 0 ? `+${diff}` : diff}
                      </span>
                    </div>

                    {/* Lý do điều chỉnh */}
                    <div>
                      <label className="block text-xs font-bold text-charcoal-800 mb-1.5">
                        Lý do điều chỉnh kiểm kê{' '}
                        {diff !== 0 ? (
                          <span className="text-rose-500 font-semibold">* (Bắt buộc do có chênh lệch)</span>
                        ) : (
                          <span className="text-stone-400 font-normal">(Tùy chọn ghi chú)</span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={auditReason}
                        onChange={(e) => {
                          setAuditReason(e.target.value);
                          if (formError) setFormError('');
                        }}
                        placeholder={
                          diff !== 0
                            ? 'Ví dụ: Hàng mẫu trả về, lỗi kiểm đếm lần trước, hao hụt...'
                            : 'Khớp số lượng, không bắt buộc nhập lý do'
                        }
                        className={`w-full px-3.5 py-2.5 border rounded-xl text-xs bg-white text-charcoal-900 focus:outline-hidden transition-all ${
                          formError
                            ? 'border-rose-500 bg-rose-50/20 focus:border-rose-600'
                            : 'border-stone-300 focus:border-[#5C1D24] focus:ring-1 focus:ring-[#5C1D24]/20'
                        }`}
                      />
                      {formError && (
                        <p className="text-rose-600 text-[11px] font-medium mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{formError}</span>
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-100">
                  <button
                    type="button"
                    disabled={isSubmittingAudit}
                    onClick={() => setAuditModalItem(null)}
                    className="px-4 py-2 border border-stone-200 text-stone-600 hover:bg-stone-50 rounded-xl text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingAudit}
                    className={`px-5 py-2 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-50 ${
                      modalMode === 'restock'
                        ? 'bg-emerald-700 hover:bg-emerald-800'
                        : 'bg-[#5C1D24] hover:bg-[#48161C]'
                    }`}
                  >
                    {isSubmittingAudit ? (
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                    ) : modalMode === 'restock' ? (
                      <Plus className="w-3.5 h-3.5" />
                    ) : (
                      <ClipboardCheck className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {isSubmittingAudit
                        ? 'Đang lưu...'
                        : modalMode === 'restock'
                          ? 'Xác nhận nhập hàng'
                          : 'Xác nhận kiểm kê'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
