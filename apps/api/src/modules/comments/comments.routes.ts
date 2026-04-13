import type { FastifyInstance } from 'fastify';
import { requireAuth, type AuthenticatedRequest } from '../../plugins/auth.js';
import { extractWorkspace, type WorkspaceRequest } from '../../middleware/workspace.js';

export default async function commentRoutes(fastify: FastifyInstance) {
  // Get comments for an issue
  fastify.get('/issues/:issueId/comments', { 
    preHandler: [requireAuth, extractWorkspace] 
  }, async (request: WorkspaceRequest, reply) => {
    const { issueId } = request.params as { issueId: string };

    const issue = await fastify.prisma.issue.findFirst({
      where: {
        id: issueId,
        workspaceId: request.workspace!.id,
        deletedAt: null,
      },
    });

    if (!issue) {
      return reply.status(404).send({ error: 'Issue not found' });
    }

    const comments = await fastify.prisma.comment.findMany({
      where: {
        issueId,
        workspaceId: request.workspace!.id,
        deletedAt: null,
        parentId: null, // Top-level comments only
      },
      include: {
        creator: {
          select: { id: true, name: true, image: true },
        },
        reactions: {
          where: { deletedAt: null },
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
        replies: {
          where: { deletedAt: null },
          include: {
            creator: {
              select: { id: true, name: true, image: true },
            },
            reactions: {
              where: { deletedAt: null },
              include: {
                user: {
                  select: { id: true, name: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      comments: comments.map(comment => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
        creator: comment.creator,
        reactions: comment.reactions,
        replies: comment.replies.map(reply => ({
          id: reply.id,
          content: reply.content,
          createdAt: reply.createdAt.toISOString(),
          updatedAt: reply.updatedAt.toISOString(),
          creator: reply.creator,
          reactions: reply.reactions,
        })),
      })),
    };
  });

  // Add comment to issue
  fastify.post('/issues/:issueId/comments', { 
    preHandler: [requireAuth, extractWorkspace] 
  }, async (request: WorkspaceRequest, reply) => {
    const { issueId } = request.params as { issueId: string };
    const userId = (request as any).user!.id;
    const { content, parentId } = request.body as { content: string; parentId?: string };

    if (!content || content.trim().length === 0) {
      return reply.status(400).send({ error: 'Comment content is required' });
    }

    const issue = await fastify.prisma.issue.findFirst({
      where: {
        id: issueId,
        workspaceId: request.workspace!.id,
        deletedAt: null,
      },
    });

    if (!issue) {
      return reply.status(404).send({ error: 'Issue not found' });
    }

    const comment = await fastify.prisma.comment.create({
      data: {
        content: content.trim(),
        issueId,
        workspaceId: request.workspace!.id,
        createdById: userId,
        parentId: parentId || null,
      },
      include: {
        creator: {
          select: { id: true, name: true, image: true },
        },
        reactions: {
          where: { deletedAt: null },
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    // Create activity
    await fastify.prisma.activity.create({
      data: {
        workspaceId: request.workspace!.id,
        issueId,
        actorId: userId,
        type: 'COMMENT_ADDED',
        description: `added a comment to ${issue.identifier}`,
      },
    });

    return reply.status(201).send({
      comment: {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
        creator: comment.creator,
        reactions: comment.reactions,
        replies: [],
      },
    });
  });

  // Update comment
  fastify.patch('/comments/:commentId', { 
    preHandler: [requireAuth, extractWorkspace] 
  }, async (request: WorkspaceRequest, reply) => {
    const { commentId } = request.params as { commentId: string };
    const userId = (request as any).user!.id;
    const { content } = request.body as { content: string };

    const comment = await fastify.prisma.comment.findFirst({
      where: {
        id: commentId,
        workspaceId: request.workspace!.id,
        createdById: userId,
        deletedAt: null,
      },
    });

    if (!comment) {
      return reply.status(404).send({ error: 'Comment not found' });
    }

    const updated = await fastify.prisma.comment.update({
      where: { id: commentId },
      data: { content: content.trim() },
      include: {
        creator: {
          select: { id: true, name: true, image: true },
        },
        reactions: {
          where: { deletedAt: null },
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    return {
      comment: {
        id: updated.id,
        content: updated.content,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        creator: updated.creator,
        reactions: updated.reactions,
      },
    };
  });

  // Delete comment
  fastify.delete('/comments/:commentId', { 
    preHandler: [requireAuth, extractWorkspace] 
  }, async (request: WorkspaceRequest, reply) => {
    const { commentId } = request.params as { commentId: string };
    const userId = (request as any).user!.id;

    const comment = await fastify.prisma.comment.findFirst({
      where: {
        id: commentId,
        workspaceId: request.workspace!.id,
        createdById: userId,
        deletedAt: null,
      },
    });

    if (!comment) {
      return reply.status(404).send({ error: 'Comment not found' });
    }

    await fastify.prisma.comment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  });

  // Add reaction to comment
  fastify.post('/comments/:commentId/reactions', { 
    preHandler: [requireAuth, extractWorkspace] 
  }, async (request: WorkspaceRequest, reply) => {
    const { commentId } = request.params as { commentId: string };
    const userId = (request as any).user!.id;
    const { emoji } = request.body as { emoji: string };

    const comment = await fastify.prisma.comment.findFirst({
      where: {
        id: commentId,
        workspaceId: request.workspace!.id,
        deletedAt: null,
      },
    });

    if (!comment) {
      return reply.status(404).send({ error: 'Comment not found' });
    }

    // Upsert reaction
    const reaction = await fastify.prisma.commentReaction.upsert({
      where: {
        commentId_userId_emoji: {
          commentId,
          userId,
          emoji,
        },
      },
      update: { deletedAt: null },
      create: {
        commentId,
        userId,
        emoji,
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });

    return reply.status(201).send({ reaction });
  });

  // Remove reaction
  fastify.delete('/comments/:commentId/reactions', { 
    preHandler: [requireAuth, extractWorkspace] 
  }, async (request: WorkspaceRequest, reply) => {
    const { commentId } = request.params as { commentId: string };
    const userId = (request as any).user!.id;
    const { emoji } = request.query as { emoji: string };

    await fastify.prisma.commentReaction.updateMany({
      where: {
        commentId,
        userId,
        emoji,
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  });
}
