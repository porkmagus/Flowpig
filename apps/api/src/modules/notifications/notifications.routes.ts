import type { FastifyInstance } from 'fastify';
import { requireAuth, type AuthenticatedRequest } from '../../plugins/auth.js';
import { broadcastNotificationCreated } from '../../plugins/websocket.js';

type NotificationType =
  | 'ISSUE_ASSIGNED'
  | 'ISSUE_UPDATED'
  | 'ISSUE_COMMENTED'
  | 'ISSUE_COMPLETED'
  | 'NOTE_SHARED'
  | 'NOTE_COMMENTED'
  | 'CYCLE_STARTED'
  | 'CYCLE_ENDING'
  | 'MENTION'
  | 'WORKSPACE_INVITE'
  | 'BILLING';

// Notification service
export async function createNotification(
  fastify: FastifyInstance,
  {
    userId,
    type,
    title,
    content,
    workspaceId,
    issueId,
    noteId,
    actorId,
    metadata,
  }: {
    userId: string;
    type: NotificationType;
    title: string;
    content: string;
    workspaceId?: string;
    issueId?: string;
    noteId?: string;
    actorId?: string;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  const notification = await fastify.prisma.notification.create({
    data: {
      userId,
      type,
      title,
      content,
      workspaceId,
      issueId,
      noteId,
      actorId,
      metadata: metadata || {},
      isRead: false,
    },
  });

  // Broadcast via WebSocket
  await broadcastNotificationCreated(fastify, userId, notification.id, {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    content: notification.content,
    workspaceId: notification.workspaceId,
    issueId: notification.issueId,
    noteId: notification.noteId,
    actorId: notification.actorId,
    metadata: notification.metadata,
    createdAt: notification.createdAt.toISOString(),
    isRead: notification.isRead,
  });
}

// Notify issue subscribers
export async function notifyIssueSubscribers(
  fastify: FastifyInstance,
  {
    issueId,
    excludeUserId,
    type,
    title,
    content,
    workspaceId,
    actorId,
    metadata,
  }: {
    issueId: string;
    excludeUserId?: string;
    type: NotificationType;
    title: string;
    content: string;
    workspaceId: string;
    actorId: string;
    metadata?: Record<string, any>;
  }
) {
  const subscriptions = await fastify.prisma.issueSubscription.findMany({
    where: {
      issueId,
      userId: excludeUserId ? { not: excludeUserId } : undefined,
    },
    select: { userId: true },
  });

  for (const sub of subscriptions) {
    await createNotification(fastify, {
      userId: sub.userId,
      type,
      title,
      content,
      workspaceId,
      issueId,
      actorId,
      metadata,
    });
  }
}

// Notify workspace members
export async function notifyWorkspaceMembers(
  fastify: FastifyInstance,
  {
    workspaceId,
    excludeUserId,
    type,
    title,
    content,
    actorId,
    metadata,
  }: {
    workspaceId: string;
    excludeUserId?: string;
    type: NotificationType;
    title: string;
    content: string;
    actorId: string;
    metadata?: Record<string, any>;
  }
) {
  const members = await fastify.prisma.workspaceMember.findMany({
    where: {
      workspaceId,
      userId: excludeUserId ? { not: excludeUserId } : undefined,
      deletedAt: null,
    },
    select: { userId: true },
  });

  for (const member of members) {
    await createNotification(fastify, {
      userId: member.userId,
      type,
      title,
      content,
      workspaceId,
      actorId,
      metadata,
    });
  }
}

export default async function notificationRoutes(fastify: FastifyInstance) {
  // Get user's notifications
  fastify.get('/', {
    preHandler: [requireAuth],
  }, async (request: AuthenticatedRequest, reply) => {
    const userId = request.user!.id;
    const { unreadOnly = 'false', page = '1', limit = '50' } = 
      request.query as { unreadOnly?: string; page?: string; limit?: string };

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      userId,
      deletedAt: null,
    };

    if (unreadOnly === 'true') {
      where.isRead = false;
    }

    const [notifications, total] = await Promise.all([
      fastify.prisma.notification.findMany({
        where,
        include: {
          workspace: {
            select: { id: true, name: true, slug: true },
          },
          issue: {
            select: { id: true, identifier: true, title: true },
          },
          note: {
            select: { id: true, title: true, slug: true },
          },
          actor: {
            select: { id: true, name: true, image: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      fastify.prisma.notification.count({ where }),
    ]);

    return {
      notifications: notifications.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        content: n.content,
        workspace: n.workspace,
        issue: n.issue,
        note: n.note,
        actor: n.actor,
        metadata: n.metadata,
        isRead: n.isRead,
        readAt: n.readAt?.toISOString() || null,
        createdAt: n.createdAt.toISOString(),
      })),
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        hasMore: skip + notifications.length < total,
      },
    };
  });

  // Get unread count
  fastify.get('/unread-count', {
    preHandler: [requireAuth],
  }, async (request: AuthenticatedRequest, reply) => {
    const userId = request.user!.id;

    const count = await fastify.prisma.notification.count({
      where: {
        userId,
        isRead: false,
        deletedAt: null,
      },
    });

    return { count };
  });

  // Mark as read
  fastify.post('/:notificationId/read', {
    preHandler: [requireAuth],
  }, async (request: AuthenticatedRequest, reply) => {
    const userId = request.user!.id;
    const { notificationId } = request.params as { notificationId: string };

    const notification = await fastify.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      return reply.status(404).send({ error: 'Notification not found' });
    }

    await fastify.prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { success: true };
  });

  // Mark all as read
  fastify.post('/read-all', {
    preHandler: [requireAuth],
  }, async (request: AuthenticatedRequest, reply) => {
    const userId = request.user!.id;

    await fastify.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
        deletedAt: null,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { success: true };
  });

  // Archive notification (soft delete)
  fastify.delete('/:notificationId', {
    preHandler: [requireAuth],
  }, async (request: AuthenticatedRequest, reply) => {
    const userId = request.user!.id;
    const { notificationId } = request.params as { notificationId: string };

    const notification = await fastify.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      return reply.status(404).send({ error: 'Notification not found' });
    }

    await fastify.prisma.notification.update({
      where: { id: notificationId },
      data: {
        deletedAt: new Date(),
      },
    });

    return { success: true };
  });

  // Get notifications grouped by date (for Inbox view)
  fastify.get('/inbox', {
    preHandler: [requireAuth],
  }, async (request: AuthenticatedRequest, reply) => {
    const userId = request.user!.id;
    const { filter = 'all', page = '1', limit = '50' } = 
      request.query as { filter?: 'all' | 'unread' | 'archive'; page?: string; limit?: string };

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      userId,
    };

    if (filter === 'unread') {
      where.isRead = false;
      where.deletedAt = null;
    } else if (filter === 'archive') {
      where.deletedAt = { not: null };
    } else {
      where.deletedAt = null;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      fastify.prisma.notification.findMany({
        where,
        include: {
          workspace: {
            select: { id: true, name: true, slug: true },
          },
          issue: {
            select: { id: true, identifier: true, title: true, state: true },
          },
          note: {
            select: { id: true, title: true, slug: true },
          },
          actor: {
            select: { id: true, name: true, image: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      fastify.prisma.notification.count({ where }),
      fastify.prisma.notification.count({
        where: { userId, isRead: false, deletedAt: null },
      }),
    ]);

    // Group notifications by date
    const groups: Record<string, typeof notifications> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(thisWeekStart.getDate() - today.getDay());
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    for (const notification of notifications) {
      const date = new Date(notification.createdAt);
      date.setHours(0, 0, 0, 0);

      let groupKey: string;
      if (date.getTime() === today.getTime()) {
        groupKey = 'Today';
      } else if (date.getTime() === yesterday.getTime()) {
        groupKey = 'Yesterday';
      } else if (date >= thisWeekStart) {
        groupKey = 'This week';
      } else if (date >= lastWeekStart) {
        groupKey = 'Last week';
      } else {
        groupKey = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(notification);
    }

    const formattedGroups = Object.entries(groups).map(([title, items]) => ({
      title,
      count: items.length,
      notifications: items.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        content: n.content,
        workspace: n.workspace,
        issue: n.issue,
        note: n.note,
        actor: n.actor,
        metadata: n.metadata,
        isRead: n.isRead,
        readAt: n.readAt?.toISOString() || null,
        createdAt: n.createdAt.toISOString(),
        canArchive: filter !== 'archive',
      })),
    }));

    return {
      groups: formattedGroups,
      stats: {
        total,
        unread: unreadCount,
        archived: filter === 'archive' ? total : undefined,
      },
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        hasMore: skip + notifications.length < total,
      },
    };
  });
}
