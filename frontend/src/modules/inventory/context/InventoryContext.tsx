import { countInventory } from '@/shared/services/managerOperations';
import { transaction } from '@/shared/services/transactionService';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { StockItem, StockAuditSchedule, StockAuditRecord, StockAdjustmentLog } from '@/types';
import { initialInventory } from '@/data/mockInventory';
import { fetchInventoryFromSupabase, fetchAdjustmentLogsFromSupabase, supabase } from '@/shared/services/supabaseClient';
import { useAuth } from '@/context/AuthContext';

interface InventoryContextType {
  inventory: StockItem[];
  lowStockItems: StockItem[];
  auditSchedules: StockAuditSchedule[];
  auditRecords: StockAuditRecord[];
  adjustmentLogs: StockAdjustmentLog[];
  refreshInventory: () => Promise<void>;
  holdStock: (sku: string, qty: number, reservationId: string) => Promise<boolean>;
  releaseStock: (sku: string, qty: number, restoreActualStock?: boolean, reservationId?: string) => Promise<boolean>;
  deductStock: (sku: string, qty: number) => void;
  restock: (sku: string, qty: number, reason: string, performer?: string) => Promise<boolean>;
  adjustStock: (sku: string, actualQty: number, reason: string, performer?: string, expectedQty?: number) => Promise<boolean>;
  addAuditSchedule: (schedule: Omit<StockAuditSchedule, 'id'>) => void;
  submitAuditRecord: (record: Omit<StockAuditRecord, 'id' | 'auditedAt' | 'difference'>) => void;
  approveAuditRecord: (recordId: string, performer?: string) => Promise<boolean>;
}

const liveAuditSchedules: StockAuditSchedule[] = [
  {
    id: 'AUD-THANG-10',
    title: 'Kiểm kê định kỳ kho hàng Tháng 10/2026',
    period: 'monthly',
    assignedTo: 'Phan Nho Toàn (Thủ kho)',
    scheduledDate: '2026-10-12',
    status: 'completed',
    notes: 'Đã hoàn tất đối chiếu và cân bằng số liệu tồn kho thực tế của hệ thống.'
  }
];

