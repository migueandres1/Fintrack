import { useState }              from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ArrowRightLeft, CreditCard,
  PiggyBank, Moon, Sun, LogOut, Menu, X, TrendingUp, CalendarRange, Wallet, BarChart2, Landmark,
} from 'lucide-react';
import { useStore } from '../../store/index.js';
import clsx        from 'clsx';

function UserRow({ user, onLogout }) {
  const nav = useNavigate();
  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <button
        onClick={() => nav('/profile')}
        className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold text-sm hover:bg-brand-500/30 transition-colors shrink-0"
        title="Mi perfil"
      >
        {user?.name?.[0]?.toUpperCase()}
      </button>
      <button onClick={() => nav('/profile')} className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity">
        <p className="text-xs font-medium text-white truncate">{user?.name}</p>
        <p className="text-xs text-white/40 truncate">{user?.currency}</p>
      </button>
      <button onClick={onLogout} className="text-white/40 hover:text-rose-400 transition-colors" title="Cerrar sesión">
        <LogOut size={16} />
      </button>
    </div>
  );
}

const NAV = [
  { to: '/',            icon: LayoutDashboard,   label: 'Dashboard' },
  { to: '/transactions',icon: ArrowRightLeft,    label: 'Transacciones' },
  { to: '/accounts',     icon: Landmark,       label: 'Cuentas' },
  { to: '/debts',        icon: Wallet,         label: 'Deudas' },
  { to: '/credit-cards', icon: CreditCard,     label: 'Tarjetas' },
  { to: '/savings',      icon: PiggyBank,      label: 'Metas de ahorro' },
  { to: '/budget',       icon: BarChart2,      label: 'Presupuesto' },
  { to: '/planning',     icon: CalendarRange,  label: 'Planificación' },
];

export default function AppLayout() {
  const [sideOpen, setSideOpen] = useState(false);
  const { user, darkMode, toggleDark, logout } = useStore();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  const NavItems = () => (
    <nav className="flex flex-col gap-1 flex-1 pt-2">
      {NAV.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          onClick={() => setSideOpen(false)}
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
    </nav>
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full px-3 py-5">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 mb-6">
        <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
          <TrendingUp size={16} className="text-white" />
        </div>
        <span className="text-display text-white font-bold text-lg tracking-tight">FinTrack</span>
      </div>

      <NavItems />

      {/* Bottom */}
      <div className="mt-auto pt-4 border-t border-white/5 flex flex-col gap-2">
        <button
          onClick={toggleDark}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all"
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          {darkMode ? 'Modo claro' : 'Modo oscuro'}
        </button>

        <UserRow user={user} onLogout={handleLogout} />
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 flex-shrink-0 flex-col bg-[var(--sidebar-bg)]">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sideOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSideOpen(false)} />
          <aside className="relative w-56 bg-surface-950 flex flex-col z-10">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-auto">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-40 flex items-center gap-3 px-4 py-3 bg-[var(--bg-card)] border-b border-[var(--border)]">
          <button onClick={() => setSideOpen(true)} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-brand-500 flex items-center justify-center">
              <TrendingUp size={12} className="text-white" />
            </div>
            <span className="text-display font-bold text-sm">FinTrack</span>
          </div>
        </div>

        <div className="flex-1 p-4 lg:p-6 max-w-7xl mx-auto w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
