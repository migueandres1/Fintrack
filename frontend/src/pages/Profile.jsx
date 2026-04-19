import { useState, useEffect } from 'react';
import { openExternalUrl } from '../utils/openUrl.js';
import { Eye, EyeOff, Check, Crown, Users, Zap, ExternalLink, AlertTriangle, Globe, DollarSign, Shield, Lock, Phone, CreditCard, Receipt, BookOpen, LogOut, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/index.js';
import api from '../services/api.js';

const CURRENCIES = ['USD','EUR','MXN','COP','ARS','BRL','GTQ','HNL','NIO','CRC','PEN','CLP'];

const PLAN_META = {
  free:    { label: 'Free',    color: '#6a8880' },
  beta:    { label: 'Beta',    color: '#f0a500' },
  pro:     { label: 'Pro',     color: '#00b894' },
  familia: { label: 'Familia', color: '#00b894' },
};

function SettingRow({ icon: Icon, label, value, onClick, toggle, danger }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
        borderBottom: '1px solid var(--border)', cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: danger ? 'rgba(229,62,62,.1)' : 'rgba(0,184,148,.08)',
        color: danger ? '#e53e3e' : 'var(--c500)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={14} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: danger ? '#e53e3e' : 'var(--text)' }}>{label}</div>
        {value && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{value}</div>}
      </div>
      {toggle != null ? (
        <div style={{
          width: 38, height: 22, borderRadius: 12,
          background: toggle ? 'var(--c500)' : 'var(--border)',
          position: 'relative', padding: 2, transition: 'background .2s',
        }}>
          <div style={{
            width: 18, height: 18, borderRadius: '50%', background: '#fff',
            position: 'absolute', transition: 'left .2s',
            left: toggle ? 18 : 2, top: 2,
          }} />
        </div>
      ) : onClick ? (
        <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
      ) : null}
    </div>
  );
}

