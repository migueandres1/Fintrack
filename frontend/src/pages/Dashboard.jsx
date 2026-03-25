import { useEffect, useState } from 'react';
import {
  Wallet, TrendingUp, TrendingDown, CreditCard, PiggyBank, Bell, ArrowRight,
  ChevronDown, ChevronUp, RefreshCw, Scissors, CalendarClock, ShieldCheck, Landmark,
} from 'lucide-react';
import { Link }       from 'react-router-dom';
import { useStore }   from '../store/index.js';
import { fmt }        from '../utils/format.js';
import { StatCard, ProgressBar, Spinner } from '../components/ui/index.jsx';
import clsx           from 'clsx';

// Próxima fecha de un día-del-mes (este mes si aún no pasó, si no el siguiente)
function nextDayOfMonth(day) {
  const today = new Date();
  const d = Math.max(1, Math.min(28, day)); // cap a 28 para evitar meses cortos
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

function ScoreCard({ score }) {
  const { total, dimensions } = score;
  const color = total >= 75 ? '#22c55e' : total >= 50 ? '#f59e0b' : '#f43f5e';
  const label = total >= 75 ? 'Excelente' : total >= 50 ? 'Regular' : 'Por mejorar';
  const dims = [
    { key: 'liquidez', label: 'Liquidez',        hint: 'Meses de gastos cubiertos' },
    { key: 'ahorro',   label: 'Tasa de ahorro',  hint: '% ingreso ahorrado este mes' },
    { key: 'deuda',    label: 'Nivel de deuda',  hint: 'Cuotas vs ingresos' },
    { key: 'metas',    label: 'Metas',            hint: 'Progreso promedio' },
  ];
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck size={15} style={{ color }} />
        <h3 className="text-display font-bold text-sm">Score Financiero</h3>
      </div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
        {/* Círculo de score */}
        <div className="flex-shrink-0 flex flex-col items-center gap-1">
          <div
            className="w-20 h-20 rounded-full border-4 flex items-center justify-center"
            style={{ borderColor: color }}
          >
            <span className="text-display font-bold text-2xl text-mono" style={{ color }}>{total}</span>
          </div>
          <span className="text-xs font-semibold" style={{ color }}>{label}</span>
        </div>
        {/* Dimensiones */}
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
  } = useStore();

  useEffect(() => {
    fetchDashboard();
    fetchRecurring();
    fetchDebts();
    fetchGoals();
    fetchCreditCards();
    fetchAccounts();
  }, []);

  const [period, setPeriod]         = useState('biweekly');
  const [showBreakdown, setShowBreakdown] = useState(false);

  if (dashLoading && !dashboard) return <Spinner />;

  const d        = dashboard;
  const currency = user?.currency || 'USD';

  /* ── Distribución de ingresos ─────────────────────────────────── */
  const activeRec   = recurring.filter(r => r.is_active);
  const activeDebts = debts.filter(d => d.is_active);

  const monthlyIncome  = activeRec.filter(r => r.type === 'income')
    .reduce((s, r) => s + monthlyEq(r.amount, r.frequency), 0);
  const monthlyFixed   = activeRec.filter(r => r.type === 'expense')
    .reduce((s, r) => s + monthlyEq(r.amount, r.frequency), 0);
  const monthlyDebts   = activeDebts
    .reduce((s, d) => s + Number(d.monthly_payment), 0);

  // Monthly savings needed per goal
  const activeGoals = goals.filter(g => !g.is_completed && g.deadline);
  const goalsWithMonthly = activeGoals.map(g => {
    const remaining = Math.max(0, g.target_amount - g.current_amount);
    const now = new Date();
    const t   = new Date(String(g.deadline).split('T')[0] + 'T00:00:00');
    const months = Math.max(1, (t.getFullYear() - now.getFullYear()) * 12 + (t.getMonth() - now.getMonth()));
    return { ...g, neededMonthly: remaining / months };
  });
  const monthlySavings = goalsWithMonthly.reduce((s, g) => s + g.neededMonthly, 0);

  // Per-period divisor: 2 for biweekly (quincenal), 1 for monthly
  const div         = period === 'biweekly' ? 2 : 1;
  const periodLabel = period === 'biweekly' ? 'quincenal' : 'mensual';

  const pIncome  = monthlyIncome  / div;
  const pFixed   = monthlyFixed   / div;
  const pDebts   = monthlyDebts   / div;
  const pSavings = monthlySavings / div;
  const pFree    = pIncome - pFixed - pDebts - pSavings;

  // Segmentos de la barra (% sobre ingreso mensual, siempre proporcionales)
  const fixedPct   = monthlyIncome > 0 ? Math.min(100, (monthlyFixed   / monthlyIncome) * 100) : 0;
  const debtPct    = monthlyIncome > 0 ? Math.min(100, (monthlyDebts   / monthlyIncome) * 100) : 0;
  const savingsPct = monthlyIncome > 0 ? Math.min(100, (monthlySavings / monthlyIncome) * 100) : 0;
  const freePct    = Math.max(0, 100 - fixedPct - debtPct - savingsPct);

  const debtRatio = monthlyIncome > 0 ? (monthlyDebts / monthlyIncome) : 0;

  // Items del desglose
  const breakdownItems = [
    {
      category: 'Gastos fijos',
      color: '#f43f5e',
      total: pFixed,
      items: activeRec.filter(r => r.type === 'expense').map(r => ({
        name: r.description || r.category_name,
        amount: monthlyEq(r.amount, r.frequency) / div,
      })),
    },
    {
      category: 'Deudas',
      color: '#f59e0b',
      total: pDebts,
      items: activeDebts.map(d => ({
        name: d.name,
        amount: Number(d.monthly_payment) / div,
      })),
    },
    {
      category: 'Metas de ahorro',
      color: '#6366f1',
      total: pSavings,
      items: goalsWithMonthly.map(g => ({
        name: g.name,
        amount: g.neededMonthly / div,
      })),
    },
  ].filter(g => g.items.length > 0);

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div>
        <h1 className="text-display font-bold text-xl">Dashboard</h1>
        <p className="text-[var(--text-muted)] text-sm">Resumen de tu situación financiera</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Balance total"
          value={fmt.currency(d?.balance?.total, currency)}
          icon={Wallet}
          color="brand"
        />
        <StatCard
          label="Ingresos este mes"
          value={fmt.currency(d?.this_month?.income, currency)}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          label="Gastos este mes"
          value={fmt.currency(d?.this_month?.expenses, currency)}
          icon={TrendingDown}
          color="rose"
        />
        <StatCard
          label="Deuda total activa"
          value={fmt.currency(d?.total_debt, currency)}
          icon={CreditCard}
          color="amber"
        />
      </div>

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
                  {fmt.currency(a.balance, currency)}
                </p>
                <p className="text-[10px] text-[var(--text-muted)]">{a.type_label}</p>
              </div>
            ))}
            <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800 border border-[var(--border)] flex flex-col justify-center items-center">
              <p className="text-[10px] text-[var(--text-muted)] mb-0.5">Total</p>
              <p className={clsx('text-display font-bold text-base text-mono',
                accounts.reduce((s, a) => s + a.balance, 0) < 0 ? 'text-rose-500' : 'text-green-500')}>
                {fmt.currency(accounts.reduce((s, a) => s + a.balance, 0), currency)}
              </p>
            </div>
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

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Distribución de ingresos */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-display font-bold text-sm">Distribución de ingresos</h3>
            <div className="flex items-center gap-2">
              {/* Toggle mensual / quincenal */}
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

          {monthlyIncome === 0 ? (
            <div className="h-[180px] flex flex-col items-center justify-center text-[var(--text-muted)] text-sm gap-2">
              <TrendingUp size={28} className="opacity-30" />
              <p className="text-xs">Agrega ingresos recurrentes para ver tu distribución</p>
              <Link to="/transactions" className="text-brand-500 text-xs hover:underline">Transacciones → Recurrentes</Link>
            </div>
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
                  <div className="bg-rose-500   transition-all duration-700 h-full" style={{ width: `${fixedPct}%`   }} title={`Gastos fijos ${fixedPct.toFixed(0)}%`} />
                  <div className="bg-amber-500  transition-all duration-700 h-full" style={{ width: `${debtPct}%`    }} title={`Deudas ${debtPct.toFixed(0)}%`} />
                  <div className="bg-brand-500  transition-all duration-700 h-full" style={{ width: `${savingsPct}%` }} title={`Metas ${savingsPct.toFixed(0)}%`} />
                  <div className="bg-green-500/25 flex-1 h-full" style={{ minWidth: freePct > 0 ? undefined : 0 }} />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-rose-500 inline-block" />Gastos {fixedPct.toFixed(0)}%</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-amber-500 inline-block" />Deudas {debtPct.toFixed(0)}%</span>
                  {savingsPct > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-brand-500 inline-block" />Metas {savingsPct.toFixed(0)}%</span>}
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-green-500/40 inline-block" />Libre {freePct.toFixed(0)}%</span>
                </div>
              </div>

              {/* Desglose por categoría */}
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
                      {/* Total comprometido */}
                      <div className="pt-2 border-t border-[var(--border)] flex justify-between text-xs font-semibold">
                        <span>Total a mover</span>
                        <span className="text-mono">{fmt.currency(pFixed + pDebts + pSavings, currency)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Alerta de sobreendeudamiento */}
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
          {/* Upcoming payments */}
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
          {activeRec.filter(r => r.type === 'expense' && r.is_active).length > 0 && (
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

          {/* Goals */}
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

      {/* Recent Transactions */}
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
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-xs"
                    style={{ background: `${t.color}20`, color: t.color }}
                  >
                    {t.category_name?.[0]}
                  </div>
                  <div>
                    <p className="text-xs font-medium">{t.description || t.category_name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{fmt.date(t.txn_date)}</p>
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

      {/* Debts summary */}
      {d?.debts?.filter(db => db.is_active).length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-display font-bold text-sm">Deudas activas</h3>
            <Link to="/debts" className="text-brand-500 text-xs flex items-center gap-1 hover:underline">
              Administrar <ArrowRight size={12} />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {d.debts.filter(db => db.is_active).map((debt) => {
              const pct = 100 - (debt.current_balance / (debt.initial_balance || 1)) * 100;
              return (
                <div key={debt.id} className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800 border border-[var(--border)]">
                  <div className="flex justify-between mb-2">
                    <p className="text-xs font-semibold">{debt.name}</p>
                    <span className="text-xs text-[var(--text-muted)] text-mono">{fmt.pct(debt.annual_rate)}/año</span>
                  </div>
                  <p className="text-display font-bold text-base text-mono mb-2">
                    {fmt.currency(debt.current_balance, currency)}
                  </p>
                  <ProgressBar value={pct} max={100} color="#f43f5e" />
                  <p className="text-xs text-[var(--text-muted)] mt-1">{pct.toFixed(0)}% pagado</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
