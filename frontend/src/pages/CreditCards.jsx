import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, CreditCard, ChevronDown, ChevronUp, Calculator, AlertTriangle } from 'lucide-react';
import { useStore } from '../store/index.js';
import { fmt, localDate } from '../utils/format.js';
import { Modal, Confirm, Empty, Spinner } from '../components/ui/index.jsx';
import UpgradeModal from '../components/UpgradeModal.jsx';
import api   from '../services/api.js';
import clsx  from 'clsx';

const COLORS = ['#00b894','#55d8b4','#6366f1','#22c55e','#f59e0b','#3b82f6','#ec4899','#14b8a6','#f97316'];

const EMPTY_CARD = {
  name: '', last_four: '', credit_limit: '', billing_day: 1, due_day: 20, initial_balance: '',
  color: '#00b894', notes: '',
};
const EMPTY_PAY = {
  amount: '', txn_date: localDate(), notes: '', account_id: '',
};

function simulatePayoff(balance, monthlyRate, payment) {
  if (balance <= 0 || payment <= 0) return { months: 0, totalInterest: 0 };
  if (monthlyRate <= 0) return { months: Math.ceil(balance / payment), totalInterest: 0 };
  let bal = balance, interest = 0, months = 0;
  while (bal > 0.005 && months < 600) {
    const int = bal * monthlyRate;
    interest += int;
    bal = bal + int - payment;
    months++;
    if (payment <= bal * monthlyRate + 0.01) { months = 600; break; }
  }
  return { months, totalInterest: +interest.toFixed(2) };
}

