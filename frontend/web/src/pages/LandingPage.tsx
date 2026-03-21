import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Bot,
  Building2,
  ChartLine,
  CircleDollarSign,
  Coins,
  DatabaseZap,
  Globe,
  Layers,
  MapPinned,
  Rocket,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
} from 'lucide-react';

type BentoFeature = {
  icon: React.ReactNode;
  title: string;
  description: string;
  metric: string;
};

const navItems = [
  { label: 'Producto', href: '#producto' },
  { label: 'Arquitectura', href: '#arquitectura' },
  { label: 'Demo', href: '/demo' },
  { label: 'Impacto', href: '#impacto' },
  { label: 'Comercios', href: '#comercios' },
];

const trustLogos = ['Django', 'PostGIS', 'React Native', 'Expo', 'Celery', 'OR-Tools'];

const bentoFeatures: BentoFeature[] = [
  {
    icon: <CircleDollarSign className="h-5 w-5" />,
    title: 'Ahorro multicesta en tiempo real',
    description:
      'Compara precios por producto entre supermercados y tiendas locales con histórico y alertas.',
    metric: 'Hasta 27% de ahorro mensual',
  },
  {
    icon: <MapPinned className="h-5 w-5" />,
    title: 'Rutas optimizadas precio-distancia-tiempo',
    description:
      'Motor geoespacial con scoring ponderado para encontrar la mejor combinación de paradas.',
    metric: 'Top-3 rutas en segundos',
  },
  {
    icon: <Bot className="h-5 w-5" />,
    title: 'Asistente IA orientado a compra',
    description:
      'Ayuda contextual con recomendaciones inteligentes y soporte para listas del usuario.',
    metric: 'Consultas relevantes y accionables',
  },
  {
    icon: <Store className="h-5 w-5" />,
    title: 'Portal PYME con control de precios',
    description:
      'Los comercios gestionan promociones, compiten con grandes cadenas y mejoran visibilidad.',
    metric: 'Canal directo con clientes cercanos',
  },
];

const architectureBlocks = [
  {
    title: 'Frontend Multiplataforma',
    description: 'React Native + Expo para mobile y React web companion con estado centralizado.',
    icon: <Layers className="h-5 w-5" />,
  },
  {
    title: 'Backend Escalable',
    description: 'Django + DRF + JWT con módulos desacoplados por dominio de negocio.',
    icon: <ShieldCheck className="h-5 w-5" />,
  },
  {
    title: 'Datos + Procesamiento',
    description: 'PostgreSQL/PostGIS + Celery/Redis + scraping/OCR para datos actualizados.',
    icon: <DatabaseZap className="h-5 w-5" />,
  },
];

const stats = [
  { label: 'Ahorro proyectado', value: '10M€+' },
  { label: 'Comercios potenciales', value: '25k+' },
  { label: 'Disponibilidad objetivo', value: '99.9%' },
  { label: 'Tiempo medio de optimizacion', value: '< 5s' },
];

const testimonials = [
  {
    quote:
      'BarGAIN convierte una lista normal en una estrategia de ahorro real. Ves claramente donde comprar cada producto.',
    author: 'Marta Ruiz',
    role: 'Usuario beta · Sevilla',
  },
  {
    quote:
      'Como comercio local, nos da herramientas para competir con cadenas grandes sin perder margen ni visibilidad.',
    author: 'Carlos Vera',
    role: 'Gerente PYME · Dos Hermanas',
  },
];

const revealProps = {
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.7, ease: 'easeOut' },
} as const;

