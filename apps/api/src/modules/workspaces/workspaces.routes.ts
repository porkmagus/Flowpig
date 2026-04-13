import type { FastifyInstance } from 'fastify';
import { requireAuth, type AuthenticatedRequest } from '../../plugins/auth.js';
import { extractWorkspace, type WorkspaceRequest } from '../../middleware/workspace.js';
import { CreateWorkspaceSchema, UpdateWorkspaceSchema } from '@flowpigdev/contracts';

export default async function workspaceRoutes(fastify: FastifyInstance) {
  // List all workspaces for current user
  fastify.get('/', { preHandler: [requireAuth] }, async (request: AuthenticatedRequest, reply) => {
    const userId = request.user!.id;

    const memberships = await fastify.prisma.workspaceMember.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      include: {
        workspace: {
          include: {
            _count: {
              select: {
                members: {
                  where: { deletedAt: null },
                },
              },
            },
          },
        },
      },
      orderBy: {
        joinedAt: 'desc',
      },
    });

    const workspaces = memberships.map(m => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      description: m.workspace.description,
      icon: m.workspace.icon,
      color: m.workspace.color,
      ownerId: m.workspace.ownerId,
      plan: m.workspace.plan,
      createdAt: m.workspace.createdAt.toISOString(),
      updatedAt: m.workspace.updatedAt.toISOString(),
      role: m.role,
      memberCount: m.workspace._count.members,
    }));

    return { workspaces };
  });

  // Create new workspace
  fastify.post('/', { preHandler: [requireAuth] }, async (request: AuthenticatedRequest, reply) => {
    const parseResult = CreateWorkspaceSchema.safeParse(request.body);
    
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Invalid input',
        details: parseResult.error.flatten(),
      });
    }

    const { name, slug, description } = parseResult.data;
    const userId = request.user!.id;

    // Check if slug is available
    const existing = await fastify.prisma.workspace.findUnique({
      where: { slug },
    });

    if (existing) {
      return reply.status(409).send({
        error: 'Conflict',
        message: 'A workspace with this slug already exists',
      });
    }

    const workspace = await fastify.prisma.workspace.create({
      data: {
        name,
        slug,
        description,
        ownerId: userId,
        members: {
          create: {
            userId,
            role: 'OWNER',
          },
        },
      },
    });

    return {
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        description: workspace.description,
        icon: workspace.icon,
        color: workspace.color,
        ownerId: workspace.ownerId,
        plan: workspace.plan,
        createdAt: workspace.createdAt.toISOString(),
        updatedAt: workspace.updatedAt.toISOString(),
      },
    };
  });

  // Get workspace by ID
  fastify.get('/:workspaceId', { 
    preHandler: [requireAuth, extractWorkspace] 
  }, async (request: WorkspaceRequest, reply) => {
    const workspace = await fastify.prisma.workspace.findUnique({
      where: { id: request.workspace!.id },
      include: {
        _count: {
          select: {
            members: { where: { deletedAt: null } },
            issues: { where: { deletedAt: null } },
            notes: { where: { deletedAt: null } },
            teams: { where: { deletedAt: null } },
          },
        },
      },
    });

    if (!workspace) {
      return reply.status(404).send({ error: 'Workspace not found' });
    }

    return {
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        description: workspace.description,
        icon: workspace.icon,
        color: workspace.color,
        ownerId: workspace.ownerId,
        plan: workspace.plan,
        settings: workspace.settings,
        createdAt: workspace.createdAt.toISOString(),
        updatedAt: workspace.updatedAt.toISOString(),
        stats: {
          members: workspace._count.members,
          issues: workspace._count.issues,
          notes: workspace._count.notes,
          teams: workspace._count.teams,
        },
      },
    };
  });

  // Update workspace
  fastify.patch('/:workspaceId', { 
    preHandler: [requireAuth, extractWorkspace] 
  }, async (request: WorkspaceRequest, reply) => {
    // Only owner or admin can update
    if (!['OWNER', 'ADMIN'].includes(request.workspace!.role)) {
      return reply.status(403).send({ 
        error: 'Forbidden',
        message: 'You do not have permission to update this workspace' 
      });
    }

    const parseResult = UpdateWorkspaceSchema.safeParse(request.body);
    
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Invalid input',
        details: parseResult.error.flatten(),
      });
    }

    const workspace = await fastify.prisma.workspace.update({
      where: { id: request.workspace!.id },
      data: parseResult.data,
    });

    return {
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        description: workspace.description,
        icon: workspace.icon,
        color: workspace.color,
        ownerId: workspace.ownerId,
        plan: workspace.plan,
        settings: workspace.settings,
        createdAt: workspace.createdAt.toISOString(),
        updatedAt: workspace.updatedAt.toISOString(),
      },
    };
  });

  // List workspace members
  fastify.get('/:workspaceId/members', { 
    preHandler: [requireAuth, extractWorkspace] 
  }, async (request: WorkspaceRequest, reply) => {
    const members = await fastify.prisma.workspaceMember.findMany({
      where: {
        workspaceId: request.workspace!.id,
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'desc',
      },
    });

    return {
      members: members.map(m => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
        user: m.user,
      })),
    };
  });
}
