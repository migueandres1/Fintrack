import { useEffect, useState, useCallback } from 'react';
import * as LucideIcons from 'lucide-react';
import { useStore }  from '../store/index.js';
import { fmt }       from '../utils/format.js';
import { Modal, Confirm, Spinner } from '../components/ui/index.jsx';
import clsx from 'clsx';

// ── Helpers ───────────────────────────────────────────────────────────────────
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

// ── Category detail modal (transactions + history) ────────────────────────────
function CategoryDetailModal({ open, onClose, item, month, currency, onBudgetRefresh }) {
  const { fetchBudgetCategoryDetail, fetchBudgetCategoryHistory, deleteTransaction } = useStore();
  const [txns,      setTxns]      = useState([]);
  const [history,   setHistory]   = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = () => {
    if (!item) return;
    setLoading(true);
    Promise.all([
      fetchBudgetCategoryDetail(item.category_id, month),
      fetchBudgetCategoryHistory(item.category_id, month, 4),
    ]).then(([t, h]) => { setTxns(t); setHistory(h); }).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!open || !item) return;
    load();
  }, [open, item?.category_id, month]);

  const handleDeleteTxn = async (id) => {
    setDeletingId(id);
    try {
      await deleteTransaction(id);
      setTxns(prev => prev.filter(t => t.id !== id));
      if (onBudgetRefresh) onBudgetRefresh();
    } finally {
      setDeletingId(null);
    }
  };

  const total    = txns.reduce((s, t) => s + Number(t.amount), 0);
  const maxSpent = Math.max(...history.map(h => Math.max(h.spent, h.budget || 0)), 1);

  return (
    <Modal open={open} onClose={onClose} title={item?.category_name || ''} size="md">
      {loading ? <Spinner /> : (
        <div className="space-y-4">
          {/* Budget vs spent summary */}
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
                  <p className={clsx('text-sm font-bold text-mono', item.budget - item.spent < 0 ? 'text-rose-500' : 'text-emerald-500')}>
                    {fmt.currency(item.budget - item.spent, currency)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Historical mini-bars (last 4 months) */}
          {history.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">Últimos meses</p>
              <div className="flex items-end gap-2">
                {history.map(h => (
                  <div key={h.month} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full relative h-14 flex items-end gap-0.5">
                      {/* Budget bar (background) */}
                      {h.budget > 0 && (
                        <div
                          className="flex-1 rounded-sm bg-[var(--border)] opacity-60"
                          style={{ height: `${Math.round((h.budget / maxSpent) * 100)}%` }}
                        />
                      )}
                      {/* Spent bar */}
                      <div
                        className={clsx(
                          'flex-1 rounded-sm',
                          h.spent > h.budget && h.budget > 0 ? 'bg-rose-400' : 'bg-brand-500'
                        )}
                        style={{ height: `${Math.round((h.spent / maxSpent) * 100)}%`, minHeight: h.spent > 0 ? 2 : 0 }}
                      />
                    </div>
                    <span className="text-[9px] text-[var(--text-muted)] capitalize">{h.label}</span>
                    <span className="text-[9px] font-medium text-mono text-[var(--text)]">{fmt.currency(h.spent, currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transactions */}
          {txns.length === 0 ? (
            <p className="text-sm text-center text-[var(--text-muted)] py-4">Sin transacciones este mes</p>
          ) : (
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {txns.map(t => (
                <div key={t.id} className="group flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[var(--surface-2)] transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{t.description || item?.category_name}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {fmt.date(t.txn_date)}
                      {t.card_name && ` · ${t.card_name}${t.last_four ? ` ···${t.last_four}` : ''}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <span className="text-sm font-semibold text-mono text-rose-500">
                      -{fmt.currency(t.amount, currency)}
                    </span>
                    <button
                      onClick={() => handleDeleteTxn(t.id)}
                      disabled={deletingId === t.id}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-400 transition-all"
                      title="Eliminar transacción"
                    >
                      <LucideIcons.Trash2 size={13} />
                    </button>
                  </div>
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

// ── Import debt modal ─────────────────────────────────────────────────────────
function ImportDebtModal({ open, onClose, debt, categories, onImport }) {
  const [catId, setCatId] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (open && debt) {
      setAmount(String(debt.monthly_payment));
      const debtCat = categories.find(c => /deuda/i.test(c.name));
      setCatId(debtCat ? String(debtCat.id) : '');
    }
  }, [open, debt]);

  const handleImport = () => {
    if (!catId || !amount) return;
    onImport({ category_id: Number(catId), name: debt.name, amount: Number(amount) });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Agregar deuda al presupuesto" size="sm">
      <div className="space-y-4">
        <div>
          <label className="label">Categoría</label>
          <select className="input" value={catId} onChange={e => setCatId(e.target.value)}>
            <option value="">Seleccionar...</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Monto</label>
          <input className="input" type="number" step="0.01" min="0.01" value={amount}
            onChange={e => setAmount(e.target.value)} />
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="btn-ghost flex-1 justify-center">Cancelar</button>
          <button onClick={handleImport} disabled={!catId || !amount} className="btn-primary flex-1 justify-center">
            Agregar
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Inline add-line form ──────────────────────────────────────────────────────
function AddLineForm({ categoryId, month, suggestions, currency, onSave, onCancel }) {
  const [name,   setName]   = useState('');
  const [amount, setAmount] = useState('');
  const [busy,   setBusy]   = useState(false);

  const suggestion = suggestions[categoryId];

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onSave({ category_id: categoryId, name, amount: Number(amount), month });
      setName(''); setAmount('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-2 ml-4 flex items-center gap-2 flex-wrap">
      <input
        className="input !py-1 !text-sm flex-1 min-w-[120px]"
        placeholder="Descripción (opcional)"
        value={name}
        onChange={e => setName(e.target.value)}
      />
      <div className="flex items-center gap-1">
        <input
          className="input !py-1 !text-sm w-28"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          required
        />
        {suggestion && !amount && (
          <button type="button" onClick={() => setAmount(String(suggestion))}
            className="text-[10px] text-brand-500 hover:underline whitespace-nowrap">
            Sugerido: {fmt.currency(suggestion, currency)}
          </button>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button type="submit" disabled={busy || !amount} className="btn-primary !py-1 !text-xs gap-1">
          <LucideIcons.Check size={12} /> {busy ? '...' : 'Guardar'}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost !py-1 !text-xs">
          <LucideIcons.X size={12} />
        </button>
      </div>
    </form>
  );
}

// ── Category row with inline lines ────────────────────────────────────────────
function CategoryRow({ item, month, currency, suggestions, onAddLine, onEditLine, onDeleteLine, onShowDetail, onShowTransactions }) {
  const [addingLine, setAddingLine]   = useState(false);
  const [editingId,  setEditingId]    = useState(null);
  const [editAmount, setEditAmount]   = useState('');
  const [editName,   setEditName]     = useState('');
  const [busy,       setBusy]         = useState(false);

  const pct      = item.budget > 0 ? Math.min(100, (item.spent / item.budget) * 100) : 0;
  const over     = item.spent > item.budget && item.budget > 0;
  const warning  = pct >= 90 && !over;
  const barColor = over ? '#ef4444' : warning ? '#f59e0b' : item.color || '#6366f1';

  const startEdit = (line) => {
    setEditingId(line.id);
    setEditAmount(String(line.amount));
    setEditName(line.name);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onEditLine({ id: editingId, category_id: item.category_id, name: editName, amount: Number(editAmount), month });
      setEditingId(null);
    } finally {
      setBusy(false);
    }
  };

  const handleAddLine = async (payload) => {
    await onAddLine(payload);
    setAddingLine(false);
  };

  return (
    <div className="py-3 border-b border-[var(--border)] last:border-0">
      {/* Category header */}
      <div className="flex items-start justify-between mb-1.5 gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5" style={{ background: item.color || '#6366f1' }} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold">{item.category_name}</span>
              {over    && <span className="text-[10px] font-semibold text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-1.5 py-0.5 rounded">Excedido</span>}
              {warning && <span className="text-[10px] font-semibold text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded">+90%</span>}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-mono text-[var(--text-muted)]">
              <span className={clsx(over && 'text-rose-500')}>{fmt.currency(item.spent, currency)}</span>
              {item.budget > 0 && <span>/ {fmt.currency(item.budget, currency)}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button onClick={() => onShowTransactions(item)}
            title="Ver transacciones"
            className="p-1.5 rounded hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)]">
            <LucideIcons.List size={12} />
          </button>
          <button onClick={() => setAddingLine(v => !v)}
            title="Agregar línea"
            className="p-1.5 rounded hover:bg-brand-500/10 text-brand-500">
            <LucideIcons.Plus size={12} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {item.budget > 0 && (
        <>
          <div className="h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden mb-1">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: barColor }} />
          </div>
          <p className="text-[10px] text-[var(--text-muted)] text-right">{pct.toFixed(0)}%</p>
        </>
      )}

      {/* Budget lines */}
      {item.lines.length > 0 && (
        <div className="mt-2 space-y-1">
          {item.lines.map(line => (
            <div key={line.id} className="ml-4 flex items-center gap-2">
              <LucideIcons.Minus size={10} className="text-[var(--text-muted)] flex-shrink-0" />
              {editingId === line.id ? (
                <form onSubmit={saveEdit} className="flex items-center gap-1.5 flex-1 flex-wrap">
                  <input
                    className="input !py-0.5 !text-xs flex-1 min-w-[100px]"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="Descripción"
                  />
                  <input
                    className="input !py-0.5 !text-xs w-24"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editAmount}
                    onChange={e => setEditAmount(e.target.value)}
                    required
                  />
                  <button type="submit" disabled={busy} className="p-1 rounded text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                    <LucideIcons.Check size={12} />
                  </button>
                  <button type="button" onClick={() => setEditingId(null)} className="p-1 rounded text-[var(--text-muted)] hover:bg-[var(--surface-2)]">
                    <LucideIcons.X size={12} />
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-xs text-[var(--text-muted)] truncate flex-1">
                    {line.name || <span className="italic opacity-60">Sin nombre</span>}
                  </span>
                  <span className="text-xs font-semibold text-mono flex-shrink-0">{fmt.currency(line.amount, currency)}</span>
                  <button onClick={() => startEdit(line)}
                    className="p-1 rounded hover:bg-[var(--surface-2)] text-[var(--text-muted)] opacity-0 group-hover:opacity-100 flex-shrink-0">
                    <LucideIcons.Pencil size={10} />
                  </button>
                  <button onClick={() => onDeleteLine(line.id, item.category_name, line.name)}
                    className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-400 flex-shrink-0">
                    <LucideIcons.Trash2 size={10} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Inline add form */}
      {addingLine && (
        <AddLineForm
          categoryId={item.category_id}
          month={month}
          suggestions={suggestions}
          currency={currency}
          onSave={handleAddLine}
          onCancel={() => setAddingLine(false)}
        />
      )}

      {/* No lines yet — show add prompt inline */}
      {item.lines.length === 0 && !addingLine && (
        <button onClick={() => setAddingLine(true)}
          className="ml-4 mt-1 text-xs text-[var(--text-muted)] hover:text-brand-500 transition-colors flex items-center gap-1">
          <LucideIcons.Plus size={11} /> Agregar línea de presupuesto
        </button>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Budget() {
  const {
    budgets, budgetsLoading, fetchBudgets, saveBudget, deleteBudgetLine,
    copyBudgetsFromLastMonth, addPlannedIncome, removePlannedIncome,
    fetchBudgetSuggestions, user,
  } = useStore();
  const currency = user?.currency || 'USD';

  const [month,       setMonth]       = useState(currentYearMonth());
  const [detailItem,  setDetailItem]  = useState(null);
  const [importDebt,  setImportDebt]  = useState(null);
  const [incomeModal, setIncomeModal] = useState(false);
  const [incomeForm,  setIncomeForm]  = useState({ description: '', amount: '' });
  const [addCatModal, setAddCatModal] = useState(false);
  const [addCatForm,  setAddCatForm]  = useState({ category_id: '', name: '', amount: '' });
  const [delLine,     setDelLine]     = useState(null); // { id, categoryName, lineName }
  const [busy,        setBusy]        = useState(false);
  const [copied,      setCopied]      = useState(false);
  const [tab,         setTab]         = useState('budgets');
  const [suggestions, setSuggestions] = useState({}); // categoryId → avg_spent

  useEffect(() => {
    fetchBudgets(month);
    fetchBudgetSuggestions(month).then(data => {
      const map = {};
      data.forEach(s => { map[s.category_id] = Number(s.avg_spent); });
      setSuggestions(map);
    }).catch(() => {});
  }, [month]);

  const items         = budgets?.items         || [];
  const categories    = budgets?.categories    || [];
  const recurring     = budgets?.recurring     || [];
  const debts         = budgets?.debts         || [];
  const goals         = budgets?.goals         || [];
  const plannedIncome = budgets?.planned_income || [];

  const recurringExpense = recurring.filter(r => r.type === 'expense');
  const recurringIncome  = recurring.filter(r => r.type === 'income');

  const totalBudget = items.reduce((s, i) => s + (i.budget || 0), 0);
  const totalSpent  = items.reduce((s, i) => s + (i.spent  || 0), 0);

  const totalPlannedIncome =
    recurringIncome.reduce((s, r)  => s + Number(r.amount), 0) +
    plannedIncome.reduce((s, p)    => s + Number(p.amount), 0);

  const totalObligations =
    recurringExpense.reduce((s, r) => s + Number(r.amount), 0) +
    debts.reduce((s, d)            => s + Number(d.monthly_payment), 0) +
    goals.filter(g => g.monthly_needed).reduce((s, g) => s + g.monthly_needed, 0);

  const projectedBalance = totalPlannedIncome - totalObligations;
  const unassigned       = totalPlannedIncome - totalBudget;
  const globalPct        = totalBudget > 0 ? Math.min(100, (totalSpent / totalBudget) * 100) : 0;

  // Categories with spending but no budget
  const unbudgetedWithSpending = items.filter(i => !i.budget && i.spent > 0);
  // Categories with budget or spending
  const budgetedItems = items.filter(i => i.budget > 0 || i.lines.length > 0);

  const addLine = async (payload) => {
    await saveBudget(payload);
    fetchBudgets(month);
  };

  const editLine = async (payload) => {
    await saveBudget(payload);
    fetchBudgets(month);
  };

  const confirmDeleteLine = async () => {
    const id = delLine.id;
    setDelLine(null);
    try {
      await deleteBudgetLine(id);
      fetchBudgets(month);
    } catch (err) {
      console.error('Error al eliminar línea de presupuesto:', err);
      fetchBudgets(month);
    }
  };

  const handleCopy = async () => {
    setBusy(true);
    try {
      await copyBudgetsFromLastMonth(month);
      fetchBudgets(month);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } finally {
      setBusy(false);
    }
  };

  const importRecurring = async (rec) => {
    await saveBudget({ category_id: rec.category_id, name: rec.description || rec.category_name, amount: Number(rec.amount), month });
    fetchBudgets(month);
  };

  const handleImportDebt = async (payload) => {
    await saveBudget({ ...payload, month });
    fetchBudgets(month);
  };

  const saveIncome = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await addPlannedIncome({ month, description: incomeForm.description || 'Ingreso', amount: Number(incomeForm.amount) });
      setIncomeModal(false);
      setIncomeForm({ description: '', amount: '' });
      fetchBudgets(month);
    } finally {
      setBusy(false);
    }
  };

  // Presupuestar meta: agrega línea al presupuesto (no registra aporte real)
  const budgetGoal = async (g) => {
    const savingsCat = categories.find(c => /ahorro/i.test(c.name)) || categories[0];
    if (!savingsCat) return;
    await saveBudget({ category_id: savingsCat.id, name: g.name, amount: g.monthly_needed || 0, month });
    fetchBudgets(month);
  };

  const saveAddCat = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await saveBudget({ category_id: Number(addCatForm.category_id), name: addCatForm.name, amount: Number(addCatForm.amount), month });
      setAddCatModal(false);
      setAddCatForm({ category_id: '', name: '', amount: '' });
      fetchBudgets(month);
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveIncome = async (id) => {
    await removePlannedIncome(id);
    fetchBudgets(month);
  };

  // Assign budget to unbudgeted category
  const assignQuick = async (item) => {
    await saveBudget({ category_id: item.category_id, name: '', amount: item.spent, month });
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
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center gap-2">
        <button onClick={() => setMonth(prevMonth(month))} className="p-1.5 rounded-lg hover:bg-[var(--surface-2)]">
          <LucideIcons.ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold capitalize min-w-[160px] text-center">{monthLabel(month)}</span>
        <button onClick={() => setMonth(nextMonth(month))} className="p-1.5 rounded-lg hover:bg-[var(--surface-2)]">
          <LucideIcons.ChevronRight size={16} />
        </button>
        {month !== currentYearMonth() && (
          <button onClick={() => setMonth(currentYearMonth())} className="text-xs text-brand-500 hover:underline ml-1">Hoy</button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className="card !p-3 sm:!p-4">
          <p className="text-[10px] sm:text-xs text-[var(--text-muted)] mb-1 leading-tight">Presupuestado</p>
          <p className="text-display font-bold text-sm sm:text-base text-mono truncate">{fmt.currency(totalBudget, currency)}</p>
        </div>
        <div className="card !p-3 sm:!p-4">
          <p className="text-[10px] sm:text-xs text-[var(--text-muted)] mb-1 leading-tight">Gastado</p>
          <p className={clsx('text-display font-bold text-sm sm:text-base text-mono truncate', totalSpent > totalBudget && totalBudget > 0 ? 'text-rose-500' : '')}>
            {fmt.currency(totalSpent, currency)}
          </p>
        </div>
        <div className="card !p-3 sm:!p-4">
          <p className="text-[10px] sm:text-xs text-[var(--text-muted)] mb-1 leading-tight">Ingresos planif.</p>
          <p className="text-display font-bold text-sm sm:text-base text-mono truncate text-emerald-500">
            {fmt.currency(totalPlannedIncome, currency)}
          </p>
        </div>
        <div className="card !p-3 sm:!p-4">
          <p className="text-[10px] sm:text-xs text-[var(--text-muted)] mb-1 leading-tight">Balance proy.</p>
          <p className={clsx('text-display font-bold text-sm sm:text-base text-mono truncate', projectedBalance >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
            {fmt.currency(projectedBalance, currency)}
          </p>
        </div>
      </div>

      {/* ── Barra de salud global + Sin asignar ── */}
      {totalBudget > 0 && (
        <div className="card !p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[var(--text)]">
              {fmt.currency(totalSpent, currency)} <span className="text-[var(--text-muted)] font-normal">de {fmt.currency(totalBudget, currency)}</span>
            </span>
            <span className={clsx('font-semibold', globalPct >= 100 ? 'text-rose-500' : globalPct >= 90 ? 'text-amber-500' : 'text-[var(--text-muted)]')}>
              {globalPct.toFixed(0)}% utilizado
            </span>
          </div>
          <div className="h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
            <div
              className={clsx('h-full rounded-full transition-all duration-700', globalPct >= 100 ? 'bg-rose-500' : globalPct >= 90 ? 'bg-amber-500' : 'bg-brand-500')}
              style={{ width: `${globalPct}%` }}
            />
          </div>
          {totalPlannedIncome > 0 && (
            <div className="flex items-center gap-1.5 pt-1">
              {unassigned > 0 ? (
                <>
                  <LucideIcons.CircleDollarSign size={12} className="text-emerald-500" />
                  <span className="text-xs text-[var(--text-muted)]">
                    Tienes <span className="font-semibold text-emerald-600 dark:text-emerald-400">{fmt.currency(unassigned, currency)}</span> sin asignar a ninguna categoría
                  </span>
                </>
              ) : unassigned < 0 ? (
                <>
                  <LucideIcons.AlertTriangle size={12} className="text-amber-500" />
                  <span className="text-xs text-amber-600 dark:text-amber-400">
                    Has presupuestado {fmt.currency(Math.abs(unassigned), currency)} más de tus ingresos planificados
                  </span>
                </>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[var(--surface-2)] rounded-xl w-fit">
        {[['budgets', 'Presupuesto'], ['obligations', 'Compromisos']].map(([v, l]) => (
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
        budgetsLoading ? <Spinner /> : (
          <>
            {/* Botón agregar categoría */}
            <div className="flex justify-end">
              <button onClick={() => { setAddCatForm({ category_id: '', name: '', amount: '' }); setAddCatModal(true); }}
                className="btn-primary gap-1.5 text-sm">
                <LucideIcons.Plus size={14} /> Agregar categoría
              </button>
            </div>

            {budgetedItems.length === 0 && unbudgetedWithSpending.length === 0 ? (
              <div className="card flex flex-col items-center gap-3 py-10 text-center">
                <LucideIcons.PiggyBank size={32} className="text-[var(--text-muted)] opacity-40" />
                <p className="font-semibold">Sin presupuesto para este mes</p>
                <p className="text-xs text-[var(--text-muted)]">Agrega una categoría con el botón de arriba</p>
              </div>
            ) : (
              <>
                {/* Budgeted categories */}
                {budgetedItems.length > 0 && (
                  <div className="card group !px-4 !py-0">
                    {budgetedItems.map(item => (
                      <CategoryRow
                        key={item.category_id}
                        item={item}
                        month={month}
                        currency={currency}
                        suggestions={suggestions}
                        onAddLine={addLine}
                        onEditLine={editLine}
                        onDeleteLine={(id, categoryName, lineName) => setDelLine({ id, categoryName, lineName })}
                        onShowTransactions={(it) => setDetailItem(it)}
                      />
                    ))}
                  </div>
                )}

                {/* ── Sin presupuesto: categorías con gastos sin asignar ── */}
                {unbudgetedWithSpending.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <LucideIcons.AlertCircle size={13} className="text-amber-500" />
                      <h2 className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                        {unbudgetedWithSpending.length} {unbudgetedWithSpending.length === 1 ? 'categoría con gastos' : 'categorías con gastos'} sin presupuesto
                      </h2>
                    </div>
                    <div className="card !p-2 space-y-1">
                      {unbudgetedWithSpending.map(item => (
                        <div key={item.category_id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color || '#6366f1' }} />
                          <span className="text-sm flex-1">{item.category_name}</span>
                          <span className="text-sm font-semibold text-mono text-rose-500">{fmt.currency(item.spent, currency)}</span>
                          <button onClick={() => assignQuick(item)}
                            className="text-xs btn-ghost !py-1 gap-1 text-brand-500 border-brand-500/30">
                            <LucideIcons.Plus size={11} /> Asignar
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </>
            )}
          </>
        )
      )}

      {/* ── TAB: COMPROMISOS ── */}
      {tab === 'obligations' && (
        <div className="space-y-5">

          {/* Ingresos */}
          {(recurringIncome.length > 0 || plannedIncome.length > 0) && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Ingresos del mes</h2>
                <button onClick={() => setIncomeModal(true)}
                  className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-400 transition-colors">
                  <LucideIcons.Plus size={12} /> Agregar ingreso único
                </button>
              </div>
              <div className="card space-y-1 !p-2">
                {recurringIncome.map(r => (
                  <div key={r.id} className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors">
                    <span className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: (r.color || '#22c55e') + '22' }}>
                      <LucideIcon name={r.icon} size={14} style={{ color: r.color || '#22c55e' }} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.description || r.category_name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{r.category_name} · {FREQ_LABEL[r.frequency] || r.frequency}</p>
                    </div>
                    <span className="text-sm font-semibold text-mono text-emerald-500">{fmt.currency(r.amount, currency)}</span>
                  </div>
                ))}
                {plannedIncome.map(p => (
                  <div key={p.id} className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors">
                    <span className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-emerald-500/10">
                      <LucideIcons.CircleDollarSign size={14} className="text-emerald-500" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.description}</p>
                      <p className="text-xs text-[var(--text-muted)]">Ingreso único</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold text-mono text-emerald-500">{fmt.currency(p.amount, currency)}</span>
                      <button onClick={() => handleRemoveIncome(p.id)}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-colors">
                        <LucideIcons.Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recurringIncome.length === 0 && plannedIncome.length === 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Ingresos del mes</h2>
              </div>
              <button onClick={() => setIncomeModal(true)}
                className="w-full card border-dashed flex items-center justify-center gap-2 py-4 text-sm text-[var(--text-muted)] hover:text-brand-500 hover:border-brand-400 transition-colors">
                <LucideIcons.Plus size={14} /> Agregar ingreso único
              </button>
            </div>
          )}

          {/* Gastos recurrentes */}
          {recurringExpense.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Gastos recurrentes</h2>
              <div className="card space-y-1 !p-2">
                {recurringExpense.map(r => {
                  const alreadyBudgeted = items.some(i => i.category_id === r.category_id &&
                    i.lines.some(l => l.name === (r.description || r.category_name)));
                  return (
                    <div key={r.id} className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors">
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
                          <button onClick={() => importRecurring(r)} title="Agregar al presupuesto"
                            className="p-1.5 rounded-lg bg-brand-500/10 text-brand-500 hover:bg-brand-500/20 transition-colors">
                            <LucideIcons.Plus size={13} />
                          </button>
                        ) : (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded font-medium">
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
                  <div key={d.id} className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors">
                    <span className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-rose-500/10">
                      <LucideIcons.Wallet size={14} className="text-rose-500" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{d.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">Saldo: {fmt.currency(d.current_balance, currency)} · Día {d.payment_day}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold text-mono text-rose-500">{fmt.currency(d.monthly_payment, currency)}</span>
                      <button onClick={() => setImportDebt(d)} title="Agregar al presupuesto"
                        className="p-1.5 rounded-lg bg-brand-500/10 text-brand-500 hover:bg-brand-500/20 transition-colors">
                        <LucideIcons.Plus size={13} />
                      </button>
                    </div>
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
                  <div key={g.id} className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors">
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
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold text-mono text-brand-500">
                        {g.monthly_needed ? fmt.currency(g.monthly_needed, currency) + '/mes' : '—'}
                      </span>
                      <button onClick={() => budgetGoal(g)} title="Presupuestar aporte"
                        disabled={!g.monthly_needed}
                        className="p-1.5 rounded-lg bg-brand-500/10 text-brand-500 hover:bg-brand-500/20 transition-colors disabled:opacity-30">
                        <LucideIcons.Plus size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recurringExpense.length === 0 && debts.length === 0 && goals.length === 0 && (
            <div className="card flex flex-col items-center gap-3 py-10 text-center">
              <LucideIcons.CalendarCheck size={32} className="text-[var(--text-muted)] opacity-40" />
              <p className="font-semibold">Sin compromisos registrados</p>
              <p className="text-xs text-[var(--text-muted)]">Agrega transacciones recurrentes, préstamos o metas de ahorro</p>
            </div>
          )}

          {/* Resumen */}
          {(totalObligations > 0 || totalPlannedIncome > 0) && (
            <div className="card space-y-2 !py-3">
              {totalPlannedIncome > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Total ingresos planificados</span>
                  <span className="font-bold text-mono text-emerald-500">+{fmt.currency(totalPlannedIncome, currency)}</span>
                </div>
              )}
              {totalObligations > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Total compromisos</span>
                  <span className="font-bold text-mono text-rose-500">-{fmt.currency(totalObligations, currency)}</span>
                </div>
              )}
              {totalPlannedIncome > 0 && totalObligations > 0 && (
                <div className="flex items-center justify-between text-sm pt-2 border-t border-[var(--border)] font-semibold">
                  <span>Balance proyectado</span>
                  <span className={clsx('text-mono', projectedBalance >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
                    {fmt.currency(projectedBalance, currency)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      <CategoryDetailModal open={!!detailItem} onClose={() => setDetailItem(null)}
        item={detailItem} month={month} currency={currency}
        onBudgetRefresh={() => fetchBudgets(month)} />

      <ImportDebtModal open={!!importDebt} onClose={() => setImportDebt(null)}
        debt={importDebt} categories={categories} onImport={handleImportDebt} />

      {/* Add income modal */}
      <Modal open={incomeModal} onClose={() => setIncomeModal(false)} title="Agregar ingreso único" size="sm">
        <form onSubmit={saveIncome} className="space-y-4">
          <div>
            <label className="label">Descripción</label>
            <input className="input" type="text" placeholder="Ej: Salario, Freelance, Bono"
              value={incomeForm.description} onChange={e => setIncomeForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="label">Monto</label>
            <input className="input" type="number" step="0.01" min="0.01" placeholder="0.00"
              value={incomeForm.amount} onChange={e => setIncomeForm(f => ({ ...f, amount: e.target.value }))} required />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setIncomeModal(false)} className="btn-ghost flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={busy || !incomeForm.amount} className="btn-primary flex-1 justify-center">
              {busy ? 'Guardando...' : 'Agregar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Agregar categoría al presupuesto */}
      <Modal open={addCatModal} onClose={() => setAddCatModal(false)} title="Agregar categoría al presupuesto" size="sm">
        <form onSubmit={saveAddCat} className="space-y-4">
          <div>
            <label className="label">Categoría</label>
            <select className="input" value={addCatForm.category_id}
              onChange={e => {
                const cid = e.target.value;
                setAddCatForm(f => ({ ...f, category_id: cid, amount: suggestions[cid] ? String(suggestions[cid]) : f.amount }));
              }} required>
              <option value="">Seleccionar...</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Descripción (opcional)</label>
            <input className="input" type="text" placeholder="Ej: Agua, Netflix, Cuota préstamo"
              value={addCatForm.name} onChange={e => setAddCatForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Monto</label>
            <input className="input" type="number" step="0.01" min="0.01" placeholder="0.00"
              value={addCatForm.amount} onChange={e => setAddCatForm(f => ({ ...f, amount: e.target.value }))} required />
            {addCatForm.category_id && suggestions[addCatForm.category_id] && (
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Promedio últimos 3 meses: {fmt.currency(suggestions[addCatForm.category_id], currency)}
              </p>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setAddCatModal(false)} className="btn-ghost flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={busy || !addCatForm.category_id || !addCatForm.amount} className="btn-primary flex-1 justify-center">
              {busy ? 'Guardando...' : 'Agregar'}
            </button>
          </div>
        </form>
      </Modal>

      <Confirm
        open={!!delLine}
        onClose={() => setDelLine(null)}
        onConfirm={confirmDeleteLine}
        title="Eliminar línea de presupuesto"
        message={`¿Eliminar "${delLine?.lineName || 'esta línea'}" de ${delLine?.categoryName}?`}
      />
    </div>
  );
}
