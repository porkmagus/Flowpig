import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { AnimatedPage, AnimatedList, AnimatedItem } from '@flowpigdev/ui';
import { useAuth } from '~/lib/auth-client';
import { API_URL } from '~/lib/api';
import { ArrowRight, Loader2, CheckCircle2, Plus, Layout, Search, Users } from 'lucide-react';

const LAST_WORKSPACE_KEY = 'flowpig:last-workspace';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  memberCount: number;
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'radial-gradient(circle at top left, rgba(94,106,210,0.16), transparent 30%), radial-gradient(circle at bottom right, rgba(13,155,106,0.1), transparent 28%), linear-gradient(180deg, #111318 0%, #090B0F 100%)',
    padding: '3rem 1rem',
  },
  card: {
    backgroundColor: 'rgba(18, 20, 24, 0.9)',
    borderRadius: '1rem',
    padding: '2.5rem',
    border: '1px solid #2A2A2A',
    boxShadow: '0 24px 80px rgba(0, 0, 0, 0.35)',
    backdropFilter: 'blur(18px)',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '2rem',
  },
  iconWrapper: {
    width: '3.5rem',
    height: '3.5rem',
    backgroundColor: 'rgba(94,106,210,0.15)',
    borderRadius: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1rem',
    border: '1px solid rgba(94,106,210,0.25)',
  },
  heading: {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: '#FFFFFF',
    letterSpacing: '-0.02em',
    marginBottom: '0.5rem',
  },
  subheading: {
    fontSize: '0.9375rem',
    color: '#A0A0A0',
    lineHeight: 1.6,
  },
  form: {
    marginBottom: '2rem',
  },
  inputRow: {
    display: 'flex',
    gap: '0.75rem',
    marginBottom: '0.5rem',
  },
  input: {
    flex: 1,
    padding: '0.875rem 1rem',
    borderRadius: '0.5rem',
    border: '1px solid #2A2A2A',
    backgroundColor: '#0D0D0D',
    color: '#FFFFFF',
    fontSize: '0.9375rem',
    outline: 'none',
    transition: 'border-color 0.15s ease',
  },
  createButton: {
    padding: '0.875rem 1.5rem',
    backgroundColor: '#5E6AD2',
    color: 'white',
    borderRadius: '0.5rem',
    border: 'none',
    fontSize: '0.9375rem',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'background-color 0.15s ease',
  },
  createButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  urlPreview: {
    marginTop: '0.5rem',
    fontSize: '0.8125rem',
    color: '#6E6E6E',
  },
  workspaceList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
  },
  workspaceButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    backgroundColor: '#0D0D0D',
    borderRadius: '0.75rem',
    border: '1px solid #2A2A2A',
    transition: 'border-color 0.15s ease, background-color 0.15s ease',
    cursor: 'pointer',
    textAlign: 'left' as const,
  },
  workspaceIcon: {
    width: '2.75rem',
    height: '2.75rem',
    borderRadius: '0.625rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 600,
    fontSize: '1.125rem',
  },
  workspaceInfo: {
    flex: 1,
  },
  workspaceName: {
    fontSize: '0.9375rem',
    fontWeight: 500,
    color: '#FFFFFF',
    marginBottom: '0.25rem',
  },
  workspaceMembers: {
    fontSize: '0.8125rem',
    color: '#6E6E6E',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
  },
  createWorkspaceButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    backgroundColor: 'transparent',
    borderRadius: '0.75rem',
    border: '2px dashed #2A2A2A',
    transition: 'border-color 0.15s ease',
    cursor: 'pointer',
    textAlign: 'left' as const,
  },
  createIconWrapper: {
    width: '2.75rem',
    height: '2.75rem',
    borderRadius: '0.625rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A1A',
    color: '#6E6E6E',
  },
  createText: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  createTitle: {
    fontSize: '0.9375rem',
    fontWeight: 500,
    color: '#E0E0E0',
  },
  createSubtitle: {
    fontSize: '0.8125rem',
    color: '#6E6E6E',
  },
  searchInput: {
    width: '100%',
    padding: '0.875rem 1rem',
    borderRadius: '0.75rem',
    border: '1px solid #2A2A2A',
    backgroundColor: '#0D0D0D',
    color: '#FFFFFF',
    fontSize: '0.9375rem',
    outline: 'none',
    marginBottom: '1rem',
  },
  recentWorkspaceCard: {
    marginBottom: '1rem',
    padding: '1rem',
    borderRadius: '0.875rem',
    border: '1px solid rgba(94,106,210,0.22)',
    background: 'linear-gradient(135deg, rgba(94,106,210,0.14), rgba(13,18,30,0.88))',
  },
  recentWorkspaceMeta: {
    fontSize: '0.75rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.18em',
    color: '#AAB2FF',
    marginBottom: '0.45rem',
  },
  recentWorkspaceTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#FFFFFF',
    marginBottom: '0.35rem',
  },
  recentWorkspaceSubtitle: {
    fontSize: '0.875rem',
    color: '#A0A0A0',
    lineHeight: 1.5,
  },
  recentWorkspaceButton: {
    marginTop: '0.875rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.45rem',
    padding: '0.65rem 0.95rem',
    borderRadius: '0.625rem',
    border: '1px solid rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#FFFFFF',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  emptyState: {
    borderRadius: '0.75rem',
    border: '1px dashed #2A2A2A',
    padding: '1rem',
    color: '#8A8A8A',
    fontSize: '0.875rem',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  footer: {
    marginTop: '2rem',
    paddingTop: '2rem',
    borderTop: '1px solid #2A2A2A',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    color: '#6E6E6E',
  },
  successIcon: {
    width: '1rem',
    height: '1rem',
    color: '#0D9B6A',
  },
};

export default function OnboardingRoute() {
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentWorkspaceSlug, setRecentWorkspaceSlug] = useState<string | null>(null);

  // Fetch user's workspaces on mount
  useEffect(() => {
    if (!isAuthLoading && user) {
      fetchWorkspaces();
    }
  }, [isAuthLoading, user]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setRecentWorkspaceSlug(window.localStorage.getItem(LAST_WORKSPACE_KEY));
    }
  }, []);

  async function fetchWorkspaces() {
    try {
      const response = await fetch(`${API_URL}/workspaces`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setWorkspaces(data.workspaces);
        if (data.workspaces.length === 0) {
          setShowCreate(true);
        }
      }
    } catch (error) {
      console.error('Failed to fetch workspaces:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function createWorkspace(e: React.FormEvent) {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    setIsCreating(true);
    try {
      const slug = newWorkspaceName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const response = await fetch(`${API_URL}/workspaces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newWorkspaceName,
          slug,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(LAST_WORKSPACE_KEY, data.workspace.slug);
        }
        navigate(`/${data.workspace.slug}`);
      }
    } catch (error) {
      console.error('Failed to create workspace:', error);
    } finally {
      setIsCreating(false);
    }
  }

  function openWorkspace(slug: string) {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LAST_WORKSPACE_KEY, slug);
    }
    navigate(`/${slug}`);
  }

  const filteredWorkspaces = workspaces.filter((workspace) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return true;
    }

    return [workspace.name, workspace.slug, workspace.description || '']
      .join(' ')
      .toLowerCase()
      .includes(query);
  });

  const recentWorkspace = workspaces.find((workspace) => workspace.slug === recentWorkspaceSlug) || null;

  if (isAuthLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-linear-accent" />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <AnimatedPage className="min-h-screen">
        <div className="max-w-2xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={styles.card}
        >
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.iconWrapper}>
              <Layout style={{ width: '1.5rem', height: '1.5rem', color: '#5E6AD2' }} />
            </div>
            <h1 style={styles.heading}>
              {showCreate ? 'Create your first workspace' : 'Welcome back!'}
            </h1>
            <p style={styles.subheading}>
              {showCreate 
                ? 'A workspace is where your team collaborates on issues, docs, and projects.'
                : 'Select a workspace to continue'
              }
            </p>
          </div>

          {/* Create workspace form */}
          {showCreate && (
            <form onSubmit={createWorkspace} style={styles.form}>
              <div style={styles.inputRow}>
                <input
                  type="text"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="e.g., Acme Corp"
                  style={styles.input}
                  required
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={isCreating}
                  style={{
                    ...styles.createButton,
                    ...(isCreating ? styles.createButtonDisabled : {}),
                  }}
                >
                  {isCreating ? (
                    <Loader2 style={{ width: '1rem', height: '1rem', animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <>
                      Create
                      <ArrowRight style={{ width: '0.875rem', height: '0.875rem' }} />
                    </>
                  )}
                </button>
              </div>
              <p style={styles.urlPreview}>
                Your workspace URL will be: app.flowpig.dev/{newWorkspaceName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'your-workspace'}
              </p>
            </form>
          )}

          {/* Workspace list */}
          {workspaces.length > 0 && (
            <div style={styles.workspaceList}>
              {!showCreate && recentWorkspace && (
                <div style={styles.recentWorkspaceCard}>
                  <div style={styles.recentWorkspaceMeta}>Pick up where you left off</div>
                  <div style={styles.recentWorkspaceTitle}>{recentWorkspace.name}</div>
                  <div style={styles.recentWorkspaceSubtitle}>
                    Jump back into your most recently opened workspace instead of hunting through the full list.
                  </div>
                  <button
                    type="button"
                    onClick={() => openWorkspace(recentWorkspace.slug)}
                    style={styles.recentWorkspaceButton}
                  >
                    Continue to {recentWorkspace.slug}
                    <ArrowRight style={{ width: '0.875rem', height: '0.875rem' }} />
                  </button>
                </div>
              )}

              {!showCreate && (
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6E6E6E]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search workspaces by name or slug"
                    style={{ ...styles.searchInput, paddingLeft: '2.5rem' }}
                  />
                </div>
              )}

              <AnimatedList className="space-y-2">
              {filteredWorkspaces.map((workspace) => (
                <AnimatedItem key={workspace.id}>
                  <motion.button
                    whileHover={{ scale: 1.005, borderColor: '#3A3A3A' }}
                    whileTap={{ scale: 0.995 }}
                    onClick={() => openWorkspace(workspace.slug)}
                    style={styles.workspaceButton}
                  >
                    <div 
                      style={{
                        ...styles.workspaceIcon,
                        backgroundColor: workspace.color,
                      }}
                    >
                      {workspace.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={styles.workspaceInfo}>
                      <h3 style={styles.workspaceName}>{workspace.name}</h3>
                      <p style={styles.workspaceMembers}>
                        <Users style={{ width: '0.875rem', height: '0.875rem' }} />
                        {workspace.memberCount} member{workspace.memberCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <ArrowRight style={{ width: '1rem', height: '1rem', color: '#6E6E6E' }} />
                  </motion.button>
                </AnimatedItem>
              ))}

              {/* Create new option */}
              <AnimatedItem>
                <motion.button
                  whileHover={{ scale: 1.005, borderColor: '#3A3A3A' }}
                  whileTap={{ scale: 0.995 }}
                  onClick={() => {
                    setSearchQuery('');
                    setShowCreate(true);
                  }}
                  style={styles.createWorkspaceButton}
                >
                  <div style={styles.createIconWrapper}>
                    <Plus style={{ width: '1.25rem', height: '1.25rem' }} />
                  </div>
                  <div style={styles.createText}>
                    <span style={styles.createTitle}>Create new workspace</span>
                    <span style={styles.createSubtitle}>Start a new team space</span>
                  </div>
                </motion.button>
              </AnimatedItem>
              </AnimatedList>

              {!showCreate && filteredWorkspaces.length === 0 && (
                <div style={styles.emptyState}>
                  No workspaces match "{searchQuery}". Try a different name or create a new workspace.
                </div>
              )}
            </div>
          )}

          {/* Progress indicator */}
          <div style={styles.footer}>
            <CheckCircle2 style={styles.successIcon} />
            <span>Signed in as {user?.email}</span>
          </div>
        </motion.div>
      </div>
      </AnimatedPage>
    </div>
  );
}
