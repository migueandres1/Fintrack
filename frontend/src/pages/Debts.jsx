import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, CreditCard, ChevronDown, ChevronUp, CalendarPlus, X, Zap } from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useStore } from '../store/index.js';
import { fmt, localDate } from '../utils/format.js';
import { Modal, Confirm, Empty, Spinner } from '../components/ui/index.jsx';
import UpgradeModal from '../components/UpgradeModal.jsx';
import api from '../services/api.js';

const EMPTY_DEBT = {
  name: '', initial_balance: '', annual_rate: '', monthly_payment: '',
  payment_day: 1, start_date: localDate(), notes: '', credit_card_id: '',
};
const EMPTY_PAY = {
  payment_date: localDate(),
  total_amount: '', extra_principal: '0', notes: '',
};

function ChartTooltip({ active, payload, currency }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: 11, minWidth: 160 }}>
      <p style={{ fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>{d?.label}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ color: 'var(--text-muted)' }}>Capital</span>
          <span style={{ fontWeight: 500, color: 'var(--c500)', fontFamily: 'var(--fm)' }}>{fmt.currency(d?.principal, currency)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ color: 'var(--text-muted)' }}>Interés</span>
          <span style={{ fontWeight: 500, color: '#e53e3e', fontFamily: 'var(--fm)' }}>{fmt.currency(d?.interest, currency)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, paddingTop: 4, borderTop: '1px solid var(--border)', marginTop: 4 }}>
          <span style={{ color: 'var(--text-muted)' }}>Saldo</span>
          <span style={{ fontWeight: 600, fontFamily: 'var(--fm)', color: 'var(--text)' }}>{fmt.currency(d?.balance, currency)}</span>
        </div>
      </div>
    </div>
  );
}

const EMPTY_PLANNED = { planned_date: '', amount: '', notes: '' };

