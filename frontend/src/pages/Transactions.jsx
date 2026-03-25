import { useEffect, useState } from 'react';
import { Plus, Filter, Download, Pencil, Trash2, ArrowUpCircle, ArrowDownCircle, PiggyBank, CreditCard, RefreshCw, Pause, Play, ScanLine } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useStore } from '../store/index.js';
import { fmt, localDate } from '../utils/format.js';
import { Modal, Confirm, Spinner, Empty, ProgressBar } from '../components/ui/index.jsx';
import OcrModal from '../components/OcrModal.jsx';
import api from '../services/api.js';
import clsx from 'clsx';

const EMPTY_FORM = {
  type: 'expense', category_id: '', amount: '', description: '',
  txn_date: localDate(),
  debt_id: '', savings_goal_id: '', credit_card_id: '', account_id: '',
  extra_principal: '0', payment_method: 'cash',
};

const EMPTY_REC = {
  type: 'expense', category_id: '', amount: '', description: '',
  frequency: 'monthly', start_date: localDate(),
  end_date: '', savings_goal_id: '', credit_card_id: '',
};

const FREQ_LABEL = { weekly: 'Semanal', biweekly: 'Quincenal', monthly: 'Mensual', yearly: 'Anual' };
const FREQ_COLOR = { weekly: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', biweekly: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400', monthly: 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400', yearly: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };

export default function Transactions() {
  const {
    transactions, txnTotal, txnLoading, categories,
    fetchTransactions, fetchCategories, createTransaction,
    updateTransaction, deleteTransaction,
    debts, fetchDebts,
    goals, fetchGoals,
    recurring, recurringLoading, fetchRecurring, createRecurring, updateRecurring, deleteRecurring,
    creditCards, fetchCreditCards,
    accounts, fetchAccounts,
    user,
  } = useStore();

  const currency = user?.currency || 'USD';

  const [filters, setFilters] = useState({ type: '', category_id: '', account_id: '', from: '', to: '', page: 1 });
  const [showFilters, setShowFilters] = useState(false);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState(null);
  const [ocrModal, setOcrModal] = useState(false);

  // Recurring state
  const [recModal, setRecModal] = useState(false);
  const [recForm, setRecForm] = useState(EMPTY_REC);
  const [editingRec, setEditingRec] = useState(null);
  const [deletingRec, setDeletingRec] = useState(null);
  const [recBusy, setRecBusy] = useState(false);
  const [showRecForm, setShowRecForm] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchTransactions(filters);
    fetchDebts();
    fetchGoals();
    fetchCreditCards();
    fetchAccounts();
    api.get('/transactions/summary').then(r => setSummary(r.data)).catch(() => { });
  }, []);

  useEffect(() => { fetchTransactions(filters); }, [filters]);

  const filteredCats = categories.filter((c) => !form.type || c.type === form.type);
  const recFilteredCats = categories.filter((c) => !recForm.type || c.type === recForm.type);
  const activeDebts = (debts || []).filter(d => d.is_active);
  const activeGoals = (goals || []).filter(g => !g.is_completed);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setModal(true); };

  const openEdit = (t) => {
    setEditing(t);
    setForm({
      type: t.type, category_id: t.category_id, amount: t.amount,
      description: t.description || '', txn_date: String(t.txn_date).split('T')[0],
      debt_id: t.debt_id || '', savings_goal_id: t.savings_goal_id || '',
      credit_card_id: t.credit_card_id || '', account_id: t.account_id || '',
      extra_principal: t.extra_principal || '0',
      payment_method: t.credit_card_id ? 'card' : t.account_id ? 'debit' : 'cash',
    });
    setModal(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        ...form,
        debt_id: form.debt_id || null,
        savings_goal_id: form.savings_goal_id || null,
        credit_card_id: form.credit_card_id || null,
        account_id: form.account_id || null,
        extra_principal: Number(form.extra_principal) || 0,
      };
      if (editing) await updateTransaction(editing.id, payload);
      else await createTransaction(payload);
      setModal(false);
      fetchTransactions(filters);
      fetchDebts();
      fetchGoals();
      api.get('/transactions/summary').then(r => setSummary(r.data)).catch(() => { });
    } finally { setBusy(false); }
  };

  const confirmDelete = async () => {
    await deleteTransaction(deleting.id);
    setDeleting(null);
    fetchTransactions(filters);
  };

  const exportCsv = () => {
    const params = new URLSearchParams({ from: filters.from || '', to: filters.to || '' });
    window.open(`/api/transactions/export?${params}`, '_blank');
  };

  // OCR: pre-fill form with extracted receipt data
  const handleOcrConfirm = ({ description, amount, date, category_id, credit_card_id, account_id }) => {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      type:           'expense',
      description:    description    || '',
      amount:         amount         || '',
      txn_date:       date           || EMPTY_FORM.txn_date,
      category_id:    category_id    || '',
      credit_card_id: credit_card_id || '',
      account_id:     account_id     || '',
      payment_method: credit_card_id ? 'card' : account_id ? 'debit' : 'cash',
    });
    setModal(true);
  };

  // Recurring handlers
  const openRecurring = () => {
    fetchRecurring();
    fetchCreditCards();
    setShowRecForm(false);
    setEditingRec(null);
    setRecForm(EMPTY_REC);
    setRecModal(true);
  };

  const openEditRec = (r) => {
    setEditingRec(r);
    setRecForm({
      type: r.type, category_id: r.category_id, amount: r.amount,
      description: r.description || '', frequency: r.frequency,
      start_date: String(r.start_date).split('T')[0],
      end_date: r.end_date ? String(r.end_date).split('T')[0] : '',
      savings_goal_id: r.savings_goal_id || '',
      credit_card_id: r.credit_card_id || '',
    });
    setShowRecForm(true);
  };

  const saveRec = async (e) => {
    e.preventDefault();
    setRecBusy(true);
    try {
      const payload = {
        ...recForm,
        end_date: recForm.end_date || null,
        savings_goal_id: recForm.savings_goal_id || null,
        credit_card_id: recForm.credit_card_id || null,
      };
      if (editingRec) await updateRecurring(editingRec.id, { ...payload, is_active: editingRec.is_active });
      else await createRecurring(payload);
      setShowRecForm(false);
      setEditingRec(null);
      setRecForm(EMPTY_REC);
      fetchRecurring();
    } finally { setRecBusy(false); }
  };

  const toggleActive = async (r) => {
    await updateRecurring(r.id, {
      category_id: r.category_id, type: r.type, amount: r.amount,
      description: r.description, frequency: r.frequency,
      end_date: r.end_date || null, savings_goal_id: r.savings_goal_id || null,
      is_active: r.is_active ? 0 : 1,
    });
    fetchRecurring();
  };

  const confirmDeleteRec = async () => {
    await deleteRecurring(deletingRec.id);
    setDeletingRec(null);
    fetchRecurring();
  };

  const chartData = (() => {
    if (!summary?.monthly) return [];
    const map = {};
    summary.monthly.forEach(({ month, type, total }) => {
      map[month] = map[month] || { month, income: 0, expenses: 0 };
      if (type === 'income') map[month].income = total;
      if (type === 'expense') map[month].expenses = total;
    });
    return Object.values(map).slice(-6);
  })();

  const catBreakdown = summary?.byCategory?.filter(c => c.type === 'expense').slice(0, 5) || [];

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display font-bold text-xl">Transacciones</h1>
          <p className="text-[var(--text-muted)] text-sm">{txnTotal} registros</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="btn-ghost hidden sm:flex"><Download size={15} /> Exportar</button>
          <button onClick={openRecurring} className="btn-ghost"><RefreshCw size={15} /><span className="hidden sm:inline">Recurrentes</span></button>
          <button onClick={() => setShowFilters(!showFilters)} className="btn-ghost"><Filter size={15} /><span className="hidden sm:inline">Filtros</span></button>
          <button onClick={() => setOcrModal(true)} className="btn-ghost" title="Escanear recibo"><ScanLine size={15} /></button>
          <button onClick={openCreate} className="btn-primary"><Plus size={15} /><span className="hidden sm:inline">Nueva</span></button>
        </div>
      </div>

      {showFilters && (
        <div className="card grid grid-cols-2 sm:grid-cols-4 gap-3 animate-scale-in">
          <div>
            <label className="label">Tipo</label>
            <select className="input" value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value, page: 1 })}>
              <option value="">Todos</option><option value="income">Ingresos</option><option value="expense">Gastos</option>
            </select>
          </div>
          <div>
            <label className="label">Categoría</label>
            <select className="input" value={filters.category_id} onChange={e => setFilters({ ...filters, category_id: e.target.value, page: 1 })}>
              <option value="">Todas</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {accounts.length > 0 && (
            <div>
              <label className="label">Cuenta</label>
              <select className="input" value={filters.account_id} onChange={e => setFilters({ ...filters, account_id: e.target.value, page: 1 })}>
                <option value="">Todas</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.currency || 'USD'})</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="label">Desde</label>
            <input className="input" type="date" value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value, page: 1 })} />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input className="input" type="date" value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value, page: 1 })} />
          </div>
          <button onClick={() => setFilters({ type: '', category_id: '', account_id: '', from: '', to: '', page: 1 })}
            className="btn-ghost text-xs col-span-2 sm:col-span-4 justify-center">Limpiar filtros</button>
        </div>
      )}

      {chartData.length > 0 && (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="card lg:col-span-2">
            <h3 className="text-display font-bold text-sm mb-3">Últimos 6 meses</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={12}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tickFormatter={fmt.monthYear} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => fmt.currency(v, currency)} labelFormatter={fmt.monthYear} />
                <Bar dataKey="income" name="Ingresos" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Gastos" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h3 className="text-display font-bold text-sm mb-3">Top gastos por categoría</h3>
            <div className="space-y-3">
              {catBreakdown.map((c, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-mono">{fmt.currency(c.total, currency)}</span>
                  </div>
                  <ProgressBar value={c.total} max={catBreakdown[0]?.total || 1} color={c.color} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        {txnLoading ? <Spinner /> : transactions.length === 0 ? (
          <Empty icon={ArrowUpCircle} title="Sin transacciones" description="Registra tu primera transacción"
            action={<button onClick={openCreate} className="btn-primary text-xs">+ Nueva transacción</button>} />
        ) : (
          <div>
            <div className="hidden sm:grid grid-cols-5 px-5 py-2 border-b border-[var(--border)] text-xs text-[var(--text-muted)] font-medium">
              <span className="col-span-2">Descripción</span><span>Categoría</span><span>Fecha</span><span className="text-right">Monto</span>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {transactions.map((t) => (
                <div key={t.id} className="flex sm:grid sm:grid-cols-5 items-center px-5 py-3 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors group">
                  <div className="flex items-center gap-3 col-span-2 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs flex-shrink-0"
                      style={{ background: `${t.color}20`, color: t.color }}>{t.category_name?.[0]}</div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium truncate">{t.description || t.category_name}</p>
                        {t.savings_goal_id && <PiggyBank size={12} className="text-brand-500 flex-shrink-0" title="Reserva para meta de ahorro" />}
                        {t.debt_id && <CreditCard size={12} className="text-rose-400 flex-shrink-0" title="Pago de deuda" />}
                        {t.credit_card_id && !t.is_card_payment && <CreditCard size={12} className="text-amber-500 flex-shrink-0" title="Cargo a tarjeta de crédito" />}
                        {t.is_card_payment && <CreditCard size={12} className="text-green-500 flex-shrink-0" title="Pago de tarjeta" />}
                      </div>
                      <p className="text-xs text-[var(--text-muted)] sm:hidden">{fmt.date(t.txn_date)}</p>
                    </div>
                  </div>
                  <span className="hidden sm:block text-xs text-[var(--text-muted)]">{t.category_name}</span>
                  <span className="hidden sm:block text-xs text-[var(--text-muted)]">{fmt.date(t.txn_date)}</span>
                  <div className="flex items-center gap-2 ml-auto sm:justify-end">
                    <span className={clsx('text-sm text-mono font-semibold', t.type === 'income' ? 'text-income' : 'text-expense')}>
                      {t.type === 'income' ? '+' : '-'}{fmt.currency(t.amount, currency)}
                    </span>
                    <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(t)} className="p-1 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700">
                        <Pencil size={13} className="text-[var(--text-muted)]" />
                      </button>
                      <button onClick={() => setDeleting(t)} className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20">
                        <Trash2 size={13} className="text-rose-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {txnTotal > 50 && (
        <div className="flex justify-center gap-2">
          {filters.page > 1 && <button className="btn-ghost text-xs" onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>← Anterior</button>}
          <span className="text-xs text-[var(--text-muted)] self-center">Pág. {filters.page}</span>
          {filters.page * 50 < txnTotal && <button className="btn-ghost text-xs" onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>Siguiente →</button>}
        </div>
      )}

      {/* ── Modal nueva/editar transacción ── */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar transacción' : 'Nueva transacción'}>
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {['income', 'expense'].map((tp) => (
              <button key={tp} type="button"
                onClick={() => setForm({ ...form, type: tp, category_id: '', debt_id: '', savings_goal_id: '', credit_card_id: '' })}
                className={clsx(
                  'p-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2',
                  form.type === tp
                    ? tp === 'income' ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-600'
                      : 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-600'
                    : 'border-[var(--border)] text-[var(--text-muted)] hover:border-brand-400'
                )}>
                {tp === 'income' ? <ArrowUpCircle size={16} /> : <ArrowDownCircle size={16} />}
                {tp === 'income' ? 'Ingreso' : 'Gasto'}
              </button>
            ))}
          </div>
          <div>
            <label className="label">Categoría</label>
            <select className="input" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} required>
              <option value="">Seleccionar...</option>
              {filteredCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Monto</label>
              <input className="input" type="number" step="0.01" min="0.01" placeholder="0.00"
                value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div>
              <label className="label">Fecha</label>
              <input className="input" type="date" value={form.txn_date}
                onChange={e => setForm({ ...form, txn_date: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="label">Descripción (opcional)</label>
            <input className="input" type="text" placeholder="Ej: Supermercado La Colonia"
              value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          {form.type === 'expense' && activeDebts.length > 0 && (
            <div>
              <label className="label">Vincular a deuda (opcional)</label>
              <select className="input" value={form.debt_id}
                onChange={e => setForm({ ...form, debt_id: e.target.value, savings_goal_id: '' })}>
                <option value="">— Ninguna —</option>
                {activeDebts.map(d => (
                  <option key={d.id} value={d.id}>{d.name} — saldo: {fmt.currency(d.current_balance, currency)}</option>
                ))}
              </select>
            </div>
          )}
          {form.debt_id && (
            <div>
              <label className="label">Abono extra a capital (opcional)</label>
              <input className="input" type="number" step="0.01" min="0" placeholder="0.00"
                value={form.extra_principal} onChange={e => setForm({ ...form, extra_principal: e.target.value })} />
              <p className="text-xs text-[var(--text-muted)] mt-1">Se aplica directo al capital y reduce los intereses futuros</p>
            </div>
          )}
          {form.type === 'expense' && !form.debt_id && activeGoals.length > 0 && (
            <div>
              <label className="label">Vincular a meta de ahorro (opcional)</label>
              <select className="input" value={form.savings_goal_id}
                onChange={e => setForm({ ...form, savings_goal_id: e.target.value, credit_card_id: '' })}>
                <option value="">— Ninguna —</option>
                {activeGoals.map(g => (
                  <option key={g.id} value={g.id}>{g.name} — {Math.round((g.current_amount / g.target_amount) * 100)}% completada</option>
                ))}
              </select>
            </div>
          )}
          {/* ── Forma de pago ── */}
          {(accounts.length > 0 || creditCards.length > 0) && (() => {
            const payMethod = form.payment_method || 'cash';
            const setMethod = (m) => setForm(f => ({
              ...f,
              payment_method: m,
              credit_card_id: m === 'card'  ? f.credit_card_id : '',
              account_id:     m === 'debit' ? f.account_id     : '',
            }));
            const showCash  = true;
            const showDebit = accounts.length > 0;
            const showCard  = creditCards.length > 0 && form.type === 'expense' && !form.debt_id && !form.savings_goal_id;
            const cols      = [showCash, showDebit, showCard].filter(Boolean).length;
            return (
              <div>
                <label className="label">Forma de pago</label>
                <div className={clsx(
                  'grid gap-2 mb-2',
                  cols === 3 ? 'grid-cols-1 sm:grid-cols-3' : cols === 2 ? 'grid-cols-2' : 'grid-cols-1'
                )}>
                  {showCash && (
                    <button type="button" onClick={() => setMethod('cash')}
                      className={clsx(
                        'flex items-center justify-center gap-2 py-3 px-3 rounded-xl border text-sm font-medium transition-all',
                        payMethod === 'cash'
                          ? 'border-brand-500 bg-brand-500/10 text-brand-500'
                          : 'border-[var(--border)] text-[var(--text-muted)] hover:border-brand-400'
                      )}>
                      💵 Efectivo
                    </button>
                  )}
                  {showDebit && (
                    <button type="button" onClick={() => setMethod('debit')}
                      className={clsx(
                        'flex items-center justify-center gap-2 py-3 px-3 rounded-xl border text-sm font-medium transition-all',
                        payMethod === 'debit'
                          ? 'border-brand-500 bg-brand-500/10 text-brand-500'
                          : 'border-[var(--border)] text-[var(--text-muted)] hover:border-brand-400'
                      )}>
                      🏦 Débito / Cuenta
                    </button>
                  )}
                  {showCard && (
                    <button type="button" onClick={() => setMethod('card')}
                      className={clsx(
                        'flex items-center justify-center gap-2 py-3 px-3 rounded-xl border text-sm font-medium transition-all',
                        payMethod === 'card'
                          ? 'border-brand-500 bg-brand-500/10 text-brand-500'
                          : 'border-[var(--border)] text-[var(--text-muted)] hover:border-brand-400'
                      )}>
                      💳 Tarjeta de crédito
                    </button>
                  )}
                </div>
                {payMethod === 'debit' && (
                  <select className="input" value={form.account_id}
                    onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))}>
                    <option value="">— Seleccionar cuenta —</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.currency || 'USD'})</option>
                    ))}
                  </select>
                )}
                {payMethod === 'card' && (
                  <>
                    <select className="input" value={form.credit_card_id}
                      onChange={e => setForm(f => ({ ...f, credit_card_id: e.target.value }))}>
                      <option value="">— Seleccionar tarjeta —</option>
                      {creditCards.map(c => (
                        <option key={c.id} value={c.id}>{c.name}{c.last_four ? ` ···${c.last_four}` : ''}</option>
                      ))}
                    </select>
                    {form.credit_card_id && (
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        Este cargo no afectará tu saldo hasta que pagues la tarjeta.
                      </p>
                    )}
                  </>
                )}
              </div>
            );
          })()}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setModal(false)} className="btn-ghost flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={busy} className="btn-primary flex-1 justify-center">
              {busy ? 'Guardando...' : editing ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal transacciones recurrentes ── */}
      <Modal open={recModal} onClose={() => { setRecModal(false); setShowRecForm(false); }} title="Transacciones recurrentes" size="lg">
        <div className="space-y-4">
          {!showRecForm ? (
            <>
              <div className="flex justify-end">
                <button onClick={() => { setEditingRec(null); setRecForm(EMPTY_REC); setShowRecForm(true); }} className="btn-primary">
                  <Plus size={15} /> Nueva recurrente
                </button>
              </div>

              {recurringLoading ? <Spinner /> : recurring.length === 0 ? (
                <Empty icon={RefreshCw} title="Sin recurrentes" description="Registra suscripciones, renta y otros pagos fijos" />
              ) : (
                <div className="divide-y divide-[var(--border)] -mx-5">
                  {recurring.map((r) => (
                    <div key={r.id} className={clsx('flex items-center gap-3 px-5 py-3 transition-colors', !r.is_active && 'opacity-50')}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs flex-shrink-0 font-bold"
                        style={{ background: `${r.color}20`, color: r.color }}>{r.category_name?.[0]}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium truncate">{r.description || r.category_name}</p>
                          <span className={clsx('text-xs px-1.5 py-0.5 rounded-full font-medium', FREQ_COLOR[r.frequency])}>
                            {FREQ_LABEL[r.frequency]}
                          </span>
                          {!r.is_active && <span className="text-xs px-1.5 py-0.5 rounded-full bg-surface-100 dark:bg-surface-700 text-[var(--text-muted)]">Pausada</span>}
                        </div>
                        <p className="text-xs text-[var(--text-muted)]">
                          Próx. {fmt.date(r.next_date)} · {r.category_name}
                        </p>
                      </div>
                      <span className={clsx('text-sm font-semibold text-mono flex-shrink-0', r.type === 'income' ? 'text-income' : 'text-expense')}>
                        {r.type === 'income' ? '+' : '-'}{fmt.currency(r.amount, currency)}
                      </span>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => toggleActive(r)} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700" title={r.is_active ? 'Pausar' : 'Reanudar'}>
                          {r.is_active ? <Pause size={13} className="text-[var(--text-muted)]" /> : <Play size={13} className="text-green-500" />}
                        </button>
                        <button onClick={() => openEditRec(r)} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700">
                          <Pencil size={13} className="text-[var(--text-muted)]" />
                        </button>
                        <button onClick={() => setDeletingRec(r)} className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20">
                          <Trash2 size={13} className="text-rose-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <form onSubmit={saveRec} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">{editingRec ? 'Editar recurrente' : 'Nueva recurrente'}</h3>
                <button type="button" onClick={() => { setShowRecForm(false); setEditingRec(null); }} className="text-xs text-[var(--text-muted)] hover:underline">← Volver</button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {['income', 'expense'].map((tp) => (
                  <button key={tp} type="button"
                    onClick={() => setRecForm({ ...recForm, type: tp, category_id: '', savings_goal_id: '', credit_card_id: '' })}
                    className={clsx(
                      'p-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2',
                      recForm.type === tp
                        ? tp === 'income' ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-600'
                          : 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-600'
                        : 'border-[var(--border)] text-[var(--text-muted)] hover:border-brand-400'
                    )}>
                    {tp === 'income' ? <ArrowUpCircle size={16} /> : <ArrowDownCircle size={16} />}
                    {tp === 'income' ? 'Ingreso' : 'Gasto'}
                  </button>
                ))}
              </div>

              <div>
                <label className="label">Descripción</label>
                <input className="input" type="text" placeholder="Ej: Netflix, Renta, Salario"
                  value={recForm.description} onChange={e => setRecForm({ ...recForm, description: e.target.value })} required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Categoría</label>
                  <select className="input" value={recForm.category_id} onChange={e => setRecForm({ ...recForm, category_id: e.target.value })} required>
                    <option value="">Seleccionar...</option>
                    {recFilteredCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Frecuencia</label>
                  <select className="input" value={recForm.frequency} onChange={e => setRecForm({ ...recForm, frequency: e.target.value })}>
                    <option value="weekly">Semanal</option>
                    <option value="biweekly">Quincenal (cada 15 días)</option>
                    <option value="monthly">Mensual</option>
                    <option value="yearly">Anual</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Monto</label>
                  <input className="input" type="number" step="0.01" min="0.01" placeholder="0.00"
                    value={recForm.amount} onChange={e => setRecForm({ ...recForm, amount: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Fecha de inicio</label>
                  <input className="input" type="date" value={recForm.start_date}
                    onChange={e => setRecForm({ ...recForm, start_date: e.target.value })} required />
                </div>
              </div>

              <div>
                <label className="label">Fecha de fin (opcional)</label>
                <input className="input" type="date" value={recForm.end_date}
                  onChange={e => setRecForm({ ...recForm, end_date: e.target.value })} />
                <p className="text-xs text-[var(--text-muted)] mt-1">Dejar vacío si no tiene fecha de fin</p>
              </div>

              {recForm.type === 'expense' && activeGoals.length > 0 && (
                <div>
                  <label className="label">Vincular a meta de ahorro (opcional)</label>
                  <select className="input" value={recForm.savings_goal_id}
                    onChange={e => setRecForm({ ...recForm, savings_goal_id: e.target.value, credit_card_id: '' })}>
                    <option value="">— Ninguna —</option>
                    {activeGoals.map(g => (
                      <option key={g.id} value={g.id}>{g.name} — {Math.round((g.current_amount / g.target_amount) * 100)}% completada</option>
                    ))}
                  </select>
                </div>
              )}

              {recForm.type === 'expense' && !recForm.savings_goal_id && creditCards.length > 0 && (
                <div>
                  <label className="label">Cargar a tarjeta de crédito (opcional)</label>
                  <select className="input" value={recForm.credit_card_id}
                    onChange={e => setRecForm({ ...recForm, credit_card_id: e.target.value })}>
                    <option value="">— Efectivo / débito —</option>
                    {creditCards.map(c => (
                      <option key={c.id} value={c.id}>{c.name}{c.last_four ? ` ···${c.last_four}` : ''}</option>
                    ))}
                  </select>
                  {recForm.credit_card_id && (
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Este cargo recurrente se cargará a la tarjeta automáticamente.
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => { setShowRecForm(false); setEditingRec(null); }} className="btn-ghost flex-1 justify-center">Cancelar</button>
                <button type="submit" disabled={recBusy} className="btn-primary flex-1 justify-center">
                  {recBusy ? 'Guardando...' : editingRec ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          )}
        </div>
      </Modal>

      <Confirm
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Eliminar transacción"
        message={`¿Eliminar "${deleting?.description || deleting?.category_name}"? Esta acción no se puede deshacer.`}
      />

      <Confirm
        open={!!deletingRec}
        onClose={() => setDeletingRec(null)}
        onConfirm={confirmDeleteRec}
        title="Eliminar recurrente"
        message={`¿Eliminar "${deletingRec?.description || deletingRec?.category_name}"? Se dejará de generar automáticamente.`}
      />

      <OcrModal
        open={ocrModal}
        onClose={() => setOcrModal(false)}
        onConfirm={handleOcrConfirm}
        categories={categories}
        creditCards={creditCards}
        accounts={accounts}
        currency={currency}
      />
    </div>
  );
}
