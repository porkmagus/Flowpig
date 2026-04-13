import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { createAuthClient } from 'better-auth/react';
import { Navigate } from 'react-router';

const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_AUTH_URL || 'http://localhost:5173/api/auth',
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

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const { data, error } = await authClient.getSession();
      if (data?.user) {
        setUser({
          id: data.user.id,
          email: data.user.email,
          name: data.user.name || null,
          image: data.user.image || null,
        });
      }
    } catch (error) {
      console.error('Failed to check session:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const { data, error } = await authClient.signIn.email({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message || 'Login failed');
    }

    if (data?.user) {
      setUser({
        id: data.user.id,
        email: data.user.email,
        name: data.user.name || null,
        image: data.user.image || null,
      });
    }
  }

  async function signup(email: string, password: string, name: string) {
    const { data, error } = await authClient.signUp.email({
      email,
      password,
      name,
    });

    if (error) {
      throw new Error(error.message || 'Signup failed');
    }

    if (data?.user) {
      setUser({
        id: data.user.id,
        email: data.user.email,
        name: data.user.name || null,
        image: data.user.image || null,
      });
    }
  }

  async function logout() {
    await authClient.signOut();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
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
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}