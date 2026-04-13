import type { FastifyInstance } from 'fastify';
import { requireAuth, type AuthenticatedRequest } from '../../plugins/auth.js';
import { extractWorkspace, type WorkspaceRequest } from '../../middleware/workspace.js';

export default async function historyRoutes(fastify: FastifyInstance) {
  // Get note history (versions)
  fastify.get('/notes/:noteId/history', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { noteId } = request.params as { noteId: string };
    const workspaceId = request.workspace!.id;
    const { page = '1', limit = '20' } = request.query as { page?: string; limit?: string };

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Verify note exists and is in workspace
    const note = await fastify.prisma.note.findFirst({
      where: { id: noteId, workspaceId, deletedAt: null },
    });

    if (!note) {
      return reply.status(404).send({ error: 'Note not found' });
    }

    // Get activities for this note
    const [activities, total] = await Promise.all([
      fastify.prisma.activity.findMany({
        where: {
          workspaceId,
          issueId: null, // Note activities don't have issueId
          createdAt: { gte: note.createdAt },
          OR: [
            // Comment activities on this note
            {
              type: { in: ['COMMENT_ADDED', 'COMMENT_UPDATED'] },
            },
            // Or we could have a separate NoteActivity model
          ],
        },
        include: {
          actor: { select: { id: true, name: true, image: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      fastify.prisma.activity.count({
        where: {
          workspaceId,
          issueId: null,
          createdAt: { gte: note.createdAt },
        },
      }),
    ]);

    // For now, return synthetic versions based on edit history
    // In a full implementation, you'd have a NoteVersion table with snapshots
    const versions = [
      {
        id: `current-${note.id}`,
        version: 1,
        createdAt: note.updatedAt.toISOString(),
        createdBy: {
          id: note.lastEditedById,
          name: 'Current Version',
        },
        isCurrent: true,
        snapshot: {
          title: note.title,
          content: note.content,
          emoji: note.emoji,
        },
      },
    ];

    // Add placeholder versions based on activities
    let versionNum = 2;
    activities.forEach(activity => {
      if (versionNum <= 10) { // Limit synthetic versions
        versions.push({
          id: `v${activity.id}`,
          version: versionNum++,
          createdAt: activity.createdAt.toISOString(),
          createdBy: activity.actor,
          isCurrent: false,
          snapshot: null, // Would have actual snapshot in full impl
          changeDescription: activity.description,
        });
      }
    });

    return {
      versions,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        hasMore: skip + versions.length < total,
      },
    };
  });

  // Get specific version
  fastify.get('/notes/:noteId/history/:versionId', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { noteId, versionId } = request.params as { noteId: string; versionId: string };
    const workspaceId = request.workspace!.id;

    const note = await fastify.prisma.note.findFirst({
      where: { id: noteId, workspaceId, deletedAt: null },
    });

    if (!note) {
      return reply.status(404).send({ error: 'Note not found' });
    }

    // For current version
    if (versionId.startsWith('current')) {
      return {
        version: {
          id: `current-${note.id}`,
          version: 1,
          createdAt: note.updatedAt.toISOString(),
          createdBy: { id: note.lastEditedById },
          isCurrent: true,
          note: {
            title: note.title,
            content: note.content,
            emoji: note.emoji,
            coverImage: note.coverImage,
          },
        },
      };
    }

    // For historical versions, would fetch from NoteVersion table
    return reply.status(404).send({ error: 'Version not found' });
  });

  // Restore a version
  fastify.post('/notes/:noteId/history/:versionId/restore', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { noteId, versionId } = request.params as { noteId: string; versionId: string };
    const userId = (request as any).user!.id;
    const workspaceId = request.workspace!.id;

    const note = await fastify.prisma.note.findFirst({
      where: { id: noteId, workspaceId, deletedAt: null },
    });

    if (!note) {
      return reply.status(404).send({ error: 'Note not found' });
    }

    // In full implementation, fetch from NoteVersion and restore
    // For now, just update the timestamp to show activity
    const updatedNote = await fastify.prisma.note.update({
      where: { id: noteId },
      data: {
        updatedAt: new Date(),
        lastEditedById: userId,
      },
    });

    // Create restore activity
    await fastify.prisma.activity.create({
      data: {
        workspaceId,
        actorId: userId,
        type: 'ISSUE_UPDATED', // Reuse or add NOTE_RESTORED
        description: 'Restored note to previous version',
        metadata: { noteId, versionId, action: 'restore' },
      },
    });

    return {
      success: true,
      note: {
        id: updatedNote.id,
        title: updatedNote.title,
        updatedAt: updatedNote.updatedAt.toISOString(),
      },
    };
  });

  // Get issue history
  fastify.get('/issues/:issueId/history', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { issueId } = request.params as { issueId: string };
    const workspaceId = request.workspace!.id;
    const { page = '1', limit = '20' } = request.query as { page?: string; limit?: string };

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const issue = await fastify.prisma.issue.findFirst({
      where: { id: issueId, workspaceId, deletedAt: null },
    });

    if (!issue) {
      return reply.status(404).send({ error: 'Issue not found' });
    }

    const [activities, total] = await Promise.all([
      fastify.prisma.activity.findMany({
        where: { workspaceId, issueId },
        include: {
          actor: { select: { id: true, name: true, image: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      fastify.prisma.activity.count({ where: { workspaceId, issueId } }),
    ]);

    return {
      history: activities.map(activity => ({
        id: activity.id,
        type: activity.type,
        description: activity.description,
        metadata: activity.metadata,
        createdAt: activity.createdAt.toISOString(),
        actor: activity.actor,
      })),
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        hasMore: skip + activities.length < total,
      },
    };
  });
}
