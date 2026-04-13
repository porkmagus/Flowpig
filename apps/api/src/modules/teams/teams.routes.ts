import type { FastifyInstance } from 'fastify';
import { requireAuth, type AuthenticatedRequest } from '../../plugins/auth.js';
import { extractWorkspace, type WorkspaceRequest } from '../../middleware/workspace.js';

export default async function teamRoutes(fastify: FastifyInstance) {
  // List teams
  fastify.get('/', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const workspaceId = request.workspace!.id;

    const teams = await fastify.prisma.team.findMany({
      where: {
        workspaceId,
        deletedAt: null,
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
        _count: {
          select: { 
            issues: { where: { deletedAt: null } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return {
      teams: teams.map(team => ({
        id: team.id,
        name: team.name,
        key: team.key,
        color: team.color,
        description: team.description,
        autoCloseDays: team.autoCloseDays,
        autoArchiveDays: team.autoArchiveDays,
        members: team.members.map(m => ({
          id: m.id,
          user: m.user,
        })),
        issueCount: team._count.issues,
      })),
    };
  });

  // Get single team
  fastify.get('/:teamId', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { teamId } = request.params as { teamId: string };
    const workspaceId = request.workspace!.id;

    const team = await fastify.prisma.team.findFirst({
      where: {
        id: teamId,
        workspaceId,
        deletedAt: null,
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
        workflowStates: {
          orderBy: { position: 'asc' },
        },
        triageOwner: {
          select: { id: true, name: true, email: true, image: true },
        },
        _count: {
          select: { 
            issues: { where: { deletedAt: null } },
          },
        },
      },
    });

    if (!team) {
      return reply.status(404).send({ error: 'Team not found' });
    }

    return {
      team: {
        id: team.id,
        name: team.name,
        key: team.key,
        color: team.color,
        description: team.description,
        autoCloseDays: team.autoCloseDays,
        autoArchiveDays: team.autoArchiveDays,
        triageOwner: team.triageOwner,
        triageSlackChannel: team.triageSlackChannel,
        intakeConfig: team.intakeConfig,
        members: team.members.map(m => ({
          id: m.id,
          user: m.user,
        })),
        workflowStates: team.workflowStates,
        issueCount: team._count.issues,
      },
    };
  });

  // Create team
  fastify.post('/', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const userId = (request as any).user!.id;
    const workspaceId = request.workspace!.id;
    const { name, key, color, description } = request.body as {
      name: string;
      key: string;
      color?: string;
      description?: string;
    };

    // Check if key is unique in workspace
    const existing = await fastify.prisma.team.findFirst({
      where: { workspaceId, key: key.toUpperCase(), deletedAt: null },
    });

    if (existing) {
      return reply.status(409).send({ error: 'Team key already exists in this workspace' });
    }

    const team = await fastify.prisma.team.create({
      data: {
        workspaceId,
        name,
        key: key.toUpperCase(),
        color: color || '#5E6AD2',
        description,
      },
    });

    // Create default workflow states
    const defaultStates = [
      { name: 'Backlog', key: 'backlog', category: 'BACKLOG', position: 0, isDefault: true },
      { name: 'Todo', key: 'todo', category: 'TODO', position: 1 },
      { name: 'In Progress', key: 'in_progress', category: 'IN_PROGRESS', position: 2 },
      { name: 'In Review', key: 'in_review', category: 'IN_REVIEW', position: 3 },
      { name: 'Done', key: 'done', category: 'DONE', position: 4, isTerminal: true },
    ];

    await fastify.prisma.teamWorkflowState.createMany({
      data: defaultStates.map(s => ({
        teamId: team.id,
        ...s,
      })),
    });

    // Add creator as member
    await fastify.prisma.teamMember.create({
      data: {
        teamId: team.id,
        userId,
      },
    });

    return reply.status(201).send({
      team: {
        id: team.id,
        name: team.name,
        key: team.key,
        color: team.color,
        description: team.description,
      },
    });
  });

  // Update team
  fastify.patch('/:teamId', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { teamId } = request.params as { teamId: string };
    const workspaceId = request.workspace!.id;
    const { name, color, description, autoCloseDays, autoArchiveDays, triageOwnerId, triageSlackChannel } = request.body as {
      name?: string;
      color?: string;
      description?: string;
      autoCloseDays?: number;
      autoArchiveDays?: number;
      triageOwnerId?: string | null;
      triageSlackChannel?: string | null;
    };

    const existing = await fastify.prisma.team.findFirst({
      where: { id: teamId, workspaceId, deletedAt: null },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Team not found' });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (color !== undefined) updateData.color = color;
    if (description !== undefined) updateData.description = description;
    if (autoCloseDays !== undefined) updateData.autoCloseDays = autoCloseDays;
    if (autoArchiveDays !== undefined) updateData.autoArchiveDays = autoArchiveDays;
    if (triageOwnerId !== undefined) updateData.triageOwnerId = triageOwnerId;
    if (triageSlackChannel !== undefined) updateData.triageSlackChannel = triageSlackChannel;

    const team = await fastify.prisma.team.update({
      where: { id: teamId },
      data: updateData,
    });

    return {
      team: {
        id: team.id,
        name: team.name,
        key: team.key,
        color: team.color,
        description: team.description,
      },
    };
  });

  // Add member to team
  fastify.post('/:teamId/members', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { teamId } = request.params as { teamId: string };
    const workspaceId = request.workspace!.id;
    const { userId } = request.body as { userId: string };

    const team = await fastify.prisma.team.findFirst({
      where: { id: teamId, workspaceId, deletedAt: null },
    });

    if (!team) {
      return reply.status(404).send({ error: 'Team not found' });
    }

    // Verify user is workspace member
    const workspaceMember = await fastify.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId, deletedAt: null },
    });

    if (!workspaceMember) {
      return reply.status(400).send({ error: 'User is not a workspace member' });
    }

    // Check if already a team member
    const existing = await fastify.prisma.teamMember.findFirst({
      where: { teamId, userId },
    });

    if (existing) {
      return reply.status(409).send({ error: 'User is already a team member' });
    }

    const member = await fastify.prisma.teamMember.create({
      data: { teamId, userId },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    return reply.status(201).send({
      member: {
        id: member.id,
        user: member.user,
      },
    });
  });

  // Remove member from team
  fastify.delete('/:teamId/members/:memberId', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { teamId, memberId } = request.params as { teamId: string; memberId: string };
    const workspaceId = request.workspace!.id;

    const member = await fastify.prisma.teamMember.findFirst({
      where: { id: memberId, teamId },
      include: { team: true },
    });

    if (!member || member.team.workspaceId !== workspaceId) {
      return reply.status(404).send({ error: 'Member not found' });
    }

    await fastify.prisma.teamMember.delete({
      where: { id: memberId },
    });

    return { success: true };
  });
}
