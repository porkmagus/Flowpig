import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  GitBranch,
  GitPullRequest,
  Link as LinkIcon,
  Loader2,
  Shield,
} from 'lucide-react';
import { API_URL } from '~/lib/api';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { FadeIn, StaggerContainer, StaggerItem } from '~/components/ui/motion';

interface GitStatus {
  connected: boolean;
  provider: string | null;
  organization: string | null;
  openPullRequests?: number;
}

interface GitOverview {
  connected: boolean;
  integration: {
    id: string;
    provider: string;
    organization: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  } | null;
  repositories: Array<{
    id: string;
    name: string;
    fullName: string;
    url: string;
    defaultBranch: string;
    isPrivate: boolean;
    pullRequestCount: number;
  }>;
  summary: {
    repositoryCount: number;
    openPullRequests: number;
    linkedBranches: number;
    linkedIssues: number;
    recentCommits: number;
  };
}

interface PullRequestsResponse {
  pullRequests: Array<{
    id: string;
    number: number;
    title: string;
    state: 'OPEN' | 'CLOSED' | 'MERGED';
    url: string;
    branchName: string;
    draft: boolean;
    author: {
      name: string | null;
      avatar: string | null;
    };
    repository: {
      fullName: string;
    } | null;
    linkedIssues: Array<{
      id: string;
      identifier: string;
      title: string;
      state: string;
    }>;
    createdAt: string;
  }>;
}

interface BranchesResponse {
  branches: Array<{
    name: string;
    linkedIssues: Array<{
      id: string;
      identifier: string;
      title: string;
      state: string;
    }>;
    pullRequest: {
      id: string;
      number: number;
      title: string;
      url: string;
      state: string;
      repository: {
        fullName: string;
        url: string;
      } | null;
    } | null;
    updatedAt: string;
  }>;
}

function formatProvider(provider?: string | null) {
  if (!provider) return 'Not connected';
  return provider.charAt(0).toUpperCase() + provider.slice(1).toLowerCase();
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function SummaryCard({ title, value, subtitle, icon: Icon }: { title: string; value: string | number; subtitle: string; icon: LucideIcon }) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-linear-text-tertiary">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-linear-text">{value}</p>
          <p className="mt-1 text-xs text-linear-text-secondary">{subtitle}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-linear-accent/10 text-linear-accent"><Icon className="h-5 w-5" /></div>
      </CardContent>
    </Card>
  );
}

function PullRequestStateBadge({ state }: { state: 'OPEN' | 'CLOSED' | 'MERGED' }) {
  const className = state === 'OPEN' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : state === 'MERGED' ? 'border-sky-500/30 bg-sky-500/10 text-sky-300' : 'border-rose-500/30 bg-rose-500/10 text-rose-300';
  return <span className={`rounded border px-2 py-0.5 text-[11px] font-medium ${className}`}>{state}</span>;
}

