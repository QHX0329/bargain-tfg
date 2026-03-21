import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Calculator,
  CheckCircle2,
  FileSpreadsheet,
  HelpCircle,
  Lock,
  Mail,
  Rocket,
  ShieldCheck,
  Store,
} from 'lucide-react';

const steps = [
  {
    icon: <Building2 className="h-5 w-5" />,
    title: 'Registra tu negocio',
    description: 'Completa datos legales, ubicacion y perfil comercial para activar tu cuenta PYME.',
  },
  {
    icon: <FileSpreadsheet className="h-5 w-5" />,
    title: 'Sube tu catalogo de precios',
    description: 'Importa CSV o sincroniza por API para mantener precios siempre actualizados.',
  },
  {
    icon: <Rocket className="h-5 w-5" />,
    title: 'Activa promociones inteligentes',
    description: 'Lanza campañas locales con alertas y visibilidad orientada a conversion.',
  },
];

const faqs = [
  {
    question: 'Cuanto tarda la integracion inicial?',
    answer: 'La activacion base suele completarse en menos de 24 horas con el onboarding guiado.',
  },
  {
    question: 'Puedo actualizar precios de forma masiva?',
    answer: 'Si. Puedes hacerlo por CSV o mediante API para automatizar cambios por lote.',
  },
  {
    question: 'Hay costes de permanencia?',
    answer: 'No. Puedes empezar en modo prueba y escalar solo cuando te aporte resultados.',
  },
];

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.65, ease: 'easeOut' },
} as const;

const withBase = (path: string): string => `${import.meta.env.BASE_URL}${path}`;

const MerchantOnboardingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#060a12] text-slate-100 antialiased">
      <div className="fixed inset-0 -z-10 opacity-85">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_14%,rgba(16,185,129,0.16),transparent_28%),radial-gradient(circle_at_88%_12%,rgba(99,102,241,0.2),transparent_32%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,8,16,0.72),rgba(2,6,12,0.96))]" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/75 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
          <a href={withBase('')} className="flex items-center gap-3 text-white">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-400/20 text-emerald-300">
              <Store className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">BarGAIN Business</span>
          </a>
          <div className="hidden items-center gap-7 text-sm text-slate-300 lg:flex">
            <a href="#solucion" className="transition hover:text-emerald-300">Solucion</a>
            <a href="#proceso" className="transition hover:text-emerald-300">Proceso</a>
            <a href="#faq" className="transition hover:text-emerald-300">FAQ</a>
          </div>
          <a
            href={withBase('login')}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950"
          >
            Empezar onboarding <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </header>

      <main>
        <motion.section {...reveal} className="mx-auto grid w-full max-w-7xl gap-8 px-6 pb-16 pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:pt-24" id="solucion">
          <div className="space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">Onboarding para PYMEs</p>
            <h1 className="text-4xl font-semibold leading-tight tracking-[-0.03em] text-white sm:text-5xl lg:text-6xl">
              Escala tu negocio local con precision guiada por datos
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-slate-300">
              BarGAIN te permite publicar precios, activar promociones y competir mejor en tu zona con
              una puesta en marcha simple, segura y medible desde el primer dia.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href={withBase('login')} className="rounded-2xl bg-emerald-300 px-6 py-3 text-sm font-semibold text-emerald-950">
                Iniciar ahora
              </a>
              <a href={withBase('demo')} className="rounded-2xl bg-white/5 px-6 py-3 text-sm font-semibold text-white ring-1 ring-white/15">
                Ver demo
              </a>
            </div>
          </div>

          <motion.aside
            whileHover={{ y: -6 }}
            transition={{ duration: 0.25 }}
            className="rounded-3xl bg-slate-900/65 p-6 ring-1 ring-white/10"
          >
            <div className="flex items-center gap-2 text-emerald-300">
              <Calculator className="h-4 w-4" />
              <p className="text-xs uppercase tracking-[0.16em]">ROI estimado mensual</p>
            </div>
            <div className="mt-5 grid gap-3">
              {[
                ['Ventas potenciales extra', '+12%'],
                ['Tiempo operativo ahorrado', '9.5 h'],
                ['Incremento ticket medio', '+8.4%'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
                  <span className="text-sm text-slate-300">{label}</span>
                  <span className="text-sm font-semibold text-emerald-300">{value}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-400">Estimacion orientativa para comercios de proximidad.</p>
          </motion.aside>
        </motion.section>

        <motion.section {...reveal} id="proceso" className="mx-auto w-full max-w-7xl px-6 pb-16 lg:px-10">
          <h2 className="text-3xl font-semibold tracking-tight text-white">Onboarding en 3 pasos</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {steps.map((step, index) => (
              <article key={step.title} className="rounded-3xl bg-slate-900/65 p-6 ring-1 ring-white/10">
                <div className="mb-4 inline-flex rounded-xl bg-emerald-400/15 p-3 text-emerald-300">{step.icon}</div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Paso {index + 1}</p>
                <h3 className="mt-2 text-xl font-semibold text-white">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">{step.description}</p>
              </article>
            ))}
          </div>
        </motion.section>

        <motion.section {...reveal} className="mx-auto w-full max-w-7xl px-6 pb-16 lg:px-10">
          <div className="grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl bg-white/[0.03] p-5 ring-1 ring-white/10">
              <ShieldCheck className="h-5 w-5 text-emerald-300" />
              <h3 className="mt-3 text-lg font-semibold text-white">Cifrado de datos</h3>
              <p className="mt-2 text-sm text-slate-300">Proteccion de informacion sensible en transito y en reposo.</p>
            </div>
            <div className="rounded-2xl bg-white/[0.03] p-5 ring-1 ring-white/10">
              <Lock className="h-5 w-5 text-indigo-300" />
              <h3 className="mt-3 text-lg font-semibold text-white">Accesos seguros</h3>
              <p className="mt-2 text-sm text-slate-300">Control por roles y sesiones para equipos de negocio.</p>
            </div>
            <div className="rounded-2xl bg-white/[0.03] p-5 ring-1 ring-white/10">
              <BadgeCheck className="h-5 w-5 text-emerald-300" />
              <h3 className="mt-3 text-lg font-semibold text-white">Soporte experto</h3>
              <p className="mt-2 text-sm text-slate-300">Acompanamiento de activacion con buenas practicas comerciales.</p>
            </div>
          </div>
        </motion.section>

        <motion.section {...reveal} id="faq" className="mx-auto w-full max-w-7xl px-6 pb-16 lg:px-10">
          <h2 className="text-3xl font-semibold tracking-tight text-white">Preguntas frecuentes</h2>
          <div className="mt-6 space-y-3">
            {faqs.map((item) => (
              <details key={item.question} className="rounded-2xl bg-slate-900/65 p-5 ring-1 ring-white/10">
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-white">
                  {item.question}
                  <HelpCircle className="h-4 w-4 text-slate-300" />
                </summary>
                <p className="mt-3 text-sm text-slate-300">{item.answer}</p>
              </details>
            ))}
          </div>
        </motion.section>

        <motion.section {...reveal} className="mx-auto w-full max-w-7xl px-6 pb-16 lg:px-10">
          <div className="rounded-3xl bg-gradient-to-r from-emerald-400/20 to-indigo-400/20 p-7 ring-1 ring-white/15">
            <h3 className="text-2xl font-semibold tracking-tight text-white">Empieza tu prueba gratuita</h3>
            <p className="mt-2 text-sm text-slate-200">Configura tu negocio en minutos y activa promociones desde el primer panel.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href={withBase('login')} className="rounded-xl bg-emerald-300 px-5 py-3 text-sm font-semibold text-emerald-950">Start Your Free Trial</a>
              <a href="mailto:nicolasparrillageniz@gmail.com" className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/20">
                <Mail className="h-4 w-4" /> Contactar soporte
              </a>
            </div>
          </div>
        </motion.section>
      </main>

      <footer className="border-t border-white/10 py-8">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-6 text-sm text-slate-400 lg:px-10">
          <p>Soporte: nicolasparrillageniz@gmail.com · Lun-Vie 09:00-18:00</p>
          <a href={withBase('')} className="inline-flex items-center gap-2 text-emerald-300 hover:text-emerald-200">
            <CheckCircle2 className="h-4 w-4" /> Volver al inicio
          </a>
        </div>
      </footer>
    </div>
  );
};

export default MerchantOnboardingPage;