const withBase = (path: string): string => `${import.meta.env.BASE_URL}${path}`;

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#060a12] text-slate-100 antialiased">
      <div className="fixed inset-0 -z-10 opacity-80">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(16,185,129,0.18),transparent_32%),radial-gradient(circle_at_80%_8%,rgba(99,102,241,0.22),transparent_34%),radial-gradient(circle_at_55%_84%,rgba(59,130,246,0.14),transparent_28%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(4,8,16,0.66),rgba(2,6,12,0.98))]" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
          <a href="#top" className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-400/20 text-emerald-300">
              <Coins className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">BarGAIN</span>
          </a>
          <nav className="hidden items-center gap-8 text-sm text-slate-300 lg:flex">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="transition hover:text-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <a
              href={withBase('login')}
              className="hidden rounded-xl bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10 lg:inline-flex"
            >
              Area negocio
            </a>
            <a
              href="#cta"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 shadow-[0_0_35px_rgba(16,185,129,0.25)] transition hover:from-emerald-300 hover:to-emerald-400"
            >
              Empieza gratis <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </header>

      <main id="top">
        <motion.section
          {...revealProps}
          className="mx-auto grid w-full max-w-7xl gap-10 px-6 pb-24 pt-16 lg:grid-cols-[1.15fr_0.85fr] lg:px-10 lg:pt-24"
        >
          <div className="space-y-7">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              Compra inteligente para personas y comercios
            </span>
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-[-0.03em] text-white sm:text-5xl lg:text-6xl">
              Ahorro real para usuarios. Infraestructura seria para escalar el retail local.
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-slate-300">
              BarGAIN combina comparacion de precios, geolocalizacion y optimizacion multicriterio para
              decidir donde comprar mejor. Al mismo tiempo, ofrece a las PYMEs un portal robusto para
              competir con inteligencia y visibilidad.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <a
                href={withBase('demo')}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-500 px-6 py-3 text-sm font-semibold text-emerald-950 transition hover:brightness-110"
              >
                Ver demo <Rocket className="h-4 w-4" />
              </a>
              <a
                href="#arquitectura"
                className="inline-flex items-center gap-2 rounded-2xl bg-white/5 px-6 py-3 text-sm font-semibold text-slate-100 ring-1 ring-white/15 transition hover:bg-white/10"
              >
                Explorar arquitectura <Globe className="h-4 w-4" />
              </a>
            </div>
          </div>

          <motion.div
            whileHover={{ y: -6 }}
            transition={{ duration: 0.3 }}
            className="relative overflow-hidden rounded-3xl bg-slate-900/60 p-6 ring-1 ring-white/10 backdrop-blur"
          >
            <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl" />
            <div className="absolute -bottom-24 -left-14 h-52 w-52 rounded-full bg-emerald-400/20 blur-3xl" />
            <div className="relative space-y-6">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-emerald-300">Pulse BarGAIN</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight">+18.4% eficiencia de compra</p>
              </div>
              <div className="space-y-3">
                {['Ahorro potencial', 'Distancia total', 'Tiempo estimado'].map((item, index) => (
                  <div
                    key={item}
                    className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10"
                  >
                    <span className="text-sm text-slate-300">{item}</span>
                    <span className="text-sm font-semibold text-emerald-300">
                      {index === 0 ? '42.70 EUR' : index === 1 ? '5.8 km' : '41 min'}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-slate-400">
                Datos de ejemplo para demo comercial. El motor real utiliza scoring configurable por el
                usuario y ranking de rutas optimas.
              </p>
            </div>
          </motion.div>
        </motion.section>

        <section className="mx-auto w-full max-w-7xl px-6 pb-24 lg:px-10">
          <p className="mb-6 text-xs uppercase tracking-[0.2em] text-slate-400">Stack validado en produccion</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {trustLogos.map((logo) => (
              <div
                key={logo}
                className="rounded-2xl bg-white/[0.03] px-4 py-4 text-center text-sm font-medium text-slate-300 ring-1 ring-white/10"
              >
                {logo}
              </div>
            ))}
          </div>
        </section>

        <motion.section {...revealProps} id="producto" className="mx-auto w-full max-w-7xl px-6 pb-24 lg:px-10">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Producto</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white lg:text-4xl">
                Bento interactivo para mostrar valor en 20 segundos
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-relaxed text-slate-400">
              Cada bloque comunica una capacidad esencial del producto, combinando claridad comercial y
              señal tecnica para inversores, tutores o partners.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {bentoFeatures.map((feature, index) => (
              <motion.article
                key={feature.title}
                whileHover={{ y: -8, scale: 1.01 }}
                transition={{ duration: 0.25 }}
                className="group relative overflow-hidden rounded-3xl bg-slate-900/65 p-7 ring-1 ring-white/10"
              >
                <div className="absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100">
                  <div className="absolute -right-20 -top-16 h-48 w-48 rounded-full bg-emerald-400/20 blur-3xl" />
                  <div className="absolute -bottom-20 -left-12 h-40 w-40 rounded-full bg-indigo-400/20 blur-3xl" />
                </div>
                <div className="relative space-y-4">
                  <div className="inline-flex rounded-xl bg-emerald-400/15 p-3 text-emerald-300">{feature.icon}</div>
                  <h3 className="text-xl font-semibold tracking-tight text-white">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-300">{feature.description}</p>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-300">
                    {feature.metric}
                  </p>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${65 + index * 10}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.1, delay: 0.2 }}
                      className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-indigo-300"
                    />
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </motion.section>

        <motion.section
          {...revealProps}
          id="arquitectura"
          className="mx-auto grid w-full max-w-7xl gap-8 px-6 pb-24 lg:grid-cols-[1.05fr_0.95fr] lg:px-10"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-indigo-300">Arquitectura</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white lg:text-4xl">
              Diseno modular para pasar de TFG a plataforma real
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300">
              La arquitectura separa claramente captura de datos, procesamiento, API y experiencia de
              usuario. Esto facilita evolucion por fases, testing incremental y mantenibilidad.
            </p>
            <div className="mt-8 space-y-4">
              {architectureBlocks.map((block) => (
                <div
                  key={block.title}
                  className="rounded-2xl bg-white/[0.03] p-5 ring-1 ring-white/10 transition hover:bg-white/[0.05]"
                >
                  <div className="mb-3 inline-flex rounded-lg bg-indigo-400/20 p-2.5 text-indigo-200">
                    {block.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-white">{block.title}</h3>
                  <p className="mt-2 text-sm text-slate-300">{block.description}</p>
                </div>
              ))}
            </div>
          </div>

          <motion.div
            whileInView={{ opacity: 1, x: 0 }}
            initial={{ opacity: 0, x: 24 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative overflow-hidden rounded-3xl bg-slate-900/65 p-6 ring-1 ring-white/10"
          >
            <p className="mb-4 text-xs uppercase tracking-[0.2em] text-slate-400">Mapa abstracto de flujos</p>
            <svg viewBox="0 0 500 340" className="h-full w-full">
              <defs>
                <linearGradient id="routeA" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#818cf8" />
                </linearGradient>
                <linearGradient id="routeB" x1="0" y1="1" x2="1" y2="0">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
              {[...Array(8)].map((_, i) => (
                <circle
                  key={`node-${i}`}
                  cx={60 + (i % 4) * 120}
                  cy={70 + Math.floor(i / 4) * 180}
                  r="7"
                  fill="rgba(148,163,184,0.5)"
                />
              ))}
              <motion.path
                d="M60 70 C150 20, 260 160, 380 60"
                fill="none"
                stroke="url(#routeA)"
                strokeWidth="4"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.6, ease: 'easeInOut' }}
              />
              <motion.path
                d="M60 250 C180 180, 280 320, 420 220"
                fill="none"
                stroke="url(#routeB)"
                strokeWidth="4"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.8, delay: 0.25, ease: 'easeInOut' }}
              />
              <motion.path
                d="M180 70 C210 140, 280 180, 300 250"
                fill="none"
                stroke="rgba(196,181,253,0.7)"
                strokeWidth="3"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, delay: 0.6, ease: 'easeInOut' }}
              />
            </svg>
            <div className="mt-3 flex items-center gap-3 text-xs text-slate-300">
              <ChartLine className="h-4 w-4 text-emerald-300" />
              Trazado de rutas y flujo de datos en tiempo de ejecucion
            </div>
          </motion.div>
        </motion.section>

        <motion.section {...revealProps} id="impacto" className="mx-auto w-full max-w-7xl px-6 pb-24 lg:px-10">
          <div className="grid gap-4 rounded-3xl bg-gradient-to-r from-white/[0.04] via-white/[0.03] to-white/[0.02] p-7 ring-1 ring-white/10 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl bg-slate-900/60 p-5 ring-1 ring-white/10">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-400">{stat.label}</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-emerald-300">{stat.value}</p>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section {...revealProps} className="mx-auto w-full max-w-7xl px-6 pb-24 lg:px-10">
          <div className="grid gap-5 md:grid-cols-2">
            {testimonials.map((testimonial) => (
              <article key={testimonial.author} className="rounded-3xl bg-slate-900/65 p-7 ring-1 ring-white/10">
                <p className="text-base leading-relaxed text-slate-200">{testimonial.quote}</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-400/20 text-emerald-300">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{testimonial.author}</p>
                    <p className="text-xs text-slate-400">{testimonial.role}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </motion.section>

        <motion.section {...revealProps} id="cta" className="mx-auto w-full max-w-7xl px-6 pb-24 lg:px-10">
          <div className="grid gap-5 md:grid-cols-2" id="comercios">
            <article className="rounded-3xl bg-gradient-to-br from-emerald-400/20 to-emerald-700/15 p-7 ring-1 ring-emerald-300/30">
              <p className="text-xs uppercase tracking-[0.15em] text-emerald-300">Para usuarios</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">Empieza a ahorrar hoy</h3>
              <p className="mt-3 text-sm leading-relaxed text-emerald-50/85">
                Crea tu lista, compara rutas y decide con datos reales de precio, distancia y tiempo.
              </p>
              <a
                href={withBase('demo')}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-300 px-5 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-200"
              >
                Acceder <ArrowRight className="h-4 w-4" />
              </a>
            </article>

            <article className="rounded-3xl bg-gradient-to-br from-indigo-400/20 to-fuchsia-500/15 p-7 ring-1 ring-indigo-300/25">
              <p className="text-xs uppercase tracking-[0.15em] text-indigo-200">Para comercios</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                Activa tu escaparate inteligente
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-indigo-50/85">
                Publica precios y promociones, aumenta conversion local y analiza competitividad en tu zona.
              </p>
              <a
                href={withBase('onboarding')}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-200 px-5 py-3 text-sm font-semibold text-indigo-950 transition hover:bg-indigo-100"
              >
                Entrar como PYME <Building2 className="h-4 w-4" />
              </a>
            </article>
          </div>
        </motion.section>
      </main>

      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 text-sm text-slate-400 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <p>BarGAIN · Smart grocery optimization platform</p>
          <div className="flex flex-wrap items-center gap-5">
            <a href="#top" className="transition hover:text-emerald-300">
              Inicio
            </a>
            <a href="#arquitectura" className="transition hover:text-emerald-300">
              Arquitectura
            </a>
            <a href="https://github.com/QHX0329/bargain-tfg/dashboard.html" className="transition hover:text-emerald-300">
              Demo tecnica
            </a>
            <a href="mailto:nicolasparrillageniz@gmail.com" className="transition hover:text-emerald-300">
              Contacto
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
