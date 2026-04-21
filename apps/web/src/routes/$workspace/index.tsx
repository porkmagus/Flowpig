import { useParams, useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { API_URL } from '~/lib/api';
import { useCreateIssueModal } from '~/components/create-issue-modal';
import { AnimatedList, AnimatedItem, AnimatedCard } from '@flowpigdev/ui';
import { CircleDot, FileText, Users, ArrowRight } from 'lucide-react';
import { Skeleton, SkeletonCard, SkeletonList } from '~/components/ui/skeleton';

interface WorkspaceStats {
  workspace: {
    id: string;
    name: string;
    description: string | null;
    stats: {
      members: number;
      issues: number;
      notes: number;
      teams: number;
    };
  };
}

export default function WorkspaceIndex() {
  const { workspace } = useParams();
  const navigate = useNavigate();
  const createIssueModal = useCreateIssueModal();

  const { data, isLoading } = useQuery({
    queryKey: ['workspace', workspace],
    queryFn: async (): Promise<WorkspaceStats> => {
      const response = await fetch(`${API_URL}/workspaces/${workspace}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to load workspace');
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-linear-border bg-linear-surface p-5 space-y-3">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-6 w-32" />
            <SkeletonList count={5} />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'Issues', value: data?.workspace?.stats?.issues ?? 0, icon: CircleDot, color: 'bg-red-500/10 text-red-400' },
    { label: 'Notes', value: data?.workspace?.stats?.notes ?? 0, icon: FileText, color: 'bg-sky-500/10 text-sky-300' },
    { label: 'Members', value: data?.workspace?.stats?.members ?? 0, icon: Users, color: 'bg-emerald-500/10 text-emerald-300' },
    { label: 'Teams', value: data?.workspace?.stats?.teams ?? 0, icon: Users, color: 'bg-violet-500/10 text-violet-300' },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Welcome header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-linear-text">
          Welcome to {data?.workspace?.name || workspace}
        </h1>
        {data?.workspace?.description && (
          <p className="mt-2 text-linear-text-secondary">{data.workspace.description}</p>
        )}
      </div>

      {/* Stats grid */}
      <AnimatedList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <AnimatedItem key={stat.label}>
            <AnimatedCard className="bg-linear-surface p-6 rounded-xl border border-linear-border hover:border-linear-border-hover hover:shadow-lg hover:shadow-black/20 transition-all cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-linear-text-secondary">{stat.label}</p>
                  <p className="text-3xl font-bold text-linear-text mt-1">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </AnimatedCard>
          </AnimatedItem>
        ))}
      </AnimatedList>

      {/* Quick actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-linear-surface p-6 rounded-xl border border-linear-border"
        >
          <h3 className="font-semibold text-linear-text mb-4">Quick start</h3>
          <div className="space-y-3">
            <button
              onClick={() => createIssueModal.open()}
              className="w-full flex items-center gap-3 p-3 bg-linear-elevated hover:bg-linear-surface rounded-lg transition-colors text-left"
            >
              <CircleDot className="w-5 h-5 text-linear-accent" />
              <div className="flex-1">
                <p className="font-medium text-linear-text">Create your first issue</p>
                <p className="text-sm text-linear-text-secondary">Track bugs, features, and tasks</p>
              </div>
              <ArrowRight className="w-4 h-4 text-linear-text-tertiary" />
            </button>
            <button
              onClick={() => navigate(`/${workspace}/notes`)}
              className="w-full flex items-center gap-3 p-3 bg-linear-elevated hover:bg-linear-surface rounded-lg transition-colors text-left"
            >
              <FileText className="w-5 h-5 text-linear-accent" />
              <div className="flex-1">
                <p className="font-medium text-linear-text">Write documentation</p>
                <p className="text-sm text-linear-text-secondary">Create team docs and wikis</p>
              </div>
              <ArrowRight className="w-4 h-4 text-linear-text-tertiary" />
            </button>
            <button
              onClick={() => navigate(`/${workspace}/team`)}
              className="w-full flex items-center gap-3 p-3 bg-linear-elevated hover:bg-linear-surface rounded-lg transition-colors text-left"
            >
              <Users className="w-5 h-5 text-linear-accent" />
              <div className="flex-1">
                <p className="font-medium text-linear-text">Invite your team</p>
                <p className="text-sm text-linear-text-secondary">Collaborate together</p>
              </div>
              <ArrowRight className="w-4 h-4 text-linear-text-tertiary" />
            </button>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-linear-surface p-6 rounded-xl border border-linear-border"
        >
          <h3 className="font-semibold text-linear-text mb-4">Recent activity</h3>
          <div className="text-center py-8 text-linear-text-secondary">
            <p>No recent activity</p>
            <p className="text-sm mt-1">Create an issue or note to get started</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