function SettingGroup({ title, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600, marginBottom: 4, paddingTop: 4 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

export default function Profile() {
  const user               = useStore((s) => s.user);
  const setUser            = useStore((s) => s.setUser);
  const billingStatus      = useStore((s) => s.billingStatus);
  const fetchBillingStatus = useStore((s) => s.fetchBillingStatus);
  const createPortal       = useStore((s) => s.createPortal);
  const logout             = useStore((s) => s.logout);
  const navigate           = useNavigate();

  const [portalBusy, setPortalBusy] = useState(false);
  const [section,    setSection]    = useState(null); // 'profile' | 'password'

  useEffect(() => { fetchBillingStatus(); }, []);

  const [profile, setProfile] = useState({ name: user?.name || '', currency: user?.currency || 'USD' });
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileOk,   setProfileOk]   = useState(false);
  const [profileErr,  setProfileErr]  = useState('');

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileBusy(true); setProfileErr(''); setProfileOk(false);
    try {
      await api.put('/auth/profile', { name: profile.name, currency: profile.currency, dark_mode: user?.dark_mode ?? 0 });
      setUser({ ...user, name: profile.name, currency: profile.currency });
      setProfileOk(true);
      setTimeout(() => { setProfileOk(false); setSection(null); }, 2000);
    } catch (err) {
      setProfileErr(err.response?.data?.error || 'Error al guardar');
    } finally { setProfileBusy(false); }
  };

  const [pwd, setPwd]       = useState({ current: '', new: '', confirm: '' });
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdOk,   setPwdOk]   = useState(false);
  const [pwdErr,  setPwdErr]  = useState('');

  const changePassword = async (e) => {
    e.preventDefault();
    setPwdErr(''); setPwdOk(false);
    if (pwd.new !== pwd.confirm) { setPwdErr('Las contraseñas nuevas no coinciden'); return; }
    setPwdBusy(true);
    try {
      await api.put('/auth/password', { current_password: pwd.current, new_password: pwd.new });
      setPwd({ current: '', new: '', confirm: '' });
      setPwdOk(true);
      setTimeout(() => { setPwdOk(false); setSection(null); }, 2000);
    } catch (err) {
      setPwdErr(err.response?.data?.error || 'Error al cambiar contraseña');
    } finally { setPwdBusy(false); }
  };

  const plan     = billingStatus?.plan ?? user?.plan ?? 'free';
  const planMeta = PLAN_META[plan] ?? PLAN_META.free;
  const trialEnd = billingStatus?.trial_ends_at ? new Date(billingStatus.trial_ends_at) : null;
  const trialDaysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd - new Date()) / 86400000)) : null;

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  async function openPortal() {
    setPortalBusy(true);
    try {
      const url = await createPortal();
      if (url) await openExternalUrl(url);
    } finally { setPortalBusy(false); }
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="max-w-lg space-y-4 animate-fade-up">

      {/* ── Avatar + user row ──────────────────────────────────────── */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 58, height: 58, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--c500), var(--cdark))',
          color: '#0b1712', fontWeight: 700, fontSize: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{user?.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{user?.email}</div>
          <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 5, background: `${planMeta.color}18`, borderRadius: 20, padding: '3px 10px' }}>
            {plan === 'pro' || plan === 'familia' ? <Crown size={10} style={{ color: planMeta.color }} /> : plan === 'beta' ? <Zap size={10} style={{ color: planMeta.color }} /> : null}
            <span style={{ fontSize: 9, fontWeight: 700, color: planMeta.color, letterSpacing: '.1em', textTransform: 'uppercase' }}>
              {planMeta.label}
              {plan === 'beta' && billingStatus?.beta_days_left > 0 && ` · ${billingStatus.beta_days_left}d`}
              {(plan === 'pro' || plan === 'familia') && trialDaysLeft > 0 && ` · ${trialDaysLeft}d de prueba`}
            </span>
          </div>
        </div>
        <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} onClick={() => setSection('profile')} className="cursor-pointer" />
      </div>

      {/* ── Profile edit form (inline expandable) ─────────────────── */}
      {section === 'profile' && (
        <div className="card animate-fade-up">
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 16 }}>
            Información personal
          </div>
          <form onSubmit={saveProfile} className="space-y-3">
            <div>
              <label className="label">Nombre</label>
              <input className="input" value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} required />
            </div>
            <div>
              <label className="label">Correo electrónico</label>
              <input className="input" value={user?.email || ''} disabled style={{ opacity: .5 }} />
            </div>
            <div>
              <label className="label">Moneda principal</label>
              <select className="input" value={profile.currency} onChange={e => setProfile({ ...profile, currency: e.target.value })}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {profileErr && <p style={{ fontSize: 11, color: '#e53e3e', background: 'rgba(229,62,62,.08)', borderRadius: 8, padding: '8px 12px' }}>{profileErr}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => setSection(null)} className="btn-secondary flex-1 justify-center">Cancelar</button>
              <button type="submit" disabled={profileBusy} className="btn-primary flex-1 justify-center">
                {profileOk ? <><Check size={14} /> Guardado</> : profileBusy ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Password form (inline expandable) ─────────────────────── */}
      {section === 'password' && (
        <div className="card animate-fade-up">
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 16 }}>
            Cambiar contraseña
          </div>
          <form onSubmit={changePassword} className="space-y-3">
            <div>
              <label className="label">Contraseña actual</label>
              <div style={{ position: 'relative' }}>
                <input className="input pr-10" type={showCur ? 'text' : 'password'} value={pwd.current}
                  onChange={e => setPwd({ ...pwd, current: e.target.value })} required />
                <button type="button" onClick={() => setShowCur(!showCur)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  {showCur ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Nueva contraseña</label>
              <div style={{ position: 'relative' }}>
                <input className="input pr-10" type={showNew ? 'text' : 'password'} placeholder="Mínimo 8 caracteres"
                  value={pwd.new} onChange={e => setPwd({ ...pwd, new: e.target.value })} required />
                <button type="button" onClick={() => setShowNew(!showNew)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Confirmar nueva contraseña</label>
              <input className="input" type="password" value={pwd.confirm}
                onChange={e => setPwd({ ...pwd, confirm: e.target.value })} required />
            </div>
            {pwdErr && <p style={{ fontSize: 11, color: '#e53e3e', background: 'rgba(229,62,62,.08)', borderRadius: 8, padding: '8px 12px' }}>{pwdErr}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => setSection(null)} className="btn-secondary flex-1 justify-center">Cancelar</button>
              <button type="submit" disabled={pwdBusy} className="btn-primary flex-1 justify-center">
                {pwdOk ? <><Check size={14} /> Actualizada</> : pwdBusy ? 'Actualizando…' : 'Cambiar contraseña'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Settings groups ─────────────────────────────────────────── */}
      <div className="card space-y-0">
        <SettingGroup title="Preferencias">
          <SettingRow icon={Globe} label="Idioma" value="Español" />
          <SettingRow icon={DollarSign} label="Moneda principal" value={`${user?.currency || 'USD'}`} onClick={() => setSection('profile')} />
        </SettingGroup>

        <div style={{ height: 16 }} />

        <SettingGroup title="Seguridad">
          <SettingRow icon={Lock} label="Cambiar contraseña" onClick={() => setSection('password')} />
        </SettingGroup>

        <div style={{ height: 16 }} />

        <SettingGroup title="Suscripción">
          {(plan === 'free' || billingStatus?.trial_expired) && (
            <SettingRow icon={Crown} label="Ver planes Pro" value="Desbloquea todo" onClick={() => navigate('/app/pricing')} />
          )}
          {billingStatus?.has_subscription && (
            <SettingRow
              icon={CreditCard}
              label="Gestionar suscripción"
              value={portalBusy ? 'Abriendo...' : 'Facturas, tarjeta, cancelar'}
              onClick={openPortal}
            />
          )}
          {!billingStatus?.has_subscription && (plan === 'pro' || plan === 'familia') && (
            <SettingRow icon={AlertTriangle} label="Agregar método de pago" value="Prueba gratis activa" onClick={() => navigate('/app/pricing')} />
          )}
          {plan === 'beta' && billingStatus?.beta_days_left > 0 && (
            <SettingRow icon={Zap} label="Plan Beta" value={`${billingStatus.beta_days_left} días restantes`} />
          )}
        </SettingGroup>

        <div style={{ height: 16 }} />

        <SettingGroup title="Cuenta">
          <SettingRow icon={Receipt} label="Exportar mis datos" value="CSV, JSON" />
          <SettingRow icon={BookOpen} label="Términos y privacidad" />
          <div style={{ paddingTop: 4 }}>
            <button
              onClick={handleLogout}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', width: '100%',
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#e53e3e', fontSize: 13, fontWeight: 500,
              }}
            >
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(229,62,62,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <LogOut size={14} style={{ color: '#e53e3e' }} />
              </div>
              Cerrar sesión
            </button>
          </div>
        </SettingGroup>
      </div>
    </div>
  );
}
