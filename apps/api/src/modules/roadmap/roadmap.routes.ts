import type { FastifyInstance } from 'fastify';
import { requireAuth, type AuthenticatedRequest } from '../../plugins/auth.js';
import { extractWorkspace, type WorkspaceRequest } from '../../middleware/workspace.js';

export default async function roadmapRoutes(fastify: FastifyInstance) {
  // Get roadmap data for workspace
  fastify.get('/', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const workspaceId = request.workspace!.id;
    const { teamId, startDate, endDate } = request.query as {
      teamId?: string;
      startDate?: string;
      endDate?: string;
    };

    // Default to 3 month window if no dates provided
    const start = startDate ? new Date(startDate) : new Date();
    if (!startDate) start.setDate(start.getDate() - 30);
    
    const end = endDate ? new Date(endDate) : new Date();
    if (!endDate) end.setMonth(end.getMonth() + 3);

    // Get teams in workspace
    const teamsWhere: any = { workspaceId };
    if (teamId) teamsWhere.id = teamId;

    const teams = await fastify.prisma.team.findMany({
      where: teamsWhere,
      select: {
        id: true,
        name: true,
        key: true,
        color: true,
        cycles: {
          where: {
            startDate: { lte: end },
            endDate: { gte: start },
          },
          orderBy: { startDate: 'asc' },
        },
      },
    });

    // Get initiatives with projects
    const initiatives = await fastify.prisma.initiative.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        OR: [
          { targetDate: { gte: start, lte: end } },
          { createdAt: { gte: start, lte: end } },
        ],
      },
      include: {
        projects: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            status: true,
            targetDate: true,
            startDate: true,
            _count: { select: { issues: { where: { deletedAt: null } } } },
          },
        },
      },
      orderBy: { targetDate: 'asc' },
    });

    // Get unscheduled issues (backlog without due date)
    const unscheduledWhere: any = {
      workspaceId,
      deletedAt: null,
      archivedAt: null,
      OR: [
        { dueDate: null },
        { cycleId: null },
      ],
    };
    if (teamId) unscheduledWhere.teamId = teamId;

    const unscheduledIssues = await fastify.prisma.issue.findMany({
      where: unscheduledWhere,
      select: {
        id: true,
        identifier: true,
        title: true,
        priority: true,
        state: true,
        team: { select: { id: true, name: true, key: true, color: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { priority: 'desc' },
      take: 50,
    });

    // Format response
    const roadmapData = {
      timeline: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      teams: teams.map(team => ({
        id: team.id,
        name: team.name,
        key: team.key,
        color: team.color,
        cycles: team.cycles.map(cycle => ({
          id: cycle.id,
          name: cycle.name || `Cycle ${cycle.number}`,
          number: cycle.number,
          startDate: cycle.startDate.toISOString(),
          endDate: cycle.endDate.toISOString(),
          isActive: cycle.isActive,
          sprintGoal: cycle.sprintGoal,
        })),
      })),
      initiatives: initiatives.map(initiative => ({
        id: initiative.id,
        name: initiative.name,
        status: initiative.status,
        targetDate: initiative.targetDate?.toISOString() || null,
        description: initiative.description,
        projects: initiative.projects.map(project => ({
          id: project.id,
          name: project.name,
          status: project.status,
          startDate: project.startDate?.toISOString() || null,
          targetDate: project.targetDate?.toISOString() || null,
          issueCount: project._count.issues,
        })),
      })),
      unscheduled: {
        count: unscheduledIssues.length,
        issues: unscheduledIssues.map(issue => ({
          id: issue.id,
          identifier: issue.identifier,
          title: issue.title,
          priority: issue.priority,
          state: issue.state,
          team: issue.team,
          project: issue.project,
        })),
      },
    };

    return roadmapData;
  });

  // Get timeline view data (issues by date range)
  fastify.get('/timeline', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const workspaceId = request.workspace!.id;
    const { 
      teamId, 
      startDate, 
      endDate, 
      groupBy = 'team',
      includeCompleted = 'false' 
    } = request.query as {
      teamId?: string;
      startDate?: string;
      endDate?: string;
      groupBy?: 'team' | 'project' | 'assignee';
      includeCompleted?: string;
    };

    const start = startDate ? new Date(startDate) : new Date();
    if (!startDate) start.setDate(start.getDate() - 14);
    
    const end = endDate ? new Date(endDate) : new Date();
    if (!endDate) end.setMonth(end.getMonth() + 2);

    const includeDone = includeCompleted === 'true';

    // Build where clause
    const where: any = {
      workspaceId,
      deletedAt: null,
      archivedAt: null,
      OR: [
        { dueDate: { gte: start, lte: end } },
        { createdAt: { gte: start, lte: end } },
        { 
          cycle: {
            OR: [
              { startDate: { lte: end }, endDate: { gte: start } },
            ],
          },
        },
      ],
    };

    if (teamId) where.teamId = teamId;
    if (!includeDone) where.state = { not: 'DONE' };

    const issues = await fastify.prisma.issue.findMany({
      where,
      include: {
        team: { select: { id: true, name: true, key: true, color: true } },
        assignee: { select: { id: true, name: true, image: true } },
        project: { select: { id: true, name: true, status: true } },
        cycle: { select: { id: true, name: true, number: true, startDate: true, endDate: true } },
        workflowState: { select: { id: true, name: true, color: true, category: true } },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Group issues
    const grouped: Record<string, any> = {};

    issues.forEach(issue => {
      let groupKey: string;
      let groupName: string;
      let groupColor: string | null = null;

      switch (groupBy) {
        case 'project':
          groupKey = issue.project?.id || 'no-project';
          groupName = issue.project?.name || 'No Project';
          break;
        case 'assignee':
          groupKey = issue.assignee?.id || 'unassigned';
          groupName = issue.assignee?.name || 'Unassigned';
          break;
        case 'team':
        default:
          groupKey = issue.team?.id || 'no-team';
          groupName = issue.team?.name || 'No Team';
          groupColor = issue.team?.color || null;
          break;
      }

      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          id: groupKey,
          name: groupName,
          color: groupColor,
          issues: [],
        };
      }

      grouped[groupKey].issues.push({
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        priority: issue.priority,
        state: issue.state,
        dueDate: issue.dueDate?.toISOString() || null,
        createdAt: issue.createdAt.toISOString(),
        team: issue.team,
        assignee: issue.assignee,
        project: issue.project,
        cycle: issue.cycle ? {
          id: issue.cycle.id,
          name: issue.cycle.name || `Cycle ${issue.cycle.number}`,
          startDate: issue.cycle.startDate.toISOString(),
          endDate: issue.cycle.endDate.toISOString(),
        } : null,
        workflowState: issue.workflowState,
      });
    });

    return {
      timeline: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      groupBy,
      groups: Object.values(grouped),
    };
  });
}
