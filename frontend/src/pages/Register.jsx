import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store/index.js';

const CURRENCIES = ['USD','EUR','MXN','GTQ','HNL','CRC','COP','PEN','ARS','CLP','BRL'];

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', currency: 'USD' });
  const [err,  setErr]  = useState('');
  const [busy, setBusy] = useState(false);
  const register = useStore((s) => s.register);
  const navigate = useNavigate();

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) { setErr('La contraseña debe tener al menos 8 caracteres'); return; }
    setBusy(true); setErr('');
    try {
      await register(form.name, form.email, form.password, form.currency);
      navigate('/onboarding');
    } catch (error) {
      setErr(error.response?.data?.error || 'Error al registrarse');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'var(--g950)' }}
    >
      <div className="absolute inset-0 topo opacity-50 pointer-events-none" />
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: 'var(--c500)' }} />

      <div className="relative z-10 w-full max-w-sm animate-fade-up">
        <div className="flex flex-col items-center mb-8">
          <img src="/logo-light.svg" alt="MoniFlow" className="h-8 mb-6" />
          <div
            className="text-display font-light text-[42px] leading-none tracking-tight text-center"
            style={{ color: '#f0f5f3', letterSpacing: '-.02em' }}
          >
            Empieza a<br />
            <em className="italic" style={{ color: 'var(--c500)' }}>controlar</em> tu dinero.
          </div>
          <p className="text-sm mt-3 text-center" style={{ color: 'var(--g400)', fontFamily: 'var(--fd)', fontStyle: 'italic', fontSize: '16px' }}>
            En tu idioma. Bajo tu control.
          </p>
        </div>

        <div
          className="rounded-2xl p-6 flex flex-col gap-4"
          style={{ background: 'var(--g900)', border: '1px solid var(--g800)' }}
        >
          <form onSubmit={submit} className="flex flex-col gap-3">
            {[
              { label: 'Nombre completo', key: 'name',     type: 'text',     placeholder: 'Tu nombre' },
              { label: 'Correo',          key: 'email',    type: 'email',    placeholder: 'tu@email.com' },
              { label: 'Contraseña',      key: 'password', type: 'password', placeholder: '••••••••' },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label className="label" style={{ color: 'var(--g400)' }}>{label}</label>
                <input
                  className="input"
                  style={{ background: 'var(--g950)', border: '1.5px solid var(--g800)', color: '#f0f5f3' }}
                  type={type}
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={(e) => set(key, e.target.value)}
                  required
                />
              </div>
            ))}

            <div>
              <label className="label" style={{ color: 'var(--g400)' }}>Moneda</label>
              <select
                className="input"
                style={{ background: 'var(--g950)', border: '1.5px solid var(--g800)', color: '#f0f5f3' }}
                value={form.currency}
                onChange={(e) => set('currency', e.target.value)}
              >
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {err && (
              <div
                className="text-xs rounded-xl p-3"
                style={{ background: 'rgba(229,62,62,.1)', border: '1px solid rgba(229,62,62,.25)', color: '#fc8181' }}
              >
                {err}
              </div>
            )}

            <button type="submit" disabled={busy} className="btn-primary btn-lg w-full mt-1">
              {busy ? 'Creando cuenta…' : 'Crear cuenta'}
            </button>
          </form>

          <p className="text-center text-xs" style={{ color: 'var(--g400)' }}>
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-semibold" style={{ color: 'var(--c500)' }}>Inicia sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
