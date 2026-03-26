import { useEffect, useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { useStore } from '../store/index.js';
import { Modal, Confirm, Spinner, Empty } from '../components/ui/index.jsx';
import clsx from 'clsx';

const TYPE_LABELS = { income: 'Ingreso', expense: 'Gasto' };

// Lucide icon names available for custom categories
const ICON_NAMES = [
  'briefcase','laptop','trending-up','plus-circle','utensils','car','home',
  'heart-pulse','graduation-cap','gamepad','shirt','zap','more-horizontal',
  'piggy-bank','send','shopping-cart','coffee','plane','book','dumbbell',
  'music','smartphone','droplets','gift','landmark','wallet','bar-chart-2',
  'wrench','pizza','star','sun','moon','camera','map-pin','tag',
];

const COLORS = [
  '#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6',
  '#ec4899','#14b8a6','#f97316','#84cc16','#06b6d4','#a855f7',
];

const DEFAULT_FORM = { name: '', type: 'expense', icon: 'tag', color: '#6366f1' };

// Convert dash-case lucide name → PascalCase component
function toPascal(name) {
  return name.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
}

function LucideIcon({ name, size = 18, className, style }) {
  const pascal = toPascal(name || 'tag');
  const Icon = LucideIcons[pascal] || LucideIcons['Tag'];
  return <Icon size={size} className={className} style={style} />;
}

function CategoryForm({ form, setForm }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="label">Nombre</label>
        <input className="input" type="text" placeholder="Ej: Gimnasio"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      </div>

      <div>
        <label className="label">Tipo</label>
        <div className="grid grid-cols-2 gap-2">
          {['expense', 'income'].map(t => (
            <button key={t} type="button"
              onClick={() => setForm(f => ({ ...f, type: t }))}
              className={clsx(
                'py-2.5 rounded-xl border text-sm font-medium transition-all',
                form.type === t
                  ? 'border-brand-500 bg-brand-500/10 text-brand-500'
                  : 'border-[var(--border)] text-[var(--text-muted)]'
              )}>
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Ícono</label>
        <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] max-h-36 overflow-y-auto">
          {ICON_NAMES.map(ico => (
            <button key={ico} type="button"
              onClick={() => setForm(f => ({ ...f, icon: ico }))}
              className={clsx(
                'w-9 h-9 rounded-lg flex items-center justify-center transition-all',
                form.icon === ico
                  ? 'ring-2 ring-brand-500 bg-brand-500/10 text-brand-500'
                  : 'text-[var(--text-muted)] hover:bg-surface-100 dark:hover:bg-surface-700'
              )}>
              <LucideIcon name={ico} size={16} />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Color</label>
        <div className="flex flex-wrap gap-2">
          {COLORS.map(col => (
            <button key={col} type="button"
              onClick={() => setForm(f => ({ ...f, color: col }))}
              style={{ background: col }}
              className={clsx(
                'w-7 h-7 rounded-full transition-all',
                form.color === col ? 'ring-2 ring-offset-2 ring-brand-500' : ''
              )} />
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
        <span
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: (form.color || '#6366f1') + '22' }}>
          <LucideIcon name={form.icon} size={16} style={{ color: form.color }} />
        </span>
        <div>
          <p className="text-sm font-medium" style={{ color: form.color }}>{form.name || 'Sin nombre'}</p>
          <p className="text-xs text-[var(--text-muted)]">{TYPE_LABELS[form.type]}</p>
        </div>
      </div>
    </div>
  );
}

export default function Categories() {
  const {
    allCategories, catsLoading,
    fetchAllCategories, createCategory, updateCategory, deleteCategory,
    hideCategory, unhideCategory,
  } = useStore();

  const [modal,   setModal]   = useState(false);
  const [editCat, setEditCat] = useState(null);
  const [delCat,  setDelCat]  = useState(null);
  const [form,    setForm]    = useState(DEFAULT_FORM);
  const [busy,    setBusy]    = useState(false);
  const [filter,  setFilter]  = useState('all');

  useEffect(() => { fetchAllCategories(); }, []);

  const openCreate = () => {
    setForm(DEFAULT_FORM);
    setEditCat(null);
    setModal('create');
  };

  const openEdit = (cat) => {
    setForm({ name: cat.name, type: cat.type, icon: cat.icon, color: cat.color });
    setEditCat(cat);
    setModal('edit');
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setBusy(true);
    try {
      if (modal === 'edit') await updateCategory(editCat.id, form);
      else await createCategory(form);
      setModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!delCat) return;
    setBusy(true);
    try {
      await deleteCategory(delCat.id);
      setDelCat(null);
    } finally {
      setBusy(false);
    }
  };

  const toggleHide = async (cat) => {
    try {
      if (cat.is_hidden) await unhideCategory(cat.id);
      else await hideCategory(cat.id);
    } catch (err) { console.error(err); }
  };

  const filtered = allCategories.filter(c => filter === 'all' || c.type === filter);
  const income  = filtered.filter(c => c.type === 'income');
  const expense = filtered.filter(c => c.type === 'expense');

  if (catsLoading && !allCategories.length) return <Spinner />;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-display font-bold text-xl">Categorías</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Personaliza las categorías que aparecen en tus transacciones
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary gap-2 shrink-0">
          <LucideIcons.Plus size={15} /> Nueva
        </button>
      </div>

      <div className="flex gap-2">
        {[['all','Todas'],['expense','Gastos'],['income','Ingresos']].map(([v, l]) => (
          <button key={v} type="button" onClick={() => setFilter(v)}
            className={clsx(
              'px-3 py-1.5 rounded-xl text-xs font-medium border transition-all',
              filter === v
                ? 'border-brand-500 bg-brand-500/10 text-brand-500'
                : 'border-[var(--border)] text-[var(--text-muted)]'
            )}>
            {l}
          </button>
        ))}
      </div>

      {allCategories.length === 0 ? (
        <Empty icon={LucideIcons.Tags} title="Sin categorías" description="Crea tu primera categoría personalizada" />
      ) : (
        <div className="space-y-6">
          {[['expense','Gastos',expense],['income','Ingresos',income]].map(([type, label, list]) => {
            if ((filter !== 'all' && filter !== type) || list.length === 0) return null;
            return (
              <div key={type}>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">{label}</h2>
                <div className="space-y-2">
                  {list.map(cat => (
                    <div key={cat.id}
                      className={clsx(
                        'card flex items-center gap-3 py-3 px-4 transition-opacity',
                        cat.is_hidden && 'opacity-50'
                      )}>
                      <span
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: (cat.color || '#6366f1') + '22' }}>
                        <LucideIcon name={cat.icon} size={16} style={{ color: cat.color || '#6366f1' }} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{cat.name}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {cat.source === 'default' ? 'Predeterminada' : 'Personalizada'}
                          {cat.is_hidden ? ' · Oculta' : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {cat.source === 'default' && (
                          <button type="button" onClick={() => toggleHide(cat)}
                            title={cat.is_hidden ? 'Mostrar' : 'Ocultar'}
                            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
                            {cat.is_hidden
                              ? <LucideIcons.Eye size={15} />
                              : <LucideIcons.EyeOff size={15} />}
                          </button>
                        )}
                        {cat.source === 'custom' && (
                          <>
                            <button type="button" onClick={() => openEdit(cat)}
                              className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
                              <LucideIcons.Pencil size={15} />
                            </button>
                            <button type="button" onClick={() => setDelCat(cat)}
                              className="p-2 rounded-lg text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-colors">
                              <LucideIcons.Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(false)}
        title={modal === 'edit' ? 'Editar categoría' : 'Nueva categoría'}>
        <CategoryForm form={form} setForm={setForm} />
        <div className="flex gap-2 pt-4">
          <button type="button" onClick={() => setModal(false)} className="btn-ghost flex-1 justify-center">
            Cancelar
          </button>
          <button type="button" onClick={handleSave} disabled={!form.name.trim() || busy}
            className="btn-primary flex-1 justify-center">
            {busy ? 'Guardando...' : modal === 'edit' ? 'Guardar cambios' : 'Crear categoría'}
          </button>
        </div>
      </Modal>

      <Confirm
        open={!!delCat}
        onClose={() => setDelCat(null)}
        onConfirm={handleDelete}
        title="Eliminar categoría"
        message={`¿Eliminar "${delCat?.name}"? Las transacciones existentes con esta categoría no se verán afectadas.`}
      />
    </div>
  );
}
