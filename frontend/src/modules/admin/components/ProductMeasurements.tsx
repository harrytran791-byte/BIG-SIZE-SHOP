import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/shared/services/supabaseClient';
import { measurementFields, saveProductMeasurements, type Measurements } from '@/shared/services/managerOperations';

const labels = ['Chiều cao (cm)', 'Cân nặng (kg)', 'Vòng ngực (cm)', 'Vòng eo (cm)', 'Vòng hông (cm)'];
const valuesOf = (row: any): Measurements => Object.fromEntries(measurementFields.map(field => [field,
  row[field] == null ? null : Number(row[field])])) as Measurements;

/** Product-specific data is independent from the browser reference drafts below. */
export const ProductMeasurements: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [form, setForm] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const lock = useRef(false);
  const read = async () => {
    const { data, error } = await supabase.from('bangsize').select('*, sanpham(ten_sp)').order('ma_sp').order('ma_bang_size');
    if (error) throw new Error('Chưa tải được số đo sản phẩm. Vui lòng thử lại.');
    return data || [];
  };
  useEffect(() => {
    let active = true;
    read().then(data => { if (active) setRows(data); }).catch(e => { if (active) setMessage(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const choose = (value: string) => {
    setSelected(value); setMessage('');
    const row = rows.find(r => String(r.ma_bang_size) === value);
    setForm(Object.fromEntries(measurementFields.map(f => [f, row?.[f] == null ? '' : String(row[f])])));
  };
  return <section className="bg-white rounded-2xl border border-stone-200 p-5 space-y-4">
    <div>
      <h2 className="font-bold text-charcoal-900">Số đo theo từng sản phẩm</h2>
      <p className="text-xs text-stone-500 mt-1">Chọn đúng sản phẩm và kích cỡ. Lưu tại đây sẽ cập nhật số đo dùng cho tư vấn chọn size. Bản nháp tham khảo bên dưới được giữ riêng.</p>
    </div>
    <div className="flex gap-3 items-center">
      <select aria-label="Sản phẩm và kích cỡ cần sửa số đo" value={selected} disabled={busy || loading}
        onChange={e => choose(e.target.value)} className="flex-1 border border-stone-300 rounded-xl p-2 text-sm">
        <option value="">{loading ? 'Đang tải số đo...' : 'Chọn sản phẩm và kích cỡ'}</option>
        {rows.map(row => <option key={row.ma_bang_size} value={row.ma_bang_size}>{row.sanpham?.ten_sp || 'Sản phẩm chưa có tên'} — {row.kich_co}</option>)}
      </select>
      <button type="button" disabled={busy || loading} className="text-sm underline disabled:opacity-50" onClick={async () => {
        setLoading(true); setSelected(''); setForm({}); setMessage('');
        try { setRows(await read()); } catch (e) { setMessage((e as Error).message); } finally { setLoading(false); }
      }}>Tải lại</button>
    </div>
    {selected && <form className="space-y-3" onSubmit={async e => {
      e.preventDefault(); if (lock.current) return;
      const row = rows.find(r => String(r.ma_bang_size) === selected);
      if (!row) return;
      const values = Object.fromEntries(measurementFields.map(f => [f, form[f]?.trim() ? Number(form[f]) : null])) as Measurements;
      lock.current = true; setBusy(true); setMessage('');
      try {
        await saveProductMeasurements(supabase, row.ma_bang_size, values, valuesOf(row), crypto.randomUUID());
        setRows(prev => prev.map(r => r.ma_bang_size === row.ma_bang_size ? { ...r, ...values } : r));
        setMessage('Đã lưu số đo của sản phẩm đã chọn.');
      } catch (error) {
        setMessage((error as Error).message || 'Chưa lưu được số đo. Hãy tải lại trước khi thử lại.');
      } finally { lock.current = false; setBusy(false); }
    }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {labels.map((label, i) => <fieldset key={label} disabled={busy} className="border border-stone-200 rounded-xl p-3">
          <legend className="text-xs font-semibold px-1">{label}</legend>
          <div className="flex items-center gap-2">
            {[0, 1].map(j => { const field = measurementFields[i * 2 + j]; return <input key={field}
              aria-label={`${label} ${j === 0 ? 'tối thiểu' : 'tối đa'}`} type="number" min="0.1" max="999.9" step="0.1"
              placeholder={j === 0 ? 'Tối thiểu' : 'Tối đa'} value={form[field] || ''}
              onChange={event => setForm(prev => ({ ...prev, [field]: event.target.value }))}
              className="min-w-0 w-1/2 border border-stone-300 rounded-lg p-2 text-sm" />; })}
          </div>
        </fieldset>)}
      </div>
      <p className="text-xs text-stone-500">Để trống cả hai ô nếu chưa có số đo; không nhập số ước lượng.</p>
      <button disabled={busy} className="bg-[#5C1D24] text-white px-4 py-2 rounded-xl text-sm disabled:opacity-50">{busy ? 'Đang lưu...' : 'Lưu số đo sản phẩm'}</button>
    </form>}
    {message && <p role="status" className="text-sm text-[#5C1D24]">{message}</p>}
  </section>;
};
