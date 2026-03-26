import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, X, Zap, Users, Crown } from 'lucide-react';

const PLANS = [
  {
    key:     'free',
    name:    'Free',
    icon:    null,
    // colores del nombre/icono del plan
    color:   'text-slate-500 dark:text-slate-400',
    // borde de la card
    border:  'border-[var(--border)]',
    // fondo de la card
    bg:      'bg-[var(--bg-card)]',
    price:   { monthly: 0, annual: 0 },
    badge:   null,
    cta:     'Comenzar gratis',
    ctaStyle:'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/8 dark:hover:bg-white/12 dark:text-white/70',
    features: [
      { label: '2 cuentas bancarias',         ok: true  },
      { label: '1 tarjeta de crédito',         ok: true  },
      { label: '50 transacciones / mes',       ok: true  },
      { label: '1 meta de ahorro',             ok: true  },
      { label: 'Presupuesto mensual',          ok: true  },
      { label: 'OCR de recibos con IA',        ok: false },
      { label: 'Préstamos y amortización',     ok: false },
      { label: 'Cash flow y score financiero', ok: false },
      { label: 'Hasta 5 usuarios (familia)',   ok: false },
    ],
  },
  {
    key:      'pro',
    name:     'Pro',
    icon:     Crown,
    color:    'text-indigo-600 dark:text-indigo-400',
    border:   'border-indigo-300 dark:border-indigo-500/40',
    bg:       'bg-indigo-50 dark:bg-indigo-500/5',
    price:    { monthly: 4.99, annual: 49.90 },
    badge:    'Más popular',
    badgeBg:  'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30',
    cta:      'Empezar prueba gratis',
    ctaStyle: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20',
    ring:     'ring-1 ring-indigo-400/40 dark:ring-indigo-500/30',
    trial:    '30 días gratis',
    features: [
      { label: 'Cuentas ilimitadas',           ok: true  },
      { label: 'Tarjetas ilimitadas',          ok: true  },
      { label: 'Transacciones ilimitadas',     ok: true  },
      { label: 'Metas de ahorro ilimitadas',   ok: true  },
      { label: 'Presupuesto mensual',          ok: true  },
      { label: 'OCR de recibos con IA',        ok: true  },
      { label: 'Préstamos y amortización',     ok: true  },
      { label: 'Cash flow y score financiero', ok: true  },
      { label: 'Hasta 5 usuarios (familia)',   ok: false },
    ],
  },
  {
    key:      'familia',
    name:     'Familia',
    icon:     Users,
    color:    'text-emerald-600 dark:text-emerald-400',
    border:   'border-emerald-300 dark:border-emerald-500/30',
    bg:       'bg-emerald-50 dark:bg-emerald-500/5',
    price:    { monthly: 7.99, annual: 79.90 },
    badge:    'Mejor valor',
    badgeBg:  'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/25',
    cta:      'Empezar prueba gratis',
    ctaStyle: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/15',
    trial:    '30 días gratis',
    features: [
      { label: 'Todo lo de Pro',               ok: true  },
      { label: 'Hasta 5 usuarios',             ok: true  },
      { label: 'Finanzas compartidas',         ok: true  },
      { label: 'Dashboards familiares',        ok: true  },
      { label: 'Historial compartido',         ok: true  },
      { label: 'Permisos granulares',          ok: true  },
      { label: 'OCR de recibos con IA',        ok: true  },
      { label: 'Préstamos y amortización',     ok: true  },
      { label: 'Cash flow y score financiero', ok: true  },
    ],
  },
];

