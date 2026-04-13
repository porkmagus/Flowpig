import type { FastifyInstance } from 'fastify';
import { requireAuth, type AuthenticatedRequest } from '../../plugins/auth.js';
import { extractWorkspace, type WorkspaceRequest } from '../../middleware/workspace.js';
import { broadcastNotificationCreated } from '../../plugins/websocket.js';

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
    type: string;
    title: string;
    content: string;
    workspaceId?: string;
    issueId?: string;
    noteId?: string;
    actorId?: string;
    metadata?: Record<string, any>;
  }
) {
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
  });

  // Broadcast via WebSocket
  broadcastNotificationCreated(fastify, userId, notification.id, {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    content: notification.content,
    workspace: notification.workspace,
    issue: notification.issue,
    note: notification.note,
    actor: notification.actor,
    createdAt: notification.createdAt.toISOString(),
    isRead: notification.isRead,
  });

  return notification;
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
    type: string;
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
    type: string;
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
}
