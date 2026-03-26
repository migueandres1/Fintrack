import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useStore } from '../store/index.js';
import api from '../services/api.js';

export default function BillingSuccess() {
  const navigate            = useNavigate();
  const [searchParams]      = useSearchParams();
  const fetchBillingStatus  = useStore((s) => s.fetchBillingStatus);
  const [status, setStatus] = useState('syncing'); // 'syncing' | 'done' | 'error'

  useEffect(() => {
    const sessionId = searchParams.get('session_id');

    async function sync() {
      try {
        if (sessionId) {
          // Sincronizar plan directamente desde la sesión de Stripe
          await api.post('/billing/sync', { session_id: sessionId });
        }
        // Refrescar el store con el plan actualizado
        await fetchBillingStatus();
        setStatus('done');
        setTimeout(() => navigate('/app', { replace: true }), 2500);
      } catch {
        // Igual redirigir aunque falle — el webhook puede llegar después
        setStatus('done');
        setTimeout(() => navigate('/app', { replace: true }), 2500);
      }
    }

    sync();
  }, []);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center gap-5">
      {status === 'syncing' ? (
        <>
          <Loader2 size={40} className="text-brand-500 animate-spin" />
          <p className="text-[var(--text-muted)]">Activando tu suscripción...</p>
        </>
      ) : (
        <>
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
            <CheckCircle2 size={32} className="text-emerald-500" />
          </div>
          <h1 className="text-2xl font-black text-[var(--text)]">¡Suscripción activada!</h1>
          <p className="text-[var(--text-muted)] max-w-sm">
            Tu plan ya está activo. Redirigiendo al dashboard...
          </p>
        </>
      )}
    </div>
  );
}
