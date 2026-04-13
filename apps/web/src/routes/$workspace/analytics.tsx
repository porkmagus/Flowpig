import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { API_URL } from '~/lib/api';
import { 
  TrendingUp, 
  TrendingDown,
  Activity,
  CheckCircle2,
  Clock,
  Users,
  Target,
  Zap,
  Calendar,
  ArrowRight,
  BarChart3,
  GitBranch,
  Flame,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { format } from 'date-fns';
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
  PieChart,
  Pie,
  Cell
} from 'recharts';

// Keep existing interfaces
interface OverviewStats {
  totalIssues: number;
  openIssues: number;
  completedIssues30d: number;
  avgCycleTimeDays: number;
  activeCycles: number;
  totalTeams: number;
  completionRate: number;
}

interface VelocityData {
  data: Array<{
    date: string;
    count: number;
    points: number;
  }>;
  average: {
    issuesPerWeek: number;
    pointsPerWeek: number;
  };
  trend: number;
}

interface BurndownData {
  cycle: {
    id: string;
    name: string | null;
    number: number;
    startDate: string;
    endDate: string;
    isActive: boolean;
  };
  summary: {
    totalIssues: number;
    totalPoints: number;
    completedIssues: number;
    completedPoints: number;
    completionRate: number;
    daysRemaining: number;
  };
  burndown: Array<{
    date: string;
    totalRemaining: number;
    pointsRemaining: number;
    idealRemaining: number;
    idealPoints: number;
  }>;
}

const stateColors: Record<string, string> = {
  BACKLOG: '#6E6E6E',
  TODO: '#8E8E8E',
  IN_PROGRESS: '#F2A50C',
  IN_REVIEW: '#5E6AD2',
  DONE: '#0D9B6A',
  CANCELED: '#D13B3B',
};

const priorityColors: Record<string, string> = {
  NO_PRIORITY: '#E6E6E6',
  LOW: '#8E8E8E',
  MEDIUM: '#6E6E6E',
  HIGH: '#F2A50C',
  URGENT: '#D13B3B',
};

