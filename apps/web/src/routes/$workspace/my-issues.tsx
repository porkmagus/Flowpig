import { useParams, Link } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '~/lib/api';
import { useAuth } from '~/lib/auth-client';
import { CreateIssueModal, useCreateIssueModal } from '~/components/create-issue-modal';
import { 
  StaggerContainer, 
  StaggerItem,
  AnimatedCard,
  FadeIn,
  HoverLift 
} from '~/components/ui/motion';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { SkeletonList, SkeletonCard } from '~/components/ui/skeleton';
import { 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  CircleDot,
  AlertTriangle,
  ArrowRight,
  MoreHorizontal,
  CalendarDays,
  User,
  Check,
  ChevronDown,
  Layers,
  Plus,
  Search
} from 'lucide-react';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import { format } from 'date-fns/format';
import { isToday } from 'date-fns/isToday';
import { isTomorrow } from 'date-fns/isTomorrow';
import { isPast } from 'date-fns/isPast';
import { startOfDay } from 'date-fns/startOfDay';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '~/lib/utils';

interface Issue {
  id: string;
  identifier: string;
  title: string;
  state: string;
  priority: string;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  assignee: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  creator: {
    id: string;
    name: string | null;
    image: string | null;
  };
  team: {
    id: string;
    name: string;
    key: string;
    color: string;
  };
  workflowState: {
    id: string;
    name: string;
    key: string;
    color: string;
    category: string;
  } | null;
  labels: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  cycle: {
    id: string;
    name: string | null;
    number: number;
    isActive: boolean;
  } | null;
  commentCount: number;
}

interface IssueGroup {
  id: string;
  title: string;
  count: number;
  issues: Issue[];
}

interface MyIssuesData {
  groups: IssueGroup[];
  stats: {
    totalAssigned: number;
    overdue: number;
    dueToday: number;
    completedThisWeek: number;
  };
}

const priorityConfig: Record<string, { color: string; icon: React.ElementType }> = {
  URGENT: { color: 'text-priority-urgent', icon: AlertTriangle },
  HIGH: { color: 'text-priority-high', icon: AlertCircle },
  MEDIUM: { color: 'text-priority-medium', icon: CircleDot },
  LOW: { color: 'text-priority-low', icon: ArrowRight },
  NO_PRIORITY: { color: 'text-priority-none', icon: CircleDot },
};

function formatDueDate(dueDate: string | null): { text: string; variant: 'default' | 'warning' | 'urgent' | 'success' } {
  if (!dueDate) return { text: 'No due date', variant: 'default' };
  
  const date = new Date(dueDate);
  const today = startOfDay(new Date());
  
  if (isToday(date)) {
    return { text: 'Today', variant: 'warning' };
  }
  if (isTomorrow(date)) {
    return { text: 'Tomorrow', variant: 'default' };
  }
  if (isPast(date) && date < today) {
    return { text: formatDistanceToNow(date, { addSuffix: true }), variant: 'urgent' };
  }
  
  return { text: format(date, 'MMM d'), variant: 'default' };
}

