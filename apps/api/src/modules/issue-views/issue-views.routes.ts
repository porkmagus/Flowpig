import type { FastifyInstance } from 'fastify';
import { requireAuth, type AuthenticatedRequest } from '../../plugins/auth.js';
import { extractWorkspace, type WorkspaceRequest } from '../../middleware/workspace.js';

type AuthWorkspaceRequest = AuthenticatedRequest & WorkspaceRequest;

export default async function issueViewRoutes(fastify: FastifyInstance) {
  // List views
  fastify.get('/', { preHandler: [requireAuth, extractWorkspace] }, async (request: AuthWorkspaceRequest, reply) => {
    const workspaceId = request.workspace!.id;
    const userId = request.user!.id;

    const views = await fastify.prisma.issueView.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        OR: [
          { createdById: userId },
          { isDefault: true },
        ],
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return {
      views: views.map((v) => ({
        id: v.id,
        name: v.name,
        filters: v.filters,
        sort: v.sort,
        isDefault: v.isDefault,
        createdById: v.createdById,
        createdAt: v.createdAt.toISOString(),
        updatedAt: v.updatedAt.toISOString(),
      })),
    };
  });

  // Create view
  fastify.post('/', { preHandler: [requireAuth, extractWorkspace] }, async (request: AuthWorkspaceRequest, reply) => {
    const workspaceId = request.workspace!.id;
    const userId = request.user!.id;
    const { name, filters, sort, isDefault } = request.body as {
      name: string;
      filters?: Record<string, any>;
      sort?: Record<string, any>;
      isDefault?: boolean;
    };

    if (!name || name.trim().length === 0) {
      return reply.status(400).send({ error: 'Name is required' });
    }

    // If setting as default, unset other defaults for this user
    if (isDefault) {
      await fastify.prisma.issueView.updateMany({
        where: { workspaceId, createdById: userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const view = await fastify.prisma.issueView.create({
      data: {
        workspaceId,
        createdById: userId,
        name: name.trim(),
        filters: filters || {},
        sort: sort || {},
        isDefault: isDefault || false,
      },
    });

    return {
      view: {
        id: view.id,
        name: view.name,
        filters: view.filters,
        sort: view.sort,
        isDefault: view.isDefault,
        createdById: view.createdById,
        createdAt: view.createdAt.toISOString(),
        updatedAt: view.updatedAt.toISOString(),
      },
    };
  });

  // Update view
  fastify.patch('/:viewId', { preHandler: [requireAuth, extractWorkspace] }, async (request: AuthWorkspaceRequest, reply) => {
    const workspaceId = request.workspace!.id;
    const userId = request.user!.id;
    const { viewId } = request.params as { viewId: string };
    const { name, filters, sort, isDefault } = request.body as {
      name?: string;
      filters?: Record<string, any>;
      sort?: Record<string, any>;
      isDefault?: boolean;
    };

    const existing = await fastify.prisma.issueView.findFirst({
      where: { id: viewId, workspaceId, deletedAt: null },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'View not found' });
    }

    // Only creator or workspace owner can edit
    const member = await fastify.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId },
    });
    if (existing.createdById !== userId && member?.role !== 'OWNER') {
      return reply.status(403).send({ error: 'Not authorized to edit this view' });
    }

    if (isDefault) {
      await fastify.prisma.issueView.updateMany({
        where: { workspaceId, createdById: userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const view = await fastify.prisma.issueView.update({
      where: { id: viewId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(filters !== undefined && { filters }),
        ...(sort !== undefined && { sort }),
        ...(isDefault !== undefined && { isDefault }),
      },
    });

    return {
      view: {
        id: view.id,
        name: view.name,
        filters: view.filters,
        sort: view.sort,
        isDefault: view.isDefault,
        createdById: view.createdById,
        createdAt: view.createdAt.toISOString(),
        updatedAt: view.updatedAt.toISOString(),
      },
    };
  });

  // Delete view (soft)
  fastify.delete('/:viewId', { preHandler: [requireAuth, extractWorkspace] }, async (request: AuthWorkspaceRequest, reply) => {
    const workspaceId = request.workspace!.id;
    const userId = request.user!.id;
    const { viewId } = request.params as { viewId: string };

    const existing = await fastify.prisma.issueView.findFirst({
      where: { id: viewId, workspaceId, deletedAt: null },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'View not found' });
    }

    const member = await fastify.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId },
    });
    if (existing.createdById !== userId && member?.role !== 'OWNER') {
      return reply.status(403).send({ error: 'Not authorized to delete this view' });
    }

    await fastify.prisma.issueView.update({
      where: { id: viewId },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  });
}
