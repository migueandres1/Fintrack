import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, CreditCard, ChevronDown, ChevronUp, DollarSign } from 'lucide-react';
import { useStore } from '../store/index.js';
import { fmt, localDate } from '../utils/format.js';
import { Modal, Confirm, ProgressBar, Empty, Spinner } from '../components/ui/index.jsx';
import api   from '../services/api.js';
import clsx  from 'clsx';

const COLORS = ['#6366f1','#22c55e','#f59e0b','#3b82f6','#ec4899','#14b8a6','#f97316','#8b5cf6','#ef4444'];

const EMPTY_CARD = {
  name: '', last_four: '', credit_limit: '', billing_day: 1, due_day: 20,
  color: '#6366f1', notes: '',
};
const EMPTY_PAY = {
  amount: '', txn_date: localDate(), notes: '',
};

function CardItem({ card, currency, onEdit, onDelete, onPay }) {
  const [expanded, setExpanded]   = useState(false);
  const [txns,     setTxns]       = useState(null);
  const [loading,  setLoading]    = useState(false);

  const utilPct  = Math.min(100, card.utilization || 0);
  const utilColor = utilPct > 80 ? '#ef4444' : utilPct > 50 ? '#f59e0b' : '#22c55e';

  const loadTxns = async () => {
    if (txns) { setExpanded(!expanded); return; }
    setLoading(true);
    try {
      const { data } = await api.get(`/credit-cards/${card.id}/transactions`);
      setTxns(data);
      setExpanded(true);
    } finally { setLoading(false); }
  };

  // Determine next due date
  const today   = new Date();
  const dueDay  = Math.max(1, Math.min(31, Number(card.due_day) || 20));
  const clampDay = (y, m) => Math.min(dueDay, new Date(y, m + 1, 0).getDate());
  let nextDue   = new Date(today.getFullYear(), today.getMonth(), clampDay(today.getFullYear(), today.getMonth()));
  if (nextDue <= today) {
    const nm = today.getMonth() + 1;
    const ny = nm > 11 ? today.getFullYear() + 1 : today.getFullYear();
    nextDue  = new Date(ny, nm % 12, clampDay(ny, nm % 12));
  }
  const nextDueStr = localDate(nextDue);

  return (
    <div className="card transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${card.color}20`, color: card.color }}>
            <CreditCard size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-sm">
              {card.name}{card.last_four && <span className="text-[var(--text-muted)] font-normal"> ···{card.last_four}</span>}
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Corte día {card.billing_day} · Pago día {card.due_day}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => onPay(card)}
            className="px-2 py-1 rounded-lg text-xs font-medium bg-brand-500/10 text-brand-500 hover:bg-brand-500/20 transition-colors">
            + Pago
          </button>
          <button onClick={() => onEdit(card)} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700">
            <Pencil size={13} className="text-[var(--text-muted)]" />
          </button>
          <button onClick={() => onDelete(card)} className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20">
            <Trash2 size={13} className="text-rose-400" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <p className="text-xs text-[var(--text-muted)]">Saldo pendiente</p>
          <p className="text-display font-bold text-base text-mono" style={{ color: card.current_balance > 0 ? '#f43f5e' : '#22c55e' }}>
            {fmt.currency(card.current_balance, currency)}
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--text-muted)]">Límite</p>
          <p className="font-semibold text-sm text-mono">{fmt.currency(card.credit_limit, currency)}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--text-muted)]">Próximo pago</p>
          <p className="font-semibold text-sm">{fmt.date(nextDueStr)}</p>
        </div>
      </div>

      {Number(card.credit_limit) > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[var(--text-muted)]">Utilización</span>
            <span className="font-medium" style={{ color: utilColor }}>{utilPct.toFixed(1)}%</span>
          </div>
          <ProgressBar value={utilPct} max={100} color={utilColor} />
          {utilPct > 80 && (
            <p className="text-xs text-rose-500 mt-1">⚠ Alta utilización. Puede afectar tu historial crediticio.</p>
          )}
        </div>
      )}

      <button onClick={loadTxns} disabled={loading}
        className="w-full flex items-center justify-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text)] py-1 transition-colors">
        {loading ? 'Cargando...' : expanded
          ? <><ChevronUp size={14} /> Ocultar movimientos</>
          : <><ChevronDown size={14} /> Ver movimientos recientes</>}
      </button>

      {expanded && txns !== null && (
        <div className="mt-4 pt-4 border-t border-[var(--border)] animate-fade-up">
          {txns.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] text-center py-2">Sin movimientos registrados</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[var(--text-muted)] border-b border-[var(--border)]">
                    <th className="text-left py-1.5">Fecha</th>
                    <th className="text-left py-1.5 pl-2">Descripción</th>
                    <th className="text-right py-1.5">Monto</th>
                    <th className="text-right py-1.5">Tipo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {txns.map(t => (
                    <tr key={t.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50">
                      <td className="py-1.5">{fmt.date(t.txn_date)}</td>
                      <td className="py-1.5 pl-2 max-w-[120px] truncate">{t.description || t.category_name}</td>
                      <td className="text-right font-medium text-mono">{fmt.currency(t.amount, currency)}</td>
                      <td className="text-right">
                        {t.is_card_payment
                          ? <span className="text-green-600 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded">Pago</span>
                          : <span className="text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-1.5 py-0.5 rounded">Cargo</span>
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
  );
}

export default function CreditCards() {
  const {
    creditCards, creditCardsLoading, fetchCreditCards,
    createCreditCard, updateCreditCard, deleteCreditCard, addCardPayment,
    user, categories, fetchCategories,
  } = useStore();
  const currency = user?.currency || 'USD';

  const [modal,     setModal]    = useState(false);
  const [payModal,  setPayModal] = useState(false);
  const [editing,   setEditing]  = useState(null);
  const [deleting,  setDeleting] = useState(null);
  const [payCard,   setPayCard]  = useState(null);
  const [form,      setForm]     = useState(EMPTY_CARD);
  const [payForm,   setPayForm]  = useState(EMPTY_PAY);
  const [busy,      setBusy]     = useState(false);

  useEffect(() => { fetchCreditCards(); fetchCategories(); }, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY_CARD); setModal(true); };
  const openEdit   = (c) => {
    setEditing(c);
    setForm({
      name: c.name, last_four: c.last_four || '', credit_limit: c.credit_limit,
      billing_day: c.billing_day, due_day: c.due_day, color: c.color, notes: c.notes || '',
    });
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display font-bold text-xl">Tarjetas de crédito</h1>
          <p className="text-[var(--text-muted)] text-sm">
            {creditCards.length} tarjeta{creditCards.length !== 1 ? 's' : ''} registrada{creditCards.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus size={15} /> Nueva tarjeta</button>
      </div>

      {creditCards.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="card">
            <p className="text-xs text-[var(--text-muted)] mb-1">Saldo total pendiente</p>
            <p className="text-display font-bold text-xl text-mono text-rose-500">{fmt.currency(totalBalance, currency)}</p>
          </div>
          <div className="card">
            <p className="text-xs text-[var(--text-muted)] mb-1">Límite total</p>
            <p className="text-display font-bold text-xl text-mono">{fmt.currency(totalLimit, currency)}</p>
          </div>
          <div className="card hidden sm:block">
            <p className="text-xs text-[var(--text-muted)] mb-1">Utilización global</p>
            <p className="text-display font-bold text-xl">
              {totalLimit > 0 ? `${((totalBalance / totalLimit) * 100).toFixed(1)}%` : '—'}
            </p>
          </div>
        </div>
      )}

      {creditCardsLoading ? <Spinner /> : creditCards.length === 0 ? (
        <Empty icon={CreditCard} title="Sin tarjetas registradas"
          description="Agrega tus tarjetas de crédito para llevar control de tus cargos y pagos"
          action={<button onClick={openCreate} className="btn-primary text-xs">+ Nueva tarjeta</button>} />
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {creditCards.map(c => (
            <CardItem key={c.id} card={c} currency={currency}
              onEdit={openEdit} onDelete={setDeleting} onPay={openPay} />
          ))}
        </div>
      )}

      {/* Modal crear/editar */}
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

          <div>
            <label className="label">Notas (opcional)</label>
            <input className="input" type="text" placeholder="Ej: Visa clásica, sin anualidad"
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
      <Modal open={payModal} onClose={() => setPayModal(false)} title={`Pagar tarjeta – ${payCard?.name}`}>
        <form onSubmit={savePay} className="space-y-4">
          <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800 text-xs">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Saldo pendiente</span>
              <span className="font-bold text-mono text-rose-500">{fmt.currency(payCard?.current_balance, currency)}</span>
            </div>
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
            <label className="label">Notas (opcional)</label>
            <input className="input" type="text" placeholder="Ej: Pago mínimo, pago total"
              value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} />
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            <DollarSign size={11} className="inline mr-0.5" />
            Este pago se descontará de tu saldo disponible.
          </p>
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
        title="Eliminar tarjeta"
        message={`¿Eliminar "${deleting?.name}"? Los movimientos asociados perderán el vínculo con la tarjeta.`}
      />
    </div>
  );
}
