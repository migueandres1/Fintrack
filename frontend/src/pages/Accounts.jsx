import { useEffect, useState } from 'react';
import {
  Plus, Pencil, Trash2, Landmark, ChevronDown, ChevronUp,
  ArrowUpCircle, ArrowDownCircle, Banknote, TrendingUp, PiggyBank,
} from 'lucide-react';
import { useStore } from '../store/index.js';
import { fmt, localDate } from '../utils/format.js';
import { Modal, Confirm, Empty, Spinner } from '../components/ui/index.jsx';
import UpgradeModal from '../components/UpgradeModal.jsx';
import api from '../services/api.js';
import clsx from 'clsx';

const COLORS = ['#00b894','#55d8b4','#6366f1','#22c55e','#f59e0b','#3b82f6','#ec4899','#14b8a6','#f97316'];

const ACCOUNT_TYPES = [
  { value: 'checking',   label: 'Cuenta corriente', icon: Landmark },
  { value: 'savings',    label: 'Cuenta de ahorro',  icon: PiggyBank },
  { value: 'cash',       label: 'Efectivo',           icon: Banknote },
  { value: 'investment', label: 'Inversión',          icon: TrendingUp },
];

const CURRENCIES = ['USD','EUR','MXN','COP','ARS','BRL','GTQ','HNL','NIO','CRC','PEN','CLP'];

const EMPTY_FORM = {
  name: '', type: 'checking', initial_balance: '0', currency: 'USD', color: '#00b894', notes: '',
};

