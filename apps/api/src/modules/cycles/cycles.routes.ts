import type { FastifyInstance } from 'fastify';
import { requireAuth, type AuthenticatedRequest } from '../../plugins/auth.js';
import { extractWorkspace, type WorkspaceRequest } from '../../middleware/workspace.js';

export default async function cycleRoutes(fastify: FastifyInstance) {
  // List cycles in workspace
  fastify.get('/', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const workspaceId = request.workspace!.id;
    const { teamId, isActive, page = '1', limit = '20' } = 
      request.query as { teamId?: string; isActive?: string; page?: string; limit?: string };

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const where: any = {
      workspaceId,
      deletedAt: null,
    };

    if (teamId) where.teamId = teamId;
    if (isActive === 'true') where.isActive = true;

    const [cycles, total] = await Promise.all([
      fastify.prisma.cycle.findMany({
        where,
        include: {
          team: {
            select: { id: true, name: true, key: true, color: true },
          },
          _count: {
            select: { issues: { where: { deletedAt: null } } },
          },
        },
        orderBy: { startDate: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      fastify.prisma.cycle.count({ where }),
    ]);

    return {
      cycles: cycles.map(cycle => ({
        id: cycle.id,
        number: cycle.number,
        name: cycle.name,
        startDate: cycle.startDate.toISOString(),
        endDate: cycle.endDate.toISOString(),
        isActive: cycle.isActive,
        completedAt: cycle.completedAt?.toISOString() || null,
        sprintGoal: cycle.sprintGoal,
        capacity: cycle.capacity,
        team: cycle.team,
        issueCount: cycle._count.issues,
      })),
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        hasMore: pageNum * limitNum < total,
      },
    };
  });

  // Get active cycle for team
  fastify.get('/active', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const workspaceId = request.workspace!.id;
    const { teamId } = request.query as { teamId: string };

    if (!teamId) {
      return reply.status(400).send({ error: 'teamId is required' });
    }

    const cycle = await fastify.prisma.cycle.findFirst({
      where: {
        workspaceId,
        teamId,
        isActive: true,
        deletedAt: null,
      },
      include: {
        team: {
          select: { id: true, name: true, key: true, color: true },
        },
        issues: {
          where: { deletedAt: null },
          include: {
            assignee: { select: { id: true, name: true, image: true } },
            workflowState: { select: { id: true, name: true, color: true, category: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!cycle) {
      return reply.status(404).send({ error: 'No active cycle found' });
    }

    return {
      cycle: {
        id: cycle.id,
        number: cycle.number,
        name: cycle.name,
        startDate: cycle.startDate.toISOString(),
        endDate: cycle.endDate.toISOString(),
        isActive: cycle.isActive,
        sprintGoal: cycle.sprintGoal,
        capacity: cycle.capacity,
        team: cycle.team,
        issues: cycle.issues.map(issue => ({
          id: issue.id,
          identifier: issue.identifier,
          title: issue.title,
          state: issue.state,
          priority: issue.priority,
          assignee: issue.assignee,
          workflowState: issue.workflowState,
        })),
      },
    };
  });

  // Get single cycle
  fastify.get('/:cycleId', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { cycleId } = request.params as { cycleId: string };
    const workspaceId = request.workspace!.id;

    const cycle = await fastify.prisma.cycle.findFirst({
      where: {
        id: cycleId,
        workspaceId,
        deletedAt: null,
      },
      include: {
        team: {
          select: { id: true, name: true, key: true, color: true },
        },
        issues: {
          where: { deletedAt: null },
          include: {
            assignee: { select: { id: true, name: true, image: true } },
            workflowState: { select: { id: true, name: true, color: true, category: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        retros: {
          include: {
            createdBy: { select: { id: true, name: true, image: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!cycle) {
      return reply.status(404).send({ error: 'Cycle not found' });
    }

    // Calculate stats
    const totalIssues = cycle.issues.length;
    const completedIssues = cycle.issues.filter(i => i.state === 'DONE').length;
    const inProgressIssues = cycle.issues.filter(i => i.state === 'IN_PROGRESS').length;

    return {
      cycle: {
        id: cycle.id,
        number: cycle.number,
        name: cycle.name,
        startDate: cycle.startDate.toISOString(),
        endDate: cycle.endDate.toISOString(),
        isActive: cycle.isActive,
        completedAt: cycle.completedAt?.toISOString() || null,
        sprintGoal: cycle.sprintGoal,
        capacity: cycle.capacity,
        team: cycle.team,
        issues: cycle.issues,
        retro: cycle.retros[0] || null,
        stats: {
          totalIssues,
          completedIssues,
          inProgressIssues,
          completionRate: totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 0,
        },
      },
    };
  });

  // Create cycle
  fastify.post('/', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const userId = request.user!.id;
    const workspaceId = request.workspace!.id;
    const { teamId, name, startDate, endDate, sprintGoal, capacity } = request.body as {
      teamId: string;
      name?: string;
      startDate: string;
      endDate: string;
      sprintGoal?: string;
      capacity?: number;
    };

    // Verify team exists
    const team = await fastify.prisma.team.findFirst({
      where: { id: teamId, workspaceId, deletedAt: null },
    });

    if (!team) {
      return reply.status(404).send({ error: 'Team not found' });
    }

    // Get next cycle number
    const lastCycle = await fastify.prisma.cycle.findFirst({
      where: { teamId },
      orderBy: { number: 'desc' },
    });
    const nextNumber = (lastCycle?.number || 0) + 1;

    // Deactivate current active cycle if exists
    await fastify.prisma.cycle.updateMany({
      where: {
        teamId,
        isActive: true,
        deletedAt: null,
      },
      data: { isActive: false },
    });

    const cycle = await fastify.prisma.cycle.create({
      data: {
        workspaceId,
        teamId,
        number: nextNumber,
        name: name || `Cycle ${nextNumber}`,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        sprintGoal,
        capacity,
        isActive: true,
      },
      include: {
        team: {
          select: { id: true, name: true, key: true, color: true },
        },
      },
    });

    return reply.status(201).send({
      cycle: {
        id: cycle.id,
        number: cycle.number,
        name: cycle.name,
        startDate: cycle.startDate.toISOString(),
        endDate: cycle.endDate.toISOString(),
        isActive: cycle.isActive,
        sprintGoal: cycle.sprintGoal,
        capacity: cycle.capacity,
        team: cycle.team,
      },
    });
  });

  // Update cycle
  fastify.patch('/:cycleId', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { cycleId } = request.params as { cycleId: string };
    const workspaceId = request.workspace!.id;
    const { name, sprintGoal, capacity, isActive } = request.body as {
      name?: string;
      sprintGoal?: string;
      capacity?: number;
      isActive?: boolean;
    };

    const existing = await fastify.prisma.cycle.findFirst({
      where: { id: cycleId, workspaceId, deletedAt: null },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Cycle not found' });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (sprintGoal !== undefined) updateData.sprintGoal = sprintGoal;
    if (capacity !== undefined) updateData.capacity = capacity;
    if (isActive !== undefined) updateData.isActive = isActive;

    const cycle = await fastify.prisma.cycle.update({
      where: { id: cycleId },
      data: updateData,
      include: {
        team: {
          select: { id: true, name: true, key: true, color: true },
        },
      },
    });

    return {
      cycle: {
        id: cycle.id,
        number: cycle.number,
        name: cycle.name,
        startDate: cycle.startDate.toISOString(),
        endDate: cycle.endDate.toISOString(),
        isActive: cycle.isActive,
        sprintGoal: cycle.sprintGoal,
        capacity: cycle.capacity,
        team: cycle.team,
      },
    };
  });

  // Complete cycle
  fastify.post('/:cycleId/complete', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { cycleId } = request.params as { cycleId: string };
    const workspaceId = request.workspace!.id;

    const cycle = await fastify.prisma.cycle.findFirst({
      where: { id: cycleId, workspaceId, deletedAt: null },
    });

    if (!cycle) {
      return reply.status(404).send({ error: 'Cycle not found' });
    }

    await fastify.prisma.cycle.update({
      where: { id: cycleId },
      data: {
        isActive: false,
        completedAt: new Date(),
      },
    });

    return { success: true };
  });

  // Create retro for cycle
  fastify.post('/:cycleId/retro', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const userId = request.user!.id;
    const { cycleId } = request.params as { cycleId: string };
    const workspaceId = request.workspace!.id;
    const { wentWell, toImprove, actionItems } = request.body as {
      wentWell?: string;
      toImprove?: string;
      actionItems?: string;
    };

    const cycle = await fastify.prisma.cycle.findFirst({
      where: { id: cycleId, workspaceId, deletedAt: null },
    });

    if (!cycle) {
      return reply.status(404).send({ error: 'Cycle not found' });
    }

    const retro = await fastify.prisma.sprintRetro.create({
      data: {
        cycleId,
        workspaceId,
        createdById: userId,
        wentWell,
        toImprove,
        actionItems,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    return reply.status(201).send({
      retro: {
        id: retro.id,
        wentWell: retro.wentWell,
        toImprove: retro.toImprove,
        actionItems: retro.actionItems,
        createdBy: retro.createdBy,
        createdAt: retro.createdAt.toISOString(),
      },
    });
  });
}
