import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, CreditCard, ChevronDown, ChevronUp, CalendarPlus, X } from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useStore } from '../store/index.js';
import { fmt } from '../utils/format.js';
import { Modal, Confirm, ProgressBar, Empty, Spinner } from '../components/ui/index.jsx';
import api from '../services/api.js';
import clsx from 'clsx';

const EMPTY_DEBT = {
  name: '', initial_balance: '', annual_rate: '', monthly_payment: '',
  payment_day: 1,
  start_date: new Date().toISOString().split('T')[0], notes: '',
};
const EMPTY_PAY = {
  payment_date: new Date().toISOString().split('T')[0],
  total_amount: '', extra_principal: '0', notes: '',
};

function ChartTooltip({ active, payload, currency }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-2.5 shadow-xl text-xs min-w-[160px]">
      <p className="font-semibold mb-2 text-[var(--text)]">{d?.label}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-green-500 inline-block" />Capital</span>
          <span className="font-medium text-green-500">{fmt.currency(d?.principal, currency)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-rose-500 inline-block" />Interés</span>
          <span className="font-medium text-rose-500">{fmt.currency(d?.interest, currency)}</span>
        </div>
        <div className="border-t border-[var(--border)] pt-1 mt-1 flex justify-between gap-4">
          <span className="text-[var(--text-muted)]">Saldo restante</span>
          <span className="font-semibold text-mono">{fmt.currency(d?.balance, currency)}</span>
        </div>
      </div>
    </div>
  );
}

const EMPTY_PLANNED = { planned_date: '', amount: '', notes: '' };

