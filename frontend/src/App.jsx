import { useEffect } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useStore } from './store/index.js';
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
import Landing        from './pages/Landing.jsx';
import Pricing        from './pages/Pricing.jsx';
import BillingSuccess from './pages/BillingSuccess.jsx';
import PricingSection from './components/PricingSection.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import { TrendingUp } from 'lucide-react';

function PublicPricing() {
  const token = useStore((s) => s.token);
  const user  = useStore((s) => s.user);
  if (token && user?.onboarding_completed !== 0) return <Navigate to="/app/pricing" replace />;
  return (
    <div className="min-h-screen bg-[#030712] text-white">
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#030712]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <TrendingUp size={16} className="text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">FinTrack</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/login"    className="px-4 py-2 text-sm text-white/60 hover:text-white transition-colors rounded-lg">Iniciar sesión</Link>
            <Link to="/register" className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors">Empezar gratis</Link>
          </div>
        </div>
      </header>
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h1 className="text-4xl font-black mb-3">Precios simples y transparentes</h1>
          <p className="text-white/40 text-lg">Empezá gratis. Escalá cuando lo necesités.</p>
        </div>
        <PricingSection showBetaBanner={false} />
      </div>
    </div>
  );
}

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
  useEffect(() => { initAuth(); }, []);
  return (
    <Routes>
      <Route path="/login"    element={<RedirectIfAuth><Login /></RedirectIfAuth>} />
      <Route path="/register" element={<RedirectIfAuth><Register /></RedirectIfAuth>} />
      <Route path="/"         element={<Landing />} />
      <Route path="/pricing"  element={<PublicPricing />} />

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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
