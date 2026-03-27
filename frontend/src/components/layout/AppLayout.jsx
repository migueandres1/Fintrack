import { useState, useEffect }               from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ArrowRightLeft, CreditCard,
  PiggyBank, Moon, Sun, LogOut, TrendingUp,
  CalendarRange, Wallet, BarChart2, Landmark,
  MoreHorizontal, Tags, BookOpen, Sparkles, AlertTriangle,
} from 'lucide-react';
import { useStore } from '../../store/index.js';
import clsx        from 'clsx';

// ── Nav agrupada (sidebar desktop) ────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: null,
    items: [
      { to: '/app', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'Dinero',
    items: [
      { to: '/app/transactions', icon: ArrowRightLeft, label: 'Transacciones' },
      { to: '/app/accounts',     icon: Landmark,       label: 'Cuentas' },
      { to: '/app/credit-cards', icon: CreditCard,     label: 'Tarjetas' },
    ],
  },
  {
    label: 'Control',
    items: [
      { to: '/app/budget',    icon: BarChart2,     label: 'Presupuesto' },
      { to: '/app/planning',  icon: CalendarRange, label: 'Planificación', proOnly: true },
    ],
  },
  {
    label: 'Objetivos',
    items: [
      { to: '/app/debts',   icon: Wallet,    label: 'Deudas' },
      { to: '/app/savings', icon: PiggyBank, label: 'Metas de ahorro' },
    ],
  },
  {
    label: 'Config',
    items: [
      { to: '/app/categories', icon: Tags, label: 'Categorías' },
    ],
  },
];

// ── Bottom tab bar (mobile): 4 tabs principales + "Más" ───────────────────
const BOTTOM_TABS = [
  { to: '/app',              icon: LayoutDashboard, label: 'Inicio' },
  { to: '/app/transactions', icon: ArrowRightLeft,  label: 'Movimientos' },
  { to: '/app/budget',       icon: BarChart2,       label: 'Presupuesto' },
  { to: '/app/accounts',     icon: Landmark,        label: 'Cuentas' },
];
const MORE_ITEMS_BASE = [
  { to: '/app/debts',        icon: Wallet,        label: 'Deudas' },
  { to: '/app/credit-cards', icon: CreditCard,    label: 'Tarjetas' },
  { to: '/app/savings',      icon: PiggyBank,     label: 'Metas de ahorro' },
  { to: '/app/categories',   icon: Tags,          label: 'Categorías' },
  { to: '/app/planning',     icon: CalendarRange, label: 'Planificación', proOnly: true },
  { to: '/app/pricing',      icon: Sparkles,      label: 'Planes' },
];

// ── Sidebar desktop ────────────────────────────────────────────────────────
function UserRow({ user, onLogout }) {
  const nav = useNavigate();
  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <button
        onClick={() => nav('/app/profile')}
        className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold text-sm hover:bg-brand-500/30 transition-colors shrink-0"
        title="Mi perfil"
      >
        {user?.name?.[0]?.toUpperCase()}
      </button>
      <button onClick={() => nav('/app/profile')} className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity">
        <p className="text-xs font-medium text-white truncate">{user?.name}</p>
        <p className="text-xs text-white/40 truncate">{user?.currency}</p>
      </button>
      <button onClick={onLogout} className="text-white/40 hover:text-rose-400 transition-colors" title="Cerrar sesión">
        <LogOut size={16} />
      </button>
    </div>
  );
}

function Sidebar({ onLogout, user, darkMode, toggleDark }) {
  const billingStatus = useStore((s) => s.billingStatus);
  const effectivePlan = billingStatus?.plan ?? user?.plan ?? 'free';
  const nav = useNavigate();

  return (
    <div className="flex flex-col h-full px-3 py-5">
      <div className="flex items-center gap-2.5 px-4 mb-6">
        <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
          <TrendingUp size={16} className="text-white" />
        </div>
        <span className="text-display text-white font-bold text-lg tracking-tight">FinTrack</span>
      </div>

      <nav className="flex flex-col gap-0.5 flex-1 pt-1 overflow-y-auto">
        {NAV_GROUPS.map((group, gi) => {
          const visibleItems = group.items.filter(item => !(item.proOnly && effectivePlan === 'free'));
          if (visibleItems.length === 0) return null;
          return (
            <div key={gi} className={gi > 0 ? 'mt-3' : ''}>
              {group.label && (
                <p className="px-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-white/25">
                  {group.label}
                </p>
              )}
              {visibleItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/app'}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                      isActive
                        ? 'bg-brand-500/15 text-brand-400'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    )
                  }
                >
                  <Icon size={18} />
                  {label}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      <div className="mt-2 pt-3 border-t border-white/5 flex flex-col gap-1">
        <NavLink
          to="/app/pricing"
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 px-4 py-2 rounded-xl text-xs font-medium transition-all',
              isActive ? 'bg-brand-500/15 text-brand-400' : 'text-white/40 hover:text-white/70 hover:bg-white/5'
            )
          }
        >
          <Sparkles size={14} />
          Planes
        </NavLink>
        <NavLink
          to="/app/guide"
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 px-4 py-2 rounded-xl text-xs font-medium transition-all',
              isActive ? 'bg-brand-500/15 text-brand-400' : 'text-white/40 hover:text-white/70 hover:bg-white/5'
            )
          }
        >
          <BookOpen size={14} />
          Guía de usuario
        </NavLink>
        <button
          onClick={toggleDark}
          className="flex items-center gap-3 px-4 py-2 rounded-xl text-xs text-white/40 hover:text-white/70 hover:bg-white/5 transition-all"
        >
          {darkMode ? <Sun size={14} /> : <Moon size={14} />}
          {darkMode ? 'Modo claro' : 'Modo oscuro'}
        </button>
        <UserRow user={user} onLogout={onLogout} />
      </div>
    </div>
  );
}

