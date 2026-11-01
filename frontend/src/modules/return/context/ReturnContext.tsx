import { sendExchange } from '@/shared/services/managerOperations';
import { useAuth } from '@/context/AuthContext';
import { submitReturn, transaction, databaseId } from '@/shared/services/transactionService';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { ReturnRequest, CancellationRequest } from '@/types';
import { fetchReturnsFromSupabase, fetchCancellationsFromSupabase, supabase } from '@/shared/services/supabaseClient';
import { loadReturnRecovery, saveReturnRecovery, needsReturnRecovery } from '../services/returnRecovery';
import type { RecoveryInput, RecoverySnapshot } from '../services/returnRecovery';

interface ReturnContextType {
  refreshReturns: () => Promise<void>;
  loadRecovery: (id: string) => Promise<RecoverySnapshot>;
  saveRecovery: (id: string, input: RecoveryInput, key: string) => Promise<RecoverySnapshot>;
  inspectReturn: (id: string, results: { id: number; resellable: boolean; note: string }[]) => Promise<boolean>;
  returnRequests: ReturnRequest[];
  cancellationRequests: CancellationRequest[];
  createReturnRequest: (data: Omit<ReturnRequest, 'id' | 'createdAt' | 'status'>, requestId: string) => Promise<string>;
  reviewReturnRequest: (id: string, status: 'approved' | 'rejected', adminNote?: string, refundAmount?: number) => Promise<boolean>;
  receiveReturnedGoods: (id: string, adminNote?: string) => Promise<boolean>;
  processExchangeSent: (id: string, newTrackingCode: string, carrier?: 'GHTK' | 'GHN') => Promise<boolean>;
  processReturnRefund: (id: string) => Promise<boolean>;
  cancelPendingOrder: (orderId: string, reason: string) => Promise<void>;
  requestCancelConfirmedOrder: (orderId: string, customerName: string, reason: string) => Promise<string>;
  reviewCancellation: (id: string, status: 'approved' | 'rejected', adminNote?: string) => Promise<boolean>;
}

const ReturnContext = createContext<ReturnContextType | undefined>(undefined);

