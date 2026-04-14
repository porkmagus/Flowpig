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
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import { Link } from 'react-router';

const pillars: Array<{ icon: LucideIcon; title: string; description: string }> = [
  {
    icon: FileText,
    title: 'Docs that stay connected to execution',
    description:
      'Capture specs, meeting notes, and decisions without losing the thread back to the work.',
  },
  {
    icon: Target,
    title: 'Issue tracking built for momentum',
    description:
      'Plan issues, triage work, and keep priorities visible without splitting the team across tools.',
  },
  {
    icon: Clock3,
    title: 'Cycles, roadmap, and delivery in one view',
    description:
      'Move from long-range planning to weekly execution with fewer handoffs and less drift.',
  },
  {
    icon: Bot,
    title: 'AI where it actually helps',
    description:
      'Generate issue drafts, summarize context, and assist with planning without turning the product into a gimmick.',
  },
];

const workflow = [
  {
    eyebrow: 'Capture',
    title: 'Write once, keep context attached',
    description:
      'Turn notes, decisions, and specs into living references that stay close to execution.',
    points: ['Nested notes with history', 'Comments near the work', 'Docs linked into plans'],
  },
  {
    eyebrow: 'Coordinate',
    title: 'See what matters without chasing updates',
    description:
      'Keep triage, inbox, and roadmap changes visible across the workspace in real time.',
    points: ['Unified inbox', 'Realtime activity', 'Roadmap and cycles in one flow'],
  },
  {
    eyebrow: 'Ship',
    title: 'Move from planning to delivery faster',
    description: 'Make progress measurable with analytics, Git context, and clearer ownership.',
    points: ['Priority-driven issues', 'Git-aware execution', 'Analytics for follow-through'],
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
    body: 'Line up initiatives, attach specs, and keep delivery tied to the work itself.',
  },
  {
    title: 'Cycle health',
    meta: 'Analytics',
    body: 'Track completion, drift, and velocity without jumping into another reporting tool.',
  },
  {
    title: 'Issue flow',
    meta: 'Execution',
    body: 'Triage incoming work, assign owners, and keep updates visible as the team moves.',
  },
];

const heroStats = [
  { value: '1 workspace', label: 'docs, issues, planning, and AI' },
  { value: 'Realtime', label: 'shared context across the team' },
  { value: 'Fewer tabs', label: 'clearer execution by default' },
];

const heroSignals = [
  'Triage thread summarized into three follow-up issues',
  'Roadmap initiative linked to the active cycle automatically',
  'Specs, comments, and delivery notes preserved in one place',
];

const heroRail = [
  'Cycle health refreshed',
  'Triage summary drafted',
  'New roadmap signal linked',
  'Issue owners synced',
];