function DebtCard({ debt, currency, onEdit, onDelete, onPay }) {
  const { addDebtPlanned, removeDebtPlanned } = useStore();
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showPlannedForm, setShowPlannedForm] = useState(false);
  const [plannedForm, setPlannedForm] = useState(EMPTY_PLANNED);
  const [plannedBusy, setPlannedBusy] = useState(false);

  const paidPct = 100 - (debt.current_balance / (debt.initial_balance || 1)) * 100;
  // Use fresh detail.projection when loaded (reflects latest planned payments)
  const proj = detail?.projection || debt.projection;

  const buildScheduleData = (schedule) =>
    schedule?.slice(0, 48).map(r => ({
      period:    r.period,
      label:     new Date(r.date + 'T00:00:00').toLocaleDateString('es-SV', { month: 'short', year: '2-digit' }),
      balance:   r.balance,
      interest:  r.interest,
      principal: r.principal,
    })) || [];

  const scheduleData     = buildScheduleData(proj?.schedule);
  const scheduleDataBase = detail ? buildScheduleData(detail.projectionBase?.schedule) : [];
  const hasPlan          = (detail?.planned?.length ?? 0) > 0;
  const xInterval        = Math.max(0, Math.ceil(scheduleData.length / 8) - 1);

  const reloadDetail = async () => {
    const { data } = await api.get(`/debts/${debt.id}`);
    setDetail(data);
  };

  const loadDetail = async () => {
    if (detail) { setExpanded(!expanded); return; }
    setLoadingDetail(true);
    try {
      const { data } = await api.get(`/debts/${debt.id}`);
      setDetail(data);
      setExpanded(true);
    } finally { setLoadingDetail(false); }
  };

  const savePlanned = async (e) => {
    e.preventDefault();
    setPlannedBusy(true);
    try {
      await addDebtPlanned(debt.id, plannedForm);
      setPlannedForm(EMPTY_PLANNED);
      setShowPlannedForm(false);
      await reloadDetail();
    } finally { setPlannedBusy(false); }
  };

  const deletePlanned = async (plannedId) => {
    await removeDebtPlanned(debt.id, plannedId);
    await reloadDetail();
  };

  return (
    <div className="card transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
            <CreditCard size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-sm">{debt.name}</h3>
            <p className="text-xs text-[var(--text-muted)]">
              {fmt.pct(debt.annual_rate)} anual · Vence día {debt.payment_day}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => onPay(debt)}
            className="px-2 py-1 rounded-lg text-xs font-medium bg-brand-500/10 text-brand-500 hover:bg-brand-500/20 transition-colors">
            + Pago
          </button>
          <button onClick={() => onEdit(debt)} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700">
            <Pencil size={13} className="text-[var(--text-muted)]" />
          </button>
          <button onClick={() => onDelete(debt)} className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20">
            <Trash2 size={13} className="text-rose-400" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <p className="text-xs text-[var(--text-muted)]">Saldo actual</p>
          <p className="text-display font-bold text-base text-mono text-rose-500">{fmt.currency(debt.current_balance, currency)}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--text-muted)]">Cuota mensual</p>
          <p className="font-semibold text-sm text-mono">{fmt.currency(debt.monthly_payment, currency)}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--text-muted)]">Payoff</p>
          <p className="font-semibold text-sm">{fmt.months(proj?.months)}</p>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-[var(--text-muted)]">Progreso</span>
          <span className="font-medium">{paidPct.toFixed(1)}% pagado</span>
        </div>
        <ProgressBar value={paidPct} max={100} color="#f43f5e" />
      </div>

      <div className="flex justify-between text-xs text-[var(--text-muted)] mb-3">
        <span>Intereses restantes: <strong className="text-[var(--text)]">{fmt.currency(proj?.totalInterest, currency)}</strong></span>
        <span>Termina: <strong className="text-[var(--text)]">{proj?.payoffDate ? fmt.date(proj.payoffDate) : '—'}</strong></span>
      </div>

      <button onClick={loadDetail} disabled={loadingDetail}
        className="w-full flex items-center justify-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text)] py-1 transition-colors">
        {loadingDetail ? 'Cargando...' : expanded
          ? <><ChevronUp size={14} /> Ocultar detalle</>
          : <><ChevronDown size={14} /> Ver proyección y pagos</>}
      </button>

      {expanded && detail && (
        <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-5 animate-fade-up">

          {/* ── Gráfica de amortización ── */}
          {scheduleData.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-xs font-semibold">Proyección de amortización</h4>
                {hasPlan && (
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                    <span className="w-3 h-0.5 bg-green-500 inline-block rounded" />
                    Con plan adelantado
                  </span>
                )}
              </div>
              {hasPlan && (
                <p className="text-xs text-green-600 dark:text-green-400 mb-2">
                  Con los pagos adelantados terminas {fmt.date(proj.payoffDate)} en lugar de {fmt.date(detail.projectionBase?.payoffDate)} — ahorras {fmt.currency((detail.projectionBase?.totalInterest || 0) - (proj.totalInterest || 0), currency)} en intereses
                </p>
              )}
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart
                  data={scheduleData}
                  margin={{ top: 4, right: 40, left: -20, bottom: 0 }}
                  barSize={scheduleData.length > 24 ? 4 : 8}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} interval={xInterval} />
                  <YAxis yAxisId="bars" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                  <YAxis yAxisId="line" orientation="right" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip currency={currency} />} />
                  <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                    formatter={(value) => <span style={{ color: 'var(--text-muted)' }}>{value}</span>} />
                  <Bar yAxisId="bars" dataKey="interest"  name="Interés" stackId="p" fill="#f43f5e" radius={[0,0,0,0]} />
                  <Bar yAxisId="bars" dataKey="principal" name="Capital" stackId="p" fill="#22c55e" radius={[2,2,0,0]} />
                  <Line yAxisId="line" type="monotone" dataKey="balance" name="Saldo" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                  {hasPlan && scheduleDataBase.length > 0 && (
                    <Line yAxisId="line" type="monotone" data={scheduleDataBase} dataKey="balance" name="Saldo sin plan" stroke="#94a3b8" strokeWidth={1.5} dot={false} strokeDasharray="5 3" />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── Pagos adelantados planificados ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold">Pagos adelantados planificados</h4>
              {!showPlannedForm && (
                <button onClick={() => setShowPlannedForm(true)}
                  className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-600 font-medium">
                  <CalendarPlus size={13} /> Agregar
                </button>
              )}
            </div>

            {showPlannedForm && (
              <form onSubmit={savePlanned} className="p-3 rounded-lg border border-brand-400 bg-brand-500/5 mb-3 space-y-2 animate-scale-in">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label">Fecha</label>
                    <input className="input" type="date" required
                      value={plannedForm.planned_date}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => setPlannedForm({ ...plannedForm, planned_date: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Monto extra a capital</label>
                    <input className="input" type="number" step="0.01" min="1" placeholder="0.00" required
                      value={plannedForm.amount}
                      onChange={e => setPlannedForm({ ...plannedForm, amount: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="label">Nota (opcional)</label>
                  <input className="input" type="text" placeholder="Ej: Aguinaldo, bono"
                    value={plannedForm.notes}
                    onChange={e => setPlannedForm({ ...plannedForm, notes: e.target.value })} />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowPlannedForm(false)} className="btn-ghost text-xs flex-1 justify-center">Cancelar</button>
                  <button type="submit" disabled={plannedBusy} className="btn-primary text-xs flex-1 justify-center">
                    {plannedBusy ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            )}

            {detail.planned?.length > 0 ? (
              <div className="space-y-1.5">
                {detail.planned.map(p => (
                  <div key={p.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-50 dark:bg-surface-800 border border-[var(--border)]">
                    <div className="flex items-center gap-2 min-w-0">
                      <CalendarPlus size={13} className="text-brand-500 flex-shrink-0" />
                      <span className="text-xs font-medium">{fmt.date(p.planned_date)}</span>
                      {p.notes && <span className="text-xs text-[var(--text-muted)] truncate">· {p.notes}</span>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-semibold text-mono text-green-600">{fmt.currency(p.amount, currency)}</span>
                      <button onClick={() => deletePlanned(p.id)} className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20">
                        <X size={12} className="text-rose-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : !showPlannedForm && (
              <p className="text-xs text-[var(--text-muted)]">Sin pagos adelantados planificados. Agregar uno actualiza la proyección automáticamente.</p>
            )}
          </div>

          {/* ── Historial de pagos ── */}
          {detail.payments?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold mb-2">Historial de pagos</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[var(--text-muted)] border-b border-[var(--border)]">
                      <th className="text-left py-1.5">Fecha</th>
                      <th className="text-right py-1.5">Total</th>
                      <th className="text-right py-1.5">Capital</th>
                      <th className="text-right py-1.5">Interés</th>
                      <th className="text-right py-1.5">Extra</th>
                      <th className="text-right py-1.5">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {detail.payments.map((p) => (
                      <tr key={p.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50">
                        <td className="py-1.5">{fmt.date(p.payment_date)}</td>
                        <td className="text-right font-medium">{fmt.currency(p.total_amount, currency)}</td>
                        <td className="text-right text-green-600">{fmt.currency(p.principal_paid, currency)}</td>
                        <td className="text-right text-rose-500">{fmt.currency(p.interest_paid, currency)}</td>
                        <td className="text-right text-brand-500">{p.extra_principal > 0 ? fmt.currency(p.extra_principal, currency) : '—'}</td>
                        <td className="text-right text-mono">{fmt.currency(p.balance_after, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Debts() {
  const { debts, debtsLoading, fetchDebts, createDebt, updateDebt, deleteDebt, addDebtPayment, user } = useStore();
  const currency = user?.currency || 'USD';

  const [modal, setModal] = useState(false);
  const [payModal, setPayModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [payDebt, setPayDebt] = useState(null);
  const [form, setForm] = useState(EMPTY_DEBT);
  const [payForm, setPayForm] = useState(EMPTY_PAY);
  const [busy, setBusy] = useState(false);

  useEffect(() => { fetchDebts(); }, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY_DEBT); setModal(true); };

  const openEdit = (d) => {
    setEditing(d);
    setForm({
      name: d.name,
      initial_balance: d.initial_balance,
      annual_rate: d.annual_rate * 100,
      monthly_payment: d.monthly_payment,
      payment_day: d.payment_day || 1,
      start_date: d.start_date,
      notes: d.notes || '',
    });
    setModal(true);
  };

  const openPay = (d) => {
    setPayDebt(d);
    setPayForm({ ...EMPTY_PAY, total_amount: d.monthly_payment });
    setPayModal(true);
  };

  const save = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const payload = { ...form, annual_rate: form.annual_rate / 100 };
      if (editing) await updateDebt(editing.id, payload);
      else await createDebt(payload);
      setModal(false); fetchDebts();
    } finally { setBusy(false); }
  };

  const savePay = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      await addDebtPayment(payDebt.id, payForm);
      setPayModal(false); fetchDebts();
    } finally { setBusy(false); }
  };

  const confirmDelete = async () => {
    await deleteDebt(deleting.id);
    setDeleting(null); fetchDebts();
  };

  const totalDebt = debts.reduce((s, d) => s + (d.current_balance || 0), 0);
  const totalMonthly = debts.reduce((s, d) => s + (d.is_active ? d.monthly_payment : 0), 0);

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display font-bold text-xl">Deudas</h1>
          <p className="text-[var(--text-muted)] text-sm">
            {debts.length} deuda{debts.length !== 1 ? 's' : ''} registrada{debts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus size={15} /> Nueva deuda</button>
      </div>

      {debts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="card">
            <p className="text-xs text-[var(--text-muted)] mb-1">Deuda total</p>
            <p className="text-display font-bold text-xl text-mono text-rose-500">{fmt.currency(totalDebt, currency)}</p>
          </div>
          <div className="card">
            <p className="text-xs text-[var(--text-muted)] mb-1">Pago mensual total</p>
            <p className="text-display font-bold text-xl text-mono">{fmt.currency(totalMonthly, currency)}</p>
          </div>
          <div className="card hidden sm:block">
            <p className="text-xs text-[var(--text-muted)] mb-1">Número de deudas</p>
            <p className="text-display font-bold text-xl">{debts.filter(d => d.is_active).length} activas</p>
          </div>
        </div>
      )}

      {debtsLoading ? <Spinner /> : debts.length === 0 ? (
        <Empty icon={CreditCard} title="Sin deudas registradas"
          description="Agrega tus deudas para ver proyecciones de payoff y ahorro en intereses"
          action={<button onClick={openCreate} className="btn-primary text-xs">+ Nueva deuda</button>} />
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {debts.map((d) => (
            <DebtCard key={d.id} debt={d} currency={currency}
              onEdit={openEdit} onDelete={setDeleting} onPay={openPay} />
          ))}
        </div>
      )}

      {/* Modal crear/editar */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar deuda' : 'Nueva deuda'}>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="label">Nombre de la deuda</label>
            <input className="input" type="text" placeholder="Ej: Tarjeta Visa, Préstamo personal"
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Monto inicial</label>
              <input className="input" type="number" step="0.01" min="1" placeholder="0.00"
                value={form.initial_balance} onChange={e => setForm({ ...form, initial_balance: e.target.value })} required />
            </div>
            <div>
              <label className="label">Tasa anual (%)</label>
              <input className="input" type="number" step="0.01" min="0" max="200" placeholder="24.00"
                value={form.annual_rate} onChange={e => setForm({ ...form, annual_rate: e.target.value })} required />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="label">Cuota mensual</label>
              <input className="input" type="number" step="0.01" min="1" placeholder="0.00"
                value={form.monthly_payment} onChange={e => setForm({ ...form, monthly_payment: e.target.value })} required />
            </div>
            <div>
              <label className="label">Día de pago</label>
              <input className="input" type="number" min="1" max="31" placeholder="1"
                value={form.payment_day} onChange={e => setForm({ ...form, payment_day: e.target.value })} required />
            </div>
          </div>

          <div>
            <label className="label">Fecha de inicio</label>
            <input className="input" type="date" value={form.start_date}
              onChange={e => setForm({ ...form, start_date: e.target.value })} required />
          </div>

          <div>
            <label className="label">Notas (opcional)</label>
            <input className="input" type="text" placeholder="Ej: Banco Agrícola, hipoteca"
              value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setModal(false)} className="btn-ghost flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={busy} className="btn-primary flex-1 justify-center">
              {busy ? 'Guardando...' : editing ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal pago */}
      <Modal open={payModal} onClose={() => setPayModal(false)} title={`Registrar pago – ${payDebt?.name}`}>
        <form onSubmit={savePay} className="space-y-4">
          <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800 text-xs">
            Saldo actual: <strong className="text-rose-500 text-mono">{fmt.currency(payDebt?.current_balance, currency)}</strong>
            {payDebt?.payment_day && (
              <span className="ml-3 text-[var(--text-muted)]">· Vence día {payDebt.payment_day} de cada mes</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Fecha de pago</label>
              <input className="input" type="date" value={payForm.payment_date}
                onChange={e => setPayForm({ ...payForm, payment_date: e.target.value })} required />
            </div>
            <div>
              <label className="label">Monto total pagado</label>
              <input className="input" type="number" step="0.01" min="0.01"
                value={payForm.total_amount} onChange={e => setPayForm({ ...payForm, total_amount: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="label">Abono extra a capital (opcional)</label>
            <input className="input" type="number" step="0.01" min="0" placeholder="0.00"
              value={payForm.extra_principal} onChange={e => setPayForm({ ...payForm, extra_principal: e.target.value })} />
            <p className="text-xs text-[var(--text-muted)] mt-1">Un abono extra reduce directamente el capital y los intereses futuros</p>
          </div>
          <div>
            <label className="label">Notas (opcional)</label>
            <input className="input" type="text" placeholder="Ej: Pago adelantado enero"
              value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setPayModal(false)} className="btn-ghost flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={busy} className="btn-primary flex-1 justify-center">
              {busy ? 'Registrando...' : 'Registrar pago'}
            </button>
          </div>
        </form>
      </Modal>

      <Confirm
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Eliminar deuda"
        message={`¿Eliminar "${deleting?.name}"? Se perderán todos los pagos asociados.`}
      />
    </div>
  );
}