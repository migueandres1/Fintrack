import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Copy, Pencil, Trash2, Plus, PiggyBank } from 'lucide-react';
import { useStore } from '../store/index.js';
import { fmt }      from '../utils/format.js';
import { Modal, Confirm, Spinner } from '../components/ui/index.jsx';
import clsx from 'clsx';

function monthLabel(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('es', { month: 'long', year: 'numeric' });
}

function prevMonth(month) {
  const [y, m] = month.split('-').map(Number);
  const pm = m === 1 ? 12 : m - 1;
  const py = m === 1 ? y - 1 : y;
  return `${py}-${String(pm).padStart(2, '0')}`;
}

function nextMonth(month) {
  const [y, m] = month.split('-').map(Number);
  const nm = m === 12 ? 1 : m + 1;
  const ny = m === 12 ? y + 1 : y;
  return `${ny}-${String(nm).padStart(2, '0')}`;
}

function currentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function Budget() {
  const {
    budgets, budgetsLoading, fetchBudgets, saveBudget, deleteBudget, copyBudgetsFromLastMonth, user,
  } = useStore();
  const currency = user?.currency || 'USD';

  const [month,     setMonth]     = useState(currentYearMonth());
  const [modal,     setModal]     = useState(false);
  const [editItem,  setEditItem]  = useState(null); // { category_id, category_name, budget }
  const [delItem,   setDelItem]   = useState(null);
  const [amount,    setAmount]    = useState('');
  const [busy,      setBusy]      = useState(false);
  const [copied,    setCopied]    = useState(false);

  useEffect(() => { fetchBudgets(month); }, [month]);

  const items      = budgets?.items      || [];
  const categories = budgets?.categories || [];

  // Categories not yet budgeted this month
  const unbudgeted = categories.filter(c => !items.find(i => i.category_id === c.id));

  const openAdd = () => {
    setEditItem(null);
    setAmount('');
    setModal(true);
  };
  const openEdit = (item) => {
    setEditItem(item);
    setAmount(String(item.budget));
    setModal(true);
  };

  const [newCatId, setNewCatId] = useState('');

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

  const totalBudget = items.reduce((s, i) => s + (i.budget || 0), 0);
  const totalSpent  = items.reduce((s, i) => s + (i.spent  || 0), 0);

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-display font-bold text-xl">Presupuesto</h1>
          <p className="text-[var(--text-muted)] text-sm capitalize">{monthLabel(month)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            disabled={busy}
            title="Copiar presupuesto del mes anterior"
            className="btn-ghost text-xs gap-1.5"
          >
            <Copy size={13} />
            {copied ? '¡Copiado!' : 'Copiar mes anterior'}
          </button>
          <button onClick={openAdd} className="btn-primary"><Plus size={15} /> Agregar</button>
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center gap-2">
        <button onClick={() => setMonth(prevMonth(month))} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700">
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold capitalize min-w-[160px] text-center">{monthLabel(month)}</span>
        <button onClick={() => setMonth(nextMonth(month))} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700">
          <ChevronRight size={16} />
        </button>
        {month !== currentYearMonth() && (
          <button onClick={() => setMonth(currentYearMonth())} className="text-xs text-brand-500 hover:underline ml-1">
            Hoy
          </button>
        )}
      </div>

      {/* Summary cards */}
      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="card">
            <p className="text-xs text-[var(--text-muted)] mb-1">Presupuesto total</p>
            <p className="text-display font-bold text-lg text-mono">{fmt.currency(totalBudget, currency)}</p>
          </div>
          <div className="card">
            <p className="text-xs text-[var(--text-muted)] mb-1">Gastado</p>
            <p className={clsx('text-display font-bold text-lg text-mono', totalSpent > totalBudget ? 'text-rose-500' : 'text-[var(--text)]')}>
              {fmt.currency(totalSpent, currency)}
            </p>
          </div>
          <div className="card">
            <p className="text-xs text-[var(--text-muted)] mb-1">Disponible</p>
            <p className={clsx('text-display font-bold text-lg text-mono', totalBudget - totalSpent < 0 ? 'text-rose-500' : 'text-green-500')}>
              {fmt.currency(totalBudget - totalSpent, currency)}
            </p>
          </div>
        </div>
      )}

      {/* Budget list */}
      {budgetsLoading ? <Spinner /> : items.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-10 text-center">
          <PiggyBank size={32} className="text-[var(--text-muted)] opacity-40" />
          <p className="font-semibold">Sin presupuesto para este mes</p>
          <p className="text-xs text-[var(--text-muted)]">Agrega límites por categoría para controlar tus gastos</p>
          <button onClick={openAdd} className="btn-primary text-xs mt-1">+ Agregar presupuesto</button>
        </div>
      ) : (
        <div className="card space-y-4">
          {items.map(item => {
            const pct     = item.budget > 0 ? Math.min(100, (item.spent / item.budget) * 100) : 0;
            const over    = item.spent > item.budget && item.budget > 0;
            const warning = pct >= 90 && !over;
            const barColor = over ? '#ef4444' : warning ? '#f59e0b' : item.color || '#6366f1';
            return (
              <div key={item.category_id}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color || '#6366f1' }} />
                    <span className="text-sm font-medium truncate">{item.category_name}</span>
                    {over    && <span className="text-[10px] font-semibold text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-1.5 py-0.5 rounded ml-1">Excedido</span>}
                    {warning && <span className="text-[10px] font-semibold text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded ml-1">+90%</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-mono text-[var(--text-muted)]">
                      {fmt.currency(item.spent, currency)} / {fmt.currency(item.budget, currency)}
                    </span>
                    <button onClick={() => openEdit(item)} className="p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-700">
                      <Pencil size={12} className="text-[var(--text-muted)]" />
                    </button>
                    <button onClick={() => setDelItem(item)} className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20">
                      <Trash2 size={12} className="text-rose-400" />
                    </button>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-surface-100 dark:bg-surface-700 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: barColor }}
                  />
                </div>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5 text-right">{pct.toFixed(0)}% utilizado</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editItem ? `Editar – ${editItem.category_name}` : 'Agregar presupuesto'}>
        <form onSubmit={save} className="space-y-4">
          {!editItem && (
            <div>
              <label className="label">Categoría</label>
              <select className="input" value={newCatId} onChange={e => setNewCatId(e.target.value)} required>
                <option value="">Seleccionar categoría...</option>
                {unbudgeted.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label">Monto del presupuesto</label>
            <input
              className="input" type="number" step="0.01" min="0.01" placeholder="0.00"
              value={amount} onChange={e => setAmount(e.target.value)} required
            />
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
