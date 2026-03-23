import { useEffect, useState, useMemo } from 'react';
import { Target, TrendingDown, Calendar, AlertTriangle, CheckCircle2, Info, ChevronDown, ChevronUp, CalendarPlus } from 'lucide-react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useStore } from '../store/index.js';
import { fmt } from '../utils/format.js';
import { ProgressBar, Spinner } from '../components/ui/index.jsx';
import clsx from 'clsx';

// Convierte cualquier frecuencia a equivalente mensual
function monthlyEq(amount, frequency) {
  if (frequency === 'weekly')   return (Number(amount) * 52) / 12;
  if (frequency === 'biweekly') return Number(amount) * 2;
  if (frequency === 'yearly')   return Number(amount) / 12;
  return Number(amount);
}

// Meses completos entre dos fechas
function monthsUntil(target) {
  const now = new Date();
  const t   = new Date(String(target).split('T')[0] + 'T00:00:00');
  return Math.max(0, (t.getFullYear() - now.getFullYear()) * 12 + (t.getMonth() - now.getMonth()));
}

// Día de mes de una fecha ISO
function dayOf(dateStr) {
  return new Date(String(dateStr).split('T')[0] + 'T00:00:00').getDate();
}

// Construye la proyección combinada de saldo total de todas las deudas
// useBase=true → usa projectionBase (sin adelantos), false → projection (con adelantos)
function buildDebtProjection(debts, useBase = false) {
  if (!debts.length) return [];

  const getSchedule = (d) => {
    if (useBase && d.projectionBase) return d.projectionBase.schedule || [];
    return d.projection?.schedule || [];
  };

  const dateSet = new Set();
  debts.forEach(d => {
    getSchedule(d).forEach(row => dateSet.add(row.date));
  });

  const dates = [...dateSet].sort();
  if (!dates.length) return [];

  return dates.map(date => {
    let totalBalance = 0;
    debts.forEach(d => {
      const schedule = getSchedule(d);
      const row = schedule.find(r => r.date === date);
      if (row) {
        totalBalance += row.balance;
      } else if (schedule.length > 0) {
        const lastRow = schedule[schedule.length - 1];
        if (date <= lastRow.date) {
          totalBalance += Number(d.current_balance);
        }
      }
    });
    return {
      date,
      label: new Date(date + 'T00:00:00').toLocaleDateString('es-SV', { month: 'short', year: '2-digit' }),
      balance: +totalBalance.toFixed(2),
    };
  });
}

function DebtChartTooltip({ active, payload, currency, anyHasPlans }) {
  if (!active || !payload?.length) return null;
  const { label, balance, balanceBase } = payload[0]?.payload || {};
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-2.5 shadow-xl text-xs space-y-0.5">
      <p className="font-semibold mb-1">{label}</p>
      {anyHasPlans ? (
        <>
          <p className="text-rose-500 font-medium flex justify-between gap-3">
            <span>Con plan:</span><span>{fmt.currency(balance, currency)}</span>
          </p>
          <p className="text-slate-400 font-medium flex justify-between gap-3">
            <span>Sin plan:</span><span>{fmt.currency(balanceBase, currency)}</span>
          </p>
        </>
      ) : (
        <p className="text-rose-500 font-medium">{fmt.currency(balance, currency)}</p>
      )}
    </div>
  );
}