function IssueRow({ issue, workspace, onStatusChange }: { 
  issue: Issue; 
  workspace: string;
  onStatusChange: (issueId: string, newState: string) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const dueDate = formatDueDate(issue.dueDate);
  const isDone = issue.state === 'DONE' || issue.workflowState?.category === 'DONE';
  const priority = priorityConfig[issue.priority] || priorityConfig.NO_PRIORITY;
  const PriorityIcon = priority.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "group flex items-center gap-3 px-3 py-2.5 transition-colors cursor-pointer",
        isHovered && "bg-linear-surface"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Checkbox for quick status change */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onStatusChange(issue.id, isDone ? 'TODO' : 'DONE');
        }}
        className={cn(
          "shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all duration-150",
          isDone 
            ? 'bg-linear-success border-linear-success text-white' 
            : 'border-linear-border hover:border-linear-accent hover:bg-linear-accent-light'
        )}
      >
        {isDone && <Check className="w-3 h-3" />}
      </button>

      {/* Priority */}
      <div className={cn("shrink-0", priority.color)}>
        <PriorityIcon className="w-4 h-4" />
      </div>

      {/* Team key + identifier */}
      <div className="shrink-0 text-xs font-medium text-linear-text-tertiary w-14">
        {issue.identifier}
      </div>

      {/* Title */}
      <Link
        to={`/${workspace}/issues/${issue.id}`}
        className={cn(
          "flex-1 min-w-0 text-sm transition-colors",
          isDone ? 'text-linear-text-tertiary line-through' : 'text-linear-text hover:text-linear-accent'
        )}
      >
        <span className="truncate block">{issue.title}</span>
      </Link>

      {/* Labels */}
      {issue.labels.length > 0 && (
        <div className="shrink-0 flex gap-1">
          {issue.labels.slice(0, 2).map((label) => (
            <Badge 
              key={label.id} 
              variant="outline" 
              className="text-[10px] px-1.5 py-0 h-4"
              style={{ 
                borderColor: label.color + '40',
                backgroundColor: label.color + '15',
                color: label.color 
              }}
            >
              {label.name}
            </Badge>
          ))}
          {issue.labels.length > 2 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
              +{issue.labels.length - 2}
            </Badge>
          )}
        </div>
      )}

      {/* Due date */}
      <div className="shrink-0">
        <Badge 
          variant={dueDate.variant === 'urgent' ? 'destructive' : dueDate.variant === 'warning' ? 'warning' : 'secondary'}
          className="text-[10px] px-1.5 py-0 h-5 gap-1"
        >
          <CalendarDays className="w-3 h-3" />
          {dueDate.text}
        </Badge>
      </div>

      {/* Cycle */}
      {issue.cycle && (
        <Badge 
          variant={issue.cycle.isActive ? 'success' : 'secondary'}
          className="text-[10px] px-1.5 py-0 h-5"
        >
          {issue.cycle.isActive && '● '}Cycle {issue.cycle.number}
        </Badge>
      )}

      {/* State */}
      <div className="shrink-0">
        {issue.workflowState ? (
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 h-5 font-medium"
            style={{ 
              borderColor: issue.workflowState.color + '40',
              backgroundColor: issue.workflowState.color + '15',
              color: issue.workflowState.color 
            }}
          >
            {issue.workflowState.name}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
            {issue.state}
          </Badge>
        )}
      </div>

      {/* Comments count */}
      {issue.commentCount > 0 && (
        <div className="shrink-0 flex items-center gap-1 text-xs text-linear-text-tertiary">
          <div className="w-4 h-4 rounded-full bg-linear-surface flex items-center justify-center text-[10px] border border-linear-border">
            {issue.commentCount}
          </div>
        </div>
      )}

      {/* More actions (visible on hover) */}
      <AnimatePresence>
        {isHovered && (
          <motion.button 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="shrink-0 p-1 hover:bg-linear-border rounded transition-colors"
          >
            <MoreHorizontal className="w-4 h-4 text-linear-text-secondary" />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function IssueGroupSection({ 
  group, 
  workspace, 
  onStatusChange,
  isExpanded = true 
}: { 
  group: IssueGroup; 
  workspace: string;
  onStatusChange: (issueId: string, newState: string) => void;
  isExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(isExpanded);

  if (group.issues.length === 0) return null;

  const groupIcons: Record<string, { icon: React.ElementType; color: string }> = {
    overdue: { icon: AlertTriangle, color: 'text-priority-urgent' },
    today: { icon: Clock, color: 'text-priority-high' },
    upcoming: { icon: Calendar, color: 'text-linear-accent' },
    noDueDate: { icon: CircleDot, color: 'text-linear-text-tertiary' },
    completed: { icon: CheckCircle2, color: 'text-linear-success' },
  };

  const groupConfig = groupIcons[group.id] || groupIcons.noDueDate;
  const GroupIcon = groupConfig.icon;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-linear-elevated rounded-lg border border-linear-border overflow-hidden mb-3"
    >
      {/* Group header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-linear-surface/50 border-b border-linear-border hover:bg-linear-surface transition-colors"
      >
        <GroupIcon className={cn("w-4 h-4", groupConfig.color)} />
        <span className={cn("font-medium text-sm", groupConfig.color)}>
          {group.title}
        </span>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 ml-1">
          {group.count}
        </Badge>
        <div className="flex-1" />
        <motion.div 
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-linear-text-tertiary" />
        </motion.div>
      </button>

      {/* Issues list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="divide-y divide-linear-border/50"
          >
            {group.issues.map((issue) => (
              <IssueRow
                key={issue.id}
                issue={issue}
                workspace={workspace}
                onStatusChange={onStatusChange}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  color,
  highlight = false 
}: { 
  title: string; 
  value: number; 
  icon: React.ElementType; 
  color: string;
  highlight?: boolean;
}) {
  return (
    <motion.div 
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "p-3 rounded-lg border transition-colors",
        highlight 
          ? "bg-linear-elevated border-linear-accent/30 shadow-elevation-1" 
          : "bg-linear-elevated border-linear-border hover:border-linear-border-hover"
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-linear-text-secondary">{title}</p>
          <p className={cn("text-xl font-semibold mt-0.5", color)}>{value}</p>
        </div>
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", color.replace('text-', 'bg-').replace('600', '100').replace('500', '100'))}>
          <Icon className={cn("w-4 h-4", color)} />
        </div>
      </div>
    </motion.div>
  );
}

export default function MyIssues() {
  const { workspace } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const createIssueModal = useCreateIssueModal();

  const { data, isLoading } = useQuery({
    queryKey: ['my-issues', workspace],
    queryFn: async (): Promise<MyIssuesData> => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/issues/my-issues/grouped`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to load my issues');
      return response.json();
    },
  });

  // Mutation for quick status update
  const statusMutation = useMutation({
    mutationFn: async ({ issueId, state }: { issueId: string; state: string }) => {
      const response = await fetch(
        `${API_URL}/workspaces/${workspace}/issues/${issueId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ state }),
        }
      );
      if (!response.ok) throw new Error('Failed to update issue');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-issues', workspace] });
    },
  });

  const handleStatusChange = (issueId: string, newState: string) => {
    statusMutation.mutate({ issueId, state: newState });
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <SkeletonCard className="mb-4" />
        <SkeletonList count={4} />
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <FadeIn>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-linear-text tracking-tight">My Issues</h1>
            <p className="text-sm text-linear-text-secondary mt-0.5">
              All issues assigned to you
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Search className="w-3.5 h-3.5" />
              Filter
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => createIssueModal.open()}>
              <Plus className="w-3.5 h-3.5" />
              New issue
            </Button>
          </div>
        </div>
      </FadeIn>

      {/* Stats cards */}
      {stats && (
        <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6" staggerDelay={0.05}>
          <StaggerItem>
            <StatCard
              title="Assigned"
              value={stats.totalAssigned}
              icon={User}
              color="text-linear-accent"
            />
          </StaggerItem>
          <StaggerItem>
            <StatCard
              title="Overdue"
              value={stats.overdue}
              icon={AlertTriangle}
              color="text-priority-urgent"
              highlight={stats.overdue > 0}
            />
          </StaggerItem>
          <StaggerItem>
            <StatCard
              title="Due today"
              value={stats.dueToday}
              icon={Clock}
              color="text-priority-high"
              highlight={stats.dueToday > 0}
            />
          </StaggerItem>
          <StaggerItem>
            <StatCard
              title="Completed this week"
              value={stats.completedThisWeek}
              icon={CheckCircle2}
              color="text-linear-success"
            />
          </StaggerItem>
        </StaggerContainer>
      )}

      {/* Issue groups */}
      <div className="space-y-3">
        {data?.groups.map((group) => (
          <IssueGroupSection
            key={group.id}
            group={group}
            workspace={workspace!}
            onStatusChange={handleStatusChange}
            isExpanded={group.id !== 'completed'}
          />
        ))}
      </div>

      {/* Create Issue Modal */}
      <CreateIssueModal
        isOpen={createIssueModal.isOpen}
        onClose={createIssueModal.close}
      />

      {/* Empty state */}
      {data?.groups.every((g) => g.issues.length === 0) && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-16"
        >
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-linear-surface flex items-center justify-center border border-linear-border">
            <CheckCircle2 className="w-6 h-6 text-linear-text-tertiary" />
          </div>
          <h3 className="text-base font-medium text-linear-text mb-1">All caught up!</h3>
          <p className="text-sm text-linear-text-secondary">You have no assigned issues in this workspace.</p>
        </motion.div>
      )}
    </div>
  );
}
