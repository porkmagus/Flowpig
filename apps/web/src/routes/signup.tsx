import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Bot,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Target,
  Users,
} from 'lucide-react';
import { AuthShell } from '~/components/auth-shell';
import { useAuth } from '~/lib/auth-client';

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
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await signup(email, password, name);
      setIsSuccess(true);
      setTimeout(() => navigate('/onboarding'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setIsLoading(false);
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
          <Link to="/login" className="font-medium text-cyan-200 hover:text-cyan-100">
            Sign in
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

        {isSuccess ? (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
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
              className="w-full rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-base text-white outline-none transition placeholder:text-white/28 focus:border-cyan-300/35 focus:bg-white/6"
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
              className="w-full rounded-2xl border border-white/10 bg-white/4 px-4 py-3 text-base text-white outline-none transition placeholder:text-white/28 focus:border-cyan-300/35 focus:bg-white/6"
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
                className="w-full rounded-2xl border border-white/10 bg-white/4 px-4 py-3 pr-12 text-base text-white outline-none transition placeholder:text-white/28 focus:border-cyan-300/35 focus:bg-white/6"
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
                Creating account...
              </>
            ) : (
              'Create account'
            )}
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
