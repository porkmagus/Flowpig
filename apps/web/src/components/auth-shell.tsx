import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, Layers } from 'lucide-react';

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
    <div className="relative min-h-screen overflow-hidden bg-linear-bg text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-32 h-96 w-96 rounded-full bg-linear-accent/5 blur-3xl" />
        <div className="absolute -right-32 top-48 h-88 w-88 rounded-full bg-indigo-500/6 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-size-[88px_88px] opacity-[0.02]" />
      </div>

      <div className="relative flex min-h-screen items-center justify-center p-5 sm:p-8">
        <div className="flex w-full max-w-5xl flex-col items-stretch justify-center gap-6 lg:flex-row lg:items-center">
          <aside className="hidden lg:flex lg:w-[360px] lg:flex-col lg:shrink-0">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-8 backdrop-blur-xl">
              <Link to="/" className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-linear-accent/20 bg-linear-accent/10">
                  <Layers className="h-5 w-5 text-linear-accent" />
                </div>
                <div>
                  <div className="text-base font-semibold tracking-tight">Flowpig</div>
                  <div className="text-xs text-white/40">Plan clearly. Ship calmly.</div>
                </div>
              </Link>

              <div className="mt-8">
                <div className="text-xs font-medium uppercase tracking-[0.16em] text-linear-accent/70">
                  {asideEyebrow}
                </div>
                <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.03em] text-white">
                  {asideTitle}
                </h1>
                <p className="mt-3 text-sm leading-7 text-white/55">{asideDescription}</p>
              </div>

              <div className="mt-8 space-y-3">
                {benefits.map(({ icon: Icon, title: benefitTitle, description }) => (
                  <div
                    key={benefitTitle}
                    className="rounded-xl border border-white/[0.05] bg-black/20 p-4"
                  >
                    <Icon className="h-4 w-4 text-linear-accent" />
                    <div className="mt-2 text-sm font-medium text-white/90">{benefitTitle}</div>
                    <div className="mt-1 text-xs leading-5 text-white/50">{description}</div>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <section className="w-full lg:flex-1">
            <div className="mx-auto w-full max-w-md rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-8">
              <Link to="/" className="inline-flex items-center gap-2 text-sm text-white/40 transition hover:text-white/70">
                <ArrowLeft className="h-4 w-4" />
                Back to home
              </Link>

              <div className="mt-8 lg:hidden">
                <Link to="/" className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-linear-accent/20 bg-linear-accent/10">
                    <Layers className="h-5 w-5 text-linear-accent" />
                  </div>
                  <div>
                    <div className="text-base font-semibold tracking-tight">Flowpig</div>
                    <div className="text-xs text-white/40">{asideEyebrow}</div>
                  </div>
                </Link>
              </div>

              <div className="mt-8">
                <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl">
                  {title}
                </h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-white/55">{subtitle}</p>
              </div>

              <div className="mt-6">{children}</div>
              <div className="mt-6 text-sm text-white/45">{footer}</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