export default function Planning() {
  const {
    debts, debtsLoading, fetchDebts,
    goals, goalsLoading, fetchGoals,
    recurring, recurringLoading, fetchRecurring,
    user,
  } = useStore();

  const [monthsToShow, setMonthsToShow] = useState(3);
  const currency = user?.currency || 'USD';
  const loading  = debtsLoading || goalsLoading || recurringLoading;

  useEffect(() => {
    fetchDebts();
    fetchGoals();
    fetchRecurring();
  }, []);

  /* ── Cálculos de flujo mensual ───────────────────────────── */
  const activeRec   = recurring.filter(r => r.is_active);
  const activeDebts = debts.filter(d => d.is_active);
  const activeGoals = goals.filter(g => !g.is_completed);

  const monthlyIncome  = activeRec.filter(r => r.type === 'income')
    .reduce((s, r) => s + monthlyEq(r.amount, r.frequency), 0);
  const monthlyFixed   = activeRec.filter(r => r.type === 'expense')
    .reduce((s, r) => s + monthlyEq(r.amount, r.frequency), 0);
  const monthlyDebts   = activeDebts
    .reduce((s, d) => s + Number(d.monthly_payment), 0);
  const monthlyTotal   = monthlyFixed + monthlyDebts;
  const freeCash       = monthlyIncome - monthlyTotal;
  const commitmentPct  = monthlyIncome > 0 ? Math.min(100, (monthlyTotal / monthlyIncome) * 100) : 0;
  const fixedPct       = monthlyIncome > 0 ? Math.min(100, (monthlyFixed / monthlyIncome) * 100) : 0;
  const debtPct        = monthlyIncome > 0 ? Math.min(100, (monthlyDebts / monthlyIncome) * 100) : 0;
  const debtRatio      = monthlyIncome > 0 ? monthlyDebts / monthlyIncome : 0;

  /* ── Análisis de metas ───────────────────────────────────── */
  const goalsAnalysis = activeGoals.map(g => {
    const remaining     = Math.max(0, g.target_amount - g.current_amount);
    const monthsLeft    = g.deadline ? monthsUntil(g.deadline) : null;
    const neededMonthly = monthsLeft > 0 ? remaining / monthsLeft : null;
    const pct           = Math.min(100, (g.current_amount / g.target_amount) * 100);
    return { ...g, remaining, monthsLeft, neededMonthly, pct };
  });
  const monthlySavingsNeeded = goalsAnalysis.reduce((s, g) => s + (g.neededMonthly || 0), 0);

  /* ── Proyección combinada de deudas ─────────────────────── */
  // ¿Alguna deuda tiene pagos adelantados planificados?
  const anyHasPlans    = activeDebts.some(d => d.projectionBase != null);

  const debtProjection     = useMemo(() => buildDebtProjection(activeDebts, false), [activeDebts]);
  const debtProjectionBase = useMemo(() => anyHasPlans ? buildDebtProjection(activeDebts, true) : [], [activeDebts, anyHasPlans]);

  const debtFreeDate     = activeDebts.length
    ? activeDebts.reduce((latest, d) => {
        const payoff = d.projection?.payoffDate;
        if (!payoff) return latest;
        return !latest || payoff > latest ? payoff : latest;
      }, null)
    : null;
  const debtFreeDateBase = anyHasPlans
    ? activeDebts.reduce((latest, d) => {
        const payoff = (d.projectionBase || d.projection)?.payoffDate;
        if (!payoff) return latest;
        return !latest || payoff > latest ? payoff : latest;
      }, null)
    : null;

  const totalInterest     = activeDebts.reduce((s, d) => s + (d.projection?.totalInterest || 0), 0);
  const totalInterestBase = anyHasPlans
    ? activeDebts.reduce((s, d) => s + ((d.projectionBase || d.projection)?.totalInterest || 0), 0)
    : totalInterest;

  // Combinar los dos datasets en uno para el ComposedChart (mismo eje X)
  const debtChartData = useMemo(() => {
    if (!debtProjection.length) return [];
    if (!anyHasPlans) return debtProjection.map(p => ({ ...p, balanceBase: undefined }));

    const baseMap = {};
    debtProjectionBase.forEach(p => { baseMap[p.date] = p.balance; });

    // Unión de fechas de ambas series
    const dateSet = new Set([...debtProjection.map(p => p.date), ...debtProjectionBase.map(p => p.date)]);
    const projMap = {};
    debtProjection.forEach(p => { projMap[p.date] = p; });

    return [...dateSet].sort().map(date => ({
      date,
      label: new Date(date + 'T00:00:00').toLocaleDateString('es-SV', { month: 'short', year: '2-digit' }),
      balance:     projMap[date]?.balance ?? 0,
      balanceBase: baseMap[date] ?? 0,
    }));
  }, [debtProjection, debtProjectionBase, anyHasPlans]);

  // Subsample chart if too many points
  const chartInterval  = Math.max(0, Math.ceil(debtChartData.length / 10) - 1);

  /* ── Próximos N meses ────────────────────────────────────── */
  const nextMonths = useMemo(() => Array.from({ length: monthsToShow }, (_, offset) => {
    const ref   = new Date();
    const year  = ref.getMonth() + offset > 11
      ? ref.getFullYear() + 1 : ref.getFullYear();
    const month = (ref.getMonth() + offset) % 12;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const label = new Date(year, month, 1)
      .toLocaleDateString('es-SV', { month: 'long', year: 'numeric' });

    const items = [];

    // Ingresos recurrentes (mensuales y quincenales)
    activeRec.filter(r => r.type === 'income').forEach(r => {
      const day1 = Math.min(dayOf(r.next_date || r.start_date), daysInMonth);
      if (r.frequency === 'monthly' || r.frequency === 'weekly' || r.frequency === 'yearly') {
        items.push({ label: r.description || r.category_name, amount: Number(r.amount), day: day1, kind: 'income', color: '#22c55e' });
      } else if (r.frequency === 'biweekly') {
        items.push({ label: r.description || r.category_name, amount: Number(r.amount), day: day1, kind: 'income', color: '#22c55e' });
        // Segunda quincena: si day1+15 cabe en el mes úsalo, si no toma day1-15 (la otra quincena del mes)
        const day2 = day1 + 15 <= daysInMonth ? day1 + 15 : day1 - 15;
        if (day2 >= 1 && day2 !== day1) {
          items.push({ label: r.description || r.category_name, amount: Number(r.amount), day: day2, kind: 'income', color: '#22c55e' });
        }
      }
    });

    // Cuotas de deuda
    activeDebts.forEach(d => {
      items.push({
        label:  d.name,
        amount: Number(d.monthly_payment),
        day:    d.payment_day || dayOf(d.start_date),
        kind:   'debt',
        color:  '#f43f5e',
      });
    });

    // Gastos recurrentes
    activeRec.filter(r => r.type === 'expense').forEach(r => {
      const day1 = Math.min(dayOf(r.next_date || r.start_date), daysInMonth);
      if (r.frequency === 'monthly' || r.frequency === 'weekly' || r.frequency === 'yearly') {
        items.push({ label: r.description || r.category_name, amount: Number(r.amount), day: day1, kind: 'expense', color: r.color || '#6366f1' });
      } else if (r.frequency === 'biweekly') {
        items.push({ label: r.description || r.category_name, amount: Number(r.amount), day: day1, kind: 'expense', color: r.color || '#6366f1' });
        const day2 = day1 + 15 <= daysInMonth ? day1 + 15 : day1 - 15;
        if (day2 >= 1 && day2 !== day1) {
          items.push({ label: r.description || r.category_name, amount: Number(r.amount), day: day2, kind: 'expense', color: r.color || '#6366f1' });
        }
      }
    });

    items.sort((a, b) => a.day - b.day);

    const totalOut = items.filter(i => i.kind !== 'income').reduce((s, i) => s + i.amount, 0);
    const totalIn  = items.filter(i => i.kind === 'income').reduce((s, i) => s + i.amount, 0);
    return { label, items, totalOut, totalIn, net: totalIn - totalOut };
  }), [monthsToShow, activeRec, activeDebts]);

  if (loading && !debts.length && !goals.length) return <Spinner />;

  return (
    <div className="space-y-6 animate-fade-up">

      {/* Header */}
      <div>
        <h1 className="text-display font-bold text-xl">Planificación</h1>
        <p className="text-[var(--text-muted)] text-sm">Visión clara de tus compromisos y metas financieras</p>
      </div>

      {/* ── Flujo mensual ───────────────────────────────────── */}
      <div className="card">
        <h2 className="text-display font-bold text-sm mb-4 flex items-center gap-2">
          <Info size={15} className="text-brand-500" /> Flujo mensual estimado
        </h2>

        {monthlyIncome === 0 ? (
          <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5 py-2">
            <Info size={13} />
            Agrega ingresos recurrentes (en Transacciones → Recurrentes) para ver tu flujo mensual.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
              {[
                { label: 'Ingresos recurrentes', value: monthlyIncome,    sub: `${activeRec.filter(r => r.type === 'income').length} fuentes`,      color: 'text-green-500' },
                { label: 'Gastos fijos',         value: monthlyFixed,     sub: `${activeRec.filter(r => r.type === 'expense').length} recurrentes`, color: 'text-[var(--text)]' },
                { label: 'Cuotas de deuda',      value: monthlyDebts,     sub: `${activeDebts.length} deuda${activeDebts.length !== 1 ? 's' : ''}`,  color: 'text-rose-500' },
                { label: 'Disponible',           value: freeCash,         sub: freeCash < 0 ? '⚠ déficit mensual' : 'después de compromisos',       color: freeCash >= 0 ? 'text-green-500' : 'text-rose-500' },
              ].map(({ label, value, sub, color }) => (
                <div key={label}>
                  <p className="text-xs text-[var(--text-muted)] mb-0.5">{label}</p>
                  <p className={clsx('text-display font-bold text-lg text-mono', color)}>{fmt.currency(value, currency)}</p>
                  <p className="text-xs text-[var(--text-muted)]">{sub}</p>
                </div>
              ))}
            </div>

            {/* Barra de distribución */}
            <div className="space-y-1.5">
              <div className="flex h-4 rounded-lg overflow-hidden gap-px bg-surface-100 dark:bg-surface-700">
                <div className="bg-rose-500 transition-all duration-700 h-full" style={{ width: `${fixedPct}%` }} />
                <div className="bg-amber-500 transition-all duration-700 h-full" style={{ width: `${debtPct}%` }} />
                <div className="bg-green-500/20 flex-1 h-full" />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-rose-500 inline-block" />Gastos fijos {fixedPct.toFixed(0)}%</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-amber-500 inline-block" />Deudas {debtPct.toFixed(0)}%</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-green-500/40 inline-block" />Disponible {Math.max(0, 100 - commitmentPct).toFixed(0)}%</span>
              </div>
            </div>

            {/* Alerta de deuda */}
            {debtRatio > 0.40 && (
              <div className="mt-3 p-3 rounded-lg border border-rose-400 bg-rose-50 dark:bg-rose-900/10 text-xs text-rose-700 dark:text-rose-400 flex items-start gap-2">
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                <span>Nivel de endeudamiento crítico: <strong>{(debtRatio * 100).toFixed(0)}%</strong> de tus ingresos va a deudas. Se recomienda no superar el 35%. Considera una estrategia de pago agresiva.</span>
              </div>
            )}
            {debtRatio > 0.30 && debtRatio <= 0.40 && (
              <div className="mt-3 p-3 rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-900/10 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                <span>Endeudamiento elevado: <strong>{(debtRatio * 100).toFixed(0)}%</strong> de tus ingresos en deudas. El límite saludable es 30–35%.</span>
              </div>
            )}

            {freeCash > 0 && monthlySavingsNeeded > 0 && (
              <div className={clsx(
                'mt-3 p-3 rounded-lg border text-xs flex items-start gap-2',
                freeCash >= monthlySavingsNeeded
                  ? 'border-green-400 bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400'
                  : 'border-amber-400 bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400'
              )}>
                {freeCash >= monthlySavingsNeeded
                  ? <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" />
                  : <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />}
                <span>
                  {freeCash >= monthlySavingsNeeded
                    ? <>Tu flujo disponible de <strong>{fmt.currency(freeCash, currency)}</strong> cubre los <strong>{fmt.currency(monthlySavingsNeeded, currency)}/mes</strong> necesarios para todas tus metas.</>
                    : <>Necesitas <strong>{fmt.currency(monthlySavingsNeeded, currency)}/mes</strong> para tus metas pero solo tienes <strong>{fmt.currency(freeCash, currency)}</strong> disponibles.</>
                  }
                </span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">

        {/* ── Proyección libre de deudas ───────────────────── */}
        <div className="card">
          <h2 className="text-display font-bold text-sm mb-3 flex items-center gap-2">
            <TrendingDown size={15} className="text-rose-500" /> Proyección de deudas
          </h2>

          {activeDebts.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] py-6 text-center">Sin deudas activas 🎉</p>
          ) : (
            <>
              {/* Resumen rápido */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-2.5 rounded-lg bg-surface-50 dark:bg-surface-800 border border-[var(--border)]">
                  <p className="text-xs text-[var(--text-muted)]">Deuda total</p>
                  <p className="text-display font-bold text-sm text-mono text-rose-500">
                    {fmt.currency(activeDebts.reduce((s, d) => s + d.current_balance, 0), currency)}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-surface-50 dark:bg-surface-800 border border-[var(--border)]">
                  <p className="text-xs text-[var(--text-muted)]">
                    Libre de deudas
                    {anyHasPlans && <span className="text-brand-500 ml-1">(con plan)</span>}
                  </p>
                  <p className="text-display font-bold text-sm text-green-600 dark:text-green-400">
                    {debtFreeDate ? fmt.date(debtFreeDate) : '—'}
                  </p>
                  {anyHasPlans && debtFreeDateBase && debtFreeDateBase !== debtFreeDate && (
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      Sin plan: <span className="font-medium">{fmt.date(debtFreeDateBase)}</span>
                    </p>
                  )}
                </div>
                <div className="p-2.5 rounded-lg bg-surface-50 dark:bg-surface-800 border border-[var(--border)]">
                  <p className="text-xs text-[var(--text-muted)]">
                    Total intereses
                    {anyHasPlans && <span className="text-brand-500 ml-1">(con plan)</span>}
                  </p>
                  <p className="text-display font-bold text-sm text-mono text-amber-500">
                    {fmt.currency(totalInterest, currency)}
                  </p>
                  {anyHasPlans && totalInterestBase > totalInterest && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                      Ahorras {fmt.currency(totalInterestBase - totalInterest, currency)}
                    </p>
                  )}
                </div>
              </div>

              {/* Leyenda */}
              {anyHasPlans && (
                <div className="flex flex-wrap gap-3 text-xs text-[var(--text-muted)] mb-2">
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-0.5 bg-rose-500 inline-block rounded" /> Con pagos adelantados
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-0.5 bg-slate-400 inline-block rounded border-dashed" style={{ borderTop: '2px dashed' }} /> Solo cuotas mínimas
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CalendarPlus size={11} className="text-brand-500" />
                    Tienes pagos adelantados planificados activos
                  </span>
                </div>
              )}

              {/* Gráfica */}
              {debtChartData.length > 0 && (
                <ResponsiveContainer width="100%" height={180}>
                  <ComposedChart data={debtChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gdp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#f43f5e" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} interval={chartInterval} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                    <Tooltip content={<DebtChartTooltip currency={currency} anyHasPlans={anyHasPlans} />} />
                    <Area type="monotone" dataKey="balance" stroke="#f43f5e" fill="url(#gdp)" strokeWidth={2} dot={false} />
                    {anyHasPlans && (
                      <Line type="monotone" dataKey="balanceBase" stroke="#94a3b8" strokeWidth={1.5} dot={false} strokeDasharray="5 3" />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              )}

              {/* Lista de deudas ordenada por tasa */}
              <div className="mt-3 space-y-2">
                {[...activeDebts].sort((a, b) => b.annual_rate - a.annual_rate).map((d, i) => (
                  <div key={d.id} className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={clsx('px-1.5 py-0.5 rounded text-xs font-bold flex-shrink-0', i === 0 ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600' : 'bg-surface-100 dark:bg-surface-700 text-[var(--text-muted)]')}>
                        {fmt.pct(d.annual_rate)}
                      </span>
                      <span className="truncate font-medium">{d.name}</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-mono font-semibold">{fmt.currency(d.current_balance, currency)}</span>
                      <span className="text-[var(--text-muted)] ml-2">→ {d.projection?.payoffDate ? fmt.date(d.projection.payoffDate) : fmt.months(d.projection?.months)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Metas de ahorro ──────────────────────────────── */}
        <div className="card">
          <h2 className="text-display font-bold text-sm mb-3 flex items-center gap-2">
            <Target size={15} className="text-brand-500" /> Plan de metas
          </h2>

          {goalsAnalysis.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] py-6 text-center">Sin metas activas. ¡Crea una en la sección de Metas!</p>
          ) : (
            <div className="space-y-3">
              {goalsAnalysis.map(g => {
                const noDeadline = g.monthsLeft === null;
                const expired    = g.monthsLeft === 0 && g.remaining > 0;
                const onTrack    = !noDeadline && !expired && freeCash >= (g.neededMonthly || 0);

                return (
                  <div key={g.id} className="p-3 rounded-lg border border-[var(--border)]">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-xs font-semibold">{g.name}</p>
                      {noDeadline ? (
                        <span className="text-xs text-[var(--text-muted)] bg-surface-100 dark:bg-surface-700 px-1.5 py-0.5 rounded whitespace-nowrap">Sin fecha límite</span>
                      ) : expired ? (
                        <span className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-1.5 py-0.5 rounded flex items-center gap-1 whitespace-nowrap"><AlertTriangle size={10} /> Vencida</span>
                      ) : onTrack ? (
                        <span className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded flex items-center gap-1 whitespace-nowrap"><CheckCircle2 size={10} /> Al día</span>
                      ) : (
                        <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded flex items-center gap-1 whitespace-nowrap"><AlertTriangle size={10} /> En riesgo</span>
                      )}
                    </div>

                    <ProgressBar value={g.pct} max={100} color={g.color} className="mb-2" />

                    <div className="flex flex-wrap justify-between gap-x-3 text-xs text-[var(--text-muted)]">
                      <span className="text-mono">{fmt.currency(g.current_amount, currency)} / {fmt.currency(g.target_amount, currency)}</span>
                      {!noDeadline && !expired && g.neededMonthly !== null && (
                        <span>
                          Necesitas <strong className="text-[var(--text)]">{fmt.currency(g.neededMonthly, currency)}/mes</strong>
                          {' · '}{g.monthsLeft} mes{g.monthsLeft !== 1 ? 'es' : ''} restantes
                        </span>
                      )}
                      {noDeadline && g.remaining > 0 && (
                        <span>Faltan <strong className="text-[var(--text)]">{fmt.currency(g.remaining, currency)}</strong></span>
                      )}
                      {expired && (
                        <span className="text-rose-500">Venció el {fmt.date(g.deadline)}</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {monthlySavingsNeeded > 0 && (
                <div className="pt-2 border-t border-[var(--border)] flex justify-between text-xs">
                  <span className="text-[var(--text-muted)]">Total necesario para todas las metas</span>
                  <strong className="text-mono">{fmt.currency(monthlySavingsNeeded, currency)}/mes</strong>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Compromisos próximos meses ────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-display font-bold text-sm flex items-center gap-2">
            <Calendar size={15} className="text-brand-500" />
            Compromisos próximos {monthsToShow} meses
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMonthsToShow(v => Math.max(3, v - 1))}
              disabled={monthsToShow <= 3}
              className="p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-700 disabled:opacity-30 transition-colors"
            >
              <ChevronUp size={14} />
            </button>
            <span className="text-xs text-[var(--text-muted)] w-6 text-center">{monthsToShow}</span>
            <button
              onClick={() => setMonthsToShow(v => Math.min(12, v + 1))}
              disabled={monthsToShow >= 12}
              className="p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-700 disabled:opacity-30 transition-colors"
            >
              <ChevronDown size={14} />
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {nextMonths.map(({ label, items, totalOut, totalIn, net }) => (
            <div key={label} className="card">
              <h3 className="text-xs font-semibold capitalize mb-3 flex items-center justify-between">
                <span>{label}</span>
                <span className={clsx('text-mono font-bold', net >= 0 ? 'text-green-500' : 'text-rose-500')}>
                  {net >= 0 ? '+' : ''}{fmt.currency(net, currency)}
                </span>
              </h3>

              {items.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">Sin compromisos registrados</p>
              ) : (
                <div className="space-y-1.5">
                  {items.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-[var(--text-muted)] w-4 text-right flex-shrink-0">{item.day}</span>
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                      <span className="text-xs truncate flex-1">{item.label}</span>
                      <span className={clsx('text-xs font-medium text-mono flex-shrink-0', item.kind === 'income' ? 'text-green-500' : 'text-rose-500')}>
                        {item.kind === 'income' ? '+' : '-'}{fmt.currency(item.amount, currency)}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-[var(--border)] pt-2 mt-1 space-y-1">
                    {totalIn > 0 && (
                      <div className="flex justify-between text-xs text-[var(--text-muted)]">
                        <span>Ingresos</span>
                        <span className="text-green-500 font-medium text-mono">+{fmt.currency(totalIn, currency)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs text-[var(--text-muted)]">
                      <span>Compromisos</span>
                      <span className="text-rose-500 font-medium text-mono">-{fmt.currency(totalOut, currency)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
