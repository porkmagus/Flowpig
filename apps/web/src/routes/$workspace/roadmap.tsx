import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { AnimatedPage } from '@flowpigdev/ui';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Target,
  Layers,
  Users,
  FolderKanban,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface RoadmapCycle {
  id: string;
  name: string;
  number: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  sprintGoal: string | null;
}

interface RoadmapTeam {
  id: string;
  name: string;
  key: string;
  color: string;
  cycles: RoadmapCycle[];
}

interface RoadmapInitiative {
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
}

export default function RoadmapPage() {
  const { workspace } = useParams();
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'timeline' | 'initiatives'>('timeline');

  // Calculate date range (3 months)
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 30);
  const endDate = new Date(today);
  endDate.setMonth(endDate.getMonth() + 3);

  // Get teams
  const { data: teamsData } = useQuery({
    queryKey: ['teams', workspace],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/workspaces/${workspace}/teams`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch teams');
      return res.json();
    },
  });

  // Get roadmap data
  const { data: roadmapData, isLoading } = useQuery({
    queryKey: ['roadmap', workspace, selectedTeamId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedTeamId) params.append('teamId', selectedTeamId);
      params.append('startDate', startDate.toISOString());
      params.append('endDate', endDate.toISOString());
      
      const res = await fetch(
        `${API_URL}/workspaces/${workspace}/roadmap?${params}`,
        { credentials: 'include' }
      );
      if (!res.ok) throw new Error('Failed to fetch roadmap');
      return res.json();
    },
  });

  // Get timeline data
  const { data: timelineData } = useQuery({
    queryKey: ['timeline', workspace, selectedTeamId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedTeamId) params.append('teamId', selectedTeamId);
      params.append('startDate', startDate.toISOString());
      params.append('endDate', endDate.toISOString());
      params.append('groupBy', 'team');
      
      const res = await fetch(
        `${API_URL}/workspaces/${workspace}/roadmap/timeline?${params}`,
        { credentials: 'include' }
      );
      if (!res.ok) throw new Error('Failed to fetch timeline');
      return res.json();
    },
  });

  const teams: RoadmapTeam[] = roadmapData?.teams || [];
  const initiatives: RoadmapInitiative[] = roadmapData?.initiatives || [];
  const unscheduled = roadmapData?.unscheduled;
  const timeline = timelineData?.groups || [];

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'LAUNCHED':
        return 'bg-green-500';
      case 'IN_PROGRESS':
        return 'bg-blue-500';
      case 'PAUSED':
        return 'bg-yellow-500';
      case 'CANCELLED':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Target className="w-6 h-6 text-primary-500" />
            Roadmap
          </h1>
          <p className="text-gray-500 mt-1">
            Plan and visualize work across teams and initiatives
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'timeline'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setViewMode('initiatives')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'initiatives'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Initiatives
            </button>
          </div>
        </div>
      </div>

      {/* Team Filter */}
      <div className="mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSelectedTeamId('')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !selectedTeamId
                ? 'bg-primary-500 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            All Teams
          </button>
          {teamsData?.teams?.map((team: any) => (
            <button
              key={team.id}
              onClick={() => setSelectedTeamId(team.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedTeamId === team.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
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

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <div className="space-y-6">
          {/* Timeline Header */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Timeline View</h2>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{formatDate(startDate.toISOString())}</span>
                <ArrowRight className="w-4 h-4" />
                <span>{formatDate(endDate.toISOString())}</span>
              </div>
            </div>

            {/* Cycles Grid */}
            <div className="p-6">
              {teams.map((team) => (
                <div key={team.id} className="mb-8 last:mb-0">
                  <div className="flex items-center gap-3 mb-4">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: team.color }} 
                    />
                    <h3 className="font-medium text-gray-900">{team.name}</h3>
                    <span className="text-sm text-gray-500">({team.key})</span>
                  </div>

                  {/* Cycles */}
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {team.cycles.map((cycle) => (
                      <motion.div
                        key={cycle.id}
                        whileHover={{ scale: 1.02 }}
                        className={`flex-shrink-0 w-64 p-4 rounded-xl border-2 transition-colors ${
                          cycle.isActive
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            cycle.isActive ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {cycle.isActive ? 'Active' : `Cycle ${cycle.number}`}
                          </span>
                          <Clock className="w-4 h-4 text-gray-400" />
                        </div>
                        <h4 className="font-medium text-gray-900 mb-1">
                          {cycle.name || `Cycle ${cycle.number}`}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {formatDate(cycle.startDate)} - {formatDate(cycle.endDate)}
                        </p>
                        {cycle.sprintGoal && (
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                            {cycle.sprintGoal}
                          </p>
                        )}
                      </motion.div>
                    ))}

                    {team.cycles.length === 0 && (
                      <div className="flex-shrink-0 w-64 p-4 rounded-xl border border-dashed border-gray-300 bg-gray-50">
                        <p className="text-sm text-gray-500 text-center">
                          No cycles scheduled
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Unscheduled Issues */}
          {unscheduled && unscheduled.count > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                  Unscheduled Issues
                </h3>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                  {unscheduled.count}
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto">
                {unscheduled.issues.slice(0, 10).map((issue: any) => (
                  <Link
                    key={issue.id}
                    to={`/${workspace}/issues/${issue.id}`}
                    className="flex-shrink-0 w-56 p-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-500">
                        {issue.identifier}
                      </span>
                      <span className={`w-2 h-2 rounded-full ${
                        issue.priority === 'URGENT' ? 'bg-red-500' :
                        issue.priority === 'HIGH' ? 'bg-orange-500' :
                        issue.priority === 'MEDIUM' ? 'bg-yellow-500' :
                        'bg-gray-300'
                      }`} />
                    </div>
                    <p className="text-sm font-medium text-gray-900 line-clamp-2">
                      {issue.title}
                    </p>
                  </Link>
                ))}
                {unscheduled.count > 10 && (
                  <div className="flex-shrink-0 w-56 flex items-center justify-center">
                    <span className="text-sm text-gray-500">
                      +{unscheduled.count - 10} more
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Initiatives View */}
      {viewMode === 'initiatives' && (
        <div className="space-y-4">
          {initiatives.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
              <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900">No Initiatives</p>
              <p className="text-gray-500 mt-1">
                Create initiatives to track larger goals
              </p>
            </div>
          ) : (
            initiatives.map((initiative) => (
              <motion.div
                key={initiative.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`w-2 h-2 rounded-full ${getStatusColor(initiative.status)}`} />
                        <span className="text-sm text-gray-500 uppercase tracking-wider">
                          {initiative.status.replace('_', ' ')}
                        </span>
                        {initiative.targetDate && (
                          <span className="text-sm text-gray-500">
                            Target: {formatDate(initiative.targetDate)}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {initiative.name}
                      </h3>
                      {initiative.description && (
                        <p className="text-gray-600 mt-2">{initiative.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Projects */}
                  {initiative.projects.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                        <FolderKanban className="w-4 h-4" />
                        Projects ({initiative.projects.length})
                      </h4>
                      <div className="grid grid-cols-3 gap-4">
                        {initiative.projects.map((project) => (
                          <div
                            key={project.id}
                            className="p-4 rounded-lg border border-gray-200 bg-gray-50"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`w-2 h-2 rounded-full ${getStatusColor(project.status)}`} />
                              <span className="text-xs text-gray-500">
                                {project.status.replace('_', ' ')}
                              </span>
                            </div>
                            <h5 className="font-medium text-gray-900 text-sm">
                              {project.name}
                            </h5>
                            <p className="text-xs text-gray-500 mt-1">
                              {project.issueCount} issues
                            </p>
                            {project.targetDate && (
                              <p className="text-xs text-gray-400 mt-1">
                                Due {formatDate(project.targetDate)}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