// ── Bottom tab bar ─────────────────────────────────────────────────────────
function BottomTabBar({ moreOpen, setMoreOpen }) {
  const location = useLocation();
  const isMoreActive = MORE_ITEMS_BASE.some(n => location.pathname.startsWith(n.to))
    || location.pathname.startsWith('/app/profile');

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--sidebar-bg)] border-t border-white/8 flex items-stretch"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 6px)' }}
    >
      {BOTTOM_TABS.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/app'}
          onClick={() => setMoreOpen(false)}
          className={({ isActive }) =>
            clsx(
              'flex flex-col items-center justify-center gap-0.5 flex-1 py-2.5 transition-colors',
              isActive ? 'text-brand-400' : 'text-white/45 hover:text-white/70'
            )
          }
        >
          {({ isActive }) => (
            <>
              <div className={clsx('p-1 rounded-xl transition-all', isActive && 'bg-brand-500/15')}>
                <Icon size={20} />
              </div>
              <span className="text-[9px] leading-none mt-0.5 truncate max-w-[56px] text-center">{label}</span>
            </>
          )}
        </NavLink>
      ))}

      {/* Botón "Más" */}
      <button
        onClick={() => setMoreOpen(v => !v)}
        className={clsx(
          'flex flex-col items-center justify-center gap-0.5 flex-1 py-2.5 transition-colors',
          moreOpen || isMoreActive ? 'text-brand-400' : 'text-white/45 hover:text-white/70'
        )}
      >
        <div className={clsx('p-1 rounded-xl transition-all', (moreOpen || isMoreActive) && 'bg-brand-500/15')}>
          <MoreHorizontal size={20} />
        </div>
        <span className="text-[9px] leading-none mt-0.5">Más</span>
      </button>
    </nav>
  );
}

// ── Bottom sheet "Más" ─────────────────────────────────────────────────────
function MoreSheet({ open, onClose, user, darkMode, toggleDark, onLogout }) {
  const nav = useNavigate();
  const billingStatus = useStore((s) => s.billingStatus);
  const effectivePlan = billingStatus?.plan ?? user?.plan ?? 'free';
  const moreItems = MORE_ITEMS_BASE.filter(item => !(item.proOnly && effectivePlan === 'free'));

  if (!open) return null;
  return (
    <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-[var(--bg-card)] rounded-t-2xl animate-fade-up"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-[var(--border)]" />
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
                  isActive
                    ? 'bg-brand-500/15 text-brand-400'
                    : 'bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--surface-2)]'
                )
              }
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </div>

        {/* Divider + acciones de cuenta */}
        <div className="mx-4 mt-1 pt-3 border-t border-[var(--border)] flex items-center justify-between gap-2">
          <button
            onClick={() => { nav('/app/profile'); onClose(); }}
            className="flex items-center gap-2.5 flex-1 px-4 py-3 rounded-2xl bg-[var(--surface-2)] text-sm font-medium text-[var(--text)]"
          >
            <div className="w-7 h-7 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold text-xs">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">{user?.name}</p>
              <p className="truncate text-[10px] text-[var(--text-muted)]">{user?.currency}</p>
            </div>
          </button>

          <button
            onClick={toggleDark}
            className="p-3.5 rounded-2xl bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            onClick={onLogout}
            className="p-3.5 rounded-2xl bg-[var(--surface-2)] text-rose-400 transition-colors"
          >
            <LogOut size={18} />
          </button>
        </div>

        <div className="h-2" />
      </div>
    </div>
  );
}

// ── Layout principal ───────────────────────────────────────────────────────
export default function AppLayout() {
  const [moreOpen, setMoreOpen] = useState(false);
  const { user, darkMode, toggleDark, logout, fetchBillingStatus, billingStatus } = useStore();
  const navigate = useNavigate();

  useEffect(() => { fetchBillingStatus(); }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  const trialExpired = billingStatus?.trial_expired;

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-56 flex-shrink-0 flex-col bg-[var(--sidebar-bg)]">
        <Sidebar
          user={user}
          darkMode={darkMode}
          toggleDark={toggleDark}
          onLogout={handleLogout}
        />
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-auto">
        {/* Mobile top bar — logo solamente */}
        <div className="lg:hidden sticky top-0 z-40 flex items-center gap-2 px-4 py-3 bg-[var(--bg-card)] border-b border-[var(--border)]"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
          <div className="w-6 h-6 rounded bg-brand-500 flex items-center justify-center">
            <TrendingUp size={12} className="text-white" />
          </div>
          <span className="text-display font-bold text-sm">FinTrack</span>
        </div>

        {/* Banner prueba terminada */}
        {trialExpired && (
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-600 dark:text-amber-400">
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle size={15} className="shrink-0" />
              <span>Tu prueba gratis terminó. Algunas funciones están limitadas.</span>
            </div>
            <button
              onClick={() => navigate('/app/pricing')}
              className="shrink-0 text-xs font-semibold px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-white transition-colors"
            >
              Elegir plan
            </button>
          </div>
        )}

        {/* Contenido — pb-24 en mobile para no quedar bajo el tab bar */}
        <div
          className="flex-1 p-4 lg:p-6 lg:pb-6 max-w-7xl mx-auto w-full"
          style={{ paddingBottom: 'max(6rem, calc(4rem + env(safe-area-inset-bottom)))' }}
        >
          <Outlet />
        </div>
      </main>

      {/* Bottom tab bar (mobile) */}
      <BottomTabBar moreOpen={moreOpen} setMoreOpen={setMoreOpen} />

      {/* Bottom sheet "Más" */}
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
