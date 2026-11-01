import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, X, AlertCircle, CheckCircle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  details?: React.ReactNode;
  confirmText?: string;
  confirmLoadingText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  description,
  details,
  confirmText = 'Xác Nhận',
  confirmLoadingText,
  cancelText = 'Hủy Bỏ',
  variant = 'danger',
  onConfirm,
  onCancel
}) => {
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const confirm = async () => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try { await onConfirm(); }
    finally { busyRef.current = false; setBusy(false); }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busyRef.current) onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const content = (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-stone-900/45 animate-fadeIn"
      onClick={() => { if (!busy) onCancel(); }}
    >
      <div 
        className="relative w-full max-w-md bg-white rounded-2xl shadow-modal border border-surface-border overflow-hidden animate-scaleUp my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                variant === 'danger'
                  ? 'bg-rose-50 text-rose-600 border border-rose-200'
                  : variant === 'warning'
                  ? 'bg-amber-50 text-amber-600 border border-amber-200'
                  : 'bg-brand-50 text-brand-700 border border-brand-200'
              }`}
            >
              {variant === 'danger' && <Trash2 className="w-5 h-5 stroke-[2]" />}
              {variant === 'warning' && <AlertTriangle className="w-5 h-5 stroke-[2]" />}
              {variant === 'primary' && <AlertCircle className="w-5 h-5 stroke-[2]" />}
            </div>
            <div>
              <h3 className="font-bold text-charcoal-900 text-base leading-tight">
                {title}
              </h3>
              <p className="text-[11px] text-charcoal-500 mt-0.5">Xác nhận thao tác hệ thống</p>
            </div>
          </div>

          <button
            onClick={onCancel}
            disabled={busy}
            className="p-1.5 text-charcoal-400 hover:text-charcoal-700 rounded-lg hover:bg-stone-100 transition-colors"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="px-6 py-3 space-y-3">
          <p className="text-xs text-charcoal-600 leading-relaxed">
            {description}
          </p>

          {/* Optional Details Card */}
          {details && (
            <div className="p-3 bg-stone-50 border border-stone-200/80 rounded-xl text-xs">
              {details}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 bg-stone-50/80 border-t border-stone-200/80 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 text-xs font-bold text-charcoal-700 hover:text-charcoal-900 bg-white hover:bg-stone-100 border border-stone-300 rounded-xl transition-all shadow-xs"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={confirm}
            disabled={busy}
            className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed ${
              busy ? 'opacity-90' : ''
            } ${
              variant === 'danger'
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                : variant === 'warning'
                ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'
                : 'bg-[#5C1D24] hover:bg-[#48161C]'
            }`}
          >
            {busy ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                <span>{confirmLoadingText || 'Đang xử lý...'}</span>
              </>
            ) : (
              <>
                {variant === 'danger' && <Trash2 className="w-3.5 h-3.5" />}
                <span>{confirmText}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
};
