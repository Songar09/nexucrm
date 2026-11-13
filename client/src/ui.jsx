import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, X, ChevronLeft, ChevronRight, Loader2, Search, Inbox } from 'lucide-react';
import { api, qs } from './api.js';

/* ---------- toasts ---------- */
const ToastCtx = createContext(null);
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((type, text) => {
    const id = Math.random().toString(36).slice(2);
    setItems((l) => [...l, { id, type, text }]);
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), type === 'error' ? 6000 : 3500);
  }, []);
  const api2 = { ok: (t) => push('ok', t), error: (t) => push('error', t) };
  return (
    <ToastCtx.Provider value={api2}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(92vw,380px)] flex-col gap-2" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className="pointer-events-auto flex items-start gap-3 rounded-xl border border-line bg-ink-700 p-3.5 text-sm shadow-pop">
            {t.type === 'ok' ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand" /> : <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />}
            <span className="flex-1">{t.text}</span>
            <button className="text-mute hover:text-white" onClick={() => setItems((l) => l.filter((x) => x.id !== t.id))} aria-label="Cerrar aviso"><X className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- modal ---------- */
export function Modal({ open, onClose, title, children, wide, footer }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    setTimeout(() => ref.current?.querySelector('input,select,textarea,button:not([data-close])')?.focus(), 30);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; prev?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title}
        className={`flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-line bg-ink-800 shadow-pop sm:rounded-2xl ${wide ? 'sm:max-w-3xl' : 'sm:max-w-xl'}`}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-base font-bold">{title}</h2>
          <button data-close className="btn-icon" onClick={onClose} aria-label="Cerrar"><X className="h-5 w-5" /></button>
        </div>
        <div className="overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4">{footer}</div>}
      </div>
    </div>, document.body);
}

export function Confirm({ open, title, text, confirmLabel = 'Confirmar', danger, busy, onConfirm, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title={title}
      footer={<><button className="btn-ghost" onClick={onClose}>Cancelar</button>
        <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{confirmLabel}</button></>}>
      <p className="text-sm leading-relaxed text-slate-300">{text}</p>
    </Modal>
  );
}

/* ---------- form bits ---------- */
export function Field({ label, error, hint, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold text-slate-300">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-danger" role="alert">{error}</span> : hint ? <span className="mt-1 block text-xs text-mute">{hint}</span> : null}
    </label>
  );
}
export const Spinner = ({ className = '' }) => <Loader2 className={`animate-spin text-mute ${className}`} />;

const TONES = {
  green: 'bg-brand/15 text-brand-300', blue: 'bg-sky/15 text-sky', amber: 'bg-amber/15 text-amber',
  red: 'bg-danger/15 text-danger', gray: 'bg-ink-600 text-slate-300', violet: 'bg-violet/15 text-violet',
};
export const Badge = ({ tone = 'gray', children }) => <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]}`}>{children}</span>;

export function Empty({ title, text, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-600 text-mute"><Inbox className="h-6 w-6" /></div>
      <p className="font-semibold">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-mute">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>{subtitle && <p className="mt-1 text-sm text-mute">{subtitle}</p>}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder = 'Buscar…' }) {
  return (
    <div className="relative min-w-[220px] flex-1">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" />
      <input className="input pl-10" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </div>
  );
}

export function Pagination({ page, pages, total, limit, onPage }) {
  if (!total) return null;
  const from = (page - 1) * limit + 1, to = Math.min(total, page * limit);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-mute">
      <span>Mostrando {from}–{to} de {total}</span>
      <div className="flex items-center gap-1">
        <button className="btn-icon" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Página anterior"><ChevronLeft className="h-5 w-5" /></button>
        <span className="px-2 text-slate-200">Página {page} de {pages}</span>
        <button className="btn-icon" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Página siguiente"><ChevronRight className="h-5 w-5" /></button>
      </div>
    </div>
  );
}

/* ---------- datos ---------- */
export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

/** Lista paginada con búsqueda y filtros. */
export function useList(endpoint, filters, limit = 10) {
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ loading: true, data: [], total: 0, pages: 1, error: '' });
  const [tick, setTick] = useState(0);
  const key = JSON.stringify(filters);
  useEffect(() => { setPage(1); }, [key]);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: '' }));
    api.get(`${endpoint}${qs({ ...filters, page, limit })}`)
      .then((r) => alive && setState({ loading: false, data: r.data, total: r.total, pages: r.pages, error: '' }))
      .catch((e) => alive && setState((s) => ({ ...s, loading: false, error: e.message })));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, key, page, tick]);
  return { ...state, page, limit, setPage, reload: () => setTick((t) => t + 1) };
}