export default function PricingSection({
  showBetaBanner = true,
  betaDaysLeft   = null,
  onSelectPlan   = null,
  currentPlan    = null,
}) {
  const [annual, setAnnual] = useState(false);

  function handleCta(plan) {
    if (onSelectPlan) {
      onSelectPlan(annual ? `${plan.key}_annual` : `${plan.key}_monthly`);
    }
  }

  return (
    <div className="w-full">

      {/* ── Banner Beta ───────────────────────────────────────────── */}
      {showBetaBanner && betaDaysLeft !== null && betaDaysLeft > 0 && (
        <div className="mb-10 flex items-center gap-3 bg-indigo-50 border border-indigo-200 dark:bg-indigo-500/10 dark:border-indigo-500/20 rounded-2xl px-5 py-4 max-w-3xl mx-auto">
          <Zap size={18} className="text-indigo-500 dark:text-indigo-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
              Estamos en Beta — acceso Pro completo, gratis
            </p>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">
              Quedan {betaDaysLeft} días de acceso Beta. Cuando termine, podrás elegir tu plan.
            </p>
          </div>
        </div>
      )}

      {/* ── Toggle mensual / anual ────────────────────────────────── */}
      <div className="flex items-center justify-center gap-3 mb-10">
        <span className={`text-sm font-medium ${!annual ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>
          Mensual
        </span>
        <button
          onClick={() => setAnnual(v => !v)}
          className={`relative w-12 h-6 rounded-full transition-colors ${annual ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-white/15'}`}
        >
          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${annual ? 'left-7' : 'left-1'}`} />
        </button>
        <span className={`text-sm font-medium ${annual ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>
          Anual
        </span>
        {annual && (
          <span className="px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 dark:bg-emerald-500/15 dark:border-emerald-500/25 dark:text-emerald-400 text-xs font-semibold">
            2 meses gratis
          </span>
        )}
      </div>

      {/* ── Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
        {PLANS.map((plan) => {
          const isCurrentPlan = currentPlan && (
            plan.key === currentPlan ||
            (plan.key === 'pro' && currentPlan === 'beta')
          );
          const price = annual ? plan.price.annual : plan.price.monthly;
          const Icon  = plan.icon;

          return (
            <div
              key={plan.key}
              className={`relative flex flex-col rounded-2xl border ${plan.border} ${plan.bg} ${plan.ring ?? ''} p-6`}
            >
              {/* Badge */}
              {plan.badge && (
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full border text-xs font-semibold ${plan.badgeBg}`}>
                  {plan.badge}
                </div>
              )}

              {/* Header */}
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-3">
                  {Icon && <Icon size={16} className={plan.color} />}
                  <span className={`font-bold text-lg ${plan.color}`}>{plan.name}</span>
                </div>

                {price === 0 ? (
                  <div className="text-3xl font-black text-[var(--text)]">Gratis</div>
                ) : (
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-[var(--text)]">${price.toFixed(2)}</span>
                      <span className="text-sm text-[var(--text-muted)]">
                        / {annual ? 'año' : 'mes'}
                      </span>
                    </div>
                    {annual && (
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        equivale a ${(plan.price.annual / 12).toFixed(2)}/mes
                      </p>
                    )}
                    {plan.trial && !annual && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                        ✓ {plan.trial}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f.label} className="flex items-start gap-2.5">
                    {f.ok ? (
                      <CheckCircle2 size={15} className={`${plan.color} mt-0.5 shrink-0`} />
                    ) : (
                      <X size={15} className="text-slate-300 dark:text-white/20 mt-0.5 shrink-0" />
                    )}
                    <span className={`text-sm ${f.ok ? 'text-[var(--text)]' : 'text-slate-400 dark:text-white/25'}`}>
                      {f.label}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {isCurrentPlan ? (
                <div className="w-full py-2.5 text-center text-sm font-semibold text-[var(--text-muted)] border border-[var(--border)] rounded-xl">
                  Plan actual
                </div>
              ) : plan.key === 'free' ? (
                onSelectPlan ? (
                  <button onClick={() => handleCta(plan)} className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${plan.ctaStyle}`}>
                    {plan.cta}
                  </button>
                ) : (
                  <Link to="/register" className={`block w-full py-2.5 rounded-xl text-sm font-semibold text-center transition-colors ${plan.ctaStyle}`}>
                    {plan.cta}
                  </Link>
                )
              ) : onSelectPlan ? (
                <button onClick={() => handleCta(plan)} className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${plan.ctaStyle}`}>
                  {plan.cta}
                </button>
              ) : (
                <Link to="/register" className={`block w-full py-2.5 rounded-xl text-sm font-semibold text-center transition-all ${plan.ctaStyle}`}>
                  {plan.cta}
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Nota anual ───────────────────────────────────────────── */}
      <p className="text-center text-sm text-[var(--text-muted)] mt-6">
        Todos los planes de pago incluyen 30 días de prueba gratis · Cancela cuando quieras
      </p>
    </div>
  );
}
