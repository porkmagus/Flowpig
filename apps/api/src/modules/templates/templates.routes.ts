import type { FastifyInstance } from 'fastify';
import { requireAuth, type AuthenticatedRequest } from '../../plugins/auth.js';
import { extractWorkspace, type WorkspaceRequest } from '../../middleware/workspace.js';

export default async function templateRoutes(fastify: FastifyInstance) {
  fastify.get('/', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { type } = request.query as { type?: string };
    const workspaceId = request.workspace!.id;

    const templates = await fastify.prisma.template.findMany({
      where: { workspaceId, type: type as any, deletedAt: null },
      include: { createdBy: { select: { id: true, name: true, image: true } } },
      orderBy: { usageCount: 'desc' },
    });

    return {
      templates: templates.map((t) => ({
        id: t.id, name: t.name, description: t.description, type: t.type,
        icon: t.icon, color: t.color, content: t.content,
        isDefault: t.isDefault, isPublic: t.isPublic, usageCount: t.usageCount,
        createdBy: t.createdBy, createdAt: t.createdAt.toISOString(),
      })),
    };
  });

  fastify.post('/', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const userId = (request as any).user!.id;
    const workspaceId = request.workspace!.id;
    const { name, description, type, icon, color, content } = request.body as any;

    const template = await fastify.prisma.template.create({
      data: { workspaceId, name, description, type, icon, color, content, createdById: userId },
    });

    return reply.status(201).send({
      template: { id: template.id, name: template.name, description: template.description, type: template.type, icon: template.icon, color: template.color, content: template.content, createdAt: template.createdAt.toISOString() },
    });
  });

  fastify.delete('/:templateId', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { templateId } = request.params as { templateId: string };
    await fastify.prisma.template.update({ where: { id: templateId }, data: { deletedAt: new Date() } });
    return { success: true };
  });
}