function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  trendLabel,
  color = 'blue'
}: { 
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: number;
  trendLabel?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'accent';
}) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-500',
    green: 'bg-green-500/10 text-green-500',
    purple: 'bg-purple-500/10 text-purple-500',
    orange: 'bg-orange-500/10 text-orange-500',
    accent: 'bg-linear-accent-light text-linear-accent',
  };

  return (
    <Card className="hover:shadow-elevation-2 transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-linear-text-secondary uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-semibold text-linear-text mt-1">{value}</p>
            {subtitle && <p className="text-xs text-linear-text-tertiary mt-0.5">{subtitle}</p>}
            
            {trend !== undefined && (
              <div className={cn(
                "flex items-center gap-1 mt-2 text-xs",
                trend >= 0 ? 'text-linear-success' : 'text-priority-urgent'
              )}>
                {trend >= 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5" />
                )}
                <span>{Math.abs(trend)}%</span>
                {trendLabel && <span className="text-linear-text-tertiary">{trendLabel}</span>}
              </div>
            )}
          </div>
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", colorClasses[color])}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const { workspace } = useParams();
  const [timeRange, setTimeRange] = useState<'7' | '30' | '90'>('30');

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['analytics-overview', workspace],
    queryFn: async (): Promise<OverviewStats> => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/analytics/overview`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to load overview');
      return response.json();
    },
  });

  const { data: velocity } = useQuery({
    queryKey: ['analytics-velocity', workspace],
    queryFn: async (): Promise<VelocityData> => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/analytics/velocity?weeks=12`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to load velocity');
      return response.json();
    },
  });

  const { data: burndown } = useQuery({
    queryKey: ['analytics-burndown', workspace],
    queryFn: async (): Promise<BurndownData> => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/analytics/burndown`,
        { credentials: 'include' }
      );
      if (!response.ok) return null as any;
      return response.json();
    },
  });

  if (overviewLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-linear-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-linear-text tracking-tight flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-linear-accent" />
              Analytics
            </h1>
            <p className="text-sm text-linear-text-secondary mt-0.5">
              Insights into your team's performance
            </p>
          </div>
          
          {/* Time range selector */}
          <div className="flex items-center gap-1 bg-linear-surface p-1 rounded-lg border border-linear-border">
            {(['7', '30', '90'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                  timeRange === range
                    ? 'bg-linear-elevated text-linear-text shadow-elevation-1'
                    : 'text-linear-text-secondary hover:text-linear-text'
                )}
              >
                {range}d
              </button>
            ))}
          </div>
        </div>
      </FadeIn>

      {/* Overview stats */}
      <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" staggerDelay={0.05}>
        <StaggerItem>
          <StatCard
            title="Total Issues"
            value={overview?.totalIssues || 0}
            subtitle={`${overview?.openIssues || 0} open`}
            icon={Activity}
            color="blue"
          />
        </StaggerItem>

        <StaggerItem>
          <StatCard
            title="Completed"
            value={overview?.completedIssues30d || 0}
            subtitle={`${overview?.completionRate || 0}% completion rate`}
            icon={CheckCircle2}
            trend={velocity?.trend}
            trendLabel="vs last week"
            color="green"
          />
        </StaggerItem>

        <StaggerItem>
          <StatCard
            title="Avg Cycle Time"
            value={`${overview?.avgCycleTimeDays || 0}d`}
            subtitle="From creation to done"
            icon={Clock}
            color="purple"
          />
        </StaggerItem>

        <StaggerItem>
          <StatCard
            title="Velocity"
            value={velocity?.average.issuesPerWeek || 0}
            subtitle="Issues per week"
            icon={Zap}
            color="accent"
          />
        </StaggerItem>
      </StaggerContainer>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Velocity Chart */}
        <FadeIn delay={0.2}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Velocity</CardTitle>
              <p className="text-xs text-linear-text-secondary">
                {velocity?.average.issuesPerWeek} issues/week avg
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={velocity?.data || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--linear-border)" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => format(new Date(date), 'MMM d')}
                      stroke="var(--linear-text-tertiary)"
                      fontSize={10}
                    />
                    <YAxis stroke="var(--linear-text-tertiary)" fontSize={10} />
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--linear-text)', 
                        border: 'none', 
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                      labelFormatter={(date) => format(new Date(date), 'MMM d, yyyy')}
                    />
                    <Bar dataKey="count" fill="#5E6AD2" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        {/* Burndown Chart */}
        <FadeIn delay={0.25}>
          {burndown ? (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      Cycle {burndown.cycle.number} Burndown
                    </CardTitle>
                    <p className="text-xs text-linear-text-secondary">
                      {burndown.summary.completedIssues}/{burndown.summary.totalIssues} completed
                    </p>
                  </div>
                  <Badge variant={burndown.summary.completionRate >= 80 ? 'success' : 'warning'}>
                    {burndown.summary.completionRate}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={burndown.burndown}>
                      <defs>
                        <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#5E6AD2" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#5E6AD2" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--linear-border)" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(date) => format(new Date(date), 'MMM d')}
                        stroke="var(--linear-text-tertiary)"
                        fontSize={10}
                      />
                      <YAxis stroke="var(--linear-text-tertiary)" fontSize={10} />
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: 'var(--linear-text)', 
                          border: 'none', 
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="idealRemaining" 
                        stroke="#8E8E8E" 
                        strokeDasharray="5 5"
                        fill="none"
                        name="Ideal"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="totalRemaining" 
                        stroke="#5E6AD2" 
                        fill="url(#colorActual)"
                        name="Actual"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="flex flex-col items-center justify-center h-full min-h-[280px]">
              <div className="w-12 h-12 rounded-full bg-linear-surface flex items-center justify-center mb-3">
                <Calendar className="w-6 h-6 text-linear-text-tertiary" />
              </div>
              <h3 className="text-sm font-medium text-linear-text">No Active Cycle</h3>
              <p className="text-xs text-linear-text-secondary mt-1">
                Start a cycle to see burndown charts
              </p>
              <Link to={`/${workspace}/cycles`}>
                <Button size="sm" className="mt-4">
                  View cycles
                </Button>
              </Link>
            </Card>
          )}
        </FadeIn>
      </div>

      {/* Issue Distribution */}
      <FadeIn delay={0.3}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Issue Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(stateColors).map(([state, color]) => (
                <div key={state} className="flex items-center gap-2 p-2 rounded-lg bg-linear-surface">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <div>
                    <p className="text-xs text-linear-text-secondary capitalize">
                      {state.toLowerCase().replace('_', ' ')}
                    </p>
                    <p className="text-sm font-medium text-linear-text">
                      {/* Would show actual count from API */}
                      --
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
