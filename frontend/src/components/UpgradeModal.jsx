/**
 * UpgradeModal — Muro de upgrade genérico.
 * Muestra cuando un usuario Free intenta usar una feature de Pro.
 */
import { useNavigate } from 'react-router-dom';
import { Modal } from './ui/index.jsx';
import { Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

const FEATURE_COPY = {
  ocr: {
    icon: '📄',
    title: 'Escaneo de recibos con IA',
    description: 'Fotografiá tu ticket y FinTrack extrae automáticamente el monto, la fecha y el comercio. Solo disponible en el plan Pro.',
    perks: [
      'OCR ilimitado con inteligencia artificial',
      'Transacciones ilimitadas',
      'Cuentas y tarjetas ilimitadas',
      'Préstamos y amortización',
    ],
  },
  debts: {
    icon: '💳',
    title: 'Gestión de préstamos',
    description: 'Registrá tus deudas, hacé seguimiento de cuotas y mirá tu amortización. Disponible en el plan Pro.',
    perks: [
      'Préstamos y tabla de amortización',
      'Seguimiento de cuotas y pagos',
      'Integración con presupuesto mensual',
      'Transacciones ilimitadas',
    ],
  },
  planning: {
    icon: '📊',
    title: 'Cash flow y planificación',
    description: 'Visualizá tu flujo de caja proyectado, score financiero y calendario de compromisos. Disponible en el plan Pro.',
    perks: [
      'Proyección de flujo mensual',
      'Score financiero y alertas',
      'Calendario de pagos y metas',
      'Préstamos y amortización',
    ],
  },
  limit: {
    icon: '⚡',
    title: 'Límite del plan Free alcanzado',
    description: 'Llegaste al límite de tu plan actual. Pasate a Pro para tener todo sin límites.',
    perks: [
      'Cuentas y tarjetas ilimitadas',
      'Transacciones sin límite mensual',
      'Metas de ahorro ilimitadas',
      'OCR de recibos con IA',
    ],
  },
};

export default function UpgradeModal({ open, onClose, feature = 'limit' }) {
  const navigate = useNavigate();
  const copy = FEATURE_COPY[feature] || FEATURE_COPY.limit;

  function goToPricing() {
    onClose();
    navigate('/app/pricing');
  }

  return (
    <Modal open={open} onClose={onClose} title="">
      <div className="text-center pb-2">

        {/* Icono feature */}
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4 text-2xl">
          {copy.icon}
        </div>

        {/* Badge plan */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-4">
          <Sparkles size={11} />
          Disponible en Pro
        </div>

        <h3 className="text-lg font-bold text-[var(--text)] mb-2">{copy.title}</h3>
        <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-5 max-w-xs mx-auto">
          {copy.description}
        </p>

        {/* Perks */}
        <ul className="text-left space-y-2 mb-6 bg-[var(--surface-2)] rounded-xl p-4">
          {copy.perks.map((perk) => (
            <li key={perk} className="flex items-center gap-2.5 text-sm text-[var(--text)]">
              <CheckCircle2 size={14} className="text-indigo-400 shrink-0" />
              {perk}
            </li>
          ))}
        </ul>

        {/* CTAs */}
        <button
          onClick={goToPricing}
          className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors mb-2.5"
        >
          Empezar prueba gratis — 30 días
          <ArrowRight size={15} />
        </button>
        <button
          onClick={onClose}
          className="w-full py-2.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        >
          Ahora no
        </button>
      </div>
    </Modal>
  );
}
