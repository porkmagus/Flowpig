import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  CheckCircle2,
  Clock3,
  Filter,
  Inbox,
  Loader2,
  Search,
  UserPlus,
  XCircle,
} from 'lucide-react';
import { API_URL } from '~/lib/runtime-config';
import { useWorkspaceRealtime } from '~/lib/ws';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { FadeIn, StaggerContainer, StaggerItem } from '~/components/ui/motion';

interface TeamListResponse {
  teams: Array<{
    id: string;
    name: string;
    key: string;
    color: string;
    issueCount: number;
  }>;
}

interface TeamDetailResponse {
  team: {
    id: string;
    name: string;
    key: string;
    color: string;
    triageOwner: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    } | null;
    members: Array<{
      id: string;
      user: {
        id: string;
        name: string | null;
        email: string;
        image: string | null;
      };
    }>;
    workflowStates: Array<{
      id: string;
      name: string;
      color: string;
      category: string;
      isTriage?: boolean;
      isDuplicate?: boolean;
    }>;
  };
}

interface TriageIssue {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  priority: 'NO_PRIORITY' | 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  state: string;
  createdAt: string;
  updatedAt: string;
  dueDate: string | null;
  assignee: { id: string; name: string | null; image: string | null } | null;
  creator: { id: string; name: string | null; image: string | null };
  project: { id: string; name: string } | null;
  workflowState: { id: string; name: string; color: string } | null;
  labels: Array<{ id: string; name: string; color: string }>;
  commentCount?: number;
}

interface TriageResponse {
  issues: TriageIssue[];
}

interface TriageStatsResponse {
  stats: {
    totalTriage: number;
    totalTeamIssues: number;
    byPriority: {
      NO_PRIORITY: number;
      LOW: number;
      MEDIUM: number;
      HIGH: number;
      URGENT: number;
    };
    oldestIssue: {
      identifier: string;
      title: string;
      createdAt: string;
      daysOld: number;
    } | null;
  };
}

interface DuplicateCandidate {
  id: string;
  identifier: string;
  title: string;
  state: string;
  priority: 'NO_PRIORITY' | 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  project: { id: string; name: string } | null;
}

interface DuplicateSearchResponse {
  issues: DuplicateCandidate[];
}

const priorityMeta = {
  URGENT: { label: 'Urgent', className: 'bg-red-500/10 text-red-300 border-red-500/20' },
  HIGH: { label: 'High', className: 'bg-orange-500/10 text-orange-300 border-orange-500/20' },
  MEDIUM: { label: 'Medium', className: 'bg-amber-500/10 text-amber-300 border-amber-500/20' },
  LOW: { label: 'Low', className: 'bg-sky-500/10 text-sky-300 border-sky-500/20' },
  NO_PRIORITY: { label: 'No priority', className: 'bg-linear-elevated text-linear-text-secondary border-linear-border' },
} as const;

const snoozeOptions = [3, 7, 14];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRelativeDays(createdAt: string) {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  return `${diffDays}d in triage`;
}

