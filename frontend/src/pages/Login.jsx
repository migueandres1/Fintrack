import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useStore } from '../store/index.js';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);
  const [err,  setErr]  = useState('');
  const [busy, setBusy] = useState(false);
  const login    = useStore((s) => s.login);
  const navigate = useNavigate();

  const redirectTo = new URLSearchParams(window.location.search).get('redirect') || '/';

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const data = await login(form.email, form.password);
      navigate(data.user.is_admin ? '/admin' : redirectTo);
    } catch (error) {
      setErr(error.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'var(--g950)' }}
    >
      {/* Topo pattern background */}
      <div className="absolute inset-0 topo opacity-50 pointer-events-none" />

      {/* Accent line */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: 'var(--c500)' }} />

      <div className="relative z-10 w-full max-w-sm animate-fade-up">
        {/* Brand */}
        <div className="flex flex-col items-center mb-10">
          <img src="/logo-light.svg" alt="MoniFlow" className="h-8 mb-6" />
          <div
            className="text-display font-light text-[42px] leading-none tracking-tight text-center"
            style={{ color: '#f0f5f3', letterSpacing: '-.02em' }}
          >
            Bienvenido<br />
            de <em className="italic" style={{ color: 'var(--c500)' }}>vuelta.</em>
          </div>
          <p className="text-sm mt-3 text-center" style={{ color: 'var(--g400)', fontFamily: 'var(--fd)', fontStyle: 'italic', fontSize: '16px' }}>
            Tu dinero te está esperando.
          </p>
        </div>

        {/* Form card */}
        <div
          className="rounded-2xl p-6 flex flex-col gap-4"
          style={{ background: 'var(--g900)', border: '1px solid var(--g800)' }}
        >
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div>
              <label className="label" style={{ color: 'var(--g400)' }}>Correo electrónico</label>
              <input
                className="input"
                style={{ background: 'var(--g950)', border: '1.5px solid var(--g800)', color: '#f0f5f3' }}
                type="email"
                placeholder="tu@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label" style={{ color: 'var(--g400)' }}>Contraseña</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  style={{ background: 'var(--g950)', border: '1.5px solid var(--g800)', color: '#f0f5f3' }}
                  type={show ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--g400)' }}
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
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
              {busy ? 'Ingresando…' : 'Entrar'}
            </button>
          </form>

          <p className="text-center text-xs" style={{ color: 'var(--g400)' }}>
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="font-semibold" style={{ color: 'var(--c500)' }}>Regístrate</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
