import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import {
  Bot,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Target,
  Users,
} from 'lucide-react';
import { AuthProviderButtons } from '~/components/auth-provider-buttons';
import { AuthShell } from '~/components/auth-shell';
import { useAuth, type SocialProvider } from '~/lib/auth-client';

const benefits = [
  {
    icon: Users,
    title: 'Bring the whole team into one system',
    description:
      'Notes, issues, cycles, and planning live together so everyone is working from the same context.',
  },
  {
    icon: Target,
    title: 'Move from idea to execution faster',
    description:
      'Create a workspace that makes prioritization, delivery, and follow-through easier from day one.',
  },
  {
    icon: Bot,
    title: 'Use AI without losing control',
    description:
      'Get drafting and summarization help where it matters, while keeping decisions visible and reviewable.',
  },
];

export default function SignupRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signup, loginWithProvider, authProviders, isProvidersLoading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [socialLoadingProvider, setSocialLoadingProvider] = useState<SocialProvider | null>(null);
  const inviteToken = searchParams.get('invite')?.trim();
  const redirectPath = inviteToken ? `/invite/${inviteToken}` : '/onboarding';
  const inviteQuery = inviteToken ? `?invite=${encodeURIComponent(inviteToken)}` : '';

  const passwordStrength = (() => {
    if (password.length === 0) return null;
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    if (score <= 1) return { label: 'Weak', color: 'bg-linear-error', width: '25%' };
    if (score === 2) return { label: 'Fair', color: 'bg-linear-warning', width: '50%' };
    if (score === 3) return { label: 'Good', color: 'bg-linear-success', width: '75%' };
    return { label: 'Strong', color: 'bg-linear-success', width: '100%' };
  })();

  function validateForm(): string | null {
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) return 'Name must be at least 2 characters.';
    if (trimmedName.length > 100) return 'Name must be 100 characters or fewer.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) { setError(validationError); return; }
    setError('');
    setIsLoading(true);

    try {
      await signup(email, password, name.trim(), redirectPath);
      setIsSuccess(true);
      setTimeout(() => navigate(redirectPath), 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exist')) {
        setError('An account with this email already exists. Try signing in.');
      } else if (msg.toLowerCase().includes('password')) {
        setError('Password does not meet requirements.');
      } else {
        setError(msg || 'Could not create account. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleProviderSignup(provider: SocialProvider) {
    setError('');
    setSocialLoadingProvider(provider);

    try {
      await loginWithProvider(provider, redirectPath);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setError(msg || 'Social sign-up failed. Please try again.');
      setSocialLoadingProvider(null);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start a workspace for product, design, and engineering in one connected flow. No extra setup ceremony required."
      asideEyebrow="Start strong"
      asideTitle="Set up the workspace your team actually wants to use."
      asideDescription="Flowpig is designed to make planning, coordination, and shipping feel connected from the first session instead of bolted together later."
      benefits={benefits}
      footer={
        <>
          Already have an account?{' '}
          <Link to={`/login${inviteQuery}`} className="font-medium text-linear-accent hover:text-linear-accent-hover">
            Sign in
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

        {isSuccess ? (
          <div className="rounded-md border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Account created. Redirecting to onboarding...
            </span>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-white/80">Full name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              autoComplete="name"
              required
              className="w-full rounded-md border border-white/10 bg-white/4 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-linear-accent/50 focus:bg-white/6"
            />
          </label>

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
                placeholder="Create a strong password"
                autoComplete="new-password"
                minLength={8}
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
            {passwordStrength && (
              <div className="mt-2 space-y-1">
                <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                    style={{ width: passwordStrength.width }}
                  />
                </div>
                <p className="text-xs text-white/40">{passwordStrength.label} password</p>
              </div>
            )}
          </label>

          <button
            type="submit"
            disabled={isLoading || socialLoadingProvider !== null}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-linear-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-linear-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create account'
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
          onSelect={handleProviderSignup}
        />
      </div>
    </AuthShell>
  );
}
