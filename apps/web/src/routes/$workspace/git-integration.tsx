import { useState } from 'react';
import { useParams } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  GitBranch,
  GitPullRequest,
  GitCommit,
  Link as LinkIcon,
  ExternalLink,
  CheckCircle2,
  CircleDot,
  AlertCircle,
  Plus,
  RefreshCw,
  Copy,
  ChevronDown,
  Settings,
  Trash2,
  GitBranch as Bitbucket,
  // Brand icons removed in v1.x - using alternatives
  Loader2
} from 'lucide-react';
import { API_URL } from '~/lib/api';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { FadeIn, StaggerContainer, StaggerItem } from '~/components/ui/motion';

interface GitIntegration {
  id: string;
  provider: 'github' | 'gitlab' | 'bitbucket';
  repository: string;
  owner: string;
  url: string;
  defaultBranch: string;
  isActive: boolean;
  lastSyncedAt: string;
  settings: {
    autoLinkPRs: boolean;
    autoLinkBranches: boolean;
    autoLinkCommits: boolean;
    generateBranchNames: boolean;
  };
}

interface PullRequest {
  id: string;
  number: number;
  title: string;
  url: string;
  state: 'open' | 'closed' | 'merged';
  author: {
    name: string;
    avatar: string;
  };
  branchName: string;
  baseBranch: string;
  createdAt: string;
  updatedAt: string;
  linkedIssues: Array<{
    id: string;
    identifier: string;
    title: string;
  }>;
}

interface Branch {
  name: string;
  isDefault: boolean;
  isProtected: boolean;
  lastCommit: {
    message: string;
    author: string;
    date: string;
    sha: string;
  };
  linkedIssues: Array<{
    id: string;
    identifier: string;
  }>;
}

const providerIcons = {
  github: GitBranch,
  gitlab: GitBranch,
  bitbucket: Bitbucket,
};

const providerColors = {
  github: '#24292e',
  gitlab: '#fc6d26',
  bitbucket: '#2684ff',
};