export default function GitIntegrationPage() {
  const { workspace } = useParams();

  const { data: status, isLoading: isStatusLoading } = useQuery({
    queryKey: ['workspace-git-status', workspace],
    enabled: !!workspace,
    queryFn: async (): Promise<GitStatus> => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/git/status`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to load git status');
      return response.json();
    },
  });

  const { data: overview, isLoading: isOverviewLoading, refetch: refetchOverview } = useQuery({
    queryKey: ['workspace-git-overview', workspace],
    enabled: !!workspace,
    queryFn: async (): Promise<GitOverview> => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/git/overview`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to load git overview');
      return response.json();
    },
  });

  const { data: pullRequests, isLoading: isPullRequestsLoading, refetch: refetchPullRequests } = useQuery({
    queryKey: ['workspace-git-pull-requests', workspace],
    enabled: !!workspace && !!overview?.connected,
    queryFn: async (): Promise<PullRequestsResponse> => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/git/pull-requests?state=ALL&limit=12`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to load pull requests');
      return response.json();
    },
  });

  const { data: branches, isLoading: isBranchesLoading, refetch: refetchBranches } = useQuery({
    queryKey: ['workspace-git-branches', workspace],
    enabled: !!workspace && !!overview?.connected,
    queryFn: async (): Promise<BranchesResponse> => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}/git/branches`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to load branch activity');
      return response.json();
    },
  });

  const isLoading = isStatusLoading || isOverviewLoading || (!!overview?.connected && (isPullRequestsLoading || isBranchesLoading));

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-linear-accent" /></div>;
  }

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-linear-text"><GitBranch className="h-5 w-5 text-linear-accent" />Git Integration</h1>
            <p className="mt-0.5 text-sm text-linear-text-secondary">Real workspace repository activity, linked branches, and pull request visibility.</p>
          </div>
          <Button variant="outline" size="sm" className="w-full gap-1.5 lg:w-auto" onClick={() => { void refetchOverview(); void refetchPullRequests(); void refetchBranches(); }}><Activity className="h-3.5 w-3.5" />Refresh data</Button>
        </div>
      </FadeIn>

      {!overview?.connected ? (
        <FadeIn delay={0.06}>
          <div className="rounded-xl border border-dashed border-linear-border bg-linear-elevated px-6 py-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-linear-surface text-linear-text-tertiary"><GitBranch className="h-7 w-7" /></div>
            <h2 className="mt-4 text-lg font-medium text-linear-text">No active git provider for this workspace</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-linear-text-secondary">The backend can already link issue branches and pull requests, but this workspace does not have an active provider installation yet. Once a provider is connected, this page will automatically show repository, branch, and PR activity.</p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-lg border border-linear-border bg-linear-surface px-4 py-3 text-sm text-linear-text-secondary"><Shield className="h-4 w-4 text-linear-accent" />Status: {formatProvider(status?.provider)}</div>
          </div>
        </FadeIn>
      ) : (
        <>
          <StaggerContainer className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4" delayChildren={0.04}>
            <StaggerItem><SummaryCard title="Provider" value={formatProvider(overview.integration?.provider)} subtitle={overview.integration?.organization || 'Workspace installation'} icon={Shield} /></StaggerItem>
            <StaggerItem><SummaryCard title="Repositories" value={overview.summary.repositoryCount} subtitle="Connected to this workspace" icon={GitBranch} /></StaggerItem>
            <StaggerItem><SummaryCard title="Open PRs" value={overview.summary.openPullRequests} subtitle="Currently awaiting merge or review" icon={GitPullRequest} /></StaggerItem>
            <StaggerItem><SummaryCard title="Linked Branches" value={overview.summary.linkedBranches} subtitle={`${overview.summary.recentCommits} commits seen in the last 30 days`} icon={LinkIcon} /></StaggerItem>
          </StaggerContainer>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <FadeIn delay={0.08}>
              <Card>
                <CardHeader><CardTitle className="text-base">Connected Repositories</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {overview.repositories.length === 0 ? <p className="text-sm text-linear-text-secondary">The provider is active, but no repositories are registered yet.</p> : overview.repositories.map((repository) => (
                    <div key={repository.id} className="flex items-center justify-between gap-3 rounded-lg bg-linear-surface px-4 py-3">
                      <div className="min-w-0"><p className="truncate text-sm font-medium text-linear-text">{repository.fullName}</p><p className="mt-1 text-xs text-linear-text-secondary">Default branch: {repository.defaultBranch} · {repository.pullRequestCount} tracked PRs</p></div>
                      <div className="flex items-center gap-2">{repository.isPrivate ? <Badge variant="outline">Private</Badge> : null}<a href={repository.url} target="_blank" rel="noreferrer" className="rounded-md p-2 text-linear-text-secondary transition-colors hover:bg-linear-border hover:text-linear-text"><ExternalLink className="h-4 w-4" /></a></div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </FadeIn>

            <FadeIn delay={0.1}>
              <Card>
                <CardHeader><CardTitle className="text-base">Workspace Health</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-lg bg-linear-surface px-4 py-3"><p className="text-xs uppercase tracking-[0.18em] text-linear-text-tertiary">Linked issues</p><p className="mt-1 text-2xl font-semibold text-linear-text">{overview.summary.linkedIssues}</p></div>
                  <div className="rounded-lg bg-linear-surface px-4 py-3"><p className="text-xs uppercase tracking-[0.18em] text-linear-text-tertiary">Last integration update</p><p className="mt-1 text-sm text-linear-text-secondary">{overview.integration ? new Date(overview.integration.updatedAt).toLocaleString() : 'Never'}</p></div>
                  <div className="rounded-lg border border-linear-border/70 px-4 py-3 text-sm leading-6 text-linear-text-secondary">Use the issue-level Git panel to generate suggested branch names or manually attach a branch. Those links are the source of truth for the branch activity shown here.</div>
                </CardContent>
              </Card>
            </FadeIn>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <FadeIn delay={0.12}>
              <Card>
                <CardHeader><CardTitle className="text-base">Pull Requests</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {(pullRequests?.pullRequests.length || 0) === 0 ? <p className="text-sm text-linear-text-secondary">No pull requests are linked to this workspace yet.</p> : pullRequests!.pullRequests.map((pr) => (
                    <a key={pr.id} href={pr.url} target="_blank" rel="noreferrer" className="block rounded-lg bg-linear-surface px-4 py-3 transition-colors hover:bg-linear-border">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium text-linear-text">#{pr.number} {pr.title}</p><PullRequestStateBadge state={pr.state} />{pr.draft ? <Badge variant="outline">Draft</Badge> : null}</div>
                          <p className="mt-1 text-xs text-linear-text-secondary">{pr.repository?.fullName || 'Unknown repository'} · {pr.branchName} · opened {formatDate(pr.createdAt)}</p>
                          {pr.linkedIssues.length > 0 ? <div className="mt-2 flex flex-wrap gap-2">{pr.linkedIssues.map((issue) => <Badge key={issue.id} variant="outline">{issue.identifier}</Badge>)}</div> : null}
                        </div>
                        <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-linear-text-tertiary" />
                      </div>
                    </a>
                  ))}
                </CardContent>
              </Card>
            </FadeIn>

            <FadeIn delay={0.14}>
              <Card>
                <CardHeader><CardTitle className="text-base">Branch Activity</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {(branches?.branches.length || 0) === 0 ? <p className="text-sm text-linear-text-secondary">No linked branches yet. Link a branch from an issue to start tracking it here.</p> : branches!.branches.map((branch) => (
                    <div key={branch.name} className="rounded-lg bg-linear-surface px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0"><div className="flex items-center gap-2"><GitBranch className="h-4 w-4 text-linear-accent" /><span className="truncate text-sm font-medium text-linear-text">{branch.name}</span></div><p className="mt-1 text-xs text-linear-text-secondary">{branch.linkedIssues.length} linked issue{branch.linkedIssues.length === 1 ? '' : 's'} · updated {formatDate(branch.updatedAt)}</p></div>
                        {branch.pullRequest ? <a href={branch.pullRequest.url} target="_blank" rel="noreferrer" className="rounded-md p-2 text-linear-text-secondary transition-colors hover:bg-linear-border hover:text-linear-text"><ExternalLink className="h-4 w-4" /></a> : null}
                      </div>
                      <div className="mt-3 rounded-md border border-linear-border/70 px-3 py-2 text-sm text-linear-text-secondary">{branch.pullRequest ? `PR #${branch.pullRequest.number}: ${branch.pullRequest.title}` : 'Manual branch link with no attached pull request yet.'}</div>
                      <div className="mt-3 flex flex-wrap gap-2">{branch.linkedIssues.map((issue) => <Badge key={issue.id} variant="outline">{issue.identifier}</Badge>)}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </FadeIn>
          </div>

          <FadeIn delay={0.16}><div className="rounded-xl border border-linear-border bg-linear-elevated px-4 py-4 text-sm text-linear-text-secondary"><div className="flex items-center gap-2 font-medium text-linear-text"><CheckCircle2 className="h-4 w-4 text-linear-accent" />Live workspace git data is enabled</div><p className="mt-2 leading-6">This page is now backed by actual repository, pull request, and issue branch link data. If something looks missing, check whether the issue already has a linked branch or pull request recorded in its Git panel.</p></div></FadeIn>
        </>
      )}

      {overview?.integration && !status?.connected ? <FadeIn delay={0.18}><div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"><div className="flex items-center gap-2 font-medium"><AlertCircle className="h-4 w-4" />Integration record exists, but it is not currently marked active.</div></div></FadeIn> : null}
    </div>
  );
}
