import type { FastifyInstance } from 'fastify';
import { requireAuth, type AuthenticatedRequest } from '../../plugins/auth.js';
import { extractWorkspace, type WorkspaceRequest } from '../../middleware/workspace.js';

type JsonFieldInput = JsonValueInput | null;
type JsonValueInput = string | number | boolean | JsonFieldInput[] | { [key: string]: JsonFieldInput };

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

export default async function noteVersionRoutes(fastify: FastifyInstance) {
  // Get version history for a note
  fastify.get('/:noteId/versions', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { noteId } = request.params as { noteId: string };
    const { limit = '20', page = '1' } = request.query as { limit?: string; page?: string };
    const workspaceId = request.workspace!.id;

    const note = await fastify.prisma.note.findFirst({
      where: {
        OR: [{ id: noteId }, { slug: noteId }],
        workspaceId,
        deletedAt: null,
      },
    });

    if (!note) {
      return reply.status(404).send({ error: 'Note not found' });
    }

    const limitNum = parseInt(limit, 10);
    const pageNum = parseInt(page, 10);
    const skip = (pageNum - 1) * limitNum;

    const [versions, total] = await Promise.all([
      fastify.prisma.noteVersion.findMany({
        where: { noteId: note.id },
        include: {
          editedBy: {
            select: { id: true, name: true, image: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      fastify.prisma.noteVersion.count({
        where: { noteId: note.id },
      }),
    ]);

    return {
      versions: versions.map(v => ({
        id: v.id,
        title: v.title,
        emoji: v.emoji,
        coverImage: v.coverImage,
        editReason: v.editReason,
        editedBy: v.editedBy,
        createdAt: v.createdAt.toISOString(),
      })),
      current: {
        id: 'current',
        title: note.title,
        emoji: note.emoji,
        coverImage: note.coverImage,
        createdAt: note.updatedAt.toISOString(),
      },
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        hasMore: skip + versions.length < total,
      },
    };
  });

  // Get specific version
  fastify.get('/:noteId/versions/:versionId', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { noteId, versionId } = request.params as { noteId: string; versionId: string };
    const workspaceId = request.workspace!.id;

    const note = await fastify.prisma.note.findFirst({
      where: {
        OR: [{ id: noteId }, { slug: noteId }],
        workspaceId,
        deletedAt: null,
      },
    });

    if (!note) {
      return reply.status(404).send({ error: 'Note not found' });
    }

    let version;

    if (versionId === 'current') {
      version = {
        id: 'current',
        noteId: note.id,
        title: note.title,
        content: note.content,
        emoji: note.emoji,
        coverImage: note.coverImage,
        editReason: null,
        editedBy: null,
        createdAt: note.updatedAt,
      };
    } else {
      version = await fastify.prisma.noteVersion.findFirst({
        where: {
          id: versionId,
          noteId: note.id,
        },
        include: {
          editedBy: {
            select: { id: true, name: true, image: true },
          },
        },
      });
    }

    if (!version) {
      return reply.status(404).send({ error: 'Version not found' });
    }

    return {
      version: {
        id: version.id,
        title: version.title,
        content: version.content,
        emoji: version.emoji,
        coverImage: version.coverImage,
        editReason: version.editReason,
        editedBy: version.editedBy,
        createdAt: version.createdAt.toISOString(),
      },
    };
  });

  // Compare two versions
  fastify.get('/:noteId/versions/compare', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { noteId } = request.params as { noteId: string };
    const { from, to } = request.query as { from: string; to: string };
    const workspaceId = request.workspace!.id;

    if (!from || !to) {
      return reply.status(400).send({ error: 'Both from and to version IDs are required' });
    }

    const note = await fastify.prisma.note.findFirst({
      where: {
        OR: [{ id: noteId }, { slug: noteId }],
        workspaceId,
        deletedAt: null,
      },
    });

    if (!note) {
      return reply.status(404).send({ error: 'Note not found' });
    }

    // Get "from" version
    let fromVersion;
    if (from === 'current') {
      fromVersion = {
        id: 'current',
        title: note.title,
        content: note.content,
        createdAt: note.updatedAt,
      };
    } else {
      fromVersion = await fastify.prisma.noteVersion.findFirst({
        where: { id: from, noteId: note.id },
      });
    }

    // Get "to" version
    let toVersion;
    if (to === 'current') {
      toVersion = {
        id: 'current',
        title: note.title,
        content: note.content,
        createdAt: note.updatedAt,
      };
    } else {
      toVersion = await fastify.prisma.noteVersion.findFirst({
        where: { id: to, noteId: note.id },
      });
    }

    if (!fromVersion || !toVersion) {
      return reply.status(404).send({ error: 'One or both versions not found' });
    }

    // Calculate diff
    const diff = calculateDiff(fromVersion.content, toVersion.content);

    return {
      from: {
        id: from,
        title: fromVersion.title,
        createdAt: fromVersion.createdAt.toISOString(),
      },
      to: {
        id: to,
        title: toVersion.title,
        createdAt: toVersion.createdAt.toISOString(),
      },
      diff,
    };
  });

  // Restore to a version
  fastify.post('/:noteId/versions/:versionId/restore', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { noteId, versionId } = request.params as { noteId: string; versionId: string };
    const userId = (request as any).user!.id;
    const workspaceId = request.workspace!.id;

    const note = await fastify.prisma.note.findFirst({
      where: {
        OR: [{ id: noteId }, { slug: noteId }],
        workspaceId,
        deletedAt: null,
      },
    });

    if (!note) {
      return reply.status(404).send({ error: 'Note not found' });
    }

    // Get the version to restore
    let version;
    if (versionId === 'current') {
      return reply.status(400).send({ error: 'Cannot restore to current version' });
    } else {
      version = await fastify.prisma.noteVersion.findFirst({
        where: { id: versionId, noteId: note.id },
      });
    }

    if (!version) {
      return reply.status(404).send({ error: 'Version not found' });
    }

    // Create a version of the current state before restoring
    await fastify.prisma.noteVersion.create({
      data: {
        noteId: note.id,
        title: note.title,
        content: toJsonInput(note.content),
        emoji: note.emoji,
        coverImage: note.coverImage,
        editedById: userId,
        editReason: 'Auto-saved before restore',
      },
    });

    // Restore to the version
    const updatedNote = await fastify.prisma.note.update({
      where: { id: note.id },
      data: {
        title: version.title,
        content: toJsonInput(version.content),
        emoji: version.emoji,
        coverImage: version.coverImage,
        lastEditedById: userId,
      },
    });

    // Create a new version entry for the restore
    await fastify.prisma.noteVersion.create({
      data: {
        noteId: note.id,
        title: version.title,
        content: toJsonInput(version.content),
        emoji: version.emoji,
        coverImage: version.coverImage,
        editedById: userId,
        editReason: `Restored to version from ${version.createdAt.toLocaleString()}`,
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
}

// Simple diff calculation for JSON content
function calculateDiff(fromContent: any, toContent: any): {
  blocksAdded: number;
  blocksRemoved: number;
  blocksModified: number;
  changes: Array<{
    type: 'added' | 'removed' | 'modified';
    blockIndex?: number;
    fromValue?: any;
    toValue?: any;
  }>;
} {
  const changes: Array<{
    type: 'added' | 'removed' | 'modified';
    blockIndex?: number;
    fromValue?: any;
    toValue?: any;
  }> = [];

  const fromBlocks = fromContent?.content || [];
  const toBlocks = toContent?.content || [];

  let blocksAdded = 0;
  let blocksRemoved = 0;
  let blocksModified = 0;

  // Simple block count comparison
  const maxLength = Math.max(fromBlocks.length, toBlocks.length);
  
  for (let i = 0; i < maxLength; i++) {
    const fromBlock = fromBlocks[i];
    const toBlock = toBlocks[i];

    if (!fromBlock && toBlock) {
      blocksAdded++;
      changes.push({ type: 'added', blockIndex: i, toValue: toBlock });
    } else if (fromBlock && !toBlock) {
      blocksRemoved++;
      changes.push({ type: 'removed', blockIndex: i, fromValue: fromBlock });
    } else if (fromBlock && toBlock) {
      // Check if content differs
      const fromText = JSON.stringify(fromBlock);
      const toText = JSON.stringify(toBlock);
      
      if (fromText !== toText) {
        blocksModified++;
        changes.push({
          type: 'modified',
          blockIndex: i,
          fromValue: fromBlock,
          toValue: toBlock,
        });
      }
    }
  }

  return {
    blocksAdded,
    blocksRemoved,
    blocksModified,
    changes,
  };
}
