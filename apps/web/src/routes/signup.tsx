import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, CheckCircle2, Layers, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '~/lib/auth-client';

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

  const styles = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      background: 'radial-gradient(circle at top left, rgba(94,106,210,0.16), transparent 30%), radial-gradient(circle at bottom right, rgba(13,155,106,0.1), transparent 28%), linear-gradient(180deg, #111318 0%, #090B0F 100%)',
    },
    leftPanel: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column' as const,
      justifyContent: 'center',
      alignItems: 'center',
      padding: '4rem',
      background: 'linear-gradient(180deg, #1A1A1A 0%, #0D0D0D 100%)',
      color: 'white',
      borderRight: '1px solid #2A2A2A',
    },
    rightPanel: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column' as const,
      justifyContent: 'center',
      padding: '4rem',
      maxWidth: '440px',
      margin: '0 auto',
      backgroundColor: 'rgba(255,255,255,0.02)',
      borderLeft: '1px solid rgba(255,255,255,0.04)',
      backdropFilter: 'blur(14px)',
    },
    logo: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      marginBottom: '3rem',
    },
    logoIcon: {
      width: '2.5rem',
      height: '2.5rem',
      backgroundColor: 'rgba(94,106,210,0.15)',
      borderRadius: '0.75rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid rgba(94,106,210,0.3)',
    },
    heading: {
      fontSize: '1.75rem',
      fontWeight: 600,
      color: '#FFFFFF',
      marginBottom: '0.5rem',
      letterSpacing: '-0.02em',
    },
    subheading: {
      fontSize: '0.9375rem',
      color: '#A0A0A0',
      marginBottom: '2rem',
      lineHeight: 1.6,
    },
    form: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '1.25rem',
    },
    inputGroup: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '0.5rem',
    },
    label: {
      fontSize: '0.8125rem',
      fontWeight: 500,
      color: '#E0E0E0',
      letterSpacing: '0.01em',
    },
    input: {
      padding: '0.875rem 1rem',
      borderRadius: '0.5rem',
      border: '1px solid #2A2A2A',
      backgroundColor: 'rgba(255,255,255,0.03)',
      color: '#FFFFFF',
      fontSize: '0.9375rem',
      outline: 'none',
      transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
    },
    passwordWrapper: {
      position: 'relative' as const,
    },
    passwordToggle: {
      position: 'absolute' as const,
      right: '0.875rem',
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: '#6E6E6E',
      padding: '0.25rem',
      transition: 'color 0.15s ease',
    },
    button: {
      padding: '0.875rem 1.25rem',
      backgroundColor: '#5E6AD2',
      color: 'white',
      borderRadius: '0.5rem',
      border: 'none',
      fontSize: '0.9375rem',
      fontWeight: 500,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
      transition: 'background-color 0.15s ease, transform 0.1s ease',
      letterSpacing: '0.01em',
    },
    buttonDisabled: {
      opacity: 0.6,
      cursor: 'not-allowed',
    },
    error: {
      padding: '0.875rem 1rem',
      backgroundColor: 'rgba(209,59,59,0.12)',
      color: '#D13B3B',
      borderRadius: '0.5rem',
      fontSize: '0.875rem',
      border: '1px solid rgba(209,59,59,0.2)',
    },
    success: {
      padding: '0.875rem 1rem',
      backgroundColor: 'rgba(13,155,106,0.12)',
      color: '#0D9B6A',
      borderRadius: '0.5rem',
      fontSize: '0.875rem',
      border: '1px solid rgba(13,155,106,0.2)',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
    },
    footer: {
      marginTop: '1.75rem',
      textAlign: 'center' as const,
      fontSize: '0.875rem',
      color: '#6E6E6E',
    },
    link: {
      color: '#5E6AD2',
      textDecoration: 'none',
      fontWeight: 500,
    },
    backLink: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.375rem',
      color: '#6E6E6E',
      textDecoration: 'none',
      fontSize: '0.875rem',
      marginBottom: '2rem',
      transition: 'color 0.15s ease',
    },
  };

  return (
    <div style={styles.container}>
      {/* Left Panel */}
      <div style={styles.leftPanel}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}>
            <Layers style={{ width: '1.25rem', height: '1.25rem', color: '#5E6AD2' }} />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.01em' }}>Flowpig</span>
        </div>
        <h2 style={{ fontSize: '2.25rem', fontWeight: 600, marginBottom: '1rem', textAlign: 'center', letterSpacing: '-0.02em' }}>
          Join thousands of teams shipping faster
        </h2>
        <p style={{ fontSize: '1rem', color: '#A0A0A0', textAlign: 'center', maxWidth: '420px', lineHeight: 1.6 }}>
          The workspace that combines the best of Notion and Linear.
        </p>
      </div>

      {/* Right Panel */}
      <div style={styles.rightPanel}>
        <Link to="/" style={styles.backLink}>
          <ArrowLeft style={{ width: '0.875rem', height: '0.875rem' }} />
          Back to home
        </Link>

        <h1 style={styles.heading}>Create your account</h1>
        <p style={styles.subheading}>
          Start your free trial today. No credit card required.
        </p>

        {error && <div style={styles.error}>{error}</div>}
        {isSuccess && (
          <div style={styles.success}>
            <CheckCircle2 style={{ width: '1rem', height: '1rem' }} />
            Account created! Redirecting...
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={styles.input}
              placeholder="John Doe"
              required
              autoComplete="name"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.passwordWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ ...styles.input, width: '100%' }}
                placeholder="Create a strong password"
                required
                minLength={8}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.passwordToggle}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#A0A0A0')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#6E6E6E')}
              >
                {showPassword ? <EyeOff style={{ width: '1rem', height: '1rem' }} /> : <Eye style={{ width: '1rem', height: '1rem' }} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              ...styles.button,
              ...(isLoading ? styles.buttonDisabled : {}),
            }}
            onMouseEnter={(e) => {
              if (!isLoading) e.currentTarget.style.backgroundColor = '#545EC4';
            }}
            onMouseLeave={(e) => {
              if (!isLoading) e.currentTarget.style.backgroundColor = '#5E6AD2';
            }}
          >
            {isLoading ? (
              <>
                <Loader2 style={{ width: '0.9375rem', height: '0.9375rem', animation: 'spin 1s linear infinite' }} />
                Creating account...
              </>
            ) : (
              'Create account'
            )}
          </button>
        </form>

        <div style={styles.footer}>
          Already have an account?{' '}
          <Link to="/login" style={styles.link}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
