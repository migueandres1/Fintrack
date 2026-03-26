import { Link, Navigate } from 'react-router-dom';
import { useStore } from '../store/index.js';
import {
  TrendingUp, ArrowRight, CheckCircle2,
  AlertCircle, HelpCircle, TrendingDown,
  BarChart2, PiggyBank, Wallet, Receipt,
  ChevronRight,
} from 'lucide-react';
import PricingSection from '../components/PricingSection.jsx';

// ── Puntos de dolor que experimenta el usuario ─────────────────────────────
const PAINS = [
  {
    icon: HelpCircle,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10 border-rose-500/15',
    title: '¿A dónde se fue mi dinero?',
    desc: 'El sueldo entra, los días pasan, y de repente la cuenta está casi en cero. Sabes que gastaste, pero no recuerdas en qué.',
  },
  {
    icon: TrendingDown,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/15',
    title: 'Quiero ahorrar, pero nunca puedo',
    desc: 'Cada mes te dices "este mes sí ahorro". Cada mes pasa algo. Al final del año, el saldo de ahorros sigue en cero.',
  },
  {
    icon: AlertCircle,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/15',
    title: 'Las deudas se sienten eternas',
    desc: 'Pagas cuotas todos los meses pero no ves que el saldo baje. No sabes cuándo terminas, ni cuánto debes en total.',
  },
];

// ── Soluciones concretas (mapeadas a cada dolor) ───────────────────────────
const SOLUTIONS = [
  {
    icon: BarChart2,
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    pain: 'Para el "¿a dónde se fue?"',
    title: 'Presupuesto con visibilidad real',
    desc: 'Cada peso tiene un nombre. Ve exactamente cuánto llevas gastado por categoría vs. lo que planeaste gastar.',
  },
  {
    icon: PiggyBank,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    pain: 'Para el "nunca puedo ahorrar"',
    title: 'Metas que te obligan a avanzar',
    desc: 'Define cuánto necesitas, para cuándo, y FinTrack te dice cuánto aportar cada mes. Sin adivinar.',
  },
  {
    icon: Wallet,
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
    pain: 'Para las deudas eternas',
    title: 'Control total de lo que debes',
    desc: 'Registra cada préstamo y ve su saldo real bajando mes a mes. Saber cuándo terminas cambia todo.',
  },
  {
    icon: Receipt,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    pain: 'Para el registro que nunca haces',
    title: 'Foto al ticket, listo',
    desc: 'Nuestra IA lee el recibo y registra el gasto por ti. Sin excusas para no llevar el control.',
  },
];

