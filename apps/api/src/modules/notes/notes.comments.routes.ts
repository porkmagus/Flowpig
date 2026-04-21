import type { FastifyInstance } from 'fastify';
import { requireAuth, type AuthenticatedRequest } from '../../plugins/auth.js';
import { extractWorkspace, type WorkspaceRequest } from '../../middleware/workspace.js';

export default async function noteCommentRoutes(fastify: FastifyInstance) {
  // Get comments for a note
  fastify.get('/notes/:noteId/comments', { 
    preHandler: [requireAuth, extractWorkspace] 
  }, async (request: WorkspaceRequest, reply) => {
    const { noteId } = request.params as { noteId: string };

    const note = await fastify.prisma.note.findFirst({
      where: {
        OR: [
          { id: noteId },
          { slug: noteId, workspaceId: request.workspace!.id },
        ],
        workspaceId: request.workspace!.id,
        deletedAt: null,
      },
    });

    if (!note) {
      return reply.status(404).send({ error: 'Note not found' });
    }

    const comments = await fastify.prisma.comment.findMany({
      where: {
        noteId: note.id,
        workspaceId: request.workspace!.id,
        deletedAt: null,
        parentId: null,
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

  // Add comment to note
  fastify.post('/notes/:noteId/comments', { 
    preHandler: [requireAuth, extractWorkspace] 
  }, async (request: WorkspaceRequest, reply) => {
    const { noteId } = request.params as { noteId: string };
    const userId = request.user!.id;
    const { content, parentId, blockId } = request.body as { 
      content: string; 
      parentId?: string;
      blockId?: string;
    };

    if (!content || content.trim().length === 0) {
      return reply.status(400).send({ error: 'Comment content is required' });
    }

    const note = await fastify.prisma.note.findFirst({
      where: {
        OR: [
          { id: noteId },
          { slug: noteId, workspaceId: request.workspace!.id },
        ],
        workspaceId: request.workspace!.id,
        deletedAt: null,
      },
    });

    if (!note) {
      return reply.status(404).send({ error: 'Note not found' });
    }

    const comment = await fastify.prisma.comment.create({
      data: {
        content: content.trim(),
        noteId: note.id,
        workspaceId: request.workspace!.id,
        createdById: userId,
        parentId: parentId || null,
        blockId: blockId || null,
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
}
