import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Target,
  CheckCircle2,
  CircleDot,
  AlertCircle,
  TrendingUp,
  Calendar,
  MoreHorizontal,
  Play,
  Pause,
  RotateCcw,
  GitBranch,
  BarChart3,
  Flame,
  Zap,
  ArrowRight
} from 'lucide-react';
import { API_URL } from '~/lib/api';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { FadeIn, StaggerContainer, StaggerItem } from '~/components/ui/motion';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell
} from 'recharts';

interface Cycle {
  id: string;
  number: number;
  name: string | null;
  description: string | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isCompleted: boolean;
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  goals: string[];
  stats: {
    totalIssues: number;
    completedIssues: number;
    inProgressIssues: number;
    backlogIssues: number;
    completionPercentage: number;
    velocity: number;
    averageCycleTime: number;
  };
  burndown: Array<{
    date: string;
    ideal: number;
    actual: number;
  }>;
  velocity: Array<{
    cycle: number;
    points: number;
  }>;
  issues: Array<{
    id: string;
    identifier: string;
    title: string;
    state: string;
    priority: string;
    assignee: {
      id: string;
      name: string;
    } | null;
    estimate: number | null;
  }>;
}

interface CreateCycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: any) => void;
}

function CreateCycleModal({ isOpen, onClose, onCreate }: CreateCycleModalProps) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [goals, setGoals] = useState<string[]>(['']);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      name: name || null,
      startDate,
      endDate,
      goals: goals.filter(g => g.trim()),
    });
    onClose();
    setName('');
    setStartDate('');
    setEndDate('');
    setGoals(['']);
  };

  const addGoal = () => setGoals([...goals, '']);
  const updateGoal = (index: number, value: string) => {
    const newGoals = [...goals];
    newGoals[index] = value;
    setGoals(newGoals);
  };
  const removeGoal = (index: number) => {
    setGoals(goals.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-linear-text/30 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-lg bg-linear-elevated rounded-xl border border-linear-border shadow-elevation-modal p-6"
      >
        <h2 className="text-lg font-semibold text-linear-text mb-4">Create New Cycle</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-linear-text mb-1">Name (optional)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Sprint 23 - User Authentication"
              className="w-full px-3 py-2 bg-linear-surface border border-linear-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-linear-accent"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-linear-text mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-linear-surface border border-linear-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-linear-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-linear-text mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-linear-surface border border-linear-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-linear-accent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-linear-text mb-1">Goals</label>
            <div className="space-y-2">
              {goals.map((goal, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={goal}
                    onChange={(e) => updateGoal(index, e.target.value)}
                    placeholder={`Goal ${index + 1}`}
                    className="flex-1 px-3 py-2 bg-linear-surface border border-linear-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-linear-accent"
                  />
                  {goals.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeGoal(index)}
                      className="p-2 text-priority-urgent hover:bg-priority-urgent/10 rounded-lg"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addGoal}
              className="mt-2 text-sm text-linear-accent hover:text-linear-accent-hover"
            >
              + Add another goal
            </button>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit">Create Cycle</Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function CyclesList() {
  const { workspace } = useParams();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<string | null>(null);

  // Fetch cycles
  const { data: cycles, isLoading } = useQuery({
    queryKey: ['cycles', workspace],
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/cycles`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to fetch cycles');
      const data = await response.json() as { cycles: Cycle[] };
      return data.cycles ?? [];
    },
  });

  // Fetch active cycle details
  const { data: activeCycleDataRaw } = useQuery({
    queryKey: ['active-cycle', workspace],
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/cycles/active`,
        { credentials: 'include' }
      );
      if (!response.ok) return null;
      const data = await response.json();
      return (data as { cycle: Cycle & { stats?: any; burndown?: any } }).cycle;
    },
  });

  // Mutations
  const createCycleMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/cycles`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) throw new Error('Failed to create cycle');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycles', workspace] });
    },
  });

  const startCycleMutation = useMutation({
    mutationFn: async (cycleId: string) => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/cycles/${cycleId}/start`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );
      if (!response.ok) throw new Error('Failed to start cycle');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycles', workspace] });
      queryClient.invalidateQueries({ queryKey: ['active-cycle', workspace] });
    },
  });

  const completeCycleMutation = useMutation({
    mutationFn: async (cycleId: string) => {
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
      queryClient.invalidateQueries({ queryKey: ['cycles', workspace] });
      queryClient.invalidateQueries({ queryKey: ['active-cycle', workspace] });
    },
  });

  const activeCycleData = (cycles ?? []).find((c: Cycle) => c.isActive) || activeCycleDataRaw;

  return (
    <div className="space-y-6">
      {/* Header */}
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-linear-text tracking-tight">Cycles</h1>
            <p className="text-sm text-linear-text-secondary mt-0.5">
              Plan and track sprints across your workspace
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            New cycle
          </Button>
        </div>
      </FadeIn>

      {/* Active Cycle */}
      {activeCycleData && (
        <FadeIn delay={0.1}>
          <Card className="border-linear-accent/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-linear-accent flex items-center justify-center">
                    <Flame className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Active Cycle</CardTitle>
                    <p className="text-sm text-linear-text-secondary">
                      Cycle {activeCycleData.number}{activeCycleData.name ? ` - ${activeCycleData.name}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="accent" className="gap-1">
                    <Play className="w-3 h-3" />
                    In Progress
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => completeCycleMutation.mutate(activeCycleData.id)}
                    disabled={completeCycleMutation.isPending}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Complete
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="p-3 bg-linear-surface rounded-lg">
                  <p className="text-xs text-linear-text-secondary uppercase tracking-wider">Progress</p>
                  <p className="text-2xl font-semibold text-linear-text mt-1">
                    {activeCycleData.stats?.completionPercentage || 0}%
                  </p>
                  <div className="mt-2 h-1.5 bg-linear-border rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-linear-accent rounded-full transition-all"
                      style={{ width: `${activeCycleData.stats?.completionPercentage || 0}%` }}
                    />
                  </div>
                </div>
                <div className="p-3 bg-linear-surface rounded-lg">
                  <p className="text-xs text-linear-text-secondary uppercase tracking-wider">Issues</p>
                  <p className="text-2xl font-semibold text-linear-text mt-1">
                    {activeCycleData.stats?.completedIssues || 0}/{activeCycleData.stats?.totalIssues || 0}
                  </p>
                  <p className="text-xs text-linear-text-tertiary mt-1">
                    {activeCycleData.stats?.inProgressIssues || 0} in progress
                  </p>
                </div>
                <div className="p-3 bg-linear-surface rounded-lg">
                  <p className="text-xs text-linear-text-secondary uppercase tracking-wider">Velocity</p>
                  <p className="text-2xl font-semibold text-linear-text mt-1">
                    {activeCycleData.stats?.velocity || 0}
                  </p>
                  <p className="text-xs text-linear-text-tertiary mt-1">issues/day</p>
                </div>
                <div className="p-3 bg-linear-surface rounded-lg">
                  <p className="text-xs text-linear-text-secondary uppercase tracking-wider">Days Left</p>
                  <p className="text-2xl font-semibold text-linear-text mt-1">
                    {Math.max(0, Math.ceil((new Date(activeCycleData.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))}
                  </p>
                  <p className="text-xs text-linear-text-tertiary mt-1">
                    ends {new Date(activeCycleData.endDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Burndown Chart */}
              {activeCycleData.burndown && activeCycleData.burndown.length > 0 && (
                <div className="h-48">
                  <p className="text-xs text-linear-text-secondary mb-2">Burndown Chart</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={activeCycleData.burndown}>
                      <defs>
                        <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#5E6AD2" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#5E6AD2" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E6E6E6" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        stroke="#8E8E8E"
                        fontSize={10}
                      />
                      <YAxis stroke="#8E8E8E" fontSize={10} />
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F1F1F', 
                          border: 'none', 
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="ideal" 
                        stroke="#8E8E8E" 
                        strokeDasharray="5 5"
                        fill="none"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="actual" 
                        stroke="#5E6AD2" 
                        fillOpacity={1}
                        fill="url(#colorActual)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* All Cycles */}
      <FadeIn delay={0.2}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-linear-text uppercase tracking-wider">All Cycles</h2>
          <div className="flex items-center gap-2">
            <button className="p-1.5 hover:bg-linear-surface rounded-md text-linear-text-secondary">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-linear-text-secondary">2024</span>
            <button className="p-1.5 hover:bg-linear-surface rounded-md text-linear-text-secondary">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 border-2 border-linear-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {cycles?.map((cycle: Cycle) => (
              <motion.div
                key={cycle.id}
                layout
                className={cn(
                  "group flex items-center gap-4 p-4 bg-linear-elevated border border-linear-border rounded-lg transition-all hover:border-linear-border-hover",
                  cycle.isActive && "border-linear-accent/30 bg-linear-accent-light/30"
                )}
              >
                {/* Cycle number */}
                <div className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center text-lg font-semibold",
                  cycle.isActive 
                    ? "bg-linear-accent text-white" 
                    : cycle.isCompleted
                    ? "bg-linear-success/20 text-linear-success"
                    : "bg-linear-surface text-linear-text-secondary"
                )}>
                  {cycle.number}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-linear-text truncate">
                      {cycle.name || `Cycle ${cycle.number}`}
                    </h3>
                    {cycle.isActive && (
                      <Badge variant="accent" className="text-[10px]">Active</Badge>
                    )}
                    {cycle.isCompleted && (
                      <Badge variant="success" className="text-[10px]">Completed</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-linear-text-secondary">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(cycle.startDate).toLocaleDateString()} - {new Date(cycle.endDate).toLocaleDateString()}
                    </span>
                    <span>•</span>
                    <span>{cycle.stats?.totalIssues || 0} issues</span>
                    {cycle.stats?.completionPercentage > 0 && (
                      <>
                        <span>•</span>
                        <span className={cn(
                          cycle.stats.completionPercentage === 100 
                            ? "text-linear-success" 
                            : "text-linear-text-secondary"
                        )}>
                          {cycle.stats.completionPercentage}% complete
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Stats preview */}
                <div className="hidden sm:flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-linear-success" />
                    <span className="text-linear-text-secondary">{cycle.stats?.completedIssues || 0}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CircleDot className="w-4 h-4 text-priority-high" />
                    <span className="text-linear-text-secondary">{cycle.stats?.inProgressIssues || 0}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-linear-text-tertiary" />
                    <span className="text-linear-text-secondary">{cycle.stats?.backlogIssues || 0}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {!cycle.isActive && !cycle.isCompleted && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startCycleMutation.mutate(cycle.id)}
                      disabled={startCycleMutation.isPending}
                    >
                      <Play className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Link to={`/${workspace}/cycles/${cycle.id}`}>
                    <Button size="sm" variant="ghost">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </motion.div>
            ))}

            {(!cycles || cycles.length === 0) && (
              <div className="text-center py-12 bg-linear-elevated rounded-lg border border-linear-border">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-linear-surface flex items-center justify-center">
                  <RotateCcw className="w-6 h-6 text-linear-text-tertiary" />
                </div>
                <h3 className="text-base font-medium text-linear-text mb-1">No cycles yet</h3>
                <p className="text-sm text-linear-text-secondary mb-4">
                  Create your first cycle to start planning sprints
                </p>
                <Button size="sm" onClick={() => setShowCreateModal(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Create cycle
                </Button>
              </div>
            )}
          </div>
        )}
      </FadeIn>

      {/* Create Modal */}
      <CreateCycleModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={(data) => createCycleMutation.mutate(data)}
      />
    </div>
  );
}
