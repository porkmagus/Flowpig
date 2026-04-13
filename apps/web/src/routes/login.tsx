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
      const msg = err instanceof Error ? err.message : '';
      if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('credential') || msg.toLowerCase().includes('password')) {
        setError('Incorrect email or password.');
      } else if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('no user')) {
        setError('No account found with that email.');
      } else {
        setError(msg || 'Sign in failed. Please try again.');
      }
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
          <Link to="/signup" className="font-medium text-linear-accent hover:text-linear-accent-hover">
            Create one
          </Link>
        </>
      }
    >
      <div className="space-y-4">
        {error ? (
          <div className="rounded-md border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
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
              className="w-full rounded-md border border-white/10 bg-white/4 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-linear-accent/50 focus:bg-white/6"
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
                className="w-full rounded-md border border-white/10 bg-white/4 px-4 py-3 pr-12 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-linear-accent/50 focus:bg-white/6"
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
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-linear-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-linear-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
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
