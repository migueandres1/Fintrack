import { useEffect, useState } from 'react';
import {
  Wallet, TrendingUp, TrendingDown, CreditCard, PiggyBank, Bell, ArrowRight,
  ChevronDown, ChevronUp, RefreshCw, Scissors, CalendarClock, ShieldCheck, Landmark,
  Plus, ArrowUpCircle, ArrowDownCircle, Target,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useStore }   from '../store/index.js';
import { fmt, localDate } from '../utils/format.js';
import { StatCard, ProgressBar, Spinner, Modal } from '../components/ui/index.jsx';
import clsx from 'clsx';

// Próxima fecha de un día-del-mes (este mes si aún no pasó, si no el siguiente)
function nextDayOfMonth(day) {
  const today = new Date();
  const d = Math.max(1, Math.min(28, day));
  const candidate = new Date(today.getFullYear(), today.getMonth(), d);
  if (candidate > today) return candidate;
  return new Date(today.getFullYear(), today.getMonth() + 1, d);
}

// Convierte frecuencia a equivalente mensual
function monthlyEq(amount, frequency) {
  if (frequency === 'weekly')   return (Number(amount) * 52) / 12;
  if (frequency === 'biweekly') return Number(amount) * 2;
  if (frequency === 'yearly')   return Number(amount) / 12;
  return Number(amount);
}

const SCORE_ADVICE = {
  liquidez: 'Aumenta tu fondo de emergencia para cubrir al menos 3 meses de gastos.',
  ahorro:   'Intenta ahorrar al menos el 20% de tus ingresos cada mes.',
  deuda:    'Reduce los pagos de deuda por debajo del 30% de tus ingresos.',
  metas:    'Crea o avanza en tus metas de ahorro para mejorar este indicador.',
};

function ScoreCard({ score }) {
  const { total, dimensions } = score;
  const color = total >= 75 ? '#22c55e' : total >= 50 ? '#f59e0b' : '#f43f5e';
  const label = total >= 75 ? 'Excelente' : total >= 50 ? 'Regular' : 'Por mejorar';
  const dims = [
    { key: 'liquidez', label: 'Liquidez',       hint: 'Meses de gastos cubiertos' },
    { key: 'ahorro',   label: 'Tasa de ahorro', hint: '% ingreso ahorrado este mes' },
    { key: 'deuda',    label: 'Nivel de deuda', hint: 'Cuotas vs ingresos' },
    { key: 'metas',    label: 'Metas',           hint: 'Progreso promedio' },
  ];

  const worstKey = Object.entries(dimensions).sort((a, b) => a[1] - b[1])[0]?.[0];
  const advice = worstKey ? SCORE_ADVICE[worstKey] : null;

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck size={15} style={{ color }} />
        <h3 className="text-display font-bold text-sm">Score Financiero</h3>
      </div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <div className="flex-shrink-0 flex flex-col items-center gap-1">
          <div
            className="w-20 h-20 rounded-full border-4 flex items-center justify-center"
            style={{ borderColor: color }}
          >
            <span className="text-display font-bold text-2xl text-mono" style={{ color }}>{total}</span>
          </div>
          <span className="text-xs font-semibold" style={{ color }}>{label}</span>
        </div>
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
          {dims.map(({ key, label: dimLabel, hint }) => {
            const val = dimensions[key] ?? 0;
            const pct = (val / 25) * 100;
            const c = pct >= 75 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#f43f5e';
            return (
              <div key={key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--text-muted)]">{dimLabel}</span>
                  <span className="font-semibold text-mono" style={{ color: c }}>{val}/25</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-100 dark:bg-surface-700 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: c }} />
                </div>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{hint}</p>
              </div>
            );
          })}
        </div>
      </div>
      {total < 95 && advice && (
        <p className="text-xs text-[var(--text-muted)] mt-3 pt-3 border-t border-[var(--border)] italic">
          💡 {advice}
        </p>
      )}
    </div>
  );
}

