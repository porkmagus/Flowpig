import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { requireAuth, type AuthenticatedRequest } from '../../plugins/auth.js';
import { extractWorkspace, type WorkspaceRequest } from '../../middleware/workspace.js';
import { getPrimaryAppUrl } from '../../lib/env.js';
import { CreateWorkspaceSchema, UpdateWorkspaceSchema } from '@flowpigdev/contracts';

function mergeJsonSettings(
  currentValue: Record<string, unknown>,
  incomingValue: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...currentValue };

  for (const [key, value] of Object.entries(incomingValue)) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      merged[key] &&
      typeof merged[key] === 'object' &&
      !Array.isArray(merged[key])
    ) {
      merged[key] = mergeJsonSettings(
        merged[key] as Record<string, unknown>,
        value as Record<string, unknown>,
      );
      continue;
    }

    merged[key] = value;
  }

  return merged;
}

function serializeDate(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

export default async function workspaceRoutes(fastify: FastifyInstance) {
  const appUrl = getPrimaryAppUrl();

  // List all workspaces for current user
  fastify.get('/', { preHandler: [requireAuth] }, async (request: AuthenticatedRequest, reply) => {
    const userId = request.user!.id;

    const memberships = await fastify.prisma.workspaceMember.findMany({
      where: {
        userId,
        deletedAt: null,
        workspace: {
          deletedAt: null,
        },
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

    if (workspace.deletedAt) {
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

    const currentWorkspace = await fastify.prisma.workspace.findUnique({
      where: { id: request.workspace!.id },
      select: {
        id: true,
        slug: true,
        settings: true,
        deletedAt: true,
      },
    });

    if (!currentWorkspace || currentWorkspace.deletedAt) {
      return reply.status(404).send({ error: 'Workspace not found' });
    }

    if (parseResult.data.slug && parseResult.data.slug !== currentWorkspace.slug) {
      const existing = await fastify.prisma.workspace.findFirst({
        where: {
          slug: parseResult.data.slug,
          deletedAt: null,
          NOT: { id: currentWorkspace.id },
        },
        select: { id: true },
      });

      if (existing) {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'A workspace with this slug already exists',
        });
      }
    }

    const updateData: Record<string, unknown> = { ...parseResult.data };
    if (parseResult.data.settings && typeof parseResult.data.settings === 'object') {
      updateData.settings = mergeJsonSettings(
        (currentWorkspace.settings as Record<string, unknown> | null) ?? {},
        parseResult.data.settings as Record<string, unknown>,
      );
    }

    const workspace = await fastify.prisma.workspace.update({
      where: { id: request.workspace!.id },
      data: updateData,
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

  fastify.get('/:workspaceId/export', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const workspaceId = request.workspace!.id;

    const [workspace, members, teams, projects, initiatives, issues, notes, cycles, databases] = await Promise.all([
      fastify.prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          icon: true,
          color: true,
          plan: true,
          settings: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
        },
      }),
      fastify.prisma.workspaceMember.findMany({
        where: { workspaceId, deletedAt: null },
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
        orderBy: { joinedAt: 'asc' },
      }),
      fastify.prisma.team.findMany({
        where: { workspaceId, deletedAt: null },
        select: {
          id: true,
          name: true,
          key: true,
          color: true,
          description: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { name: 'asc' },
      }),
      fastify.prisma.project.findMany({
        where: { workspaceId, deletedAt: null },
        include: {
          issues: {
            where: { deletedAt: null },
            select: { id: true, identifier: true, title: true, state: true, priority: true },
          },
          initiative: {
            select: { id: true, name: true, status: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      fastify.prisma.initiative.findMany({
        where: { workspaceId, deletedAt: null },
        include: {
          projects: {
            where: { deletedAt: null },
            select: { id: true, name: true, status: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      fastify.prisma.issue.findMany({
        where: { workspaceId, deletedAt: null },
        select: {
          id: true,
          identifier: true,
          title: true,
          state: true,
          priority: true,
          dueDate: true,
          createdAt: true,
          updatedAt: true,
          projectId: true,
          teamId: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      fastify.prisma.note.findMany({
        where: { workspaceId, deletedAt: null },
        select: {
          id: true,
          title: true,
          slug: true,
          emoji: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
      }),
      fastify.prisma.cycle.findMany({
        where: { workspaceId, deletedAt: null },
        select: {
          id: true,
          number: true,
          name: true,
          startDate: true,
          endDate: true,
          isActive: true,
          sprintGoal: true,
          capacity: true,
        },
        orderBy: { startDate: 'asc' },
      }),
      fastify.prisma.database.findMany({
        where: { workspaceId, deletedAt: null },
        include: {
          _count: {
            select: { rows: true, properties: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    if (!workspace || workspace.deletedAt) {
      return reply.status(404).send({ error: 'Workspace not found' });
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      workspace: {
        ...workspace,
        createdAt: workspace.createdAt.toISOString(),
        updatedAt: workspace.updatedAt.toISOString(),
      },
      members: members.map((member) => ({
        id: member.id,
        role: member.role,
        joinedAt: member.joinedAt.toISOString(),
        user: member.user,
      })),
      teams: teams.map((team) => ({
        ...team,
        createdAt: team.createdAt.toISOString(),
        updatedAt: team.updatedAt.toISOString(),
      })),
      projects: projects.map((project) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        startDate: serializeDate(project.startDate),
        targetDate: serializeDate(project.targetDate),
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
        initiative: project.initiative,
        issues: project.issues,
      })),
      initiatives: initiatives.map((initiative) => ({
        id: initiative.id,
        name: initiative.name,
        description: initiative.description,
        status: initiative.status,
        targetDate: serializeDate(initiative.targetDate),
        createdAt: initiative.createdAt.toISOString(),
        updatedAt: initiative.updatedAt.toISOString(),
        projects: initiative.projects,
      })),
      issues: issues.map((issue) => ({
        ...issue,
        dueDate: serializeDate(issue.dueDate),
        createdAt: issue.createdAt.toISOString(),
        updatedAt: issue.updatedAt.toISOString(),
      })),
      notes: notes.map((note) => ({
        ...note,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
      })),
      cycles: cycles.map((cycle) => ({
        ...cycle,
        startDate: cycle.startDate.toISOString(),
        endDate: cycle.endDate.toISOString(),
      })),
      databases: databases.map((database) => ({
        id: database.id,
        name: database.name,
        description: database.description,
        createdAt: database.createdAt.toISOString(),
        updatedAt: database.updatedAt.toISOString(),
        rowCount: database._count.rows,
        propertyCount: database._count.properties,
      })),
    };

    reply.header('Content-Type', 'application/json; charset=utf-8');
    reply.header(
      'Content-Disposition',
      `attachment; filename="${workspace.slug}-export-${new Date().toISOString().slice(0, 10)}.json"`,
    );

    return reply.send(payload);
  });

  fastify.delete('/:workspaceId', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    if (request.workspace!.role !== 'OWNER') {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Only workspace owners can delete a workspace.',
      });
    }

    const { confirmation } = (request.body as { confirmation?: string } | undefined) ?? {};
    const workspace = await fastify.prisma.workspace.findUnique({
      where: { id: request.workspace!.id },
      select: {
        id: true,
        name: true,
        slug: true,
        deletedAt: true,
      },
    });

    if (!workspace || workspace.deletedAt) {
      return reply.status(404).send({ error: 'Workspace not found' });
    }

    const expectedValues = new Set([workspace.name, workspace.slug]);
    if (!confirmation || !expectedValues.has(confirmation.trim())) {
      return reply.status(400).send({
        error: 'Invalid confirmation',
        message: `Type ${workspace.slug} to confirm workspace deletion.`,
      });
    }

    const deletedAt = new Date();
    await fastify.prisma.$transaction([
      fastify.prisma.workspace.update({
        where: { id: workspace.id },
        data: { deletedAt },
      }),
      fastify.prisma.workspaceMember.updateMany({
        where: { workspaceId: workspace.id, deletedAt: null },
        data: { deletedAt },
      }),
      fastify.prisma.project.updateMany({
        where: { workspaceId: workspace.id, deletedAt: null },
        data: { deletedAt },
      }),
      fastify.prisma.initiative.updateMany({
        where: { workspaceId: workspace.id, deletedAt: null },
        data: { deletedAt },
      }),
      fastify.prisma.team.updateMany({
        where: { workspaceId: workspace.id, deletedAt: null },
        data: { deletedAt },
      }),
      fastify.prisma.note.updateMany({
        where: { workspaceId: workspace.id, deletedAt: null },
        data: { deletedAt },
      }),
      fastify.prisma.issue.updateMany({
        where: { workspaceId: workspace.id, deletedAt: null },
        data: { deletedAt },
      }),
      fastify.prisma.cycle.updateMany({
        where: { workspaceId: workspace.id, deletedAt: null },
        data: { deletedAt },
      }),
      fastify.prisma.database.updateMany({
        where: { workspaceId: workspace.id, deletedAt: null },
        data: { deletedAt },
      }),
      fastify.prisma.invitation.updateMany({
        where: { workspaceId: workspace.id, status: 'PENDING' },
        data: { status: 'DECLINED' },
      }),
    ]);

    return reply.send({
      success: true,
      message: 'Workspace deleted.',
    });
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

  fastify.get('/:workspaceId/invitations', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    if (!['OWNER', 'ADMIN'].includes(request.workspace!.role)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'You do not have permission to view workspace invitations',
      });
    }

    await fastify.prisma.invitation.updateMany({
      where: {
        workspaceId: request.workspace!.id,
        status: 'PENDING',
        expiresAt: { lte: new Date() },
      },
      data: { status: 'EXPIRED' },
    });

    const invitations = await fastify.prisma.invitation.findMany({
      where: {
        workspaceId: request.workspace!.id,
        status: 'PENDING',
      },
      include: {
        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      invitations: invitations.map((invitation) => ({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        createdAt: invitation.createdAt.toISOString(),
        expiresAt: invitation.expiresAt.toISOString(),
        invitedBy: invitation.invitedBy,
        acceptUrl: `${appUrl}/invite/${invitation.token}`,
      })),
    };
  });

  fastify.get('/invitations/:token', async (request, reply) => {
    const { token } = request.params as { token: string };

    const invitation = await fastify.prisma.invitation.findUnique({
      where: { token },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
          },
        },
        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!invitation) {
      return reply.status(404).send({
        error: 'Not found',
        message: 'Invitation not found',
      });
    }

    let status = invitation.status;
    if (status === 'PENDING' && invitation.expiresAt.getTime() <= Date.now()) {
      await fastify.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      status = 'EXPIRED';
    }

    return {
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status,
        expiresAt: invitation.expiresAt.toISOString(),
        workspace: invitation.workspace,
        invitedBy: invitation.invitedBy,
      },
    };
  });

  fastify.post('/invitations/:token/accept', {
    preHandler: [requireAuth],
  }, async (request: AuthenticatedRequest, reply) => {
    const { token } = request.params as { token: string };
    const user = request.user!;

    const invitation = await fastify.prisma.invitation.findUnique({
      where: { token },
      include: {
        workspace: {
          select: {
            id: true,
            slug: true,
            name: true,
          },
        },
      },
    });

    if (!invitation) {
      return reply.status(404).send({
        error: 'Not found',
        message: 'Invitation not found',
      });
    }

    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: `This invitation is for ${invitation.email}. Sign in with that account to accept it.`,
      });
    }

    if (invitation.status === 'DECLINED') {
      return reply.status(409).send({
        error: 'Conflict',
        message: 'This invitation was declined and can no longer be accepted.',
      });
    }

    if (invitation.status === 'EXPIRED' || invitation.expiresAt.getTime() <= Date.now()) {
      if (invitation.status === 'PENDING') {
        await fastify.prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: 'EXPIRED' },
        });
      }

      return reply.status(410).send({
        error: 'Gone',
        message: 'This invitation has expired.',
      });
    }

    const existingMember = await fastify.prisma.workspaceMember.findFirst({
      where: {
        workspaceId: invitation.workspaceId,
        userId: user.id,
        deletedAt: null,
      },
    });

    if (existingMember) {
      if (invitation.status === 'PENDING') {
        await fastify.prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: 'ACCEPTED' },
        });
      }

      return {
        status: 'already-member',
        message: 'You already have access to this workspace.',
        workspace: invitation.workspace,
      };
    }

    if (invitation.status === 'ACCEPTED') {
      return {
        status: 'accepted',
        message: 'This invitation has already been accepted.',
        workspace: invitation.workspace,
      };
    }

    await fastify.prisma.$transaction([
      fastify.prisma.workspaceMember.create({
        data: {
          workspaceId: invitation.workspaceId,
          userId: user.id,
          role: invitation.role,
        },
      }),
      fastify.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' },
      }),
    ]);

    return {
      status: 'accepted',
      message: 'Invitation accepted. Redirecting to the workspace...',
      workspace: invitation.workspace,
    };
  });

  // Invite a user to the workspace. Existing users are added immediately.
  fastify.post('/:workspaceId/invitations', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    if (!['OWNER', 'ADMIN'].includes(request.workspace!.role)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'You do not have permission to invite members to this workspace',
      });
    }

    const { email, role = 'MEMBER' } = request.body as {
      email?: string;
      role?: 'ADMIN' | 'MEMBER' | 'GUEST';
    };

    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail) {
      return reply.status(400).send({ error: 'Email is required' });
    }

    if (!['ADMIN', 'MEMBER', 'GUEST'].includes(role)) {
      return reply.status(400).send({ error: 'Invalid role' });
    }

    const workspaceId = request.workspace!.id;
    const invitedById = (request as AuthenticatedRequest).user!.id;

    const existingUser = await fastify.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, name: true, image: true },
    });

    if (existingUser) {
      const existingMember = await fastify.prisma.workspaceMember.findFirst({
        where: {
          workspaceId,
          userId: existingUser.id,
          deletedAt: null,
        },
      });

      if (existingMember) {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'This user is already a workspace member',
        });
      }

      const member = await fastify.prisma.workspaceMember.create({
        data: {
          workspaceId,
          userId: existingUser.id,
          role,
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
      });

      return reply.status(201).send({
        status: 'member-added',
        member: {
          id: member.id,
          userId: member.userId,
          role: member.role,
          joinedAt: member.joinedAt.toISOString(),
          user: member.user,
        },
      });
    }

    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
    const existingInvitation = await fastify.prisma.invitation.findFirst({
      where: {
        workspaceId,
        email: normalizedEmail,
        status: 'PENDING',
      },
    });

    const invitation = existingInvitation
      ? await fastify.prisma.invitation.update({
          where: { id: existingInvitation.id },
          data: {
            role,
            token: randomUUID(),
            status: 'PENDING',
            invitedById,
            expiresAt,
          },
        })
      : await fastify.prisma.invitation.create({
          data: {
            workspaceId,
            email: normalizedEmail,
            role,
            token: randomUUID(),
            status: 'PENDING',
            invitedById,
            expiresAt,
          },
        });

    return reply.status(201).send({
      status: 'invitation-created',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt.toISOString(),
        acceptUrl: `${appUrl}/invite/${invitation.token}`,
      },
      message: 'Invitation created. Email delivery can be wired up separately.',
    });
  });

  fastify.delete('/:workspaceId/invitations/:invitationId', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    if (!['OWNER', 'ADMIN'].includes(request.workspace!.role)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'You do not have permission to revoke workspace invitations',
      });
    }

    const { invitationId } = request.params as { invitationId: string };
    const invitation = await fastify.prisma.invitation.findFirst({
      where: {
        id: invitationId,
        workspaceId: request.workspace!.id,
      },
    });

    if (!invitation) {
      return reply.status(404).send({
        error: 'Not found',
        message: 'Invitation not found',
      });
    }

    if (invitation.status !== 'PENDING') {
      return reply.status(409).send({
        error: 'Conflict',
        message: 'Only pending invitations can be revoked.',
      });
    }

    await fastify.prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'DECLINED' },
    });

    return {
      status: 'revoked',
      message: 'Invitation revoked.',
    };
  });

  // Update workspace member role
  fastify.patch('/:workspaceId/members/:memberId', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    if (!['OWNER', 'ADMIN'].includes(request.workspace!.role)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'You do not have permission to manage members',
      });
    }

    const { memberId } = request.params as { memberId: string };
    const { role } = request.body as { role: string };
    const validRoles = ['OWNER', 'ADMIN', 'MEMBER', 'GUEST'];

    if (!validRoles.includes(role)) {
      return reply.status(400).send({ error: 'Invalid role' });
    }

    // Prevent removing the last owner
    if (role !== 'OWNER') {
      const member = await fastify.prisma.workspaceMember.findUnique({
        where: { id: memberId },
      });
      if (member?.role === 'OWNER') {
        const ownerCount = await fastify.prisma.workspaceMember.count({
          where: { workspaceId: request.workspace!.id, role: 'OWNER', deletedAt: null },
        });
        if (ownerCount <= 1) {
          return reply.status(400).send({ error: 'Cannot change the role of the last owner' });
        }
      }
    }

    const updated = await fastify.prisma.workspaceMember.update({
      where: { id: memberId },
      data: { role: role as "OWNER" | "ADMIN" | "MEMBER" | "GUEST" },
    });

    return {
      member: {
        id: updated.id,
        role: updated.role,
        updatedAt: updated.updatedAt.toISOString(),
      },
    };
  });

  // Remove workspace member (soft delete)
  fastify.delete('/:workspaceId/members/:memberId', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    if (!['OWNER', 'ADMIN'].includes(request.workspace!.role)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'You do not have permission to remove members',
      });
    }

    const { memberId } = request.params as { memberId: string };

    const member = await fastify.prisma.workspaceMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.workspaceId !== request.workspace!.id) {
      return reply.status(404).send({ error: 'Member not found' });
    }

    // Prevent removing the last owner
    if (member.role === 'OWNER') {
      const ownerCount = await fastify.prisma.workspaceMember.count({
        where: { workspaceId: request.workspace!.id, role: 'OWNER', deletedAt: null },
      });
      if (ownerCount <= 1) {
        return reply.status(400).send({ error: 'Cannot remove the last owner' });
      }
    }

    await fastify.prisma.workspaceMember.update({
      where: { id: memberId },
      data: { deletedAt: new Date() },
    });

    return { success: true, message: 'Member removed' };
  });

  // List workspace labels
  fastify.get('/:workspaceId/labels', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const labels = await fastify.prisma.label.findMany({
      where: { workspaceId: request.workspace!.id },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, color: true },
    });
    return { labels };
  });
}
