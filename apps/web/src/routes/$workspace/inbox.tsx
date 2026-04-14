import { useParams, Link } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '~/lib/api';
import { AnimatedCard } from '~/components/ui/motion';
import { 
  Inbox,
  Bell,
  Check,
  Archive,
  Trash2,
  ExternalLink,
  Filter,
  ChevronDown,
  MoreHorizontal,
  MessageSquare,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  FileText,
  RotateCcw,
  Folder,
  X
} from 'lucide-react';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

type NotificationFilter = 'all' | 'unread' | 'archive';

interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  workspace: {
    id: string;
    name: string;
    slug: string;
  } | null;
  issue: {
    id: string;
    identifier: string;
    title: string;
    state: string;
  } | null;
  note: {
    id: string;
    title: string;
    slug: string;
  } | null;
  actor: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  metadata: Record<string, any>;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  canArchive: boolean;
}

interface NotificationGroup {
  title: string;
  count: number;
  notifications: Notification[];
}

interface InboxData {
  groups: NotificationGroup[];
  stats: {
    total: number;
    unread: number;
    archived?: number;
  };
  meta: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

const notificationColors: Record<string, string> = {
  ISSUE_ASSIGNED: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
  ISSUE_UPDATED: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  ISSUE_COMMENTED: 'bg-violet-500/10 text-violet-300 border-violet-500/20',
  ISSUE_COMPLETED: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  NOTE_SHARED: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
  NOTE_COMMENTED: 'bg-violet-500/10 text-violet-300 border-violet-500/20',
  CYCLE_STARTED: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
  CYCLE_ENDING: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  MENTION: 'bg-red-500/10 text-red-300 border-red-500/20',
  WORKSPACE_INVITE: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  BILLING: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
};

function getNotificationIcon(type: string) {
  switch (type) {
    case 'ISSUE_ASSIGNED':
      return <UserPlus className="w-4 h-4 text-sky-400" />;
    case 'ISSUE_UPDATED':
      return <AlertCircle className="w-4 h-4 text-amber-400" />;
    case 'ISSUE_COMMENTED':
      return <MessageSquare className="w-4 h-4 text-violet-400" />;
    case 'ISSUE_COMPLETED':
      return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    case 'NOTE_SHARED':
      return <FileText className="w-4 h-4 text-sky-400" />;
    case 'NOTE_COMMENTED':
      return <MessageSquare className="w-4 h-4 text-violet-400" />;
    case 'CYCLE_STARTED':
      return <RotateCcw className="w-4 h-4 text-sky-400" />;
    case 'CYCLE_ENDING':
      return <AlertCircle className="w-4 h-4 text-amber-400" />;
    case 'MENTION':
      return <Bell className="w-4 h-4 text-red-400" />;
    case 'WORKSPACE_INVITE':
      return <UserPlus className="w-4 h-4 text-emerald-400" />;
    case 'BILLING':
      return <Folder className="w-4 h-4 text-amber-400" />;
    default:
      return <Bell className="w-4 h-4 text-linear-text-secondary" />;
  }
}

function NotificationItem({ 
  notification, 
  workspace, 
  onMarkRead, 
  onArchive,
  isHovered,
  onHover
}: { 
  notification: Notification;
  workspace: string;
  onMarkRead: (id: string) => void;
  onArchive: (id: string) => void;
  isHovered: boolean;
  onHover: (id: string | null) => void;
}) {
  const getLink = () => {
    if (notification.issue) {
      return `/${workspace}/issues/${notification.issue.id}`;
    }
    if (notification.note) {
      return `/${workspace}/notes/${notification.note.slug}`;
    }
    return `/${workspace}`;
  };

  const icon = getNotificationIcon(notification.type);
  const colorClass = notificationColors[notification.type] || 'bg-linear-elevated/50 text-linear-text-secondary border-linear-border';

  return (
    <div
      className={`group relative flex gap-4 px-4 py-4 hover:bg-linear-elevated transition-colors border-b border-linear-border last:border-b-0 ${
        !notification.isRead ? 'bg-linear-accent/5' : ''
      }`}
      onMouseEnter={() => onHover(notification.id)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Unread indicator */}
      {!notification.isRead && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 rounded-r-full bg-linear-accent" />
      )}

      {/* Icon */}
      <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${colorClass.split(' ')[0]}`}>
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <Link 
            to={getLink()} 
            className="flex-1 min-w-0"
            onClick={() => !notification.isRead && onMarkRead(notification.id)}
          >
            <p className={`text-sm ${!notification.isRead ? 'font-semibold text-linear-text' : 'text-linear-text-secondary'}`}>
              {notification.title}
            </p>
            <p className="text-sm text-linear-text-secondary mt-0.5 line-clamp-2">
              {notification.content}
            </p>
            
            {/* Issue/Note reference */}
            {(notification.issue || notification.note) && (
              <div className="flex items-center gap-2 mt-2">
                {notification.issue && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-linear-elevated text-linear-text-secondary text-xs rounded">
                    {notification.issue.identifier}
                    <ExternalLink className="w-3 h-3" />
                  </span>
                )}
                {notification.note && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-linear-elevated text-linear-text-secondary text-xs rounded">
                    {notification.note.title}
                    <ExternalLink className="w-3 h-3" />
                  </span>
                )}
              </div>
            )}
          </Link>

          {/* Time and actions */}
          <div className="shrink-0 flex flex-col items-end gap-2">
            <span className="text-xs text-linear-text-tertiary">
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
            </span>
            
            {/* Quick actions - visible on hover */}
            {isHovered && (
              <div className="flex items-center gap-1">
                {!notification.isRead && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkRead(notification.id);
                    }}
                    className="p-1.5 hover:bg-linear-accent/15 rounded text-linear-accent"
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                {notification.canArchive && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onArchive(notification.id);
                    }}
                    className="p-1.5 hover:bg-linear-elevated rounded text-linear-text-secondary"
                    title="Archive"
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actor info */}
        {notification.actor && (
          <div className="flex items-center gap-2 mt-2">
            <div className="w-5 h-5 rounded-full bg-linear-elevated flex items-center justify-center text-xs text-linear-text-secondary">
              {notification.actor.name?.[0] || notification.actor.image || '?'}
            </div>
            <span className="text-xs text-linear-text-secondary">{notification.actor.name || 'Unknown'}</span>
            {notification.workspace && (
              <>
                <span className="text-linear-border">•</span>
                <span className="text-xs text-linear-text-secondary">{notification.workspace.name}</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationGroupSection({ 
  group, 
  workspace, 
  onMarkRead, 
  onArchive,
  hoveredId,
  onHover
}: { 
  group: NotificationGroup;
  workspace: string;
  onMarkRead: (id: string) => void;
  onArchive: (id: string) => void;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
}) {
  return (
    <AnimatedCard className="bg-linear-surface rounded-xl border border-linear-border overflow-hidden mb-4">
      {/* Group header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-linear-elevated/50 border-b border-linear-border">
        <span className="font-semibold text-sm text-linear-text">
          {group.title}
        </span>
        <span className="px-2 py-0.5 bg-linear-elevated text-linear-text-secondary text-xs rounded-full font-medium border border-linear-border">
          {group.count}
        </span>
      </div>

      {/* Notifications list */}
      <div className="divide-y divide-linear-border">
        {group.notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            workspace={workspace}
            onMarkRead={onMarkRead}
            onArchive={onArchive}
            isHovered={hoveredId === notification.id}
            onHover={onHover}
          />
        ))}
      </div>
    </AnimatedCard>
  );
}

export default function InboxPage() {
  const { workspace } = useParams();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['inbox', filter],
    queryFn: async (): Promise<InboxData> => {
      const response = await fetch(
        `${API_URL}/notifications/inbox?filter=${filter}`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to load inbox');
      return response.json();
    },
  });

  // Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(
        `${API_URL}/notifications/${notificationId}/read`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );
      if (!response.ok) throw new Error('Failed to mark as read');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'count'] });
    },
  });

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `${API_URL}/notifications/read-all`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );
      if (!response.ok) throw new Error('Failed to mark all as read');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'count'] });
    },
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(
        `${API_URL}/notifications/${notificationId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      if (!response.ok) throw new Error('Failed to archive');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'count'] });
    },
  });

  const handleMarkRead = (id: string) => markReadMutation.mutate(id);
  const handleMarkAllRead = () => markAllReadMutation.mutate();
  const handleArchive = (id: string) => archiveMutation.mutate(id);

  const filterOptions: { value: NotificationFilter; label: string }[] = [
    { value: 'all', label: 'All notifications' },
    { value: 'unread', label: 'Unread only' },
    { value: 'archive', label: 'Archived' },
  ];

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-linear-accent/30 border-t-linear-accent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-linear-text flex items-center gap-3">
            <Inbox className="w-8 h-8 text-linear-accent" />
            Inbox
          </h1>
          <p className="mt-2 text-linear-text-secondary">
            Stay updated with your workspace activity
          </p>
        </div>

        {/* Stats pills */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-linear-accent/10 text-linear-accent rounded-full text-sm font-medium border border-linear-accent/20">
            {data?.stats.unread || 0} unread
          </div>
          <div className="px-3 py-1.5 bg-linear-elevated text-linear-text-secondary rounded-full text-sm font-medium border border-linear-border">
            {data?.stats.total || 0} total
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {/* Filter dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="flex items-center gap-2 px-3 py-2 bg-linear-surface border border-linear-border rounded-lg text-sm text-linear-text-secondary hover:bg-linear-elevated transition-colors"
            >
              <Filter className="w-4 h-4 text-linear-text-tertiary" />
              <span>{filterOptions.find(o => o.value === filter)?.label}</span>
              <ChevronDown className="w-4 h-4 text-linear-text-tertiary" />
            </button>

            {showFilterDropdown && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-linear-elevated border border-linear-border rounded-lg shadow-lg shadow-black/20 z-10 py-1">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setFilter(option.value);
                      setShowFilterDropdown(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-linear-surface ${
                      filter === option.value ? 'bg-linear-accent/10 text-linear-accent' : 'text-linear-text-secondary'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {filter !== 'archive' && data?.stats.unread && data.stats.unread > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markAllReadMutation.isPending}
              className="flex items-center gap-2 px-3 py-2 text-sm text-linear-accent hover:bg-linear-accent/10 rounded-lg transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {/* Notification groups */}
      <div className="space-y-4">
        {data?.groups.map((group) => (
          <NotificationGroupSection
            key={group.title}
            group={group}
            workspace={workspace!}
            onMarkRead={handleMarkRead}
            onArchive={handleArchive}
            hoveredId={hoveredId}
            onHover={setHoveredId}
          />
        ))}
      </div>

      {/* Empty state */}
      {data?.groups.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-linear-elevated flex items-center justify-center border border-linear-border">
            {filter === 'archive' ? (
              <Archive className="w-8 h-8 text-linear-text-tertiary" />
            ) : filter === 'unread' ? (
              <Check className="w-8 h-8 text-linear-text-tertiary" />
            ) : (
              <Inbox className="w-8 h-8 text-linear-text-tertiary" />
            )}
          </div>
          <h3 className="text-lg font-medium text-linear-text mb-1">
            {filter === 'archive' 
              ? 'No archived notifications'
              : filter === 'unread'
              ? 'No unread notifications'
              : 'Your inbox is empty'
            }
          </h3>
          <p className="text-linear-text-secondary">
            {filter === 'archive'
              ? 'Notifications you archive will appear here'
              : filter === 'unread'
              ? 'All caught up! No unread notifications.'
              : 'Notifications from your workspace will appear here'
            }
          </p>
        </div>
      )}
    </div>
  );
}
