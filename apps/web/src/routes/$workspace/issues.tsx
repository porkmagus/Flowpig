import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUpDown,
  Bookmark,
  Check,
  CornerUpRight,
  Filter,
  LayoutGrid,
  List,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { API_URL } from '~/lib/api';
import { cn } from '~/lib/utils';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { FadeIn, StaggerContainer, StaggerItem } from '~/components/ui/motion';
import { CreateIssueModal, useCreateIssueModal } from '~/components/create-issue-modal';
import { IssueBoard } from '~/components/issue-board';

interface Issue {
  id: string;
  identifier: string;
  title: string;
  state: string;
  priority: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  assignee: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  team: {
    id: string;
    name: string;
    key: string;
    color: string;
  } | null;
  project: {
    id: string;
    name: string;
  } | null;
  labels: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  commentCount: number;
  childrenCount?: number;
  workflowState: {
    id: string;
    name: string;
    color: string;
    category: string;
  } | null;
}

interface FilterState {
  search: string;
  state: string[];
  priority: string[];
  assignee: string[];
  project: string[];
  dueDate: 'overdue' | 'today' | 'week' | 'month' | null;
}

interface SortState {
  field: 'createdAt' | 'updatedAt' | 'priority' | 'dueDate' | 'title';
  direction: 'asc' | 'desc';
}

const priorities = [
  { id: 'URGENT', label: 'Urgent', color: 'text-priority-urgent', bg: 'bg-priority-urgent/10' },
  { id: 'HIGH', label: 'High', color: 'text-priority-high', bg: 'bg-priority-high/10' },
  { id: 'MEDIUM', label: 'Medium', color: 'text-priority-medium', bg: 'bg-priority-medium/10' },
  { id: 'LOW', label: 'Low', color: 'text-priority-low', bg: 'bg-priority-low/10' },
  { id: 'NO_PRIORITY', label: 'No priority', color: 'text-priority-none', bg: 'bg-priority-none/10' },
];

const states = [
  { id: 'BACKLOG', label: 'Backlog', color: '#6E6E6E' },
  { id: 'TODO', label: 'To do', color: '#6E6E6E' },
  { id: 'IN_PROGRESS', label: 'In progress', color: '#F2A50C' },
  { id: 'DONE', label: 'Done', color: '#0D9B6A' },
  { id: 'CANCELED', label: 'Canceled', color: '#D13B3B' },
];

