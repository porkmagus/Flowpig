import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import {
  Bot,
  Eye,
  EyeOff,
  FileText,
  GitBranch,
  Loader2,
} from 'lucide-react';
import { AuthProviderButtons } from '~/components/auth-provider-buttons';
import { AuthShell } from '~/components/auth-shell';
import { useAuth, type SocialProvider } from '~/lib/auth-client';

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

const DEMO_EMAIL = 'test@flowpig.dev';
const DEMO_PASSWORD = 'testpassword123';

export default function LoginRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, loginWithProvider, authProviders, isProvidersLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoadingProvider, setSocialLoadingProvider] = useState<SocialProvider | null>(null);
  const inviteToken = searchParams.get('invite')?.trim();
  const redirectPath = inviteToken ? `/invite/${inviteToken}` : '/onboarding';
  const inviteQuery = inviteToken ? `?invite=${encodeURIComponent(inviteToken)}` : '';

  function fillDemo() {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password, redirectPath);
      navigate(redirectPath);
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

  async function handleProviderLogin(provider: SocialProvider) {
    setError('');
    setSocialLoadingProvider(provider);

    try {
      await loginWithProvider(provider, redirectPath);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setError(msg || 'Social sign-in failed. Please try again.');
      setSocialLoadingProvider(null);
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
          <Link to={`/signup${inviteQuery}`} className="font-medium text-linear-accent hover:text-linear-accent-hover">
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
            disabled={isLoading || socialLoadingProvider !== null}
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

        <div className="relative my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-linear-border" />
          <span className="text-xs text-linear-text-tertiary">or</span>
          <div className="h-px flex-1 bg-linear-border" />
        </div>

        <AuthProviderButtons
          actionLabel="Continue"
          providers={authProviders}
          isLoading={isProvidersLoading}
          activeProvider={socialLoadingProvider}
          onSelect={handleProviderLogin}
        />

        <button
          type="button"
          onClick={fillDemo}
          disabled={isLoading || socialLoadingProvider !== null}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-linear-border bg-linear-surface px-4 py-2.5 text-sm font-medium text-linear-text-secondary transition hover:border-linear-border-hover hover:text-linear-text disabled:cursor-not-allowed disabled:opacity-60"
        >
          Try demo account
        </button>
        <p className="mt-2 text-center text-xs text-linear-text-tertiary">
          {DEMO_EMAIL} - testpassword123
        </p>
      </div>
    </AuthShell>
  );
}
