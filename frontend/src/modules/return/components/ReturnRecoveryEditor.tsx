import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ConfirmModal } from '@/shared/components/ConfirmModal';
import type { RecoveryAction, RecoveryInput, RecoveryItem, RecoverySnapshot } from '../services/returnRecovery';

interface Props {
  snapshot: RecoverySnapshot; returnId?: string; customer?: boolean; onClose: () => void;
  onSave: (input: RecoveryInput, key: string) => Promise<unknown>;
}
const labels: Record<RecoveryAction, string> = {
  request_info: 'Yêu cầu bổ sung', repair: 'Lưu chi tiết đã xác minh', close: 'Đóng hồ sơ chưa nhận hàng',
  disposition: 'Ghi nhận phương án xử lý', customer_submit: 'Gửi thông tin bổ sung'
};
export function ReturnRecoveryEditor({ snapshot, returnId, customer = false, onClose, onSave }: Props) {
  // Existing details are preserved. No original order line or target size is selected by default.
  const [items, setItems] = useState<RecoveryItem[]>(() => snapshot.items.map(i => ({ order_item_id: i.order_item_id, quantity: i.quantity, target_variant_id: i.target_variant_id })));
  const [note, setNote] = useState('');
  const [verified, setVerified] = useState(false);
  const [action, setAction] = useState<RecoveryAction>(customer ? 'customer_submit' : 'request_info');
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');
  const [key] = useState(() => crypto.randomUUID());
  const editing = action === 'repair' || action === 'customer_submit';
  const editable = ['cho_xu_ly', 'duyet_so_bo', 'da_nhan_hang', 'da_kiem_tra'].includes(snapshot.status);
  const canSubmit = editable && (!customer || snapshot.recovery.state === 'awaiting_info');
  const update = (id: number, patch: Partial<RecoveryItem>) => setItems(prev => prev.map(i => i.order_item_id === id ? { ...i, ...patch } : i));

  // Đóng modal bằng phím ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const validate = () => {
    if (!canSubmit) return 'Hồ sơ hiện không chờ thông tin bổ sung.';
    if (note.trim().length < 5 || note.length > 1000) return 'Vui lòng nhập nội dung từ 5 đến 1.000 ký tự.';
    if (editing && !verified) return customer ? 'Vui lòng xác nhận các lựa chọn của bạn.' : 'Cần xác nhận đã đối chiếu với khách hàng.';
    if (action === 'close' && !verified) return 'Cần xác nhận đã kiểm tra thực tế và cửa hàng chưa nhận hàng.';
    if (editing && (!items.length || items.some(i => {
      const line = snapshot.order_items.find(l => l.order_item_id === i.order_item_id);
      return !line || !Number.isSafeInteger(i.quantity) || i.quantity < 1 || i.quantity > line.remaining ||
        (snapshot.type === 'doi_size' && !line.variants.some(v => v.variant_id === i.target_variant_id));
    }))) return 'Chọn sản phẩm, số lượng và size cụ thể theo thông tin đã xác nhận.';
    return '';
  };
  const stage = () => { const message = validate(); setError(message); if (!message) setConfirm(true); };

  const content = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-stone-900/40 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Bổ sung hồ sơ đổi trả"
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden max-h-[88vh] my-auto animate-scaleIn text-left text-xs text-stone-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header cố định trên cùng với nút X nổi bật */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-stone-100 bg-stone-50/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-charcoal-900 leading-tight">
                {customer ? 'Bổ Sung Sản Phẩm & Size Đổi Trả' : 'Đối Soát & Bổ Sung Hồ Sơ Đổi Trả'}
              </h3>
              <p className="text-[11px] text-stone-500 mt-0.5">
                {returnId ? <>Hồ sơ: <strong className="font-mono text-purple-700">{returnId}</strong> • </> : null}
                Chính sách đổi size tận nhà Curve & Confidence
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-800 flex items-center justify-center transition-colors cursor-pointer"
            title="Đóng popup (ESC)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body cuộn độc lập ở giữa */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {snapshot.recovery.note && (
            <div className="p-3.5 bg-amber-50/80 rounded-2xl border border-amber-200/80 text-xs text-amber-900 space-y-1">
              <span className="font-bold block text-[11px] text-amber-800 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Lời nhắn từ cửa hàng:
              </span>
              <p className="italic leading-relaxed">{snapshot.recovery.note}</p>
            </div>
          )}

          {snapshot.received && (
            <p className="text-xs text-amber-900 bg-amber-50/60 p-3 rounded-xl border border-amber-200">
              Cửa hàng đã ghi nhận nhận hàng. Không được đóng hồ sơ bằng cách từ chối; cần xác minh chi tiết hoặc thống nhất phương án xử lý thực tế.
            </p>
          )}

          {!customer && (
            <label className="block text-xs font-bold text-charcoal-800">
              Hướng xử lý
              <select
                aria-label="Hướng xử lý"
                value={action}
                onChange={e => { setAction(e.target.value as RecoveryAction); setError(''); }}
                className="block w-full mt-1.5 border border-stone-200 bg-stone-50 rounded-xl p-2.5 text-xs font-medium focus:outline-none focus:border-[#5C1D24]"
              >
                <option value="request_info">Yêu cầu khách bổ sung sản phẩm và size</option>
                <option value="repair">Bổ sung chi tiết đã xác minh với khách</option>
                {snapshot.received ? (
                  <option value="disposition">Ghi nhận phương án xử lý hàng đã nhận</option>
                ) : (
                  <option value="close">Đóng hồ sơ khi chưa nhận hàng</option>
                )}
              </select>
            </label>
          )}

          {editing && (
            <div className="space-y-3">
              <p className="text-[11px] text-stone-500 bg-stone-50 p-2.5 rounded-xl border border-stone-200/70">
                💡 Chỉ chọn mặt hàng thuộc đơn gốc. Size mới phải đúng lựa chọn đã xác nhận, không tự suy đoán. Tồn kho sẽ được kiểm tra lại khi lưu.
              </p>

              {snapshot.order_items.length === 0 && (
                <p className="text-xs text-amber-900 p-3 bg-amber-50 rounded-xl border border-amber-200">
                  Chưa đọc được mặt hàng của đơn gốc. Vui lòng liên hệ cửa hàng, không tự bổ sung sản phẩm thay thế.
                </p>
              )}

              {snapshot.order_items.map(line => {
                const selected = items.find(i => i.order_item_id === line.order_item_id);
                const existing = snapshot.items.find(i => i.order_item_id === line.order_item_id);
                return (
                  <div key={line.order_item_id} className="p-3.5 border border-stone-200 rounded-2xl bg-stone-50/40 space-y-2.5">
                    <label className="flex items-start gap-2.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!selected}
                        disabled={!!existing || line.remaining < 1}
                        onChange={e => setItems(prev => e.target.checked ? [...prev, { order_item_id: line.order_item_id, quantity: 1, target_variant_id: null }] : prev.filter(i => i.order_item_id !== line.order_item_id))}
                        className="mt-0.5 w-4 h-4 rounded text-[#5C1D24] focus:ring-[#5C1D24]"
                      />
                      <span className="flex-1 min-w-0">
                        <strong className="text-charcoal-900 text-xs block truncate">{line.name}</strong>
                        <span className="block text-[11px] text-stone-500 mt-0.5">
                          {line.color} • Size <strong>{line.size}</strong> • Đã mua: {line.quantity}
                        </span>
                      </span>
                    </label>

                    {selected && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6 pt-1">
                        <div>
                          <label className="text-[11px] font-bold text-stone-700 block mb-1">Số lượng</label>
                          <input
                            aria-label={`Số lượng ${line.name}`}
                            type="number"
                            min={1}
                            max={line.remaining}
                            disabled={!!existing}
                            value={selected.quantity}
                            onChange={e => update(line.order_item_id, { quantity: Number(e.target.value) })}
                            className="block w-full border border-stone-200 bg-white rounded-xl p-2 text-xs focus:outline-none focus:border-[#5C1D24]"
                          />
                        </div>
                        {snapshot.type === 'doi_size' && (
                          <div>
                            <label className="text-[11px] font-bold text-stone-700 block mb-1">Size muốn đổi</label>
                            <select
                              aria-label={`Size muốn đổi ${line.name}`}
                              value={selected.target_variant_id ?? ''}
                              disabled={existing?.target_variant_id != null}
                              onChange={e => update(line.order_item_id, { target_variant_id: e.target.value ? Number(e.target.value) : null })}
                              className="block w-full border border-stone-200 bg-white rounded-xl p-2 text-xs focus:outline-none focus:border-[#5C1D24]"
                            >
                              <option value="">Chọn size đã xác nhận</option>
                              {line.variants.map(v => (
                                <option key={v.variant_id} value={v.variant_id}>
                                  Size {v.size} • Còn {v.available} sản phẩm
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <label className="flex items-center gap-2 text-xs font-semibold text-charcoal-800 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={verified}
                  onChange={e => setVerified(e.target.checked)}
                  className="w-4 h-4 rounded text-[#5C1D24] focus:ring-[#5C1D24]"
                />
                <span>{customer ? 'Tôi xác nhận sản phẩm, số lượng và size đã chọn.' : 'Đã liên hệ và xác minh các lựa chọn này với khách hàng.'}</span>
              </label>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-charcoal-800 mb-1.5">
              {customer ? 'Thông tin bổ sung (nếu có)' : 'Nội dung gửi khách / biên bản xác minh'}
            </label>
            <textarea
              aria-label="Nội dung bổ sung"
              value={note}
              maxLength={1000}
              onChange={e => setNote(e.target.value)}
              placeholder="VD: Cần đổi đầm sang size 3XL do vòng eo hơi chật khi ngồi..."
              rows={3}
              className="block w-full border border-stone-200 bg-stone-50/50 rounded-xl p-3 text-xs focus:bg-white focus:outline-none focus:border-[#5C1D24]"
            />
          </div>

          {action === 'close' && (
            <label className="flex gap-2 text-xs font-semibold text-rose-800 cursor-pointer">
              <input type="checkbox" checked={verified} onChange={e => setVerified(e.target.checked)} className="w-4 h-4" />
              <span>Đã đối soát thực tế: cửa hàng chưa nhận hàng của yêu cầu này.</span>
            </label>
          )}

          {action === 'disposition' && (
            <p className="text-[11px] text-stone-500 bg-stone-50 p-2.5 rounded-xl border">
              Chỉ lưu phương án chờ xử lý; chưa hoàn tiền, chưa giao lại hàng và chưa thay đổi tồn kho. Cần thực hiện nghiệp vụ tương ứng sau khi thống nhất với khách.
            </p>
          )}

          {error && (
            <p role="alert" className="text-xs font-bold text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
              ⚠️ {error}
            </p>
          )}

          {!canSubmit && (
            <p className="text-xs text-stone-500">
              Hồ sơ chưa yêu cầu bổ sung hoặc đã chuyển sang bước xử lý khác.
            </p>
          )}
        </div>

        {/* Footer cố định ở đáy: Có cả nút Hủy và nút Gửi */}
        <div className="px-6 py-4 bg-stone-50/90 border-t border-stone-100 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={stage}
            className="px-5 py-2 bg-[#5C1D24] hover:bg-[#4A121D] text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {labels[action]}
          </button>
        </div>
      </section>

      <ConfirmModal
        isOpen={confirm}
        title={labels[action]}
        description={editing ? 'Kiểm tra lại từng món và size trước khi gửi. Chỉ thông tin bạn xác nhận mới được lưu vào hồ sơ.' : 'Nội dung sẽ được lưu vào hồ sơ và hiển thị cho khách hàng.'}
        details={<p className="whitespace-pre-wrap">{note}</p>}
        variant={action === 'close' ? 'danger' : 'warning'}
        onCancel={() => setConfirm(false)}
        onConfirm={async () => {
          const message = validate();
          if (message) { setError(message); setConfirm(false); return; }
          try {
            await onSave({ action, expected: snapshot.revision, note, customerVerified: verified, items: editing ? items : [] }, key);
            onClose();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Chưa lưu được thông tin. Vui lòng thử lại.');
            setConfirm(false);
          }
        }}
      />
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
}
