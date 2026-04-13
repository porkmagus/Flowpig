import { useState, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Plus, 
  ArrowUpDown, 
  MoreHorizontal,
  Check,
  X,
  ChevronDown,
  LayoutGrid,
  List,
  Columns,
  Download,
  Archive,
  Trash2,
  Copy,
  FolderKanban,
  User,
  Flag,
  Calendar,
  Clock,
  Tag,
  Layers,
  AlertCircle,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { API_URL } from '~/lib/api';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Input } from '~/components/ui/input';
import { FadeIn, StaggerContainer, StaggerItem } from '~/components/ui/motion';
import { CreateIssueModal, useCreateIssueModal } from '~/components/create-issue-modal';

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
  cycle: {
    id: string;
    number: number;
    isActive: boolean;
  } | null;
  labels: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  commentCount: number;
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
  team: string[];
  project: string[];
  cycle: string[];
  labels: string[];
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
  const queryClient = useQueryClient();
  const createIssueModal = useCreateIssueModal();
  
  // View state
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    state: [],
    priority: [],
    assignee: [],
    team: [],
    project: [],
    cycle: [],
    labels: [],
    dueDate: null,
  });
  
  // Sort state
  const [sort, setSort] = useState<SortState>({ field: 'createdAt', direction: 'desc' });
  
  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [editingIssue, setEditingIssue] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Fetch issues
  const { data: issues, isLoading } = useQuery({
    queryKey: ['issues', workspace, filters, sort],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.state.length) params.append('state', filters.state.join(','));
      if (filters.priority.length) params.append('priority', filters.priority.join(','));
      if (filters.assignee.length) params.append('assignee', filters.assignee.join(','));
      if (filters.team.length) params.append('team', filters.team.join(','));
      params.append('sort', sort.field);
      params.append('order', sort.direction);
      
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/issues?${params}`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to fetch issues');
      return response.json();
    },
  });

  // Fetch filter options
  const { data: teams } = useQuery({
    queryKey: ['teams', workspace],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/teams`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      return response.json();
    },
  });

  const { data: users } = useQuery({
    queryKey: ['workspace-users', workspace],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/members`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      return response.json();
    },
  });

  const { data: projects } = useQuery({
    queryKey: ['projects', workspace],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/projects`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      return response.json();
    },
  });

  const { data: labels } = useQuery({
    queryKey: ['labels', workspace],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/labels`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Mutations
  const updateIssueMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/issues/${id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) throw new Error('Failed to update issue');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues', workspace] });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, data }: { ids: string[]; data: any }) => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/issues/bulk-update`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ ids, ...data }),
        }
      );
      if (!response.ok) throw new Error('Failed to bulk update');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues', workspace] });
      setSelectedIssues(new Set());
      setIsSelectMode(false);
    },
  });

  // Handlers
  const toggleIssueSelection = (id: string) => {
    setSelectedIssues(prev => {
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
    if (issues) {
      setSelectedIssues(new Set(issues.map((i: Issue) => i.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIssues(new Set());
  };

  const startEditing = (issue: Issue) => {
    setEditingIssue(issue.id);
    setEditValue(issue.title);
  };

  const saveEdit = () => {
    if (editingIssue && editValue.trim()) {
      updateIssueMutation.mutate({
        id: editingIssue,
        data: { title: editValue.trim() },
      });
    }
    setEditingIssue(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingIssue(null);
    setEditValue('');
  };

  const handleBulkAction = (action: string, value?: string) => {
    if (selectedIssues.size === 0) return;
    
    const ids = Array.from(selectedIssues);
    
    switch (action) {
      case 'state':
        bulkUpdateMutation.mutate({ ids, data: { state: value } });
        break;
      case 'priority':
        bulkUpdateMutation.mutate({ ids, data: { priority: value } });
        break;
      case 'assignee':
        bulkUpdateMutation.mutate({ ids, data: { assigneeId: value } });
        break;
      case 'delete':
        if (confirm(`Delete ${selectedIssues.size} issues?`)) {
          bulkUpdateMutation.mutate({ ids, data: { deletedAt: new Date().toISOString() } });
        }
        break;
    }
  };

  // Filter badges
  const activeFiltersCount = Object.values(filters).filter(v => 
    Array.isArray(v) ? v.length > 0 : v !== null && v !== ''
  ).length;

  // Priority icon
  const PriorityIcon = ({ priority }: { priority: string }) => {
    const config = priorities.find(p => p.id === priority);
    if (!config) return null;
    return (
      <div className={cn("w-2 h-2 rounded-full", config.bg.replace('/10', ''))} />
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <FadeIn>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-linear-text tracking-tight">Issues</h1>
            <p className="text-sm text-linear-text-secondary mt-0.5">
              {issues?.length || 0} issues in this workspace
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'list' ? 'board' : 'list')}
              className="gap-1.5"
            >
              {viewMode === 'list' ? <LayoutGrid className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}
              {viewMode === 'list' ? 'Board' : 'List'}
            </Button>
            <Button size="sm" onClick={() => createIssueModal.open()} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              New issue
            </Button>
          </div>
        </div>
      </FadeIn>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-linear-text-tertiary" />
          <Input
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            placeholder="Search issues..."
            className="pl-9"
          />
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={cn("gap-1.5", showFilters && "bg-linear-surface")}
        >
          <Filter className="w-3.5 h-3.5" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge variant="accent" className="ml-1 text-[10px] px-1 py-0 h-4">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsSelectMode(!isSelectMode)}
          className={cn("gap-1.5", isSelectMode && "bg-linear-surface")}
        >
          <Check className="w-3.5 h-3.5" />
          Select
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSort(prev => ({
            ...prev,
            direction: prev.direction === 'asc' ? 'desc' : 'asc'
          }))}
          className="gap-1.5"
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          {sort.direction === 'asc' ? 'Asc' : 'Desc'}
        </Button>
      </div>

      {/* Bulk actions bar */}
      <AnimatePresence>
        {isSelectMode && selectedIssues.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 mb-4 p-2 bg-linear-accent-light border border-linear-accent/20 rounded-lg"
          >
            <span className="text-sm font-medium text-linear-accent px-2">
              {selectedIssues.size} selected
            </span>
            <div className="h-4 w-px bg-linear-accent/30" />
            
            {/* State actions */}
            <div className="flex items-center gap-1">
              {states.slice(0, 4).map(state => (
                <button
                  key={state.id}
                  onClick={() => handleBulkAction('state', state.id)}
                  className="px-2 py-1 text-xs font-medium rounded hover:bg-linear-accent/20 transition-colors"
                  style={{ color: state.color }}
                >
                  {state.label}
                </button>
              ))}
            </div>
            
            <div className="h-4 w-px bg-linear-accent/30" />
            
            <button
              onClick={() => handleBulkAction('delete')}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-priority-urgent hover:bg-priority-urgent/10 rounded transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
            
            <div className="flex-1" />
            
            <button
              onClick={selectAll}
              className="text-xs text-linear-accent hover:text-linear-accent-hover px-2"
            >
              Select all
            </button>
            <button
              onClick={clearSelection}
              className="text-xs text-linear-text-secondary hover:text-linear-text px-2"
            >
              Clear
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-3 bg-linear-surface border border-linear-border rounded-lg overflow-hidden"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* State filter */}
              <div>
                <label className="text-xs font-medium text-linear-text-secondary mb-1.5 block">State</label>
                <div className="flex flex-wrap gap-1">
                  {states.map(state => (
                    <button
                      key={state.id}
                      onClick={() => setFilters(prev => ({
                        ...prev,
                        state: prev.state.includes(state.id)
                          ? prev.state.filter(s => s !== state.id)
                          : [...prev.state, state.id]
                      }))}
                      className={cn(
                        "px-2 py-1 text-[10px] font-medium rounded-full border transition-colors",
                        filters.state.includes(state.id)
                          ? "bg-linear-accent text-white border-linear-accent"
                          : "bg-linear-elevated border-linear-border hover:border-linear-accent/50"
                      )}
                    >
                      {state.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority filter */}
              <div>
                <label className="text-xs font-medium text-linear-text-secondary mb-1.5 block">Priority</label>
                <div className="flex flex-wrap gap-1">
                  {priorities.map(priority => (
                    <button
                      key={priority.id}
                      onClick={() => setFilters(prev => ({
                        ...prev,
                        priority: prev.priority.includes(priority.id)
                          ? prev.priority.filter(p => p !== priority.id)
                          : [...prev.priority, priority.id]
                      }))}
                      className={cn(
                        "px-2 py-1 text-[10px] font-medium rounded-full border transition-colors",
                        filters.priority.includes(priority.id)
                          ? "bg-linear-accent text-white border-linear-accent"
                          : "bg-linear-elevated border-linear-border hover:border-linear-accent/50"
                      )}
                    >
                      {priority.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Assignee filter */}
              <div>
                <label className="text-xs font-medium text-linear-text-secondary mb-1.5 block">Assignee</label>
                <select
                  value={filters.assignee[0] || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    assignee: e.target.value ? [e.target.value] : []
                  }))}
                  className="w-full text-xs bg-linear-elevated border border-linear-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-linear-accent"
                >
                  <option value="">All assignees</option>
                  <option value="null">Unassigned</option>
                  {users?.map((user: any) => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Due date filter */}
              <div>
                <label className="text-xs font-medium text-linear-text-secondary mb-1.5 block">Due date</label>
                <select
                  value={filters.dueDate || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dueDate: e.target.value as any || null
                  }))}
                  className="w-full text-xs bg-linear-elevated border border-linear-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-linear-accent"
                >
                  <option value="">Any time</option>
                  <option value="overdue">Overdue</option>
                  <option value="today">Due today</option>
                  <option value="week">Due this week</option>
                  <option value="month">Due this month</option>
                </select>
              </div>
            </div>

            {/* Clear filters */}
            {activeFiltersCount > 0 && (
              <div className="mt-3 pt-3 border-t border-linear-border">
                <button
                  onClick={() => setFilters({
                    search: '',
                    state: [],
                    priority: [],
                    assignee: [],
                    team: [],
                    project: [],
                    cycle: [],
                    labels: [],
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

      {/* Issues List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 text-linear-accent animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <StaggerContainer className="space-y-1">
            {issues?.map((issue: Issue, index: number) => (
              <StaggerItem key={issue.id}>
                <motion.div
                  layout
                  className={cn(
                    "group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                    selectedIssues.has(issue.id) 
                      ? "bg-linear-accent-light border border-linear-accent/30" 
                      : "hover:bg-linear-surface border border-transparent"
                  )}
                >
                  {/* Selection checkbox */}
                  {isSelectMode && (
                    <button
                      onClick={() => toggleIssueSelection(issue.id)}
                      className={cn(
                        "shrink-0 w-4 h-4 rounded border transition-colors",
                        selectedIssues.has(issue.id)
                          ? "bg-linear-accent border-linear-accent text-white"
                          : "border-linear-border hover:border-linear-accent"
                      )}
                    >
                      {selectedIssues.has(issue.id) && <Check className="w-3 h-3" />}
                    </button>
                  )}

                  {/* Priority */}
                  <PriorityIcon priority={issue.priority} />

                  {/* Issue identifier */}
                  <div className="shrink-0 text-xs font-medium text-linear-text-tertiary w-14">
                    {issue.identifier}
                  </div>

                  {/* Title - editable inline */}
                  {editingIssue === issue.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-7 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit();
                          if (e.key === 'Escape') cancelEdit();
                        }}
                      />
                      <button onClick={saveEdit} className="p-1 text-linear-success hover:bg-linear-success-light rounded">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={cancelEdit} className="p-1 text-priority-urgent hover:bg-priority-urgent/10 rounded">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <Link
                      to={`/${workspace}/issues/${issue.id}`}
                      onDoubleClick={() => startEditing(issue)}
                      className={cn(
                        "flex-1 min-w-0 text-sm transition-colors",
                        issue.state === 'DONE' || issue.state === 'CANCELED'
                          ? "text-linear-text-tertiary line-through"
                          : "text-linear-text hover:text-linear-accent"
                      )}
                    >
                      <span className="truncate block">{issue.title}</span>
                    </Link>
                  )}

                  {/* Labels */}
                  {issue.labels.length > 0 && (
                    <div className="shrink-0 flex gap-1">
                      {issue.labels.slice(0, 2).map(label => (
                        <Badge
                          key={label.id}
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 h-4"
                          style={{
                            borderColor: label.color + '40',
                            backgroundColor: label.color + '15',
                            color: label.color
                          }}
                        >
                          {label.name}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Assignee */}
                  {issue.assignee ? (
                    <div className="shrink-0 w-6 h-6 rounded-full bg-linear-accent text-white flex items-center justify-center text-[10px] font-medium">
                      {issue.assignee.name?.[0]?.toUpperCase() || '?'}
                    </div>
                  ) : (
                    <div className="shrink-0 w-6 h-6 rounded-full border border-dashed border-linear-border" />
                  )}

                  {/* State badge */}
                  <Badge
                    variant="outline"
                    className="shrink-0 text-[10px] px-1.5 py-0 h-5"
                    style={{
                      borderColor: issue.workflowState?.color + '40' || '#E6E6E6',
                      backgroundColor: (issue.workflowState?.color || '#6E6E6E') + '15',
                      color: issue.workflowState?.color || '#6E6E6E'
                    }}
                  >
                    {issue.workflowState?.name || issue.state}
                  </Badge>

                  {/* Comments */}
                  {issue.commentCount > 0 && (
                    <div className="shrink-0 text-xs text-linear-text-tertiary flex items-center gap-1">
                      <span>{issue.commentCount}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-linear-border rounded transition-all">
                    <MoreHorizontal className="w-4 h-4 text-linear-text-secondary" />
                  </button>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>

          {/* Empty state */}
          {(!issues || issues.length === 0) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-linear-surface flex items-center justify-center border border-linear-border">
                <Search className="w-6 h-6 text-linear-text-tertiary" />
              </div>
              <h3 className="text-base font-medium text-linear-text mb-1">No issues found</h3>
              <p className="text-sm text-linear-text-secondary">
                {activeFiltersCount > 0 
                  ? 'Try adjusting your filters' 
                  : 'Create your first issue to get started'}
              </p>
              {!activeFiltersCount && (
                <Button
                  size="sm"
                  className="mt-4"
                  onClick={() => createIssueModal.open()}
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Create issue
                </Button>
              )}
            </motion.div>
          )}
        </div>
      )}

      {/* Create Issue Modal */}
      <CreateIssueModal
        isOpen={createIssueModal.isOpen}
        onClose={createIssueModal.close}
        initialValues={createIssueModal.initialValues}
      />
    </div>
  );
}
