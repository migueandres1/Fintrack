import { useEffect, useState, useRef } from 'react';
import { Plus, Pencil, Trash2, PiggyBank, CheckCircle2, Target, Plane, Home, GraduationCap, Car, LifeBuoy, Heart, Gift, ArrowUpCircle } from 'lucide-react';
import { useStore }  from '../store/index.js';
import UpgradeModal from '../components/UpgradeModal.jsx';
import { fmt, localDate } from '../utils/format.js';
import { Modal, Confirm, Empty, Spinner } from '../components/ui/index.jsx';
import api  from '../services/api.js';
import clsx from 'clsx';

const COLORS  = ['#00b894','#6366f1','#22c55e','#f59e0b','#3b82f6','#ec4899','#14b8a6','#f97316','#8b5cf6'];

const EMPTY_GOAL = {
  name: '', target_amount: '', deadline: '', icon: 'target', color: '#00b894', account_id: '',
};
const EMPTY_CONTRIB = {
  amount: '', contrib_date: localDate(), notes: '', account_id: '',
};

// Map goal name keywords → lucide icon (replaces the handoff's emojis)
function goalIcon(name) {
  const n = (name || '').toLowerCase();
  if (/viaj|vacacion|holbox|cancun|playa|avion/.test(n)) return Plane;
  if (/casa|hogar|depa|apartament|inmueb/.test(n))        return Home;
  if (/estudi|curso|universidad|maestr|grado/.test(n))     return GraduationCap;
  if (/auto|carro|moto|coche/.test(n))                     return Car;
  if (/emergenc|salvavid|fondo/.test(n))                   return LifeBuoy;
  if (/regalo|gift|aniversar|boda/.test(n))                return Gift;
  if (/salud|medic|hospital/.test(n))                      return Heart;
  return Target;
}

