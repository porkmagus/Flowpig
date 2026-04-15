import { motion, useReducedMotion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  GitBranch,
  Inbox,
  Layers,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import { Link } from 'react-router';

const pillars: Array<{ icon: LucideIcon; title: string; description: string }> = [
  {
    icon: FileText,
    title: 'Docs tied to execution',
    description: 'Notes and specs stay linked to the work.',
  },
  {
    icon: Target,
    title: 'Issue tracking for momentum',
    description: 'Plan and prioritize without splitting the team.',
  },
  {
    icon: Clock3,
    title: 'Cycles and roadmap together',
    description: 'Move from planning to execution with less drift.',
  },
  {
    icon: Bot,
    title: 'AI where it helps',
    description: 'Draft issues and summarize context without gimmicks.',
  },
];

const workflow = [
  {
    eyebrow: 'Capture',
    title: 'Write once, keep context',
    description: 'Turn notes into living references.',
    points: ['Nested notes', 'Comments near work', 'Linked docs'],
  },
  {
    eyebrow: 'Coordinate',
    title: 'See what matters',
    description: 'Keep triage, inbox, and roadmap visible.',
    points: ['Unified inbox', 'Realtime activity', 'Cycles in one flow'],
  },
  {
    eyebrow: 'Ship',
    title: 'Plan to delivery faster',
    description: 'Make progress measurable.',
    points: ['Priority issues', 'Git context', 'Analytics'],
  },
];

const highlights = [
  { icon: Inbox, label: 'Inbox + notifications' },
  { icon: GitBranch, label: 'Git-aware execution' },
  { icon: MessageSquare, label: 'Comments and collaboration' },
  { icon: BarChart3, label: 'Analytics and velocity' },
  { icon: ShieldCheck, label: 'Workspace permissions' },
  { icon: Users, label: 'Team visibility' },
];

const previewCards = [
  {
    title: 'Release planning',
    meta: 'Roadmap',
    body: 'Line up initiatives and keep delivery tied to the work.',
  },
  {
    title: 'Cycle health',
    meta: 'Analytics',
    body: 'Track completion and velocity without extra tools.',
  },
  {
    title: 'Issue flow',
    meta: 'Execution',
    body: 'Triage, assign, and keep updates visible.',
  },
];

const heroSignals = [
  'Triage summarized into follow-up issues',
  'Roadmap linked to active cycle',
  'Specs, comments, and notes preserved',
];

const easeCurve = [0.22, 1, 0.36, 1] as const;

export default function IndexRoute() {
  const shouldReduceMotion = useReducedMotion();

  const heroContainer = {
    hidden: {},
    visible: {
      transition: { delayChildren: 0.08, staggerChildren: shouldReduceMotion ? 0 : 0.09 },
    },
  };

  const heroItem = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: easeCurve } },
  };

  const fadeUp = {
    initial: { opacity: 0, y: shouldReduceMotion ? 0 : 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.2 },
    transition: { duration: 0.5, ease: easeCurve },
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-linear-bg text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -left-24 -top-24 h-120 w-120 rounded-full bg-linear-accent/8 blur-3xl"
          animate={
            shouldReduceMotion ? undefined : { x: [0, 28, -10, 0], y: [0, 16, -12, 0], scale: [1, 1.08, 0.96, 1] }
          }
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -right-20 top-20 h-104 w-104 rounded-full bg-indigo-500/6 blur-3xl"
          animate={
            shouldReduceMotion ? undefined : { x: [0, -18, 12, 0], y: [0, 22, -10, 0], scale: [1, 0.94, 1.06, 1] }
          }
          transition={{ duration: 17, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-size-[88px_88px] opacity-[0.04]" />
      </div>

      <motion.header
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: easeCurve }}
        className="sticky top-0 z-40 border-b border-white/5 bg-linear-bg/75 backdrop-blur-xl"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
              <Layers className="h-5 w-5 text-linear-accent" />
            </div>
            <div>
              <div className="font-display text-lg font-semibold tracking-[-0.04em] text-white">Flowpig</div>
              <div className="text-[11px] uppercase tracking-[0.24em] text-linear-text-tertiary">
                Work that stays connected
              </div>
            </div>
          </Link>

          <div className="hidden items-center gap-8 text-sm text-white/60 md:flex">
            <a href="#product" className="transition hover:text-white">Product</a>
            <a href="#workflow" className="transition hover:text-white">Workflow</a>
            <a href="#proof" className="transition hover:text-white">Proof</a>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden rounded-lg border border-white/[0.06] bg-white/[0.03] px-4 py-2 text-sm font-medium text-white/72 transition hover:bg-white/[0.05] sm:inline-flex">
              Sign in
            </Link>
            <Link to="/signup" className="inline-flex items-center gap-2 rounded-lg bg-linear-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-linear-accent-hover">
              Start free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </motion.header>

      <main className="relative z-10">
        <section className="mx-auto grid max-w-7xl gap-14 px-5 pb-20 pt-16 sm:px-8 md:pb-28 md:pt-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-10 lg:pt-24">
          <motion.div variants={heroContainer} initial="hidden" animate="visible" className="max-w-3xl">
            <motion.div variants={heroItem} className="inline-flex items-center gap-2 rounded-lg border border-linear-accent/15 bg-linear-accent/8 px-3 py-1.5 text-sm text-linear-accent">
              <Sparkles className="h-4 w-4" />
              Docs, issues, and planning in one workspace
            </motion.div>
            <motion.h1 variants={heroItem} className="font-display mt-6 text-5xl font-semibold leading-[1.05] tracking-[-0.06em] text-white sm:text-6xl lg:text-7xl">
              Calm execution for focused teams.
            </motion.h1>
            <motion.p variants={heroItem} className="mt-5 max-w-xl text-lg leading-8 text-linear-text-secondary">
              One workspace for notes, issues, and planning. Less noise, clearer progress.
            </motion.p>
            <motion.div variants={heroItem} className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link to="/signup" className="inline-flex items-center justify-center gap-2 rounded-lg bg-linear-accent px-6 py-3.5 text-base font-semibold text-white transition hover:bg-linear-accent-hover">
                Create a workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.18, ease: easeCurve }} className="relative">
            <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-linear-accent/10 to-indigo-500/5 blur-3xl" />
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                <div className="text-sm font-medium text-white/80">Workspace overview</div>
                <div className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-widest text-white/50">Live</div>
              </div>
              <div className="mt-5 space-y-3">
                {heroSignals.map((signal, index) => (
                  <motion.div
                    key={signal}
                    initial={{ opacity: 0, x: shouldReduceMotion ? 0 : 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.3 + index * 0.1, ease: easeCurve }}
                    className="flex items-start gap-3 rounded-xl border border-white/[0.05] bg-black/20 px-4 py-3"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-linear-accent" />
                    <div className="text-sm text-white/65">{signal}</div>
                  </motion.div>
                ))}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {highlights.slice(0, 4).map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2 text-xs text-white/55">
                    <Icon className="h-3.5 w-3.5 text-linear-accent" />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        <section id="proof" className="mx-auto grid max-w-7xl gap-5 px-5 pb-8 sm:px-8 lg:grid-cols-3">
          {previewCards.map((card, index) => (
            <motion.div
              key={card.title}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: index * 0.06 }}
              whileHover={shouldReduceMotion ? undefined : { y: -4 }}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur-sm"
            >
              <div className="text-xs uppercase tracking-[0.24em] text-white/40">{card.meta}</div>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">{card.title}</h2>
              <p className="mt-3 max-w-md text-sm leading-7 text-white/60">{card.body}</p>
            </motion.div>
          ))}
        </section>

        <section id="product" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <motion.div {...fadeUp} className="max-w-2xl">
            <div className="text-sm font-medium uppercase tracking-[0.24em] text-linear-accent/70">Product pillars</div>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
              Coherent before feature-rich.
            </h2>
            <p className="mt-4 text-lg leading-8 text-white/60">
              Notes, issues, roadmap, cycles, and AI—made to feel unified, fast, and obvious.
            </p>
          </motion.div>

          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            {pillars.map(({ icon: Icon, title, description }, index) => (
              <motion.div
                key={title}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: index * 0.05 }}
                whileHover={shouldReduceMotion ? undefined : { y: -3 }}
                className="group rounded-2xl border border-white/[0.06] bg-white/[0.03] p-7 transition hover:border-white/[0.10] hover:bg-white/[0.04]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-linear-accent/20 bg-linear-accent/10">
                  <Icon className="h-5 w-5 text-linear-accent" />
                </div>
                <h3 className="mt-5 text-2xl font-semibold tracking-tight text-white">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-white/60">{description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="workflow" className="border-y border-white/5 bg-white/[0.02]">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
            <motion.div {...fadeUp} className="max-w-2xl">
              <div className="text-sm font-medium uppercase tracking-[0.24em] text-linear-accent/70">Workflow</div>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
                Better flow, fewer tabs.
              </h2>
              <p className="mt-4 text-lg leading-8 text-white/60">
                Keep context tight from the first note to the final release.
              </p>
            </motion.div>

            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {workflow.map((step, index) => (
                <motion.div
                  key={step.title}
                  {...fadeUp}
                  transition={{ ...fadeUp.transition, delay: index * 0.06 }}
                  whileHover={shouldReduceMotion ? undefined : { y: -3 }}
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur-sm"
                >
                  <div className="text-xs uppercase tracking-[0.26em] text-linear-accent/70">{step.eyebrow}</div>
                  <h3 className="mt-4 text-2xl font-semibold tracking-tight text-white">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-white/60">{step.description}</p>
                  <div className="mt-6 space-y-3">
                    {step.points.map((point) => (
                      <div key={point} className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-linear-accent" />
                        <span className="text-sm leading-6 text-white/70">{point}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <motion.div {...fadeUp} className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] p-8 sm:p-10">
            <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
              <div>
                <div className="text-sm font-medium uppercase tracking-[0.24em] text-linear-accent/70">Ready</div>
                <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
                  Start with the product your team wants to use.
                </h2>
                <p className="mt-4 max-w-lg text-lg leading-8 text-white/60">
                  A calmer front door to a workspace built for product, design, and engineering.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Link to="/signup" className="rounded-xl border border-linear-accent/20 bg-linear-accent-light px-6 py-6 transition hover:border-linear-accent/35 hover:bg-linear-accent/12">
                  <div className="text-sm font-medium uppercase tracking-[0.22em] text-white/55">Start free</div>
                  <div className="font-display mt-3 text-2xl font-semibold tracking-[-0.05em] text-white">Create your workspace</div>
                  <div className="mt-3 flex items-center gap-2 text-sm font-medium text-linear-accent">
                    Get into the app
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>

                <Link to="/login" className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-6 py-6 text-white transition hover:border-white/[0.10] hover:bg-white/[0.05]">
                  <div className="text-sm font-medium uppercase tracking-[0.22em] text-white/45">Existing team</div>
                  <div className="font-display mt-3 text-2xl font-semibold tracking-[-0.05em]">Jump back in</div>
                  <div className="mt-3 flex items-center gap-2 text-sm font-medium text-white/75">
                    Sign in
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>
              </div>
            </div>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