const EMPTY_QUICK = {
  type: 'expense', category_id: '', amount: '', description: '',
  txn_date: localDate(), debt_id: '', savings_goal_id: '', credit_card_id: '', account_id: '',
  extra_principal: '0', payment_method: 'cash',
};

function BudgetPulseCard({ pulse, currency }) {
  const { total_budget, total_spent, pct, days_in_month, day_of_month, expected_pct, status } = pulse;
  const free = Math.max(0, total_budget - total_spent);
  const barColor = status === 'over' ? '#f43f5e' : status === 'warning' ? '#f59e0b' : '#22c55e';
  const statusLabel = status === 'over' ? 'Presupuesto superado' : status === 'warning' ? 'Cuidado — vas rápido' : 'Vas bien';
  const statusEmoji = status === 'over' ? '🔴' : status === 'warning' ? '🟡' : '🟢';

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target size={15} className="text-[var(--text-muted)]" />
          <h3 className="text-display font-bold text-sm">Pulso del mes</h3>
        </div>
        <Link to="/app/budget" className="text-xs text-brand-400 hover:underline flex items-center gap-1">
          Ver detalle <ArrowRight size={12} />
        </Link>
      </div>
      <p className="text-sm text-[var(--text-muted)] mb-3">
        Llevas el <span className="font-semibold text-[var(--text)]">{pct}%</span> de tu presupuesto — día {day_of_month} de {days_in_month}
      </p>
      <div className="relative h-2.5 rounded-full bg-[var(--surface-2)] overflow-hidden mb-1">
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all"
          style={{ width: `${Math.min(100, pct)}%`, background: barColor }}
        />
        {/* Marcador de ritmo esperado */}
        <div
          className="absolute top-0 h-full w-0.5 bg-white/40"
          style={{ left: `${Math.min(100, expected_pct)}%` }}
        />
      </div>
      <div className="flex justify-between text-[11px] text-[var(--text-muted)] mb-3">
        <span>{pct}% gastado</span>
        <span className="flex items-center gap-1">{statusEmoji} {statusLabel} · esperado {expected_pct}%</span>
      </div>
      <div className="flex gap-4 text-xs">
        <div><p className="text-[var(--text-muted)]">Presupuestado</p><p className="font-semibold">{fmt.currency(total_budget, currency)}</p></div>
        <div><p className="text-[var(--text-muted)]">Gastado</p><p className="font-semibold">{fmt.currency(total_spent, currency)}</p></div>
        <div><p className="text-[var(--text-muted)]">Disponible</p><p className="font-semibold" style={{ color: free === 0 ? '#f43f5e' : barColor }}>{fmt.currency(free, currency)}</p></div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const {
    dashboard, dashLoading, fetchDashboard, user,
    recurring, fetchRecurring,
    debts, fetchDebts,
    goals, fetchGoals,
    creditCards, fetchCreditCards,
    accounts, fetchAccounts,
    categories, fetchCategories, createTransaction,
  } = useStore();

  const [period, setPeriod]             = useState('biweekly');
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [quickModal, setQuickModal]     = useState(false);
  const [quickForm,  setQuickForm]      = useState(EMPTY_QUICK);
  const [quickBusy,  setQuickBusy]      = useState(false);

  useEffect(() => {
    fetchDashboard();
    fetchRecurring();
    fetchDebts();
    fetchGoals();
    fetchCreditCards();
    fetchAccounts();
    fetchCategories();
  }, []);

  if (dashLoading && !dashboard) return <Spinner />;

  const d        = dashboard;
  const currency = user?.currency || 'USD';

  /* ── Quick add ────────────────────────────────────────────── */
  const openQuick = () => { setQuickForm({ ...EMPTY_QUICK, txn_date: localDate() }); setQuickModal(true); };
  const saveQuick = async (e) => {
    e.preventDefault();
    setQuickBusy(true);
    try {
      await createTransaction({
        ...quickForm,
        debt_id:         quickForm.debt_id         || null,
        savings_goal_id: quickForm.savings_goal_id || null,
        credit_card_id:  quickForm.credit_card_id  || null,
        account_id:      quickForm.account_id      || null,
        extra_principal: 0,
      });
      setQuickModal(false);
      fetchDashboard();
    } finally { setQuickBusy(false); }
  };
  const setQuickMethod = (m) => setQuickForm(f => ({
    ...f,
    payment_method: m,
    credit_card_id: m === 'card'  ? f.credit_card_id : '',
    account_id:     m === 'debit' ? f.account_id     : '',
  }));
  const quickCats      = categories.filter(c => !quickForm.type || c.type === quickForm.type);
  const quickPayMethod = quickForm.payment_method || 'cash';

  /* ── Distribución de ingresos ─────────────────────────────── */
  const activeRec   = recurring.filter(r => r.is_active);
  const activeDebts = debts.filter(d => d.is_active);

  const monthlyIncome  = activeRec.filter(r => r.type === 'income')
    .reduce((s, r) => s + monthlyEq(r.amount, r.frequency), 0);
  const monthlyFixed   = activeRec.filter(r => r.type === 'expense')
    .reduce((s, r) => s + monthlyEq(r.amount, r.frequency), 0);
  const monthlyDebts   = activeDebts
    .reduce((s, d) => s + Number(d.monthly_payment), 0);

  const activeGoals = goals.filter(g => !g.is_completed && g.deadline);
  const goalsWithMonthly = activeGoals.map(g => {
    const remaining = Math.max(0, g.target_amount - g.current_amount);
    const now = new Date();
    const t   = new Date(String(g.deadline).split('T')[0] + 'T00:00:00');
    const months = Math.max(1, (t.getFullYear() - now.getFullYear()) * 12 + (t.getMonth() - now.getMonth()));
    return { ...g, neededMonthly: remaining / months };
  });
  const monthlySavings = goalsWithMonthly.reduce((s, g) => s + g.neededMonthly, 0);

  const div         = period === 'biweekly' ? 2 : 1;
  const periodLabel = period === 'biweekly' ? 'quincenal' : 'mensual';

  const pIncome  = monthlyIncome  / div;
  const pFixed   = monthlyFixed   / div;
  const pDebts   = monthlyDebts   / div;
  const pSavings = monthlySavings / div;
  const pFree    = pIncome - pFixed - pDebts - pSavings;

  const fixedPct   = monthlyIncome > 0 ? Math.min(100, (monthlyFixed   / monthlyIncome) * 100) : 0;
  const debtPct    = monthlyIncome > 0 ? Math.min(100, (monthlyDebts   / monthlyIncome) * 100) : 0;
  const savingsPct = monthlyIncome > 0 ? Math.min(100, (monthlySavings / monthlyIncome) * 100) : 0;
  const freePct    = Math.max(0, 100 - fixedPct - debtPct - savingsPct);
  const debtRatio  = monthlyIncome > 0 ? (monthlyDebts / monthlyIncome) : 0;

  const breakdownItems = [
    {
      category: 'Gastos fijos', color: '#f43f5e', total: pFixed,
      items: activeRec.filter(r => r.type === 'expense').map(r => ({
        name: r.description || r.category_name,
        amount: monthlyEq(r.amount, r.frequency) / div,
      })),
    },
    {
      category: 'Deudas', color: '#f59e0b', total: pDebts,
      items: activeDebts.map(d => ({ name: d.name, amount: Number(d.monthly_payment) / div })),
    },
    {
      category: 'Metas de ahorro', color: '#6366f1', total: pSavings,
      items: goalsWithMonthly.map(g => ({ name: g.name, amount: g.neededMonthly / div })),
    },
  ].filter(g => g.items.length > 0);

  /* ── Trend chart ──────────────────────────────────────────── */
  const trendData = (d?.monthly_trend || []).map(row => ({
    month:    row.month,
    income:   Number(row.income)   || 0,
    expenses: Number(row.expenses) || 0,
  }));
  const tickK = (v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v;

  /* ── Fallback distribución sin recurrentes ────────────────── */
  const actualMonthIncome   = d?.this_month?.income   || 0;
  const actualMonthExpenses = d?.this_month?.expenses || 0;
  const hasRecurringIncome  = monthlyIncome > 0;
  const hasActualData       = actualMonthIncome > 0;

  /* ── Accounts multi-currency ──────────────────────────────── */
  const accountCurrencies = [...new Set(accounts.map(a => a.currency || 'USD'))];
  const singleCurrency    = accountCurrencies.length <= 1;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display font-bold text-xl">Dashboard</h1>
          <p className="text-[var(--text-muted)] text-sm">Resumen de tu situación financiera</p>
        </div>
        <button onClick={openQuick} className="btn-primary">
          <Plus size={15} /> Registrar
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Balance total"      value={fmt.currency(d?.balance?.total, currency)}        icon={Wallet}      color="brand" />
        <StatCard label="Ingresos este mes"  value={fmt.currency(d?.this_month?.income, currency)}    icon={TrendingUp}  color="green" />
        <StatCard label="Gastos este mes"    value={fmt.currency(d?.this_month?.expenses, currency)}  icon={TrendingDown} color="rose" />
        <StatCard label="Deuda total activa" value={fmt.currency(d?.total_debt, currency)}            icon={CreditCard}  color="amber" />
      </div>

      {/* Pulso del presupuesto */}
      {d?.budget_pulse && <BudgetPulseCard pulse={d.budget_pulse} currency={currency} />}

      {/* Tendencia 6 meses */}
      {trendData.length > 0 && (
        <div className="card">
          <h3 className="text-display font-bold text-sm mb-3">Tendencia — últimos 6 meses</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={trendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={12}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tickFormatter={fmt.monthYear} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={tickK} />
              <Tooltip
                formatter={(v) => fmt.currency(v, currency)}
                labelFormatter={fmt.monthYear}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="income"   name="Ingresos" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Gastos"   fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-green-500 inline-block" />Ingresos</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-rose-500 inline-block" />Gastos</span>
          </div>
        </div>
      )}

      {/* Score Financiero */}
      {d?.score != null && <ScoreCard score={d.score} />}

      {/* Cuentas bancarias */}
      {accounts.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Landmark size={15} className="text-brand-500" />
              <h3 className="text-display font-bold text-sm">Cuentas</h3>
            </div>
            <Link to="/accounts" className="text-brand-500 text-xs hover:underline">Ver todas</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {accounts.map(a => (
              <div key={a.id} className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800 border border-[var(--border)]">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: a.color }} />
                  <p className="text-xs font-medium truncate">{a.name}</p>
                </div>
                <p className={clsx('text-display font-bold text-sm text-mono', a.balance < 0 ? 'text-rose-500' : '')}>
                  {fmt.currency(a.balance, a.currency || 'USD')}
                </p>
                <p className="text-[10px] text-[var(--text-muted)]">{a.type_label} · {a.currency || 'USD'}</p>
              </div>
            ))}
            {singleCurrency && (
              <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800 border border-[var(--border)] flex flex-col justify-center items-center">
                <p className="text-[10px] text-[var(--text-muted)] mb-0.5">Total</p>
                <p className={clsx('text-display font-bold text-base text-mono',
                  accounts.reduce((s, a) => s + a.balance, 0) < 0 ? 'text-rose-500' : 'text-green-500')}>
                  {fmt.currency(accounts.reduce((s, a) => s + a.balance, 0), accountCurrencies[0] || currency)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tarjetas de crédito */}
      {creditCards.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {creditCards.map(card => {
            const pct = card.credit_limit > 0
              ? Math.min(100, (card.current_balance / card.credit_limit) * 100)
              : 0;
            const color = pct > 80 ? '#f43f5e' : pct > 50 ? '#f59e0b' : '#22c55e';
            const cutDate = card.billing_day ? nextDayOfMonth(card.billing_day) : null;
            const dueDate = card.due_day    ? nextDayOfMonth(card.due_day)     : null;
            return (
              <div key={card.id} className="card !p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 rounded-md flex-shrink-0" style={{ background: card.color || '#6366f1' }} />
                    <p className="text-xs font-semibold truncate">{card.name}</p>
                  </div>
                  {card.last_four && (
                    <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0">···{card.last_four}</span>
                  )}
                </div>
                <div>
                  <p className="text-display font-bold text-sm text-mono" style={{ color }}>
                    {fmt.currency(card.current_balance, currency)}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    de {fmt.currency(card.credit_limit, currency)} · {pct.toFixed(0)}%
                  </p>
                </div>
                <div className="h-1.5 rounded-full bg-surface-100 dark:bg-surface-700 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
                </div>
                {(cutDate || dueDate) && (
                  <div className="border-t border-[var(--border)] pt-1.5 space-y-0.5">
                    {cutDate && (
                      <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                        <Scissors size={10} className="flex-shrink-0" />
                        <span>Corte: <span className="font-medium text-[var(--text)]">{fmt.date(cutDate)}</span></span>
                      </div>
                    )}
                    {dueDate && (
                      <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                        <CalendarClock size={10} className="flex-shrink-0" />
                        <span>Pago: <span className="font-medium text-[var(--text)]">{fmt.date(dueDate)}</span></span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Últimas transacciones — arriba para mobile */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-display font-bold text-sm">Últimas transacciones</h3>
          <Link to="/transactions" className="text-brand-500 text-xs flex items-center gap-1 hover:underline">
            Ver todas <ArrowRight size={12} />
          </Link>
        </div>
        {!d?.recent_transactions?.length ? (
          <p className="text-xs text-[var(--text-muted)]">Sin transacciones</p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {d.recent_transactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: `${t.color}20`, color: t.color }}
                  >
                    {t.type === 'income' ? <ArrowUpCircle size={14} /> : <ArrowDownCircle size={14} />}
                  </div>
                  <div>
                    <p className="text-xs font-medium">{t.description || t.category_name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{fmt.date(t.txn_date)} · {t.category_name}</p>
                  </div>
                </div>
                <span className={t.type === 'income' ? 'amount-positive' : 'amount-negative'} style={{ fontSize: 13 }}>
                  {t.type === 'income' ? '+' : '-'}{fmt.currency(t.amount, currency)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Distribución de ingresos */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-display font-bold text-sm">Distribución de ingresos</h3>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg overflow-hidden border border-[var(--border)] text-xs">
                {['monthly', 'biweekly'].map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={clsx(
                      'px-2.5 py-1 transition-colors',
                      period === p
                        ? 'bg-brand-500 text-white font-semibold'
                        : 'text-[var(--text-muted)] hover:bg-surface-100 dark:hover:bg-surface-700'
                    )}
                  >
                    {p === 'monthly' ? 'Mensual' : 'Quincenal'}
                  </button>
                ))}
              </div>
              <Link to="/planning" className="text-brand-500 text-xs hover:underline hidden sm:block">Ver plan</Link>
            </div>
          </div>

          {!hasRecurringIncome ? (
            hasActualData ? (
              /* Fallback con datos reales del mes cuando no hay recurrentes */
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-3">
                  Basado en transacciones reales de este mes ·{' '}
                  <Link to="/transactions" className="text-brand-500 hover:underline">Agregar ingresos recurrentes</Link>
                </p>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: 'Ingresos',   value: actualMonthIncome,                       color: 'text-green-500' },
                    { label: 'Gastos',     value: actualMonthExpenses,                     color: 'text-rose-500' },
                    { label: 'Disponible', value: actualMonthIncome - actualMonthExpenses,  color: (actualMonthIncome - actualMonthExpenses) >= 0 ? 'text-green-500' : 'text-rose-500' },
                  ].map(({ label, value, color }) => (
                    <div key={label}>
                      <p className="text-xs text-[var(--text-muted)] mb-0.5">{label}</p>
                      <p className={clsx('text-display font-bold text-sm text-mono', color)}>
                        {fmt.currency(value, currency)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="flex h-4 rounded-lg overflow-hidden gap-px">
                  <div className="bg-rose-500 transition-all duration-700 h-full"
                    style={{ width: `${Math.min(100, actualMonthIncome > 0 ? (actualMonthExpenses / actualMonthIncome) * 100 : 100)}%` }} />
                  <div className="bg-green-500/25 flex-1 h-full" />
                </div>
                <div className="flex gap-4 mt-2 text-xs text-[var(--text-muted)]">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-rose-500 inline-block" />
                    Gastos {actualMonthIncome > 0 ? ((actualMonthExpenses / actualMonthIncome) * 100).toFixed(0) : 0}%
                  </span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-green-500/40 inline-block" />
                    Libre {actualMonthIncome > 0 ? Math.max(0, 100 - (actualMonthExpenses / actualMonthIncome) * 100).toFixed(0) : 0}%
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-[180px] flex flex-col items-center justify-center text-[var(--text-muted)] text-sm gap-2">
                <TrendingUp size={28} className="opacity-30" />
                <p className="text-xs">Agrega ingresos recurrentes para ver tu distribución</p>
                <Link to="/transactions" className="text-brand-500 text-xs hover:underline">Transacciones → Recurrentes</Link>
              </div>
            )
          ) : (
            <>
              {/* Stats: 5 columnas */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                {[
                  { label: 'Ingresos',     value: pIncome,  color: 'text-green-500' },
                  { label: 'Gastos fijos', value: pFixed,   color: 'text-[var(--text)]' },
                  { label: 'Deudas',       value: pDebts,   color: 'text-rose-500' },
                  { label: 'Metas',        value: pSavings, color: 'text-brand-500' },
                  { label: 'Disponible',   value: pFree,    color: pFree >= 0 ? 'text-green-500' : 'text-rose-500' },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <p className="text-xs text-[var(--text-muted)] mb-0.5">{label}</p>
                    <p className={clsx('text-display font-bold text-sm text-mono', color)}>
                      {fmt.currency(value, currency)}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)]">/{periodLabel}</p>
                  </div>
                ))}
              </div>

              {/* Barra de distribución */}
              <div className="space-y-2 mb-3">
                <div className="flex h-4 rounded-lg overflow-hidden gap-px">
                  <div className="bg-rose-500   transition-all duration-700 h-full" style={{ width: `${fixedPct}%`   }} />
                  <div className="bg-amber-500  transition-all duration-700 h-full" style={{ width: `${debtPct}%`    }} />
                  <div className="bg-brand-500  transition-all duration-700 h-full" style={{ width: `${savingsPct}%` }} />
                  <div className="bg-green-500/25 flex-1 h-full" style={{ minWidth: freePct > 0 ? undefined : 0 }} />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-rose-500 inline-block" />Gastos {fixedPct.toFixed(0)}%</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-amber-500 inline-block" />Deudas {debtPct.toFixed(0)}%</span>
                  {savingsPct > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-brand-500 inline-block" />Metas {savingsPct.toFixed(0)}%</span>}
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-green-500/40 inline-block" />Libre {freePct.toFixed(0)}%</span>
                </div>
              </div>

              {/* Desglose */}
              {breakdownItems.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowBreakdown(v => !v)}
                    className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                  >
                    {showBreakdown ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    {showBreakdown ? 'Ocultar desglose' : 'Ver desglose detallado'}
                  </button>
                  {showBreakdown && (
                    <div className="mt-3 space-y-3">
                      {breakdownItems.map(group => (
                        <div key={group.category}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold" style={{ color: group.color }}>{group.category}</span>
                            <span className="text-xs font-semibold text-mono">{fmt.currency(group.total, currency)}</span>
                          </div>
                          <div className="space-y-1 pl-2 border-l-2" style={{ borderColor: group.color + '40' }}>
                            {group.items.map((item, i) => (
                              <div key={i} className="flex justify-between text-xs">
                                <span className="text-[var(--text-muted)] truncate mr-2">{item.name}</span>
                                <span className="text-mono text-[var(--text)] flex-shrink-0">{fmt.currency(item.amount, currency)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-[var(--border)] flex justify-between text-xs font-semibold">
                        <span>Total a mover</span>
                        <span className="text-mono">{fmt.currency(pFixed + pDebts + pSavings, currency)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Alertas de deuda */}
              {debtRatio > 0.40 && (
                <div className="mt-3 p-2.5 rounded-lg border border-rose-400 bg-rose-50 dark:bg-rose-900/10 text-xs text-rose-700 dark:text-rose-400">
                  ⚠ Tus cuotas de deuda representan el <strong>{(debtRatio * 100).toFixed(0)}%</strong> de tus ingresos. Se recomienda no superar el 30–35%.
                </div>
              )}
              {debtRatio > 0.30 && debtRatio <= 0.40 && (
                <div className="mt-3 p-2.5 rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-900/10 text-xs text-amber-700 dark:text-amber-400">
                  Tus cuotas de deuda son el <strong>{(debtRatio * 100).toFixed(0)}%</strong> de tus ingresos. Límite saludable: 30%.
                </div>
              )}
            </>
          )}
        </div>

        {/* Panel derecho */}
        <div className="space-y-3">
          {/* Próximos pagos */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <Bell size={15} className="text-amber-500" />
              <h3 className="text-display font-bold text-sm">Próximos pagos</h3>
            </div>
            {d?.debts?.filter(db => db.current_balance > 0).length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">Sin deudas activas</p>
            ) : (
              d?.debts?.filter(db => db.current_balance > 0).map((debt) => (
                <div key={debt.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                  <div>
                    <p className="text-xs font-medium truncate max-w-[120px]">{debt.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">Próx. {fmt.date(debt.next_due)}</p>
                  </div>
                  <span className="text-xs font-semibold text-mono text-amber-500">
                    {fmt.currency(debt.monthly_payment, currency)}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Próximos gastos recurrentes */}
          {activeRec.filter(r => r.type === 'expense').length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <RefreshCw size={15} className="text-rose-500" />
                <h3 className="text-display font-bold text-sm">Próximos gastos</h3>
              </div>
              {activeRec
                .filter(r => r.type === 'expense')
                .sort((a, b) => String(a.next_date).localeCompare(String(b.next_date)))
                .slice(0, 5)
                .map(r => (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0 gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{r.description || r.category_name}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {fmt.date(r.next_date)}
                        {r.frequency === 'biweekly' && <span className="ml-1 text-[10px]">· quincenal</span>}
                        {r.frequency === 'monthly'  && <span className="ml-1 text-[10px]">· mensual</span>}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-mono text-rose-500 flex-shrink-0">
                      -{fmt.currency(r.amount, currency)}
                    </span>
                  </div>
                ))}
            </div>
          )}

          {/* Metas */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <PiggyBank size={15} className="text-brand-500" />
                <h3 className="text-display font-bold text-sm">Metas</h3>
              </div>
              <Link to="/savings" className="text-brand-500 text-xs hover:underline">Ver todas</Link>
            </div>
            {d?.goals?.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">Sin metas creadas</p>
            ) : (
              d?.goals?.slice(0, 3).map((g) => {
                const pct = Math.min(100, (g.current_amount / g.target_amount) * 100);
                return (
                  <div key={g.id} className="mb-3 last:mb-0">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium truncate max-w-[140px]">{g.name}</span>
                      <span className="text-[var(--text-muted)] text-mono">{pct.toFixed(0)}%</span>
                    </div>
                    <ProgressBar value={g.current_amount} max={g.target_amount} color={g.color} />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal registrar transacción rápida */}
      <Modal open={quickModal} onClose={() => setQuickModal(false)} title="Registrar transacción">
        <form onSubmit={saveQuick} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {['income', 'expense'].map((tp) => (
              <button key={tp} type="button"
                onClick={() => setQuickForm(f => ({ ...f, type: tp, category_id: '', debt_id: '', savings_goal_id: '', credit_card_id: '' }))}
                className={clsx(
                  'p-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2',
                  quickForm.type === tp
                    ? tp === 'income'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-600'
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
            <select className="input" value={quickForm.category_id}
              onChange={e => setQuickForm(f => ({ ...f, category_id: e.target.value }))} required>
              <option value="">Seleccionar...</option>
              {quickCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Monto</label>
              <input className="input" type="number" step="0.01" min="0.01" placeholder="0.00"
                value={quickForm.amount} onChange={e => setQuickForm(f => ({ ...f, amount: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Fecha</label>
              <input className="input" type="date" value={quickForm.txn_date}
                onChange={e => setQuickForm(f => ({ ...f, txn_date: e.target.value }))} required />
            </div>
          </div>
          <div>
            <label className="label">Descripción (opcional)</label>
            <input className="input" type="text" placeholder="Ej: Supermercado"
              value={quickForm.description} onChange={e => setQuickForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          {(accounts.length > 0 || creditCards.length > 0) && (
            <div>
              <label className="label">Forma de pago</label>
              <div className={clsx(
                'grid gap-2',
                (creditCards.length > 0 && quickForm.type === 'expense') ? 'grid-cols-3' : accounts.length > 0 ? 'grid-cols-2' : 'grid-cols-1'
              )}>
                <button type="button" onClick={() => setQuickMethod('cash')}
                  className={clsx('flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl border text-xs font-medium transition-all',
                    quickPayMethod === 'cash' ? 'border-brand-500 bg-brand-500/10 text-brand-500' : 'border-[var(--border)] text-[var(--text-muted)] hover:border-brand-400')}>
                  💵 Efectivo
                </button>
                {accounts.length > 0 && (
                  <button type="button" onClick={() => setQuickMethod('debit')}
                    className={clsx('flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl border text-xs font-medium transition-all',
                      quickPayMethod === 'debit' ? 'border-brand-500 bg-brand-500/10 text-brand-500' : 'border-[var(--border)] text-[var(--text-muted)] hover:border-brand-400')}>
                    🏦 Débito
                  </button>
                )}
                {creditCards.length > 0 && quickForm.type === 'expense' && (
                  <button type="button" onClick={() => setQuickMethod('card')}
                    className={clsx('flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl border text-xs font-medium transition-all',
                      quickPayMethod === 'card' ? 'border-brand-500 bg-brand-500/10 text-brand-500' : 'border-[var(--border)] text-[var(--text-muted)] hover:border-brand-400')}>
                    💳 Tarjeta
                  </button>
                )}
              </div>
              {quickPayMethod === 'debit' && accounts.length > 0 && (
                <select className="input mt-2" value={quickForm.account_id}
                  onChange={e => setQuickForm(f => ({ ...f, account_id: e.target.value }))}>
                  <option value="">— Seleccionar cuenta —</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.currency || 'USD'})</option>)}
                </select>
              )}
              {quickPayMethod === 'card' && creditCards.length > 0 && (
                <select className="input mt-2" value={quickForm.credit_card_id}
                  onChange={e => setQuickForm(f => ({ ...f, credit_card_id: e.target.value }))}>
                  <option value="">— Seleccionar tarjeta —</option>
                  {creditCards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setQuickModal(false)} className="btn-ghost flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={quickBusy} className="btn-primary flex-1 justify-center">
              {quickBusy ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
