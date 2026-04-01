import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { useStore } from './store/index.js';
import { setNavigate } from './services/api.js';
import AppLayout      from './components/layout/AppLayout.jsx';
import AdminLayout    from './components/layout/AdminLayout.jsx';
import Login          from './pages/Login.jsx';
import Register       from './pages/Register.jsx';
import Dashboard      from './pages/Dashboard.jsx';
import Transactions   from './pages/Transactions.jsx';
import Debts          from './pages/Debts.jsx';
import Savings        from './pages/Savings.jsx';
import Planning       from './pages/Planning.jsx';
import CreditCards    from './pages/CreditCards.jsx';
import Onboarding     from './pages/Onboarding.jsx';
import Profile        from './pages/Profile.jsx';
import Budget         from './pages/Budget.jsx';
import Accounts       from './pages/Accounts.jsx';
import Categories     from './pages/Categories.jsx';
import DocsPage       from './pages/DocsPage.jsx';
import Pricing        from './pages/Pricing.jsx';
import BillingSuccess from './pages/BillingSuccess.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';

function RequireAuth({ children }) {
  const token = useStore((s) => s.token);
  const user  = useStore((s) => s.user);
  if (!token) return <Navigate to="/login" replace />;
  if (user?.is_admin)              return <Navigate to="/admin" replace />;
  if (user?.onboarding_completed === 0) return <Navigate to="/onboarding" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const token = useStore((s) => s.token);
  const user  = useStore((s) => s.user);
  if (!token)          return <Navigate to="/login" replace />;
  if (!user?.is_admin) return <Navigate to="/app" replace />;
  return children;
}

function RequireOnboarding({ children }) {
  const token = useStore((s) => s.token);
  const user  = useStore((s) => s.user);
  if (!token) return <Navigate to="/login" replace />;
  if (user?.onboarding_completed === 1) return <Navigate to="/app" replace />;
  return children;
}

function RedirectIfAuth({ children }) {
  const token = useStore((s) => s.token);
  const user  = useStore((s) => s.user);
  if (!token) return children;
  if (user?.is_admin) return <Navigate to="/admin" replace />;
  return <Navigate to="/app" replace />;
}

export default function App() {
  const initAuth = useStore((s) => s.initAuth);
  const navigate  = useNavigate();

  // Registra navigate en el cliente Axios para que el interceptor 401
  // pueda redirigir sin romper el WebView nativo de Capacitor.
  useEffect(() => { setNavigate(navigate); }, [navigate]);

  useEffect(() => { initAuth(); }, []);

  // Escucha deep links en la app nativa (ej: fintrack://app/billing/success)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let listenerHandle;
    CapApp.addListener('appUrlOpen', (event) => {
      try {
        const url = new URL(event.url);
        navigate(url.pathname + url.search, { replace: true });
      } catch { /* URL inválida */ }
    }).then((handle) => { listenerHandle = handle; });
    return () => { listenerHandle?.remove(); };
  }, [navigate]);
  return (
    <Routes>
      <Route path="/login"    element={<RedirectIfAuth><Login /></RedirectIfAuth>} />
      <Route path="/register" element={<RedirectIfAuth><Register /></RedirectIfAuth>} />

      {/* Admin */}
      <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
        <Route index element={<AdminDashboard />} />
        <Route path="docs" element={<DocsPage src="/docs/technical/" title="Documentación técnica" />} />
      </Route>

      {/* App */}
      <Route path="/app" element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route index element={<Dashboard />} />
        <Route path="transactions"  element={<Transactions />} />
        <Route path="debts"         element={<Debts />} />
        <Route path="savings"       element={<Savings />} />
        <Route path="planning"      element={<Planning />} />
        <Route path="credit-cards"  element={<CreditCards />} />
        <Route path="budget"        element={<Budget />} />
        <Route path="accounts"      element={<Accounts />} />
        <Route path="categories"    element={<Categories />} />
        <Route path="profile"       element={<Profile />} />
        <Route path="guide"           element={<DocsPage src="/docs/functional/"  title="Guía de usuario" />} />
        <Route path="pricing"         element={<Pricing />} />
        <Route path="billing/success" element={<BillingSuccess />} />
      </Route>

      <Route path="/onboarding" element={<RequireOnboarding><Onboarding /></RequireOnboarding>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
