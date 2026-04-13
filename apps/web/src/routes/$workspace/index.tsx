import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { API_URL } from '~/lib/api';
import { AnimatedList, AnimatedItem, AnimatedCard } from '@flowpigdev/ui';
import { CircleDot, FileText, Users, ArrowRight } from 'lucide-react';

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
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  const stats = [
    { label: 'Issues', value: data?.workspace.stats.issues || 0, icon: CircleDot, color: 'bg-red-50 text-red-600' },
    { label: 'Notes', value: data?.workspace.stats.notes || 0, icon: FileText, color: 'bg-blue-50 text-blue-600' },
    { label: 'Members', value: data?.workspace.stats.members || 0, icon: Users, color: 'bg-green-50 text-green-600' },
    { label: 'Teams', value: data?.workspace.stats.teams || 0, icon: Users, color: 'bg-purple-50 text-purple-600' },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Welcome header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome to {data?.workspace.name || workspace}
        </h1>
        {data?.workspace.description && (
          <p className="mt-2 text-gray-600">{data.workspace.description}</p>
        )}
      </div>

      {/* Stats grid */}
      <AnimatedList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <AnimatedItem key={stat.label}>
            <AnimatedCard className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
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
          className="bg-white p-6 rounded-xl border border-gray-200"
        >
          <h3 className="font-semibold text-gray-900 mb-4">Quick start</h3>
          <div className="space-y-3">
            <button className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left">
              <CircleDot className="w-5 h-5 text-primary-500" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">Create your first issue</p>
                <p className="text-sm text-gray-500">Track bugs, features, and tasks</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </button>
            <button className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left">
              <FileText className="w-5 h-5 text-primary-500" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">Write documentation</p>
                <p className="text-sm text-gray-500">Create team docs and wikis</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </button>
            <button className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left">
              <Users className="w-5 h-5 text-primary-500" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">Invite your team</p>
                <p className="text-sm text-gray-500">Collaborate together</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-xl border border-gray-200"
        >
          <h3 className="font-semibold text-gray-900 mb-4">Recent activity</h3>
          <div className="text-center py-8 text-gray-500">
            <p>No recent activity</p>
            <p className="text-sm mt-1">Create an issue or note to get started</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
