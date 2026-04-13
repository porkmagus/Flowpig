import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, ChevronRight, Layers } from 'lucide-react';

type AuthBenefit = {
  icon: LucideIcon;
  title: string;
  description: string;
};

interface AuthShellProps {
  title: string;
  subtitle: string;
  asideEyebrow: string;
  asideTitle: string;
  asideDescription: string;
  benefits: AuthBenefit[];
  children: ReactNode;
  footer: ReactNode;
}

export function AuthShell({
  title,
  subtitle,
  asideEyebrow,
  asideTitle,
  asideDescription,
  benefits,
  children,
  footer,
}: AuthShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05070b] text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10rem] top-[-8rem] h-[24rem] w-[24rem] rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute right-[-8rem] top-[12rem] h-[22rem] w-[22rem] rounded-full bg-indigo-500/12 blur-3xl" />
        <div className="absolute bottom-[-9rem] left-1/3 h-[20rem] w-[26rem] rounded-full bg-emerald-400/8 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:88px_88px] opacity-[0.05]" />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-7xl gap-10 px-5 py-6 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch lg:gap-8 lg:py-8">
        <motion.aside
          initial={{ opacity: 0, x: -18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="hidden overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl lg:flex lg:flex-col lg:justify-between"
        >
          <div>
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
                <Layers className="h-5 w-5 text-cyan-200" />
              </div>
              <div>
                <div className="text-base font-semibold tracking-tight">Flowpig</div>
                <div className="text-xs text-white/45">Plan clearly. Ship calmly.</div>
              </div>
            </Link>

            <div className="mt-16 max-w-xl">
              <div className="text-sm font-medium uppercase tracking-[0.26em] text-cyan-200/70">
                {asideEyebrow}
              </div>
              <h1 className="mt-4 text-5xl font-semibold leading-[1] tracking-[-0.05em] text-white">
                {asideTitle}
              </h1>
              <p className="mt-5 text-lg leading-8 text-white/65">{asideDescription}</p>
            </div>

            <div className="mt-10 grid gap-4">
              {benefits.map(({ icon: Icon, title: benefitTitle, description }) => (
                <div
                  key={benefitTitle}
                  className="rounded-[1.5rem] border border-white/10 bg-black/20 p-5"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10">
                    <Icon className="h-4 w-4 text-cyan-200" />
                  </div>
                  <div className="mt-4 text-lg font-medium tracking-tight text-white">
                    {benefitTitle}
                  </div>
                  <div className="mt-2 text-sm leading-7 text-white/58">{description}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 inline-flex items-center gap-2 text-sm font-medium text-white/70">
            Built for product, design, and engineering
            <ChevronRight className="h-4 w-4 text-cyan-200" />
          </div>
        </motion.aside>

        <motion.section
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.06, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex min-h-[calc(100vh-3rem)] items-center"
        >
          <div className="w-full rounded-[2rem] border border-white/10 bg-[#0b1016]/92 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8 lg:p-10">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-white/48 transition hover:text-white/78"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>

            <div className="mt-8 lg:hidden">
              <Link to="/" className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
                  <Layers className="h-5 w-5 text-cyan-200" />
                </div>
                <div>
                  <div className="text-base font-semibold tracking-tight">Flowpig</div>
                  <div className="text-xs text-white/45">{asideEyebrow}</div>
                </div>
              </Link>
            </div>

            <div className="mt-8">
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
                {title}
              </h2>
              <p className="mt-3 max-w-xl text-base leading-7 text-white/62">{subtitle}</p>
            </div>

            <div className="mt-8">{children}</div>

            <div className="mt-8 text-sm text-white/54">{footer}</div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