export default function GitIntegrationPage() {
  const { workspace } = useParams();
  const queryClient = useQueryClient();
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Fetch integrations
  const { data: integrations, isLoading } = useQuery({
    queryKey: ['git-integrations', workspace],
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/git-integrations`,
        { credentials: 'include' }
      );
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Fetch pull requests
  const { data: pullRequests } = useQuery({
    queryKey: ['git-pull-requests', workspace],
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/git/pull-requests`,
        { credentials: 'include' }
      );
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Fetch branches
  const { data: branches } = useQuery({
    queryKey: ['git-branches', workspace],
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/git/branches`,
        { credentials: 'include' }
      );
      if (!response.ok) return [];
      return response.json();
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (integrationId: string) => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/git-integrations/${integrationId}/sync`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );
      if (!response.ok) throw new Error('Failed to sync');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['git-pull-requests', workspace] });
      queryClient.invalidateQueries({ queryKey: ['git-branches', workspace] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-linear-accent animate-spin" />
      </div>
    );
  }

  const activeIntegration = integrations?.find((i: GitIntegration) => i.isActive);

  return (
    <div className="space-y-6">
      {/* Header */}
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-linear-text tracking-tight flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-linear-accent" />
              Git Integration
            </h1>
            <p className="text-sm text-linear-text-secondary mt-0.5">
              Link code changes to issues automatically
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activeIntegration && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => syncMutation.mutate(activeIntegration.id)}
                disabled={syncMutation.isPending}
              >
                {syncMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                <span className="ml-1.5">Sync</span>
              </Button>
            )}
            <Button size="sm" onClick={() => setShowAddModal(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Connect repo
            </Button>
          </div>
        </div>
      </FadeIn>

      {/* Connected Repositories */}
      {integrations?.length > 0 && (
        <FadeIn delay={0.1}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Connected Repositories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {integrations.map((integration: GitIntegration) => {
                const Icon = providerIcons[integration.provider];
                return (
                  <div
                    key={integration.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border transition-colors",
                      integration.isActive
                        ? "bg-linear-accent-light/50 border-linear-accent/30"
                        : "bg-linear-surface border-linear-border"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: providerColors[integration.provider] }}
                      >
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-linear-text">
                          {integration.owner}/{integration.repository}
                        </p>
                        <p className="text-xs text-linear-text-secondary">
                          {integration.defaultBranch} • Last synced {new Date(integration.lastSyncedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={integration.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-linear-border rounded-lg transition-colors"
                      >
                        <ExternalLink className="w-4 h-4 text-linear-text-secondary" />
                      </a>
                      <button className="p-2 hover:bg-linear-border rounded-lg transition-colors">
                        <Settings className="w-4 h-4 text-linear-text-secondary" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Pull Requests */}
      <FadeIn delay={0.15}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <GitPullRequest className="w-4 h-4 text-linear-accent" />
                Pull Requests
              </CardTitle>
              <Badge variant="secondary">{pullRequests?.length || 0}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {pullRequests?.length === 0 ? (
              <div className="text-center py-8">
                <GitPullRequest className="w-10 h-10 text-linear-text-tertiary mx-auto mb-2" />
                <p className="text-sm text-linear-text-secondary">No pull requests found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pullRequests?.map((pr: PullRequest) => (
                  <div
                    key={pr.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-linear-surface hover:bg-linear-border/50 transition-colors"
                  >
                    {/* PR State Icon */}
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      pr.state === 'merged' && "bg-linear-accent/20 text-linear-accent",
                      pr.state === 'open' && "bg-linear-success/20 text-linear-success",
                      pr.state === 'closed' && "text-priority-urgent"
                    )}>
                      {pr.state === 'merged' ? (
                        <GitCommit className="w-4 h-4" />
                      ) : pr.state === 'open' ? (
                        <CircleDot className="w-4 h-4" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <a
                          href={pr.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-linear-text hover:text-linear-accent transition-colors"
                        >
                          #{pr.number} {pr.title}
                        </a>
                        <Badge variant="outline" className="text-[10px]">
                          {pr.branchName}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1 text-xs text-linear-text-secondary">
                        <span>by {pr.author.name}</span>
                        <span>•</span>
                        <span>{new Date(pr.createdAt).toLocaleDateString()}</span>
                      </div>

                      {/* Linked Issues */}
                      {pr.linkedIssues?.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <LinkIcon className="w-3 h-3 text-linear-accent" />
                          {pr.linkedIssues.map((issue) => (
                            <Badge
                              key={issue.id}
                              variant="accent"
                              className="text-[10px] px-1.5 py-0 h-4"
                            >
                              {issue.identifier}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>

      {/* Recent Branches */}
      <FadeIn delay={0.2}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-linear-accent" />
              Recent Branches
            </CardTitle>
          </CardHeader>
          <CardContent>
            {branches?.length === 0 ? (
              <div className="text-center py-8">
                <GitBranch className="w-10 h-10 text-linear-text-tertiary mx-auto mb-2" />
                <p className="text-sm text-linear-text-secondary">No branches found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {branches?.slice(0, 10).map((branch: Branch) => (
                  <div
                    key={branch.name}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-linear-surface hover:bg-linear-border/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-linear-text-tertiary" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-linear-text">
                            {branch.name}
                          </span>
                          {branch.isDefault && (
                            <Badge variant="success" className="text-[10px] px-1 py-0 h-4">
                              default
                            </Badge>
                          )}
                          {branch.isProtected && (
                            <Badge variant="warning" className="text-[10px] px-1 py-0 h-4">
                              protected
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-linear-text-tertiary mt-0.5 truncate max-w-sm">
                          {branch.lastCommit.message}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-linear-text-secondary">
                      {branch.linkedIssues?.length > 0 && (
                        <div className="flex items-center gap-1">
                          <LinkIcon className="w-3 h-3 text-linear-accent" />
                          <span>{branch.linkedIssues.length}</span>
                        </div>
                      )}
                      <span>{branch.lastCommit.sha.slice(0, 7)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>

      {/* Empty State */}
      {(!integrations || integrations.length === 0) && (
        <FadeIn delay={0.1}>
          <div className="text-center py-16 bg-linear-elevated rounded-lg border border-linear-border border-dashed">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-linear-surface flex items-center justify-center">
              <GitBranch className="w-8 h-8 text-linear-text-tertiary" />
            </div>
            <h3 className="text-base font-medium text-linear-text mb-2">
              Connect your repository
            </h3>
            <p className="text-sm text-linear-text-secondary max-w-md mx-auto mb-6">
              Link GitHub, GitLab, or Bitbucket to automatically connect pull requests, 
              branches, and commits to your issues.
            </p>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Connect repository
            </Button>
          </div>
        </FadeIn>
      )}
    </div>
  );
}
