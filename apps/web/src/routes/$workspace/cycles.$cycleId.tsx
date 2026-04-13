import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { API_URL } from '~/lib/api';
import { AnimatedPage } from '@flowpigdev/ui';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Target,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Users,
  GitBranch,
  ChevronRight,
  Plus,
  MoreHorizontal,
  BarChart3,
  LayoutGrid,
  List,
  Filter,
} from 'lucide-react';

interface Cycle {
  id: string;
  number: number;
  name: string;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'COMPLETED' | 'PLANNED';
  goal: string | null;
  teamId: string;
  team: {
    id: string;
    name: string;
    key: string;
    color: string;
  };
  stats: {
    totalIssues: number;
    completedIssues: number;
    inProgressIssues: number;
    backlogIssues: number;
    completionRate: number;
    velocity: number;
  };
}

interface Issue {
  id: string;
  identifier: string;
  title: string;
  state: string;
  priority: string;
  assignee: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  workflowState?: {
    id: string;
    name: string;
    color: string;
    category: string;
  };
  points: number | null;
  dueDate: string | null;
}

interface BurndownPoint {
  date: string;
  ideal: number;
  actual: number;
}

export default function CycleDetailRoute() {
  const { workspace, cycleId } = useParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'board' | 'list' | 'burndown'>('board');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data: cycleData, isLoading: cycleLoading } = useQuery({
    queryKey: ['cycle', workspace, cycleId],
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/cycles/${cycleId}`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to load cycle');
      return response.json();
    },
  });

  const { data: issuesData, isLoading: issuesLoading } = useQuery({
    queryKey: ['cycle-issues', workspace, cycleId],
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/issues?cycleId=${cycleId}`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to load issues');
      return response.json();
    },
  });

  const { data: burndownData } = useQuery({
    queryKey: ['cycle-burndown', workspace, cycleId],
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/cycles/${cycleId}/burndown`,
        { credentials: 'include' }
      );
      if (!response.ok) return null;
      return response.json();
    },
    enabled: activeTab === 'burndown',
  });

  const completeCycleMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/cycles/${cycleId}/complete`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );
      if (!response.ok) throw new Error('Failed to complete cycle');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycle', workspace, cycleId] });
    },
  });

  if (cycleLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-linear-accent/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  const cycle: Cycle | undefined = cycleData?.cycle;
  const issues: Issue[] = issuesData?.issues || [];
  const burndown: BurndownPoint[] = burndownData?.burndown || [];

  if (!cycle) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold text-linear-text">Cycle not found</h2>
        <Link to={`/${workspace}/cycles`} className="text-linear-accent hover:text-linear-accent mt-4 inline-block">
          Back to cycles
        </Link>
      </div>
    );
  }

  const progress = cycle.stats.completionRate;
  const daysRemaining = Math.ceil((new Date(cycle.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const isActive = cycle.status === 'ACTIVE';

  // Group issues by state for board view
  const issuesByState = issues.reduce((acc, issue) => {
    const category = issue.workflowState?.category || issue.state;
    if (!acc[category]) acc[category] = [];
    acc[category].push(issue);
    return acc;
  }, {} as Record<string, Issue[]>);

  const workflowStates = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

  return (
    <AnimatedPage className="max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-linear-text-secondary mb-6">
        <Link to={`/${workspace}/cycles`} className="hover:text-linear-text-secondary">
          Cycles
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-linear-text font-medium">{cycle.name}</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-linear-elevated text-linear-text-secondary'
              }`}>
                {isActive ? 'Active' : cycle.status}
              </span>
              <span
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-white"
                style={{ backgroundColor: cycle.team.color }}
              >
                {cycle.team.key}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-linear-text mb-2">{cycle.name}</h1>
            {cycle.goal && (
              <p className="text-linear-text-secondary">{cycle.goal}</p>
            )}
          </div>

          {isActive && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (confirm('Complete this cycle and move incomplete issues to the next cycle?')) {
                    completeCycleMutation.mutate();
                  }
                }}
                disabled={completeCycleMutation.isPending}
                className="bg-linear-accent hover:bg-linear-accent/80 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Complete Cycle
              </button>
              <button className="p-2 text-linear-text-secondary hover:text-linear-text-secondary hover:bg-linear-elevated rounded-lg">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-6">
          <div className="bg-linear-surface rounded-xl border border-linear-border p-4">
            <div className="flex items-center gap-2 text-linear-text-secondary text-sm mb-1">
              <Calendar className="w-4 h-4" />
              <span>Duration</span>
            </div>
            <p className="text-2xl font-bold text-linear-text">
              {Math.ceil((new Date(cycle.endDate).getTime() - new Date(cycle.startDate).getTime()) / (1000 * 60 * 60 * 24))}
            </p>
            <p className="text-xs text-linear-text-secondary">days</p>
          </div>

          <div className="bg-linear-surface rounded-xl border border-linear-border p-4">
            <div className="flex items-center gap-2 text-linear-text-secondary text-sm mb-1">
              <Clock className="w-4 h-4" />
              <span>Remaining</span>
            </div>
            <p className={`text-2xl font-bold ${daysRemaining > 3 ? 'text-linear-text' : 'text-orange-600'}`}>
              {Math.max(0, daysRemaining)}
            </p>
            <p className="text-xs text-linear-text-secondary">days</p>
          </div>

          <div className="bg-linear-surface rounded-xl border border-linear-border p-4">
            <div className="flex items-center gap-2 text-linear-text-secondary text-sm mb-1">
              <Target className="w-4 h-4" />
              <span>Progress</span>
            </div>
            <p className="text-2xl font-bold text-linear-text">{Math.round(progress)}%</p>
            <div className="w-full bg-linear-elevated rounded-full h-1.5 mt-2">
              <div
                className="bg-linear-accent h-1.5 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="bg-linear-surface rounded-xl border border-linear-border p-4">
            <div className="flex items-center gap-2 text-linear-text-secondary text-sm mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>Completed</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{cycle.stats.completedIssues}</p>
            <p className="text-xs text-linear-text-secondary">of {cycle.stats.totalIssues} issues</p>
          </div>

          <div className="bg-linear-surface rounded-xl border border-linear-border p-4">
            <div className="flex items-center gap-2 text-linear-text-secondary text-sm mb-1">
              <TrendingUp className="w-4 h-4" />
              <span>Velocity</span>
            </div>
            <p className="text-2xl font-bold text-linear-text">{cycle.stats.velocity || 0}</p>
            <p className="text-xs text-linear-text-secondary">points/cycle</p>
          </div>

          <div className="bg-linear-surface rounded-xl border border-linear-border p-4">
            <div className="flex items-center gap-2 text-linear-text-secondary text-sm mb-1">
              <AlertCircle className="w-4 h-4" />
              <span>In Progress</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{cycle.stats.inProgressIssues}</p>
            <p className="text-xs text-linear-text-secondary">issues</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-1 bg-linear-elevated p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('board')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'board'
                ? 'bg-linear-surface text-linear-text shadow-sm'
                : 'text-linear-text-secondary hover:text-linear-text'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Board
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'list'
                ? 'bg-linear-surface text-linear-text shadow-sm'
                : 'text-linear-text-secondary hover:text-linear-text'
            }`}
          >
            <List className="w-4 h-4" />
            List
          </button>
          <button
            onClick={() => setActiveTab('burndown')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'burndown'
                ? 'bg-linear-surface text-linear-text shadow-sm'
                : 'text-linear-text-secondary hover:text-linear-text'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Burndown
          </button>
        </div>

        {activeTab !== 'burndown' && (
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-2 text-sm text-linear-text-secondary hover:bg-linear-elevated rounded-lg transition-colors">
              <Filter className="w-4 h-4" />
              Filter
            </button>
            <div className="flex items-center gap-1 bg-linear-elevated rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-linear-surface shadow-sm' : ''}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-linear-surface shadow-sm' : ''}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      {activeTab === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {workflowStates.map((state) => {
            const stateIssues = issuesByState[state] || [];
            return (
              <div key={state} className="bg-linear-elevated/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-linear-text-secondary">{state.replace('_', ' ')}</span>
                  <span className="text-xs text-linear-text-secondary bg-linear-surface px-2 py-0.5 rounded-full">
                    {stateIssues.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {stateIssues.map((issue) => (
                    <Link
                      key={issue.id}
                      to={`/${workspace}/issues/${issue.identifier}`}
                      className="block bg-linear-surface p-3 rounded-lg border border-linear-border hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-linear-text-secondary">{issue.identifier}</span>
                      </div>
                      <p className="text-sm text-linear-text font-medium line-clamp-2">{issue.title}</p>
                      {issue.assignee && (
                        <div className="flex items-center gap-2 mt-2">
                          <div className="w-5 h-5 bg-linear-elevated rounded-full flex items-center justify-center text-xs">
                            {(issue.assignee.name || '?').charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs text-linear-text-secondary">{issue.assignee.name || 'Unassigned'}</span>
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'list' && (
        <div className="bg-linear-surface rounded-xl border border-linear-border overflow-hidden">
          <div className="divide-y divide-linear-border">
            {issues.map((issue) => (
              <Link
                key={issue.id}
                to={`/${workspace}/issues/${issue.identifier}`}
                className="flex items-center gap-4 p-4 hover:bg-linear-elevated/50 transition-colors"
              >
                <span className="text-sm text-linear-text-secondary w-20">{issue.identifier}</span>
                <span className="flex-1 font-medium text-linear-text">{issue.title}</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  issue.priority === 'URGENT' ? 'bg-red-500/10 text-red-400' :
                  issue.priority === 'HIGH' ? 'bg-orange-500/10 text-orange-400' :
                  issue.priority === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400' :
                  issue.priority === 'LOW' ? 'bg-sky-500/10 text-sky-400' :
                  'bg-linear-elevated text-linear-text-secondary'
                }`}>
                  {issue.priority}
                </span>
                {issue.assignee && (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-linear-elevated rounded-full flex items-center justify-center text-xs">
                      {(issue.assignee.name || '?').charAt(0).toUpperCase()}
                    </div>
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'burndown' && (
        <div className="bg-linear-surface rounded-xl border border-linear-border p-6">
          <h3 className="text-lg font-semibold text-linear-text mb-4">Burndown Chart</h3>
          {burndown.length > 0 ? (
            <div className="h-80">
              <svg viewBox="0 0 800 300" className="w-full h-full">
                {/* Grid lines */}
                {[0, 50, 100, 150, 200, 250, 300].map((y) => (
                  <line
                    key={y}
                    x1="50"
                    y1={y}
                    x2="750"
                    y2={y}
                    stroke="#1e2a38"
                    strokeDasharray="4"
                  />
                ))}

                {/* Axes */}
                <line x1="50" y1="300" x2="750" y2="300" stroke="#2a3f55" strokeWidth="2" />
                <line x1="50" y1="0" x2="50" y2="300" stroke="#2a3f55" strokeWidth="2" />

                {/* Ideal line */}
                <polyline
                  fill="none"
                  stroke="#9ca3af"
                  strokeWidth="2"
                  strokeDasharray="5"
                  points={burndown.map((p, i) => {
                    const x = 50 + (i / (burndown.length - 1 || 1)) * 700;
                    const y = 300 - (p.ideal / Math.max(...burndown.map(b => b.ideal)) * 280);
                    return `${x},${y}`;
                  }).join(' ')}
                />

                {/* Actual line */}
                <polyline
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="3"
                  points={burndown.map((p, i) => {
                    const x = 50 + (i / (burndown.length - 1 || 1)) * 700;
                    const y = 300 - (p.actual / Math.max(...burndown.map(b => b.ideal)) * 280);
                    return `${x},${y}`;
                  }).join(' ')}
                />

                {/* Data points */}
                {burndown.map((p, i) => {
                  const x = 50 + (i / (burndown.length - 1 || 1)) * 700;
                  const y = 300 - (p.actual / Math.max(...burndown.map(b => b.ideal)) * 280);
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r="4"
                      fill="#8b5cf6"
                    />
                  );
                })}
              </svg>
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-linear-text-tertiary border-dashed" />
                  <span className="text-sm text-linear-text-secondary">Ideal</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-1 bg-violet-500" />
                  <span className="text-sm text-linear-text-secondary">Actual</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-linear-text-secondary">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 text-linear-text-tertiary" />
              <p>Burndown data will be available once the cycle starts</p>
            </div>
          )}
        </div>
      )}
    </AnimatedPage>
  );
}
