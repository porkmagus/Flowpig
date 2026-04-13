import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { AnimatedPage, AnimatedList, AnimatedItem } from '@flowpigdev/ui';
import { useAuth } from '~/lib/auth-client';
import { API_URL } from '~/lib/api';
import { ArrowRight, Loader2, CheckCircle2, Plus, Layout, Users } from 'lucide-react';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  memberCount: number;
}

export default function OnboardingRoute() {
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Fetch user's workspaces on mount
  useState(() => {
    if (!isAuthLoading && user) {
      fetchWorkspaces();
    }
  });

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
        navigate(`/${data.workspace.slug}`);
      }
    } catch (error) {
      console.error('Failed to create workspace:', error);
    } finally {
      setIsCreating(false);
    }
  }

  if (isAuthLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <AnimatedPage className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Layout className="w-8 h-8 text-primary-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {showCreate ? 'Create your first workspace' : 'Welcome back!'}
            </h1>
            <p className="mt-2 text-gray-600">
              {showCreate 
                ? 'A workspace is where your team collaborates on issues, docs, and projects.'
                : 'Select a workspace to continue'
              }
            </p>
          </div>

          {/* Create workspace form */}
          {showCreate && (
            <form onSubmit={createWorkspace} className="mb-8">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="e.g., Acme Corp"
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
                <button
                  type="submit"
                  disabled={isCreating}
                  className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isCreating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Create
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Your workspace URL will be: flowpig.dev/{newWorkspaceName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}
              </p>
            </form>
          )}

          {/* Workspace list */}
          {workspaces.length > 0 && (
            <AnimatedList className="space-y-3">
              {workspaces.map((workspace) => (
                <AnimatedItem key={workspace.id}>
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => navigate(`/${workspace.slug}`)}
                    className="w-full flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors text-left"
                  >
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: workspace.color }}
                    >
                      {workspace.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{workspace.name}</h3>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {workspace.memberCount} member{workspace.memberCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </motion.button>
                </AnimatedItem>
              ))}

              {/* Create new option */}
              <AnimatedItem>
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setShowCreate(true)}
                  className="w-full flex items-center gap-4 p-4 border-2 border-dashed border-gray-200 hover:border-primary-300 rounded-xl transition-colors text-left"
                >
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-gray-100 text-gray-400">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-600">Create new workspace</h3>
                    <p className="text-sm text-gray-400">Start a new team space</p>
                  </div>
                </motion.button>
              </AnimatedItem>
            </AnimatedList>
          )}

          {/* Progress indicator */}
          <div className="mt-8 pt-8 border-t border-gray-100">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span>Signed in as {user?.email}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatedPage>
  );
}
