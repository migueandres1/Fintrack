import { useState, useEffect } from 'react';
import { openExternalUrl } from '../utils/openUrl.js';
import { User, Lock, Eye, EyeOff, Check, CreditCard, Crown, Users, Zap, ExternalLink, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/index.js';
import api from '../services/api.js';

const CURRENCIES = ['USD','EUR','MXN','COP','ARS','BRL','GTQ','HNL','NIO','CRC','PEN','CLP'];

const PLAN_META = {
  free:    { label: 'Free',    icon: null,   color: 'text-slate-500',   bg: 'bg-slate-100 dark:bg-slate-800' },
  beta:    { label: 'Beta',    icon: Zap,    color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-900/20' },
  pro:     { label: 'Pro',     icon: Crown,  color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
  familia: { label: 'Familia', icon: Users,  color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
};

export default function Profile() {
  const user              = useStore((s) => s.user);
  const setUser           = useStore((s) => s.setUser);
  const billingStatus     = useStore((s) => s.billingStatus);
  const fetchBillingStatus = useStore((s) => s.fetchBillingStatus);
  const createPortal      = useStore((s) => s.createPortal);
  const navigate          = useNavigate();

  const [portalBusy, setPortalBusy] = useState(false);

  useEffect(() => { fetchBillingStatus(); }, []);

  // ── Perfil ──────────────────────────────────────────────────────────────
  const [profile, setProfile] = useState({ name: user?.name || '', currency: user?.currency || 'USD' });
  const [profileBusy, setProfileBusy]   = useState(false);
  const [profileOk,   setProfileOk]     = useState(false);
  const [profileErr,  setProfileErr]    = useState('');

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileBusy(true); setProfileErr(''); setProfileOk(false);
    try {
      await api.put('/auth/profile', { name: profile.name, currency: profile.currency, dark_mode: user?.dark_mode ?? 0 });
      setUser({ ...user, name: profile.name, currency: profile.currency });
      setProfileOk(true);
      setTimeout(() => setProfileOk(false), 3000);
    } catch (err) {
      setProfileErr(err.response?.data?.error || 'Error al guardar');
    } finally {
      setProfileBusy(false);
    }
  };

  // ── Contraseña ──────────────────────────────────────────────────────────
  const [pwd, setPwd]       = useState({ current: '', new: '', confirm: '' });
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdOk,   setPwdOk]   = useState(false);
  const [pwdErr,  setPwdErr]  = useState('');

  const changePassword = async (e) => {
    e.preventDefault();
    setPwdErr(''); setPwdOk(false);
    if (pwd.new !== pwd.confirm) {
      setPwdErr('Las contraseñas nuevas no coinciden');
      return;
    }
    setPwdBusy(true);
    try {
      await api.put('/auth/password', { current_password: pwd.current, new_password: pwd.new });
      setPwd({ current: '', new: '', confirm: '' });
      setPwdOk(true);
      setTimeout(() => setPwdOk(false), 3000);
    } catch (err) {
      setPwdErr(err.response?.data?.error || 'Error al cambiar contraseña');
    } finally {
      setPwdBusy(false);
    }
  };

  const plan     = billingStatus?.plan ?? user?.plan ?? 'free';
  const meta     = PLAN_META[plan] ?? PLAN_META.free;
  const PlanIcon = meta.icon;

  const trialEnd = billingStatus?.trial_ends_at ? new Date(billingStatus.trial_ends_at) : null;
  const trialDaysLeft = trialEnd
    ? Math.max(0, Math.ceil((trialEnd - new Date()) / 86400000))
    : null;

  async function openPortal() {
    setPortalBusy(true);
    try {
      const url = await createPortal();
      if (url) await openExternalUrl(url);
    } catch {
      // portal error — silencioso
    } finally {
      setPortalBusy(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-display font-bold text-xl">Mi perfil</h1>

      {/* ── Suscripción ── */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard size={18} className="text-brand-500" />
          <h2 className="font-semibold text-[var(--text)]">Suscripción</h2>
        </div>

        {/* Plan actual */}
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${meta.bg} mb-4`}>
          {PlanIcon && <PlanIcon size={18} className={meta.color} />}
          <div className="flex-1 min-w-0">
            <p className={`font-bold text-sm ${meta.color}`}>Plan {meta.label}</p>
            {plan === 'beta' && billingStatus?.beta_days_left > 0 && (
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Beta activo · {billingStatus.beta_days_left} días restantes
              </p>
            )}
            {(plan === 'pro' || plan === 'familia') && trialDaysLeft !== null && trialDaysLeft > 0 && (
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Prueba gratis · {trialDaysLeft} día{trialDaysLeft !== 1 ? 's' : ''} restante{trialDaysLeft !== 1 ? 's' : ''}
              </p>
            )}
            {(plan === 'pro' || plan === 'familia') && billingStatus?.has_subscription && (!trialDaysLeft || trialDaysLeft === 0) && (
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Suscripción activa</p>
            )}
            {plan === 'free' && billingStatus?.trial_expired && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1">
                <AlertTriangle size={11} /> Prueba gratis terminada
              </p>
            )}
            {plan === 'free' && !billingStatus?.trial_expired && (
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Sin suscripción activa</p>
            )}
          </div>
        </div>

        {/* Detalles */}
        {(plan === 'pro' || plan === 'familia') && trialEnd && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
              <p className="text-xs text-[var(--text-muted)]">
                {trialDaysLeft > 0 ? 'Prueba termina' : 'Prueba terminó'}
              </p>
              <p className="font-semibold text-sm mt-0.5">
                {trialEnd.toLocaleDateString('es-SV', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
              <p className="text-xs text-[var(--text-muted)]">Estado</p>
              <p className="font-semibold text-sm mt-0.5">
                {billingStatus?.has_subscription ? 'Con tarjeta registrada' : 'Sin método de pago'}
              </p>
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="flex flex-col gap-2">
          {(plan === 'free' || billingStatus?.trial_expired) && (
            <button
              onClick={() => navigate('/app/pricing')}
              className="btn-primary w-full justify-center py-2.5"
            >
              <Crown size={15} /> Ver planes Pro
            </button>
          )}
          {billingStatus?.has_subscription && (
            <button
              onClick={openPortal}
              disabled={portalBusy}
              className="btn-secondary w-full justify-center py-2.5"
            >
              <ExternalLink size={15} />
              {portalBusy ? 'Abriendo...' : 'Gestionar suscripción'}
            </button>
          )}
          {!billingStatus?.has_subscription && (plan === 'pro' || plan === 'familia') && (
            <button
              onClick={() => navigate('/app/pricing')}
              className="btn-secondary w-full justify-center py-2.5 text-amber-600 dark:text-amber-400"
            >
              <AlertTriangle size={15} /> Agregar método de pago
            </button>
          )}
        </div>
      </div>

      {/* ── Información personal ── */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <User size={18} className="text-brand-500" />
          <h2 className="font-semibold text-[var(--text)]">Información personal</h2>
        </div>

        <form onSubmit={saveProfile} className="flex flex-col gap-4">
          <div>
            <label className="label">Nombre</label>
            <input
              className="input"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Correo electrónico</label>
            <input className="input opacity-60 cursor-not-allowed" value={user?.email || ''} disabled />
            <p className="text-xs text-[var(--text-muted)] mt-1">El correo no se puede cambiar.</p>
          </div>
          <div>
            <label className="label">Moneda principal</label>
            <select
              className="input"
              value={profile.currency}
              onChange={(e) => setProfile({ ...profile, currency: e.target.value })}
            >
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {profileErr && (
            <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-3">
              {profileErr}
            </p>
          )}

          <button type="submit" disabled={profileBusy} className="btn-primary w-full justify-center py-2.5">
            {profileOk
              ? <><Check size={15} /> Guardado</>
              : profileBusy ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>

      {/* ── Cambiar contraseña ── */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Lock size={18} className="text-brand-500" />
          <h2 className="font-semibold text-[var(--text)]">Cambiar contraseña</h2>
        </div>

        <form onSubmit={changePassword} className="flex flex-col gap-4">
          <div>
            <label className="label">Contraseña actual</label>
            <div className="relative">
              <input
                className="input pr-10"
                type={showCur ? 'text' : 'password'}
                value={pwd.current}
                onChange={(e) => setPwd({ ...pwd, current: e.target.value })}
                required
              />
              <button type="button" onClick={() => setShowCur(!showCur)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]">
                {showCur ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div>
            <label className="label">Nueva contraseña</label>
            <div className="relative">
              <input
                className="input pr-10"
                type={showNew ? 'text' : 'password'}
                placeholder="Mínimo 8 caracteres"
                value={pwd.new}
                onChange={(e) => setPwd({ ...pwd, new: e.target.value })}
                required
              />
              <button type="button" onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]">
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div>
            <label className="label">Confirmar nueva contraseña</label>
            <input
              className="input"
              type="password"
              value={pwd.confirm}
              onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })}
              required
            />
          </div>

          {pwdErr && (
            <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-3">
              {pwdErr}
            </p>
          )}

          <button type="submit" disabled={pwdBusy} className="btn-primary w-full justify-center py-2.5">
            {pwdOk
              ? <><Check size={15} /> Contraseña actualizada</>
              : pwdBusy ? 'Actualizando...' : 'Cambiar contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}