const heroBadges = [
  {
    title: 'Cycle pulse',
    body: 'Burndown and roadmap drift updated live',
    className: 'hidden lg:block absolute -right-4 top-10 w-52',
  },
  {
    title: 'AI assist',
    body: 'Follow-up issues drafted from notes',
    className: 'hidden lg:block absolute -left-8 bottom-12 w-48',
  },
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
          className="absolute -left-24 -top-24 h-120 w-120 rounded-full bg-linear-accent/10 blur-3xl"
          animate={
            shouldReduceMotion ? undefined : { x: [0, 28, -10, 0], y: [0, 16, -12, 0], scale: [1, 1.08, 0.96, 1] }
          }

          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -right-20 top-20 h-104 w-104 rounded-full bg-cyan-300/10 blur-3xl"
          animate={
            shouldReduceMotion ? undefined : { x: [0, -18, 12, 0], y: [0, 22, -10, 0], scale: [1, 0.94, 1.06, 1] }
          }
          transition={{ duration: 17, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-size-[88px_88px] opacity-[0.06]" />
      </div>

      <motion.header
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: easeCurve }}
        className="sticky top-0 z-40 border-b border-white/5 bg-linear-bg/80 backdrop-blur-xl"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/6">
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
            <Link to="/login" className="hidden rounded-md border border-white/8 bg-white/5 px-4 py-2 text-sm font-medium text-white/72 transition hover:bg-white/8 sm:inline-flex">
              Sign in
            </Link>
            <Link to="/signup" className="inline-flex items-center gap-2 rounded-md bg-linear-accent px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-105">
              Start free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
        <div className="h-px bg-linear-to-r from-linear-accent/70 via-cyan-300/50 to-emerald-300/60" />
      </motion.header>

      <main className="relative z-10">
        <section className="mx-auto grid max-w-7xl gap-14 px-5 pb-18 pt-18 sm:px-8 md:pb-24 md:pt-22 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-10 lg:pt-26">
          <motion.div variants={heroContainer} initial="hidden" animate="visible" className="max-w-3xl">

            <motion.div variants={heroItem} className="inline-flex items-center gap-2 rounded-md border border-linear-accent/18 bg-linear-accent/8 px-3 py-1.5 text-sm text-linear-accent">
              <Sparkles className="h-4 w-4" />
              Docs, issues, planning, and AI in one product workspace
            </motion.div>
            <motion.h1 variants={heroItem} className="font-display mt-7 text-5xl font-semibold leading-none tracking-[-0.07em] text-white sm:text-6xl lg:text-7xl">
              Calm execution for teams tired of fractured tools.
            </motion.h1>
            <motion.p variants={heroItem} className="mt-7 max-w-2xl text-lg leading-8 text-linear-text-secondary sm:text-xl">
              Flowpig brings product planning, documentation, triage, cycles, and AI assistance into one connected workspace so the whole team can move with more context and less drag.
            </motion.p>
            <motion.div variants={heroItem} className="mt-9 flex flex-col gap-4 sm:flex-row">
              <Link to="/signup" className="inline-flex items-center justify-center gap-2 rounded-md bg-linear-accent px-6 py-3.5 text-base font-semibold text-slate-950 transition hover:brightness-105">
                Create a workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#proof" className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 bg-white/4 px-6 py-3.5 text-base font-medium text-white/78 transition hover:bg-white/8">
                Open live preview
                <PlayCircle className="h-4 w-4" />
              </a>
            </motion.div>
            <motion.div variants={heroItem} className="mt-10 grid gap-4 border-t border-white/8 pt-8 sm:grid-cols-3">
              {heroStats.map((stat) => (
                <div key={stat.value}>
                  <div className="font-display text-3xl font-semibold tracking-[-0.05em] text-white">{stat.value}</div>
                  <div className="mt-2 text-sm leading-6 text-linear-text-tertiary">{stat.label}</div>
                </div>
              ))}
            </motion.div>

            <motion.div
              variants={heroItem}
              className="mt-8 border border-white/10 bg-white/4"
            >
              <div className="grid gap-2 px-3 py-3 sm:grid-cols-2">
                {heroRail.map((item) => (
                  <div
                    key={item}
                    className="inline-flex items-center gap-2 rounded-md border border-white/8 bg-[#0b1320] px-3 py-2 text-xs font-medium uppercase tracking-[0.16em] text-white/64"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                    {item}
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>


          <motion.div initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.18, ease: easeCurve }} className="relative">
            <div className="absolute inset-0 rounded-xl bg-linear-to-br from-linear-accent/18 via-cyan-300/10 to-emerald-300/12 blur-3xl" />
            {heroBadges.map((badge, index) => (
              <motion.div
                key={badge.title}
                className={badge.className}
                initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.55 + index * 0.1, ease: easeCurve }}
              >
                <div className="rounded-lg border border-white/10 bg-[#0c1521]/88 px-4 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.25)] backdrop-blur-lg">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-linear-accent/80">{badge.title}</div>
                  <div className="mt-2 text-sm leading-6 text-white/76">{badge.body}</div>
                </div>
              </motion.div>
            ))}
            <motion.div
              className="relative overflow-hidden rounded-xl border border-white/10 bg-[#09111d]/92 p-5 shadow-[0_20px_90px_rgba(0,0,0,0.32)] backdrop-blur-xl"
            >
              <motion.div
                className="absolute inset-x-0 top-0 h-24 bg-linear-to-r from-linear-accent/14 via-cyan-300/12 to-transparent"
                initial={{ opacity: 0.35, scaleX: 0.92 }}
                animate={{ opacity: 0.75, scaleX: 1 }}
                transition={{ duration: 1.4, ease: easeCurve }}
              />
              <div className="flex items-center justify-between border-b border-white/8 pb-4">
                <div>
                  <div className="text-sm font-medium uppercase tracking-[0.24em] text-linear-accent/76">Active workspace</div>
                  <div className="font-display mt-2 text-2xl font-semibold tracking-[-0.05em] text-white">Product launch command center</div>
                </div>
                <div className="rounded-md border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-medium text-emerald-200">Live updates</div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-lg border border-white/8 bg-white/3 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-[0.24em] text-white/44">Today</div>
                      <div className="mt-2 text-lg font-semibold text-white">Launch readiness is visible without chasing updates.</div>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-linear-accent/20 bg-linear-accent/10">
                      <BarChart3 className="h-5 w-5 text-linear-accent" />
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">

                    {heroSignals.map((signal, index) => (
                      <motion.div
                        key={signal}
                        initial={{ opacity: 0, x: shouldReduceMotion ? 0 : 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.45, delay: 0.45 + index * 0.1, ease: easeCurve }}
                        whileHover={shouldReduceMotion ? undefined : { x: 3 }}
                        className="flex items-start gap-3 rounded-lg border border-white/7 bg-[#0d1725] px-4 py-3"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" />
                        <div className="text-sm leading-6 text-white/72">{signal}</div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-lg border border-white/8 bg-[#0b1320] p-5">
                    <div className="flex items-center justify-between">
                      <div className="text-xs uppercase tracking-[0.24em] text-white/42">Workspace layers</div>
                      <Sparkles className="h-4 w-4 text-linear-accent" />
                    </div>
                    <div className="mt-4 grid gap-3">
                      {highlights.map(({ icon: Icon, label }) => (
                        <motion.div
                          key={label}
                          whileHover={shouldReduceMotion ? undefined : { x: 2, borderColor: 'rgba(255,255,255,0.14)' }}
                          className="flex items-center gap-3 rounded-lg border border-white/7 bg-white/3 px-4 py-3 text-sm text-white/74"
                        >
                          <Icon className="h-4 w-4 text-linear-accent" />
                          {label}
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <motion.div
                    whileHover={shouldReduceMotion ? undefined : { y: -2 }}
                    className="rounded-lg border border-cyan-300/12 bg-linear-to-br from-cyan-300/12 via-white/4 to-emerald-300/10 p-5"
                  >
                    <div className="flex items-center gap-3 text-sm font-medium text-cyan-100">
                      <PlayCircle className="h-4 w-4" />
                      Open live demo
                    </div>
                    <p className="mt-3 text-sm leading-6 text-white/74">
                      See how docs, issues, team updates, and roadmap decisions stay linked in one system instead of drifting across disconnected apps.
                    </p>
                    <a href="#workflow" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white">
                      Explore the product canvas
                      <ChevronRight className="h-4 w-4" />
                    </a>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </section>

        <section id="proof" className="mx-auto grid max-w-7xl gap-5 px-5 pb-8 sm:px-8 lg:grid-cols-3">
          {previewCards.map((card, index) => (
            <motion.div

              key={card.title}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: index * 0.06 }}
              whileHover={shouldReduceMotion ? undefined : { y: -4 }}
              className="rounded-lg border border-white/6 bg-white/2 p-6"
            >
              <motion.div
                className="mb-5 h-px origin-left bg-linear-to-r from-linear-accent/80 via-cyan-300/50 to-transparent"
                initial={{ scaleX: 0.35, opacity: 0.45 }}
                whileInView={{ scaleX: 1, opacity: 1 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.6, delay: index * 0.08, ease: easeCurve }}
              />
              <div className="text-xs uppercase tracking-[0.24em] text-white/42">{card.meta}</div>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">{card.title}</h2>
              <p className="mt-3 max-w-md text-sm leading-7 text-white/62">{card.body}</p>
            </motion.div>
          ))}
        </section>

        <section id="product" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <motion.div {...fadeUp} className="max-w-3xl">
            <div className="text-sm font-medium uppercase tracking-[0.24em] text-linear-accent/72">Product pillars</div>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
              World-class tools feel coherent before they feel feature-rich.
            </h2>
            <p className="mt-5 text-lg leading-8 text-white/64">
              Flowpig already spans notes, issues, roadmap, cycles, AI, and analytics. The opportunity is to make that breadth feel unified, fast, and obvious from the first screen onward.
            </p>
          </motion.div>

          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            {pillars.map(({ icon: Icon, title, description }, index) => (
              <motion.div

                key={title}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: index * 0.05 }}
                whileHover={shouldReduceMotion ? undefined : { y: -3 }}
                className="group rounded-lg border border-white/6 bg-white/2 p-7 transition hover:border-white/10 hover:bg-white/4"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-md border border-linear-accent/20 bg-linear-accent/10">
                  <Icon className="h-5 w-5 text-linear-accent" />
                </div>
                <h3 className="mt-5 text-2xl font-semibold tracking-tight text-white">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-white/62">{description}</p>
                <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-white/76">
                  Built for product, design, and engineering
                  <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="workflow" className="border-y border-white/5 bg-white/2">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
            <motion.div {...fadeUp} className="max-w-3xl">
              <div className="text-sm font-medium uppercase tracking-[0.24em] text-emerald-200/72">Workflow</div>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
                The best teams do not need more tabs. They need better flow.
              </h2>

              <p className="mt-5 text-lg leading-8 text-white/64">
                Keep context tight from the first note to the final release without forcing everyone to rebuild the same picture in separate systems.
              </p>
            </motion.div>

            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {workflow.map((step, index) => (
                <motion.div
                  key={step.title}
                  {...fadeUp}
                  transition={{ ...fadeUp.transition, delay: index * 0.06 }}
                  whileHover={shouldReduceMotion ? undefined : { y: -3 }}
                  className="rounded-lg border border-white/10 bg-[#081018] p-6"
                >
                  <div className="text-xs uppercase tracking-[0.26em] text-emerald-200/68">{step.eyebrow}</div>
                  <h3 className="mt-4 text-2xl font-semibold tracking-tight text-white">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-white/62">{step.description}</p>
                  <div className="mt-6 space-y-3">
                    {step.points.map((point) => (
                      <div key={point} className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" />
                        <span className="text-sm leading-6 text-white/72">{point}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}

            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <motion.div {...fadeUp} className="overflow-hidden rounded-xl border border-white/6 bg-linear-to-br from-linear-accent/10 via-white/3 to-emerald-300/8 p-8 sm:p-10">
            <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
              <div>
                <div className="text-sm font-medium uppercase tracking-[0.24em] text-linear-accent/72">Ready to go deeper</div>
                <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
                  Start with the product your team already wants to use.
                </h2>
                <p className="mt-5 max-w-xl text-lg leading-8 text-white/68">
                  This polish pass upgrades the front door. From here, the highest-value next steps are onboarding, issue detail quality, and resolving the wider typecheck drift already present in the app.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Link to="/signup" className="rounded-xl border border-linear-accent/25 bg-linear-accent-light px-6 py-6 text-linear-text transition hover:border-linear-accent/40 hover:bg-linear-accent/15">
                  <div className="text-sm font-medium uppercase tracking-[0.22em] text-linear-text-tertiary">Start free</div>
                  <div className="font-display mt-3 text-2xl font-semibold tracking-[-0.05em]">Create your workspace</div>
                  <div className="mt-3 flex items-center gap-2 text-sm font-medium text-linear-accent">
                    Get into the app
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>


                <Link to="/login" className="rounded-xl border border-white/6 bg-white/3 px-6 py-6 text-white transition hover:border-white/12 hover:bg-white/6">
                  <div className="text-sm font-medium uppercase tracking-[0.22em] text-white/45">Existing team</div>
                  <div className="font-display mt-3 text-2xl font-semibold tracking-[-0.05em]">Jump back in</div>
                  <div className="mt-3 flex items-center gap-2 text-sm font-medium text-white/74">
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