// ── Debt row (matches handoff DebtsScreen) ────────────────────────────────────
function DebtRow({ debt, currency, onEdit, onDelete, onPay, index, isLast }) {
  const { addDebtPlanned, removeDebtPlanned } = useStore();
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showPlannedForm, setShowPlannedForm] = useState(false);
  const [plannedForm, setPlannedForm] = useState(EMPTY_PLANNED);
  const [plannedBusy, setPlannedBusy] = useState(false);

  const paidPct = Math.min(100, 100 - (debt.current_balance / (debt.initial_balance || 1)) * 100);
  const proj    = detail?.projection || debt.projection;
  const isFocus = index === 0; // highest rate first (avalanche)

  const nextDueLabel = (() => {
    const day = Math.max(1, Math.min(31, Number(debt.payment_day) || 1));
    const today = new Date();
    const clamp = (y, m) => Math.min(day, new Date(y, m + 1, 0).getDate());
    let next = new Date(today.getFullYear(), today.getMonth(), clamp(today.getFullYear(), today.getMonth()));
    if (next <= today) {
      const nm = today.getMonth() + 1;
      const ny = nm > 11 ? today.getFullYear() + 1 : today.getFullYear();
      next = new Date(ny, nm % 12, clamp(ny, nm % 12));
    }
    return next.toLocaleDateString('es', { day: '2-digit', month: 'short' });
  })();

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
    <div style={{ padding: '14px 0', borderBottom: isLast ? 'none' : '1px solid var(--border)' }}>
      {/* Top row: name + balance */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{debt.name}</span>
            {isFocus && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'var(--c100)', color: 'var(--cdark)',
                borderRadius: 999, padding: '2px 8px',
                fontSize: 9, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase',
              }}>
                <Zap size={10} /> FOCO
              </span>
            )}
            {debt.card_name && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--surface-2)', color: 'var(--text-muted)', borderRadius: 20, padding: '2px 8px', fontSize: 10 }}>
                <CreditCard size={10} /> {debt.card_name} ••{debt.card_last_four}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
            {fmt.pct(debt.annual_rate)} TAE · próximo {nextDueLabel}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: 14, fontWeight: 600, color: 'var(--text)',
            fontFamily: 'var(--fm)', fontVariantNumeric: 'tabular-nums',
          }}>
            {fmt.currency(debt.current_balance, currency)}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--fm)', marginTop: 1 }}>
            de {fmt.currency(debt.initial_balance, currency)}
          </div>
        </div>
      </div>

      {/* Debt meter (red track, green fill) */}
      <div className="debt-meter">
        <div className="debt-meter-fill" style={{ width: `${paidPct}%` }} />
      </div>

      {/* Bottom row: % + pay button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--fm)' }}>
          {paidPct.toFixed(0)}% pagado
        </span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {proj?.totalInterest > 0 && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              +{fmt.currency(proj.totalInterest, currency)} interés
            </span>
          )}
          <button
            onClick={() => onPay(debt)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',
              borderRadius: 999, background: 'var(--c100)', color: 'var(--cdark)',
              border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Pagar {fmt.currency(debt.monthly_payment, currency)}
          </button>
          <button onClick={() => onEdit(debt)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
            <Pencil size={12} />
          </button>
          <button onClick={() => onDelete(debt)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e53e3e', padding: 4 }}>
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Expandable detail */}
      <button
        onClick={loadDetail}
        disabled={loadingDetail}
        style={{
          marginTop: 8, width: '100%', fontSize: 11, color: 'var(--text-muted)',
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          padding: '4px 0',
        }}
      >
        {loadingDetail ? 'Cargando…' : expanded
          ? <><ChevronUp size={13} /> Ocultar detalle</>
          : <><ChevronDown size={13} /> Ver proyección y pagos</>
        }
      </button>

      {expanded && detail && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }} className="animate-fade-up space-y-5">

          {/* Amortization chart */}
          {scheduleData.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <h4 style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Proyección de amortización</h4>
                {hasPlan && (
                  <span style={{ fontSize: 11, color: 'var(--c500)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 12, height: 2, background: 'var(--c500)', display: 'inline-block', borderRadius: 1 }} />
                    Con plan adelantado
                  </span>
                )}
              </div>
              {hasPlan && (
                <p style={{ fontSize: 11, color: 'var(--c500)', marginBottom: 8 }}>
                  Con los pagos adelantados terminas {fmt.date(proj.payoffDate)} — ahorras {fmt.currency((detail.projectionBase?.totalInterest || 0) - (proj.totalInterest || 0), currency)} en intereses
                </p>
              )}
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={scheduleData} margin={{ top: 4, right: 40, left: -20, bottom: 0 }} barSize={scheduleData.length > 24 ? 4 : 8}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} interval={xInterval} />
                  <YAxis yAxisId="bars" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                  <YAxis yAxisId="line" orientation="right" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip currency={currency} />} />
                  <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                    formatter={(value) => <span style={{ color: 'var(--text-muted)' }}>{value}</span>} />
                  <Bar yAxisId="bars" dataKey="interest"  name="Interés" stackId="p" fill="#e53e3e" radius={[0,0,0,0]} />
                  <Bar yAxisId="bars" dataKey="principal" name="Capital" stackId="p" fill="var(--c500)" radius={[2,2,0,0]} />
                  <Line yAxisId="line" type="monotone" dataKey="balance" name="Saldo" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                  {hasPlan && scheduleDataBase.length > 0 && (
                    <Line yAxisId="line" type="monotone" data={scheduleDataBase} dataKey="balance" name="Saldo sin plan" stroke="var(--text-muted)" strokeWidth={1.5} dot={false} strokeDasharray="5 3" />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Planned payments */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h4 style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Pagos adelantados</h4>
              {!showPlannedForm && (
                <button
                  onClick={() => setShowPlannedForm(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--c500)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  <CalendarPlus size={12} /> Agregar
                </button>
              )}
            </div>

            {showPlannedForm && (
              <form onSubmit={savePlanned} style={{ padding: 12, borderRadius: 10, border: '1px solid var(--c500)', background: 'rgba(0,184,148,.05)', marginBottom: 10 }} className="space-y-2 animate-scale-in">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label">Fecha</label>
                    <input className="input" type="date" required value={plannedForm.planned_date} min={localDate()}
                      onChange={e => setPlannedForm({ ...plannedForm, planned_date: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Monto extra a capital</label>
                    <input className="input" type="number" step="0.01" min="1" placeholder="0.00" required
                      value={plannedForm.amount} onChange={e => setPlannedForm({ ...plannedForm, amount: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="label">Nota (opcional)</label>
                  <input className="input" type="text" placeholder="Ej: Aguinaldo, bono"
                    value={plannedForm.notes} onChange={e => setPlannedForm({ ...plannedForm, notes: e.target.value })} />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowPlannedForm(false)} className="btn-secondary text-xs flex-1 justify-center">Cancelar</button>
                  <button type="submit" disabled={plannedBusy} className="btn-primary text-xs flex-1 justify-center">
                    {plannedBusy ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            )}

            {detail.planned?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {detail.planned.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CalendarPlus size={12} style={{ color: 'var(--c500)', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{fmt.date(p.planned_date)}</span>
                      {p.notes && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>· {p.notes}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--c500)', fontFamily: 'var(--fm)' }}>{fmt.currency(p.amount, currency)}</span>
                      <button onClick={() => deletePlanned(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e53e3e', padding: 2 }}>
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : !showPlannedForm && (
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sin pagos adelantados. Agregar uno actualiza la proyección automáticamente.</p>
            )}
          </div>

          {/* Payment history */}
          {detail.payments?.length > 0 && (
            <div>
              <h4 style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Historial de pagos</h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ textAlign: 'left', paddingBottom: 6 }}>Fecha</th>
                      <th style={{ textAlign: 'right', paddingBottom: 6 }}>Total</th>
                      <th style={{ textAlign: 'right', paddingBottom: 6 }}>Capital</th>
                      <th style={{ textAlign: 'right', paddingBottom: 6 }}>Interés</th>
                      <th style={{ textAlign: 'right', paddingBottom: 6 }}>Extra</th>
                      <th style={{ textAlign: 'right', paddingBottom: 6 }}>Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.payments.map((p) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '6px 0', color: 'var(--text)' }}>{fmt.date(p.payment_date)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 500, fontFamily: 'var(--fm)' }}>{fmt.currency(p.total_amount, currency)}</td>
                        <td style={{ textAlign: 'right', color: 'var(--c500)', fontFamily: 'var(--fm)' }}>{fmt.currency(p.principal_paid, currency)}</td>
                        <td style={{ textAlign: 'right', color: '#e53e3e', fontFamily: 'var(--fm)' }}>{fmt.currency(p.interest_paid, currency)}</td>
                        <td style={{ textAlign: 'right', color: 'var(--c500)', fontFamily: 'var(--fm)' }}>{p.extra_principal > 0 ? fmt.currency(p.extra_principal, currency) : '—'}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--fm)', color: 'var(--text)' }}>{fmt.currency(p.balance_after, currency)}</td>
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
  const { debts, debtsLoading, fetchDebts, createDebt, updateDebt, deleteDebt, addDebtPayment, user, creditCards, fetchCreditCards, billingStatus } = useStore();
  const currency = user?.currency || 'USD';

  const effectivePlan = billingStatus?.plan ?? user?.plan ?? 'free';

  const [modal,        setModal]        = useState(false);
  const [upgradeModal, setUpgradeModal] = useState(false);
  const [payModal,     setPayModal]     = useState(false);
  const [editing,      setEditing]      = useState(null);
  const [deleting,     setDeleting]     = useState(null);
  const [payDebt,      setPayDebt]      = useState(null);
  const [form,         setForm]         = useState(EMPTY_DEBT);
  const [payForm,      setPayForm]      = useState(EMPTY_PAY);
  const [busy,         setBusy]         = useState(false);

  useEffect(() => { fetchDebts(); fetchCreditCards(); }, []);

  const openCreate = () => {
    if (effectivePlan === 'free') { setUpgradeModal(true); return; }
    setEditing(null); setForm(EMPTY_DEBT); setModal(true);
  };

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
      credit_card_id: d.credit_card_id || '',
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
    } catch (err) {
      if (err.response?.status === 403) { setModal(false); setUpgradeModal(true); }
      else throw err;
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

  const totalDebt    = debts.reduce((s, d) => s + (d.current_balance || 0), 0);
  const totalMonthly = debts.reduce((s, d) => s + (d.is_active ? d.monthly_payment : 0), 0);
  const activeDebts  = debts.filter(d => d.is_active);

  // Sort by annual_rate descending (avalanche strategy: highest rate first = FOCO)
  const sortedDebts  = [...debts].sort((a, b) => (b.annual_rate || 0) - (a.annual_rate || 0));

  const amountInt = Math.floor(totalDebt).toLocaleString();
  const amountDec = (totalDebt % 1).toFixed(2).slice(2);

  // Longest payoff date across all debts
  const latestPayoff = debts
    .map(d => d.projection?.payoffDate)
    .filter(Boolean)
    .sort()
    .pop();

  return (
    <div className="space-y-4 animate-fade-up" style={{ maxWidth: 640, margin: '0 auto' }}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{
        padding: '6px 4px 4px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{
          fontFamily: 'var(--fd)', fontSize: 32, fontWeight: 300,
          color: 'var(--text)', lineHeight: 1, letterSpacing: '-.01em',
        }}>
          Deudas
        </div>
        <button
          onClick={openCreate}
          aria-label="Nueva deuda"
          style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'var(--c500)', color: '#0b1712',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Plus size={20} />
        </button>
      </div>

      {/* ── Hero (dark m-hero) ──────────────────────────────────── */}
      <div className="m-hero">
        <div className="m-hero-label">
          <span>Deuda total</span>
          <span style={{ color: 'var(--c400)', fontSize: 10 }}>
            {activeDebts.length} deuda{activeDebts.length !== 1 ? 's' : ''} activa{activeDebts.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="m-hero-amt">
          <span className="cur">{currency}</span>
          <span>{amountInt}</span>
          <span className="cents">.{amountDec}</span>
        </div>
        {totalMonthly > 0 && (
          <div className="m-hero-trend">
            {fmt.currency(totalMonthly, currency)}/mes
            {latestPayoff && (
              <span className="muted">
                {' '}· libre {fmt.date(latestPayoff)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Debt list ───────────────────────────────────────────── */}
      {debtsLoading ? <Spinner /> : debts.length === 0 ? (
        <Empty icon={CreditCard} title="Sin deudas registradas"
          description="Agrega tus deudas para ver proyecciones de payoff y ahorro en intereses"
          action={<button onClick={openCreate} className="btn-primary text-xs">+ Nueva deuda</button>} />
      ) : (
        <div className="m-sect">
          <div className="m-sect-head">
            <div className="m-sect-title">Estrategia · Avalancha</div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>mayor tasa primero</span>
          </div>
          {sortedDebts.map((d, i) => (
            <DebtRow
              key={d.id}
              debt={d}
              currency={currency}
              index={i}
              isLast={i === sortedDebts.length - 1}
              onEdit={openEdit}
              onDelete={setDeleting}
              onPay={openPay}
            />
          ))}
        </div>
      )}

      <UpgradeModal open={upgradeModal} onClose={() => setUpgradeModal(false)} feature="debts" />

      {/* ── Create/Edit Modal ─────────────────────────────────────── */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        eyebrow={editing ? 'Editar deuda' : 'Nueva deuda'}
        title="Registra una deuda"
      >
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="label">Nombre de la deuda</label>
            <input className="input" type="text" placeholder="Ej: Tarjeta Visa, Préstamo personal"
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required autoFocus />
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
            <label className="label">Tarjeta de crédito enlazada (opcional)</label>
            <select className="input" value={form.credit_card_id} onChange={e => setForm({ ...form, credit_card_id: e.target.value })}>
              <option value="">Sin tarjeta</option>
              {creditCards.map(c => (
                <option key={c.id} value={c.id}>{c.name} ••{c.last_four}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Notas (opcional)</label>
            <input className="input" type="text" placeholder="Ej: Banco Agrícola, hipoteca"
              value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={busy} className="btn-primary flex-1 justify-center">
              {busy ? 'Guardando...' : editing ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Pay Modal ────────────────────────────────────────────── */}
      <Modal
        open={payModal}
        onClose={() => setPayModal(false)}
        eyebrow="Registrar pago"
        title={payDebt?.name || ''}
      >
        <form onSubmit={savePay} className="space-y-4">
          <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--surface-2)', fontSize: 12 }}>
            Saldo actual: <strong style={{ color: '#e53e3e', fontFamily: 'var(--fm)' }}>{fmt.currency(payDebt?.current_balance, currency)}</strong>
            {payDebt?.payment_day && (
              <span style={{ marginLeft: 10, color: 'var(--text-muted)' }}>· vence día {payDebt.payment_day}</span>
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
            <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Un abono extra reduce directamente el capital y los intereses futuros</p>
          </div>
          <div>
            <label className="label">Notas (opcional)</label>
            <input className="input" type="text" placeholder="Ej: Pago adelantado enero"
              value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setPayModal(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
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