export const ReturnProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);
  const refreshReturns = async () => { setReturnRequests(await fetchReturnsFromSupabase()); };
  const loadRecovery = (id: string) => loadReturnRecovery(supabase, id);
  const saveRecovery = async (id: string, input: RecoveryInput, key: string) => {
    const snapshot = await saveReturnRecovery(supabase, id, input, key);
    await refreshReturns();
    return snapshot;
  };

  useEffect(() => {
    if (!currentUser) { setReturnRequests([]); return; }
    let active = true;
    const refresh = async () => { const rows = await fetchReturnsFromSupabase(); if (active) setReturnRequests(rows); };
    void refresh();
    const channel = supabase.channel(`return_recovery_${currentUser.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'yeucaudoitra' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chitietyeucaudoitra' }, refresh).subscribe();
    // Focus refresh remains useful when realtime publication is not configured.
    window.addEventListener('focus', refresh);
    return () => { active = false; window.removeEventListener('focus', refresh); void supabase.removeChannel(channel); };
  }, [currentUser?.id]);

  const [cancellationRequests, setCancellationRequests] = useState<CancellationRequest[]>([]);

  useEffect(() => {
    if (!currentUser) { setCancellationRequests([]); return; }
    fetchCancellationsFromSupabase().then((supaCancellations) => {
      if (supaCancellations) {
        setCancellationRequests(supaCancellations);
      }
    });

    // Lắng nghe Realtime thay đổi từ bảng yeucauhuy
    let channel: any = null;
    if (supabase) {
      channel = supabase
        .channel('realtime_yeucauhuy')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'yeucauhuy' },
          () => {
            fetchCancellationsFromSupabase().then((data) => {
              if (data) setCancellationRequests(data);
            });
          }
        )
        .subscribe();
    }

    return () => {
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [currentUser?.id]);

  useEffect(() => {
    localStorage.setItem('curve_return_requests', JSON.stringify(returnRequests));
  }, [returnRequests]);

  useEffect(() => {
    localStorage.setItem('curve_cancellation_requests', JSON.stringify(cancellationRequests));
  }, [cancellationRequests]);

  const createReturnRequest = async (data: Omit<ReturnRequest, 'id' | 'createdAt' | 'status'>, requestId: string): Promise<string> => {
    const saved = await submitReturn(supabase, data, requestId);
    const id = `RET-00${saved.return_id}`;
    setReturnRequests(prev => [{ ...data, id, createdAt: new Date().toLocaleString('vi-VN'), status: 'pending_review' }, ...prev.filter(r => r.id !== id)]);
    return id;
  };

  const inspectReturn = async (id: string, results: { id: number; resellable: boolean; note: string }[]) => {
    try {
      await transaction(supabase, 'cc_inspect_return', { p_return_id: databaseId(id, 'RET-'), p_results: results });
      setReturnRequests(await fetchReturnsFromSupabase()); return true;
    } catch { return false; }
  };
  const transitionReturn = async (id: string, action: string, note = '', tracking = ''): Promise<boolean> => {
    try {
      await transaction(supabase, 'cc_transition_return', { p_return_id: databaseId(id, 'RET-'), p_action: action, p_note: note, p_tracking: tracking });
      setReturnRequests(await fetchReturnsFromSupabase());
      return true;
    } catch { return false; }
  };
  const reviewReturnRequest = async (id: string, status: 'approved' | 'rejected', adminNote?: string, _refundAmount?: number) => {
    const request = returnRequests.find(r => r.id === id);
    if (!request || (status === 'approved' && needsReturnRecovery(request))) return false;
    if (status === 'rejected' && !['pending_review', 'approved'].includes(request.status)) return false;
    return transitionReturn(id, status, adminNote);
  };
  const receiveReturnedGoods = (id: string, adminNote?: string) => transitionReturn(id, 'received_goods', adminNote);
  const processExchangeSent = async (id: string, tracking: string, carrier?: 'GHTK' | 'GHN'): Promise<boolean> => {
    try {
      if (!carrier) return false;
      await sendExchange(supabase, databaseId(id, 'RET-'), tracking, carrier, crypto.randomUUID());
      setReturnRequests(await fetchReturnsFromSupabase()); return true;
    } catch { return false; }
  };
  const processReturnRefund = (id: string) => transitionReturn(id, 'refunded');
  const cancelPendingOrder = async (orderId: string, reason: string) => {
    await transaction(supabase, 'cc_cancel_order', { p_order_id: databaseId(orderId, 'BS-HD'), p_reason: reason });
    setCancellationRequests(await fetchCancellationsFromSupabase());
  };
  const requestCancelConfirmedOrder = async (orderId: string, _customerName: string, reason: string): Promise<string> => {
    const saved = await transaction(supabase, 'cc_request_cancel', { p_order_id: databaseId(orderId, 'BS-HD'), p_reason: reason });
    setCancellationRequests(await fetchCancellationsFromSupabase());
    return `CAN-00${saved.request_id}`;
  };
  const reviewCancellation = async (id: string, status: 'approved' | 'rejected', note?: string): Promise<boolean> => {
    try {
      await transaction(supabase, 'cc_review_cancel', { p_request_id: databaseId(id, 'CAN-'), p_approved: status === 'approved', p_note: note || '' });
      setCancellationRequests(await fetchCancellationsFromSupabase());
      return true;
    } catch { return false; }
  };

  return (
    <ReturnContext.Provider
      value={{
        refreshReturns,
        loadRecovery,
        saveRecovery,
        inspectReturn,
        returnRequests,
        cancellationRequests,
        createReturnRequest,
        reviewReturnRequest,
        receiveReturnedGoods,
        processExchangeSent,
        processReturnRefund,
        cancelPendingOrder,
        requestCancelConfirmedOrder,
        reviewCancellation
      }}
    >
      {children}
    </ReturnContext.Provider>
  );
};

export const useReturn = () => {
  const context = useContext(ReturnContext);
  if (!context) throw new Error('useReturn must be used within ReturnProvider');
  return context;
};
