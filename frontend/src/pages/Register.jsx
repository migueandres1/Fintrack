import { useState }    from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TrendingUp }  from 'lucide-react';
import { useStore }    from '../store/index.js';

const CURRENCIES = ['USD','EUR','GTQ','HNL','CRC','MXN','COP','PEN','ARS','CLP','BRL'];

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', currency: 'USD' });
  const [err,  setErr]  = useState('');
  const [busy, setBusy] = useState(false);
  const register   = useStore((s) => s.register);
  const navigate   = useNavigate();

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) { setErr('La contraseña debe tener al menos 8 caracteres'); return; }
    setBusy(true); setErr('');
    try {
      await register(form.name, form.email, form.password, form.currency);
      navigate('/');
    } catch (error) {
      setErr(error.response?.data?.error || 'Error al registrarse');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-brand-500 flex items-center justify-center mb-3">
            <TrendingUp size={24} className="text-white" />
          </div>
          <h1 className="text-display font-bold text-2xl">FinTrack</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Crea tu cuenta gratis</p>
        </div>

        <div className="card">
          <h2 className="text-display font-bold text-base mb-4">Registro</h2>
          <form onSubmit={submit} className="flex flex-col gap-3">
            {[
              { label: 'Nombre completo', key: 'name',     type: 'text',     placeholder: 'Tu nombre' },
              { label: 'Correo',          key: 'email',    type: 'email',    placeholder: 'tu@email.com' },
              { label: 'Contraseña',      key: 'password', type: 'password', placeholder: '••••••••' },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label className="label">{label}</label>
                <input
                  className="input"
                  type={type}
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={(e) => set(key, e.target.value)}
                  required
                />
              </div>
            ))}

            <div>
              <label className="label">Moneda</label>
              <select className="input" value={form.currency} onChange={(e) => set('currency', e.target.value)}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {err && (
              <div className="text-rose-500 text-xs bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-3">
                {err}
              </div>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full justify-center py-2.5 mt-1">
              {busy ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>

          <p className="text-center text-xs text-[var(--text-muted)] mt-4">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-brand-500 hover:underline font-medium">Inicia sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
