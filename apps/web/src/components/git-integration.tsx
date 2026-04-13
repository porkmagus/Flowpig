import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '~/lib/api';
import { 
  GitBranch, 
  GitPullRequest, 
  GitCommit, 
  Link, 
  Copy, 
  ExternalLink, 
  Check, 
  X,
  Plus,
  Trash2,
  Merge,
  AlertCircle,
  CheckCircle2,
  Clock,

} from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface GitIntegrationProps {
  workspace: string;
  issueId: string;
  teamKey: string;
  issueNumber: number;
  issueTitle: string;
}

interface BranchSuggestion {
  suggestedBranch: string;
  existingBranches: string[];
  copyCommand: string;
}

interface GitLinks {
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
      url: string;
    } | null;
    mergedAt: string | null;
    createdAt: string;
    linkType: string;
  }>;
  commits: Array<{
    id: string;
    sha: string;
    fullSha: string;
    message: string;
    author: {
      name: string;
      email: string;
    };
    url: string;
    authorDate: string;
    linkType: string;
  }>;
  branches: string[];
  summary: {
    openPRs: number;
    mergedPRs: number;
    totalCommits: number;
  };
}

const stateIcons = {
  OPEN: GitPullRequest,
  CLOSED: X,
  MERGED: Merge,
};

const stateColors = {
  OPEN: 'text-green-600 bg-green-50 border-green-200',
  CLOSED: 'text-red-600 bg-red-50 border-red-200',
  MERGED: 'text-purple-600 bg-purple-50 border-purple-200',
};

