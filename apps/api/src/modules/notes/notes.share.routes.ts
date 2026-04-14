import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../plugins/auth.js';
import { extractWorkspace, type WorkspaceRequest } from '../../middleware/workspace.js';
import { getPrimaryAppUrl } from '../../lib/env.js';
import crypto from 'crypto';

function generateShareToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

export default async function shareRoutes(fastify: FastifyInstance) {
  const appUrl = getPrimaryAppUrl();

  // Get sharing settings for a note
  fastify.get('/:noteId/sharing', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { noteId } = request.params as { noteId: string };
    const userId = (request as any).user!.id;
    const workspaceId = request.workspace!.id;

    const note = await fastify.prisma.note.findFirst({
      where: {
        OR: [
          { id: noteId },
          { slug: noteId },
        ],
        workspaceId,
        deletedAt: null,
      },
      include: {
        shares: {
          where: { deletedAt: null },
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
            invitedBy: {
              select: { id: true, name: true },
            },
          },
        },
        creator: {
          select: { id: true, name: true },
        },
      },
    });

    if (!note) {
      return reply.status(404).send({ error: 'Note not found' });
    }

    // Check if user has permission to view sharing settings
    const canView = note.createdById === userId || 
      await fastify.prisma.workspaceMember.findFirst({
        where: { workspaceId, userId, role: { in: ['OWNER', 'ADMIN'] } },
      });

    if (!canView) {
      return reply.status(403).send({ error: 'Not authorized to view sharing settings' });
    }

    const publicUrl = note.shareToken
      ? `${appUrl}/share/${note.shareToken}`
      : null;

    return {
      note: {
        id: note.id,
        title: note.title,
        slug: note.slug,
        publicAccess: note.publicAccess,
        shareToken: note.shareToken,
        publicUrl,
      },
      shares: note.shares.map(share => ({
        id: share.id,
        permission: share.permission,
        email: share.email,
        user: share.user,
        invitedBy: share.invitedBy,
        createdAt: share.createdAt.toISOString(),
        acceptedAt: share.acceptedAt?.toISOString(),
      })),
    };
  });

  // Update public access level
  fastify.patch('/:noteId/sharing/public', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { noteId } = request.params as { noteId: string };
    const { publicAccess } = request.body as { publicAccess: 'PRIVATE' | 'READONLY' | 'COMMENT' | 'EDIT' };
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

    // Only creator or admin can change public access
    const canModify = note.createdById === userId ||
      await fastify.prisma.workspaceMember.findFirst({
        where: { workspaceId, userId, role: { in: ['OWNER', 'ADMIN'] } },
      });

    if (!canModify) {
      return reply.status(403).send({ error: 'Not authorized to modify sharing settings' });
    }

    // Generate share token if needed
    let shareToken = note.shareToken;
    if (publicAccess !== 'PRIVATE' && !shareToken) {
      shareToken = generateShareToken();
    }

    const updatedNote = await fastify.prisma.note.update({
      where: { id: note.id },
      data: {
        publicAccess,
        shareToken,
      },
    });

    const publicUrl = shareToken
      ? `${appUrl}/share/${shareToken}`
      : null;

    return {
      success: true,
      publicAccess: updatedNote.publicAccess,
      publicUrl,
    };
  });

  // Share with specific user
  fastify.post('/:noteId/sharing/invite', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { noteId } = request.params as { noteId: string };
    const { email, userId: targetUserId, permission = 'VIEW' } = request.body as {
      email?: string;
      userId?: string;
      permission?: 'VIEW' | 'COMMENT' | 'EDIT';
    };
    const userId = (request as any).user!.id;
    const workspaceId = request.workspace!.id;

    if (!email && !targetUserId) {
      return reply.status(400).send({ error: 'Email or userId required' });
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

    // Check if user has permission to share
    const canShare = note.createdById === userId ||
      await fastify.prisma.workspaceMember.findFirst({
        where: { workspaceId, userId, role: { in: ['OWNER', 'ADMIN'] } },
      });

    if (!canShare) {
      return reply.status(403).send({ error: 'Not authorized to share this note' });
    }

    // Check if already shared
    const existingShare = await fastify.prisma.noteShare.findFirst({
      where: {
        noteId: note.id,
        OR: [
          ...(targetUserId ? [{ userId: targetUserId }] : []),
          ...(email ? [{ email }] : []),
        ],
        deletedAt: null,
      },
    });

    if (existingShare) {
      return reply.status(400).send({ error: 'Already shared with this user' });
    }

    const share = await fastify.prisma.noteShare.create({
      data: {
        noteId: note.id,
        userId: targetUserId || null,
        email: email || null,
        permission,
        invitedById: userId,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    return {
      success: true,
      share: {
        id: share.id,
        permission: share.permission,
        email: share.email,
        user: share.user,
        createdAt: share.createdAt.toISOString(),
      },
    };
  });

  // Remove share
  fastify.delete('/:noteId/sharing/:shareId', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { noteId, shareId } = request.params as { noteId: string; shareId: string };
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

    // Only creator or admin can remove shares
    const canRemove = note.createdById === userId ||
      await fastify.prisma.workspaceMember.findFirst({
        where: { workspaceId, userId, role: { in: ['OWNER', 'ADMIN'] } },
      });

    if (!canRemove) {
      return reply.status(403).send({ error: 'Not authorized to remove shares' });
    }

    await fastify.prisma.noteShare.update({
      where: { id: shareId },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  });
}
