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
      backgroundColor: '#ffffff',
    },
    leftPanel: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column' as const,
      justifyContent: 'center',
      alignItems: 'center',
      padding: '2rem',
      background: 'linear-gradient(135deg, #5E6AD2 0%, #764ba2 100%)',
      color: 'white',
    },
    rightPanel: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column' as const,
      justifyContent: 'center',
      padding: '2rem',
      maxWidth: '480px',
    },
    logo: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      marginBottom: '2rem',
    },
    logoIcon: {
      width: '2rem',
      height: '2rem',
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: '0.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    heading: {
      fontSize: '1.875rem',
      fontWeight: 700,
      color: '#111827',
      marginBottom: '0.5rem',
    },
    subheading: {
      fontSize: '1rem',
      color: '#6b7280',
      marginBottom: '1.5rem',
    },
    form: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '1rem',
    },
    inputGroup: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '0.25rem',
    },
    label: {
      fontSize: '0.875rem',
      fontWeight: 500,
      color: '#374151',
    },
    input: {
      padding: '0.75rem 1rem',
      borderRadius: '0.5rem',
      border: '1px solid #d1d5db',
      fontSize: '1rem',
      outline: 'none',
    },
    passwordWrapper: {
      position: 'relative' as const,
    },
    passwordToggle: {
      position: 'absolute' as const,
      right: '0.75rem',
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: '#6b7280',
    },
    button: {
      padding: '0.75rem 1rem',
      backgroundColor: '#5E6AD2',
      color: 'white',
      borderRadius: '0.5rem',
      border: 'none',
      fontSize: '1rem',
      fontWeight: 500,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
    },
    buttonDisabled: {
      opacity: 0.7,
      cursor: 'not-allowed',
    },
    error: {
      padding: '0.75rem',
      backgroundColor: '#fef2f2',
      color: '#dc2626',
      borderRadius: '0.5rem',
      fontSize: '0.875rem',
    },
    success: {
      padding: '0.75rem',
      backgroundColor: '#f0fdf4',
      color: '#16a34a',
      borderRadius: '0.5rem',
      fontSize: '0.875rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
    },
    footer: {
      marginTop: '1.5rem',
      textAlign: 'center' as const,
      fontSize: '0.875rem',
      color: '#6b7280',
    },
    link: {
      color: '#5E6AD2',
      textDecoration: 'none',
      fontWeight: 500,
    },
    backLink: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.25rem',
      color: '#6b7280',
      textDecoration: 'none',
      fontSize: '0.875rem',
      marginBottom: '1.5rem',
    },
  };

  return (
    <div style={styles.container}>
      {/* Left Panel */}
      <div style={styles.leftPanel}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}>
            <Layers style={{ width: '1.5rem', height: '1.5rem', color: 'white' }} />
          </div>
          <span style={{ fontSize: '1.5rem', fontWeight: 600 }}>Flowpig</span>
        </div>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1rem', textAlign: 'center' }}>
          Join thousands of teams shipping faster
        </h2>
        <p style={{ fontSize: '1.125rem', opacity: 0.9, textAlign: 'center', maxWidth: '400px' }}>
          The workspace that combines the best of Notion and Linear.
        </p>
      </div>

      {/* Right Panel */}
      <div style={styles.rightPanel}>
        <Link to="/" style={styles.backLink}>
          <ArrowLeft style={{ width: '1rem', height: '1rem' }} />
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
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.passwordToggle}
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
          >
            {isLoading ? (
              <>
                <Loader2 style={{ width: '1rem', height: '1rem', animation: 'spin 1s linear infinite' }} />
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
