import { Loader2 } from 'lucide-react';
import type { AuthProviders, SocialProvider } from '~/lib/auth-client';

interface AuthProviderButtonsProps {
  actionLabel: string;
  providers: AuthProviders;
  isLoading: boolean;
  activeProvider: SocialProvider | null;
  onSelect: (provider: SocialProvider) => void;
}

const providerMeta: Array<{
  provider: SocialProvider;
  label: string;
  monogram: string;
}> = [
  {
    provider: 'github',
    label: 'GitHub',
    monogram: 'GH',
  },
  {
    provider: 'google',
    label: 'Google',
    monogram: 'G',
  },
];

export function AuthProviderButtons({
  actionLabel,
  providers,
  isLoading,
  activeProvider,
  onSelect,
}: AuthProviderButtonsProps) {
  const hasEnabledProvider = providerMeta.some(({ provider }) => providers[provider]);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {providerMeta.map(({ provider, label, monogram }) => {
          const isEnabled = providers[provider];
          const isBusy = activeProvider === provider;

          return (
            <button
              key={provider}
              type="button"
              onClick={() => onSelect(provider)}
              disabled={isLoading || !isEnabled || activeProvider !== null}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-white/4 px-4 py-2.5 text-sm font-medium text-white/84 transition hover:border-white/18 hover:bg-white/7 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-white/12 bg-white/6 px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/72">
                  {monogram}
                </span>
              )}
              {isBusy ? `Connecting to ${label}...` : `${actionLabel} with ${label}`}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <p className="text-xs text-linear-text-tertiary">Checking available sign-in providers...</p>
      ) : hasEnabledProvider ? null : (
        <p className="text-xs text-linear-text-tertiary">
          GitHub and Google sign-in are not configured on this server yet. Email and password login is available now.
        </p>
      )}
    </div>
  );
}