// ── Goal card — dark variant (first goal) or light (rest) ─────────────────────
function GoalRow({ goal, currency, onEdit, onDelete, onContrib, onEditContrib, onDeleteContrib, dark = false }) {
  const [detail,   setDetail]   = useState(null);
  const [expanded, setExpanded] = useState(false);

  const pct       = Math.min(100, goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0);
  const remaining = Math.max(0, goal.target_amount - goal.current_amount);
  const GoalIcon  = goalIcon(goal.name);
  const color     = goal.color || 'var(--c500)';

  const monthsLeft = (() => {
    if (!goal.deadline) return null;
    const now = new Date();
    const t   = new Date(String(goal.deadline).split('T')[0] + 'T00:00:00');
    return Math.max(1, (t.getFullYear() - now.getFullYear()) * 12 + (t.getMonth() - now.getMonth()));
  })();

  const loadDetail = async () => {
    if (!expanded && !detail) {
      const { data } = await api.get(`/savings/${goal.id}`);
      setDetail(data);
    }
    setExpanded(v => !v);
  };
  const refreshDetail = async () => {
    const { data } = await api.get(`/savings/${goal.id}`);
    setDetail(data);
  };

  const sectionStyle = dark
    ? {
        background: 'var(--g950)', color: '#f0f5f3',
        border: '1px solid var(--g800)',
        position: 'relative', overflow: 'hidden',
      }
    : undefined;

  return (
    <div className="m-sect" style={sectionStyle}>
      {dark && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cpath fill='none' stroke='%232e5c3e' stroke-width='1' d='M20 100 Q60 60 100 100 Q140 140 180 100'/%3E%3C/svg%3E\")",
          backgroundSize: '200px 200px', opacity: .4,
        }} />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, position: 'relative' }}>
        {/* Icon tile */}
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: dark ? 'rgba(0,184,148,.15)' : `${color}18`,
          color: dark ? 'var(--c400)' : color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <GoalIcon size={22} />
        </div>

        {/* Name + amount */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 600,
            color: dark ? '#f0f5f3' : 'var(--text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {goal.name}
          </div>
          <div style={{
            fontSize: 11, marginTop: 3,
            fontFamily: 'var(--fm)',
            color: dark ? '#5a9070' : 'var(--text-muted)',
          }}>
            {fmt.currency(goal.current_amount, currency)} de {fmt.currency(goal.target_amount, currency)}
          </div>
          {goal.is_completed && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: 10, color: 'var(--c500)', fontWeight: 600 }}>
              <CheckCircle2 size={11} /> Completada
            </div>
          )}
        </div>

        {/* Percentage in Cormorant */}
        <div style={{
          fontFamily: 'var(--fd)', fontWeight: 300, fontSize: 28,
          color: color, lineHeight: 1, flexShrink: 0,
        }}>
          {pct.toFixed(0)}%
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 12, position: 'relative',
        background: dark ? 'rgba(46,92,62,.5)' : `${color}20`,
      }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: 3,
          background: dark ? 'linear-gradient(90deg, var(--c500), var(--c400))' : color,
          transition: 'width .4s ease',
        }} />
      </div>

      {/* Meta row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', marginTop: 8,
        fontSize: 10, fontFamily: 'var(--fm)',
        color: dark ? '#5a9070' : 'var(--text-muted)',
        position: 'relative',
      }}>
        <span>{!goal.is_completed && remaining > 0 ? `faltan ${fmt.currency(remaining, currency)}` : ' '}</span>
        {monthsLeft != null && !goal.is_completed && (
          <span>{monthsLeft} mes{monthsLeft !== 1 ? 'es' : ''} restantes</span>
        )}
      </div>

      {/* Actions */}
      <div style={{
        display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 10,
        position: 'relative',
      }}>
        {!goal.is_completed && (
          <button
            onClick={() => onContrib(goal)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
              borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              background: dark ? 'rgba(0,184,148,.2)' : 'rgba(0,184,148,.1)',
              color: 'var(--c500)', border: 'none',
            }}
          >
            <Plus size={12} /> Aportar
          </button>
        )}
        <button
          onClick={loadDetail}
          style={{
            padding: '6px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: 'pointer',
            background: 'transparent', border: 'none',
            color: dark ? '#5a9070' : 'var(--text-muted)',
          }}
        >
          {expanded ? 'Ocultar' : 'Aportes'}
        </button>
        <button
          onClick={() => onEdit(goal)}
          style={{
            padding: 6, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer',
            color: dark ? '#5a9070' : 'var(--text-muted)',
          }}
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={() => onDelete(goal)}
          style={{ padding: 6, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#e53e3e' }}
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Contribution history */}
      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${dark ? '#1e3d2a' : 'var(--border)'}`, position: 'relative' }}>
          {detail?.contributions?.length > 0 ? detail.contributions.map((c) => (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
              borderBottom: `1px solid ${dark ? '#1e3d2a' : 'var(--border)'}`,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'rgba(0,184,148,.15)', color: 'var(--c500)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <ArrowUpCircle size={13} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: dark ? '#f0f5f3' : 'var(--text)' }}>
                  {c.notes || 'Aporte'}
                </div>
                <div style={{ fontSize: 10, color: dark ? '#5a9070' : 'var(--text-muted)', marginTop: 1 }}>
                  {fmt.date(c.contrib_date)}
                </div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--c500)', fontFamily: 'var(--fm)' }}>
                +{fmt.currency(c.amount, currency)}
              </span>
              <button onClick={() => onEditContrib(c, goal.id, refreshDetail)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: dark ? '#5a9070' : 'var(--text-muted)', padding: 2 }}>
                <Pencil size={11} />
              </button>
              <button onClick={() => onDeleteContrib(c, goal.id, refreshDetail)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e53e3e', padding: 2 }}>
                <Trash2 size={11} />
              </button>
            </div>
          )) : (
            <p style={{ fontSize: 11, textAlign: 'center', color: dark ? '#5a9070' : 'var(--text-muted)', padding: 8 }}>
              Sin aportes aún
            </p>
          )}
        </div>
      )}
    </div>
  );
}

const EMPTY_EDIT_CONTRIB = { amount: '', contrib_date: localDate(), notes: '' };

export default function Savings() {
  const { goals, goalsLoading, fetchGoals, createGoal, updateGoal, deleteGoal, addContribution, user, billingStatus, accounts, fetchAccounts } = useStore();
  const currency = user?.currency || 'USD';

  const effectivePlan = billingStatus?.plan ?? user?.plan ?? 'free';

  const [modal,            setModal]           = useState(false);
  const [upgradeModal,     setUpgradeModal]     = useState(false);
  const [contribModal,     setContribModal]     = useState(false);
  const [editContribModal, setEditContribModal] = useState(false);
  const [delContrib,       setDelContrib]       = useState(null);
  const [editing,          setEditing]          = useState(null);
  const [deleting,         setDeleting]         = useState(null);
  const [contribGoal,      setContribGoal]      = useState(null);
  const [form,             setForm]             = useState(EMPTY_GOAL);
  const [contribForm,      setContribForm]      = useState(EMPTY_CONTRIB);
  const [editContribData,  setEditContribData]  = useState(null);
  const [editContribForm,  setEditContribForm]  = useState(EMPTY_EDIT_CONTRIB);
  const [busy,             setBusy]             = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => { fetchGoals(); fetchAccounts(); }, []);

  const openCreate = () => {
    if (effectivePlan === 'free' && goals.length >= 1) { setUpgradeModal(true); return; }
    setEditing(null); setForm(EMPTY_GOAL); setModal(true);
  };
  const openEdit = (g) => {
    setEditing(g);
    setForm({ name: g.name, target_amount: g.target_amount, deadline: g.deadline || '', icon: g.icon, color: g.color || '#00b894', account_id: g.account_id || '' });
    setModal(true);
  };
  const openContrib = (g) => {
    setContribGoal(g);
    setContribForm({ ...EMPTY_CONTRIB, account_id: g.account_id ? String(g.account_id) : '' });
    setContribModal(true);
  };
  const openEditContrib = (contrib, goalId, refresh) => {
    setEditContribData({ contrib, goalId, refresh });
    setEditContribForm({ amount: String(contrib.amount), contrib_date: contrib.contrib_date?.split('T')[0] || localDate(), notes: contrib.notes || '' });
    setEditContribModal(true);
  };
  const openDelContrib = (contrib, goalId, refresh) => {
    setDelContrib({ contrib, goalId, refresh });
  };

  const save = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      if (editing) await updateGoal(editing.id, form);
      else         await createGoal(form);
      setModal(false); fetchGoals();
    } finally { setBusy(false); }
  };

  const saveContrib = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    setContribModal(false);
    try {
      await addContribution(contribGoal.id, contribForm);
      fetchGoals();
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  };

  const saveEditContrib = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    try {
      await api.put(`/savings/contributions/${editContribData.contrib.id}`, editContribForm);
      setEditContribModal(false);
      fetchGoals();
      editContribData.refresh();
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  };

  const confirmDeleteContrib = async () => {
    if (!delContrib) return;
    await api.delete(`/savings/contributions/${delContrib.contrib.id}`);
    fetchGoals();
    delContrib.refresh();
    setDelContrib(null);
  };

  const confirmDelete = async () => {
    await deleteGoal(deleting.id);
    setDeleting(null); fetchGoals();
  };

  const active    = goals.filter(g => !g.is_completed);
  const completed = goals.filter(g => g.is_completed);
  const totalSaved  = goals.reduce((s, g) => s + (g.current_amount || 0), 0);

  return (
    <div className="space-y-4 animate-fade-up" style={{ maxWidth: 640, margin: '0 auto' }}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{
        padding: '6px 4px 4px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--fd)', fontSize: 32, fontWeight: 300,
            color: 'var(--text)', lineHeight: 1, letterSpacing: '-.01em',
          }}>
            Mis <em style={{ fontStyle: 'italic', color: 'var(--c500)' }}>metas</em>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            {active.length} activa{active.length !== 1 ? 's' : ''} · {fmt.currency(totalSaved, currency)} ahorrados
          </div>
        </div>
        <button
          onClick={openCreate}
          aria-label="Nueva meta"
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

      {/* ── Content ─────────────────────────────────────────────── */}
      {goalsLoading ? <Spinner /> : goals.length === 0 ? (
        <Empty
          icon={PiggyBank}
          title="Sin metas creadas"
          description="Define una meta de ahorro y haz seguimiento de tu progreso"
          action={<button onClick={openCreate} className="btn-primary text-xs">+ Crear meta</button>}
        />
      ) : (
        <>
          {active.map((g, i) => (
            <GoalRow
              key={g.id}
              goal={g}
              currency={currency}
              dark={i === 0}
              onEdit={openEdit}
              onDelete={setDeleting}
              onContrib={openContrib}
              onEditContrib={openEditContrib}
              onDeleteContrib={openDelContrib}
            />
          ))}

          {/* Dashed placeholder "Empieza una nueva meta" */}
          <div
            onClick={openCreate}
            style={{
              border: '2px dashed var(--border)', borderRadius: 16,
              padding: 18, display: 'flex', alignItems: 'center', gap: 12,
              color: 'var(--text-muted)', cursor: 'pointer',
              transition: 'border-color .2s, color .2s',
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'rgba(0,184,148,.1)', color: 'var(--c500)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Plus size={18} />
            </div>
            <div>
              <div style={{
                fontFamily: 'var(--fd)', fontSize: 18, fontWeight: 300,
                fontStyle: 'italic', color: 'var(--text)', lineHeight: 1.2,
              }}>
                Empieza una nueva meta
              </div>
              <div style={{ fontSize: 11, marginTop: 3 }}>Viaje, auto, casa, estudios…</div>
            </div>
          </div>

          {completed.length > 0 && (
            <>
              <div style={{
                fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '.08em',
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 4px',
              }}>
                <CheckCircle2 size={12} style={{ color: 'var(--c500)' }} />
                Completadas · {completed.length}
              </div>
              {completed.map((g) => (
                <GoalRow
                  key={g.id}
                  goal={g}
                  currency={currency}
                  onEdit={openEdit}
                  onDelete={setDeleting}
                  onContrib={openContrib}
                  onEditContrib={openEditContrib}
                  onDeleteContrib={openDelContrib}
                />
              ))}
            </>
          )}
        </>
      )}

      <UpgradeModal open={upgradeModal} onClose={() => setUpgradeModal(false)} feature="limit" />

      {/* ── Create/Edit Modal ─────────────────────────────────────── */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        eyebrow={editing ? 'Editar meta' : 'Nueva meta'}
        title="Hacia dónde ahorras"
      >
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="label">Nombre de la meta</label>
            <input className="input" type="text" placeholder="Ej: Fondo de emergencia, Viaje a Europa"
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Monto objetivo</label>
              <input className="input" type="number" step="0.01" min="1" placeholder="0.00"
                value={form.target_amount} onChange={e => setForm({ ...form, target_amount: e.target.value })} required />
            </div>
            <div>
              <label className="label">Fecha límite</label>
              <input className="input" type="date" value={form.deadline}
                onChange={e => setForm({ ...form, deadline: e.target.value })} />
            </div>
          </div>

          {accounts.length > 0 && (
            <div>
              <label className="label">Cuenta donde guardas este ahorro</label>
              <select className="input" value={form.account_id}
                onChange={e => setForm({ ...form, account_id: e.target.value })}>
                <option value="">— Sin vincular —</option>
                {accounts.filter(a => a.is_active).map(a => (
                  <option key={a.id} value={a.id}>{a.name}{a.currency ? ` (${a.currency})` : ''}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="label">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                  className={clsx('w-7 h-7 rounded-full transition-transform', form.color === c && 'ring-2 ring-offset-2 ring-[var(--border)] scale-110')}
                  style={{ background: c }} />
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={busy} className="btn-primary flex-1 justify-center">
              {busy ? 'Guardando...' : editing ? 'Actualizar' : 'Crear meta'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Contribution Modal ────────────────────────────────────── */}
      <Modal
        open={contribModal}
        onClose={() => setContribModal(false)}
        eyebrow="Aportar a meta"
        title={contribGoal?.name || ''}
      >
        <form onSubmit={saveContrib} className="space-y-4">
          <div style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--surface-2)' }}>
            <div className="flex justify-between text-xs mb-2">
              <span style={{ color: 'var(--text-muted)' }}>Ahorrado</span>
              <span style={{ fontFamily: 'var(--fm)', fontWeight: 600, color: contribGoal?.color || 'var(--c500)' }}>
                {fmt.currency(contribGoal?.current_amount, currency)}
              </span>
            </div>
            <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                width: `${Math.min(100, ((contribGoal?.current_amount || 0) / (contribGoal?.target_amount || 1)) * 100)}%`,
                height: '100%',
                background: contribGoal?.color || 'var(--c500)',
                borderRadius: 3,
              }} />
            </div>
            <div className="flex justify-between mt-1.5" style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--fm)' }}>
              <span>{((contribGoal?.current_amount || 0) / (contribGoal?.target_amount || 1) * 100).toFixed(1)}%</span>
              <span>meta: {fmt.currency(contribGoal?.target_amount, currency)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Monto del aporte</label>
              <input className="input" type="number" step="0.01" min="0.01" placeholder="0.00"
                value={contribForm.amount} onChange={e => setContribForm({ ...contribForm, amount: e.target.value })} required autoFocus />
            </div>
            <div>
              <label className="label">Fecha</label>
              <input className="input" type="date" value={contribForm.contrib_date}
                onChange={e => setContribForm({ ...contribForm, contrib_date: e.target.value })} required />
            </div>
          </div>

          <div>
            <label className="label">Cuenta origen</label>
            <select className="input" value={contribForm.account_id}
              onChange={e => setContribForm({ ...contribForm, account_id: e.target.value })}>
              <option value="">— Sin descontar de cuenta —</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Notas (opcional)</label>
            <input className="input" type="text" placeholder="Ej: Ahorro de bonificación"
              value={contribForm.notes} onChange={e => setContribForm({ ...contribForm, notes: e.target.value })} />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setContribModal(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={busy} className="btn-primary flex-1 justify-center">
              {busy ? 'Guardando...' : 'Registrar aporte'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Contribution Modal ───────────────────────────────── */}
      <Modal open={editContribModal} onClose={() => setEditContribModal(false)} title="Editar aporte">
        <form onSubmit={saveEditContrib} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Monto</label>
              <input className="input" type="number" step="0.01" min="0.01" placeholder="0.00"
                value={editContribForm.amount}
                onChange={e => setEditContribForm(f => ({ ...f, amount: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Fecha</label>
              <input className="input" type="date"
                value={editContribForm.contrib_date}
                onChange={e => setEditContribForm(f => ({ ...f, contrib_date: e.target.value }))} required />
            </div>
          </div>
          <div>
            <label className="label">Notas (opcional)</label>
            <input className="input" type="text" placeholder="Ej: Ahorro de bonificación"
              value={editContribForm.notes}
              onChange={e => setEditContribForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setEditContribModal(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={busy} className="btn-primary flex-1 justify-center">
              {busy ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </Modal>

      <Confirm
        open={!!delContrib}
        onClose={() => setDelContrib(null)}
        onConfirm={confirmDeleteContrib}
        title="Eliminar aporte"
        message={`¿Eliminar el aporte de ${delContrib ? fmt.currency(delContrib.contrib.amount, currency) : ''}? Se ajustará el total de la meta.`}
      />
      <Confirm
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Eliminar meta"
        message={`¿Eliminar la meta "${deleting?.name}"? Se perderán todos los aportes.`}
      />
    </div>
  );
}
