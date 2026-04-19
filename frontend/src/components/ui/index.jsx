import { useEffect }    from 'react';
import { createPortal } from 'react-dom';
import { X }            from 'lucide-react';
import clsx             from 'clsx';

// ── Modal ──────────────────────────────────────────────────────
// Supports two header styles:
//   - Default: single-line title with bottom border (for confirms, edits)
//   - eyebrow + title: handoff sheet style with UPPERCASE eyebrow + Cormorant title
export function Modal({ open, onClose, title, eyebrow, children, size = 'md' }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return createPortal(
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain" onClick={onClose}>
        <div className="flex min-h-full items-start justify-center p-4 pt-12 pb-10">
          <div
            className={clsx('relative w-full flex flex-col animate-scale-in rounded-2xl', widths[size])}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 24px 50px rgba(0,0,0,.25)' }}
            onClick={e => e.stopPropagation()}
          >
            {eyebrow ? (
              <div className="px-5 pt-5 pb-2 flex-shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--c500)', letterSpacing: '.12em', textTransform: 'uppercase', fontWeight: 700 }}>
                      {eyebrow}
                    </div>
                    <div style={{ fontFamily: 'var(--fd)', fontWeight: 300, fontSize: 24, color: 'var(--text)', lineHeight: 1.1, letterSpacing: '-.01em', marginTop: 4 }}>
                      {title}
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg transition-colors flex-shrink-0"
                    style={{ color: 'var(--text-muted)', marginTop: -2 }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <h2 className="font-semibold text-base" style={{ fontFamily: 'var(--fb)', color: 'var(--text)' }}>
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <X size={16} />
                </button>
              </div>
            )}
            <div className={eyebrow ? 'px-5 pb-5 pt-3' : 'p-5'}>{children}</div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

// ── Stat Card ─────────────────────────────────────────────────
export function StatCard({ label, value, sub, icon: Icon, color = 'brand', trend }) {
  const iconColors = {
    brand:  { bg: 'rgba(0,184,148,.12)',  color: 'var(--c500)' },
    green:  { bg: 'rgba(0,184,148,.12)',  color: 'var(--c500)' },
    rose:   { bg: 'rgba(229,62,62,.1)',   color: '#e53e3e' },
    amber:  { bg: 'rgba(240,165,0,.12)',  color: '#f0a500' },
    purple: { bg: 'rgba(99,102,241,.1)',  color: '#6366f1' },
  };
  const ic = iconColors[color] || iconColors.brand;

  return (
    <div className="card animate-fade-up">
      <div className="flex items-start justify-between mb-3">
        <div
          className="flex items-center justify-center rounded-xl"
          style={{ width: 36, height: 36, background: ic.bg, color: ic.color }}
        >
          <Icon size={17} />
        </div>
        {trend != null && (
          <span className="text-xs font-semibold" style={{ color: trend >= 0 ? 'var(--c500)' : '#e53e3e' }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <div style={{ fontFamily: 'var(--fd)', fontWeight: 300, fontSize: 26, color: 'var(--text)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      {sub && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
  );
}

// ── Progress Bar ──────────────────────────────────────────────
export function ProgressBar({ value, max, color, className }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className={clsx('progress-bar', className)}>
      <div
        className="progress-bar-fill"
        style={{ width: `${pct}%`, background: color || 'var(--c500)' }}
      />
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────
export function Empty({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div
        className="flex items-center justify-center rounded-2xl mb-4"
        style={{ width: 56, height: 56, background: 'var(--surface-2)' }}
      >
        <Icon size={24} style={{ color: 'var(--text-muted)' }} />
      </div>
      <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text)' }}>{title}</p>
      {description && <p className="text-xs mb-4 max-w-xs" style={{ color: 'var(--text-muted)' }}>{description}</p>}
      {action}
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────
export function Spinner({ size = 20 }) {
  return (
    <div className="flex items-center justify-center py-10">
      <div
        className="animate-spin rounded-full"
        style={{
          width: size, height: size,
          border: '2px solid var(--border)',
          borderTopColor: 'var(--c500)',
        }}
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
      <input
        {...props}
        className={clsx('input', props.className)}
        style={error ? { borderColor: '#e53e3e', ...props.style } : props.style}
      />
      {error && <p className="text-xs mt-1" style={{ color: '#e53e3e' }}>{error}</p>}
    </div>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────
export function Confirm({ open, onClose, onConfirm, title, message }) {
  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>{message}</p>
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="btn-secondary">Cancelar</button>
        <button onClick={onConfirm} className="btn-danger">Eliminar</button>
      </div>
    </Modal>
  );
}
