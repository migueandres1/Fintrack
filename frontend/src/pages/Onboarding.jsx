import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check, ChevronLeft, Plus,
  Crown, Users, Zap, ArrowRight,
} from 'lucide-react';
import { useStore } from '../store/index.js';
import api from '../services/api.js';
import { openExternalUrl } from '../utils/openUrl.js';
import { getInviteToken, clearInviteToken } from './JoinInvite.jsx';

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

// ── Step header with progress bar segments (matches handoff OnbSetup) ──────
function StepHeader({ step, totalSteps, onPrev, onSkip, eyebrow, title, description }) {
  return (
    <>
      <div className="onb-step-head">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Volver"
          style={{
            width: 36, height: 36, borderRadius: 10, border: 'none',
            background: 'var(--surface-2)', color: 'var(--text)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <ChevronLeft size={18} />
        </button>
        <div className="onb-progress">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={`seg ${i < step ? 'done' : ''}`} />
          ))}
        </div>
        {onSkip ? (
          <button
            type="button"
            onClick={onSkip}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 12, color: 'var(--text-muted)', fontWeight: 500,
              padding: '4px 6px', flexShrink: 0,
            }}
          >
            Saltar
          </button>
        ) : <div style={{ width: 48 }} />}
      </div>
      <div>
        <div className="onb-step-eyebrow">{eyebrow}</div>
        <h1 className="onb-step-title" dangerouslySetInnerHTML={{ __html: title }} />
        {description && <p className="onb-step-desc">{description}</p>}
      </div>
    </>
  );
}

// ── Added items list ───────────────────────────────────────────────────────
function AddedList({ items }) {
  if (!items.length) return null;
  return (
    <ul style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '14px 0' }}>
      {items.map((item) => (
        <li key={item.id} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', borderRadius: 10,
          background: 'rgba(0,184,148,.08)', border: '1px solid rgba(0,184,148,.2)',
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%',
            background: 'var(--c500)', color: '#0b1712',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Check size={13} strokeWidth={3} />
          </div>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{item._label}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--fm)' }}>{item._sublabel}</span>
        </li>
      ))}
    </ul>
  );
}

