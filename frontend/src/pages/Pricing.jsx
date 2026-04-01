import { useEffect, useState } from 'react';
import { useStore } from '../store/index.js';
import PricingSection from '../components/PricingSection.jsx';
import { openExternalUrl } from '../utils/openUrl.js';

export default function Pricing() {
  const { user, fetchBillingStatus, startCheckout, createPortal, billingStatus } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => { fetchBillingStatus(); }, []);

  async function handleSelectPlan(priceKey) {
    if (priceKey.startsWith('free')) return;
    setLoading(true); setError('');
    try {
      const url = await startCheckout(priceKey);
      if (url) await openExternalUrl(url);
    } catch {
      setError('No se pudo iniciar el pago. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  async function handlePortal() {
    try {
      const url = await createPortal();
      if (url) await openExternalUrl(url);
    } catch {
      setError('No se pudo abrir el portal de facturación.');
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-display font-black text-2xl mb-2 text-[var(--text)]">Planes y precios</h1>
        <p className="text-[var(--text-muted)]">Elegí el plan que se adapta a tus finanzas</p>
      </div>

      {error && (
        <div className="mb-8 text-center text-rose-500 text-sm bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {loading && (
        <div className="mb-6 text-center text-sm text-[var(--text-muted)]">
          Redirigiendo al pago...
        </div>
      )}

      <PricingSection
        showBetaBanner
        betaDaysLeft={billingStatus?.beta_days_left ?? null}
        currentPlan={billingStatus?.plan ?? user?.plan ?? 'free'}
        onSelectPlan={handleSelectPlan}
      />

      {billingStatus?.has_subscription && (
        <div className="mt-10 text-center">
          <button
            onClick={handlePortal}
            className="text-sm text-[var(--text-muted)] underline hover:text-[var(--text)] transition-colors"
          >
            Gestionar suscripción (facturas, cambio de tarjeta, cancelar)
          </button>
        </div>
      )}
    </div>
  );
}
