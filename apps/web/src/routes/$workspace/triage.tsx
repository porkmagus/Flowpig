import { useState } from 'react';
import { useParams } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { AnimatedList, AnimatedItem, AnimatedCard } from '@flowpigdev/ui';
import { API_URL } from '~/lib/runtime-config';
import { 
  Inbox, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Copy, 
  User, 
  AlertCircle,
  ChevronRight,
  Filter,
  MoreHorizontal,
  BarChart3
} from 'lucide-react';
import { useWorkspaceRealtime } from '~/lib/ws';

interface TriageIssue {
  id: string;
  identifier: string;
  title: string;
  priority: 'NO_PRIORITY' | 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  state: string;
  createdAt: string;
  assignee: { id: string; name: string | null; image: string | null } | null;
  creator: { id: string; name: string | null; image: string | null };
  workflowState: { id: string; name: string; color: string } | null;
  labels: Array<{ id: string; name: string; color: string }>;
  commentCount?: number;
}

interface TriageStats {
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
}

const priorityConfig = {
  URGENT: { color: 'bg-red-500', label: 'Urgent', icon: AlertCircle },
  HIGH: { color: 'bg-orange-500', label: 'High', icon: AlertCircle },
  MEDIUM: { color: 'bg-yellow-500', label: 'Medium', icon: AlertCircle },
  LOW: { color: 'bg-blue-500', label: 'Low', icon: AlertCircle },
  NO_PRIORITY: { color: 'bg-linear-elevated', label: 'No Priority', icon: AlertCircle },
};

