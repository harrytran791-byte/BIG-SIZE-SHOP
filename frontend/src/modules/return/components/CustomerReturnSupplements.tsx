import React, { useEffect, useState } from 'react';
import { useReturn } from '../context/ReturnContext';
import type { RecoverySnapshot } from '../services/returnRecovery';
import { ReturnRecoveryEditor } from './ReturnRecoveryEditor';

/** Mount in the customer's returns section. All reads remain protected by server ownership checks. */
export function CustomerReturnSupplements() {
  const { returnRequests, loadRecovery, saveRecovery } = useReturn();
  const [requests, setRequests] = useState<{ id: string; snapshot: RecoverySnapshot }[]>([]);
  const [selected, setSelected] = useState<{ id: string; snapshot: RecoverySnapshot } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const signature = returnRequests.map(r => `${r.id}:${r.status}:${r.adminNote || ''}`).join('|');
  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all(returnRequests.filter(r => ['pending_review', 'approved', 'received_goods'].includes(r.status))
      .map(async r => ({ id: r.id, snapshot: await loadRecovery(r.id) })))
      .then(rows => { if (active) { setRequests(rows.filter(r => ['awaiting_info', 'disposition_required'].includes(r.snapshot.recovery.state || ''))); setError(''); } })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : 'Chưa tải được thông tin bổ sung.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [signature, reload]);
  if (!loading && !error && requests.length === 0) return null;
  return <section className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
    <h3 className="font-bold text-[#5C1D24]">Thông tin cần bổ sung cho yêu cầu đổi trả</h3>
    {loading && <p className="text-sm">Đang tải hồ sơ...</p>}
    {error && <div role="alert" className="text-sm text-red-700">{error}<button type="button" onClick={() => setReload(v => v + 1)} className="ml-3 underline">Thử lại</button></div>}
    {requests.map(entry => <div key={entry.id} className="bg-white border border-stone-200 p-3 rounded-xl space-y-2">
      <p className="text-sm font-semibold">Yêu cầu {entry.id}</p><p className="text-sm whitespace-pre-wrap">{entry.snapshot.recovery.note}</p>
      {entry.snapshot.recovery.state === 'awaiting_info' ? <button type="button" onClick={async () => {
        try { setSelected({ id: entry.id, snapshot: await loadRecovery(entry.id) }); }
        catch (e) { setError(e instanceof Error ? e.message : 'Chưa tải được hồ sơ.'); }
      }} className="text-sm font-bold text-[#5C1D24] underline">Bổ sung sản phẩm và size</button> : <p className="text-sm text-stone-600">Cửa hàng đang đối soát phương án xử lý hàng đã nhận. Yêu cầu chưa đóng và chưa xác nhận hoàn tiền.</p>}
    </div>)}
    {selected && <ReturnRecoveryEditor customer returnId={selected.id} snapshot={selected.snapshot} onClose={() => setSelected(null)} onSave={async (input, key) => {
      await saveRecovery(selected.id, input, key); setReload(v => v + 1);
    }} />}
  </section>;
}
