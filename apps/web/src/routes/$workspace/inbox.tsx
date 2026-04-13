import { useParams, Link, useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL } from '~/lib/api';
import { AnimatedList, AnimatedItem, AnimatedCard } from '@flowpigdev/ui';
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
import { useState, useEffect } from 'react';
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

const notificationIcons: Record<string, React.ReactNode> = {
  ISSUE_ASSIGNED: <UserPlus className="w-4 h-4 text-blue-500" />,
  ISSUE_UPDATED: <AlertCircle className="w-4 h-4 text-orange-500" />,
  ISSUE_COMMENTED: <MessageSquare className="w-4 h-4 text-purple-500" />,
  ISSUE_COMPLETED: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  NOTE_SHARED: <FileText className="w-4 h-4 text-blue-500" />,
  NOTE_COMMENTED: <MessageSquare className="w-4 h-4 text-purple-500" />,
  CYCLE_STARTED: <RotateCcw className="w-4 h-4 text-blue-500" />,
  CYCLE_ENDING: <AlertCircle className="w-4 h-4 text-orange-500" />,
  MENTION: <Bell className="w-4 h-4 text-red-500" />,
  WORKSPACE_INVITE: <UserPlus className="w-4 h-4 text-green-500" />,
  BILLING: <Folder className="w-4 h-4 text-yellow-500" />,
};

const notificationColors: Record<string, string> = {
  ISSUE_ASSIGNED: 'bg-blue-50 text-blue-700 border-blue-200',
  ISSUE_UPDATED: 'bg-orange-50 text-orange-700 border-orange-200',
  ISSUE_COMMENTED: 'bg-purple-50 text-purple-700 border-purple-200',
  ISSUE_COMPLETED: 'bg-green-50 text-green-700 border-green-200',
  NOTE_SHARED: 'bg-blue-50 text-blue-700 border-blue-200',
  NOTE_COMMENTED: 'bg-purple-50 text-purple-700 border-purple-200',
  CYCLE_STARTED: 'bg-blue-50 text-blue-700 border-blue-200',
  CYCLE_ENDING: 'bg-orange-50 text-orange-700 border-orange-200',
  MENTION: 'bg-red-50 text-red-700 border-red-200',
  WORKSPACE_INVITE: 'bg-green-50 text-green-700 border-green-200',
  BILLING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
};

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

  const icon = notificationIcons[notification.type] || <Bell className="w-4 h-4 text-gray-500" />;
  const colorClass = notificationColors[notification.type] || 'bg-gray-50 text-gray-700 border-gray-200';

  return (
    <div
      className={`group relative flex gap-4 px-4 py-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
        !notification.isRead ? 'bg-blue-50/30' : ''
      }`}
      onMouseEnter={() => onHover(notification.id)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Unread indicator */}
      {!notification.isRead && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />
      )}

      {/* Icon */}
      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${colorClass.split(' ')[0]}`}>
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
            <p className={`text-sm ${!notification.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
              {notification.title}
            </p>
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
              {notification.content}
            </p>
            
            {/* Issue/Note reference */}
            {(notification.issue || notification.note) && (
              <div className="flex items-center gap-2 mt-2">
                {notification.issue && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                    {notification.issue.identifier}
                    <ExternalLink className="w-3 h-3" />
                  </span>
                )}
                {notification.note && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                    {notification.note.title}
                    <ExternalLink className="w-3 h-3" />
                  </span>
                )}
              </div>
            )}
          </Link>

          {/* Time and actions */}
          <div className="flex-shrink-0 flex flex-col items-end gap-2">
            <span className="text-xs text-gray-400">
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
                    className="p-1.5 hover:bg-blue-100 rounded text-blue-600"
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
                    className="p-1.5 hover:bg-gray-200 rounded text-gray-500"
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
            <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs">
              {notification.actor.name?.[0] || notification.actor.image || '?'}
            </div>
            <span className="text-xs text-gray-500">{notification.actor.name || 'Unknown'}</span>
            {notification.workspace && (
              <>
                <span className="text-gray-300">•</span>
                <span className="text-xs text-gray-500">{notification.workspace.name}</span>
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
    <AnimatedCard className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
      {/* Group header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50/50 border-b border-gray-100">
        <span className="font-semibold text-sm text-gray-700">
          {group.title}
        </span>
        <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full font-medium">
          {group.count}
        </span>
      </div>

      {/* Notifications list */}
      <div className="divide-y divide-gray-100">
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
  const navigate = useNavigate();
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
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Inbox className="w-8 h-8 text-primary-500" />
            Inbox
          </h1>
          <p className="mt-2 text-gray-600">
            Stay updated with your workspace activity
          </p>
        </div>

        {/* Stats pills */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
            {data?.stats.unread || 0} unread
          </div>
          <div className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
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
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-4 h-4 text-gray-500" />
              <span>{filterOptions.find(o => o.value === filter)?.label}</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {showFilterDropdown && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setFilter(option.value);
                      setShowFilterDropdown(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                      filter === option.value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
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
              className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
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
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            {filter === 'archive' ? (
              <Archive className="w-8 h-8 text-gray-400" />
            ) : filter === 'unread' ? (
              <Check className="w-8 h-8 text-gray-400" />
            ) : (
              <Inbox className="w-8 h-8 text-gray-400" />
            )}
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            {filter === 'archive' 
              ? 'No archived notifications'
              : filter === 'unread'
              ? 'No unread notifications'
              : 'Your inbox is empty'
            }
          </h3>
          <p className="text-gray-500">
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
