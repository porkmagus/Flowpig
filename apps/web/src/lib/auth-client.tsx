import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { createAuthClient } from 'better-auth/react';
import { Navigate, useNavigate } from 'react-router';
import { API_URL } from './runtime-config';

const authClient = createAuthClient({
  baseURL: API_URL,
  basePath: '/auth',
  fetchOptions: {
    credentials: 'include',
  },
});

interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}

interface AuthUserShape {
  id: string;
  email: string;
  name: string | null;
  image?: string | null;
}

export type SocialProvider = 'github' | 'google';

export interface AuthProviders {
  github: boolean;
  google: boolean;
}

const defaultAuthProviders: AuthProviders = {
  github: false,
  google: false,
};

function toAbsoluteCallbackUrl(callbackPath: string) {
  return new URL(callbackPath, window.location.origin).toString();
}

function mapUser(user: AuthUserShape): User {
  return {
    id: user.id,
    email: user.email,
    name: user.name || null,
    image: user.image || null,
  };
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  authProviders: AuthProviders;
  isProvidersLoading: boolean;
  login: (email: string, password: string, callbackPath?: string) => Promise<void>;
  signup: (email: string, password: string, name: string, callbackPath?: string) => Promise<void>;
  loginWithProvider: (provider: SocialProvider, callbackPath?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authProviders, setAuthProviders] = useState<AuthProviders>(defaultAuthProviders);
  const [isProvidersLoading, setIsProvidersLoading] = useState(true);

  useEffect(() => {
    void initializeAuth();
  }, []);

  async function initializeAuth() {
    try {
      await Promise.all([checkSession(), loadAuthProviders()]);
    } finally {
      setIsLoading(false);
    }
  }

  async function checkSession() {
    try {
      const { data, error } = await authClient.getSession();
      if (data?.user) {
        setUser(mapUser(data.user));
      }
    } catch (error) {
      console.error('Failed to check session:', error);
    }
  }

  async function loadAuthProviders() {
    try {
      const response = await fetch(`${API_URL}/auth/providers`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load auth providers');
      }

      const data = await response.json() as { social?: Partial<AuthProviders> };
      setAuthProviders({
        github: Boolean(data.social?.github),
        google: Boolean(data.social?.google),
      });
    } catch (error) {
      console.error('Failed to load auth providers:', error);
      setAuthProviders(defaultAuthProviders);
    } finally {
      setIsProvidersLoading(false);
    }
  }

  async function login(email: string, password: string, callbackPath = '/onboarding') {
    const { data, error } = await authClient.signIn.email({
      email,
      password,
    });

    if (error) {
      console.error('Email sign-in error:', error);
      throw new Error(error.message || 'Login failed');
    }

    if (data?.user) {
      setUser(mapUser(data.user));
    }
  }

  async function signup(email: string, password: string, name: string, callbackPath = '/onboarding') {
    const { data, error } = await authClient.signUp.email({
      email,
      password,
      name,
    });

    if (error) {
      console.error('Email sign-up error:', error);
      throw new Error(error.message || 'Signup failed');
    }

    if (data?.user) {
      setUser(mapUser(data.user));
    }
  }

  async function loginWithProvider(provider: SocialProvider, callbackPath = '/onboarding') {
    if (!authProviders[provider]) {
      throw new Error(`${provider[0].toUpperCase()}${provider.slice(1)} sign-in is not configured on this server.`);
    }

    const { error } = await authClient.signIn.social({
      provider,
      callbackURL: toAbsoluteCallbackUrl(callbackPath),
    });

    if (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = error as any;
      const details = err.message || err.error || (err.code ? `${err.code} (${err.status})` : '');
      console.error('Social sign-in error:', err);
      throw new Error(details || 'Social sign-in failed');
    }
  }

  async function logout() {
    await authClient.signOut();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        authProviders,
        isProvidersLoading,
        login,
        signup,
        loginWithProvider,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#2A2A2A] border-t-linear-accent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
