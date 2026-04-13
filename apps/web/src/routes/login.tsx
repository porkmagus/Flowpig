import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Bot,
  Eye,
  EyeOff,
  FileText,
  GitBranch,
  Loader2,
} from 'lucide-react';
import { AuthShell } from '~/components/auth-shell';
import { useAuth } from '~/lib/auth-client';

const benefits = [
  {
    icon: FileText,
    title: 'Work stays connected',
    description:
      'Specs, notes, and issue history stay in one workspace instead of scattering across tools.',
  },
  {
    icon: GitBranch,
    title: 'Execution is visible',
    description:
      'Track ownership, priorities, and Git-aware progress without losing the planning context.',
  },
  {
    icon: Bot,
    title: 'AI helps with the busywork',
    description:
      'Summaries, drafting, and planning support show up where the team is already working.',
  },
];

export default function LoginRoute() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthShell
      title="Sign in to your workspace"
      subtitle="Pick up where the team left off. Your notes, issues, roadmap, and inbox are all waiting in one place."
      asideEyebrow="Welcome back"
      asideTitle="Reconnect with the work without rebuilding context."
      asideDescription="Flowpig is built to help teams move from discussion to delivery with less friction, fewer tabs, and clearer ownership."
      benefits={benefits}
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="font-medium text-cyan-200 hover:text-cyan-100">
            Create one
          </Link>
        </>
      }
    >
      <div className="space-y-4">
        {error ? (
          <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-white/80">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-base text-white outline-none transition placeholder:text-white/28 focus:border-cyan-300/35 focus:bg-white/[0.06]"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-white/80">Password</span>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 pr-12 text-base text-white outline-none transition placeholder:text-white/28 focus:border-cyan-300/35 focus:bg-white/[0.06]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute inset-y-0 right-0 inline-flex items-center px-4 text-white/40 transition hover:text-white/75"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.01] hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-65"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
