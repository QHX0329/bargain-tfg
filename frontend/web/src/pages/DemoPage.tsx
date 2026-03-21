import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  Cable,
  Cpu,
  Database,
  PlayCircle,
  ShieldCheck,
  Store,
} from 'lucide-react';

const DEMO_VIDEO_URL =
  (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_DEMO_VIDEO_URL as string | undefined)) ||
  '';

const walkthrough = [
  {
    title: 'Savings Tracker',
    description: 'Visualiza ahorro por lista, ruta y periodo con comparativa de referencia.',
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    title: 'Deal Engine',
    description: 'Motor de deteccion de oportunidades basado en precio, distancia y tiempo.',
    icon: <Cpu className="h-5 w-5" />,
  },
  {
    title: 'Merchant Mesh',
    description: 'Conecta comercios locales con demanda cercana para mejorar conversion.',
    icon: <Store className="h-5 w-5" />,
  },
];

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.65, ease: 'easeOut' },
} as const;

const withBase = (path: string): string => `${import.meta.env.BASE_URL}${path}`;

const DemoPage: React.FC = () => {
  const hasDemoVideo = DEMO_VIDEO_URL.trim().length > 0;

  return (
    <div className="min-h-screen bg-[#060a12] text-slate-100 antialiased">
      <div className="fixed inset-0 -z-10 opacity-85">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(16,185,129,0.16),transparent_32%),radial-gradient(circle_at_85%_14%,rgba(99,102,241,0.2),transparent_34%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,8,16,0.7),rgba(2,6,12,0.96))]" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/75 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
          <a href={withBase('')} className="text-lg font-semibold tracking-tight text-white">BarGAIN Demo</a>
          <div className="flex items-center gap-3">
            <a href={withBase('docs')} className="rounded-xl bg-white/5 px-4 py-2 text-sm font-medium text-slate-200">Docs tecnicas</a>
            <a href={withBase('onboarding')} className="rounded-xl bg-white/5 px-4 py-2 text-sm font-medium text-slate-200">Onboarding comercios</a>
            <a href={withBase('login')} className="rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950">Entrar</a>
          </div>
        </div>
      </header>

      <main>
        <motion.section {...reveal} className="mx-auto w-full max-w-7xl px-6 pb-16 pt-16 lg:px-10 lg:pt-24">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">Producto en accion</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-[-0.03em] text-white sm:text-5xl lg:text-6xl">
            Ver BarGAIN en accion
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-300">
            Descubre como el motor de optimizacion transforma una lista comun en una decision de compra
            inteligente y medible para usuarios y comercios.
          </p>
          <a href="#video" className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-emerald-300 px-6 py-3 text-sm font-semibold text-emerald-950">
            Reproducir demo <PlayCircle className="h-4 w-4" />
          </a>
        </motion.section>

        <motion.section {...reveal} id="video" className="mx-auto w-full max-w-7xl px-6 pb-16 lg:px-10">
          <div className="relative overflow-hidden rounded-3xl bg-slate-900/65 p-7 ring-1 ring-white/10">
            <div className="absolute -left-16 -top-16 h-44 w-44 rounded-full bg-emerald-400/20 blur-3xl" />
            <div className="absolute -bottom-16 -right-16 h-52 w-52 rounded-full bg-indigo-400/20 blur-3xl" />
            <div className="relative aspect-video rounded-2xl bg-slate-950/80 ring-1 ring-white/15">
              {hasDemoVideo ? (
                <iframe
                  className="h-full w-full rounded-2xl"
                  src={DEMO_VIDEO_URL}
                  title="BarGAIN Demo Video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                  <p className="text-sm text-slate-300">Video de demo pendiente de publicacion.</p>
                  <p className="max-w-xl text-xs text-slate-400">
                    Configura VITE_DEMO_VIDEO_URL en el build para insertar un video real (YouTube/Vimeo/embed).
                  </p>
                  <a
                    href={withBase('docs')}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/20"
                  >
                    <PlayCircle className="h-5 w-5 text-emerald-300" /> Ver guion tecnico
                  </a>
                </div>
              )}
            </div>
          </div>
        </motion.section>

        <motion.section {...reveal} className="mx-auto w-full max-w-7xl px-6 pb-16 lg:px-10">
          <div className="grid gap-5 md:grid-cols-3">
            {walkthrough.map((item) => (
              <article key={item.title} className="rounded-3xl bg-slate-900/65 p-6 ring-1 ring-white/10">
                <div className="inline-flex rounded-xl bg-emerald-400/15 p-3 text-emerald-300">{item.icon}</div>
                <h3 className="mt-4 text-xl font-semibold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">{item.description}</p>
              </article>
            ))}
          </div>
        </motion.section>

        <motion.section {...reveal} className="mx-auto w-full max-w-7xl px-6 pb-16 lg:px-10">
          <div className="rounded-3xl bg-white/[0.03] p-7 ring-1 ring-white/10">
            <p className="text-xs uppercase tracking-[0.16em] text-indigo-300">System Blueprint</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">Arquitectura probada por dominios</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-900/70 p-5 ring-1 ring-white/10">
                <Cable className="h-5 w-5 text-indigo-300" />
                <p className="mt-3 text-sm font-semibold text-white">Frontend</p>
                <p className="mt-2 text-sm text-slate-300">React Native + Web para una experiencia consistente.</p>
              </div>
              <div className="rounded-2xl bg-slate-900/70 p-5 ring-1 ring-white/10">
                <ShieldCheck className="h-5 w-5 text-emerald-300" />
                <p className="mt-3 text-sm font-semibold text-white">Backend</p>
                <p className="mt-2 text-sm text-slate-300">Django + DRF modular con auth segura y APIs limpias.</p>
              </div>
              <div className="rounded-2xl bg-slate-900/70 p-5 ring-1 ring-white/10">
                <Database className="h-5 w-5 text-indigo-300" />
                <p className="mt-3 text-sm font-semibold text-white">Datos</p>
                <p className="mt-2 text-sm text-slate-300">PostGIS + Celery + scraping para decisiones en tiempo real.</p>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section {...reveal} className="mx-auto w-full max-w-7xl px-6 pb-16 lg:px-10">
          <div className="grid gap-4 rounded-3xl bg-gradient-to-r from-white/[0.04] via-white/[0.03] to-white/[0.02] p-7 ring-1 ring-white/10 md:grid-cols-3">
            {[
              ['$10M+', 'Ahorro acumulado proyectado'],
              ['25k+', 'Comercios potenciales'],
              ['99.9%', 'Uptime objetivo'],
            ].map(([value, label]) => (
              <div key={value} className="rounded-2xl bg-slate-900/60 p-5 ring-1 ring-white/10">
                <p className="text-3xl font-semibold tracking-tight text-emerald-300">{value}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.12em] text-slate-400">{label}</p>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section {...reveal} className="mx-auto w-full max-w-7xl px-6 pb-16 lg:px-10">
          <div className="grid gap-5 md:grid-cols-2">
            <article className="rounded-3xl bg-gradient-to-br from-emerald-400/20 to-emerald-700/15 p-7 ring-1 ring-emerald-300/25">
              <h3 className="text-2xl font-semibold tracking-tight text-white">Start Saving</h3>
              <p className="mt-3 text-sm text-emerald-50/90">Empieza como usuario y optimiza tu compra desde hoy.</p>
              <a href={withBase('login')} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-300 px-5 py-3 text-sm font-semibold text-emerald-950">
                Get the App <ArrowRight className="h-4 w-4" />
              </a>
            </article>
            <article className="rounded-3xl bg-gradient-to-br from-indigo-400/20 to-fuchsia-500/15 p-7 ring-1 ring-indigo-300/25">
              <h3 className="text-2xl font-semibold tracking-tight text-white">Scale Commerce</h3>
              <p className="mt-3 text-sm text-indigo-50/90">Activa tu canal PYME y publica precios/promociones con trazabilidad.</p>
              <div className="mt-6 flex flex-col items-start gap-3">
                <a href={withBase('onboarding')} className="inline-flex items-center gap-2 rounded-xl bg-indigo-200 px-5 py-3 text-sm font-semibold text-indigo-950">
                  Merchant Onboarding <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href={withBase('docs')}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/20"
                >
                  Merchant API Docs <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </article>
          </div>
        </motion.section>
      </main>
    </div>
  );
};

export default DemoPage;
