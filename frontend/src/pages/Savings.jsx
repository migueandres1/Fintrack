import { useEffect, useState, useRef } from 'react';
import { Plus, Pencil, Trash2, PiggyBank, CheckCircle2 } from 'lucide-react';
import { useStore }  from '../store/index.js';
import { fmt, localDate } from '../utils/format.js';
import { Modal, Confirm, ProgressBar, Empty, Spinner } from '../components/ui/index.jsx';
import api           from '../services/api.js';
import clsx          from 'clsx';

const COLORS  = ['#6366f1','#22c55e','#f59e0b','#3b82f6','#ec4899','#14b8a6','#f97316','#8b5cf6'];
const ICONS   = ['piggy-bank','shield','plane','laptop','home','car','heart','star','gift','book'];

const EMPTY_GOAL = {
  name: '', target_amount: '', deadline: '', icon: 'piggy-bank', color: '#6366f1',
};
const EMPTY_CONTRIB = {
  amount: '', contrib_date: localDate(), notes: '',
};

function GoalCard({ goal, currency, onEdit, onDelete, onContrib, onEditContrib, onDeleteContrib }) {
  const [detail,   setDetail]   = useState(null);
  const [expanded, setExpanded] = useState(false);

  const pct        = Math.min(100, (goal.current_amount / goal.target_amount) * 100);
  const remaining  = Math.max(0, goal.target_amount - goal.current_amount);
  const daysLeft   = goal.deadline ? fmt.daysUntil(goal.deadline) : null;

  // Months remaining using real calendar months
  const monthsLeft = (() => {
    if (!goal.deadline) return null;
    const now = new Date();
    const t   = new Date(String(goal.deadline).split('T')[0] + 'T00:00:00');
    return Math.max(1, (t.getFullYear() - now.getFullYear()) * 12 + (t.getMonth() - now.getMonth()));
  })();
  const neededPerMonth = monthsLeft ? (remaining / monthsLeft).toFixed(2) : null;

  const loadDetail = async (force = false) => {
    if (force || (!expanded && !detail)) {
      const { data } = await api.get(`/savings/${goal.id}`);
      setDetail(data);
    }
    if (!force) setExpanded(!expanded);
  };

  const refreshDetail = () => loadDetail(true);

  return (
    <div className={clsx('card transition-all', goal.is_completed && 'ring-1 ring-green-500/40')}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
            style={{ background: `${goal.color}20`, color: goal.color }}>
            🎯
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-sm">{goal.name}</h3>
              {goal.is_completed && <CheckCircle2 size={14} className="text-green-500" />}
            </div>
            {goal.deadline && (
              <p className="text-xs text-[var(--text-muted)]">
                {fmt.date(goal.deadline)}
                {daysLeft !== null && (
                  <span className={clsx('ml-1', daysLeft < 30 ? 'text-rose-500' : daysLeft < 90 ? 'text-amber-500' : '')}>
                    ({daysLeft > 0 ? `${daysLeft} días` : 'Vencida'})
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          {!goal.is_completed && (
            <button onClick={() => onContrib(goal)}
              className="px-2 py-1 rounded-lg text-xs font-medium bg-brand-500/10 text-brand-500 hover:bg-brand-500/20 transition-colors">
              + Aporte
            </button>
          )}
          <button onClick={() => onEdit(goal)} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700">
            <Pencil size={13} className="text-[var(--text-muted)]" />
          </button>
          <button onClick={() => onDelete(goal)} className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20">
            <Trash2 size={13} className="text-rose-400" />
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-mono font-semibold">{fmt.currency(goal.current_amount, currency)}</span>
          <span className="text-[var(--text-muted)]">de {fmt.currency(goal.target_amount, currency)}</span>
        </div>
        <ProgressBar value={goal.current_amount} max={goal.target_amount} color={goal.color} />
        <div className="flex justify-between text-xs mt-1">
          <span className="text-[var(--text-muted)]">{pct.toFixed(1)}% completado</span>
          {!goal.is_completed && <span className="text-[var(--text-muted)]">Faltan {fmt.currency(remaining, currency)}</span>}
        </div>
      </div>

      {/* Projection: semanal / quincenal / mensual */}
      {!goal.is_completed && neededPerMonth && (
        <div className="p-2.5 rounded-lg bg-surface-50 dark:bg-surface-800 text-xs">
          <p className="text-[var(--text-muted)] mb-2">Ahorro necesario para llegar a tiempo:</p>
          <div className="grid grid-cols-3 gap-1 text-center">
            {[
              { label: 'Semanal',    value: (neededPerMonth / 4.33).toFixed(2) },
              { label: 'Quincenal', value: (neededPerMonth / 2).toFixed(2) },
              { label: 'Mensual',   value: neededPerMonth },
            ].map(({ label, value }) => (
              <div key={label} className="p-1.5 rounded-lg bg-[var(--bg)]">
                <p className="text-[10px] text-[var(--text-muted)]">{label}</p>
                <p className="font-semibold text-mono" style={{ color: goal.color }}>
                  {fmt.currency(value, currency)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contribution history toggle */}
      <button
        onClick={loadDetail}
        className="mt-3 w-full text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
      >
        {expanded ? '↑ Ocultar historial' : '↓ Ver historial de aportes'}
      </button>

      {expanded && detail?.contributions?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[var(--border)] animate-fade-up">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[var(--text-muted)] border-b border-[var(--border)]">
                  <th className="text-left py-1.5">Fecha</th>
                  <th className="text-right py-1.5">Monto</th>
                  <th className="text-left py-1.5 pl-3">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {detail.contributions.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50 group">
                    <td className="py-1.5">{fmt.date(c.contrib_date)}</td>
                    <td className="text-right font-semibold text-mono" style={{ color: goal.color }}>
                      +{fmt.currency(c.amount, currency)}
                    </td>
                    <td className="pl-3 text-[var(--text-muted)]">{c.notes || '—'}</td>
                    <td className="pl-2 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onEditContrib(c, goal.id, refreshDetail)}
                          className="p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-700">
                          <Pencil size={11} className="text-[var(--text-muted)]" />
                        </button>
                        <button
                          onClick={() => onDeleteContrib(c, goal.id, refreshDetail)}
                          className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20">
                          <Trash2 size={11} className="text-rose-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {expanded && detail?.contributions?.length === 0 && (
        <p className="text-xs text-[var(--text-muted)] mt-3 text-center">Sin aportes aún</p>
      )}
    </div>
  );
}

const EMPTY_EDIT_CONTRIB = { amount: '', contrib_date: localDate(), notes: '' };

export default function Savings() {
  const { goals, goalsLoading, fetchGoals, createGoal, updateGoal, deleteGoal, addContribution, user } = useStore();
  const currency = user?.currency || 'USD';

  const [modal,            setModal]           = useState(false);
  const [contribModal,     setContribModal]     = useState(false);
  const [editContribModal, setEditContribModal] = useState(false);
  const [delContrib,       setDelContrib]       = useState(null); // { contrib, goalId, refresh }
  const [editing,          setEditing]          = useState(null);
  const [deleting,         setDeleting]         = useState(null);
  const [contribGoal,      setContribGoal]      = useState(null);
  const [form,             setForm]             = useState(EMPTY_GOAL);
  const [contribForm,      setContribForm]      = useState(EMPTY_CONTRIB);
  const [editContribData,  setEditContribData]  = useState(null); // { contrib, goalId, refresh }
  const [editContribForm,  setEditContribForm]  = useState(EMPTY_EDIT_CONTRIB);
  const [busy,             setBusy]             = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => { fetchGoals(); }, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY_GOAL); setModal(true); };
  const openEdit   = (g) => {
    setEditing(g);
    setForm({ name: g.name, target_amount: g.target_amount, deadline: g.deadline || '', icon: g.icon, color: g.color });
    setModal(true);
  };
  const openContrib = (g) => { setContribGoal(g); setContribForm(EMPTY_CONTRIB); setContribModal(true); };

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
    setContribModal(false); // close immediately to prevent double clicks
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
  const totalSaved = goals.reduce((s, g) => s + (g.current_amount || 0), 0);

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display font-bold text-xl">Metas de ahorro</h1>
          <p className="text-[var(--text-muted)] text-sm">{goals.length} meta{goals.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus size={15} /> Nueva meta</button>
      </div>

      {/* Summary */}
      {goals.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="card">
            <p className="text-xs text-[var(--text-muted)] mb-1">Total ahorrado</p>
            <p className="text-display font-bold text-lg text-mono text-green-500">{fmt.currency(totalSaved, currency)}</p>
          </div>
          <div className="card">
            <p className="text-xs text-[var(--text-muted)] mb-1">Metas activas</p>
            <p className="text-display font-bold text-lg">{active.length}</p>
          </div>
          <div className="card">
            <p className="text-xs text-[var(--text-muted)] mb-1">Completadas</p>
            <p className="text-display font-bold text-lg text-green-500">{completed.length}</p>
          </div>
        </div>
      )}

      {/* Active goals */}
      {goalsLoading ? <Spinner /> : goals.length === 0 ? (
        <Empty icon={PiggyBank} title="Sin metas creadas"
          description="Define una meta de ahorro y haz seguimiento de tu progreso"
          action={<button onClick={openCreate} className="btn-primary text-xs">+ Crear meta</button>}
        />
      ) : (
        <>
          {active.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {active.map((g) => (
                <GoalCard key={g.id} goal={g} currency={currency}
                  onEdit={openEdit} onDelete={setDeleting} onContrib={openContrib}
                  onEditContrib={openEditContrib} onDeleteContrib={openDelContrib} />
              ))}
            </div>
          )}
          {completed.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-muted)] mb-3 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-green-500" /> Completadas
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {completed.map((g) => (
                  <GoalCard key={g.id} goal={g} currency={currency}
                    onEdit={openEdit} onDelete={setDeleting} onContrib={openContrib}
                    onEditContrib={openEditContrib} onDeleteContrib={openDelContrib} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar meta' : 'Nueva meta de ahorro'}>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="label">Nombre de la meta</label>
            <input className="input" type="text" placeholder="Ej: Fondo de emergencia, Viaje a Europa"
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
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

          {/* Color picker */}
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
            <button type="button" onClick={() => setModal(false)} className="btn-ghost flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={busy} className="btn-primary flex-1 justify-center">
              {busy ? 'Guardando...' : editing ? 'Actualizar' : 'Crear meta'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Contribution Modal */}
      <Modal open={contribModal} onClose={() => setContribModal(false)} title={`Aporte – ${contribGoal?.name}`}>
        <form onSubmit={saveContrib} className="space-y-4">
          <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800 text-xs">
            <div className="flex justify-between mb-1">
              <span className="text-[var(--text-muted)]">Ahorrado</span>
              <span className="font-semibold text-mono" style={{ color: contribGoal?.color }}>
                {fmt.currency(contribGoal?.current_amount, currency)}
              </span>
            </div>
            <ProgressBar value={contribGoal?.current_amount || 0} max={contribGoal?.target_amount || 1} color={contribGoal?.color} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Monto del aporte</label>
              <input className="input" type="number" step="0.01" min="0.01" placeholder="0.00"
                value={contribForm.amount} onChange={e => setContribForm({ ...contribForm, amount: e.target.value })} required />
            </div>
            <div>
              <label className="label">Fecha</label>
              <input className="input" type="date" value={contribForm.contrib_date}
                onChange={e => setContribForm({ ...contribForm, contrib_date: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="label">Notas (opcional)</label>
            <input className="input" type="text" placeholder="Ej: Ahorro de bonificación"
              value={contribForm.notes} onChange={e => setContribForm({ ...contribForm, notes: e.target.value })} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setContribModal(false)} className="btn-ghost flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={busy} className="btn-primary flex-1 justify-center">
              {busy ? 'Guardando...' : 'Registrar aporte'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit contribution modal */}
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
            <button type="button" onClick={() => setEditContribModal(false)} className="btn-ghost flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={busy} className="btn-primary flex-1 justify-center">
              {busy ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete contribution confirm */}
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
