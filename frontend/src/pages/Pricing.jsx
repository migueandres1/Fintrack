import { useEffect, useState } from 'react';
import { useStore } from '../store/index.js';
import { openExternalUrl } from '../utils/openUrl.js';
import { Crown, Check, Shield, Zap } from 'lucide-react';

const FEATURES = [
  ['Cuentas ilimitadas',           'En Free solo 2 cuentas'],
  ['OCR con IA (escaneo de recibos)', 'Exclusivo Pro y Familia'],
  ['Metas y deudas ilimitadas',    'Free: 1 de cada una'],
  ['Transacciones ilimitadas',     'Free: 50 por mes'],
  ['Presupuesto mensual',          ''],
  ['Exportar CSV y PDF',           ''],
  ['Score financiero y reportes',  'Tendencias y predicciones'],
];

const FAMILY_EXTRAS = [
  ['Todo lo de Pro',               ''],
  ['Hasta 5 usuarios',             'Comparte finanzas en familia'],
  ['Gastos compartidos',           'Divide y controla juntos'],
];

export default function Pricing() {
  const { user, fetchBillingStatus, startCheckout, createPortal, billingStatus } = useStore();
  const [billing, setBilling] = useState('annual'); // 'monthly' | 'annual'
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => { fetchBillingStatus(); }, []);

  const currentPlan = billingStatus?.plan ?? user?.plan ?? 'free';

  async function handlePlan(priceKey) {
    if (priceKey.startsWith('free')) return;
    setLoading(true); setError('');
    try {
      const url = await startCheckout(priceKey);
      if (url) await openExternalUrl(url);
    } catch {
      setError('No se pudo iniciar el pago. Intentá de nuevo.');
    } finally { setLoading(false); }
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
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-up">

      {/* ── Upgrade card (caribe gradient) ──────────────────────────── */}
      <div className="upgrade-card">
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 10, color: '#0b1712', opacity: .7 }}>
          MoniFlow Pro
        </div>
        <div style={{ fontFamily: 'var(--fd)', fontWeight: 300, fontSize: 36, color: '#0b1712', lineHeight: 1.05, letterSpacing: '-.02em' }}>
          Lleva tu dinero<br />al <em style={{ fontStyle: 'italic' }}>siguiente nivel</em>.
        </div>
        <div style={{ fontSize: 13, color: '#0b1712', opacity: .65, marginTop: 10, lineHeight: 1.5 }}>
          Cuentas ilimitadas, OCR con IA, metas sin tope y más.
        </div>
      </div>

      {/* ── Billing toggle ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{
          display: 'inline-flex', background: 'var(--surface-2)',
          borderRadius: 12, padding: 3, gap: 2,
        }}>
          {[['monthly', 'Mensual'], ['annual', 'Anual']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setBilling(key)}
              style={{
                padding: '7px 18px', borderRadius: 9, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                background: billing === key ? 'var(--c500)' : 'transparent',
                color: billing === key ? '#0b1712' : 'var(--text-muted)',
                transition: 'all .15s',
              }}
            >
              {label}
              {key === 'annual' && (
                <span style={{
                  marginLeft: 6, fontSize: 9, fontWeight: 700, letterSpacing: '.08em',
                  background: billing === 'annual' ? '#0b1712' : 'var(--c500)',
                  color: billing === 'annual' ? 'var(--c500)' : '#0b1712',
                  borderRadius: 4, padding: '2px 5px',
                }}>-30%</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(229,62,62,.08)', border: '1px solid rgba(229,62,62,.2)', color: '#e53e3e', fontSize: 12, textAlign: 'center' }}>
          {error}
        </div>
      )}

      {/* ── Plan cards ────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

        {/* Monthly plan */}
        <div className="card" style={{ border: '1.5px solid var(--border)', position: 'relative' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600 }}>
            {billing === 'monthly' ? 'Mensual' : 'Anual'}
          </div>
          <div style={{ fontFamily: 'var(--fd)', fontSize: 36, fontWeight: 300, color: 'var(--text)', marginTop: 8, lineHeight: 1, letterSpacing: '-.02em' }}>
            {billing === 'monthly' ? '$2.99' : '$2.09'}
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--fb)', fontWeight: 400 }}> /mes</span>
          </div>
          {billing === 'annual' && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
              $24.99 /año · ahorras $10.90
            </div>
          )}
          {billing === 'monthly' && (
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>Cancela cuando quieras</div>
          )}
        </div>

        {/* Annual plan (highlighted) */}
        <div className="card" style={{ border: '2px solid var(--c500)', background: 'rgba(0,184,148,.04)', position: 'relative' }}>
          {billing === 'monthly' && (
            <div style={{ position: 'absolute', top: -10, right: 12, background: 'var(--c500)', color: '#0b1712', fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 4, letterSpacing: '.1em', textTransform: 'uppercase' }}>
              AHORRA 30%
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--c500)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600 }}>
            {billing === 'annual' ? 'Mensual' : 'Anual'}
          </div>
          <div style={{ fontFamily: 'var(--fd)', fontSize: 36, fontWeight: 300, color: 'var(--text)', marginTop: 8, lineHeight: 1, letterSpacing: '-.02em' }}>
            {billing === 'annual' ? '$2.99' : '$2.09'}
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--fb)', fontWeight: 400 }}> /mes</span>
          </div>
          <div style={{ fontSize: 10, color: 'var(--c500)', fontWeight: 600, marginTop: 6 }}>
            {billing === 'annual' ? 'Cancela cuando quieras' : '$24.99 /año · ahorras $10.90'}
          </div>
        </div>
      </div>

      {/* ── Features list ─────────────────────────────────────────────── */}
      <div className="card">
        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600, marginBottom: 14 }}>
          Lo que incluye Pro
        </div>
        {FEATURES.map(([label, sub], i) => (
          <div key={i} style={{
            display: 'flex', gap: 12, padding: '10px 0',
            borderBottom: i < FEATURES.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              background: 'var(--c500)', color: '#0b1712',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
            }}>
              <Check size={12} strokeWidth={3} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{label}</div>
              {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      {(currentPlan === 'free' || billingStatus?.trial_expired) ? (
        <button
          onClick={() => handlePlan(billing === 'annual' ? 'pro_annual' : 'pro_monthly')}
          disabled={loading}
          className="btn-primary w-full justify-center"
          style={{ padding: '14px 0', fontSize: 15 }}
        >
          <Crown size={16} />
          {loading ? 'Redirigiendo…' : `Upgrade a Pro ${billing === 'annual' ? 'anual' : 'mensual'}`}
        </button>
      ) : billingStatus?.has_subscription ? (
        <button onClick={handlePortal} className="btn-secondary w-full justify-center" style={{ padding: '14px 0' }}>
          Gestionar suscripción
        </button>
      ) : null}

      <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
        Pago seguro con Stripe · Cancela cuando quieras · 30 días gratis
      </p>

      {/* ── Familia plan ─────────────────────────────────────────────── */}
      <div className="card" style={{ border: '1.5px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,184,148,.1)', color: 'var(--c500)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={16} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Plan Familia</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Hasta 5 usuarios · finanzas compartidas</div>
          </div>
          <div style={{ marginLeft: 'auto', fontFamily: 'var(--fd)', fontSize: 24, fontWeight: 300, color: 'var(--text)' }}>
            $3.99<span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--fb)' }}>/mes</span>
          </div>
        </div>
        {FAMILY_EXTRAS.map(([label, sub], i) => (
          <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderTop: i === 0 ? '1px solid var(--border)' : 'none' }}>
            <Check size={13} style={{ color: 'var(--c500)', flexShrink: 0, marginTop: 2 }} />
            <div>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{label}</span>
              {sub && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>· {sub}</span>}
            </div>
          </div>
        ))}
        <button
          onClick={() => handlePlan(billing === 'annual' ? 'familia_annual' : 'familia_monthly')}
          disabled={loading}
          className="btn-secondary w-full justify-center mt-4"
        >
          Ver plan Familia
        </button>
      </div>
    </div>
  );
}