function MinPaySimulator({ balance, currency }) {
  const [rate, setRate] = useState(24);
  const [open, setOpen] = useState(false);
  if (balance <= 0) return null;
  const r = (rate / 100) / 12;
  const minPay = Math.max(balance * 0.02, 10);
  const minSim = simulatePayoff(balance, r, minPay);
  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
      <button onClick={() => setOpen(v => !v)} style={{
        display: 'flex', alignItems: 'center', gap: 6, fontSize: 11,
        color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', width: '100%',
      }}>
        <Calculator size={13} />
        {open ? 'Ocultar simulador' : 'Simulador: pago mínimo vs. total'}
        {open ? <ChevronUp size={11} style={{ marginLeft: 'auto' }} /> : <ChevronDown size={11} style={{ marginLeft: 'auto' }} />}
      </button>
      {open && (
        <div style={{ marginTop: 10 }} className="animate-fade-up space-y-3">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>Tasa anual:</label>
            <input type="number" min="1" max="200" step="0.5" value={rate}
              onChange={e => setRate(Number(e.target.value) || 24)}
              className="input" style={{ padding: '4px 8px', fontSize: 11, width: 70 }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>%</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ padding: 12, borderRadius: 12, background: 'rgba(229,62,62,.06)', border: '1px solid rgba(229,62,62,.15)' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#e53e3e', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.08em' }}>Solo mínimo</p>
              <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Pago mensual</p>
              <p style={{ fontWeight: 700, fontSize: 13, fontFamily: 'var(--fm)', color: '#e53e3e' }}>{fmt.currency(minPay, currency)}</p>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>Meses</p>
              <p style={{ fontWeight: 600, fontSize: 13 }}>{minSim.months >= 600 ? '∞' : minSim.months}</p>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>Intereses</p>
              <p style={{ fontWeight: 700, fontSize: 13, fontFamily: 'var(--fm)', color: '#e53e3e' }}>
                {minSim.months >= 600 ? '∞' : fmt.currency(minSim.totalInterest, currency)}
              </p>
            </div>
            <div style={{ padding: 12, borderRadius: 12, background: 'rgba(0,184,148,.06)', border: '1px solid rgba(0,184,148,.15)' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--c500)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.08em' }}>Pago total</p>
              <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Pago mensual</p>
              <p style={{ fontWeight: 700, fontSize: 13, fontFamily: 'var(--fm)', color: 'var(--c500)' }}>{fmt.currency(balance, currency)}</p>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>Meses</p>
              <p style={{ fontWeight: 600, fontSize: 13 }}>1</p>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>Intereses</p>
              <p style={{ fontWeight: 700, fontSize: 13, fontFamily: 'var(--fm)', color: 'var(--c500)' }}>{fmt.currency(0, currency)}</p>
            </div>
          </div>
          {minSim.months < 600 && minSim.totalInterest > 0 && (
            <p style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>
              Pagando solo el mínimo gastarías <strong style={{ color: '#e53e3e' }}>{fmt.currency(minSim.totalInterest, currency)}</strong> extra en intereses.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Dark credit card visual
function CardVisual({ card, index, userName }) {
  const isCaribe = index === 0;
  const holder = (userName || card.name || 'Titular').toUpperCase();
  const bin    = card.last_four || '0000';
  const prefix = (card.bin_prefix || (isCaribe ? '5412' : '4012'));
  const expMonth = String(card.due_day || card.billing_day || 1).padStart(2, '0');
  const expYear  = '29';

  return (
    <div className={`cc ${isCaribe ? 'caribe' : ''}`}>
      <div className="cc-top">
        <div className="cc-brand">MoniFlow</div>
        <div className="cc-chip" />
      </div>
      <div className="cc-num">{prefix} •••• •••• {bin}</div>
      <div className="cc-bottom">
        <div>
          <div className="lbl">Titular</div>
          <span style={{ fontWeight: 600 }}>{holder}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="lbl">Vence</div>
          <span style={{ fontWeight: 600, fontFamily: 'var(--fm)' }}>{expMonth}/{expYear}</span>
        </div>
      </div>
    </div>
  );
}

function CardItem({ card, currency, onEdit, onDelete, onPay, index, userName }) {
  const [expanded, setExpanded] = useState(false);
  const [txns,     setTxns]     = useState(null);
  const [loading,  setLoading]  = useState(false);

  const utilPct   = Math.min(100, card.utilization || 0);
  const utilColor = utilPct > 80 ? '#e53e3e' : utilPct > 50 ? '#f0a500' : 'var(--c500)';

  const today  = new Date();
  const dueDay = Math.max(1, Math.min(31, Number(card.due_day) || 20));
  const clampDay = (y, m) => Math.min(dueDay, new Date(y, m + 1, 0).getDate());
  let nextDue  = new Date(today.getFullYear(), today.getMonth(), clampDay(today.getFullYear(), today.getMonth()));
  if (nextDue <= today) {
    const nm = today.getMonth() + 1;
    const ny = nm > 11 ? today.getFullYear() + 1 : today.getFullYear();
    nextDue  = new Date(ny, nm % 12, clampDay(ny, nm % 12));
  }

  const loadTxns = async () => {
    if (txns) { setExpanded(!expanded); return; }
    setLoading(true);
    try {
      const { data } = await api.get(`/credit-cards/${card.id}/transactions`);
      setTxns(data); setExpanded(true);
    } finally { setLoading(false); }
  };

  return (
    <div className="card animate-fade-up" style={{ overflow: 'hidden', padding: 0 }}>
      {/* Card visual */}
      <div style={{ padding: '16px 16px 0', maxWidth: 340, margin: '0 auto', width: '100%' }}>
        <CardVisual card={card} index={index} userName={userName} />
      </div>

      {/* Card info */}
      <div style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
              {card.name}
              {card.last_four && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> ···{card.last_four}</span>}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              Corte día {card.billing_day} · Pago día {card.due_day}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={() => onPay(card)} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
              borderRadius: 20, background: 'rgba(0,184,148,.1)', color: 'var(--c500)',
              border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
              + Pago
            </button>
            <button onClick={() => onEdit(card)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
              <Pencil size={13} />
            </button>
            <button onClick={() => onDelete(card)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e53e3e', padding: 4 }}>
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--surface-2)' }}>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600 }}>Saldo</div>
            <div style={{ fontFamily: 'var(--fm)', fontWeight: 600, fontSize: 13, color: card.current_balance > 0 ? '#e53e3e' : 'var(--c500)', marginTop: 3 }}>
              {fmt.currency(card.current_balance, currency)}
            </div>
          </div>
          <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--surface-2)' }}>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600 }}>Límite</div>
            <div style={{ fontFamily: 'var(--fm)', fontWeight: 600, fontSize: 13, color: 'var(--text)', marginTop: 3 }}>
              {fmt.currency(card.credit_limit, currency)}
            </div>
          </div>
          <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--surface-2)' }}>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600 }}>Próximo</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginTop: 3 }}>
              {nextDue.toLocaleDateString('es-SV', { day: 'numeric', month: 'short' })}
            </div>
          </div>
        </div>

        {/* Utilization bar */}
        {Number(card.credit_limit) > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 5, color: 'var(--text-muted)' }}>
              <span>Utilización</span>
              <span style={{ fontFamily: 'var(--fm)', fontWeight: 600, color: utilColor }}>{utilPct.toFixed(1)}%</span>
            </div>
            <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${utilPct}%`, height: '100%', background: utilColor, borderRadius: 3, transition: 'width .4s ease' }} />
            </div>
            {utilPct > 80 && (
              <p style={{ fontSize: 10, color: '#e53e3e', marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertTriangle size={10} /> Alta utilización. Puede afectar tu historial crediticio.
              </p>
            )}
          </div>
        )}

        <MinPaySimulator balance={card.current_balance} currency={currency} />

        <button onClick={loadTxns} disabled={loading} style={{
          marginTop: 12, width: '100%', fontSize: 11, color: 'var(--text-muted)',
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          paddingTop: 12, borderTop: '1px solid var(--border)',
        }}>
          {loading ? 'Cargando…' : expanded
            ? <><ChevronUp size={12} /> Ocultar movimientos</>
            : <><ChevronDown size={12} /> Ver movimientos recientes</>
          }
        </button>

        {expanded && txns !== null && (
          <div style={{ marginTop: 10 }} className="animate-fade-up">
            {txns.length === 0 ? (
              <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>Sin movimientos registrados</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ textAlign: 'left', paddingBottom: 6 }}>Fecha</th>
                      <th style={{ textAlign: 'left', paddingBottom: 6, paddingLeft: 8 }}>Descripción</th>
                      <th style={{ textAlign: 'right', paddingBottom: 6 }}>Monto</th>
                      <th style={{ textAlign: 'right', paddingBottom: 6 }}>Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txns.map(t => (
                      <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '6px 0', color: 'var(--text)' }}>{fmt.date(t.txn_date)}</td>
                        <td style={{ padding: '6px 8px', color: 'var(--text)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.description || t.category_name}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--fm)', fontWeight: 500 }}>{fmt.currency(t.amount, currency)}</td>
                        <td style={{ textAlign: 'right' }}>
                          {t.is_card_payment
                            ? <span style={{ color: 'var(--c500)', background: 'rgba(0,184,148,.1)', borderRadius: 4, padding: '2px 6px' }}>Pago</span>
                            : <span style={{ color: '#e53e3e', background: 'rgba(229,62,62,.08)', borderRadius: 4, padding: '2px 6px' }}>Cargo</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CreditCards() {
  const {
    creditCards, creditCardsLoading, fetchCreditCards,
    createCreditCard, updateCreditCard, deleteCreditCard, addCardPayment,
    accounts, fetchAccounts,
    user, categories, fetchCategories, billingStatus,
  } = useStore();
  const currency = user?.currency || 'USD';

  const effectivePlan = billingStatus?.plan ?? user?.plan ?? 'free';

  const [modal,        setModal]        = useState(false);
  const [upgradeModal, setUpgradeModal] = useState(false);
  const [payModal,     setPayModal]     = useState(false);
  const [editing,      setEditing]      = useState(null);
  const [deleting,     setDeleting]     = useState(null);
  const [payCard,      setPayCard]      = useState(null);
  const [form,         setForm]         = useState(EMPTY_CARD);
  const [payForm,      setPayForm]      = useState(EMPTY_PAY);
  const [busy,         setBusy]         = useState(false);

  useEffect(() => { fetchCreditCards(); fetchCategories(); fetchAccounts(); }, []);

  const openCreate = () => {
    if (effectivePlan === 'free' && creditCards.length >= 1) { setUpgradeModal(true); return; }
    setEditing(null); setForm(EMPTY_CARD); setModal(true);
  };
  const openEdit = (c) => {
    setEditing(c);
    setForm({ name: c.name, last_four: c.last_four || '', credit_limit: c.credit_limit, billing_day: c.billing_day, due_day: c.due_day, color: c.color || '#00b894', notes: c.notes || '' });
    setModal(true);
  };
  const openPay = (c) => { setPayCard(c); setPayForm(EMPTY_PAY); setPayModal(true); };

  const save = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      if (editing) await updateCreditCard(editing.id, form);
      else         await createCreditCard(form);
      setModal(false); fetchCreditCards();
    } finally { setBusy(false); }
  };

  const savePay = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      await addCardPayment(payCard.id, payForm);
      setPayModal(false); fetchCreditCards();
    } finally { setBusy(false); }
  };

  const confirmDelete = async () => {
    await deleteCreditCard(deleting.id);
    setDeleting(null); fetchCreditCards();
  };

  const totalBalance = creditCards.reduce((s, c) => s + (c.current_balance || 0), 0);
  const totalLimit   = creditCards.reduce((s, c) => s + (Number(c.credit_limit) || 0), 0);

  return (
    <div className="space-y-5 animate-fade-up">

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <div className="hero-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--c400)', letterSpacing: '.12em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>
              Tarjetas · {creditCards.length} registrada{creditCards.length !== 1 ? 's' : ''}
            </div>
            <div style={{ fontFamily: 'var(--fd)', fontWeight: 300, fontSize: 13, color: '#5a9070', marginBottom: 2 }}>Saldo pendiente total</div>
            <span className="hero-amount">
              <span className="cur">{currency}</span>
              <span className="num">{Math.floor(totalBalance).toLocaleString()}</span>
              <span className="cents">.{(totalBalance % 1).toFixed(2).slice(2)}</span>
            </span>
            {totalLimit > 0 && (
              <div style={{ fontSize: 12, color: '#5a9070', marginTop: 4, fontFamily: 'var(--fm)' }}>
                límite total {fmt.currency(totalLimit, currency)} · {totalLimit > 0 ? `${((totalBalance / totalLimit) * 100).toFixed(1)}% utilizado` : '—'}
              </div>
            )}
          </div>
          <button onClick={openCreate} className="btn-primary" style={{ flexShrink: 0 }}>
            <Plus size={15} /> Nueva tarjeta
          </button>
        </div>
      </div>

      {/* ── Cards grid ────────────────────────────────────────────── */}
      {creditCardsLoading ? <Spinner /> : creditCards.length === 0 ? (
        <Empty icon={CreditCard} title="Sin tarjetas registradas"
          description="Agrega tus tarjetas de crédito para llevar control de tus cargos y pagos"
          action={<button onClick={openCreate} className="btn-primary text-xs">+ Nueva tarjeta</button>} />
      ) : (
        <>
          <div className="grid lg:grid-cols-2 gap-4">
            {creditCards.map((c, i) => (
              <CardItem key={c.id} card={c} currency={currency} index={i} userName={user?.name}
                onEdit={openEdit} onDelete={setDeleting} onPay={openPay} />
            ))}

            {/* Add card placeholder */}
            <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div onClick={openCreate} className="cc-add" style={{ width: '100%', maxWidth: 340, padding: 16 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: 'rgba(0,184,148,.1)', color: 'var(--c500)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8,
                }}>
                  <Plus size={18} />
                </div>
                <div style={{ fontFamily: 'var(--fd)', fontSize: 18, fontWeight: 300, fontStyle: 'italic', textAlign: 'center', color: 'var(--text)' }}>
                  Agrega una tarjeta
                </div>
                <div style={{ fontSize: 11, marginTop: 2, textAlign: 'center' }}>Débito, crédito o prepago</div>
              </div>
            </div>
          </div>
        </>
      )}

      <UpgradeModal open={upgradeModal} onClose={() => setUpgradeModal(false)} feature="limit" />

      {/* ── Modal crear/editar ────────────────────────────────────── */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar tarjeta' : 'Nueva tarjeta de crédito'}>
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="label">Nombre de la tarjeta</label>
              <input className="input" type="text" placeholder="Ej: Visa Banco Agrícola"
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="label">Últimos 4 dígitos</label>
              <input className="input" type="text" maxLength={4} placeholder="1234"
                value={form.last_four} onChange={e => setForm({ ...form, last_four: e.target.value.replace(/\D/g,'') })} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Límite de crédito</label>
              <input className="input" type="number" step="0.01" min="0" placeholder="0.00"
                value={form.credit_limit} onChange={e => setForm({ ...form, credit_limit: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="label">{editing ? 'Saldo actual' : 'Saldo inicial (lo que debes ahora)'}</label>
              <input className="input" type="number" step="0.01" min="0" placeholder="0.00"
                value={editing ? '' : form.initial_balance}
                onChange={e => setForm({ ...form, initial_balance: e.target.value })}
                disabled={!!editing} />
              {editing && <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Para ajustar el saldo registra un pago o transacción.</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Día de corte</label>
              <input className="input" type="number" min="1" max="31" placeholder="1"
                value={form.billing_day} onChange={e => setForm({ ...form, billing_day: e.target.value })} required />
            </div>
            <div>
              <label className="label">Día de pago</label>
              <input className="input" type="number" min="1" max="31" placeholder="20"
                value={form.due_day} onChange={e => setForm({ ...form, due_day: e.target.value })} required />
            </div>
          </div>

          <div>
            <label className="label">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                  className={clsx('w-7 h-7 rounded-full transition-transform', form.color === c && 'ring-2 ring-offset-2 ring-[var(--border)] scale-110')}
                  style={{ background: c }} />
              ))}
            </div>
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
      <Modal open={payModal} onClose={() => setPayModal(false)} title={`Pagar – ${payCard?.name}`}>
        <form onSubmit={savePay} className="space-y-4">
          <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--surface-2)', fontSize: 12 }}>
            Saldo pendiente: <strong style={{ color: '#e53e3e', fontFamily: 'var(--fm)' }}>{fmt.currency(payCard?.current_balance, currency)}</strong>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Monto del pago</label>
              <input className="input" type="number" step="0.01" min="0.01" placeholder="0.00"
                value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} required />
            </div>
            <div>
              <label className="label">Fecha de pago</label>
              <input className="input" type="date" value={payForm.txn_date}
                onChange={e => setPayForm({ ...payForm, txn_date: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="label">Cuenta bancaria de débito</label>
            <select className="input" value={payForm.account_id} onChange={e => setPayForm({ ...payForm, account_id: e.target.value })}>
              <option value="">— Sin vincular cuenta —</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Notas (opcional)</label>
            <input className="input" type="text" placeholder="Ej: Pago mínimo, pago total"
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
        title="Eliminar tarjeta"
        message={`¿Eliminar "${deleting?.name}"? Los movimientos asociados perderán el vínculo con la tarjeta.`}
      />
    </div>
  );
}
