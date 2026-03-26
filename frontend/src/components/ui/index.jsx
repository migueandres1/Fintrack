import { X }    from 'lucide-react';
import clsx      from 'clsx';

// ── Modal ──────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null;
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 overflow-hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={clsx(
        'relative w-full flex flex-col bg-[var(--bg-card)] rounded-xl shadow-2xl animate-scale-in border border-[var(--border)]',
        'max-h-[calc(100dvh-5rem)]',
        widths[size]
      )}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] flex-shrink-0">
          <h2 className="text-display font-bold text-base">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1 min-h-0 overscroll-contain">{children}</div>
      </div>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────
export function StatCard({ label, value, sub, icon: Icon, color = 'brand', trend }) {
  const colors = {
    brand:  'bg-brand-500/10  text-brand-500',
    green:  'bg-green-500/10  text-green-500',
    rose:   'bg-rose-500/10   text-rose-500',
    amber:  'bg-amber-500/10  text-amber-500',
    purple: 'bg-purple-500/10 text-purple-500',
  };
  return (
    <div className="card animate-fade-up">
      <div className="flex items-start justify-between mb-3">
        <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center', colors[color])}>
          <Icon size={18} />
        </div>
        {trend != null && (
          <span className={clsx('text-xs font-medium', trend >= 0 ? 'text-green-500' : 'text-rose-500')}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-[var(--text-muted)] text-xs font-medium mb-0.5">{label}</p>
      <p className="text-display font-bold text-xl text-[var(--text)] text-mono">{value}</p>
      {sub && <p className="text-xs text-[var(--text-muted)] mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Progress Bar ──────────────────────────────────────────────
export function ProgressBar({ value, max, color = '#6366f1', className }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className={clsx('w-full h-2 rounded-full bg-surface-100 dark:bg-surface-800 overflow-hidden', className)}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────
export function Empty({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-4">
        <Icon size={24} className="text-[var(--text-muted)]" />
      </div>
      <p className="font-semibold text-sm mb-1">{title}</p>
      {description && <p className="text-xs text-[var(--text-muted)] mb-4 max-w-xs">{description}</p>}
      {action}
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────
export function Spinner({ size = 20 }) {
  return (
    <div className="flex items-center justify-center py-10">
      <div
        className="border-2 border-brand-500 border-t-transparent rounded-full animate-spin"
        style={{ width: size, height: size }}
      />
    </div>
  );
}

// ── Select ────────────────────────────────────────────────────
export function Select({ label, ...props }) {
  return (
    <div>
      {label && <label className="label">{label}</label>}
      <select {...props} className={clsx('input appearance-none cursor-pointer', props.className)}>
        {props.children}
      </select>
    </div>
  );
}

// ── Input Field ───────────────────────────────────────────────
export function Field({ label, error, ...props }) {
  return (
    <div>
      {label && <label className="label">{label}</label>}
      <input {...props} className={clsx('input', error && 'border-rose-400 focus:ring-rose-400', props.className)} />
      {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
    </div>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────
export function Confirm({ open, onClose, onConfirm, title, message }) {
  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-[var(--text-muted)] mb-5">{message}</p>
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="btn-ghost">Cancelar</button>
        <button onClick={onConfirm} className="btn-danger">Eliminar</button>
      </div>
    </Modal>
  );
}
