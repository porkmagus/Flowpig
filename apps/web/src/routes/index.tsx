import { Link } from 'react-router';
import { motion } from 'framer-motion';
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

const pillars: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
}> = [
  {
    icon: FileText,
    title: 'Docs that stay connected to execution',
    description:
      'Capture specs, meeting notes, decisions, and page history without losing the thread back to the work.',
  },
  {
    icon: Target,
    title: 'Issue tracking built for momentum',
    description:
      'Plan issues, triage work, and keep priorities visible without splitting your team across five tools.',
  },
  {
    icon: Clock3,
    title: 'Cycles, roadmap, and delivery in one view',
    description:
      'Move from long-range planning to weekly execution with fewer handoffs and less context switching.',
  },
  {
    icon: Bot,
    title: 'AI where it actually helps',
    description:
      'Generate issue drafts, summarize context, and assist with planning without turning the product into a gimmick.',
  },
];

const workflow: Array<{
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
}> = [
  {
    eyebrow: 'Capture',
    title: 'Write once, keep context attached',
    description:
      'Turn notes, decisions, and product specs into living references that stay close to execution.',
    points: [
      'Nested notes with page trees and version history',
      'Rich editor blocks, comments, and sharing',
      'Docs that link directly into issues and plans',
    ],
  },
  {
    eyebrow: 'Coordinate',
    title: 'See what matters without chasing updates',
    description:
      'Keep triage, inbox, team coordination, and roadmap changes visible across the workspace in real time.',
    points: [
      'Unified inbox and notifications',
      'Realtime updates for workspace activity',
      'Roadmap, projects, and cycles in the same flow',
    ],
  },
  {
    eyebrow: 'Ship',
    title: 'Move from planning to delivery faster',
    description:
      'Make progress measurable with analytics, Git context, and clearer ownership across the team.',
    points: [
      'Issue workflows with priorities and ownership',
      'Git integration and branch-aware execution',
      'Analytics and velocity views for follow-through',
    ],
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
    accent: 'from-sky-400/30 to-cyan-300/10',
  },
  {
    title: 'Cycle health',
    meta: 'Analytics',
    body: 'Track completion, drift, and velocity without jumping into another reporting tool.',
    accent: 'from-emerald-400/25 to-teal-300/10',
  },
  {
    title: 'Issue flow',
    meta: 'Execution',
    body: 'Triage incoming work, assign owners, and keep updates visible as the team moves.',
    accent: 'from-violet-400/25 to-indigo-300/10',
  },
];

const fadeUp = {
  initial: false,
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] },
};

