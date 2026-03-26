import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/index.js';
import AppLayout from './components/layout/AppLayout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Transactions from './pages/Transactions.jsx';
import Debts from './pages/Debts.jsx';
import Savings from './pages/Savings.jsx';
import Planning     from './pages/Planning.jsx';
import CreditCards  from './pages/CreditCards.jsx';
import Onboarding   from './pages/Onboarding.jsx';
import Profile      from './pages/Profile.jsx';
import Budget       from './pages/Budget.jsx';
import Accounts     from './pages/Accounts.jsx';
import Categories   from './pages/Categories.jsx';
import DocsPage     from './pages/DocsPage.jsx';

function RequireAuth({ children }) {
  const token = useStore((s) => s.token);
  const user  = useStore((s) => s.user);
  if (!token) return <Navigate to="/login" replace />;
  if (user?.onboarding_completed === 0) return <Navigate to="/onboarding" replace />;
  return children;
}

function RequireOnboarding({ children }) {
  const token = useStore((s) => s.token);
  const user  = useStore((s) => s.user);
  if (!token) return <Navigate to="/login" replace />;
  if (user?.onboarding_completed === 1) return <Navigate to="/" replace />;
  return children;
}

function RedirectIfAuth({ children }) {
  const token = useStore((s) => s.token);
  return token ? <Navigate to="/" replace /> : children;
}

export default function App() {
  const initAuth = useStore((s) => s.initAuth);
  useEffect(() => { initAuth(); }, []);
  return (
    <Routes>
      <Route path="/login" element={<RedirectIfAuth><Login /></RedirectIfAuth>} />
      <Route path="/register" element={<RedirectIfAuth><Register /></RedirectIfAuth>} />
      <Route path="/" element={
        <RequireAuth>
          <AppLayout />
        </RequireAuth>
      }>
        <Route index element={<Dashboard />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="debts" element={<Debts />} />
        <Route path="savings" element={<Savings />} />
        <Route path="planning"      element={<Planning />} />
        <Route path="credit-cards"  element={<CreditCards />} />
        <Route path="budget"        element={<Budget />} />
        <Route path="accounts"      element={<Accounts />} />
        <Route path="categories"    element={<Categories />} />
        <Route path="profile"       element={<Profile />} />
        <Route path="guide"         element={<DocsPage src="/docs/functional/" title="Guía de usuario" />} />
        <Route path="tech-docs"     element={<DocsPage src="/docs/technical/" title="Documentación técnica" />} />
      </Route>
      <Route path="/onboarding" element={<RequireOnboarding><Onboarding /></RequireOnboarding>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
