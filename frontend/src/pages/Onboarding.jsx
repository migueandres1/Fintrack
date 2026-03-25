import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, LayoutDashboard, ArrowLeftRight, Wallet,
  PiggyBank, Calendar, CreditCard, Check, ChevronRight,
  ChevronLeft, Plus, Landmark, BarChart2,
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
const ACCOUNT_TYPES = [
  { value: 'checking',   label: 'Cuenta corriente', hint: 'Para gastos del día a día y pagos con débito' },
  { value: 'savings',    label: 'Cuenta de ahorros', hint: 'Donde guardas dinero a mediano o largo plazo' },
  { value: 'cash',       label: 'Efectivo',           hint: 'Dinero en físico que no está en ningún banco' },
  { value: 'investment', label: 'Inversión',           hint: 'Fondos, acciones u otros instrumentos financieros' },
];

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ── Hint text ──────────────────────────────────────────────────────────────
function Hint({ children }) {
  return <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">{children}</p>;
}

// ── Back button ────────────────────────────────────────────────────────────
function BackBtn({ onPrev }) {
  return (
    <button
      type="button"
      onClick={onPrev}
      className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text)] mb-4 transition-colors"
    >
      <ChevronLeft size={14} /> Paso anterior
    </button>
  );
}

// ── Added items list ───────────────────────────────────────────────────────
function AddedList({ items }) {
  if (!items.length) return null;
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-2 text-sm p-2 rounded-xl bg-[var(--surface-2)]">
          <Check size={14} className="text-emerald-500 shrink-0" />
          <span className="flex-1 text-[var(--text)]">{item._label}</span>
          <span className="text-[var(--text-muted)] text-xs">{item._sublabel}</span>
        </li>
      ))}
    </ul>
  );
}

