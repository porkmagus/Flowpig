import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { AnimatedCard, AnimatedItem, AnimatedList, AnimatedPage } from '@flowpigdev/ui';
import { API_URL } from '~/lib/api';
import {
  ArrowUpDown,
  Clock,
  Filter,
  FolderKanban,
  Layers,
  MoreHorizontal,
  Plus,
  Search,
  Target,
} from 'lucide-react';

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
  _count?: {
    issues: number;
    initiatives: number;
  };
}

const statusConfig: Record<Project['status'], { label: string; color: string; bg: string }> = {
  PLANNED: { label: 'Planned', color: 'text-linear-text-secondary', bg: 'bg-linear-elevated' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-sky-500', bg: 'bg-sky-500/10' },
  PAUSED: { label: 'Paused', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  COMPLETED: { label: 'Completed', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  CANCELLED: { label: 'Cancelled', color: 'text-rose-500', bg: 'bg-rose-500/10' },
};

export default function ProjectsListRoute() {
  const { workspace } = useParams();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['projects', workspace, search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter) params.set('status', statusFilter);

      const response = await fetch(`${API_URL}/workspaces/${workspace}/projects?${params.toString()}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to load projects');
      return response.json() as Promise<{ projects: Project[] }>;
    },
    enabled: !!workspace,
  });

  const projects = data?.projects ?? [];

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newProjectName.trim(),
          description: newProjectDescription.trim() || undefined,
          status: 'PLANNED',
        }),
      });

      if (!response.ok) throw new Error('Failed to create project');
      return response.json() as Promise<{ project: Project }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', workspace] });
      setShowCreateModal(false);
      setNewProjectName('');
      setNewProjectDescription('');
    },
  });

  return (
    <AnimatedPage className="mx-auto max-w-6xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-linear-text">Projects</h1>
          <p className="mt-1 text-linear-text-secondary">
            {projects.length} {projects.length === 1 ? 'project' : 'projects'}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-linear-accent px-4 py-2 font-medium text-white transition-colors hover:bg-linear-accent/80"
        >
          <Plus className="h-4 w-4" />
          New Project
        </button>
      </div>

      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-linear-text-tertiary" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search projects..."
            className="w-full rounded-lg border border-linear-border py-2 pl-10 pr-4 focus:border-transparent focus:ring-2 focus:ring-linear-accent/40"
          />
        </div>
        <select
          value={statusFilter || ''}
          onChange={(event) => setStatusFilter(event.target.value || null)}
          className="rounded-lg border border-linear-border px-3 py-2 focus:ring-2 focus:ring-linear-accent/40"
        >
          <option value="">All Status</option>
          <option value="PLANNED">Planned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="PAUSED">Paused</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-linear-text-secondary transition-colors hover:bg-linear-elevated">
          <Filter className="h-4 w-4" />
          Filter
        </button>
        <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-linear-text-secondary transition-colors hover:bg-linear-elevated">
          <ArrowUpDown className="h-4 w-4" />
          Sort
        </button>
      </div>

      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-md rounded-xl bg-linear-surface p-6 shadow-xl"
            >
              <h2 className="mb-4 text-xl font-semibold text-linear-text">Create Project</h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-linear-text-secondary">Name</label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(event) => setNewProjectName(event.target.value)}
                    placeholder="e.g. Customer migration"
                    className="w-full rounded-lg border border-linear-border px-3 py-2 focus:ring-2 focus:ring-linear-accent/40"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-linear-text-secondary">Description</label>
                  <textarea
                    value={newProjectDescription}
                    onChange={(event) => setNewProjectDescription(event.target.value)}
                    placeholder="What is this project about?"
                    rows={3}
                    className="w-full resize-none rounded-lg border border-linear-border px-3 py-2 focus:ring-2 focus:ring-linear-accent/40"
                  />
                </div>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-linear-text-secondary hover:text-linear-text"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => createMutation.mutate()}
                    disabled={!newProjectName.trim() || createMutation.isPending}
                    className="rounded-lg bg-linear-accent px-4 py-2 font-medium text-white transition-colors hover:bg-linear-accent/80 disabled:opacity-50"
                  >
                    {createMutation.isPending ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-linear-accent/30 border-t-primary-500" />
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-linear-border bg-linear-surface py-16 text-center">
          <FolderKanban className="mx-auto mb-4 h-12 w-12 text-linear-text-tertiary" />
          <h3 className="mb-2 text-lg font-medium text-linear-text">No projects yet</h3>
          <p className="mb-4 text-linear-text-secondary">Create your first project to organize work around real deliverables.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="font-medium text-linear-accent hover:text-linear-accent"
          >
            Create project
          </button>
        </div>
      ) : (
        <AnimatedList className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const status = statusConfig[project.status];
            return (
              <AnimatedItem key={project.id}>
                <Link to={`/${workspace}/projects/${project.id}`}>
                  <AnimatedCard className="group h-full rounded-xl border border-linear-border bg-linear-surface p-5 transition-all hover:shadow-md">
                    <div className="mb-4 flex items-start justify-between">
                      <span className="text-3xl">{project.emoji || '📁'}</span>
                      <button
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                        className="rounded p-1 opacity-0 transition-all hover:bg-linear-elevated group-hover:opacity-100"
                      >
                        <MoreHorizontal className="h-4 w-4 text-linear-text-tertiary" />
                      </button>
                    </div>

                    <h3 className="mb-2 line-clamp-1 font-semibold text-linear-text">{project.name}</h3>
                    {project.description && (
                      <p className="mb-3 line-clamp-2 text-sm text-linear-text-secondary">{project.description}</p>
                    )}

                    <div className="mb-3 flex items-center gap-2">
                      <span className={`rounded px-2 py-1 text-xs font-medium ${status.bg} ${status.color}`}>
                        {status.label}
                      </span>
                      <span className="text-sm text-linear-text-secondary">{project.progress}%</span>
                    </div>

                    <div className="mb-4 h-1.5 w-full rounded-full bg-linear-elevated">
                      <div className="h-1.5 rounded-full bg-linear-accent transition-all" style={{ width: `${project.progress}%` }} />
                    </div>

                    <div className="mb-3 flex items-center gap-4 text-sm text-linear-text-secondary">
                      <span className="flex items-center gap-1">
                        <Layers className="h-3 w-3" />
                        {project._count?.issues || 0} issues
                      </span>
                      <span className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        {project._count?.initiatives || 0} initiatives
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-linear-border pt-3">
                      <div className="flex items-center gap-2">
                        {project.lead ? (
                          <>
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-linear-elevated text-xs">
                              {(project.lead.name || '?').charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm text-linear-text-secondary">{project.lead.name || 'Unassigned'}</span>
                          </>
                        ) : (
                          <span className="text-sm text-linear-text-tertiary">No lead assigned</span>
                        )}
                      </div>
                      {project.targetDate && (
                        <span className="flex items-center gap-1 text-xs text-linear-text-secondary">
                          <Clock className="h-3 w-3" />
                          Due {new Date(project.targetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </AnimatedCard>
                </Link>
              </AnimatedItem>
            );
          })}
        </AnimatedList>
      )}
    </AnimatedPage>
  );
}

