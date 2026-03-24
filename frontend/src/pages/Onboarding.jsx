import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, LayoutDashboard, ArrowLeftRight, Wallet,
  PiggyBank, Calendar, CreditCard, Check, ChevronRight, Plus, X,
} from 'lucide-react';
import { useStore } from '../store/index.js';
import api from '../services/api.js';

const CURRENCIES = ['USD','EUR','MXN','COP','ARS','BRL','GTQ','HNL','NIO','CRC','PEN','CLP'];
const FREQUENCIES = [
  { value: 'weekly',    label: 'Semanal' },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'monthly',  label: 'Mensual' },
  { value: 'yearly',   label: 'Anual' },
];

const today = () => new Date().toISOString().split('T')[0];

// ── Step 0: Bienvenida ─────────────────────────────────────────────────────
function StepWelcome({ onNext }) {
  const features = [
    { icon: <LayoutDashboard size={18} />, title: 'Dashboard', desc: 'Resumen de ingresos, gastos y balance en tiempo real.' },
    { icon: <ArrowLeftRight size={18} />, title: 'Transacciones', desc: 'Registra y categoriza cada movimiento.' },
    { icon: <Wallet size={18} />,         title: 'Deudas', desc: 'Controla tus deudas con proyección de pagos.' },
    { icon: <PiggyBank size={18} />,      title: 'Metas de ahorro', desc: 'Define objetivos y sigue tu progreso.' },
    { icon: <Calendar size={18} />,       title: 'Planificación', desc: 'Visualiza tus gastos e ingresos futuros.' },
    { icon: <CreditCard size={18} />,     title: 'Tarjetas de crédito', desc: 'Gestiona saldos, fechas de corte y pagos.' },
  ];
  return (
    <div className="flex flex-col items-center text-center gap-6">
      <div className="w-16 h-16 rounded-3xl bg-brand-500 flex items-center justify-center">
        <TrendingUp size={32} className="text-white" />
      </div>
      <div>
        <h1 className="text-display font-bold text-2xl">Bienvenido a FinTrack</h1>
        <p className="text-[var(--text-muted)] mt-1 text-sm">Tu asistente de finanzas personales</p>
      </div>
      <div className="w-full grid grid-cols-1 gap-2 text-left">
        {features.map((f) => (
          <div key={f.title} className="flex items-start gap-3 p-3 rounded-xl bg-[var(--surface-2)]">
            <span className="text-brand-500 mt-0.5 shrink-0">{f.icon}</span>
            <div>
              <p className="text-sm font-medium text-[var(--text)]">{f.title}</p>
              <p className="text-xs text-[var(--text-muted)]">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <button onClick={onNext} className="btn-primary w-full justify-center py-2.5">
        Comenzar configuración <ChevronRight size={16} />
      </button>
    </div>
  );
}

// ── Step 1: Perfil ─────────────────────────────────────────────────────────
function StepProfile({ user, onNext }) {
  const setUser = useStore((s) => s.setUser);
  const [form, setForm] = useState({ name: user?.name || '', currency: user?.currency || 'USD' });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.put('/auth/profile', { name: form.name, currency: form.currency, dark_mode: 0 });
      setUser({ ...user, name: form.name, currency: form.currency });
      onNext();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <h2 className="text-display font-bold text-lg">Tu perfil</h2>
        <p className="text-[var(--text-muted)] text-sm mt-1">¿Cómo quieres que te llamemos y en qué moneda trabajas?</p>
      </div>
      <div>
        <label className="label">Nombre</label>
        <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </div>
      <div>
        <label className="label">Moneda principal</label>
        <select className="input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
          {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <button type="submit" disabled={busy} className="btn-primary w-full justify-center py-2.5">
        {busy ? 'Guardando...' : 'Siguiente'}
      </button>
    </form>
  );
}

// ── Step 2: Ingresos recurrentes ───────────────────────────────────────────
function StepIncome({ onNext }) {
  const [categories, setCategories] = useState([]);
  const [added, setAdded] = useState([]);
  const [form, setForm] = useState({ category_id: '', description: '', amount: '', frequency: 'monthly', start_date: today() });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/categories').then(({ data }) => {
      setCategories(data.filter((c) => c.type === 'income'));
    });
  }, []);

  useEffect(() => {
    if (categories.length && !form.category_id) {
      setForm((f) => ({ ...f, category_id: String(categories[0].id) }));
    }
  }, [categories]);

  const add = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post('/recurring', {
        category_id: Number(form.category_id),
        type: 'income',
        description: form.description,
        amount: Number(form.amount),
        frequency: form.frequency,
        start_date: form.start_date,
        next_date: form.start_date,
      });
      const cat = categories.find((c) => c.id === data.category_id);
      setAdded((prev) => [...prev, { ...data, category_name: cat?.name }]);
      setForm((f) => ({ ...f, description: '', amount: '' }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-display font-bold text-lg">Ingresos recurrentes</h2>
        <p className="text-[var(--text-muted)] text-sm mt-1">Agrega tu salario u otros ingresos periódicos.</p>
      </div>

      <form onSubmit={add} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Categoría</label>
            <select className="input" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="label">Descripción</label>
            <input className="input" placeholder="Ej: Salario empresa" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          </div>
          <div>
            <label className="label">Monto</label>
            <input className="input" type="number" min="0.01" step="0.01" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          </div>
          <div>
            <label className="label">Frecuencia</label>
            <select className="input" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
              {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="label">Fecha de inicio</label>
            <input className="input" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
          </div>
        </div>
        <button type="submit" disabled={busy} className="btn-primary justify-center py-2">
          <Plus size={15} /> {busy ? 'Agregando...' : 'Agregar ingreso'}
        </button>
      </form>

      {added.length > 0 && (
        <ul className="flex flex-col gap-1">
          {added.map((item) => (
            <li key={item.id} className="flex items-center gap-2 text-sm p-2 rounded-xl bg-[var(--surface-2)]">
              <Check size={14} className="text-emerald-500 shrink-0" />
              <span className="flex-1 text-[var(--text)]">{item.description}</span>
              <span className="text-[var(--text-muted)]">{FREQUENCIES.find((f) => f.value === item.frequency)?.label}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2 mt-1">
        {added.length === 0 && (
          <button type="button" onClick={onNext} className="flex-1 py-2 rounded-xl border border-[var(--border)] text-[var(--text-muted)] text-sm hover:bg-[var(--surface-2)] transition-colors">
            Omitir por ahora
          </button>
        )}
        {added.length > 0 && (
          <button type="button" onClick={onNext} className="btn-primary flex-1 justify-center py-2.5">
            Siguiente
          </button>
        )}
      </div>
    </div>
  );
}

// ── Step 3: Deudas ─────────────────────────────────────────────────────────
function StepDebts({ onNext }) {
  const [added, setAdded] = useState([]);
  const [form, setForm] = useState({ name: '', initial_balance: '', annual_rate: '', monthly_payment: '', payment_day: '1', start_date: today() });
  const [busy, setBusy] = useState(false);

  const add = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post('/debts', {
        name: form.name,
        initial_balance: Number(form.initial_balance),
        annual_rate: Number(form.annual_rate),
        monthly_payment: Number(form.monthly_payment),
        payment_day: Number(form.payment_day),
        start_date: form.start_date,
      });
      setAdded((prev) => [...prev, data]);
      setForm((f) => ({ ...f, name: '', initial_balance: '', annual_rate: '', monthly_payment: '' }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-display font-bold text-lg">Tus deudas</h2>
        <p className="text-[var(--text-muted)] text-sm mt-1">Agrega préstamos, tarjetas o cualquier deuda activa.</p>
      </div>

      <form onSubmit={add} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Nombre de la deuda</label>
            <input className="input" placeholder="Ej: Préstamo banco" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Saldo actual</label>
            <input className="input" type="number" min="0" step="0.01" placeholder="0.00" value={form.initial_balance} onChange={(e) => setForm({ ...form, initial_balance: e.target.value })} required />
          </div>
          <div>
            <label className="label">Tasa anual (%)</label>
            <input className="input" type="number" min="0" step="0.01" placeholder="0.00" value={form.annual_rate} onChange={(e) => setForm({ ...form, annual_rate: e.target.value })} required />
          </div>
          <div>
            <label className="label">Pago mensual</label>
            <input className="input" type="number" min="0" step="0.01" placeholder="0.00" value={form.monthly_payment} onChange={(e) => setForm({ ...form, monthly_payment: e.target.value })} required />
          </div>
          <div>
            <label className="label">Día de pago</label>
            <input className="input" type="number" min="1" max="31" value={form.payment_day} onChange={(e) => setForm({ ...form, payment_day: e.target.value })} required />
          </div>
          <div className="col-span-2">
            <label className="label">Fecha de inicio</label>
            <input className="input" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
          </div>
        </div>
        <button type="submit" disabled={busy} className="btn-primary justify-center py-2">
          <Plus size={15} /> {busy ? 'Agregando...' : 'Agregar deuda'}
        </button>
      </form>

      {added.length > 0 && (
        <ul className="flex flex-col gap-1">
          {added.map((item) => (
            <li key={item.id} className="flex items-center gap-2 text-sm p-2 rounded-xl bg-[var(--surface-2)]">
              <Check size={14} className="text-emerald-500 shrink-0" />
              <span className="flex-1 text-[var(--text)]">{item.name}</span>
              <span className="text-[var(--text-muted)]">${Number(item.initial_balance).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2 mt-1">
        <button type="button" onClick={onNext} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${added.length > 0 ? 'btn-primary justify-center' : 'border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-2)]'}`}>
          {added.length > 0 ? 'Siguiente' : 'Omitir por ahora'}
        </button>
      </div>
    </div>
  );
}

// ── Step 4: Metas de ahorro ────────────────────────────────────────────────
function StepSavings({ onNext }) {
  const [added, setAdded] = useState([]);
  const [form, setForm] = useState({ name: '', target_amount: '', deadline: '' });
  const [busy, setBusy] = useState(false);

  const add = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post('/savings', {
        name: form.name,
        target_amount: Number(form.target_amount),
        deadline: form.deadline || null,
      });
      setAdded((prev) => [...prev, data]);
      setForm({ name: '', target_amount: '', deadline: '' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-display font-bold text-lg">Metas de ahorro</h2>
        <p className="text-[var(--text-muted)] text-sm mt-1">Define objetivos financieros y rastrea tu progreso.</p>
      </div>

      <form onSubmit={add} className="flex flex-col gap-3">
        <div>
          <label className="label">Nombre de la meta</label>
          <input className="input" placeholder="Ej: Fondo de emergencia" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Monto objetivo</label>
            <input className="input" type="number" min="0" step="0.01" placeholder="0.00" value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} required />
          </div>
          <div>
            <label className="label">Fecha límite (opcional)</label>
            <input className="input" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </div>
        </div>
        <button type="submit" disabled={busy} className="btn-primary justify-center py-2">
          <Plus size={15} /> {busy ? 'Agregando...' : 'Agregar meta'}
        </button>
      </form>

      {added.length > 0 && (
        <ul className="flex flex-col gap-1">
          {added.map((item) => (
            <li key={item.id} className="flex items-center gap-2 text-sm p-2 rounded-xl bg-[var(--surface-2)]">
              <Check size={14} className="text-emerald-500 shrink-0" />
              <span className="flex-1 text-[var(--text)]">{item.name}</span>
              <span className="text-[var(--text-muted)]">${Number(item.target_amount).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}

      <button type="button" onClick={onNext} className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors mt-1 ${added.length > 0 ? 'btn-primary justify-center' : 'border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-2)]'}`}>
        {added.length > 0 ? 'Siguiente' : 'Omitir por ahora'}
      </button>
    </div>
  );
}

// ── Step 5: Tarjetas de crédito ────────────────────────────────────────────
function StepCards({ onNext }) {
  const [added, setAdded] = useState([]);
  const [form, setForm] = useState({ name: '', last_four: '', credit_limit: '', billing_day: '1', due_day: '15' });
  const [busy, setBusy] = useState(false);

  const add = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post('/credit-cards', {
        name: form.name,
        last_four: form.last_four,
        credit_limit: Number(form.credit_limit),
        billing_day: Number(form.billing_day),
        due_day: Number(form.due_day),
      });
      setAdded((prev) => [...prev, data]);
      setForm({ name: '', last_four: '', credit_limit: '', billing_day: '1', due_day: '15' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-display font-bold text-lg">Tarjetas de crédito</h2>
        <p className="text-[var(--text-muted)] text-sm mt-1">Opcional — puedes agregarlas después desde el menú.</p>
      </div>

      <form onSubmit={add} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Nombre / banco</label>
            <input className="input" placeholder="Ej: Visa Banco Nacional" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Últimos 4 dígitos</label>
            <input className="input" maxLength={4} pattern="\d{4}" placeholder="1234" value={form.last_four} onChange={(e) => setForm({ ...form, last_four: e.target.value })} required />
          </div>
          <div>
            <label className="label">Límite de crédito</label>
            <input className="input" type="number" min="0" step="0.01" placeholder="0.00" value={form.credit_limit} onChange={(e) => setForm({ ...form, credit_limit: e.target.value })} required />
          </div>
          <div>
            <label className="label">Día de corte</label>
            <input className="input" type="number" min="1" max="31" value={form.billing_day} onChange={(e) => setForm({ ...form, billing_day: e.target.value })} required />
          </div>
          <div>
            <label className="label">Día de pago</label>
            <input className="input" type="number" min="1" max="31" value={form.due_day} onChange={(e) => setForm({ ...form, due_day: e.target.value })} required />
          </div>
        </div>
        <button type="submit" disabled={busy} className="btn-primary justify-center py-2">
          <Plus size={15} /> {busy ? 'Agregando...' : 'Agregar tarjeta'}
        </button>
      </form>

      {added.length > 0 && (
        <ul className="flex flex-col gap-1">
          {added.map((item) => (
            <li key={item.id} className="flex items-center gap-2 text-sm p-2 rounded-xl bg-[var(--surface-2)]">
              <Check size={14} className="text-emerald-500 shrink-0" />
              <span className="flex-1 text-[var(--text)]">{item.name}</span>
              <span className="text-[var(--text-muted)]">••{item.last_four}</span>
            </li>
          ))}
        </ul>
      )}

      <button type="button" onClick={onNext} className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors mt-1 ${added.length > 0 ? 'btn-primary justify-center' : 'border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-2)]'}`}>
        {added.length > 0 ? 'Siguiente' : 'Omitir por ahora'}
      </button>
    </div>
  );
}

// ── Step 6: ¡Listo! ────────────────────────────────────────────────────────
function StepDone({ onFinish, busy }) {
  return (
    <div className="flex flex-col items-center text-center gap-6">
      <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
        <Check size={40} className="text-emerald-500" />
      </div>
      <div>
        <h2 className="text-display font-bold text-2xl">¡Todo listo!</h2>
        <p className="text-[var(--text-muted)] text-sm mt-2 max-w-xs mx-auto">
          Tu cuenta está configurada. Puedes ajustar cualquier detalle en cualquier momento desde el menú.
        </p>
      </div>
      <button onClick={onFinish} disabled={busy} className="btn-primary w-full justify-center py-2.5">
        {busy ? 'Cargando...' : 'Ir al dashboard'}
      </button>
    </div>
  );
}

// ── Wizard principal ───────────────────────────────────────────────────────
const STEP_LABELS = ['Perfil', 'Ingresos', 'Deudas', 'Metas', 'Tarjetas'];

export default function Onboarding() {
  const user             = useStore((s) => s.user);
  const completeOnboarding = useStore((s) => s.completeOnboarding);
  const navigate         = useNavigate();
  const [step, setStep]  = useState(0);
  const [busy, setBusy]  = useState(false);

  const next = () => setStep((s) => s + 1);

  const finish = async () => {
    setBusy(true);
    try {
      await completeOnboarding();
      navigate('/');
    } finally {
      setBusy(false);
    }
  };

  const showProgress = step >= 1 && step <= 5;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4 py-8">
      <div className="w-full max-w-md animate-fade-up">

        {/* Progress dots */}
        {showProgress && (
          <div className="flex items-center justify-center gap-2 mb-6">
            {STEP_LABELS.map((label, i) => {
              const dotStep = i + 1;
              const active  = dotStep === step;
              const done    = dotStep < step;
              return (
                <div key={label} className="flex flex-col items-center gap-1">
                  <div className={`w-2.5 h-2.5 rounded-full transition-all ${done ? 'bg-emerald-500' : active ? 'bg-brand-500 scale-125' : 'bg-[var(--border)]'}`} />
                  <span className={`text-[10px] ${active ? 'text-brand-500 font-medium' : 'text-[var(--text-muted)]'}`}>{label}</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="card">
          {step === 0 && <StepWelcome onNext={next} />}
          {step === 1 && <StepProfile user={user} onNext={next} />}
          {step === 2 && <StepIncome onNext={next} />}
          {step === 3 && <StepDebts onNext={next} />}
          {step === 4 && <StepSavings onNext={next} />}
          {step === 5 && <StepCards onNext={next} />}
          {step === 6 && <StepDone onFinish={finish} busy={busy} />}
        </div>

      </div>
    </div>
  );
}