// ── Step 0: Bienvenida ─────────────────────────────────────────────────────
function StepWelcome({ onNext }) {
  const features = [
    { icon: <LayoutDashboard size={18} />, title: 'Dashboard', desc: 'Score financiero, balance y resumen en tiempo real.' },
    { icon: <ArrowLeftRight size={18} />, title: 'Transacciones', desc: 'Registra gastos e ingresos; escanea recibos con OCR.' },
    { icon: <Landmark size={18} />,       title: 'Cuentas bancarias', desc: 'Controla el saldo de cada cuenta y tarjeta de débito.' },
    { icon: <BarChart2 size={18} />,      title: 'Presupuesto', desc: 'Establece límites de gasto por categoría cada mes.' },
    { icon: <Wallet size={18} />,         title: 'Deudas', desc: 'Proyecta pagos y visualiza cuándo estarás libre de deudas.' },
    { icon: <PiggyBank size={18} />,      title: 'Metas de ahorro', desc: 'Define objetivos y sigue tu progreso semana a semana.' },
    { icon: <CreditCard size={18} />,     title: 'Tarjetas de crédito', desc: 'Controla límites, fechas de corte y simula pagos mínimos.' },
    { icon: <Calendar size={18} />,       title: 'Recurrentes', desc: 'Automatiza ingresos y gastos periódicos.' },
  ];
  return (
    <div className="flex flex-col items-center text-center gap-6">
      <div className="w-16 h-16 rounded-3xl bg-brand-500 flex items-center justify-center">
        <TrendingUp size={32} className="text-white" />
      </div>
      <div>
        <h1 className="text-display font-bold text-2xl">Bienvenido a FinTrack</h1>
        <p className="text-[var(--text-muted)] mt-1 text-sm">
          Tu asistente de finanzas personales — configuremos tu cuenta en 6 pasos rápidos.
        </p>
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
function StepProfile({ user, onNext, onPrev }) {
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
      <BackBtn onPrev={onPrev} />
      <div>
        <h2 className="text-display font-bold text-lg">Tu perfil</h2>
        <p className="text-[var(--text-muted)] text-sm mt-1">
          Empecemos con lo básico: cómo te llamamos y en qué moneda llevas tus finanzas.
        </p>
      </div>
      <div>
        <label className="label">Nombre</label>
        <input
          className="input"
          placeholder="Tu nombre o apodo"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <Hint>Así te saludaremos dentro de la app. Puede ser tu nombre completo o solo el primero.</Hint>
      </div>
      <div>
        <label className="label">Moneda principal</label>
        <select className="input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
          {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <Hint>
          Todos los montos se mostrarán en esta moneda. Elige la moneda en la que recibes tu ingreso
          principal (p. ej. USD si cobras en dólares, GTQ si cobras en quetzales).
        </Hint>
      </div>
      <button type="submit" disabled={busy} className="btn-primary w-full justify-center py-2.5">
        {busy ? 'Guardando...' : <>Siguiente <ChevronRight size={15} /></>}
      </button>
    </form>
  );
}

// ── Step 2: Cuentas bancarias ──────────────────────────────────────────────
function StepAccounts({ onNext, onPrev }) {
  const [added, setAdded] = useState([]);
  const [form, setForm] = useState({ name: '', type: 'checking', initial_balance: '', currency: 'USD', color: '#6366f1' });
  const [busy, setBusy] = useState(false);

  const selectedType = ACCOUNT_TYPES.find((t) => t.value === form.type);

  const add = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post('/accounts', {
        name: form.name,
        type: form.type,
        initial_balance: Number(form.initial_balance) || 0,
        currency: form.currency,
        color: form.color,
      });
      setAdded((prev) => [
        ...prev,
        { ...data, _label: form.name, _sublabel: `${selectedType?.label} · ${form.currency} ${Number(form.initial_balance || 0).toLocaleString()}` },
      ]);
      setForm((f) => ({ ...f, name: '', initial_balance: '' }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <BackBtn onPrev={onPrev} />
      <div>
        <h2 className="text-display font-bold text-lg">Cuentas bancarias</h2>
        <p className="text-[var(--text-muted)] text-sm mt-1">
          Registra las cuentas donde tienes dinero hoy. FinTrack calculará tu balance
          automáticamente conforme registres transacciones.
        </p>
      </div>

      <form onSubmit={add} className="flex flex-col gap-3">
        <div>
          <label className="label">Nombre de la cuenta</label>
          <input
            className="input"
            placeholder="Ej: Cuenta Bancolombia, Efectivo, Cuenta nómina"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Hint>Ponle un nombre que te ayude a identificarla rápidamente, como el banco o su propósito.</Hint>
        </div>

        <div>
          <label className="label">Tipo de cuenta</label>
          <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          {selectedType && <Hint>{selectedType.hint}</Hint>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Saldo actual</label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.initial_balance}
              onChange={(e) => setForm({ ...form, initial_balance: e.target.value })}
            />
            <Hint>¿Cuánto hay en esta cuenta hoy? Puedes dejarlo en 0 si no lo sabes.</Hint>
          </div>
          <div>
            <label className="label">Moneda</label>
            <select className="input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <Hint>La moneda en que opera esta cuenta (puede ser diferente a la principal).</Hint>
          </div>
        </div>
        <div>
          <label className="label">Color</label>
          <input
            type="color"
            className="input h-10 cursor-pointer"
            value={form.color}
            onChange={(e) => setForm({ ...form, color: e.target.value })}
          />
          <Hint>Para distinguirla en el dashboard.</Hint>
        </div>

        <button type="submit" disabled={busy} className="btn-primary justify-center py-2">
          <Plus size={15} /> {busy ? 'Agregando...' : 'Agregar cuenta'}
        </button>
      </form>

      <AddedList items={added} />

      <div className="flex gap-2 mt-1">
        {added.length === 0 ? (
          <button type="button" onClick={onNext} className="flex-1 py-2 rounded-xl border border-[var(--border)] text-[var(--text-muted)] text-sm hover:bg-[var(--surface-2)] transition-colors">
            Omitir por ahora
          </button>
        ) : (
          <button type="button" onClick={onNext} className="btn-primary flex-1 justify-center py-2.5">
            Siguiente <ChevronRight size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Step 3: Ingresos recurrentes ───────────────────────────────────────────
function StepIncome({ onNext, onPrev }) {
  const [categories, setCategories] = useState([]);
  const [added, setAdded] = useState([]);
  const [form, setForm] = useState({ category_id: '', description: '', amount: '', frequency: 'monthly', start_date: today() });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/categories').then(({ data }) => setCategories(data.filter((c) => c.type === 'income')));
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
      const freqLabel = FREQUENCIES.find((f) => f.value === form.frequency)?.label;
      setAdded((prev) => [...prev, { ...data, _label: form.description, _sublabel: `${freqLabel} · ${Number(form.amount).toLocaleString()}` }]);
      setForm((f) => ({ ...f, description: '', amount: '' }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <BackBtn onPrev={onPrev} />
      <div>
        <h2 className="text-display font-bold text-lg">Ingresos recurrentes</h2>
        <p className="text-[var(--text-muted)] text-sm mt-1">
          Registra los ingresos que recibes de forma periódica. FinTrack los usará para calcular
          tu score financiero y proyectar tu balance futuro.
        </p>
      </div>

      <form onSubmit={add} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Categoría</label>
            <select className="input" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <Hint>Clasifica el ingreso: Salario, Negocio propio, Remesas, Freelance, etc.</Hint>
          </div>
          <div className="col-span-2">
            <label className="label">Descripción</label>
            <input
              className="input"
              placeholder="Ej: Salario empresa ABC, Renta local"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />
            <Hint>Un nombre corto que identifique la fuente de ingreso.</Hint>
          </div>
          <div>
            <label className="label">Monto</label>
            <input
              className="input"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
            <Hint>Importe neto que recibes (después de impuestos si aplica).</Hint>
          </div>
          <div>
            <label className="label">Frecuencia</label>
            <select className="input" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
              {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
            <Hint>¿Cada cuánto lo recibes?</Hint>
          </div>
          <div className="col-span-2">
            <label className="label">Fecha de inicio</label>
            <input
              className="input"
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              required
            />
            <Hint>Fecha en que comenzaste a recibir este ingreso (o desde cuándo quieres rastrearlo).</Hint>
          </div>
        </div>
        <button type="submit" disabled={busy} className="btn-primary justify-center py-2">
          <Plus size={15} /> {busy ? 'Agregando...' : 'Agregar ingreso'}
        </button>
      </form>

      <AddedList items={added} />

      <div className="flex gap-2 mt-1">
        {added.length === 0 ? (
          <button type="button" onClick={onNext} className="flex-1 py-2 rounded-xl border border-[var(--border)] text-[var(--text-muted)] text-sm hover:bg-[var(--surface-2)] transition-colors">
            Omitir por ahora
          </button>
        ) : (
          <button type="button" onClick={onNext} className="btn-primary flex-1 justify-center py-2.5">
            Siguiente <ChevronRight size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Step 4: Deudas ─────────────────────────────────────────────────────────
function StepDebts({ onNext, onPrev }) {
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
      setAdded((prev) => [...prev, { ...data, _label: form.name, _sublabel: `$${Number(form.initial_balance).toLocaleString()} · ${form.annual_rate}% anual` }]);
      setForm((f) => ({ ...f, name: '', initial_balance: '', annual_rate: '', monthly_payment: '' }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <BackBtn onPrev={onPrev} />
      <div>
        <h2 className="text-display font-bold text-lg">Tus deudas</h2>
        <p className="text-[var(--text-muted)] text-sm mt-1">
          Registra préstamos, créditos o cualquier deuda activa. FinTrack calculará cuándo
          terminarás de pagarla y cuánto pagas en intereses.
        </p>
      </div>

      <form onSubmit={add} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Nombre de la deuda</label>
            <input
              className="input"
              placeholder="Ej: Préstamo banco, Auto, Hipoteca"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <Hint>Un nombre descriptivo para identificar esta deuda.</Hint>
          </div>
          <div>
            <label className="label">Saldo actual</label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.initial_balance}
              onChange={(e) => setForm({ ...form, initial_balance: e.target.value })}
              required
            />
            <Hint>Lo que debes hoy, no el monto original del préstamo.</Hint>
          </div>
          <div>
            <label className="label">Tasa anual (%)</label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              placeholder="Ej: 18.5"
              value={form.annual_rate}
              onChange={(e) => setForm({ ...form, annual_rate: e.target.value })}
              required
            />
            <Hint>Tasa de interés anual (aparece en tu contrato o estado de cuenta).</Hint>
          </div>
          <div>
            <label className="label">Pago mensual</label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.monthly_payment}
              onChange={(e) => setForm({ ...form, monthly_payment: e.target.value })}
              required
            />
            <Hint>Cuánto pagas cada mes normalmente (cuota fija o lo que acostumbras pagar).</Hint>
          </div>
          <div>
            <label className="label">Día de pago</label>
            <input
              className="input"
              type="number"
              min="1"
              max="31"
              placeholder="Ej: 5"
              value={form.payment_day}
              onChange={(e) => setForm({ ...form, payment_day: e.target.value })}
              required
            />
            <Hint>Día del mes en que vence tu pago.</Hint>
          </div>
          <div className="col-span-2">
            <label className="label">Fecha de inicio del seguimiento</label>
            <input
              className="input"
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              required
            />
            <Hint>Desde cuándo quieres que FinTrack rastree esta deuda (normalmente hoy).</Hint>
          </div>
        </div>
        <button type="submit" disabled={busy} className="btn-primary justify-center py-2">
          <Plus size={15} /> {busy ? 'Agregando...' : 'Agregar deuda'}
        </button>
      </form>

      <AddedList items={added} />

      <div className="flex gap-2 mt-1">
        <button
          type="button"
          onClick={onNext}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            added.length > 0 ? 'btn-primary justify-center' : 'border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-2)]'
          }`}
        >
          {added.length > 0 ? <>Siguiente <ChevronRight size={15} /></> : 'Omitir por ahora'}
        </button>
      </div>
    </div>
  );
}

// ── Step 5: Metas de ahorro ────────────────────────────────────────────────
function StepSavings({ onNext, onPrev }) {
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
      setAdded((prev) => [...prev, { ...data, _label: form.name, _sublabel: `$${Number(form.target_amount).toLocaleString()}${form.deadline ? ` · ${form.deadline}` : ''}` }]);
      setForm({ name: '', target_amount: '', deadline: '' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <BackBtn onPrev={onPrev} />
      <div>
        <h2 className="text-display font-bold text-lg">Metas de ahorro</h2>
        <p className="text-[var(--text-muted)] text-sm mt-1">
          Define hacia dónde quieres llegar con tus ahorros. FinTrack te mostrará cuánto
          ahorrar por semana, quincena o mes para alcanzar cada meta.
        </p>
      </div>

      <form onSubmit={add} className="flex flex-col gap-3">
        <div>
          <label className="label">Nombre de la meta</label>
          <input
            className="input"
            placeholder="Ej: Fondo de emergencia, Vacaciones, Auto"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Hint>Nómbrala de forma que te motive. Las metas concretas se cumplen más fácil.</Hint>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Monto objetivo</label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.target_amount}
              onChange={(e) => setForm({ ...form, target_amount: e.target.value })}
              required
            />
            <Hint>¿Cuánto necesitas ahorrar en total para esta meta?</Hint>
          </div>
          <div>
            <label className="label">Fecha límite (opcional)</label>
            <input
              className="input"
              type="date"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            />
            <Hint>Si tienes una fecha en mente, FinTrack calculará cuánto ahorrar por período.</Hint>
          </div>
        </div>
        <button type="submit" disabled={busy} className="btn-primary justify-center py-2">
          <Plus size={15} /> {busy ? 'Agregando...' : 'Agregar meta'}
        </button>
      </form>

      <AddedList items={added} />

      <div className="flex gap-2 mt-1">
        <button
          type="button"
          onClick={onNext}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            added.length > 0 ? 'btn-primary justify-center' : 'border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-2)]'
          }`}
        >
          {added.length > 0 ? <>Siguiente <ChevronRight size={15} /></> : 'Omitir por ahora'}
        </button>
      </div>
    </div>
  );
}

// ── Step 6: Tarjetas de crédito ────────────────────────────────────────────
function StepCards({ onNext, onPrev }) {
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
      setAdded((prev) => [...prev, { ...data, _label: form.name, _sublabel: `····${form.last_four} · límite $${Number(form.credit_limit).toLocaleString()}` }]);
      setForm({ name: '', last_four: '', credit_limit: '', billing_day: '1', due_day: '15' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <BackBtn onPrev={onPrev} />
      <div>
        <h2 className="text-display font-bold text-lg">Tarjetas de crédito</h2>
        <p className="text-[var(--text-muted)] text-sm mt-1">
          Opcional — registra tus tarjetas de crédito para controlar su saldo, fecha de corte
          y simular cuándo las liquidarías pagando solo el mínimo vs. más.
        </p>
      </div>

      <form onSubmit={add} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Nombre / banco</label>
            <input
              className="input"
              placeholder="Ej: Visa Banco Nacional, Mastercard Platinum"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <Hint>El nombre del banco o el apodo con el que identificas la tarjeta.</Hint>
          </div>
          <div>
            <label className="label">Últimos 4 dígitos</label>
            <input
              className="input"
              maxLength={4}
              pattern="\d{4}"
              placeholder="1234"
              value={form.last_four}
              onChange={(e) => setForm({ ...form, last_four: e.target.value })}
              required
            />
            <Hint>Solo para identificarla; no se almacenan datos completos de la tarjeta.</Hint>
          </div>
          <div>
            <label className="label">Límite de crédito</label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.credit_limit}
              onChange={(e) => setForm({ ...form, credit_limit: e.target.value })}
              required
            />
            <Hint>El límite máximo autorizado (aparece en tu estado de cuenta o app del banco).</Hint>
          </div>
          <div>
            <label className="label">Día de corte</label>
            <input
              className="input"
              type="number"
              min="1"
              max="31"
              placeholder="Ej: 20"
              value={form.billing_day}
              onChange={(e) => setForm({ ...form, billing_day: e.target.value })}
              required
            />
            <Hint>Día del mes en que cierra tu ciclo de facturación.</Hint>
          </div>
          <div>
            <label className="label">Día límite de pago</label>
            <input
              className="input"
              type="number"
              min="1"
              max="31"
              placeholder="Ej: 5"
              value={form.due_day}
              onChange={(e) => setForm({ ...form, due_day: e.target.value })}
              required
            />
            <Hint>Día del mes en que vence tu pago para no generar intereses.</Hint>
          </div>
        </div>
        <button type="submit" disabled={busy} className="btn-primary justify-center py-2">
          <Plus size={15} /> {busy ? 'Agregando...' : 'Agregar tarjeta'}
        </button>
      </form>

      <AddedList items={added} />

      <div className="flex gap-2 mt-1">
        <button
          type="button"
          onClick={onNext}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            added.length > 0 ? 'btn-primary justify-center' : 'border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-2)]'
          }`}
        >
          {added.length > 0 ? <>Finalizar configuración <ChevronRight size={15} /></> : 'Omitir por ahora'}
        </button>
      </div>
    </div>
  );
}

// ── Step 7: ¡Listo! ────────────────────────────────────────────────────────
function StepDone({ onFinish, busy }) {
  return (
    <div className="flex flex-col items-center text-center gap-6">
      <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
        <Check size={40} className="text-emerald-500" />
      </div>
      <div>
        <h2 className="text-display font-bold text-2xl">¡Todo listo!</h2>
        <p className="text-[var(--text-muted)] text-sm mt-2 max-w-xs mx-auto">
          Tu cuenta está configurada. Puedes editar o agregar más información en cualquier momento
          desde el menú lateral.
        </p>
      </div>
      <ul className="w-full text-left flex flex-col gap-2">
        {[
          'Registra transacciones y escanea recibos con la cámara',
          'Configura tu presupuesto mensual por categoría',
          'Revisa tu Score Financiero en el dashboard',
        ].map((tip) => (
          <li key={tip} className="flex items-start gap-2 text-sm p-3 rounded-xl bg-[var(--surface-2)]">
            <Check size={14} className="text-brand-500 mt-0.5 shrink-0" />
            <span className="text-[var(--text-muted)]">{tip}</span>
          </li>
        ))}
      </ul>
      <button onClick={onFinish} disabled={busy} className="btn-primary w-full justify-center py-2.5">
        {busy ? 'Cargando...' : 'Ir al dashboard'}
      </button>
    </div>
  );
}

// ── Wizard principal ───────────────────────────────────────────────────────
// Steps: 0=Welcome, 1=Perfil, 2=Cuentas, 3=Ingresos, 4=Deudas, 5=Metas, 6=Tarjetas, 7=Done
const STEP_LABELS = ['Perfil', 'Cuentas', 'Ingresos', 'Deudas', 'Metas', 'Tarjetas'];

export default function Onboarding() {
  const user               = useStore((s) => s.user);
  const completeOnboarding = useStore((s) => s.completeOnboarding);
  const navigate           = useNavigate();
  const [step, setStep]    = useState(0);
  const [busy, setBusy]    = useState(false);

  const next = () => setStep((s) => s + 1);
  const prev = () => setStep((s) => Math.max(0, s - 1));

  const finish = async () => {
    setBusy(true);
    try {
      await completeOnboarding();
      navigate('/');
    } finally {
      setBusy(false);
    }
  };

  const showProgress = step >= 1 && step <= 6;

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
          {step === 1 && <StepProfile   user={user} onNext={next} onPrev={prev} />}
          {step === 2 && <StepAccounts  onNext={next} onPrev={prev} />}
          {step === 3 && <StepIncome    onNext={next} onPrev={prev} />}
          {step === 4 && <StepDebts     onNext={next} onPrev={prev} />}
          {step === 5 && <StepSavings   onNext={next} onPrev={prev} />}
          {step === 6 && <StepCards     onNext={next} onPrev={prev} />}
          {step === 7 && <StepDone      onFinish={finish} busy={busy} />}
        </div>

      </div>
    </div>
  );
}
