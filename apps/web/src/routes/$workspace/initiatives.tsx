import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { AnimatedPage } from '@flowpigdev/ui';
import { API_URL } from '~/lib/api';
import { ArrowUpRight, FolderKanban, Plus, Search, Target } from 'lucide-react';

interface InitiativeProject {
  id: string;
  name: string;
  status: string;
  progress: number;
  issueCount: number;
}

interface Initiative {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: string;
  targetDate: string | null;
  progress: number;
  problemStatement: string | null;
  customerOutcome: string | null;
  successMetric: string | null;
  createdAt: string;
  updatedAt: string;
  projects: InitiativeProject[];
}

interface ProjectOption {
  id: string;
  name: string;
  status: string;
}

const initiativeStatusOptions = [
  'DISCOVERY',
  'PLANNED',
  'IN_PROGRESS',
  'PAUSED',
  'LAUNCHED',
  'COMPLETED',
  'CANCELLED',
] as const;

export default function InitiativesRoute() {
  const { workspace } = useParams();
  const [searchParams] = useSearchParams();
  const highlightedInitiativeId = searchParams.get('initiativeId');
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [status, setStatus] = useState<(typeof initiativeStatusOptions)[number]>('PLANNED');

  const { data, isLoading } = useQuery({
    queryKey: ['initiatives', workspace],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/initiatives`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to load initiatives');
      return response.json() as Promise<{ initiatives: Initiative[] }>;
    },
    enabled: !!workspace,
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projects', workspace],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/projects`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to load projects');
      return response.json() as Promise<{ projects: ProjectOption[] }>;
    },
    enabled: !!workspace && showCreateModal,
  });

  const initiatives = useMemo(() => {
    const items = data?.initiatives ?? [];
    return items.filter((initiative) => {
      const matchesSearch = !search.trim() || [initiative.name, initiative.description, initiative.customerOutcome]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(search.trim().toLowerCase()));
      const matchesStatus = !statusFilter || initiative.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [data?.initiatives, search, statusFilter]);

  const availableProjects = (projectsData?.projects ?? []).filter((project) => project.status !== 'CANCELLED');

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/initiatives`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          status,
          projectId: projectId || undefined,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || 'Failed to create initiative');
      }
      return response.json() as Promise<{ initiative: Initiative }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['initiatives', workspace] });
      queryClient.invalidateQueries({ queryKey: ['projects', workspace] });
      setShowCreateModal(false);
      setName('');
      setDescription('');
      setProjectId('');
      setStatus('PLANNED');
    },
  });

  return (
    <AnimatedPage className="mx-auto max-w-6xl">
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
              className="w-full max-w-lg rounded-xl bg-linear-surface p-6 shadow-xl"
            >
              <h2 className="mb-4 text-xl font-semibold text-linear-text">Create Initiative</h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-linear-text-secondary">Name</label>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full rounded-lg border border-linear-border px-3 py-2 focus:ring-2 focus:ring-linear-accent/40"
                    placeholder="e.g. Faster onboarding conversion"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-linear-text-secondary">Status</label>
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value as (typeof initiativeStatusOptions)[number])}
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
                  <label className="mb-1 block text-sm font-medium text-linear-text-secondary">Linked project</label>
                  <select
                    value={projectId}
                    onChange={(event) => setProjectId(event.target.value)}
                    className="w-full rounded-lg border border-linear-border px-3 py-2 focus:ring-2 focus:ring-linear-accent/40"
                  >
                    <option value="">No project yet</option>
                    {availableProjects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-linear-text-secondary">Description</label>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={4}
                    className="w-full resize-none rounded-lg border border-linear-border px-3 py-2 focus:ring-2 focus:ring-linear-accent/40"
                    placeholder="What outcome should this initiative drive?"
                  />
                </div>
                {createMutation.error && (
                  <div className="rounded-lg border border-linear-error/30 bg-linear-error/10 px-3 py-2 text-sm text-linear-error">
                    {createMutation.error.message}
                  </div>
                )}
                <div className="flex items-center justify-end gap-3">
                  <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-linear-text-secondary hover:text-linear-text">
                    Cancel
                  </button>
                  <button
                    onClick={() => createMutation.mutate()}
                    disabled={!name.trim() || createMutation.isPending}
                    className="rounded-lg bg-linear-accent px-4 py-2 font-medium text-white transition-colors hover:bg-linear-accent/80 disabled:opacity-50"
                  >
                    {createMutation.isPending ? 'Creating...' : 'Create initiative'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-linear-text">Initiatives</h1>
          <p className="mt-1 text-linear-text-secondary">Strategy-level bets linked to actual projects and issue execution.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-linear-accent px-4 py-2 font-medium text-white transition-colors hover:bg-linear-accent/80"
        >
          <Plus className="h-4 w-4" />
          New Initiative
        </button>
      </div>

      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-linear-text-tertiary" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search initiatives..."
            className="w-full rounded-lg border border-linear-border py-2 pl-10 pr-4 focus:border-transparent focus:ring-2 focus:ring-linear-accent/40"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-lg border border-linear-border px-3 py-2 focus:ring-2 focus:ring-linear-accent/40"
        >
          <option value="">All Statuses</option>
          {initiativeStatusOptions.map((option) => (
            <option key={option} value={option}>
              {option.replaceAll('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-linear-accent/30 border-t-primary-500" />
        </div>
      ) : initiatives.length === 0 ? (
        <div className="rounded-xl border border-linear-border bg-linear-surface py-16 text-center">
          <Target className="mx-auto mb-4 h-12 w-12 text-linear-text-tertiary" />
          <h3 className="mb-2 text-lg font-medium text-linear-text">No initiatives yet</h3>
          <p className="mb-4 text-linear-text-secondary">Create one to connect a strategic outcome to active delivery work.</p>
          <button onClick={() => setShowCreateModal(true)} className="font-medium text-linear-accent hover:text-linear-accent">
            Create initiative
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {initiatives.map((initiative) => (
            <section
              key={initiative.id}
              className={`rounded-xl border bg-linear-surface p-5 ${
                highlightedInitiativeId === initiative.id ? 'border-linear-accent shadow-[0_0_0_1px_rgba(94,106,210,0.25)]' : 'border-linear-border'
              }`}
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-linear-text">{initiative.name}</h2>
                    <span className="rounded bg-linear-elevated px-2 py-1 text-xs font-medium text-linear-text-secondary">
                      {initiative.status.replaceAll('_', ' ')}
                    </span>
                  </div>
                  {initiative.description && <p className="text-sm text-linear-text-secondary">{initiative.description}</p>}
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-linear-text">{initiative.progress}%</div>
                  <div className="text-xs text-linear-text-secondary">Average progress</div>
                </div>
              </div>

              <div className="mb-4 h-2 w-full rounded-full bg-linear-elevated">
                <div className="h-2 rounded-full bg-linear-accent" style={{ width: `${initiative.progress}%` }} />
              </div>

              <div className="mb-4 grid grid-cols-1 gap-3 text-sm text-linear-text-secondary md:grid-cols-3">
                <div>
                  <div className="text-xs uppercase tracking-wider text-linear-text-tertiary">Projects</div>
                  <div className="mt-1 font-medium text-linear-text">{initiative.projects.length}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-linear-text-tertiary">Target Date</div>
                  <div className="mt-1 font-medium text-linear-text">{initiative.targetDate ? new Date(initiative.targetDate).toLocaleDateString() : 'Not set'}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-linear-text-tertiary">Success Metric</div>
                  <div className="mt-1 font-medium text-linear-text">{initiative.successMetric || 'Not defined'}</div>
                </div>
              </div>

              {(initiative.problemStatement || initiative.customerOutcome) && (
                <div className="mb-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg bg-linear-elevated/60 p-3">
                    <div className="mb-1 text-xs uppercase tracking-wider text-linear-text-tertiary">Problem</div>
                    <p className="text-sm text-linear-text-secondary">{initiative.problemStatement || 'No problem statement captured yet.'}</p>
                  </div>
                  <div className="rounded-lg bg-linear-elevated/60 p-3">
                    <div className="mb-1 text-xs uppercase tracking-wider text-linear-text-tertiary">Customer Outcome</div>
                    <p className="text-sm text-linear-text-secondary">{initiative.customerOutcome || 'No customer outcome captured yet.'}</p>
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-linear-border bg-linear-elevated/40 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium text-linear-text">
                    <FolderKanban className="h-4 w-4" />
                    Linked Projects
                  </div>
                  {initiative.projects[0] && (
                    <Link
                      to={`/${workspace}/issues?projectId=${initiative.projects[0].id}`}
                      className="flex items-center gap-1 text-xs text-linear-accent hover:text-linear-accent"
                    >
                      Open issues
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
                {initiative.projects.length === 0 ? (
                  <p className="text-sm text-linear-text-secondary">No project has been linked yet.</p>
                ) : (
                  <div className="space-y-2">
                    {initiative.projects.map((project) => (
                      <Link
                        key={project.id}
                        to={`/${workspace}/projects/${project.id}`}
                        className="flex items-center justify-between rounded-lg bg-linear-surface px-3 py-2 transition-colors hover:bg-linear-border"
                      >
                        <div>
                          <div className="font-medium text-linear-text">{project.name}</div>
                          <div className="text-xs text-linear-text-secondary">{project.issueCount} linked issues</div>
                        </div>
                        <div className="text-right text-xs text-linear-text-secondary">
                          <div>{project.status.replaceAll('_', ' ')}</div>
                          <div>{project.progress}% complete</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </AnimatedPage>
  );
}