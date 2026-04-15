import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, CalendarRange, CheckCircle2, Loader2, Target } from 'lucide-react';
import { API_URL } from '~/lib/runtime-config';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { FadeIn, StaggerContainer, StaggerItem } from '~/components/ui/motion';

interface TeamListResponse {
  teams: Array<{ id: string; name: string; key: string; color: string }>;
}

interface RoadmapResponse {
  teams: Array<{
    id: string;
    name: string;
    key: string;
    color: string;
    cycles: Array<{
      id: string;
      name: string;
      number: number;
      startDate: string;
      endDate: string;
      isActive: boolean;
      sprintGoal: string | null;
    }>;
  }>;
  initiatives: Array<{
    id: string;
    name: string;
    status: string;
    targetDate: string | null;
    description: string | null;
    projects: Array<{
      id: string;
      name: string;
      status: string;
      startDate: string | null;
      targetDate: string | null;
      issueCount: number;
    }>;
  }>;
  unscheduled: {
    count: number;
    issues: Array<{
      id: string;
      identifier: string;
      title: string;
      priority: string;
      state: string;
      team: { id: string; name: string; key: string; color: string } | null;
      project: { id: string; name: string } | null;
    }>;
  };
}

interface TimelineResponse {
  groups: Array<{
    id: string;
    name: string;
    color: string | null;
    issues: Array<{
      id: string;
      identifier: string;
      title: string;
      priority: string;
      dueDate: string | null;
      assignee: { id: string; name: string | null; image: string | null } | null;
      project: { id: string; name: string; status: string } | null;
      cycle: { id: string; name: string; startDate: string; endDate: string } | null;
      workflowState: { id: string; name: string; color: string; category: string } | null;
    }>;
  }>;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatLongDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusTone(status: string) {
  switch (status) {
    case 'COMPLETED':
    case 'LAUNCHED':
    case 'DONE':
      return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
    case 'IN_PROGRESS':
    case 'TODO':
      return 'bg-sky-500/10 text-sky-300 border-sky-500/20';
    case 'PAUSED':
      return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
    case 'CANCELLED':
      return 'bg-rose-500/10 text-rose-300 border-rose-500/20';
    default:
      return 'bg-linear-elevated text-linear-text-secondary border-linear-border';
  }
}

function priorityTone(priority: string) {
  switch (priority) {
    case 'URGENT': return 'bg-red-500';
    case 'HIGH': return 'bg-orange-500';
    case 'MEDIUM': return 'bg-amber-500';
    case 'LOW': return 'bg-sky-500';
    default: return 'bg-linear-text-tertiary';
  }
}

function SummaryCard({ title, value, subtitle }: { title: string; value: string | number; subtitle: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-linear-text-tertiary">{title}</p>
        <p className="mt-2 text-3xl font-semibold text-linear-text">{value}</p>
        <p className="mt-1 text-sm text-linear-text-secondary">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

export default function RoadmapPage() {
  const { workspace } = useParams();
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [viewMode, setViewMode] = useState<'timeline' | 'initiatives'>('timeline');
  const [groupBy, setGroupBy] = useState<'team' | 'project' | 'assignee'>('team');
  const [includeCompleted, setIncludeCompleted] = useState(false);

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 30);
  const endDate = new Date(today);
  endDate.setMonth(endDate.getMonth() + 3);

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

  const { data: roadmapData, isLoading: isRoadmapLoading } = useQuery({
    queryKey: ['roadmap', workspace, selectedTeamId, startDate.toISOString(), endDate.toISOString()],
    enabled: !!workspace,
    queryFn: async (): Promise<RoadmapResponse> => {
      const params = new URLSearchParams();
      if (selectedTeamId) params.append('teamId', selectedTeamId);
      params.append('startDate', startDate.toISOString());
      params.append('endDate', endDate.toISOString());
      const response = await fetch(`${API_URL}/workspaces/${workspace}/roadmap?${params.toString()}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch roadmap');
      return response.json();
    },
  });

  const { data: timelineData, isLoading: isTimelineLoading } = useQuery({
    queryKey: ['roadmap-timeline', workspace, selectedTeamId, groupBy, includeCompleted],
    enabled: !!workspace,
    queryFn: async (): Promise<TimelineResponse> => {
      const params = new URLSearchParams();
      if (selectedTeamId) params.append('teamId', selectedTeamId);
      params.append('startDate', startDate.toISOString());
      params.append('endDate', endDate.toISOString());
      params.append('groupBy', groupBy);
      params.append('includeCompleted', String(includeCompleted));
      const response = await fetch(`${API_URL}/workspaces/${workspace}/roadmap/timeline?${params.toString()}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch timeline');
      return response.json();
    },
  });

  const activeCycles = useMemo(() => (roadmapData?.teams || []).flatMap((team) => team.cycles.filter((cycle) => cycle.isActive)), [roadmapData]);
  const totalProjects = useMemo(() => (roadmapData?.initiatives || []).reduce((sum, initiative) => sum + initiative.projects.length, 0), [roadmapData]);

  if (isRoadmapLoading || isTimelineLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-linear-accent" /></div>;
  }

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-linear-text"><Target className="h-6 w-6 text-linear-accent" />Roadmap</h1>
            <p className="mt-1 text-sm text-linear-text-secondary">See scheduled cycles, live work grouped by owner or project, and the backlog that still needs a plan.</p>
          </div>
          <div className="flex rounded-lg border border-linear-border bg-linear-surface p-1">
            <button onClick={() => setViewMode('timeline')} className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === 'timeline' ? 'bg-linear-accent text-white' : 'text-linear-text-secondary hover:text-linear-text'}`}>Timeline</button>
            <button onClick={() => setViewMode('initiatives')} className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === 'initiatives' ? 'bg-linear-accent text-white' : 'text-linear-text-secondary hover:text-linear-text'}`}>Initiatives</button>
          </div>
        </div>
      </FadeIn>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-linear-text-secondary"><CalendarRange className="h-4 w-4" />Planning window</p>
              <p className="mt-1 text-sm text-linear-text">{formatLongDate(startDate.toISOString())} to {formatLongDate(endDate.toISOString())}</p>
            </div>
            <Button variant={includeCompleted ? 'default' : 'outline'} size="sm" onClick={() => setIncludeCompleted((current) => !current)}>{includeCompleted ? 'Including completed' : 'Hide completed'}</Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSelectedTeamId('')} className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${!selectedTeamId ? 'border-linear-accent bg-linear-accent text-white' : 'border-linear-border bg-linear-surface text-linear-text-secondary hover:bg-linear-elevated'}`}>All teams</button>
            {teamsData?.map((team) => (
              <button key={team.id} onClick={() => setSelectedTeamId(team.id)} className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${selectedTeamId === team.id ? 'border-linear-accent bg-linear-accent text-white' : 'border-linear-border bg-linear-surface text-linear-text-secondary hover:bg-linear-elevated'}`}><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: team.color }} />{team.name}</span></button>
            ))}
          </div>

          {viewMode === 'timeline' ? <div className="flex flex-wrap gap-2">{(['team', 'project', 'assignee'] as const).map((mode) => <button key={mode} onClick={() => setGroupBy(mode)} className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${groupBy === mode ? 'border-linear-accent bg-linear-accent/10 text-linear-accent' : 'border-linear-border bg-linear-surface text-linear-text-secondary hover:bg-linear-elevated'}`}>Group by {mode}</button>)}</div> : null}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Active cycles" value={activeCycles.length} subtitle="Currently running across selected teams" />
        <SummaryCard title="Initiatives" value={roadmapData?.initiatives.length || 0} subtitle="Outcome-level work in this window" />
        <SummaryCard title="Projects" value={totalProjects} subtitle="Projects attached to current initiatives" />
        <SummaryCard title="Unscheduled" value={roadmapData?.unscheduled.count || 0} subtitle="Issues still missing a cycle or due date" />
      </div>

      {viewMode === 'timeline' ? (
        <div className="space-y-6">
          <FadeIn delay={0.05}>
            <Card>
              <CardHeader><CardTitle className="text-base">Cycle Schedule</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                {(roadmapData?.teams.length || 0) === 0 ? <p className="text-sm text-linear-text-secondary">No teams found for this workspace.</p> : roadmapData!.teams.map((team) => (
                  <div key={team.id} className="space-y-3">
                    <div className="flex items-center gap-3"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: team.color }} /><p className="font-medium text-linear-text">{team.name}</p><p className="text-sm text-linear-text-secondary">{team.key}</p></div>
                    <div className="flex gap-3 overflow-x-auto pb-1">
                      {team.cycles.length === 0 ? <div className="rounded-lg border border-dashed border-linear-border px-4 py-3 text-sm text-linear-text-secondary">No cycles scheduled in this window.</div> : team.cycles.map((cycle) => (
                        <div key={cycle.id} className={`w-72 shrink-0 rounded-xl border px-4 py-4 ${cycle.isActive ? 'border-linear-accent bg-linear-accent/10' : 'border-linear-border bg-linear-surface'}`}>
                          <div className="flex items-center justify-between gap-3"><span className={`rounded px-2 py-1 text-xs font-medium ${cycle.isActive ? 'bg-linear-accent text-white' : 'bg-linear-elevated text-linear-text-secondary'}`}>{cycle.isActive ? 'Active now' : `Cycle ${cycle.number}`}</span><span className="text-xs text-linear-text-tertiary">{formatDate(cycle.startDate)} - {formatDate(cycle.endDate)}</span></div>
                          <p className="mt-3 font-medium text-linear-text">{cycle.name}</p>
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-linear-text-secondary">{cycle.sprintGoal || 'No sprint goal recorded.'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </FadeIn>

          <StaggerContainer className="grid grid-cols-1 gap-4 xl:grid-cols-2" delayChildren={0.04}>
            {(timelineData?.groups || []).map((group) => (
              <StaggerItem key={group.id}>
                <Card className="h-full">
                  <CardHeader><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: group.color || '#6B7280' }} /><CardTitle className="text-base">{group.name}</CardTitle></div><Badge variant="outline">{group.issues.length} issues</Badge></div></CardHeader>
                  <CardContent className="space-y-3">
                    {group.issues.length === 0 ? <p className="text-sm text-linear-text-secondary">No scheduled work in this group.</p> : group.issues.slice(0, 8).map((issue) => (
                      <Link key={issue.id} to={`/${workspace}/issues/${issue.id}`} className="block rounded-lg bg-linear-surface px-4 py-3 transition-colors hover:bg-linear-elevated">
                        <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium text-linear-text-secondary">{issue.identifier}</span><span className={`h-2 w-2 rounded-full ${priorityTone(issue.priority)}`} />{issue.workflowState ? <Badge variant="outline">{issue.workflowState.name}</Badge> : null}</div>
                        <p className="mt-1 text-sm font-medium text-linear-text">{issue.title}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-linear-text-secondary">{issue.project ? <span>{issue.project.name}</span> : null}{issue.assignee ? <span>{issue.assignee.name || 'Assigned'}</span> : <span>Unassigned</span>}{issue.cycle ? <span>{issue.cycle.name}</span> : null}{issue.dueDate ? <span>Due {formatDate(issue.dueDate)}</span> : null}</div>
                      </Link>
                    ))}
                    {group.issues.length > 8 ? <p className="text-sm text-linear-text-secondary">+{group.issues.length - 8} more issues in this group</p> : null}
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </StaggerContainer>

          {(timelineData?.groups.length || 0) === 0 ? <Card><CardContent className="py-16 text-center"><CalendarRange className="mx-auto h-12 w-12 text-linear-text-tertiary" /><p className="mt-4 text-lg font-medium text-linear-text">No scheduled work in this window</p><p className="mt-1 text-sm text-linear-text-secondary">Adjust team filters or start assigning issues to cycles, projects, or due dates.</p></CardContent></Card> : null}
        </div>
      ) : (
        <StaggerContainer className="space-y-4" delayChildren={0.04}>
          {(roadmapData?.initiatives.length || 0) === 0 ? <Card><CardContent className="py-16 text-center"><Target className="mx-auto h-12 w-12 text-linear-text-tertiary" /><p className="mt-4 text-lg font-medium text-linear-text">No initiatives in this planning window</p><p className="mt-1 text-sm text-linear-text-secondary">Create or schedule initiatives to see them here.</p></CardContent></Card> : roadmapData!.initiatives.map((initiative) => (
            <StaggerItem key={initiative.id}>
              <Card>
                <CardContent className="space-y-5 p-6">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2"><span className={`rounded border px-2 py-0.5 text-xs font-medium ${statusTone(initiative.status)}`}>{initiative.status.replaceAll('_', ' ')}</span>{initiative.targetDate ? <Badge variant="outline">Target {formatLongDate(initiative.targetDate)}</Badge> : null}</div>
                      <h2 className="mt-3 text-lg font-semibold text-linear-text">{initiative.name}</h2>
                      {initiative.description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-linear-text-secondary">{initiative.description}</p> : null}
                    </div>
                    <div className="rounded-lg border border-linear-border bg-linear-surface px-4 py-3 text-sm text-linear-text-secondary">{initiative.projects.length} linked project{initiative.projects.length === 1 ? '' : 's'}</div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                    {initiative.projects.length === 0 ? <div className="rounded-lg border border-dashed border-linear-border px-4 py-5 text-sm text-linear-text-secondary">No projects linked to this initiative yet.</div> : initiative.projects.map((project) => (
                      <div key={project.id} className="rounded-lg border border-linear-border bg-linear-surface px-4 py-4">
                        <div className="flex items-center justify-between gap-2"><span className={`rounded border px-2 py-0.5 text-xs font-medium ${statusTone(project.status)}`}>{project.status.replaceAll('_', ' ')}</span><Badge variant="outline">{project.issueCount} issues</Badge></div>
                        <p className="mt-3 text-sm font-medium text-linear-text">{project.name}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-linear-text-secondary">{project.startDate ? <span>Start {formatDate(project.startDate)}</span> : null}{project.targetDate ? <span>Due {formatDate(project.targetDate)}</span> : null}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}

      {(roadmapData?.unscheduled.count || 0) > 0 ? (
        <FadeIn delay={0.08}>
          <Card>
            <CardHeader><div className="flex items-center justify-between gap-3"><CardTitle className="flex items-center gap-2 text-base"><AlertCircle className="h-4 w-4 text-amber-400" />Unscheduled backlog</CardTitle><Badge variant="outline">{roadmapData!.unscheduled.count}</Badge></div></CardHeader>
            <CardContent className="space-y-3">
              {roadmapData!.unscheduled.issues.slice(0, 12).map((issue) => (
                <Link key={issue.id} to={`/${workspace}/issues/${issue.id}`} className="flex items-start justify-between gap-3 rounded-lg bg-linear-surface px-4 py-3 transition-colors hover:bg-linear-elevated"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium text-linear-text-secondary">{issue.identifier}</span><span className={`h-2 w-2 rounded-full ${priorityTone(issue.priority)}`} />{issue.team ? <Badge variant="outline">{issue.team.name}</Badge> : null}{issue.project ? <Badge variant="outline">{issue.project.name}</Badge> : null}</div><p className="mt-1 text-sm font-medium text-linear-text">{issue.title}</p></div></Link>
              ))}
              {roadmapData!.unscheduled.count > 12 ? <p className="text-sm text-linear-text-secondary">+{roadmapData!.unscheduled.count - 12} more unscheduled issues still need a cycle or due date.</p> : null}
            </CardContent>
          </Card>
        </FadeIn>
      ) : (
        <FadeIn delay={0.08}><div className="rounded-xl border border-linear-border bg-linear-elevated px-4 py-4 text-sm text-linear-text-secondary"><div className="flex items-center gap-2 font-medium text-linear-text"><CheckCircle2 className="h-4 w-4 text-emerald-400" />Everything in view is scheduled</div><p className="mt-2 leading-6">There are no unscheduled issues in the current roadmap filter scope.</p></div></FadeIn>
      )}
    </div>
  );
}