export default function IssuesList() {
  const { workspace } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialProjectId = searchParams.get('projectId');
  const queryClient = useQueryClient();
  const createIssueModal = useCreateIssueModal();

  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    state: [],
    priority: [],
    assignee: [],
    project: initialProjectId ? [initialProjectId] : [],
    dueDate: null,
  });
  const [sort, setSort] = useState<SortState>({ field: 'createdAt', direction: 'desc' });
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [editingIssue, setEditingIssue] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showSaveView, setShowSaveView] = useState(false);
  const [viewName, setViewName] = useState('');
  const [activeViewId, setActiveViewId] = useState<string | null>(null);

  // Fetch saved views
  const { data: viewsData } = useQuery({
    queryKey: ['issue-views', workspace],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/issue-views`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch views');
      return response.json() as Promise<{ views: Array<{
        id: string; name: string; filters: FilterState; sort: SortState; isDefault: boolean; createdById: string;
      }> }>;
    },
    enabled: !!workspace,
  });

  const createViewMutation = useMutation({
    mutationFn: async (payload: { name: string; filters: FilterState; sort: SortState; isDefault?: boolean }) => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/issue-views`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to save view');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue-views', workspace] });
      setShowSaveView(false);
      setViewName('');
    },
  });

  const deleteViewMutation = useMutation({
    mutationFn: async (viewId: string) => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/issue-views/${viewId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete view');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue-views', workspace] });
      setActiveViewId(null);
    },
  });

  const applyView = (viewId: string) => {
    const view = viewsData?.views.find((v) => v.id === viewId);
    if (!view) return;
    setActiveViewId(viewId);
    if (view.filters) setFilters(view.filters);
    if (view.sort) setSort(view.sort);
  };

  useEffect(() => {
    const projectId = searchParams.get('projectId');
    setFilters((prev) => {
      const nextProject = projectId ? [projectId] : [];
      if (prev.project.join(',') === nextProject.join(',')) {
        return prev;
      }
      return { ...prev, project: nextProject };
    });
  }, [searchParams]);

  useEffect(() => {
    const currentProjectId = searchParams.get('projectId') || '';
    const nextProjectId = filters.project[0] || '';
    if (currentProjectId === nextProjectId) return;

    const nextParams = new URLSearchParams(searchParams);
    if (nextProjectId) {
      nextParams.set('projectId', nextProjectId);
    } else {
      nextParams.delete('projectId');
    }
    setSearchParams(nextParams, { replace: true });
  }, [filters.project, searchParams, setSearchParams]);

  const { data: issueData, isLoading } = useQuery({
    queryKey: ['issues', workspace, filters, sort],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.state.length) params.append('state', filters.state.join(','));
      if (filters.priority.length) params.append('priority', filters.priority.join(','));
      if (filters.assignee.length) params.append('assignee', filters.assignee.join(','));
      if (filters.project.length) params.append('projectId', filters.project.join(','));
      params.append('sort', sort.field);
      params.append('order', sort.direction);

      const response = await fetch(`${API_URL}/workspaces/${workspace}/issues?${params.toString()}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch issues');
      return response.json() as Promise<{ issues: Issue[] }>;
    },
    enabled: !!workspace,
    placeholderData: keepPreviousData,
  });

  const { data: users } = useQuery({
    queryKey: ['workspace-users', workspace],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/members`, {
        credentials: 'include',
      });
      if (!response.ok) return [] as Array<{ id: string; name: string | null; email: string }>;
      const payload = await response.json() as {
        members: Array<{ user: { id: string; name: string | null; email: string } }>;
      };
      return payload.members.map((member) => member.user);
    },
    enabled: !!workspace,
  });

  const { data: projects } = useQuery({
    queryKey: ['projects', workspace],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/projects`, {
        credentials: 'include',
      });
      if (!response.ok) return [] as Array<{ id: string; name: string }>;
      const payload = await response.json() as { projects: Array<{ id: string; name: string }> };
      return payload.projects;
    },
    enabled: !!workspace,
  });

  const visibleIssues = useMemo(() => {
    const items = issueData?.issues ?? [];
    if (!filters.dueDate) return items;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);
    const endOfWeek = new Date(startOfToday);
    endOfWeek.setDate(endOfWeek.getDate() + 7);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    return items.filter((issue) => {
      if (!issue.dueDate) return false;
      const dueDate = new Date(issue.dueDate);
      if (filters.dueDate === 'overdue') return dueDate < startOfToday;
      if (filters.dueDate === 'today') return dueDate >= startOfToday && dueDate < endOfToday;
      if (filters.dueDate === 'week') return dueDate >= startOfToday && dueDate < endOfWeek;
      if (filters.dueDate === 'month') return dueDate >= startOfToday && dueDate <= endOfMonth;
      return true;
    });
  }, [issueData?.issues, filters.dueDate]);

  const updateIssueMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/issues/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update issue');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues', workspace] });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: any }) => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/issues/bulk-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ issueIds: ids, updates }),
      });
      if (!response.ok) throw new Error('Failed to bulk update');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues', workspace] });
      setSelectedIssues(new Set());
      setIsSelectMode(false);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/issues/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ issueIds: ids }),
      });
      if (!response.ok) throw new Error('Failed to bulk delete');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues', workspace] });
      setSelectedIssues(new Set());
      setIsSelectMode(false);
    },
  });

  const activeFiltersCount = Object.values(filters).filter((value) => Array.isArray(value) ? value.length > 0 : value !== null && value !== '').length;

  const toggleIssueSelection = (id: string) => {
    setSelectedIssues((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIssues(new Set(visibleIssues.map((issue) => issue.id)));
  };

  const startEditing = (issue: Issue) => {
    setEditingIssue(issue.id);
    setEditValue(issue.title);
  };

  const saveEdit = () => {
    if (editingIssue && editValue.trim()) {
      updateIssueMutation.mutate({ id: editingIssue, data: { title: editValue.trim() } });
    }
    setEditingIssue(null);
    setEditValue('');
  };

  const clearSelection = () => {
    setSelectedIssues(new Set());
  };

  const handleBulkAction = (action: 'state' | 'delete', value?: string) => {
    if (selectedIssues.size === 0) return;
    const ids = Array.from(selectedIssues);

    if (action === 'state' && value) {
      bulkUpdateMutation.mutate({ ids, updates: { state: value } });
      return;
    }

    if (action === 'delete' && confirm(`Delete ${selectedIssues.size} issues?`)) {
      bulkDeleteMutation.mutate(ids);
    }
  };

  const priorityDot = (priority: string) => {
    const config = priorities.find((item) => item.id === priority);
    return <div className={cn('h-2 w-2 rounded-full', config?.bg.replace('/10', '') || 'bg-linear-border')} />;
  };

  return (
    <div className="flex h-full flex-col">
      <FadeIn>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-linear-text">Issues</h1>
            <p className="mt-0.5 text-sm text-linear-text-secondary">
              {visibleIssues.length} issues{filters.project.length === 1 ? ' in the selected project' : ' in this workspace'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-linear-surface rounded-md border border-linear-border">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "p-1.5 rounded-l-md transition-colors",
                  viewMode === 'list' ? "bg-linear-accent-light text-linear-accent" : "text-linear-text-secondary hover:text-linear-text"
                )}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('board')}
                className={cn(
                  "p-1.5 rounded-r-md transition-colors",
                  viewMode === 'board' ? "bg-linear-accent-light text-linear-accent" : "text-linear-text-secondary hover:text-linear-text"
                )}
                title="Board view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {/* Saved Views */}
            {viewsData && viewsData.views.length > 0 && (
              <select
                value={activeViewId || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    applyView(e.target.value);
                  } else {
                    setActiveViewId(null);
                  }
                }}
                className="h-8 rounded-md border border-linear-border bg-linear-surface px-2 text-xs focus:outline-none focus:ring-2 focus:ring-linear-accent"
              >
                <option value="">All issues</option>
                {viewsData.views.map((view) => (
                  <option key={view.id} value={view.id}>
                    {view.name}{view.isDefault ? ' ★' : ''}
                  </option>
                ))}
              </select>
            )}

            <Button size="sm" onClick={() => createIssueModal.open()} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              New issue
            </Button>
          </div>
        </div>
      </FadeIn>

      <div className="mb-4 flex items-center gap-2">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-linear-text-tertiary" />
          <Input
            value={filters.search}
            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
            placeholder="Search issues..."
            className="pl-9"
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters((prev) => !prev)}
          className={cn('gap-1.5', showFilters && 'bg-linear-surface')}
        >
          <Filter className="h-3.5 w-3.5" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge variant="accent" className="ml-1 h-4 px-1 py-0 text-[10px]">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSaveView(true)}
          className="gap-1.5"
        >
          <Bookmark className="h-3.5 w-3.5" />
          Save view
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsSelectMode((prev) => !prev)}
          className={cn('gap-1.5', isSelectMode && 'bg-linear-surface')}
        >
          <Check className="h-3.5 w-3.5" />
          Select
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSort((prev) => ({ ...prev, direction: prev.direction === 'asc' ? 'desc' : 'asc' }))}
          className="gap-1.5"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          {sort.direction === 'asc' ? 'Asc' : 'Desc'}
        </Button>
      </div>

      <AnimatePresence>
        {isSelectMode && selectedIssues.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 flex items-center gap-2 rounded-lg border border-linear-accent/20 bg-linear-accent-light p-2"
          >
            <span className="px-2 text-sm font-medium text-linear-accent">{selectedIssues.size} selected</span>
            <div className="h-4 w-px bg-linear-accent/30" />
            <div className="flex items-center gap-1">
              {states.slice(0, 4).map((state) => (
                <button
                  key={state.id}
                  onClick={() => handleBulkAction('state', state.id)}
                  className="rounded px-2 py-1 text-xs font-medium transition-colors hover:bg-linear-accent/20"
                  style={{ color: state.color }}
                >
                  {state.label}
                </button>
              ))}
            </div>
            <div className="h-4 w-px bg-linear-accent/30" />
            <button
              onClick={() => handleBulkAction('delete')}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-priority-urgent transition-colors hover:bg-priority-urgent/10"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </button>
            <div className="flex-1" />
            <button onClick={selectAll} className="px-2 text-xs text-linear-accent hover:text-linear-accent-hover">Select all</button>
            <button onClick={clearSelection} className="px-2 text-xs text-linear-text-secondary hover:text-linear-text">Clear</button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 overflow-hidden rounded-lg border border-linear-border bg-linear-surface p-3"
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-linear-text-secondary">State</label>
                <div className="flex flex-wrap gap-1">
                  {states.map((state) => (
                    <button
                      key={state.id}
                      onClick={() => setFilters((prev) => ({
                        ...prev,
                        state: prev.state.includes(state.id)
                          ? prev.state.filter((value) => value !== state.id)
                          : [...prev.state, state.id],
                      }))}
                      className={cn(
                        'rounded-full border px-2 py-1 text-[10px] font-medium transition-colors',
                        filters.state.includes(state.id)
                          ? 'border-linear-accent bg-linear-accent text-white'
                          : 'border-linear-border bg-linear-elevated hover:border-linear-accent/50'
                      )}
                    >
                      {state.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-linear-text-secondary">Priority</label>
                <div className="flex flex-wrap gap-1">
                  {priorities.map((priority) => (
                    <button
                      key={priority.id}
                      onClick={() => setFilters((prev) => ({
                        ...prev,
                        priority: prev.priority.includes(priority.id)
                          ? prev.priority.filter((value) => value !== priority.id)
                          : [...prev.priority, priority.id],
                      }))}
                      className={cn(
                        'rounded-full border px-2 py-1 text-[10px] font-medium transition-colors',
                        filters.priority.includes(priority.id)
                          ? 'border-linear-accent bg-linear-accent text-white'
                          : 'border-linear-border bg-linear-elevated hover:border-linear-accent/50'
                      )}
                    >
                      {priority.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-linear-text-secondary">Assignee</label>
                <select
                  value={filters.assignee[0] || ''}
                  onChange={(event) => setFilters((prev) => ({
                    ...prev,
                    assignee: event.target.value ? [event.target.value] : [],
                  }))}
                  className="w-full rounded-md border border-linear-border bg-linear-elevated px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-linear-accent"
                >
                  <option value="">All assignees</option>
                  {users?.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-linear-text-secondary">Project</label>
                <select
                  value={filters.project[0] || ''}
                  onChange={(event) => setFilters((prev) => ({
                    ...prev,
                    project: event.target.value ? [event.target.value] : [],
                  }))}
                  className="w-full rounded-md border border-linear-border bg-linear-elevated px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-linear-accent"
                >
                  <option value="">All projects</option>
                  {projects?.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-linear-text-secondary">Due date</label>
                <select
                  value={filters.dueDate || ''}
                  onChange={(event) => setFilters((prev) => ({
                    ...prev,
                    dueDate: event.target.value ? event.target.value as FilterState['dueDate'] : null,
                  }))}
                  className="w-full rounded-md border border-linear-border bg-linear-elevated px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-linear-accent"
                >
                  <option value="">Any time</option>
                  <option value="overdue">Overdue</option>
                  <option value="today">Due today</option>
                  <option value="week">Due this week</option>
                  <option value="month">Due this month</option>
                </select>
              </div>
            </div>

            {activeFiltersCount > 0 && (
              <div className="mt-3 border-t border-linear-border pt-3">
                <button
                  onClick={() => setFilters({
                    search: '',
                    state: [],
                    priority: [],
                    assignee: [],
                    project: [],
                    dueDate: null,
                  })}
                  className="text-xs text-linear-accent hover:text-linear-accent-hover"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save View Modal */}
      <AnimatePresence>
        {showSaveView && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setShowSaveView(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-lg border border-linear-border bg-linear-elevated p-4 shadow-lg"
            >
              <h3 className="text-sm font-semibold text-linear-text mb-3">Save current view</h3>
              <Input
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                placeholder="View name..."
                className="mb-3"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setShowSaveView(false); setViewName(''); }}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={!viewName.trim() || createViewMutation.isPending}
                  onClick={() => {
                    createViewMutation.mutate({
                      name: viewName.trim(),
                      filters,
                      sort,
                    });
                  }}
                >
                  {createViewMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-linear-accent" />
        </div>
      ) : viewMode === 'board' ? (
        <IssueBoard
          issues={visibleIssues}
          onStateChange={(issueId, newState) => {
            updateIssueMutation.mutate({ id: issueId, data: { state: newState } });
          }}
        />
      ) : (
        <div className="flex-1 overflow-auto">
          <StaggerContainer className="space-y-1">
            {visibleIssues.map((issue) => (
              <StaggerItem key={issue.id}>
                <motion.div
                  layout
                  className={cn(
                    'group flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 transition-colors',
                    selectedIssues.has(issue.id)
                      ? 'border-linear-accent/30 bg-linear-accent-light'
                      : 'hover:bg-linear-surface'
                  )}
                >
                  {isSelectMode && (
                    <button
                      onClick={() => toggleIssueSelection(issue.id)}
                      className={cn(
                        'h-4 w-4 shrink-0 rounded border transition-colors',
                        selectedIssues.has(issue.id)
                          ? 'border-linear-accent bg-linear-accent text-white'
                          : 'border-linear-border hover:border-linear-accent'
                      )}
                    >
                      {selectedIssues.has(issue.id) && <Check className="h-3 w-3" />}
                    </button>
                  )}

                  {priorityDot(issue.priority)}

                  <div className="w-14 shrink-0 text-xs font-medium text-linear-text-tertiary">{issue.identifier}</div>

                  {editingIssue === issue.id ? (
                    <div className="flex flex-1 items-center gap-2">
                      <Input
                        value={editValue}
                        onChange={(event) => setEditValue(event.target.value)}
                        className="h-7 text-sm"
                        autoFocus
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') saveEdit();
                          if (event.key === 'Escape') {
                            setEditingIssue(null);
                            setEditValue('');
                          }
                        }}
                      />
                      <button onClick={saveEdit} className="rounded p-1 text-linear-success hover:bg-linear-success-light">
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => { setEditingIssue(null); setEditValue(''); }} className="rounded p-1 text-priority-urgent hover:bg-priority-urgent/10">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <Link
                      to={`/${workspace}/issues/${issue.id}`}
                      onDoubleClick={() => startEditing(issue)}
                      className={cn(
                        'min-w-0 flex-1 text-sm transition-colors',
                        issue.state === 'DONE' || issue.state === 'CANCELED'
                          ? 'text-linear-text-tertiary line-through'
                          : 'text-linear-text hover:text-linear-accent'
                      )}
                    >
                      <span className="block truncate">{issue.title}</span>
                    </Link>
                  )}

                  {issue.project && (
                    <Badge variant="outline" className="h-5 shrink-0 px-1.5 py-0 text-[10px]">
                      {issue.project.name}
                    </Badge>
                  )}

                  {issue.labels.length > 0 && (
                    <div className="hidden shrink-0 gap-1 md:flex">
                      {issue.labels.slice(0, 2).map((label) => (
                        <Badge
                          key={label.id}
                          variant="outline"
                          className="h-4 px-1.5 py-0 text-[10px]"
                          style={{
                            borderColor: `${label.color}40`,
                            backgroundColor: `${label.color}15`,
                            color: label.color,
                          }}
                        >
                          {label.name}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {issue.assignee ? (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-linear-accent text-[10px] font-medium text-white">
                      {issue.assignee.name?.[0]?.toUpperCase() || '?'}
                    </div>
                  ) : (
                    <div className="h-6 w-6 shrink-0 rounded-full border border-dashed border-linear-border" />
                  )}

                  <Badge
                    variant="outline"
                    className="h-5 shrink-0 px-1.5 py-0 text-[10px]"
                    style={{
                      borderColor: `${issue.workflowState?.color || '#6E6E6E'}40`,
                      backgroundColor: `${issue.workflowState?.color || '#6E6E6E'}15`,
                      color: issue.workflowState?.color || '#6E6E6E',
                    }}
                  >
                    {issue.workflowState?.name || issue.state}
                  </Badge>

                  {issue.childrenCount ? (
                    <div className="shrink-0 flex items-center gap-0.5 text-xs text-linear-text-tertiary">
                      <CornerUpRight className="w-3 h-3" />
                      {issue.childrenCount}
                    </div>
                  ) : null}
                  {issue.commentCount > 0 && <div className="shrink-0 text-xs text-linear-text-tertiary">{issue.commentCount}</div>}

                  <button className="rounded p-1 opacity-0 transition-all hover:bg-linear-border group-hover:opacity-100">
                    <MoreHorizontal className="h-4 w-4 text-linear-text-secondary" />
                  </button>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>

          {visibleIssues.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-16 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-linear-border bg-linear-surface">
                <Search className="h-6 w-6 text-linear-text-tertiary" />
              </div>
              <h3 className="mb-1 text-base font-medium text-linear-text">No issues found</h3>
              <p className="text-sm text-linear-text-secondary">
                {activeFiltersCount > 0 ? 'Try adjusting your filters.' : 'Create your first issue to get started.'}
              </p>
              {!activeFiltersCount && (
                <Button size="sm" className="mt-4" onClick={() => createIssueModal.open()}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Create issue
                </Button>
              )}
            </motion.div>
          )}
        </div>
      )}

      <CreateIssueModal
        isOpen={createIssueModal.isOpen}
        onClose={createIssueModal.close}
        initialValues={createIssueModal.initialValues}
      />
    </div>
  );
}