export default function TriagePage() {
  const { workspace } = useParams();
  const queryClient = useQueryClient();
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | keyof typeof priorityMeta>('ALL');
  const [sortMode, setSortMode] = useState<'oldest' | 'priority' | 'newest'>('oldest');
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, string>>({});
  const [workflowDrafts, setWorkflowDrafts] = useState<Record<string, string>>({});
  const [snoozeDrafts, setSnoozeDrafts] = useState<Record<string, number>>({});
  const [duplicatePickerIssueId, setDuplicatePickerIssueId] = useState<string | null>(null);
  const [duplicateSearchDrafts, setDuplicateSearchDrafts] = useState<Record<string, string>>({});
  const [duplicateTargetDrafts, setDuplicateTargetDrafts] = useState<Record<string, string>>({});

  const { data: teamsData } = useQuery({
    queryKey: ['teams', workspace],
    enabled: !!workspace,
    queryFn: async () => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/teams`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch teams');
      const payload = await response.json() as TeamListResponse;
      return payload.teams;
    },
  });

  useEffect(() => {
    if (!selectedTeamId && teamsData?.length) {
      setSelectedTeamId(teamsData[0].id);
    }
  }, [selectedTeamId, teamsData]);

  const { data: teamDetail } = useQuery({
    queryKey: ['team-detail', workspace, selectedTeamId],
    enabled: !!workspace && !!selectedTeamId,
    queryFn: async (): Promise<TeamDetailResponse> => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/teams/${selectedTeamId}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch team detail');
      return response.json();
    },
  });

  const { data: triageData, isLoading } = useQuery({
    queryKey: ['triage', workspace, selectedTeamId],
    enabled: !!workspace && !!selectedTeamId,
    queryFn: async (): Promise<TriageResponse> => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/teams/${selectedTeamId}/triage`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch triage inbox');
      return response.json();
    },
  });

  const { data: statsData } = useQuery({
    queryKey: ['triage-stats', workspace, selectedTeamId],
    enabled: !!workspace && !!selectedTeamId,
    queryFn: async (): Promise<TriageStatsResponse> => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/teams/${selectedTeamId}/triage/stats`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch triage stats');
      return response.json();
    },
  });

  useWorkspaceRealtime(workspace, {
    onIssueUpdated: () => {
      queryClient.invalidateQueries({ queryKey: ['triage', workspace, selectedTeamId] });
      queryClient.invalidateQueries({ queryKey: ['triage-stats', workspace, selectedTeamId] });
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ issueId, assigneeId, workflowStateId }: { issueId: string; assigneeId?: string; workflowStateId?: string }) => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/teams/${selectedTeamId}/triage/${issueId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ assigneeId, workflowStateId }),
      });
      if (!response.ok) throw new Error('Failed to triage issue');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triage', workspace, selectedTeamId] });
      queryClient.invalidateQueries({ queryKey: ['triage-stats', workspace, selectedTeamId] });
    },
  });

  const snoozeMutation = useMutation({
    mutationFn: async ({ issueId, days }: { issueId: string; days: number }) => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/teams/${selectedTeamId}/triage/${issueId}/snooze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ days }),
      });
      if (!response.ok) throw new Error('Failed to snooze issue');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triage', workspace, selectedTeamId] });
      queryClient.invalidateQueries({ queryKey: ['triage-stats', workspace, selectedTeamId] });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async (issueId: string) => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/teams/${selectedTeamId}/triage/${issueId}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to decline issue');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triage', workspace, selectedTeamId] });
      queryClient.invalidateQueries({ queryKey: ['triage-stats', workspace, selectedTeamId] });
    },
  });

  const duplicateSearch = duplicatePickerIssueId ? (duplicateSearchDrafts[duplicatePickerIssueId] || '') : '';

  const { data: duplicateCandidatesData, isLoading: isDuplicateCandidatesLoading } = useQuery({
    queryKey: ['triage-duplicate-candidates', workspace, selectedTeamId, duplicatePickerIssueId, duplicateSearch],
    enabled: !!workspace && !!selectedTeamId && !!duplicatePickerIssueId,
    queryFn: async (): Promise<DuplicateSearchResponse> => {
      const params = new URLSearchParams();
      params.set('teamId', selectedTeamId);
      params.set('limit', '8');
      params.set('sort', 'updatedAt');
      params.set('order', 'desc');
      if (duplicateSearch.trim()) {
        params.set('search', duplicateSearch.trim());
      }

      const response = await fetch(`${API_URL}/workspaces/${workspace}/issues?${params.toString()}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to search duplicate candidates');
      return response.json();
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async ({ issueId, duplicateOfId }: { issueId: string; duplicateOfId: string }) => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/teams/${selectedTeamId}/triage/${issueId}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ duplicateOfId }),
      });
      if (!response.ok) throw new Error('Failed to mark issue as duplicate');
      return response.json();
    },
    onSuccess: (_, variables) => {
      setDuplicateTargetDrafts((current) => ({ ...current, [variables.issueId]: '' }));
      setDuplicateSearchDrafts((current) => ({ ...current, [variables.issueId]: '' }));
      setDuplicatePickerIssueId(null);
      queryClient.invalidateQueries({ queryKey: ['triage', workspace, selectedTeamId] });
      queryClient.invalidateQueries({ queryKey: ['triage-stats', workspace, selectedTeamId] });
    },
  });

  const triageIssues = triageData?.issues || [];
  const triageStats = statsData?.stats || null;
  const teamMembers = teamDetail?.team.members || [];
  const workflowStates = (teamDetail?.team.workflowStates || []).filter((state) => !state.isTriage && !state.isDuplicate);
  const defaultWorkflowStateId = workflowStates.find((state) => state.category === 'TODO')?.id;

  const filteredIssues = useMemo(() => {
    const filtered = triageIssues.filter((issue) => {
      const query = search.trim().toLowerCase();
      const matchesSearch = query.length === 0 || issue.title.toLowerCase().includes(query) || issue.identifier.toLowerCase().includes(query) || issue.description?.toLowerCase().includes(query);
      const matchesPriority = priorityFilter === 'ALL' || issue.priority === priorityFilter;
      return matchesSearch && matchesPriority;
    });

    const priorityRank: Record<TriageIssue['priority'], number> = {
      URGENT: 0,
      HIGH: 1,
      MEDIUM: 2,
      LOW: 3,
      NO_PRIORITY: 4,
    };

    filtered.sort((left, right) => {
      if (sortMode === 'priority') return priorityRank[left.priority] - priorityRank[right.priority];
      if (sortMode === 'newest') return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
    });

    return filtered;
  }, [priorityFilter, search, sortMode, triageIssues]);

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-linear-text">
              <Inbox className="h-6 w-6 text-linear-accent" />
              Triage
            </h1>
            <p className="mt-1 text-sm text-linear-text-secondary">
              Review new work, route it to the right owner, and move it into the team workflow without leaving the inbox.
            </p>
          </div>
          {teamDetail?.team ? (
            <div className="rounded-lg border border-linear-border bg-linear-surface px-4 py-3 text-sm text-linear-text-secondary">
              <span className="font-medium text-linear-text">{teamDetail.team.name}</span>
              {teamDetail.team.triageOwner ? ` · Triage owner: ${teamDetail.team.triageOwner.name || teamDetail.team.triageOwner.email}` : ' · No triage owner set'}
            </div>
          ) : null}
        </div>
      </FadeIn>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-linear-text-secondary">
              <Filter className="h-4 w-4" />
              Team inbox
            </p>
            <div className="flex flex-wrap gap-2">
              {teamsData?.map((team) => (
                <button
                  key={team.id}
                  onClick={() => setSelectedTeamId(team.id)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${selectedTeamId === team.id ? 'border-linear-accent bg-linear-accent text-white' : 'border-linear-border bg-linear-surface text-linear-text-secondary hover:bg-linear-elevated'}`}
                >
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: team.color }} />
                    {team.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_200px_200px]">
            <label className="flex items-center gap-2 rounded-lg border border-linear-border bg-linear-surface px-3 py-2 text-sm text-linear-text-secondary">
              <Search className="h-4 w-4" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search triage issues" className="w-full bg-transparent outline-none placeholder:text-linear-text-tertiary" />
            </label>

            <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as 'ALL' | keyof typeof priorityMeta)} className="rounded-lg border border-linear-border bg-linear-surface px-3 py-2 text-sm text-linear-text outline-none">
              <option value="ALL">All priorities</option>
              {Object.entries(priorityMeta).map(([key, meta]) => (
                <option key={key} value={key}>{meta.label}</option>
              ))}
            </select>

            <select value={sortMode} onChange={(event) => setSortMode(event.target.value as 'oldest' | 'priority' | 'newest')} className="rounded-lg border border-linear-border bg-linear-surface px-3 py-2 text-sm text-linear-text outline-none">
              <option value="oldest">Sort by oldest</option>
              <option value="priority">Sort by priority</option>
              <option value="newest">Sort by newest</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {selectedTeamId && triageStats ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card><CardContent className="p-5"><p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-linear-text-tertiary"><BarChart3 className="h-4 w-4" />Inbox size</p><p className="mt-2 text-3xl font-semibold text-linear-text">{triageStats.totalTriage}</p><p className="mt-1 text-sm text-linear-text-secondary">Issues waiting for triage</p></CardContent></Card>
          <Card><CardContent className="p-5"><p className="text-xs uppercase tracking-[0.18em] text-linear-text-tertiary">High priority</p><p className="mt-2 text-3xl font-semibold text-orange-300">{triageStats.byPriority.URGENT + triageStats.byPriority.HIGH}</p><p className="mt-1 text-sm text-linear-text-secondary">Urgent and high priority issues</p></CardContent></Card>
          <Card><CardContent className="p-5"><p className="text-xs uppercase tracking-[0.18em] text-linear-text-tertiary">Team issues</p><p className="mt-2 text-3xl font-semibold text-linear-text">{triageStats.totalTeamIssues}</p><p className="mt-1 text-sm text-linear-text-secondary">Total active issue volume for the team</p></CardContent></Card>
          <Card><CardContent className="p-5"><p className="text-xs uppercase tracking-[0.18em] text-linear-text-tertiary">Oldest waiting</p><p className="mt-2 text-3xl font-semibold text-rose-300">{triageStats.oldestIssue?.daysOld || 0}</p><p className="mt-1 text-sm text-linear-text-secondary">{triageStats.oldestIssue ? triageStats.oldestIssue.identifier : 'No waiting issue'}</p></CardContent></Card>
        </div>
      ) : null}

      {teamDetail?.team.workflowStates?.length ? (
        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-medium text-linear-text">Routing targets</p>
                <p className="text-sm text-linear-text-secondary">Issues can be assigned directly into any non-triage workflow state for {teamDetail.team.name}.</p>
              </div>
              <div className="text-sm text-linear-text-secondary">{teamMembers.length} team member{teamMembers.length === 1 ? '' : 's'} available</div>
            </div>
            <div className="flex flex-wrap gap-2">{workflowStates.map((state) => <Badge key={state.id} variant="outline">{state.name}</Badge>)}</div>
          </CardContent>
        </Card>
      ) : null}

      {isLoading ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-linear-accent" /></div>
      ) : !selectedTeamId ? (
        <Card><CardContent className="py-16 text-center"><Inbox className="mx-auto h-12 w-12 text-linear-text-tertiary" /><p className="mt-4 text-sm text-linear-text-secondary">Choose a team to open its triage inbox.</p></CardContent></Card>
      ) : filteredIssues.length === 0 ? (
        <Card><CardContent className="py-16 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" /><p className="mt-4 text-lg font-medium text-linear-text">Nothing waiting in triage</p><p className="mt-1 text-sm text-linear-text-secondary">{triageIssues.length === 0 ? 'This team inbox is clear.' : 'Your current filters hide all triage issues.'}</p></CardContent></Card>
      ) : (
        <StaggerContainer className="space-y-4" delayChildren={0.04}>
          {filteredIssues.map((issue) => {
            const selectedAssigneeId = assignmentDrafts[issue.id] || '';
            const selectedWorkflowId = workflowDrafts[issue.id] || defaultWorkflowStateId || '';
            const snoozeDays = snoozeDrafts[issue.id] || 7;
            const duplicateTargetIssueId = duplicateTargetDrafts[issue.id] || '';
            const duplicateCandidates = (duplicateCandidatesData?.issues || []).filter((candidate) => candidate.id !== issue.id);

            return (
              <StaggerItem key={issue.id}>
                <Card>
                  <CardContent className="space-y-4 p-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link to={`/${workspace}/issues/${issue.id}`} className="text-sm font-medium text-linear-text-secondary hover:text-linear-text">{issue.identifier}</Link>
                          <span className={`rounded border px-2 py-0.5 text-xs font-medium ${priorityMeta[issue.priority].className}`}>{priorityMeta[issue.priority].label}</span>
                          {issue.workflowState ? <Badge variant="outline">{issue.workflowState.name}</Badge> : null}
                          {issue.project ? <Badge variant="outline">{issue.project.name}</Badge> : null}
                          {issue.commentCount ? <Badge variant="outline">{issue.commentCount} comments</Badge> : null}
                        </div>
                        <Link to={`/${workspace}/issues/${issue.id}`} className="mt-2 block text-lg font-medium text-linear-text hover:text-linear-accent">{issue.title}</Link>
                        {issue.description ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-linear-text-secondary">{issue.description}</p> : null}
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-linear-text-secondary">
                          <span>Created by {issue.creator.name || 'Unknown'}</span>
                          <span>{formatRelativeDays(issue.createdAt)}</span>
                          <span>Updated {formatDate(issue.updatedAt)}</span>
                          {issue.dueDate ? <span>Snoozed until {formatDate(issue.dueDate)}</span> : null}
                        </div>
                        {issue.labels.length > 0 ? <div className="mt-3 flex flex-wrap gap-2">{issue.labels.map((label) => <span key={label.id} className="rounded-full border px-2 py-0.5 text-xs text-linear-text-secondary" style={{ borderColor: `${label.color}55`, color: label.color }}>{label.name}</span>)}</div> : null}
                      </div>

                      <div className="grid w-full gap-3 xl:w-90">
                        <div className="grid gap-2 md:grid-cols-[1fr_1fr] xl:grid-cols-1">
                          <label className="grid gap-1 text-xs font-medium uppercase tracking-[0.16em] text-linear-text-tertiary">Assignee
                            <select value={selectedAssigneeId} onChange={(event) => setAssignmentDrafts((current) => ({ ...current, [issue.id]: event.target.value }))} className="rounded-lg border border-linear-border bg-linear-surface px-3 py-2 text-sm font-normal text-linear-text outline-none">
                              <option value="">Assign to me</option>
                              {teamMembers.map((member) => <option key={member.id} value={member.user.id}>{member.user.name || member.user.email}</option>)}
                            </select>
                          </label>

                          <label className="grid gap-1 text-xs font-medium uppercase tracking-[0.16em] text-linear-text-tertiary">Workflow state
                            <select value={selectedWorkflowId} onChange={(event) => setWorkflowDrafts((current) => ({ ...current, [issue.id]: event.target.value }))} className="rounded-lg border border-linear-border bg-linear-surface px-3 py-2 text-sm font-normal text-linear-text outline-none">
                              <option value="">Default team todo</option>
                              {workflowStates.map((state) => <option key={state.id} value={state.id}>{state.name}</option>)}
                            </select>
                          </label>
                        </div>

                        <div className="grid gap-2 md:grid-cols-[1fr_auto] xl:grid-cols-[1fr_auto]">
                          <Button className="gap-2" onClick={() => assignMutation.mutate({ issueId: issue.id, assigneeId: selectedAssigneeId || undefined, workflowStateId: selectedWorkflowId || undefined })} disabled={assignMutation.isPending}><UserPlus className="h-4 w-4" />Assign and route</Button>
                          <div className="grid grid-cols-[100px_auto] gap-2">
                            <select value={snoozeDays} onChange={(event) => setSnoozeDrafts((current) => ({ ...current, [issue.id]: Number(event.target.value) }))} className="rounded-lg border border-linear-border bg-linear-surface px-3 py-2 text-sm text-linear-text outline-none">{snoozeOptions.map((days) => <option key={days} value={days}>{days}d</option>)}</select>
                            <Button variant="outline" className="gap-2" onClick={() => snoozeMutation.mutate({ issueId: issue.id, days: snoozeDays })} disabled={snoozeMutation.isPending}><Clock3 className="h-4 w-4" />Snooze</Button>
                          </div>
                        </div>

                        <Button variant="outline" className="gap-2" onClick={() => setDuplicatePickerIssueId((current) => current === issue.id ? null : issue.id)}>
                          Duplicate of...
                        </Button>

                        {duplicatePickerIssueId === issue.id ? (
                          <div className="space-y-2 rounded-lg border border-linear-border bg-linear-elevated/40 p-3">
                            <input
                              value={duplicateSearchDrafts[issue.id] || ''}
                              onChange={(event) => setDuplicateSearchDrafts((current) => ({ ...current, [issue.id]: event.target.value }))}
                              placeholder="Search for the original issue"
                              className="w-full rounded-lg border border-linear-border bg-linear-surface px-3 py-2 text-sm text-linear-text outline-none"
                            />

                            {isDuplicateCandidatesLoading ? (
                              <div className="flex items-center gap-2 text-sm text-linear-text-secondary">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Searching issues...
                              </div>
                            ) : duplicateCandidates.length === 0 ? (
                              <p className="text-sm text-linear-text-secondary">No matching issues found.</p>
                            ) : (
                              <div className="space-y-2">
                                {duplicateCandidates.map((candidate) => (
                                  <button
                                    key={candidate.id}
                                    type="button"
                                    onClick={() => setDuplicateTargetDrafts((current) => ({ ...current, [issue.id]: candidate.id }))}
                                    className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${duplicateTargetIssueId === candidate.id ? 'border-linear-accent bg-linear-accent/10' : 'border-linear-border bg-linear-surface hover:bg-linear-elevated'}`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-linear-text-secondary">{candidate.identifier}</span>
                                      <Badge variant="outline">{priorityMeta[candidate.priority].label}</Badge>
                                      {candidate.project ? <Badge variant="outline">{candidate.project.name}</Badge> : null}
                                    </div>
                                    <p className="mt-1 text-sm font-medium text-linear-text">{candidate.title}</p>
                                  </button>
                                ))}
                              </div>
                            )}

                            <Button
                              variant="outline"
                              className="gap-2"
                              onClick={() => duplicateMutation.mutate({ issueId: issue.id, duplicateOfId: duplicateTargetIssueId })}
                              disabled={!duplicateTargetIssueId || duplicateMutation.isPending}
                            >
                              {duplicateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                              Mark duplicate
                            </Button>
                          </div>
                        ) : null}

                        <Button variant="outline" className="gap-2 border-red-500/20 text-red-300 hover:bg-red-500/10 hover:text-red-200" onClick={() => declineMutation.mutate(issue.id)} disabled={declineMutation.isPending}><XCircle className="h-4 w-4" />Decline issue</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      )}
    </div>
  );
}