export default function IndexRoute() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#05070b] text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -left-48 -top-40 h-112 w-md rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute -right-32 top-40 h-88 w-88 rounded-full bg-indigo-500/12 blur-3xl" />
        <div className="absolute -bottom-32 left-1/2 h-80 w-md -translate-x-1/2 rounded-full bg-emerald-400/8 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-size-[88px_88px] opacity-[0.06]" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#05070b]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 shadow-[0_0_40px_rgba(34,211,238,0.12)]">
              <Layers className="h-5 w-5 text-cyan-300" />
            </div>
            <div>
              <div className="text-base font-semibold tracking-tight">Flowpig</div>
              <div className="text-xs text-white/45">Plan clearly. Ship calmly.</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 text-sm text-white/60 lg:flex">
            <a href="#product" className="transition hover:text-white">
              Product
            </a>
            <a href="#workflow" className="transition hover:text-white">
              Workflow
            </a>
            <a href="#proof" className="transition hover:text-white">
              Why teams switch
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="hidden rounded-full px-4 py-2 text-sm text-white/70 transition hover:bg-white/6 hover:text-white sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/14 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:border-cyan-200/40 hover:bg-cyan-300/22"
            >
              Start free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="relative">
        <section className="mx-auto grid max-w-7xl gap-16 px-5 pb-20 pt-14 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pb-28 lg:pt-20">
          <div className="relative">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1.5 text-sm text-white/70">
              <Sparkles className="h-4 w-4 text-cyan-300" />
              A calmer operating system for product teams
            </div>

            <h1 className="max-w-4xl text-5xl font-semibold leading-[0.96] tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
              Docs, issues, planning, and AI
              <span className="block bg-linear-to-r from-white via-cyan-100 to-emerald-200 bg-clip-text text-transparent">
                in one deliberate workflow.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/68 sm:text-xl">
              Flowpig brings the strongest parts of docs, issue tracking, cycles, and
              collaboration into one workspace so teams can move from idea to shipped
              work with less friction and less tool sprawl.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-slate-950 transition hover:scale-[1.01] hover:bg-cyan-50"
              >
                Create workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/acme-corp"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/6 px-6 py-3.5 text-sm font-medium text-white/86 transition hover:border-white/20 hover:bg-white/9"
              >
                <PlayCircle className="h-4 w-4 text-cyan-300" />
                Open live demo
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-3 text-sm text-white/62">
              {highlights.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2"
                >
                  <Icon className="h-4 w-4 text-cyan-300" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-4xl bg-linear-to-br from-cyan-400/8 via-transparent to-emerald-300/8 blur-2xl" />
            <div className="relative overflow-hidden rounded-4xl border border-white/6 bg-white/3 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-5">
              <div className="rounded-3xl border border-white/5 bg-[#0b1016]/95 p-4 sm:p-5">
                <div className="flex items-center justify-between border-b border-white/8 pb-4">
                  <div>
                    <div className="text-sm font-medium text-white/90">Workspace pulse</div>
                    <div className="mt-1 text-sm text-white/45">
                      Everything a product team needs, without the tab chaos.
                    </div>
                  </div>
                  <div className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-medium text-emerald-200">
                    Realtime
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-4">
                    <div className="rounded-[1.25rem] border border-white/5 bg-white/3 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-white/86">
                            Release 2.4 planning
                          </div>
                          <div className="mt-1 text-xs uppercase tracking-[0.24em] text-cyan-200/70">
                            Active cycle
                          </div>
                        </div>
                        <div className="rounded-full bg-cyan-300/12 px-2.5 py-1 text-xs text-cyan-100">
                          8 open issues
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        {[
                          ['Improve triage intake', 'High priority', 'bg-amber-300/16 text-amber-100'],
                          ['Polish workspace onboarding', 'In progress', 'bg-cyan-300/14 text-cyan-100'],
                          ['Connect roadmap to issue rollups', 'Planned', 'bg-white/10 text-white/70'],
                        ].map(([title, badge, tone]) => (
                          <div
                            key={title}
                            className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/20 px-3 py-3"
                          >
                            <div>
                              <div className="text-sm text-white/90">{title}</div>
                              <div className="mt-1 text-xs text-white/45">Linked to release notes</div>
                            </div>
                            <span className={`rounded-full px-2 py-1 text-[11px] ${tone}`}>
                              {badge}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      {[
                        ['24', 'Issues in cycle'],
                        ['7', 'Docs updated'],
                        ['92%', 'Planned work visible'],
                      ].map(([value, label]) => (
                        <div
                          key={label}
                          className="rounded-[1.15rem] border border-white/5 bg-white/3 p-4"
                        >
                          <div className="text-2xl font-semibold tracking-tight text-white">
                            {value}
                          </div>
                          <div className="mt-1 text-xs leading-5 text-white/48">{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[1.25rem] border border-white/5 bg-white/3 p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-white/88">Team inbox</div>
                        <Inbox className="h-4 w-4 text-cyan-300" />
                      </div>
                      <div className="mt-3 space-y-3 text-sm">
                        {[
                          'Roadmap updated by product',
                          'Design review notes synced to issue FP-184',
                          'Cycle burndown changed after reprioritization',
                        ].map((item) => (
                          <div
                            key={item}
                            className="rounded-2xl border border-white/8 bg-black/20 px-3 py-3 text-white/72"
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[1.25rem] border border-white/5 bg-linear-to-br from-cyan-300/8 via-white/2 to-emerald-300/8 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-white/90">
                        <Bot className="h-4 w-4 text-emerald-200" />
                        AI assistant
                      </div>
                      <p className="mt-3 text-sm leading-6 text-white/62">
                        Summarize the latest triage thread, draft follow-up issues, and
                        convert meeting notes into actionable work.
                      </p>
                      <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-cyan-100">
                        See how the team is moving
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="proof"
          className="mx-auto grid max-w-7xl gap-5 px-5 pb-8 sm:px-8 lg:grid-cols-3"
        >
          {previewCards.map((card, index) => (
            <motion.div
              key={card.title}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: index * 0.06 }}
              className="relative overflow-hidden rounded-[1.75rem] border border-white/6 bg-white/2 p-6"
            >
              <div
                className={`absolute inset-x-0 top-0 h-24 bg-linear-to-br ${card.accent} blur-2xl`}
              />
              <div className="relative">
                <div className="text-xs uppercase tracking-[0.24em] text-white/42">
                  {card.meta}
                </div>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">
                  {card.title}
                </h2>
                <p className="mt-3 max-w-md text-sm leading-7 text-white/62">
                  {card.body}
                </p>
              </div>
            </motion.div>
          ))}
        </section>

        <section id="product" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <motion.div {...fadeUp} className="max-w-3xl">
            <div className="text-sm font-medium uppercase tracking-[0.24em] text-cyan-200/72">
              Product pillars
            </div>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
              World-class tools feel coherent before they feel feature-rich.
            </h2>
            <p className="mt-5 text-lg leading-8 text-white/64">
              Flowpig already spans notes, issues, roadmap, cycles, AI, and analytics.
              The opportunity is to make that breadth feel unified, fast, and obvious
              to use from the first screen onward.
            </p>
          </motion.div>

          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            {pillars.map(({ icon: Icon, title, description }, index) => (
              <motion.div
                key={title}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: index * 0.05 }}
                className="group rounded-[1.75rem] border border-white/6 bg-white/2 p-7 transition hover:border-white/10 hover:bg-white/4"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10">
                  <Icon className="h-5 w-5 text-cyan-200" />
                </div>
                <h3 className="mt-5 text-2xl font-semibold tracking-tight text-white">
                  {title}
                </h3>
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
              <div className="text-sm font-medium uppercase tracking-[0.24em] text-emerald-200/72">
                Workflow
              </div>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
                The best teams don’t need more tabs. They need better flow.
              </h2>
            </motion.div>

            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {workflow.map((step, index) => (
                <motion.div
                  key={step.title}
                  {...fadeUp}
                  transition={{ ...fadeUp.transition, delay: index * 0.06 }}
                  className="rounded-[1.75rem] border border-white/10 bg-[#081018] p-6"
                >
                  <div className="text-xs uppercase tracking-[0.26em] text-emerald-200/68">
                    {step.eyebrow}
                  </div>
                  <h3 className="mt-4 text-2xl font-semibold tracking-tight text-white">
                    {step.title}
                  </h3>
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
          <motion.div
            {...fadeUp}
            className="overflow-hidden rounded-4xl border border-white/6 bg-linear-to-br from-cyan-300/10 via-white/3 to-emerald-300/8 p-8 sm:p-10"
          >
            <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
              <div>
                <div className="text-sm font-medium uppercase tracking-[0.24em] text-cyan-100/72">
                  Ready to go deeper
                </div>
                <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
                  Start with the product your team already wants to use.
                </h2>
                <p className="mt-5 max-w-xl text-lg leading-8 text-white/68">
                  This first polish pass upgrades the front door. From here, the next
                  best improvements are onboarding, issue detail quality, and resolving
                  the existing editor typecheck drift.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Link
                  to="/signup"
                  className="rounded-3xl border border-white/15 bg-white px-6 py-6 text-slate-950 transition hover:scale-[1.01]"
                >
                  <div className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">
                    Start free
                  </div>
                  <div className="mt-3 text-2xl font-semibold tracking-tight">
                    Create your workspace
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-sm font-medium text-slate-700">
                    Get into the app
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>

                <Link
                  to="/login"
                  className="rounded-3xl border border-white/6 bg-black/15 px-6 py-6 text-white transition hover:border-white/12 hover:bg-black/22"
                >
                  <div className="text-sm font-medium uppercase tracking-[0.22em] text-white/45">
                    Existing team
                  </div>
                  <div className="mt-3 text-2xl font-semibold tracking-tight">
                    Jump back in
                  </div>
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