const liveAuditRecords: StockAuditRecord[] = [
  {
    id: 'REC-01',
    auditScheduleId: 'AUD-THANG-10',
    sku: 'POLO-DEN-XL',
    productName: 'Áo Polo Nam Big Size Dry-Tech Dệt Tổ Ong Kháng Khuẩn',
    size: 'XL',
    systemQuantity: 38,
    actualQuantity: 40,
    difference: 2,
    reason: 'Kiểm kê định kỳ tháng 10: thực đếm dư 2 cái so với sổ sách, điều chỉnh tăng.',
    auditedBy: 'Phan Nho Toàn',
    auditedAt: '11/10/2026 22:11',
    status: 'approved'
  },
  {
    id: 'REC-02',
    auditScheduleId: 'AUD-THANG-10',
    sku: 'DAM-DO-XL',
    productName: 'Đầm Xòe Dáng Chữ A Cổ Tim Big Size Tôn Vòng 1 Che Khuyết Điểm',
    size: 'XL',
    systemQuantity: 21,
    actualQuantity: 20,
    difference: -1,
    reason: 'Phát hiện 1 áo bị lỗi chỉ may, chuyển sang hàng thanh lý không tính tồn khả dụng.',
    auditedBy: 'Phan Nho Toàn',
    auditedAt: '11/10/2026 22:11',
    status: 'approved'
  }
];

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [inventory, setInventory] = useState<StockItem[]>([]);
  const refreshInventory = React.useCallback(async () => {
    const rows = await fetchInventoryFromSupabase({ strict: true });
    setInventory(rows);
  }, []);

  useEffect(() => {
    let active = true;
    const refresh = () => { void fetchInventoryFromSupabase().then(rows => { if (active) setInventory(rows); }); };
    refresh();
    window.addEventListener('curve:catalog-changed', refresh);
    const channel = supabase.channel('inventory_live').on('postgres_changes', { event: '*', schema: 'public', table: 'chitietsanpham' }, refresh).subscribe();
    return () => {
      active = false;
      window.removeEventListener('curve:catalog-changed', refresh);
      void supabase.removeChannel(channel);
    };
  }, []);

  const [auditSchedules, setAuditSchedules] = useState<StockAuditSchedule[]>(() => {
    try {
      const saved = sessionStorage.getItem('curve_audit_schedules');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0 && !parsed[0].id?.startsWith('AUD-2026')) return parsed;
      }
    } catch {
      // Ignore
    }
    return liveAuditSchedules;
  });

  const [auditRecords, setAuditRecords] = useState<StockAuditRecord[]>(() => {
    try {
      const saved = sessionStorage.getItem('curve_audit_records');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0 && parsed[0].sku?.startsWith('POLO-')) return parsed;
      }
    } catch {
      // Ignore
    }
    return liveAuditRecords;
  });

  const [adjustmentLogs, setAdjustmentLogs] = useState<StockAdjustmentLog[]>(() => {
    try {
      const saved = sessionStorage.getItem('curve_adjustment_logs');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.filter((l: any) => !l.id?.startsWith('LOG-'));
      }
    } catch {
      // Ignore
    }
    return [];
  });

  const { currentUser } = useAuth();
  const isStaff = currentUser?.role === 'manager' || currentUser?.role === 'admin';

  useEffect(() => {
    if (!isStaff) return;
    fetchAdjustmentLogsFromSupabase().then((logs) => {
      if (logs && logs.length > 0) {
        setAdjustmentLogs((prev) => {
          const supaIds = new Set(logs.map(l => l.id));
          const localOnly = prev.filter(l => !supaIds.has(l.id) && !l.id?.startsWith('LOG-'));
          return [...logs, ...localOnly];
        });
      }
    });
  }, [isStaff]);

  useEffect(() => {
    try {
      sessionStorage.removeItem('curve_inventory');
    } catch {
      // Ignore storage cleanup errors
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem('curve_audit_schedules', JSON.stringify(auditSchedules));
  }, [auditSchedules]);

  useEffect(() => {
    sessionStorage.setItem('curve_audit_records', JSON.stringify(auditRecords));
  }, [auditRecords]);

  useEffect(() => {
    sessionStorage.setItem('curve_adjustment_logs', JSON.stringify(adjustmentLogs));
  }, [adjustmentLogs]);

  const lowStockItems = inventory.filter(i => i.quantity <= i.lowStockThreshold);

  const holdStock = async (sku: string, qty: number, reservationId: string): Promise<boolean> => {
    if (!reservationId || !Number.isSafeInteger(qty) || qty < 1) return false;
    try {
      await transaction(supabase, 'cc_reserve_stock', { p_key: reservationId, p_sku: sku, p_quantity: qty });
      setInventory(await fetchInventoryFromSupabase());
      return true;
    } catch { return false; }
  };

  const releaseStock = async (sku: string, qty: number, restoreActualStock = false, reservationId?: string): Promise<boolean> => {
    // Physical returns are processed only by the inspected-return transaction.
    if (restoreActualStock || !reservationId || !Number.isSafeInteger(qty) || qty < 1) return false;
    try {
      await transaction(supabase, 'cc_release_reservation', { p_key: reservationId, p_sku: sku, p_quantity: qty });
      setInventory(await fetchInventoryFromSupabase());
      return true;
    } catch { return false; }
  };

  // Order deductions belong exclusively to the order/return server transactions.
  const deductStock = (_sku: string, _qty: number) => {
    console.warn('Xuất kho cần thực hiện qua giao dịch đơn hàng.');
  };

  const adjustStock = async (sku: string, actualQty: number, reason: string, _performer?: string, expectedQty?: number): Promise<boolean> => {
    const item = inventory.find(i => i.sku === sku);
    if (!item || !Number.isSafeInteger(actualQty) || actualQty < item.heldQuantity) return false;
    try {
      const saved = await countInventory(supabase, sku, actualQty, expectedQty ?? item.quantity, reason, crypto.randomUUID());
      // Apply only the server acknowledgement. A later read outage must not imply the committed write failed.
      setInventory(prev => prev.map(row => row.sku !== sku ? row : { ...row, quantity: saved.quantity,
        heldQuantity: saved.held, updatedAt: new Date(saved.at).toLocaleString('vi-VN'),
        status: saved.quantity === 0 ? 'out_of_stock' : saved.quantity <= row.lowStockThreshold ? 'low_stock' : 'in_stock' }));
      const [rows, logs] = await Promise.allSettled([fetchInventoryFromSupabase({ strict: true }), fetchAdjustmentLogsFromSupabase({ strict: true })]);
      if (rows.status === 'fulfilled') setInventory(rows.value);
      if (logs.status === 'fulfilled') setAdjustmentLogs(logs.value);
      return true;
    } catch { return false; }
  };

  const restock = async (sku: string, qty: number, reason: string, performer?: string): Promise<boolean> => {
    const item = inventory.find(i => i.sku === sku);
    if (!item || !Number.isSafeInteger(qty) || qty <= 0) return false;
    return adjustStock(sku, item.quantity + qty, reason, performer, item.quantity);
  };

  const addAuditSchedule = (schedule: Omit<StockAuditSchedule, 'id'>) => {
    const newSchedule: StockAuditSchedule = {
      ...schedule,
      id: `AUD-${Date.now()}`
    };
    setAuditSchedules(prev => [newSchedule, ...prev]);
  };

  const submitAuditRecord = (record: Omit<StockAuditRecord, 'id' | 'auditedAt' | 'difference'>) => {
    const diff = record.actualQuantity - record.systemQuantity;
    const newRec: StockAuditRecord = {
      ...record,
      id: `REC-${Date.now()}`,
      difference: diff,
      auditedAt: new Date().toLocaleString('vi-VN'),
      status: 'pending_review'
    };
    setAuditRecords(prev => [newRec, ...prev]);
  };

  const approveAuditRecord = async (recordId: string, performer = 'Manager'): Promise<boolean> => {
    const rec = auditRecords.find(r => r.id === recordId);
    if (!rec || !await adjustStock(rec.sku, rec.actualQuantity, `Đối chiếu kiểm kê: ${rec.reason || 'Duyệt biên bản'}`, performer)) return false;
    setAuditRecords(prev => prev.map(r => r.id === recordId ? { ...r, status: 'approved' } : r));
    return true;
  };

  return (
    <InventoryContext.Provider
      value={{
        inventory,
        lowStockItems,
        auditSchedules,
        auditRecords,
        adjustmentLogs,
        refreshInventory,
        holdStock,
        releaseStock,
        deductStock,
        restock,
        adjustStock,
        addAuditSchedule,
        submitAuditRecord,
        approveAuditRecord
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = (): InventoryContextType => {
  const context = useContext(InventoryContext);
  if (!context) throw new Error('useInventory must be used within InventoryProvider');
  return context;
};
