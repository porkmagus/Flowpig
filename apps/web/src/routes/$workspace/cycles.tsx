import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { API_URL } from '~/lib/api';
import { AnimatedList, AnimatedItem, AnimatedCard } from '@flowpigdev/ui';
import { 
  Target, 
  Calendar, 
  Users, 
  CheckCircle2, 
  ArrowRight,
  Plus,
  TrendingUp,
  Clock
} from 'lucide-react';

interface Cycle {
  id: string;
  number: number;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  sprintGoal?: string;
  capacity?: number;
  team: {
    id: string;
    name: string;
    key: string;
    color: string;
  };
  issueCount: number;
  stats?: {
    totalIssues: number;
    completedIssues: number;
    inProgressIssues: number;
    completionRate: number;
  };
}

export default function CyclesListRoute() {
  const { workspace } = useParams();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: cyclesData, isLoading } = useQuery({
    queryKey: ['cycles', workspace],
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/cycles`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to load cycles');
      return response.json();
    },
  });

  const { data: activeCycleData } = useQuery({
    queryKey: ['cycles', workspace, 'active'],
    queryFn: async () => {
      // Get first team's active cycle
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/cycles/active?teamId=team_eng_001`,
        { credentials: 'include' }
      );
      if (!response.ok) return null;
      return response.json();
    },
  });

  const cycles: Cycle[] = cyclesData?.cycles || [];
  const activeCycle: Cycle | null = activeCycleData?.cycle || null;

  // Group cycles by team
  const cyclesByTeam = cycles.reduce((acc, cycle) => {
    if (!acc[cycle.team.id]) {
      acc[cycle.team.id] = { team: cycle.team, cycles: [] };
    }
    acc[cycle.team.id].cycles.push(cycle);
    return acc;
  }, {} as Record<string, { team: Cycle['team']; cycles: Cycle[] }>);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cycles</h1>
          <p className="text-gray-600 mt-1">
            Sprint planning and retrospectives
          </p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Start new cycle
        </button>
      </div>

      {/* Active Cycle Card */}
      {activeCycle && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 text-white mb-8"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span 
                  className="px-2 py-1 rounded text-xs font-medium bg-white/20"
                  style={{ backgroundColor: activeCycle.team.color }}
                >
                  {activeCycle.team.key}
                </span>
                <span className="text-sm opacity-90">Active Cycle</span>
              </div>
              <h2 className="text-2xl font-bold mb-2">{activeCycle.name}</h2>
              {activeCycle.sprintGoal && (
                <p className="text-white/90 mb-4 max-w-xl">{activeCycle.sprintGoal}</p>
              )}
              <div className="flex items-center gap-6 text-sm">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(activeCycle.startDate).toLocaleDateString()} - {new Date(activeCycle.endDate).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  {activeCycle.stats?.completedIssues || 0} / {activeCycle.stats?.totalIssues || 0} issues
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold mb-1">
                {activeCycle.stats?.completionRate || 0}%
              </div>
              <div className="text-sm opacity-90">Completion</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Cycles List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          {Object.values(cyclesByTeam).map(({ team, cycles: teamCycles }) => (
            <div key={team.id}>
              <div className="flex items-center gap-2 mb-4">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: team.color }}
                />
                <h2 className="font-semibold text-gray-900">{team.name}</h2>
                <span className="text-sm text-gray-500">({team.key})</span>
              </div>

              <AnimatedList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teamCycles.map((cycle) => (
                  <AnimatedItem key={cycle.id}>
                    <Link to={`/${workspace}/cycles/${cycle.id}`}>
                      <AnimatedCard className="bg-white p-5 rounded-xl border border-gray-200 hover:shadow-lg transition-all h-full">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-lg font-bold text-gray-900">
                            {cycle.name}
                          </span>
                          {cycle.isActive && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                              Active
                            </span>
                          )}
                        </div>

                        {cycle.sprintGoal && (
                          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                            {cycle.sprintGoal}
                          </p>
                        )}

                        <div className="space-y-2 text-sm text-gray-500">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {new Date(cycle.startDate).toLocaleDateString()} - {new Date(cycle.endDate).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Target className="w-4 h-4" />
                            <span>{cycle.issueCount} issues</span>
                          </div>
                        </div>

                        {cycle.stats && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500">Progress</span>
                              <span className="font-medium text-gray-900">
                                {cycle.stats.completionRate}%
                              </span>
                            </div>
                            <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary-500 rounded-full"
                                style={{ width: `${cycle.stats.completionRate}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </AnimatedCard>
                    </Link>
                  </AnimatedItem>
                ))}
              </AnimatedList>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
