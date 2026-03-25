import { useEffect, useState } from 'react';
import {
  Plus, Pencil, Trash2, Landmark, ChevronDown, ChevronUp,
  ArrowUpCircle, ArrowDownCircle, Banknote, TrendingUp, PiggyBank,
} from 'lucide-react';
import { useStore } from '../store/index.js';
import { fmt, localDate } from '../utils/format.js';
import { Modal, Confirm, Empty, Spinner } from '../components/ui/index.jsx';
import api from '../services/api.js';
import clsx from 'clsx';

const COLORS = ['#6366f1','#22c55e','#f59e0b','#3b82f6','#ec4899','#14b8a6','#f97316','#8b5cf6','#ef4444'];

const ACCOUNT_TYPES = [
  { value: 'checking',   label: 'Cuenta corriente', icon: Landmark },
  { value: 'savings',    label: 'Cuenta de ahorro',  icon: PiggyBank },
  { value: 'cash',       label: 'Efectivo',           icon: Banknote },
  { value: 'investment', label: 'Inversión',          icon: TrendingUp },
];

const CURRENCIES = ['USD','EUR','MXN','COP','ARS','BRL','GTQ','HNL','NIO','CRC','PEN','CLP'];

const EMPTY_FORM = {
  name: '', type: 'checking', initial_balance: '0', currency: 'USD', color: '#6366f1', notes: '',
};