export default function TriagePage() {
  const { workspace } = useParams();
  const queryClient = useQueryClient();
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [showStats, setShowStats] = useState(false);

  // Get teams for selector
  const { data: teams } = useQuery({
    queryKey: ['teams', workspace],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/workspaces/${workspace}/teams`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch teams');
      return res.json();
    },
  });

  // Get triage issues
  const { data: triageData, isLoading } = useQuery({
    queryKey: ['triage', workspace, selectedTeamId],
    queryFn: async () => {
      if (!selectedTeamId) return null;
      const res = await fetch(
        `${API_URL}/workspaces/${workspace}/teams/${selectedTeamId}/triage`,
        { credentials: 'include' }
      );
      if (!res.ok) throw new Error('Failed to fetch triage');
      return res.json();
    },
    enabled: !!selectedTeamId,
  });

  // Get triage stats
  const { data: statsData } = useQuery({
    queryKey: ['triage-stats', workspace, selectedTeamId],
    queryFn: async () => {
      if (!selectedTeamId) return null;
      const res = await fetch(
        `${API_URL}/workspaces/${workspace}/teams/${selectedTeamId}/triage/stats`,
        { credentials: 'include' }
      );
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    enabled: !!selectedTeamId,
  });

  // Real-time updates
  useWorkspaceRealtime(workspace, {
    onIssueUpdated: (issueId) => {
      queryClient.invalidateQueries({ queryKey: ['triage', workspace, selectedTeamId] });
    },
  });

  // Triage actions
  const assignMutation = useMutation({
    mutationFn: async ({ issueId, assigneeId }: { issueId: string; assigneeId?: string }) => {
      const res = await fetch(
        `${API_URL}/workspaces/${workspace}/teams/${selectedTeamId}/triage/${issueId}/assign`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ assigneeId }),
        }
      );
      if (!res.ok) throw new Error('Failed to assign');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triage', workspace, selectedTeamId] });
    },
  });

  const snoozeMutation = useMutation({
    mutationFn: async (issueId: string) => {
      const res = await fetch(
        `${API_URL}/workspaces/${workspace}/teams/${selectedTeamId}/triage/${issueId}/snooze`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ days: 7 }),
        }
      );
      if (!res.ok) throw new Error('Failed to snooze');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triage', workspace, selectedTeamId] });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async (issueId: string) => {
      const res = await fetch(
        `${API_URL}/workspaces/${workspace}/teams/${selectedTeamId}/triage/${issueId}/decline`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        }
      );
      if (!res.ok) throw new Error('Failed to decline');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triage', workspace, selectedTeamId] });
    },
  });

  const issues: TriageIssue[] = triageData?.issues || [];
  const stats: TriageStats | null = statsData?.stats || null;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-linear-text flex items-center gap-2">
            <Inbox className="w-6 h-6 text-linear-accent" />
            Triage
          </h1>
          <p className="text-linear-text-secondary mt-1">
            Review and organize unassigned issues
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowStats(!showStats)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              showStats ? 'bg-linear-accent/10 text-linear-accent' : 'text-linear-text-secondary hover:bg-linear-elevated'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Stats
          </button>
        </div>
      </div>

      {/* Team Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-linear-text-secondary mb-2">
          Select Team
        </label>
        <div className="flex gap-2 flex-wrap">
          {teams?.teams?.map((team: any) => (
            <button
              key={team.id}
              onClick={() => setSelectedTeamId(team.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedTeamId === team.id
                  ? 'bg-linear-accent text-white'
                  : 'bg-linear-surface border border-linear-border text-linear-text-secondary hover:bg-linear-elevated'
              }`}
            >
              <span className="flex items-center gap-2">
                <span 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: team.color }} 
                />
                {team.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Stats Panel */}
      {showStats && stats && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-6 bg-linear-surface rounded-xl border border-linear-border p-6"
        >
          <div className="grid grid-cols-4 gap-6">
            <div>
              <p className="text-3xl font-bold text-linear-text">{stats.totalTriage}</p>
              <p className="text-sm text-linear-text-secondary">Issues in Triage</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-orange-500">{stats.byPriority.URGENT + stats.byPriority.HIGH}</p>
              <p className="text-sm text-linear-text-secondary">High Priority</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-linear-text">{stats.totalTeamIssues}</p>
              <p className="text-sm text-linear-text-secondary">Total Team Issues</p>
            </div>
            {stats.oldestIssue && (
              <div>
                <p className="text-3xl font-bold text-red-500">{stats.oldestIssue.daysOld}</p>
                <p className="text-sm text-linear-text-secondary">Days Oldest</p>
                <p className="text-xs text-linear-text-tertiary">{stats.oldestIssue.identifier}</p>
              </div>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-linear-border">
            <p className="text-sm font-medium text-linear-text mb-2">By Priority</p>
            <div className="flex gap-4">
              {Object.entries(stats.byPriority).map(([priority, count]) => (
                <div key={priority} className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${priorityConfig[priority as keyof typeof priorityConfig].color}`} />
                  <span className="text-sm text-linear-text-secondary">{priorityConfig[priority as keyof typeof priorityConfig].label}: {count}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Issues List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-linear-accent" />
        </div>
      ) : !selectedTeamId ? (
        <div className="text-center py-16 bg-linear-surface rounded-xl border border-linear-border">
          <Inbox className="w-12 h-12 text-linear-text-tertiary mx-auto mb-4" />
          <p className="text-linear-text-secondary">Select a team to view triage inbox</p>
        </div>
      ) : issues.length === 0 ? (
        <div className="text-center py-16 bg-linear-surface rounded-xl border border-linear-border">
          <CheckCircle className="w-12 h-12 text-linear-success mx-auto mb-4" />
          <p className="text-lg font-medium text-linear-text">Triage Inbox Empty</p>
          <p className="text-linear-text-secondary mt-1">All issues have been assigned!</p>
        </div>
      ) : (
        <AnimatedList className="space-y-3">
          {issues.map((issue) => (
            <AnimatedItem key={issue.id}>
              <AnimatedCard className="bg-linear-surface rounded-xl border border-linear-border p-4 hover:border-linear-border-hover transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-linear-text-secondary">
                        {issue.identifier}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityConfig[issue.priority].color} text-white`}>
                        {priorityConfig[issue.priority].label}
                      </span>
                      {issue.commentCount ? (
                        <span className="text-xs text-linear-text-tertiary">
                          {issue.commentCount} comments
                        </span>
                      ) : null}
                    </div>
                    <h3 className="text-base font-medium text-linear-text truncate">
                      {issue.title}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-linear-text-secondary">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Created by {issue.creator?.name || 'Unknown'}
                      </span>
                      <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => assignMutation.mutate({ issueId: issue.id })}
                      disabled={assignMutation.isPending}
                      className="flex items-center gap-1 px-3 py-1.5 bg-linear-accent text-white rounded-lg text-sm font-medium hover:bg-linear-accent/80 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Assign to me
                    </button>
                    <button
                      onClick={() => snoozeMutation.mutate(issue.id)}
                      disabled={snoozeMutation.isPending}
                      className="flex items-center gap-1 px-3 py-1.5 bg-linear-elevated text-linear-text-secondary rounded-lg text-sm font-medium hover:bg-linear-border transition-colors disabled:opacity-50"
                      title="Snooze for 7 days"
                    >
                      <Clock className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => declineMutation.mutate(issue.id)}
                      disabled={declineMutation.isPending}
                      className="flex items-center gap-1 px-3 py-1.5 bg-linear-elevated text-linear-text-secondary rounded-lg text-sm font-medium hover:bg-red-500/10 hover:text-red-400 transition-colors disabled:opacity-50"
                      title="Decline/close"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </AnimatedCard>
            </AnimatedItem>
          ))}
        </AnimatedList>
      )}
    </div>
  );
}