function AccountRow({ account, currency: globalCurrency, onEdit, onDelete, totalBalance }) {
  const acCurrency = account.currency || 'USD';
  const [expanded, setExpanded] = useState(false);
  const [txns,     setTxns]     = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [page,     setPage]     = useState(1);
  const [total,    setTotal]    = useState(0);

  const balancePct = totalBalance > 0 ? Math.min(100, (account.balance / totalBalance) * 100) : 0;

  const loadTxns = async (p = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/accounts/${account.id}/transactions`, { params: { page: p, limit: 20 } });
      setTxns(p === 1 ? data.data : [...(txns || []), ...data.data]);
      setTotal(data.total);
      setPage(p);
      setExpanded(true);
    } finally { setLoading(false); }
  };

  const toggle = async () => {
    if (expanded) { setExpanded(false); return; }
    if (!txns) await loadTxns(1);
    else setExpanded(true);
  };

  const initLetter = account.name?.[0]?.toUpperCase() || '?';

  return (
    <div style={{ padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Color avatar */}
        <div style={{
          width: 42, height: 42, borderRadius: 12,
          background: account.color || 'var(--c500)',
          color: '#0b1712', fontWeight: 700, fontSize: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {initLetter}
        </div>

        {/* Name + type */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{account.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            {ACCOUNT_TYPES.find(t => t.value === account.type)?.label || 'Cuenta'} · {acCurrency}
          </div>
        </div>

        {/* Progress bar + % */}
        <div style={{ width: 100 }}>
          <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${balancePct}%`, background: account.color || 'var(--c500)', borderRadius: 2 }} />
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'var(--fm)' }}>
            {balancePct.toFixed(1)}% del total
          </div>
        </div>

        {/* Balance */}
        <div style={{ textAlign: 'right', minWidth: 120 }}>
          <div style={{
            fontSize: 16, fontWeight: 600, color: account.balance >= 0 ? 'var(--text)' : '#e53e3e',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {fmt.currency(account.balance, acCurrency)}
          </div>
          {account.balance !== account.initial_balance && (
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--fm)', marginTop: 2 }}>
              inicial: {fmt.currency(account.initial_balance, acCurrency)}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button onClick={() => onEdit(account)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
            <Pencil size={13} />
          </button>
          <button onClick={() => onDelete(account)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e53e3e', padding: 4 }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {account.notes && (
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, marginLeft: 58, fontStyle: 'italic' }}>{account.notes}</p>
      )}

      {/* History toggle */}
      <button onClick={toggle} disabled={loading} style={{
        marginTop: 10, marginLeft: 58, fontSize: 11, color: 'var(--text-muted)',
        background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
      }}>
        {loading ? 'Cargando…' : expanded
          ? <><ChevronUp size={12} /> Ocultar movimientos</>
          : <><ChevronDown size={12} /> Ver movimientos</>
        }
      </button>

      {expanded && txns !== null && (
        <div style={{ marginTop: 10, marginLeft: 58 }} className="animate-fade-up">
          {txns.length === 0 ? (
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sin movimientos registrados</p>
          ) : (
            <>
              {txns.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: `${t.color || (t.type === 'income' ? '#00b894' : '#e53e3e')}20`,
                    color: t.color || (t.type === 'income' ? '#00b894' : '#e53e3e'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {t.type === 'income' ? <ArrowUpCircle size={13} /> : <ArrowDownCircle size={13} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.description || t.category_name}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                      {fmt.date(t.txn_date)} · {t.category_name}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 12, fontWeight: 600, fontFamily: 'var(--fm)',
                    color: t.type === 'income' ? 'var(--c500)' : '#e53e3e', flexShrink: 0,
                  }}>
                    {t.type === 'income' ? '+' : '-'}{fmt.currency(t.amount, acCurrency)}
                  </span>
                </div>
              ))}
              {txns.length < total && (
                <button onClick={() => loadTxns(page + 1)} disabled={loading}
                  style={{ marginTop: 8, fontSize: 11, color: 'var(--c500)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  {loading ? 'Cargando…' : `Ver más (${total - txns.length} restantes)`}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function Accounts() {
  const {
    accounts, accountsLoading, fetchAccounts,
    createAccount, updateAccount, deleteAccount,
    user, billingStatus,
  } = useStore();

  const [modal,        setModal]        = useState(false);
  const [upgradeModal, setUpgradeModal] = useState(false);
  const [editing,      setEditing]      = useState(null);
  const [deleting,     setDeleting]     = useState(null);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [busy,         setBusy]         = useState(false);

  const effectivePlan = billingStatus?.plan ?? user?.plan ?? 'free';
  const currency = user?.currency || 'USD';

  useEffect(() => { fetchAccounts(); }, []);

  const openCreate = () => {
    if (effectivePlan === 'free' && accounts.length >= 2) { setUpgradeModal(true); return; }
    setEditing(null); setForm(EMPTY_FORM); setModal(true);
  };
  const openEdit = (a) => {
    setEditing(a);
    setForm({ name: a.name, type: a.type, initial_balance: a.initial_balance, currency: a.currency || 'USD', color: a.color || '#00b894', notes: a.notes || '' });
    setModal(true);
  };

  const save = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      if (editing) await updateAccount(editing.id, form);
      else         await createAccount(form);
      setModal(false); fetchAccounts();
    } finally { setBusy(false); }
  };

  const confirmDelete = async () => {
    await deleteAccount(deleting.id);
    setDeleting(null); fetchAccounts();
  };

  // Total balance in user's primary currency (same-currency accounts only for the bar)
  const sameCurrencyAccounts = accounts.filter(a => (a.currency || 'USD') === currency);
  const totalSameCurrency = sameCurrencyAccounts.reduce((s, a) => s + (a.balance || 0), 0);

  const currencyTotals = accounts.reduce((acc, a) => {
    const cur = a.currency || 'USD';
    acc[cur] = (acc[cur] || 0) + (a.balance || 0);
    return acc;
  }, {});

  return (
    <div className="space-y-5 animate-fade-up">

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <div className="hero-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--c400)', letterSpacing: '.12em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>
              Cuentas y tarjetas · {accounts.length} cuenta{accounts.length !== 1 ? 's' : ''}
            </div>
            {Object.entries(currencyTotals).map(([cur, total]) => (
              <div key={cur}>
                <div style={{ fontFamily: 'var(--fd)', fontWeight: 300, fontSize: 13, color: '#5a9070', marginBottom: 2 }}>
                  Balance total · {cur}
                </div>
                <span className="hero-amount">
                  <span className="cur">{cur}</span>
                  <span className="num">{Math.abs(Math.floor(total)).toLocaleString()}</span>
                  <span className="cents">.{(Math.abs(total) % 1).toFixed(2).slice(2)}</span>
                </span>
              </div>
            ))}
            <div style={{ fontSize: 12, color: '#5a9070', marginTop: 6, fontFamily: 'var(--fm)' }}>
              sincronizado · {accounts.filter(a => a.is_active).length} activas
            </div>
          </div>
          <button onClick={openCreate} className="btn-primary" style={{ flexShrink: 0 }}>
            <Plus size={15} /> Nueva cuenta
          </button>
        </div>
      </div>

      {/* ── Account list ──────────────────────────────────────────── */}
      {accountsLoading ? <Spinner /> : accounts.length === 0 ? (
        <Empty icon={Landmark} title="Sin cuentas registradas"
          description="Agrega tus cuentas bancarias y de efectivo para llevar control de tu dinero"
          action={<button onClick={openCreate} className="btn-primary text-xs">+ Nueva cuenta</button>}
        />
      ) : (
        <div className="card" style={{ padding: '0 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
              Cuentas bancarias
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{accounts.length} conectadas</span>
          </div>
          {accounts.map(a => (
            <AccountRow
              key={a.id}
              account={a}
              currency={currency}
              totalBalance={totalSameCurrency}
              onEdit={openEdit}
              onDelete={setDeleting}
            />
          ))}

          {/* Add placeholder */}
          <div
            onClick={openCreate}
            style={{
              padding: '16px 0', display: 'flex', alignItems: 'center', gap: 12,
              color: 'var(--text-muted)', cursor: 'pointer',
            }}
          >
            <div style={{
              width: 42, height: 42, borderRadius: 12, flexShrink: 0,
              background: 'transparent', border: '1.5px dashed var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c500)',
            }}>
              <Plus size={18} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--fd)', fontSize: 16, fontWeight: 300, fontStyle: 'italic', color: 'var(--text)' }}>
                Agregar una cuenta
              </div>
              <div style={{ fontSize: 11, marginTop: 2 }}>Débito, ahorro o efectivo</div>
            </div>
          </div>
        </div>
      )}

      <UpgradeModal open={upgradeModal} onClose={() => setUpgradeModal(false)} feature="limit" />

      {/* ── Modal ──────────────────────────────────────────────────── */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar cuenta' : 'Nueva cuenta'}>
        <form onSubmit={save} className="space-y-3">
          <div>
            <label className="label">Nombre</label>
            <input className="input" type="text" placeholder="Ej: Banco Agrícola, Efectivo billetera"
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>

          <div>
            <label className="label">Tipo de cuenta</label>
            <div className="grid grid-cols-2 gap-2">
              {ACCOUNT_TYPES.map(({ value, label, icon: Icon }) => (
                <button key={value} type="button"
                  onClick={() => setForm({ ...form, type: value })}
                  className={clsx('flex items-center gap-2 p-2 rounded-xl text-xs font-medium transition-all')}
                  style={{
                    border: form.type === value ? '1.5px solid var(--c500)' : '1.5px solid var(--border)',
                    background: form.type === value ? 'rgba(0,184,148,.08)' : 'transparent',
                    color: form.type === value ? 'var(--c500)' : 'var(--text-muted)',
                  }}>
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Saldo inicial</label>
              <input className="input" type="number" step="0.01" min="0" placeholder="0.00"
                value={form.initial_balance} onChange={e => setForm({ ...form, initial_balance: e.target.value })} />
            </div>
            <div>
              <label className="label">Moneda</label>
              <select className="input" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
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
            <input className="input" type="text" placeholder="Ej: Cuenta de nómina"
              value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={busy} className="btn-primary flex-1 justify-center">
              {busy ? 'Guardando...' : editing ? 'Actualizar' : 'Crear cuenta'}
            </button>
          </div>
        </form>
      </Modal>

      <Confirm
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Eliminar cuenta"
        message={`¿Eliminar "${deleting?.name}"? Las transacciones vinculadas perderán el enlace con esta cuenta.`}
      />
    </div>
  );
}
