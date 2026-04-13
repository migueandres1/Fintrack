/**
 * JoinInvite.jsx — Ruta pública /join?token=XXX
 *
 * Maneja la aceptación de una invitación familiar:
 * - Si el usuario ya tiene sesión → acepta directamente → /app/family
 * - Si NO tiene sesión → muestra formulario de registro con contexto de invitación
 *   Al registrarse, guarda el token en sessionStorage y va al onboarding
 *   (el onboarding saltará el paso de plan y auto-aceptará la invitación)
 */
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Users, Check, TrendingUp } from 'lucide-react';
import { useStore } from '../store/index.js';

const CURRENCIES = ['USD', 'EUR', 'GTQ', 'HNL', 'CRC', 'MXN', 'COP', 'PEN', 'ARS', 'CLP', 'BRL'];

const INVITE_TOKEN_KEY = 'mf_invite_token';

export function saveInviteToken(token) {
  sessionStorage.setItem(INVITE_TOKEN_KEY, token);
}

export function getInviteToken() {
  return sessionStorage.getItem(INVITE_TOKEN_KEY);
}

export function clearInviteToken() {
  sessionStorage.removeItem(INVITE_TOKEN_KEY);
}

export default function JoinInvite() {
  const navigate  = useNavigate();
  const { token: authToken, user, register, joinFamily, fetchFamily } = useStore();

  const params     = new URLSearchParams(window.location.search);
  const inviteToken = params.get('token') || '';

  const [form, setForm]   = useState({ name: '', email: '', password: '', currency: 'USD' });
  const [err,  setErr]    = useState('');
  const [busy, setBusy]   = useState(false);
  const [done, setDone]   = useState(false);
  const [familyName, setFamilyName] = useState('');

  // If already logged in → accept directly
  const isLoggedIn = Boolean(authToken && user?.onboarding_completed === 1);

  useEffect(() => {
    if (!inviteToken) {
      navigate('/login', { replace: true });
      return;
    }
    if (isLoggedIn) {
      acceptInvite();
    }
  }, [isLoggedIn]);

  async function acceptInvite() {
    setBusy(true); setErr('');
    try {
      const result = await joinFamily(inviteToken);
      setFamilyName(result.family_name);
      await fetchFamily();
      setDone(true);
      setTimeout(() => navigate('/app/family', { replace: true }), 2000);
    } catch (error) {
      setErr(error.response?.data?.error || 'Invitación inválida o expirada');
      setBusy(false);
    }
  }

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function handleRegister(e) {
    e.preventDefault();
    if (form.password.length < 8) { setErr('La contraseña debe tener al menos 8 caracteres'); return; }
    setBusy(true); setErr('');
    try {
      await register(form.name, form.email, form.password, form.currency);
      // Save token so onboarding can auto-accept after completing
      saveInviteToken(inviteToken);
      navigate('/onboarding', { replace: true });
    } catch (error) {
      setErr(error.response?.data?.error || 'Error al registrarse');
      setBusy(false);
    }
  }

  // ── Accepted confirmation ─────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
        <div className="w-full max-w-sm animate-fade-up text-center card">
          <div className="w-12 h-12 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-3">
            <Check size={22} className="text-green-400" />
          </div>
          <h2 className="text-display font-bold text-lg text-[var(--text)] mb-1">¡Te uniste!</h2>
          <p className="text-sm text-[var(--text-muted)]">
            Ahora eres miembro de <strong className="text-[var(--text)]">{familyName}</strong>.
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-2">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  // ── Loading state for logged-in users ─────────────────────────────────────
  if (isLoggedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg)] px-4 gap-4">
        {err ? (
          <div className="w-full max-w-sm card text-center">
            <p className="text-rose-400 text-sm mb-3">{err}</p>
            <Link to="/app" className="text-xs text-brand-400 hover:underline">Ir al inicio</Link>
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">Aceptando invitación...</p>
        )}
      </div>
    );
  }

  // ── Register form for guests ──────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4 py-8">
      <div className="w-full max-w-sm animate-fade-up">

        {/* Brand */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-brand-500 flex items-center justify-center mb-3">
            <TrendingUp size={24} className="text-white" />
          </div>
          <h1 className="text-display font-semibold text-2xl">MoniFlow</h1>
        </div>

        {/* Invite banner */}
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-brand-500/10 border border-brand-500/25 mb-5">
          <div className="w-9 h-9 rounded-full bg-brand-500/20 flex items-center justify-center shrink-0">
            <Users size={16} className="text-brand-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text)]">Invitación al grupo familiar</p>
            <p className="text-xs text-[var(--text-muted)]">
              Creá tu cuenta para aceptarla — no necesitás pagar nada.
            </p>
          </div>
        </div>

        <div className="card">
          <h2 className="text-display font-bold text-base mb-4">Crear cuenta</h2>
          <form onSubmit={handleRegister} className="flex flex-col gap-3">
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
                  onChange={(e) => setField(key, e.target.value)}
                  required
                />
              </div>
            ))}

            <div>
              <label className="label">Moneda</label>
              <select className="input" value={form.currency} onChange={(e) => setField('currency', e.target.value)}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {err && (
              <div className="text-rose-500 text-xs bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-3">
                {err}
              </div>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full justify-center py-2.5 mt-1">
              {busy ? 'Creando cuenta...' : 'Crear cuenta y unirme'}
            </button>
          </form>

          <p className="text-center text-xs text-[var(--text-muted)] mt-4">
            ¿Ya tenés cuenta?{' '}
            <Link
              to={`/login?redirect=/join?token=${inviteToken}`}
              className="text-brand-400 hover:underline font-medium"
            >
              Iniciá sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
