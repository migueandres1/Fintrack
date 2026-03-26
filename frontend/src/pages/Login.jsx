import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TrendingUp, Eye, EyeOff } from 'lucide-react';
import { useStore } from '../store/index.js';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const login = useStore((s) => s.login);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const data = await login(form.email, form.password);
      navigate(data.user.is_admin ? '/admin' : '/');
    } catch (error) {
      setErr(error.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-sm animate-fade-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-brand-500 flex items-center justify-center mb-3">
            <TrendingUp size={24} className="text-white" />
          </div>
          <h1 className="text-display font-bold text-2xl">FinTrack</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Controla tus finanzas</p>
        </div>

        <div className="card">
          <h2 className="text-display font-bold text-base mb-4">Iniciar sesión</h2>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div>
              <label className="label">Correo electrónico</label>
              <input
                className="input"
                type="email"
                placeholder="tu@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={show ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]"
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {err && (
              <div className="text-rose-500 text-xs bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-3">
                {err}
              </div>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full justify-center py-2.5">
              {busy ? 'Ingresando...' : 'Entrar'}
            </button>
          </form>

          <p className="text-center text-xs text-[var(--text-muted)] mt-4">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-brand-500 hover:underline font-medium">Regístrate</Link>
          </p>

        </div>
      </div>
    </div>
  );
}
