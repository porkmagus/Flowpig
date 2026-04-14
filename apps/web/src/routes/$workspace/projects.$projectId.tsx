import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { AnimatedPage } from '@flowpigdev/ui';
import { API_URL } from '~/lib/api';
import {
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Edit3,
  FolderKanban,
  Layers,
  Plus,
  Target,
} from 'lucide-react';

interface Initiative {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  progress: number;
  targetDate?: string | null;
}

interface Issue {
  id: string;
  identifier: string;
  title: string;
  state: string;
  priority: string;
  assignee: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  emoji: string | null;
  color: string | null;
  status: 'PLANNED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  startDate: string | null;
  targetDate: string | null;
  progress: number;
  createdAt: string;
  updatedAt: string;
  lead: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  initiatives: Initiative[];
  issues: Issue[];
}

const statusConfig: Record<Project['status'], { label: string; color: string; bg: string }> = {
  PLANNED: { label: 'Planned', color: 'text-linear-text-secondary', bg: 'bg-linear-elevated' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-sky-500', bg: 'bg-sky-500/10' },
  PAUSED: { label: 'Paused', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  COMPLETED: { label: 'Completed', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  CANCELLED: { label: 'Cancelled', color: 'text-rose-500', bg: 'bg-rose-500/10' },
};

const initiativeStatusOptions = [
  'DISCOVERY',
  'PLANNED',
  'IN_PROGRESS',
  'PAUSED',
  'LAUNCHED',
  'COMPLETED',
  'CANCELLED',
] as const;

export default function ProjectDetailRoute() {
  const { workspace, projectId } = useParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'issues' | 'initiatives'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState<Project['status']>('PLANNED');
  const [showAddInitiative, setShowAddInitiative] = useState(false);
  const [initiativeName, setInitiativeName] = useState('');
  const [initiativeDescription, setInitiativeDescription] = useState('');
  const [initiativeStatus, setInitiativeStatus] = useState<(typeof initiativeStatusOptions)[number]>('PLANNED');

  const { data, isLoading } = useQuery({
    queryKey: ['project', workspace, projectId],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/projects/${projectId}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to load project');
      return response.json() as Promise<{ project: Project }>;
    },
    enabled: !!workspace && !!projectId,
  });

  const project = data?.project;

  useEffect(() => {
    if (!project) return;
    setEditName(project.name);
    setEditDescription(project.description || '');
    setEditStatus(project.status);
  }, [project]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || '',
          status: editStatus,
        }),
      });
      if (!response.ok) throw new Error('Failed to update project');
      return response.json() as Promise<{ project: Project }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', workspace, projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects', workspace] });
      setIsEditing(false);
    },
  });

  const createInitiativeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/initiatives`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: initiativeName.trim(),
          description: initiativeDescription.trim() || undefined,
          status: initiativeStatus,
          projectId,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || 'Failed to create initiative');
      }
      return response.json() as Promise<{ initiative: Initiative }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', workspace, projectId] });
      queryClient.invalidateQueries({ queryKey: ['initiatives', workspace] });
      setShowAddInitiative(false);
      setInitiativeName('');
      setInitiativeDescription('');
      setInitiativeStatus('PLANNED');
      setActiveTab('initiatives');
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-linear-accent/30 border-t-primary-500" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="py-16 text-center">
        <h2 className="text-xl font-semibold text-linear-text">Project not found</h2>
        <Link to={`/${workspace}/projects`} className="mt-4 inline-block text-linear-accent hover:text-linear-accent">
          Back to projects
        </Link>
      </div>
    );
  }

  const status = statusConfig[project.status];
  const completedIssues = project.issues.filter((issue) => issue.state === 'DONE').length;
  const totalIssues = project.issues.length;

  return (
    <AnimatedPage className="mx-auto max-w-6xl">
      <AnimatePresence>
        {showAddInitiative && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setShowAddInitiative(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-lg rounded-xl bg-linear-surface p-6 shadow-xl"
            >
              <h2 className="mb-4 text-xl font-semibold text-linear-text">Link A New Initiative</h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-linear-text-secondary">Initiative name</label>
                  <input
                    value={initiativeName}
                    onChange={(event) => setInitiativeName(event.target.value)}
                    className="w-full rounded-lg border border-linear-border px-3 py-2 focus:ring-2 focus:ring-linear-accent/40"
                    placeholder="e.g. Self-serve onboarding"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-linear-text-secondary">Status</label>
                  <select
                    value={initiativeStatus}
                    onChange={(event) => setInitiativeStatus(event.target.value as (typeof initiativeStatusOptions)[number])}
                    className="w-full rounded-lg border border-linear-border px-3 py-2 focus:ring-2 focus:ring-linear-accent/40"
                  >
                    {initiativeStatusOptions.map((option) => (
                      <option key={option} value={option}>
                        {option.replaceAll('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-linear-text-secondary">Description</label>
                  <textarea
                    value={initiativeDescription}
                    onChange={(event) => setInitiativeDescription(event.target.value)}
                    rows={4}
                    className="w-full resize-none rounded-lg border border-linear-border px-3 py-2 focus:ring-2 focus:ring-linear-accent/40"
                    placeholder="What outcome should this initiative drive?"
                  />
                </div>
                {createInitiativeMutation.error && (
                  <div className="rounded-lg border border-linear-error/30 bg-linear-error/10 px-3 py-2 text-sm text-linear-error">
                    {createInitiativeMutation.error.message}
                  </div>
                )}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => setShowAddInitiative(false)}
                    className="px-4 py-2 text-linear-text-secondary hover:text-linear-text"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => createInitiativeMutation.mutate()}
                    disabled={!initiativeName.trim() || createInitiativeMutation.isPending}
                    className="rounded-lg bg-linear-accent px-4 py-2 font-medium text-white transition-colors hover:bg-linear-accent/80 disabled:opacity-50"
                  >
                    {createInitiativeMutation.isPending ? 'Creating...' : 'Create initiative'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-6 flex items-center gap-2 text-sm text-linear-text-secondary">
        <Link to={`/${workspace}/projects`} className="hover:text-linear-text-secondary">
          Projects
        </Link>
        <ChevronLeft className="h-4 w-4 rotate-180" />
        <span className="font-medium text-linear-text">{project.name}</span>
      </div>

      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          {isEditing ? (
            <div className="flex-1 space-y-4">
              <input
                type="text"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                className="w-full border-b-2 border-linear-border bg-transparent text-3xl font-bold outline-none focus:border-linear-accent"
                placeholder="Project name"
              />
              <textarea
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                className="w-full resize-none rounded-lg border border-linear-border px-3 py-2 focus:ring-2 focus:ring-linear-accent/40"
                rows={3}
                placeholder="Description"
              />
              <div className="flex items-center gap-2">
                <select
                  value={editStatus}
                  onChange={(event) => setEditStatus(event.target.value as Project['status'])}
                  className="rounded-lg border border-linear-border px-3 py-2 text-sm"
                >
                  {Object.keys(statusConfig).map((option) => (
                    <option key={option} value={option}>
                      {option.replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => updateMutation.mutate()}
                  disabled={updateMutation.isPending || !editName.trim()}
                  className="rounded-lg bg-linear-accent px-4 py-2 font-medium text-white disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditName(project.name);
                    setEditDescription(project.description || '');
                    setEditStatus(project.status);
                  }}
                  className="px-4 py-2 text-linear-text-secondary hover:text-linear-text"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-4">
                <span className="text-4xl">{project.emoji || '📁'}</span>
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-bold text-linear-text">{project.name}</h1>
                    <span className={`rounded px-2 py-1 text-xs font-medium ${status.bg} ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  {project.description && <p className="max-w-2xl text-linear-text-secondary">{project.description}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-linear-text-secondary">
                    {project.startDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Started {new Date(project.startDate).toLocaleDateString()}
                      </span>
                    )}
                    {project.targetDate && (
                      <span className="flex items-center gap-1">
                        <Target className="h-4 w-4" />
                        Target {new Date(project.targetDate).toLocaleDateString()}
                      </span>
                    )}
                    {project.lead && (
                      <span className="flex items-center gap-1">
                        <FolderKanban className="h-4 w-4" />
                        Lead: {project.lead.name || 'Unassigned'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="rounded-lg p-2 text-linear-text-secondary transition-colors hover:bg-linear-elevated hover:text-linear-text-secondary"
              >
                <Edit3 className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        <div className="mt-6 rounded-xl border border-linear-border bg-linear-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-linear-text-secondary">Progress</span>
            <span className="text-sm font-bold text-linear-text">{project.progress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-linear-elevated">
            <div className="h-2 rounded-full bg-linear-accent transition-all" style={{ width: `${project.progress}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-6 text-sm text-linear-text-secondary">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              {completedIssues} completed
            </span>
            <span className="flex items-center gap-1">
              <Layers className="h-4 w-4" />
              {totalIssues} total issues
            </span>
            <span className="flex items-center gap-1">
              <Target className="h-4 w-4" />
              {project.initiatives.length} initiative{project.initiatives.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </div>

      <div className="mb-6 flex items-center gap-1 rounded-lg bg-linear-elevated p-1">
        {[
          { id: 'overview', label: 'Overview', icon: FolderKanban },
          { id: 'issues', label: `Issues (${totalIssues})`, icon: Layers },
          { id: 'initiatives', label: `Initiatives (${project.initiatives.length})`, icon: Target },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'overview' | 'issues' | 'initiatives')}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-linear-surface text-linear-text shadow-sm'
                : 'text-linear-text-secondary hover:text-linear-text'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-linear-border bg-linear-surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-linear-text">Initiatives</h3>
              <button
                onClick={() => setShowAddInitiative(true)}
                className="rounded p-1 text-linear-text-tertiary transition-colors hover:bg-linear-elevated hover:text-linear-text-secondary"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {project.initiatives.length === 0 ? (
              <p className="text-sm text-linear-text-tertiary">No initiatives linked yet.</p>
            ) : (
              <div className="space-y-3">
                {project.initiatives.map((initiative) => (
                  <Link
                    key={initiative.id}
                    to={`/${workspace}/initiatives?initiativeId=${initiative.id}`}
                    className="block rounded-lg bg-linear-elevated/50 p-3 transition-colors hover:bg-linear-elevated"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-medium text-linear-text">{initiative.name}</span>
                      <span className="text-sm text-linear-text-secondary">{initiative.progress}%</span>
                    </div>
                    <div className="h-1 w-full rounded-full bg-linear-elevated">
                      <div className="h-1 rounded-full bg-linear-accent" style={{ width: `${initiative.progress}%` }} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-linear-border bg-linear-surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-linear-text">Recent Issues</h3>
              <Link
                to={`/${workspace}/issues?projectId=${project.id}`}
                className="flex items-center gap-1 text-sm text-linear-accent hover:text-linear-accent"
              >
                View all
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            {project.issues.length === 0 ? (
              <p className="text-sm text-linear-text-tertiary">No issues linked yet.</p>
            ) : (
              <div className="space-y-2">
                {project.issues.slice(0, 5).map((issue) => (
                  <Link
                    key={issue.id}
                    to={`/${workspace}/issues/${issue.id}`}
                    className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-linear-elevated/50"
                  >
                    <span className="text-sm text-linear-text-secondary">{issue.identifier}</span>
                    <span className="flex-1 truncate text-sm text-linear-text">{issue.title}</span>
                    <span className={`rounded px-2 py-0.5 text-xs ${
                      issue.state === 'DONE'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : issue.state === 'IN_PROGRESS'
                          ? 'bg-sky-500/10 text-sky-400'
                          : 'bg-linear-elevated text-linear-text-secondary'
                    }`}>
                      {issue.state}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'issues' && (
        <div className="overflow-hidden rounded-xl border border-linear-border bg-linear-surface">
          <div className="divide-y divide-linear-border">
            {project.issues.length === 0 ? (
              <div className="p-8 text-center">
                <Layers className="mx-auto mb-4 h-12 w-12 text-linear-text-tertiary" />
                <p className="text-linear-text-secondary">No issues in this project yet.</p>
              </div>
            ) : (
              project.issues.map((issue) => (
                <Link
                  key={issue.id}
                  to={`/${workspace}/issues/${issue.id}`}
                  className="flex items-center gap-4 p-4 transition-colors hover:bg-linear-elevated/50"
                >
                  <span className="w-20 text-sm text-linear-text-secondary">{issue.identifier}</span>
                  <span className="flex-1 font-medium text-linear-text">{issue.title}</span>
                  <span className={`rounded px-2 py-1 text-xs ${
                    issue.priority === 'URGENT'
                      ? 'bg-red-500/10 text-red-400'
                      : issue.priority === 'HIGH'
                        ? 'bg-orange-500/10 text-orange-400'
                        : issue.priority === 'MEDIUM'
                          ? 'bg-amber-500/10 text-amber-400'
                          : issue.priority === 'LOW'
                            ? 'bg-sky-500/10 text-sky-400'
                            : 'bg-linear-elevated text-linear-text-secondary'
                  }`}>
                    {issue.priority}
                  </span>
                  {issue.assignee && (
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-linear-elevated text-xs">
                        {(issue.assignee.name || '?').charAt(0).toUpperCase()}
                      </div>
                    </div>
                  )}
                </Link>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'initiatives' && (
        <div className="rounded-xl border border-linear-border bg-linear-surface p-5">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="font-semibold text-linear-text">Initiatives</h3>
            <button
              onClick={() => setShowAddInitiative(true)}
              className="flex items-center gap-2 rounded-lg bg-linear-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-linear-accent/80"
            >
              <Plus className="h-4 w-4" />
              Add Initiative
            </button>
          </div>
          {project.initiatives.length === 0 ? (
            <div className="py-12 text-center">
              <Target className="mx-auto mb-4 h-12 w-12 text-linear-text-tertiary" />
              <p className="mb-4 text-linear-text-secondary">No initiative is connected to this project yet.</p>
              <button onClick={() => setShowAddInitiative(true)} className="font-medium text-linear-accent hover:text-linear-accent">
                Create the first initiative
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {project.initiatives.map((initiative) => (
                <Link
                  key={initiative.id}
                  to={`/${workspace}/initiatives?initiativeId=${initiative.id}`}
                  className="rounded-xl border border-linear-border p-4 transition-colors hover:bg-linear-elevated/50"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="font-medium text-linear-text">{initiative.name}</h4>
                    <span className="text-sm font-medium text-linear-text-secondary">{initiative.progress}%</span>
                  </div>
                  {initiative.description && (
                    <p className="mb-3 text-sm text-linear-text-secondary">{initiative.description}</p>
                  )}
                  <div className="mb-3 h-2 w-full rounded-full bg-linear-elevated">
                    <div className="h-2 rounded-full bg-linear-accent" style={{ width: `${initiative.progress}%` }} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-linear-text-secondary">
                    <span>{initiative.status.replaceAll('_', ' ')}</span>
                    {initiative.targetDate && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(initiative.targetDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </AnimatedPage>
  );
}

