import type { FastifyInstance } from 'fastify';
import { requireAuth, type AuthenticatedRequest } from '../../plugins/auth.js';
import { extractWorkspace, type WorkspaceRequest } from '../../middleware/workspace.js';

type JsonFieldInput = JsonValueInput | null;
type JsonValueInput = string | number | boolean | JsonFieldInput[] | { [key: string]: JsonFieldInput };

function buildSnapshot(note: {
  title: string;
  content: unknown;
  emoji: string | null;
  coverImage?: string | null;
}) {
  return {
    title: note.title,
    content: note.content,
    emoji: note.emoji,
    coverImage: note.coverImage ?? null,
  };
}

function toJsonFieldInput(value: unknown): JsonFieldInput {
  if (value === null) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => toJsonFieldInput(entry));
  }
  if (typeof value === 'object') {
    const record: { [key: string]: JsonFieldInput } = {};
    for (const [key, entry] of Object.entries(value)) {
      record[key] = toJsonFieldInput(entry);
    }
    return record;
  }

  return {};
}

function toJsonInput(value: unknown): JsonValueInput {
  const normalized = toJsonFieldInput(value);
  return normalized === null ? { type: 'doc', content: [] } : normalized;
}

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
      include: {
        creator: { select: { id: true, name: true } },
        lastEditor: { select: { id: true, name: true } },
      },
    });

    if (!note) {
      return reply.status(404).send({ error: 'Note not found' });
    }

    const [storedVersions, totalStoredVersions] = await Promise.all([
      fastify.prisma.noteVersion.findMany({
        where: { noteId: note.id },
        include: {
          editedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      fastify.prisma.noteVersion.count({ where: { noteId: note.id } }),
    ]);

    const versions = [
      {
        id: `current-${note.id}`,
        version: 1,
        createdAt: note.updatedAt.toISOString(),
        createdBy: {
          id: note.lastEditor.id,
          name: note.lastEditor.name || note.creator.name || 'Current version',
        },
        isCurrent: true,
        snapshot: buildSnapshot(note),
      },
      ...storedVersions.map((version, index) => ({
        id: version.id,
        version: index + 2,
        createdAt: version.createdAt.toISOString(),
        createdBy: {
          id: version.editedBy.id,
          name: version.editedBy.name || 'Unknown editor',
        },
        isCurrent: false,
        snapshot: buildSnapshot(version),
        changeDescription: version.editReason || 'Saved note version',
      })),
    ];

    return {
      versions,
      meta: {
        page: pageNum,
        limit: limitNum,
        total: totalStoredVersions + 1,
        hasMore: skip + storedVersions.length < totalStoredVersions,
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
      include: {
        creator: { select: { id: true, name: true } },
        lastEditor: { select: { id: true, name: true } },
      },
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
          createdBy: {
            id: note.lastEditor.id,
            name: note.lastEditor.name || note.creator.name || null,
          },
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

    let updateData: {
      updatedAt?: Date;
      lastEditedById: string;
      title?: string;
      content?: JsonValueInput;
      emoji?: string | null;
      coverImage?: string | null;
    } = {
      lastEditedById: userId,
    };

    if (!versionId.startsWith('current')) {
      const version = await fastify.prisma.noteVersion.findFirst({
        where: { id: versionId, noteId: note.id },
      });

      if (!version) {
        return reply.status(404).send({ error: 'Version not found' });
      }

      updateData = {
        ...updateData,
        title: version.title,
        content: toJsonInput(version.content),
        emoji: version.emoji,
        coverImage: version.coverImage,
      };
    } else {
      updateData.updatedAt = new Date();
    }

    const updatedNote = await fastify.prisma.note.update({
      where: { id: noteId },
      data: updateData,
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