export function GitIntegrationPanel({ workspace, issueId, teamKey, issueNumber, issueTitle }: GitIntegrationProps) {
  const queryClient = useQueryClient();
  const [showBranchInput, setShowBranchInput] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [copiedCommand, setCopiedCommand] = useState(false);

  const { data: branchSuggestion, isLoading: branchLoading } = useQuery({
    queryKey: ['git-branch-suggestion', issueId],
    queryFn: async (): Promise<BranchSuggestion> => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/git/branch-suggestion/${issueId}`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to load branch suggestion');
      return response.json();
    },
  });

  const { data: gitLinks, isLoading: linksLoading } = useQuery({
    queryKey: ['git-links', issueId],
    queryFn: async (): Promise<GitLinks> => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/git/issue/${issueId}/links`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to load git links');
      return response.json();
    },
  });

  const linkBranchMutation = useMutation({
    mutationFn: async (branch: string) => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/git/issue/${issueId}/link`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ branchName: branch }),
        }
      );
      if (!response.ok) throw new Error('Failed to link branch');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['git-links', issueId] });
      setShowBranchInput(false);
      setBranchName('');
      toast.success('Branch linked successfully');
    },
    onError: () => {
      toast.error('Failed to link branch');
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCommand(true);
    setTimeout(() => setCopiedCommand(false), 2000);
    toast.success('Copied to clipboard');
  };

  const isLoading = branchLoading || linksLoading;

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-linear-elevated rounded w-1/2" />
          <div className="h-8 bg-linear-elevated rounded" />
        </div>
      </div>
    );
  }

  const suggestedBranch = branchSuggestion?.suggestedBranch || `${teamKey.toLowerCase()}/${issueNumber}-${issueTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 40)}`;

  return (
    <div className="space-y-4">
      {/* Branch suggestion */}
      <div className="bg-linear-elevated/50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <GitBranch className="w-4 h-4 text-linear-text-secondary" />
          <span className="text-sm font-medium text-linear-text-secondary">Suggested branch</span>
        </div>
        
        <div className="flex items-center gap-2">
          <code className="flex-1 px-3 py-2 bg-linear-surface rounded border border-linear-border text-sm font-mono text-linear-text-secondary truncate">
            {suggestedBranch}
          </code>
          <button
            onClick={() => copyToClipboard(`git checkout -b ${suggestedBranch}`)}
            className="p-2 hover:bg-linear-elevated rounded-lg transition-colors"
            title="Copy checkout command"
          >
            {copiedCommand ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4 text-linear-text-secondary" />
            )}
          </button>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => linkBranchMutation.mutate(suggestedBranch)}
            disabled={linkBranchMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-linear-surface border border-linear-border rounded-lg text-sm text-linear-text-secondary hover:bg-linear-elevated/50 transition-colors disabled:opacity-50"
          >
            <Link className="w-3.5 h-3.5" />
            Link this branch
          </button>
          <button
            onClick={() => setShowBranchInput(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-linear-surface border border-linear-border rounded-lg text-sm text-linear-text-secondary hover:bg-linear-elevated/50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Link custom branch
          </button>
        </div>

        {/* Custom branch input */}
        {showBranchInput && (
          <div className="flex items-center gap-2 mt-3">
            <input
              type="text"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              placeholder="Enter branch name..."
              className="flex-1 px-3 py-2 border border-linear-border rounded-lg text-sm"
              autoFocus
            />
            <button
              onClick={() => branchName && linkBranchMutation.mutate(branchName)}
              disabled={!branchName || linkBranchMutation.isPending}
              className="px-3 py-2 bg-linear-accent text-white rounded-lg text-sm hover:bg-linear-accent/80 transition-colors disabled:opacity-50"
            >
              Link
            </button>
            <button
              onClick={() => {
                setShowBranchInput(false);
                setBranchName('');
              }}
              className="px-3 py-2 text-linear-text-secondary hover:text-linear-text-secondary"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Summary */}
      {gitLinks?.summary && (
        <div className="flex items-center gap-4 px-2">
          <div className="flex items-center gap-1.5">
            <GitPullRequest className="w-4 h-4 text-linear-text-tertiary" />
            <span className="text-sm text-linear-text-secondary">
              {gitLinks.summary.openPRs} open
              {gitLinks.summary.mergedPRs > 0 && (
                <span className="text-linear-text-tertiary"> • {gitLinks.summary.mergedPRs} merged</span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <GitCommit className="w-4 h-4 text-linear-text-tertiary" />
            <span className="text-sm text-linear-text-secondary">
              {gitLinks.summary.totalCommits} commits
            </span>
          </div>
        </div>
      )}

      {/* Linked branches */}
      {gitLinks?.branches && gitLinks.branches.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-linear-text-secondary mb-2">Linked branches</h4>
          <div className="space-y-1">
            {gitLinks.branches.map((branch) => (
              <div
                key={branch}
                className="flex items-center gap-2 px-3 py-2 bg-linear-elevated/50 rounded-lg"
              >
                <GitBranch className="w-4 h-4 text-linear-text-tertiary" />
                <code className="flex-1 text-sm font-mono text-linear-text-secondary truncate">
                  {branch}
                </code>
                <button
                  onClick={() => copyToClipboard(branch)}
                  className="p-1 hover:bg-linear-elevated rounded opacity-0 hover:opacity-100 transition-opacity"
                >
                  <Copy className="w-3.5 h-3.5 text-linear-text-tertiary" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pull Requests */}
      {gitLinks?.pullRequests && gitLinks.pullRequests.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-linear-text-secondary mb-2">Pull requests</h4>
          <div className="space-y-2">
            {gitLinks.pullRequests.map((pr) => {
              const StateIcon = stateIcons[pr.state];
              return (
                <a
                  key={pr.id}
                  href={pr.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 p-3 bg-linear-elevated/50 hover:bg-linear-elevated rounded-lg transition-colors group"
                >
                  <div className={`p-1.5 rounded ${stateColors[pr.state]}`}>
                    <StateIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-linear-text-secondary">
                        #{pr.number}
                      </span>
                      {pr.draft && (
                        <span className="px-1.5 py-0.5 bg-linear-elevated text-linear-text-secondary text-xs rounded">
                          Draft
                        </span>
                      )}
                      {pr.repository && (
                        <span className="text-xs text-linear-text-tertiary">
                          {pr.repository.fullName}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-linear-text mt-0.5 truncate">
                      {pr.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {pr.author.avatar ? (
                        <img
                          src={pr.author.avatar}
                          alt={pr.author.name || ''}
                          className="w-4 h-4 rounded-full"
                        />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-linear-elevated flex items-center justify-center text-xs">
                          {pr.author.name?.[0] || '?'}
                        </div>
                      )}
                      <span className="text-xs text-linear-text-secondary">
                        {pr.author.name}
                      </span>
                      <span className="text-linear-text-tertiary">•</span>
                      <span className="text-xs text-linear-text-secondary">
                        {new Date(pr.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-linear-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Commits */}
      {gitLinks?.commits && gitLinks.commits.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-linear-text-secondary mb-2">Recent commits</h4>
          <div className="space-y-2">
            {gitLinks.commits.slice(0, 5).map((commit) => (
              <a
                key={commit.id}
                href={commit.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-3 bg-linear-elevated/50 hover:bg-linear-elevated rounded-lg transition-colors group"
              >
                <div className="p-1.5 rounded bg-linear-elevated text-linear-text-secondary">
                  <GitCommit className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-linear-text line-clamp-2">
                    {commit.message.split('\n')[0]}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-xs text-linear-text-secondary bg-linear-elevated px-1.5 py-0.5 rounded">
                      {commit.sha}
                    </code>
                    <span className="text-xs text-linear-text-secondary">
                      {commit.author.name}
                    </span>
                    <span className="text-linear-text-tertiary">•</span>
                    <span className="text-xs text-linear-text-secondary">
                      {new Date(commit.authorDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-linear-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!gitLinks?.pullRequests?.length && !gitLinks?.commits?.length && !gitLinks?.branches?.length && (
        <div className="text-center py-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-linear-elevated flex items-center justify-center">
            <GitBranch className="w-6 h-6 text-linear-text-tertiary" />
          </div>
          <p className="text-sm text-linear-text-secondary">No linked Git activity</p>
          <p className="text-xs text-linear-text-tertiary mt-1">
            Create a branch with the suggested name to auto-link
          </p>
        </div>
      )}
    </div>
  );
}