export default function Landing() {
  const token = useStore((s) => s.token);
  const user = useStore((s) => s.user);
  if (token && user?.onboarding_completed !== 0) return <Navigate to="/app" replace />;

  return (
    <div className="min-h-screen bg-[#030712] text-white overflow-x-hidden">

      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#030712]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <TrendingUp size={16} className="text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">FinTrack</span>
          </div>
          <nav className="flex items-center gap-2">
            <Link
              to="/login"
              className="px-4 py-2 text-sm text-white/60 hover:text-white transition-colors rounded-lg"
            >
              Iniciar sesión
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
            >
              Empezar gratis
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero — el dolor primero ──────────────────────────────────────── */}
      <section className="relative pt-24 pb-20 px-6 text-center">
        <div
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
          aria-hidden
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-rose-600/10 rounded-full blur-[120px]" />
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-3xl mx-auto">
          {/* Gancho emocional */}
          {/* <p className="text-rose-400 font-semibold text-base mb-6 tracking-wide uppercase text-sm">
            Te lo pregunto en serio
          </p> */}

          <h1 className="text-5xl lg:text-6xl font-black leading-[1.08] tracking-tight mb-6">
            ¿Sabes exactamente<br />
            <span className="bg-gradient-to-r from-rose-400 via-orange-400 to-amber-400 bg-clip-text text-transparent">
              a dónde va tu dinero?
            </span>
          </h1>

          <p className="text-xl text-white/55 leading-relaxed mb-4 max-w-2xl mx-auto">
            La mayoría de personas trabaja duro, gana bien... y aun así llega a fin de mes
            sin entender qué pasó con su plata.
          </p>

          <p className="text-lg text-white/40 mb-10 max-w-xl mx-auto">
            No es falta de disciplina. Es falta de visibilidad.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="group flex items-center gap-2 px-7 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 w-full sm:w-auto justify-center"
            >
              Quiero tener el control
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              to="/login"
              className="flex items-center gap-2 px-7 py-3.5 text-white/50 hover:text-white border border-white/10 hover:border-white/20 rounded-xl transition-all w-full sm:w-auto justify-center"
            >
              Ya tengo cuenta
            </Link>
          </div>

          <p className="mt-5 text-sm text-white/25">
            Gratis · Sin tarjeta · Sin límites
          </p>
        </div>
      </section>

      {/* ── Sección de dolor: ¿te suena familiar? ───────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black mb-3">¿Te suena familiar?</h2>
            <p className="text-white/40 text-lg">
              Si respondiste "sí" a alguno de estos, no estás solo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PAINS.map((p) => (
              <div
                key={p.title}
                className={`p-6 rounded-2xl border ${p.bg} flex flex-col gap-3`}
              >
                <p.icon size={22} className={p.color} />
                <h3 className="font-bold text-white text-lg leading-snug">{p.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>

          {/* Agitación del dolor */}
          <div className="mt-10 text-center">
            <p className="text-white/35 text-base max-w-2xl mx-auto leading-relaxed">
              Las hojas de Excel se abandonan. Las apps bancarias solo muestran lo que ya pasó.
              Y la cabeza no puede con tanto número.{' '}
              <span className="text-white/60 font-medium">
                El problema no sos vos. Es que nunca tuviste la herramienta correcta.
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* ── El pivot: la solución ────────────────────────────────────────── */}
      <section className="py-8 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium mb-8">
            <TrendingUp size={14} />
            La solución existe. Es simple.
          </div>
          <h2 className="text-4xl lg:text-5xl font-black mb-5 leading-tight">
            FinTrack te da la{' '}
            <span className="bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">
              visibilidad que necesitás
            </span>
          </h2>
          <p className="text-lg text-white/45 max-w-xl mx-auto leading-relaxed">
            No es magia. Es tener tus números en un solo lugar, organizados,
            y saber exactamente dónde estás parado cada día del mes.
          </p>
        </div>
      </section>

      {/* ── Soluciones mapeadas a los dolores ───────────────────────────── */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-5">
          {SOLUTIONS.map((s) => (
            <div
              key={s.title}
              className="p-6 bg-white/3 hover:bg-white/5 border border-white/6 hover:border-white/10 rounded-2xl transition-all"
            >
              <div className="flex items-start gap-4">
                <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                  <s.icon size={20} className={s.color} />
                </div>
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${s.color}`}>
                    {s.pain}
                  </p>
                  <h3 className="font-bold text-white mb-2">{s.title}</h3>
                  <p className="text-sm text-white/45 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Prueba social / credibilidad ─────────────────────────────────── */}
      <section className="py-16 px-6 border-y border-white/5">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-10 text-center">
          {[
            {
              val: 'Hoy mismo',
              label: 'Podés empezar a ver a dónde va tu plata',
            },
            {
              val: '1 semana',
              label: 'Para tener el primer presupuesto completo armado',
            },
            {
              val: '1 mes',
              label: 'Para sentir que realmente controlás tus finanzas',
            },
          ].map((s) => (
            <div key={s.val}>
              <div className="text-2xl font-black text-indigo-400 mb-2">{s.val}</div>
              <p className="text-sm text-white/40 leading-relaxed">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Cómo funciona (sin fricción) ─────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-black mb-3">Empezar no tiene excusa</h2>
            <p className="text-white/40">Tres pasos. Menos de cinco minutos.</p>
          </div>
          <div className="space-y-4">
            {[
              {
                num: '1',
                title: 'Creá tu cuenta gratis',
                desc: 'Solo necesitás un correo. Sin datos bancarios, sin tarjeta.',
                cta: null,
              },
              {
                num: '2',
                title: 'Contale de qué va tu vida financiera',
                desc: 'Agregá tus cuentas, tarjetas y deudas. El onboarding te guía en menos de 3 minutos.',
                cta: null,
              },
              {
                num: '3',
                title: 'Empezá a registrar y presupuestar',
                desc: 'Fotografiá un recibo, armá tu presupuesto del mes, definí una meta de ahorro. Desde el primer día.',
                cta: null,
              },
            ].map((step, i) => (
              <div
                key={step.num}
                className="flex items-start gap-5 p-5 bg-white/2 border border-white/5 rounded-2xl"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center shrink-0">
                  <span className="text-indigo-400 font-black">{step.num}</span>
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1">{step.title}</h3>
                  <p className="text-sm text-white/40 leading-relaxed">{step.desc}</p>
                </div>
                {i < 2 && (
                  <ChevronRight size={16} className="text-white/15 ml-auto mt-3 shrink-0 hidden sm:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Precios ─────────────────────────────────────────────────────── */}
      <section className="py-20 px-6" id="precios">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black mb-3">Precios simples y transparentes</h2>
            <p className="text-white/40 text-lg">Empezá gratis. Escalá cuando lo necesités.</p>
          </div>
          <PricingSection showBetaBanner={false} />
        </div>
      </section>

      {/* ── CTA final — reafirmar el dolor y cerrar ──────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/30 border border-indigo-500/20 rounded-3xl p-10 lg:p-14">
            <p className="text-indigo-300 font-semibold text-sm uppercase tracking-widest mb-4">
              La pregunta sigue ahí
            </p>
            <h2 className="text-3xl lg:text-4xl font-black mb-5 leading-tight">
              ¿Vas a seguir sin saber<br />a dónde va tu dinero?
            </h2>
            <p className="text-white/45 mb-8 leading-relaxed">
              O podés empezar hoy, gratis, y cerrar este mes sabiendo
              exactamente qué pasó con cada peso que ganaste.
            </p>
            <Link
              to="/register"
              className="group inline-flex items-center gap-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5"
            >
              Quiero saber a dónde va mi plata
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-5 text-sm text-white/30">
              {['Gratis para siempre', 'Sin tarjeta de crédito', 'Listo en minutos'].map((t) => (
                <div key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-indigo-400" />
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center">
              <TrendingUp size={12} className="text-white" />
            </div>
            <span className="font-bold text-sm">FinTrack</span>
          </div>
          <p className="text-xs text-white/20 text-center">
            Gestión financiera personal &middot; Todos los derechos reservados
          </p>
          <div className="flex items-center gap-4 text-xs text-white/30">
            <Link to="/login" className="hover:text-white/60 transition-colors">Iniciar sesión</Link>
            <Link to="/register" className="hover:text-white/60 transition-colors">Registrarse</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