function AccountCard({ account, onEdit, onDelete }) {
  const currency = account.currency || 'USD';
  const [expanded, setExpanded] = useState(false);
  const [txns,     setTxns]     = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [page,     setPage]     = useState(1);
  const [total,    setTotal]    = useState(0);

  const typeInfo = ACCOUNT_TYPES.find(t => t.value === account.type) || ACCOUNT_TYPES[0];
  const Icon = typeInfo.icon;
  const balanceColor = account.balance >= 0 ? '#22c55e' : '#f43f5e';

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

  return (
    <div className="card transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `${account.color}20`, color: account.color }}>
            <Icon size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-sm">{account.name}</h3>
            <p className="text-xs text-[var(--text-muted)]">{typeInfo.label} · {account.currency || 'USD'}</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => onEdit(account)} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700">
            <Pencil size={13} className="text-[var(--text-muted)]" />
          </button>
          <button onClick={() => onDelete(account)} className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20">
            <Trash2 size={13} className="text-rose-400" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="col-span-2">
          <p className="text-xs text-[var(--text-muted)]">Saldo actual</p>
          <p className="text-display font-bold text-xl text-mono" style={{ color: balanceColor }}>
            {fmt.currency(account.balance, currency)}
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--text-muted)]">Saldo inicial</p>
          <p className="text-sm font-semibold text-mono">{fmt.currency(account.initial_balance, currency)}</p>
        </div>
      </div>

      {account.notes && (
        <p className="text-xs text-[var(--text-muted)] mb-3 italic">{account.notes}</p>
      )}

      <button onClick={toggle} disabled={loading}
        className="w-full flex items-center justify-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text)] py-1 transition-colors">
        {loading ? 'Cargando...' : expanded
          ? <><ChevronUp size={14} /> Ocultar movimientos</>
          : <><ChevronDown size={14} /> Ver movimientos</>}
      </button>

      {expanded && txns !== null && (
        <div className="mt-4 pt-4 border-t border-[var(--border)] animate-fade-up">
          {txns.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] text-center py-2">Sin movimientos registrados</p>
          ) : (
            <>
              <div className="space-y-0 divide-y divide-[var(--border)]">
                {txns.map(t => (
                  <div key={t.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs flex-shrink-0"
                        style={{ background: `${t.color}20`, color: t.color }}>
                        {t.type === 'income' ? <ArrowUpCircle size={13} /> : <ArrowDownCircle size={13} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{t.description || t.category_name}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">{fmt.date(t.txn_date)} · {t.category_name}</p>
                      </div>
                    </div>
                    <span className={clsx('text-xs font-semibold text-mono flex-shrink-0 ml-2',
                      t.type === 'income' ? 'text-green-500' : 'text-rose-500')}>
                      {t.type === 'income' ? '+' : '-'}{fmt.currency(t.amount, account.currency || 'USD')}
                    </span>
                  </div>
                ))}
              </div>
              {txns.length < total && (
                <button
                  onClick={() => loadTxns(page + 1)}
                  disabled={loading}
                  className="w-full mt-3 text-xs text-brand-500 hover:underline"
                >
                  {loading ? 'Cargando...' : `Ver más (${total - txns.length} restantes)`}
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
  } = useStore();

  const [modal,   setModal]   = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting,setDeleting]= useState(null);
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [busy,    setBusy]    = useState(false);

  useEffect(() => { fetchAccounts(); }, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setModal(true); };
  const openEdit   = (a) => {
    setEditing(a);
    setForm({
      name: a.name, type: a.type, initial_balance: a.initial_balance,
      currency: a.currency || 'USD', color: a.color, notes: a.notes || '',
    });
    setModal(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (editing) await updateAccount(editing.id, form);
      else         await createAccount(form);
      setModal(false);
      fetchAccounts();
    } finally { setBusy(false); }
  };

  const confirmDelete = async () => {
    await deleteAccount(deleting.id);
    setDeleting(null);
    fetchAccounts();
  };

  // Group balances by currency (accounts may have different currencies)
  const currencyTotals = accounts.reduce((acc, a) => {
    const cur = a.currency || 'USD';
    acc[cur] = (acc[cur] || 0) + (a.balance || 0);
    return acc;
  }, {});

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display font-bold text-xl">Cuentas</h1>
          <p className="text-[var(--text-muted)] text-sm">
            {accounts.length} cuenta{accounts.length !== 1 ? 's' : ''} registrada{accounts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus size={15} /> Nueva cuenta</button>
      </div>

      {accounts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(currencyTotals).map(([cur, total]) => (
            <div key={cur} className="card sm:col-span-2">
              <p className="text-xs text-[var(--text-muted)] mb-1">Balance total · {cur}</p>
              <p className={clsx('text-display font-bold text-2xl text-mono', total >= 0 ? 'text-green-500' : 'text-rose-500')}>
                {fmt.currency(total, cur)}
              </p>
            </div>
          ))}
          {ACCOUNT_TYPES.map(({ value, label, icon: Icon }) => {
            const group = accounts.filter(a => a.type === value);
            if (!group.length) return null;
            // Group type subtotals by currency too
            const byCur = group.reduce((acc, a) => {
              const cur = a.currency || 'USD';
              acc[cur] = (acc[cur] || 0) + (a.balance || 0);
              return acc;
            }, {});
            return (
              <div key={value} className="card">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={12} className="text-[var(--text-muted)]" />
                  <p className="text-xs text-[var(--text-muted)]">{label}</p>
                </div>
                {Object.entries(byCur).map(([cur, sum]) => (
                  <p key={cur} className={clsx('text-display font-bold text-base text-mono', sum >= 0 ? '' : 'text-rose-500')}>
                    {fmt.currency(sum, cur)}
                  </p>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {accountsLoading ? <Spinner /> : accounts.length === 0 ? (
        <Empty icon={Landmark} title="Sin cuentas registradas"
          description="Agrega tus cuentas bancarias y de efectivo para llevar control de tu dinero"
          action={<button onClick={openCreate} className="btn-primary text-xs">+ Nueva cuenta</button>}
        />
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {accounts.map(a => (
            <AccountCard key={a.id} account={a}
              onEdit={openEdit} onDelete={setDeleting} />
          ))}
        </div>
      )}

      {/* Modal crear/editar */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar cuenta' : 'Nueva cuenta'}>
        <form onSubmit={save} className="space-y-4">
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
                  className={clsx(
                    'flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all',
                    form.type === value
                      ? 'border-brand-500 bg-brand-500/10 text-brand-500'
                      : 'border-[var(--border)] text-[var(--text-muted)] hover:border-brand-400'
                  )}>
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Saldo inicial</label>
              <input className="input" type="number" step="0.01" placeholder="0.00"
                value={form.initial_balance} onChange={e => setForm({ ...form, initial_balance: e.target.value })} required />
              <p className="text-xs text-[var(--text-muted)] mt-1">El saldo actual se calculará sumando tus transacciones.</p>
            </div>
            <div>
              <label className="label">Moneda</label>
              <select className="input" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <p className="text-xs text-[var(--text-muted)] mt-1">Moneda de esta cuenta.</p>
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
            <button type="button" onClick={() => setModal(false)} className="btn-ghost flex-1 justify-center">Cancelar</button>
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