// ── Step 0: Bienvenida (splash oscuro con topo — estilo OnbWelcome) ───────
function StepWelcome({ onNext }) {
  return (
    <div className="onb-splash">
      <div className="onb-tag">MoniFlow · Finanzas con calma</div>

      {/* Logo isotipo */}
      <div style={{ marginBottom: 16 }}>
        <img src="/iso-caribe.svg" alt="MoniFlow" style={{ width: 56, height: 56 }} />
      </div>

      <h1 className="onb-title">Tu dinero,<br />con <em>claridad</em><br />tropical.</h1>
      <div className="onb-sub">Controla, ahorra y planea — todo en un flujo natural.</div>

      {/* Tarjetas decorativas rotadas (mock) */}
      <div className="onb-illu">
        <div style={{ width: '100%', maxWidth: 280, position: 'relative', height: 240, margin: '0 auto' }}>
          {/* Card 1 — caribe */}
          <div style={{
            position: 'absolute', top: 0, left: 20, right: 20,
            transform: 'rotate(-4deg)',
            background: 'linear-gradient(135deg, var(--c500) 0%, var(--cdark) 100%)',
            borderRadius: 14, padding: 18, color: '#0b1712',
            boxShadow: '0 20px 40px rgba(0,0,0,.4)', aspectRatio: 1.586,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--fb)', fontSize: 12, fontWeight: 600 }}>MoniFlow</span>
              <div style={{ width: 26, height: 18, borderRadius: 3, background: 'rgba(11,23,18,.25)' }} />
            </div>
            <div style={{ fontFamily: 'var(--fm)', fontSize: 14, letterSpacing: '.1em' }}>•••• 4729</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, letterSpacing: '.08em' }}>
              <div>
                <div style={{ opacity: .55, textTransform: 'uppercase', marginBottom: 2 }}>Titular</div>
                <div style={{ fontWeight: 700, fontSize: 9 }}>{'SOFÍA R.'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ opacity: .55, textTransform: 'uppercase', marginBottom: 2 }}>Vence</div>
                <div style={{ fontWeight: 700, fontSize: 9 }}>04/29</div>
              </div>
            </div>
          </div>
          {/* Card 2 — dark */}
          <div style={{
            position: 'absolute', top: 60, left: 30, right: 30,
            transform: 'rotate(3deg)',
            background: 'linear-gradient(135deg, var(--g950) 0%, var(--g800) 100%)',
            borderRadius: 14, padding: 18, color: '#f0f5f3',
            boxShadow: '0 20px 40px rgba(0,0,0,.5)', aspectRatio: 1.586,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--fb)', fontSize: 12, fontWeight: 600 }}>MoniFlow</span>
              <div style={{ width: 26, height: 18, borderRadius: 3, background: 'rgba(240,245,243,.15)' }} />
            </div>
            <div style={{ fontFamily: 'var(--fm)', fontSize: 14, letterSpacing: '.1em' }}>•••• 1284</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, letterSpacing: '.08em' }}>
              <div>
                <div style={{ opacity: .55, textTransform: 'uppercase', marginBottom: 2 }}>Titular</div>
                <div style={{ fontWeight: 700, fontSize: 9 }}>{'SOFÍA R.'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ opacity: .55, textTransform: 'uppercase', marginBottom: 2 }}>Vence</div>
                <div style={{ fontWeight: 700, fontSize: 9 }}>08/28</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress dots */}
      <div className="onb-dots">
        <span className="d active" />
        <span className="d" />
        <span className="d" />
      </div>

      <div className="onb-cta">
        <button
          onClick={onNext}
          className="btn-primary justify-center"
          style={{ padding: '14px 0', fontSize: 15, width: '100%' }}
        >
          Crear mi cuenta <ArrowRight size={16} />
        </button>
      </div>
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
    <>
      <StepHeader
        step={1} totalSteps={6} onPrev={onPrev}
        eyebrow="Paso 1 de 6"
        title="¿Cómo te <em>llamamos</em>?"
        description="Empecemos con lo básico: tu nombre y la moneda en la que llevas tus finanzas."
      />
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label className="label">Nombre</label>
          <input
            className="input"
            placeholder="Tu nombre o apodo"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            autoFocus
          />
          <Hint>Así te saludaremos dentro de la app.</Hint>
        </div>
        <div>
          <label className="label">Moneda principal</label>
          <select className="input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <Hint>Todos los montos se mostrarán en esta moneda. Elige la moneda en la que recibes tu ingreso principal.</Hint>
        </div>
        <div style={{ marginTop: 'auto', paddingTop: 20 }}>
          <button type="submit" disabled={busy} className="btn-primary w-full justify-center" style={{ padding: '14px 0', fontSize: 14 }}>
            {busy ? 'Guardando…' : <>Continuar <ArrowRight size={15} /></>}
          </button>
        </div>
      </form>
    </>
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
    <>
      <StepHeader
        step={2} totalSteps={6} onPrev={onPrev} onSkip={added.length === 0 ? onNext : null}
        eyebrow="Paso 2 de 6"
        title="¿Cuántas <em>cuentas</em>&nbsp;quieres conectar?"
        description="Registra las cuentas donde tienes dinero hoy. Podrás agregar más después."
      />

      <AddedList items={added} />

      <form onSubmit={add} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label className="label">Nombre de la cuenta</label>
          <input
            className="input"
            placeholder="Ej: BBVA, Nu, Efectivo"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
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
              className="input" type="number" min="0" step="0.01" placeholder="0.00"
              value={form.initial_balance}
              onChange={(e) => setForm({ ...form, initial_balance: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Moneda</label>
            <select className="input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Color</label>
          <input
            type="color" className="input h-10 cursor-pointer"
            value={form.color}
            onChange={(e) => setForm({ ...form, color: e.target.value })}
          />
        </div>

        <button type="submit" disabled={busy} className="btn-secondary justify-center" style={{ padding: '12px 0', fontSize: 13 }}>
          <Plus size={14} /> {busy ? 'Agregando…' : 'Agregar cuenta'}
        </button>
      </form>

      <div style={{ marginTop: 'auto', paddingTop: 20 }}>
        <button
          type="button"
          onClick={onNext}
          className="btn-primary w-full justify-center"
          style={{ padding: '14px 0', fontSize: 14 }}
        >
          {added.length === 0 ? 'Omitir por ahora' : <>Continuar <ArrowRight size={15} /></>}
        </button>
      </div>
    </>
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
    <>
      <StepHeader
        step={3} totalSteps={6} onPrev={onPrev} onSkip={added.length === 0 ? onNext : null}
        eyebrow="Paso 3 de 6"
        title="¿De dónde viene tu <em>dinero</em>?"
        description="Registra tus ingresos recurrentes. Los usaremos para calcular tu score y proyectar tu balance."
      />

      <AddedList items={added} />

      <form onSubmit={add} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label className="label">Categoría</label>
          <select className="input" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Descripción</label>
          <input
            className="input"
            placeholder="Ej: Salario, Freelance, Negocio"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Monto</label>
            <input
              className="input" type="number" min="0.01" step="0.01" placeholder="0.00"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Frecuencia</label>
            <select className="input" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
              {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Fecha de inicio</label>
          <input
            className="input" type="date"
            value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            required
          />
        </div>
        <button type="submit" disabled={busy} className="btn-secondary justify-center" style={{ padding: '12px 0', fontSize: 13 }}>
          <Plus size={14} /> {busy ? 'Agregando…' : 'Agregar ingreso'}
        </button>
      </form>

      <div style={{ marginTop: 'auto', paddingTop: 20 }}>
        <button
          type="button" onClick={onNext}
          className="btn-primary w-full justify-center"
          style={{ padding: '14px 0', fontSize: 14 }}
        >
          {added.length === 0 ? 'Omitir por ahora' : <>Continuar <ArrowRight size={15} /></>}
        </button>
      </div>
    </>
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
    <>
      <StepHeader
        step={4} totalSteps={6} onPrev={onPrev} onSkip={added.length === 0 ? onNext : null}
        eyebrow="Paso 4 de 6"
        title="¿Tienes alguna <em>deuda</em>?"
        description="Registra préstamos o créditos. Calcularemos cuándo terminarás de pagar y cuánto en intereses."
      />

      <AddedList items={added} />

      <form onSubmit={add} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label className="label">Nombre de la deuda</label>
          <input
            className="input"
            placeholder="Ej: Préstamo banco, Auto, Hipoteca"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Saldo actual</label>
            <input
              className="input" type="number" min="0" step="0.01" placeholder="0.00"
              value={form.initial_balance}
              onChange={(e) => setForm({ ...form, initial_balance: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Tasa anual (%)</label>
            <input
              className="input" type="number" min="0" step="0.01" placeholder="18.5"
              value={form.annual_rate}
              onChange={(e) => setForm({ ...form, annual_rate: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Pago mensual</label>
            <input
              className="input" type="number" min="0" step="0.01" placeholder="0.00"
              value={form.monthly_payment}
              onChange={(e) => setForm({ ...form, monthly_payment: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Día de pago</label>
            <input
              className="input" type="number" min="1" max="31" placeholder="5"
              value={form.payment_day}
              onChange={(e) => setForm({ ...form, payment_day: e.target.value })}
              required
            />
          </div>
        </div>
        <div>
          <label className="label">Fecha de inicio</label>
          <input
            className="input" type="date"
            value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            required
          />
        </div>
        <button type="submit" disabled={busy} className="btn-secondary justify-center" style={{ padding: '12px 0', fontSize: 13 }}>
          <Plus size={14} /> {busy ? 'Agregando…' : 'Agregar deuda'}
        </button>
      </form>

      <div style={{ marginTop: 'auto', paddingTop: 20 }}>
        <button
          type="button" onClick={onNext}
          className="btn-primary w-full justify-center"
          style={{ padding: '14px 0', fontSize: 14 }}
        >
          {added.length === 0 ? 'Omitir por ahora' : <>Continuar <ArrowRight size={15} /></>}
        </button>
      </div>
    </>
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
    <>
      <StepHeader
        step={5} totalSteps={6} onPrev={onPrev} onSkip={added.length === 0 ? onNext : null}
        eyebrow="Paso 5 de 6"
        title="¿Hacia dónde <em>ahorras</em>?"
        description="Define tus metas. Calcularemos cuánto ahorrar por semana, quincena o mes para lograrlas."
      />

      <AddedList items={added} />

      <form onSubmit={add} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label className="label">Nombre de la meta</label>
          <input
            className="input"
            placeholder="Ej: Fondo de emergencia, Vacaciones, Auto"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Monto objetivo</label>
            <input
              className="input" type="number" min="0" step="0.01" placeholder="0.00"
              value={form.target_amount}
              onChange={(e) => setForm({ ...form, target_amount: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Fecha límite</label>
            <input
              className="input" type="date"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            />
          </div>
        </div>
        <button type="submit" disabled={busy} className="btn-secondary justify-center" style={{ padding: '12px 0', fontSize: 13 }}>
          <Plus size={14} /> {busy ? 'Agregando…' : 'Agregar meta'}
        </button>
      </form>

      <div style={{ marginTop: 'auto', paddingTop: 20 }}>
        <button
          type="button" onClick={onNext}
          className="btn-primary w-full justify-center"
          style={{ padding: '14px 0', fontSize: 14 }}
        >
          {added.length === 0 ? 'Omitir por ahora' : <>Continuar <ArrowRight size={15} /></>}
        </button>
      </div>
    </>
  );
}

// ── Step 6: Tarjetas de crédito ────────────────────────────────────────────
function StepCards({ onNext, onPrev }) {
  const [added, setAdded] = useState([]);
  const [form, setForm] = useState({ name: '', last_four: '', credit_limit: '', billing_day: '1', due_day: '15', initial_balance: '' });
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
        initial_balance: Number(form.initial_balance) || 0,
      });
      setAdded((prev) => [...prev, { ...data, _label: form.name, _sublabel: `····${form.last_four} · límite $${Number(form.credit_limit).toLocaleString()}` }]);
      setForm({ name: '', last_four: '', credit_limit: '', billing_day: '1', due_day: '15', initial_balance: '' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <StepHeader
        step={6} totalSteps={6} onPrev={onPrev} onSkip={added.length === 0 ? onNext : null}
        eyebrow="Paso 6 de 6"
        title="¿Tienes <em>tarjetas</em> de crédito?"
        description="Opcional — controla saldos, fechas de corte y simula cuándo las liquidarás."
      />

      <AddedList items={added} />

      <form onSubmit={add} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label className="label">Nombre / banco</label>
          <input
            className="input"
            placeholder="Ej: Visa Banco Nacional"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Últimos 4 dígitos</label>
            <input
              className="input" maxLength={4} pattern="\d{4}" placeholder="1234"
              value={form.last_four}
              onChange={(e) => setForm({ ...form, last_four: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Límite de crédito</label>
            <input
              className="input" type="number" min="0" step="0.01" placeholder="0.00"
              value={form.credit_limit}
              onChange={(e) => setForm({ ...form, credit_limit: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Día de corte</label>
            <input
              className="input" type="number" min="1" max="31" placeholder="20"
              value={form.billing_day}
              onChange={(e) => setForm({ ...form, billing_day: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Día de pago</label>
            <input
              className="input" type="number" min="1" max="31" placeholder="5"
              value={form.due_day}
              onChange={(e) => setForm({ ...form, due_day: e.target.value })}
              required
            />
          </div>
        </div>
        <div>
          <label className="label">Saldo actual</label>
          <input
            className="input" type="number" min="0" step="0.01" placeholder="0.00"
            value={form.initial_balance}
            onChange={(e) => setForm({ ...form, initial_balance: e.target.value })}
          />
        </div>
        <button type="submit" disabled={busy} className="btn-secondary justify-center" style={{ padding: '12px 0', fontSize: 13 }}>
          <Plus size={14} /> {busy ? 'Agregando…' : 'Agregar tarjeta'}
        </button>
      </form>

      <div style={{ marginTop: 'auto', paddingTop: 20 }}>
        <button
          type="button" onClick={onNext}
          className="btn-primary w-full justify-center"
          style={{ padding: '14px 0', fontSize: 14 }}
        >
          {added.length === 0 ? 'Omitir por ahora' : <>Continuar <ArrowRight size={15} /></>}
        </button>
      </div>
    </>
  );
}

// ── Step 7: Elegir plan ────────────────────────────────────────────────────
function StepPlan({ onSkip, onPaidSelect, busy }) {
  const [billing, setBilling] = useState('monthly');

  const PLANS = [
    {
      key: null,
      label: 'Free',
      icon: null,
      price: { monthly: 'Gratis', annual: 'Gratis' },
      color: 'border-[var(--border)]',
      badge: null,
      features: ['2 cuentas bancarias', '1 tarjeta de crédito', '50 transacciones / mes', '1 meta de ahorro'],
    },
    {
      key: 'pro',
      label: 'Pro',
      icon: Crown,
      price: { monthly: '$4.99/mes', annual: '$3.99/mes' },
      color: 'border-indigo-500/40 bg-indigo-50 dark:bg-indigo-500/5',
      badge: 'Más popular',
      badgeColor: 'bg-indigo-600 text-white',
      features: ['Todo ilimitado', 'OCR de recibos con IA', 'Control de deudas y amortización', 'Planificación financiera'],
    },
    {
      key: 'familia',
      label: 'Familia',
      icon: Users,
      price: { monthly: '$7.99/mes', annual: '$5.99/mes' },
      color: 'border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/5',
      badge: null,
      features: ['Todo lo de Pro', 'Hasta 5 miembros', 'Presupuesto familiar compartido', 'Reportes por miembro'],
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-500 text-xs font-medium mb-3">
          <Zap size={12} /> Último paso
        </div>
        <h2 className="text-display font-bold text-xl">Elige tu plan</h2>
        <p className="text-[var(--text-muted)] text-sm mt-1">
          Puedes cambiar o cancelar en cualquier momento.
        </p>
      </div>

      {/* Toggle mensual / anual */}
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--surface-2)] text-sm">
          <button
            onClick={() => setBilling('monthly')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${billing === 'monthly' ? 'bg-[var(--bg-card)] text-[var(--text)] shadow-sm' : 'text-[var(--text-muted)]'}`}
          >
            Mensual
          </button>
          <button
            onClick={() => setBilling('annual')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${billing === 'annual' ? 'bg-[var(--bg-card)] text-[var(--text)] shadow-sm' : 'text-[var(--text-muted)]'}`}
          >
            Anual
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">−20%</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de planes */}
      <div className="flex flex-col gap-3">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const isPaid = !!plan.key;
          return (
            <div
              key={plan.label}
              className={`relative p-4 rounded-2xl border transition-all ${plan.color}`}
            >
              {plan.badge && (
                <span className={`absolute -top-2.5 left-4 px-2.5 py-0.5 rounded-full text-xs font-bold ${plan.badgeColor}`}>
                  {plan.badge}
                </span>
              )}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  {Icon && <Icon size={16} className={isPaid && plan.key === 'pro' ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-600 dark:text-emerald-400'} />}
                  <span className="font-bold text-[var(--text)]">{plan.label}</span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[var(--text)] text-sm">{plan.price[billing]}</p>
                  {isPaid && billing === 'annual' && (
                    <p className="text-xs text-[var(--text-muted)]">facturado anualmente</p>
                  )}
                </div>
              </div>
              <ul className="flex flex-col gap-1 mb-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <Check size={11} className="text-emerald-500 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              {isPaid ? (
                <button
                  onClick={() => onPaidSelect(`${plan.key}_${billing}`)}
                  disabled={busy}
                  className="w-full py-2 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-60"
                >
                  {busy ? 'Redirigiendo...' : <>Empezar 30 días gratis <ArrowRight size={13} /></>}
                </button>
              ) : (
                <button
                  onClick={onSkip}
                  disabled={busy}
                  className="w-full py-2 rounded-xl text-sm font-medium border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-2)] transition-colors disabled:opacity-60"
                >
                  Continuar con Free
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Step 8: ¡Listo! (splash con mensaje de completado) ────────────────────
function StepDone({ onFinish, busy }) {
  return (
    <div className="onb-splash">
      <div className="onb-tag">Configuración completa</div>

      <div style={{ marginBottom: 16 }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'var(--c500)', color: '#0b1712',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Check size={32} strokeWidth={3} />
        </div>
      </div>

      <h1 className="onb-title">Todo <em>listo</em>,<br />empecemos a<br />fluir.</h1>
      <div className="onb-sub">Tu MoniFlow está calibrado. Puedes editar o agregar todo lo que quieras desde el menú.</div>

      <div style={{ flex: 1, margin: '28px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          'Registra transacciones y escanea recibos con la cámara',
          'Configura tu presupuesto mensual por categoría',
          'Revisa tu Score Financiero en el dashboard',
        ].map((tip) => (
          <div key={tip} style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '12px 14px', borderRadius: 12,
            background: 'rgba(240,245,243,.05)', border: '1px solid rgba(46,92,62,.4)',
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%',
              background: 'var(--c500)', color: '#0b1712', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
            }}>
              <Check size={12} strokeWidth={3} />
            </div>
            <span style={{ fontSize: 13, color: 'var(--g300, #a0b5ad)', lineHeight: 1.4 }}>{tip}</span>
          </div>
        ))}
      </div>

      <div className="onb-cta">
        <button
          onClick={onFinish} disabled={busy}
          className="btn-primary justify-center"
          style={{ padding: '14px 0', fontSize: 15, width: '100%' }}
        >
          {busy ? 'Cargando…' : <>Ir al dashboard <ArrowRight size={16} /></>}
        </button>
      </div>
    </div>
  );
}

// ── Wizard principal ───────────────────────────────────────────────────────
// Steps: 0=Welcome, 1=Perfil, 2=Cuentas, 3=Ingresos, 4=Deudas, 5=Metas, 6=Tarjetas, 7=Plan, 8=Done

export default function Onboarding() {
  const user               = useStore((s) => s.user);
  const completeOnboarding = useStore((s) => s.completeOnboarding);
  const startCheckout      = useStore((s) => s.startCheckout);
  const joinFamily         = useStore((s) => s.joinFamily);
  const navigate           = useNavigate();
  const [step, setStep]    = useState(0);
  const [busy, setBusy]    = useState(false);

  // Detect family invite token saved by JoinInvite.jsx before registration
  const inviteToken = getInviteToken();
  const hasFamilyInvite = Boolean(inviteToken);

  const next = () => setStep((s) => s + 1);
  const prev = () => setStep((s) => Math.max(0, s - 1));

  // After onboarding data steps, jump straight to Done (skip plan step)
  // if the user is joining via a family invite
  const goNext = () => {
    setStep((s) => {
      const nextStep = s + 1;
      // Step 7 = Plan — skip it for family invitees
      if (nextStep === 7 && hasFamilyInvite) return 8;
      return nextStep;
    });
  };

  // Auto-join family after completing onboarding (for invite flow)
  async function joinAndFinish() {
    setBusy(true);
    try {
      await completeOnboarding();
      if (hasFamilyInvite) {
        try {
          await joinFamily(inviteToken);
        } catch {
          // Token may have expired — user can join manually later
        }
        clearInviteToken();
      }
      navigate('/');
    } finally {
      setBusy(false);
    }
  }

  const finish = joinAndFinish;

  // User chose a paid plan: complete onboarding then redirect to Stripe
  const handlePaidSelect = async (priceKey) => {
    setBusy(true);
    try {
      await completeOnboarding();
      const url = await startCheckout(priceKey);
      if (url) await openExternalUrl(url);
    } catch {
      setBusy(false);
    }
  };

  // User chose Free: complete onboarding and go to dashboard
  const handleSkipPlan = async () => {
    setBusy(true);
    try {
      await completeOnboarding();
      navigate('/');
    } finally {
      setBusy(false);
    }
  };

  // Steps 0 and 8 use their own full-screen splash layout (dark)
  const isSplash = step === 0 || step === 8;

  return (
    <div className="min-h-screen" style={{ background: isSplash ? 'var(--g950)' : 'var(--bg)' }}>
      <div className="animate-fade-up" style={{
        width: '100%', maxWidth: 520, margin: '0 auto',
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
      }}>
        {step === 0 && <StepWelcome onNext={next} />}
        {step === 8 && <StepDone onFinish={finish} busy={busy} />}

        {step >= 1 && step <= 7 && (
          <div className="onb-step">
            {step === 1 && <StepProfile  user={user} onNext={goNext} onPrev={prev} />}
            {step === 2 && <StepAccounts onNext={goNext} onPrev={prev} />}
            {step === 3 && <StepIncome   onNext={goNext} onPrev={prev} />}
            {step === 4 && <StepDebts    onNext={goNext} onPrev={prev} />}
            {step === 5 && <StepSavings  onNext={goNext} onPrev={prev} />}
            {step === 6 && <StepCards    onNext={goNext} onPrev={prev} />}
            {step === 7 && <StepPlan     onSkip={handleSkipPlan} onPaidSelect={handlePaidSelect} busy={busy} />}
          </div>
        )}
      </div>
    </div>
  );
}
