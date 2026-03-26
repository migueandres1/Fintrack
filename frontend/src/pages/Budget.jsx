import { useEffect, useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { useStore }  from '../store/index.js';
import { fmt }       from '../utils/format.js';
import { Modal, Confirm, Spinner } from '../components/ui/index.jsx';
import clsx from 'clsx';

// ── Helpers ──────────────────────────────────────────────────────────────────
function monthLabel(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('es', { month: 'long', year: 'numeric' });
}
function prevMonth(month) {
  const [y, m] = month.split('-').map(Number);
  return `${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, '0')}`;
}
function nextMonth(month) {
  const [y, m] = month.split('-').map(Number);
  return `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}`;
}
function currentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
function toPascal(name) {
  return (name || 'tag').split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
}
function LucideIcon({ name, size = 15, style, className }) {
  const Icon = LucideIcons[toPascal(name)] || LucideIcons.Tag;
  return <Icon size={size} style={style} className={className} />;
}

const FREQ_LABEL = { weekly: 'Semanal', biweekly: 'Quincenal', monthly: 'Mensual', yearly: 'Anual' };

// ── Category detail modal ─────────────────────────────────────────────────────
function CategoryDetailModal({ open, onClose, item, month, currency }) {
  const { fetchBudgetCategoryDetail } = useStore();
  const [txns,    setTxns]    = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !item) return;
    setLoading(true);
    fetchBudgetCategoryDetail(item.category_id, month)
      .then(setTxns)
      .finally(() => setLoading(false));
  }, [open, item?.category_id, month]);

  const total = txns.reduce((s, t) => s + Number(t.amount), 0);

  return (
    <Modal open={open} onClose={onClose} title={item?.category_name || ''} size="md">
      {loading ? <Spinner /> : (
        <div className="space-y-3">
          {/* Summary bar */}
          {item && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
              <div>
                <p className="text-xs text-[var(--text-muted)]">Gastado del presupuesto</p>
                <p className="text-sm font-bold text-mono">
                  {fmt.currency(item.spent, currency)}
                  {item.budget > 0 && <span className="text-[var(--text-muted)] font-normal"> / {fmt.currency(item.budget, currency)}</span>}
                </p>
              </div>
              {item.budget > 0 && (
                <div className="text-right">
                  <p className="text-xs text-[var(--text-muted)]">Disponible</p>
                  <p className={clsx('text-sm font-bold text-mono', item.budget - item.spent < 0 ? 'text-rose-500' : 'text-green-500')}>
                    {fmt.currency(item.budget - item.spent, currency)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Transaction list */}
          {txns.length === 0 ? (
            <p className="text-sm text-center text-[var(--text-muted)] py-6">Sin transacciones este mes</p>
          ) : (
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {txns.map(t => (
                <div key={t.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{t.description || item?.category_name}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {fmt.date(t.txn_date)}
                      {t.card_name && ` · ${t.card_name}${t.last_four ? ` ···${t.last_four}` : ''}`}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-mono text-rose-500 flex-shrink-0 ml-3">
                    -{fmt.currency(t.amount, currency)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {txns.length > 1 && (
            <div className="flex justify-between items-center pt-2 border-t border-[var(--border)] text-sm font-semibold">
              <span>{txns.length} transacciones</span>
              <span className="text-mono text-rose-500">-{fmt.currency(total, currency)}</span>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Budget() {
  const {
    budgets, budgetsLoading, fetchBudgets, saveBudget, deleteBudget,
    copyBudgetsFromLastMonth, user,
  } = useStore();
  const currency = user?.currency || 'USD';

  const [month,      setMonth]      = useState(currentYearMonth());
  const [modal,      setModal]      = useState(false);
  const [editItem,   setEditItem]   = useState(null);
  const [delItem,    setDelItem]    = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [amount,     setAmount]     = useState('');
  const [newCatId,   setNewCatId]   = useState('');
  const [busy,       setBusy]       = useState(false);
  const [copied,     setCopied]     = useState(false);
  const [tab,        setTab]        = useState('budgets'); // 'budgets' | 'obligations'

  useEffect(() => { fetchBudgets(month); }, [month]);

  const items      = budgets?.items      || [];
  const categories = budgets?.categories || [];
  const recurring  = budgets?.recurring  || [];
  const debts      = budgets?.debts      || [];
  const goals      = budgets?.goals      || [];
  const unbudgeted = categories.filter(c => !items.find(i => i.category_id === c.id));

  const totalBudget = items.reduce((s, i) => s + (i.budget || 0), 0);
  const totalSpent  = items.reduce((s, i) => s + (i.spent  || 0), 0);

  // Total de compromisos fijos del mes
  const totalObligations =
    recurring.reduce((s, r) => s + Number(r.amount), 0) +
    debts.reduce((s, d)    => s + Number(d.monthly_payment), 0) +
    goals.filter(g => g.monthly_needed).reduce((s, g) => s + g.monthly_needed, 0);

  const openAdd = () => { setEditItem(null); setAmount(''); setNewCatId(''); setModal(true); };
  const openEdit = (item) => { setEditItem(item); setAmount(String(item.budget)); setModal(true); };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const category_id = editItem ? editItem.category_id : Number(newCatId);
      await saveBudget({ category_id, amount: Number(amount), month });
      setModal(false);
      fetchBudgets(month);
    } finally { setBusy(false); }
  };

  const confirmDelete = async () => {
    await deleteBudget(delItem.category_id, month);
    setDelItem(null);
    fetchBudgets(month);
  };

  const handleCopy = async () => {
    setBusy(true);
    try {
      await copyBudgetsFromLastMonth(month);
      fetchBudgets(month);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } finally { setBusy(false); }
  };

  // Import a recurring transaction as a budget entry
  const importRecurring = async (rec) => {
    await saveBudget({ category_id: rec.category_id, amount: Number(rec.amount), month });
    fetchBudgets(month);
  };

  return (
    <div className="space-y-5 animate-fade-up">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-display font-bold text-xl">Presupuesto</h1>
          <p className="text-[var(--text-muted)] text-sm capitalize">{monthLabel(month)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleCopy} disabled={busy} className="btn-ghost text-xs gap-1.5">
            <LucideIcons.Copy size={13} />
            {copied ? '¡Copiado!' : 'Copiar mes anterior'}
          </button>
          <button onClick={openAdd} className="btn-primary gap-1.5">
            <LucideIcons.Plus size={15} /> Agregar
          </button>
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center gap-2">
        <button onClick={() => setMonth(prevMonth(month))} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700">
          <LucideIcons.ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold capitalize min-w-[160px] text-center">{monthLabel(month)}</span>
        <button onClick={() => setMonth(nextMonth(month))} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700">
          <LucideIcons.ChevronRight size={16} />
        </button>
        {month !== currentYearMonth() && (
          <button onClick={() => setMonth(currentYearMonth())} className="text-xs text-brand-500 hover:underline ml-1">Hoy</button>
        )}
      </div>

      {/* Summary cards */}
      {(items.length > 0 || totalObligations > 0) && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="card !p-3 sm:!p-4">
            <p className="text-[10px] sm:text-xs text-[var(--text-muted)] mb-1 leading-tight">Presupuestado</p>
            <p className="text-display font-bold text-sm sm:text-lg text-mono truncate">{fmt.currency(totalBudget, currency)}</p>
          </div>
          <div className="card !p-3 sm:!p-4">
            <p className="text-[10px] sm:text-xs text-[var(--text-muted)] mb-1 leading-tight">Gastado</p>
            <p className={clsx('text-display font-bold text-sm sm:text-lg text-mono truncate', totalSpent > totalBudget ? 'text-rose-500' : '')}>
              {fmt.currency(totalSpent, currency)}
            </p>
          </div>
          <div className="card !p-3 sm:!p-4">
            <p className="text-[10px] sm:text-xs text-[var(--text-muted)] mb-1 leading-tight">Disponible</p>
            <p className={clsx('text-display font-bold text-sm sm:text-lg text-mono truncate', totalBudget - totalSpent < 0 ? 'text-rose-500' : 'text-green-500')}>
              {fmt.currency(totalBudget - totalSpent, currency)}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface-100 dark:bg-surface-800 rounded-xl w-fit">
        {[['budgets', 'Presupuesto'], ['obligations', `Compromisos${totalObligations > 0 ? '' : ''}`]].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)}
            className={clsx(
              'px-4 py-1.5 rounded-lg text-xs font-medium transition-all',
              tab === v ? 'bg-[var(--bg-card)] shadow text-[var(--text)]' : 'text-[var(--text-muted)]'
            )}>
            {l}
            {v === 'obligations' && totalObligations > 0 && (
              <span className="ml-1.5 text-[10px] text-[var(--text-muted)]">{fmt.currency(totalObligations, currency)}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB: PRESUPUESTO ── */}
      {tab === 'budgets' && (
        budgetsLoading ? <Spinner /> : items.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 py-10 text-center">
            <LucideIcons.PiggyBank size={32} className="text-[var(--text-muted)] opacity-40" />
            <p className="font-semibold">Sin presupuesto para este mes</p>
            <p className="text-xs text-[var(--text-muted)]">Agrega límites por categoría o importa tus recurrentes</p>
            <button onClick={openAdd} className="btn-primary text-xs mt-1">+ Agregar presupuesto</button>
          </div>
        ) : (
          <div className="card space-y-4">
            {items.map(item => {
              const pct      = item.budget > 0 ? Math.min(100, (item.spent / item.budget) * 100) : 0;
              const over     = item.spent > item.budget && item.budget > 0;
              const warning  = pct >= 90 && !over;
              const barColor = over ? '#ef4444' : warning ? '#f59e0b' : item.color || '#6366f1';
              return (
                <div key={item.category_id}>
                  <div className="flex items-start justify-between mb-1.5 gap-2">
                    <button
                      className="flex items-center gap-2 min-w-0 flex-1 text-left hover:opacity-80 transition-opacity"
                      onClick={() => setDetailItem(item)}
                    >
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5" style={{ background: item.color || '#6366f1' }} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-sm font-medium truncate">{item.category_name}</span>
                          {over    && <span className="text-[10px] font-semibold text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-1.5 py-0.5 rounded">Excedido</span>}
                          {warning && <span className="text-[10px] font-semibold text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded">+90%</span>}
                        </div>
                        <span className="text-xs text-mono text-[var(--text-muted)]">
                          {fmt.currency(item.spent, currency)} / {fmt.currency(item.budget, currency)}
                        </span>
                      </div>
                    </button>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-surface-100 dark:hover:bg-surface-700">
                        <LucideIcons.Pencil size={12} className="text-[var(--text-muted)]" />
                      </button>
                      <button onClick={() => setDelItem(item)} className="p-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20">
                        <LucideIcons.Trash2 size={12} className="text-rose-400" />
                      </button>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-surface-100 dark:bg-surface-700 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: barColor }} />
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5 text-right">{pct.toFixed(0)}% utilizado</p>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── TAB: COMPROMISOS ── */}
      {tab === 'obligations' && (
        <div className="space-y-4">

          {/* Transacciones recurrentes */}
          {recurring.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Recurrentes</h2>
              <div className="card space-y-1 !p-2">
                {recurring.map(r => {
                  const alreadyBudgeted = items.some(i => i.category_id === r.category_id);
                  return (
                    <div key={r.id} className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors">
                      <span className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: (r.color || '#6366f1') + '22' }}>
                        <LucideIcon name={r.icon} size={14} style={{ color: r.color || '#6366f1' }} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{r.description || r.category_name}</p>
                        <p className="text-xs text-[var(--text-muted)]">{r.category_name} · {FREQ_LABEL[r.frequency] || r.frequency}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-semibold text-mono">{fmt.currency(r.amount, currency)}</span>
                        {!alreadyBudgeted ? (
                          <button
                            onClick={() => importRecurring(r)}
                            title="Agregar al presupuesto"
                            className="p-1.5 rounded-lg bg-brand-500/10 text-brand-500 hover:bg-brand-500/20 transition-colors">
                            <LucideIcons.Plus size={13} />
                          </button>
                        ) : (
                          <span className="text-[10px] text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded font-medium">
                            En presupuesto
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Préstamos */}
          {debts.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Cuotas de préstamos</h2>
              <div className="card space-y-1 !p-2">
                {debts.map(d => (
                  <div key={d.id} className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors">
                    <span className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-rose-500/10">
                      <LucideIcons.Wallet size={14} className="text-rose-500" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{d.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">Saldo: {fmt.currency(d.current_balance, currency)} · Día {d.payment_day}</p>
                    </div>
                    <span className="text-sm font-semibold text-mono text-rose-500">{fmt.currency(d.monthly_payment, currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metas de ahorro */}
          {goals.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Metas de ahorro</h2>
              <div className="card space-y-1 !p-2">
                {goals.map(g => (
                  <div key={g.id} className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors">
                    <span className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: (g.color || '#6366f1') + '22' }}>
                      <LucideIcon name={g.icon} size={14} style={{ color: g.color || '#6366f1' }} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{g.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {fmt.currency(g.current_amount, currency)} / {fmt.currency(g.target_amount, currency)}
                        {g.deadline && ` · ${fmt.date(g.deadline)}`}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-mono text-brand-500">
                      {g.monthly_needed ? fmt.currency(g.monthly_needed, currency) + '/mes' : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recurring.length === 0 && debts.length === 0 && goals.length === 0 && (
            <div className="card flex flex-col items-center gap-3 py-10 text-center">
              <LucideIcons.CalendarCheck size={32} className="text-[var(--text-muted)] opacity-40" />
              <p className="font-semibold">Sin compromisos registrados</p>
              <p className="text-xs text-[var(--text-muted)]">Agrega transacciones recurrentes, préstamos o metas de ahorro</p>
            </div>
          )}

          {/* Resumen total compromisos */}
          {totalObligations > 0 && (
            <div className="card flex items-center justify-between !py-3">
              <span className="text-sm font-semibold">Total compromisos del mes</span>
              <span className="text-sm font-bold text-mono text-rose-500">{fmt.currency(totalObligations, currency)}</span>
            </div>
          )}
        </div>
      )}

      {/* Category detail modal */}
      <CategoryDetailModal
        open={!!detailItem}
        onClose={() => setDetailItem(null)}
        item={detailItem}
        month={month}
        currency={currency}
      />

      {/* Add/Edit modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editItem ? `Editar – ${editItem.category_name}` : 'Agregar presupuesto'}>
        <form onSubmit={save} className="space-y-4">
          {!editItem && (
            <div>
              <label className="label">Categoría</label>
              <select className="input" value={newCatId} onChange={e => setNewCatId(e.target.value)} required>
                <option value="">Seleccionar categoría...</option>
                {unbudgeted.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="label">Monto del presupuesto</label>
            <input className="input" type="number" step="0.01" min="0.01" placeholder="0.00"
              value={amount} onChange={e => setAmount(e.target.value)} required />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setModal(false)} className="btn-ghost flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={busy} className="btn-primary flex-1 justify-center">
              {busy ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>

      <Confirm
        open={!!delItem}
        onClose={() => setDelItem(null)}
        onConfirm={confirmDelete}
        title="Eliminar presupuesto"
        message={`¿Eliminar el presupuesto de "${delItem?.category_name}" para ${monthLabel(month)}?`}
      />
    </div>
  );
}
