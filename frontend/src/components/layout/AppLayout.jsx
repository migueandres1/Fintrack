import { useState, useEffect }               from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ArrowRightLeft, CreditCard,
  PiggyBank, Moon, Sun, LogOut, TrendingUp,
  CalendarRange, Wallet, BarChart2, Landmark,
  MoreHorizontal, Tags, BookOpen, Sparkles, AlertTriangle, Users,
  ScanLine, Settings, X,
} from 'lucide-react';
import { useStore } from '../../store/index.js';
import clsx        from 'clsx';

const NAV_GROUPS = [
  {
    label: 'Principal',
    items: [
      { to: '/app',              icon: LayoutDashboard, label: 'Resumen' },
      { to: '/app/transactions', icon: ArrowRightLeft,  label: 'Transacciones' },
      { to: '/app/accounts',     icon: Landmark,        label: 'Cuentas' },
      { to: '/app/credit-cards', icon: CreditCard,      label: 'Tarjetas' },
    ],
  },
  {
    label: 'Finanzas',
    items: [
      { to: '/app/savings',  icon: PiggyBank,     label: 'Metas' },
      { to: '/app/debts',    icon: Wallet,        label: 'Deudas' },
      { to: '/app/budget',   icon: BarChart2,     label: 'Presupuesto' },
      { to: '/app/planning', icon: CalendarRange, label: 'Planificación', proOnly: true },
    ],
  },
  {
    label: 'Más',
    items: [
      { to: '/app/categories', icon: Tags,  label: 'Categorías' },
      { to: '/app/family',     icon: Users, label: 'Familia', familiaOnly: true },
    ],
  },
];

const BOTTOM_TABS = [
  { to: '/app',              icon: LayoutDashboard, label: 'Inicio' },
  { to: '/app/transactions', icon: ArrowRightLeft,  label: 'Movs' },
  { to: '/app/savings',      icon: PiggyBank,       label: 'Metas' },
  { to: '/app/accounts',     icon: Landmark,        label: 'Más' },
];

const MORE_ITEMS_BASE = [
  { to: '/app/debts',        icon: Wallet,        label: 'Deudas' },
  { to: '/app/credit-cards', icon: CreditCard,    label: 'Tarjetas' },
  { to: '/app/budget',       icon: BarChart2,     label: 'Presupuesto' },
  { to: '/app/categories',   icon: Tags,          label: 'Categorías' },
  { to: '/app/family',       icon: Users,         label: 'Familia' },
  { to: '/app/planning',     icon: CalendarRange, label: 'Planificación', proOnly: true },
  { to: '/app/pricing',      icon: Sparkles,      label: 'Planes' },
];

// MoniFlow mark logo (4 bars)
function MFMark({ size = 24 }) {
  const s = size;
  const barW = Math.round(s * 0.14);
  const gap  = Math.round(s * 0.09);
  const heights = [0.45, 0.65, 0.85, 1.0].map(h => Math.round(s * h));
  const totalW = barW * 4 + gap * 3;
  const padX = Math.round((s - totalW) / 2);
  const padY = Math.round(s * 0.06);
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none">
      <rect width={s} height={s} rx={Math.round(s * 0.18)} fill="#0b1712" />
      {heights.map((h, i) => (
        <rect
          key={i}
          x={padX + i * (barW + gap)}
          y={s - padY - h}
          width={barW}
          height={h}
          rx={Math.round(barW * 0.4)}
          fill="#00b894"
        />
      ))}
    </svg>
  );
}

