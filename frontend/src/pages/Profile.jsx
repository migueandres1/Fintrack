import { useState } from 'react';
import { User, Lock, Eye, EyeOff, Check } from 'lucide-react';
import { useStore } from '../store/index.js';
import api from '../services/api.js';

const CURRENCIES = ['USD','EUR','MXN','COP','ARS','BRL','GTQ','HNL','NIO','CRC','PEN','CLP'];

export default function Profile() {
  const user    = useStore((s) => s.user);
  const setUser = useStore((s) => s.setUser);

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

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-display font-bold text-xl">Mi perfil</h1>

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
