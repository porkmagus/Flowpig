import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, X } from 'lucide-react';
import { API_URL } from '~/lib/api';
import { useWorkspaceRealtime } from '~/lib/ws';

interface Notification {
  id: string;
  title: string;
  content: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  issue?: { id: string; identifier?: string };
  note?: { slug: string };
  workspace?: { slug: string };
}

export function NotificationBadge() {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const { data: countData } = useQuery({
    queryKey: ['notifications', 'count'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/notifications/unread-count`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch count');
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/notifications?limit=20`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch notifications');
      return response.json();
    },
    enabled: isOpen,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`${API_URL}/notifications/${notificationId}/read`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to mark as read');
      return response.json();
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_URL}/notifications/read-all`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to mark all as read');
      return response.json();
    },
  });

  // Listen for real-time notifications
  useWorkspaceRealtime(undefined, {
    onNotificationCreated: () => {
      // Refetch notifications when a new one arrives
      setUnreadCount(prev => prev + 1);
    },
  });

  useEffect(() => {
    if (countData) {
      setUnreadCount(countData.count);
    }
  }, [countData]);

  const notifications: Notification[] = notificationsData?.notifications || [];

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ISSUE_ASSIGNED':
        return '📋';
      case 'ISSUE_COMMENTED':
        return '💬';
      case 'ISSUE_UPDATED':
        return '📝';
      case 'MENTION':
        return '@️';
      case 'WORKSPACE_INVITE':
        return '🤝';
      default:
        return '🔔';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllAsReadMutation.mutate()}
                    className="text-sm text-primary-500 hover:text-primary-600"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p>No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`
                        p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer
                        ${!notification.isRead ? 'bg-blue-50/50' : ''}
                      `}
                      onClick={() => {
                        if (!notification.isRead) {
                          markAsReadMutation.mutate(notification.id);
                        }
                        // Navigate to relevant item
                        if (notification.issue) {
                          window.location.href = `/${notification.workspace?.slug}/issues/${notification.issue.id}`;
                        } else if (notification.note) {
                          window.location.href = `/${notification.workspace?.slug}/notes/${notification.note.slug}`;
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.content}
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(notification.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        
                        {!notification.isRead && (
                          <span className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-2" />
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