function Sidebar({ onLogout, user, darkMode, toggleDark }) {
  const billingStatus  = useStore((s) => s.billingStatus);
  const effectivePlan  = billingStatus?.plan ?? user?.plan ?? 'free';
  const nav = useNavigate();

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div
        className="flex items-center gap-2.5 px-5 py-5"
        style={{ borderBottom: '1px solid var(--g800)' }}
      >
        <MFMark size={28} />
        <span
          className="text-display font-semibold"
          style={{ fontFamily: 'var(--fb)', fontWeight: 600, fontSize: 15, color: '#f0f5f3', letterSpacing: '-.02em' }}
        >
          MoniFlow
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col flex-1 px-3 py-4 gap-0.5 overflow-y-auto">
        {NAV_GROUPS.map((group, gi) => {
          const visibleItems = group.items.filter(item => !(item.proOnly && effectivePlan === 'free'));
          if (visibleItems.length === 0) return null;
          return (
            <div key={gi} className={gi > 0 ? 'mt-3' : ''}>
              <p
                className="px-3 pb-1.5 pt-1"
                style={{ fontFamily: 'var(--fm)', fontSize: 9, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--g400)' }}
              >
                {group.label}
              </p>
              {visibleItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/app'}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                      isActive
                        ? 'text-[#0b1712]'
                        : 'hover:bg-white/5'
                    )
                  }
                  style={({ isActive }) => isActive
                    ? { background: 'var(--c500)', color: '#0b1712', fontWeight: 600 }
                    : { color: 'var(--g400)' }
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={16} style={{ opacity: isActive ? 1 : .7 }} />
                      {label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {/* Footer links */}
      <div className="px-3 pb-2" style={{ borderTop: '1px solid var(--g800)', paddingTop: 12 }}>
        <NavLink
          to="/app/pricing"
          className={({ isActive }) =>
            clsx('flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all', isActive ? 'text-[var(--c500)]' : 'hover:bg-white/5')
          }
          style={({ isActive }) => ({ color: isActive ? 'var(--c500)' : 'var(--g400)' })}
        >
          <Sparkles size={13} />
          Planes
        </NavLink>
        <NavLink
          to="/app/guide"
          className={({ isActive }) =>
            clsx('flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all', isActive ? 'text-[var(--c500)]' : 'hover:bg-white/5')
          }
          style={({ isActive }) => ({ color: isActive ? 'var(--c500)' : 'var(--g400)' })}
        >
          <BookOpen size={13} />
          Guía de usuario
        </NavLink>
        <button
          onClick={toggleDark}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium w-full hover:bg-white/5 transition-all"
          style={{ color: 'var(--g400)' }}
        >
          {darkMode ? <Sun size={13} /> : <Moon size={13} />}
          {darkMode ? 'Modo claro' : 'Modo oscuro'}
        </button>
      </div>

      {/* User row */}
      <div
        className="flex items-center gap-3 px-4 py-4 cursor-pointer hover:bg-white/5 transition-all"
        style={{ borderTop: '1px solid var(--g800)' }}
        onClick={() => nav('/app/profile')}
      >
        <div
          className="flex-shrink-0 flex items-center justify-center rounded-full text-xs font-bold"
          style={{ width: 32, height: 32, background: 'linear-gradient(135deg, var(--c500), var(--cdark))', color: '#0b1712' }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate" style={{ color: '#f0f5f3' }}>{user?.name}</p>
          <p className="text-xs truncate" style={{ color: 'var(--g400)' }}>{user?.currency} · {effectivePlan}</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onLogout(); }}
          className="p-1 rounded transition-colors hover:text-rose-400"
          style={{ color: 'var(--g400)' }}
          title="Cerrar sesión"
        >
          <LogOut size={14} />
        </button>
      </div>
    </div>
  );
}

// Mobile bottom tab bar — 5 tabs: Inicio, Movs, [scan btn], Metas, Más
function BottomTabBar({ moreOpen, setMoreOpen, onScan }) {
  const location    = useLocation();
  const isMoreActive = MORE_ITEMS_BASE.some(n => location.pathname.startsWith(n.to))
    || location.pathname.startsWith('/app/profile');

  const tabs = [
    { to: '/app',              icon: LayoutDashboard, label: 'Inicio' },
    { to: '/app/transactions', icon: ArrowRightLeft,  label: 'Movs'   },
  ];
  const tabsRight = [
    { to: '/app/savings', icon: PiggyBank, label: 'Metas' },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex items-end"
      style={{
        background: 'rgba(11,23,18,.97)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--g800)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 6px)',
      }}
    >
      <div className="flex items-stretch w-full px-2">
        {/* Left tabs */}
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/app'}
            onClick={() => setMoreOpen(false)}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2.5 transition-colors"
          >
            {({ isActive }) => (
              <>
                <div className={clsx('p-1 rounded-xl transition-all', isActive && 'bg-[var(--c500)]/15')}>
                  <Icon size={20} style={{ color: isActive ? 'var(--c500)' : 'var(--g400)' }} />
                </div>
                <span className="text-[9px] leading-none mt-0.5" style={{ color: isActive ? 'var(--c500)' : 'var(--g400)' }}>{label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Center scan button */}
        <div className="flex flex-col items-center justify-center flex-1 relative">
          <button
            onClick={onScan}
            className="flex items-center justify-center rounded-full transition-transform active:scale-95"
            style={{
              width: 52, height: 52,
              background: 'var(--c500)',
              color: '#0b1712',
              boxShadow: '0 8px 20px -4px rgba(0,184,148,.4)',
              marginTop: -16,
            }}
          >
            <ScanLine size={22} />
          </button>
        </div>

        {/* Right tabs */}
        {tabsRight.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setMoreOpen(false)}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2.5 transition-colors"
          >
            {({ isActive }) => (
              <>
                <div className={clsx('p-1 rounded-xl transition-all', isActive && 'bg-[var(--c500)]/15')}>
                  <Icon size={20} style={{ color: isActive ? 'var(--c500)' : 'var(--g400)' }} />
                </div>
                <span className="text-[9px] leading-none mt-0.5" style={{ color: isActive ? 'var(--c500)' : 'var(--g400)' }}>{label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Más */}
        <button
          onClick={() => setMoreOpen(v => !v)}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2.5 transition-colors"
        >
          <div className={clsx('p-1 rounded-xl transition-all', (moreOpen || isMoreActive) && 'bg-[var(--c500)]/15')}>
            <MoreHorizontal size={20} style={{ color: (moreOpen || isMoreActive) ? 'var(--c500)' : 'var(--g400)' }} />
          </div>
          <span className="text-[9px] leading-none mt-0.5" style={{ color: (moreOpen || isMoreActive) ? 'var(--c500)' : 'var(--g400)' }}>Más</span>
        </button>
      </div>
    </nav>
  );
}

function MoreSheet({ open, onClose, user, darkMode, toggleDark, onLogout }) {
  const nav = useNavigate();
  const billingStatus  = useStore((s) => s.billingStatus);
  const effectivePlan  = billingStatus?.plan ?? user?.plan ?? 'free';
  const moreItems = MORE_ITEMS_BASE.filter(item => !(item.proOnly && effectivePlan === 'free'));
  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  if (!open) return null;
  return (
    <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative animate-fade-up rounded-t-2xl"
        style={{
          background: 'var(--bg-card)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full" style={{ background: 'var(--border)' }} />
        </div>

        <div className="px-4 pb-2 pt-1 grid grid-cols-2 gap-2">
          {moreItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-medium transition-all',
                  isActive ? 'text-[var(--c500)]' : 'text-[var(--text)]'
                )
              }
              style={({ isActive }) => ({ background: isActive ? 'rgba(0,184,148,.1)' : 'var(--surface-2)' })}
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </div>

        <div
          className="mx-4 mt-1 pt-3 flex items-center justify-between gap-2"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            onClick={() => { nav('/app/profile'); onClose(); }}
            className="flex items-center gap-2.5 flex-1 px-4 py-3 rounded-2xl text-sm font-medium"
            style={{ background: 'var(--surface-2)', color: 'var(--text)' }}
          >
            <div
              className="flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0"
              style={{ width: 28, height: 28, background: 'linear-gradient(135deg, var(--c500), var(--cdark))', color: '#0b1712' }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">{user?.name}</p>
              <p className="truncate text-[10px]" style={{ color: 'var(--text-muted)' }}>{user?.currency}</p>
            </div>
          </button>

          <button
            onClick={toggleDark}
            className="p-3.5 rounded-2xl transition-colors"
            style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            onClick={onLogout}
            className="p-3.5 rounded-2xl transition-colors"
            style={{ background: 'var(--surface-2)', color: '#e53e3e' }}
          >
            <LogOut size={18} />
          </button>
        </div>

        <div className="h-2" />
      </div>
    </div>
  );
}

export default function AppLayout() {
  const [moreOpen, setMoreOpen] = useState(false);
  const { user, darkMode, toggleDark, logout, fetchBillingStatus, billingStatus } = useStore();
  const navigate = useNavigate();

  useEffect(() => { fetchBillingStatus(); }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  // Scan shortcut — navigate to transactions with scan param
  const handleScan = () => { navigate('/app/transactions?scan=1'); setMoreOpen(false); };

  const trialExpired = billingStatus?.trial_expired;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Sidebar desktop */}
      <aside
        className="hidden lg:flex w-[220px] flex-shrink-0 flex-col"
        style={{ background: 'var(--g950)' }}
      >
        <Sidebar
          user={user}
          darkMode={darkMode}
          toggleDark={toggleDark}
          onLogout={handleLogout}
        />
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-auto">
        {/* Mobile top bar */}
        <div
          className="lg:hidden sticky top-0 z-40 flex items-center gap-2.5 px-4 py-3"
          style={{
            background: 'var(--bg-card)',
            borderBottom: '1px solid var(--border)',
            paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
          }}
        >
          <MFMark size={24} />
          <span
            className="font-semibold"
            style={{ fontFamily: 'var(--fb)', fontSize: 15, color: 'var(--text)', letterSpacing: '-.02em' }}
          >
            MoniFlow
          </span>
        </div>

        {trialExpired && (
          <div
            className="flex items-center justify-between gap-3 px-4 py-2.5"
            style={{ background: 'rgba(240,165,0,.08)', borderBottom: '1px solid rgba(240,165,0,.15)' }}
          >
            <div className="flex items-center gap-2 text-sm" style={{ color: '#b87200' }}>
              <AlertTriangle size={15} className="shrink-0" />
              <span>Tu prueba gratis terminó. Algunas funciones están limitadas.</span>
            </div>
            <button
              onClick={() => navigate('/app/pricing')}
              className="shrink-0 text-xs font-semibold px-3 py-1 rounded-lg transition-colors"
              style={{ background: '#f0a500', color: '#0b1712' }}
            >
              Elegir plan
            </button>
          </div>
        )}

        {/* Content */}
        <div
          className="flex-1 p-4 lg:p-6 max-w-7xl mx-auto w-full"
          style={{ paddingBottom: 'max(6rem, calc(4rem + env(safe-area-inset-bottom)))' }}
        >
          <Outlet />
        </div>
      </main>

      <BottomTabBar moreOpen={moreOpen} setMoreOpen={setMoreOpen} onScan={handleScan} />

      <MoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        user={user}
        darkMode={darkMode}
        toggleDark={toggleDark}
        onLogout={handleLogout}
      />
    </div>
  );
}
