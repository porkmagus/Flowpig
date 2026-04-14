import type { FastifyInstance } from 'fastify';
import { requireAuth, type AuthenticatedRequest } from '../../plugins/auth.js';
import { extractWorkspace, type WorkspaceRequest } from '../../middleware/workspace.js';

export default async function triageRoutes(fastify: FastifyInstance) {
  // Get triage inbox for a team
  fastify.get('/teams/:teamId/triage', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { teamId } = request.params as { teamId: string };
    const userId = (request as any).user!.id;
    const workspaceId = request.workspace!.id;

    // Verify team exists in workspace
    const team = await fastify.prisma.team.findFirst({
      where: { id: teamId, workspaceId },
    });

    if (!team) {
      return reply.status(404).send({ error: 'Team not found' });
    }

    // Get triage workflow state
    const triageState = await fastify.prisma.teamWorkflowState.findFirst({
      where: { teamId, isTriage: true },
    });

    // Get issues in triage (no workflow state or triage state)
    const where: any = {
      teamId,
      workspaceId,
      deletedAt: null,
      archivedAt: null,
    };

    if (triageState) {
      where.workflowStateId = triageState.id;
    } else {
      // Fallback: issues with no assignee in backlog
      where.assigneeId = null;
      where.state = 'BACKLOG';
    }

    const [issues, total] = await Promise.all([
      fastify.prisma.issue.findMany({
        where,
        include: {
          assignee: { select: { id: true, name: true, image: true } },
          creator: { select: { id: true, name: true, image: true } },
          project: { select: { id: true, name: true } },
          workflowState: { select: { id: true, name: true, color: true } },
          labels: { select: { id: true, name: true, color: true } },
          _count: { select: { comments: { where: { deletedAt: null } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      fastify.prisma.issue.count({ where }),
    ]);

    return {
      issues: issues.map(issue => ({
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        description: issue.description,
        priority: issue.priority,
        state: issue.state,
        createdAt: issue.createdAt.toISOString(),
        updatedAt: issue.updatedAt.toISOString(),
        dueDate: issue.dueDate?.toISOString() || null,
        assignee: issue.assignee,
        creator: issue.creator,
        project: issue.project,
        workflowState: issue.workflowState,
        labels: issue.labels,
        commentCount: issue._count.comments,
      })),
      meta: { total, team: { id: team.id, name: team.name, key: team.key } },
    };
  });

  // Triage action: assign and move to todo
  fastify.post('/teams/:teamId/triage/:issueId/assign', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { teamId, issueId } = request.params as { teamId: string; issueId: string };
    const userId = (request as any).user!.id;
    const workspaceId = request.workspace!.id;
    const { assigneeId, workflowStateId } = request.body as { assigneeId?: string; workflowStateId?: string };

    // Get team
    const team = await fastify.prisma.team.findFirst({
      where: { id: teamId, workspaceId },
    });

    if (!team) {
      return reply.status(404).send({ error: 'Team not found' });
    }

    // Get issue
    const issue = await fastify.prisma.issue.findFirst({
      where: { id: issueId, teamId, workspaceId, deletedAt: null },
    });

    if (!issue) {
      return reply.status(404).send({ error: 'Issue not found' });
    }

    // Determine workflow state
    let targetStateId = workflowStateId;
    if (!targetStateId) {
      const todoState = await fastify.prisma.teamWorkflowState.findFirst({
        where: { teamId, category: 'TODO' },
      });
      targetStateId = todoState?.id;
    }

    // Update issue
    const updatedIssue = await fastify.prisma.issue.update({
      where: { id: issueId },
      data: {
        assigneeId: assigneeId || userId,
        workflowStateId: targetStateId,
        state: targetStateId ? undefined : 'TODO',
        updatedAt: new Date(),
      },
      include: {
        assignee: { select: { id: true, name: true, image: true } },
        workflowState: { select: { id: true, name: true, color: true } },
      },
    });

    // Create activity
    await fastify.prisma.activity.create({
      data: {
        workspaceId,
        issueId,
        actorId: userId,
        type: 'ISSUE_ASSIGNED',
        description: `Issue triaged and assigned to ${assigneeId ? 'user' : 'self'}`,
        metadata: { assigneeId: assigneeId || userId, workflowStateId: targetStateId },
      },
    });

    // Broadcast update
    if (fastify.broadcastToWorkspace) {
      fastify.broadcastToWorkspace(workspaceId, {
        type: 'issue.updated',
        payload: { issueId, changes: { assigneeId, workflowStateId: targetStateId } },
      });
    }

    return {
      issue: {
        id: updatedIssue.id,
        identifier: updatedIssue.identifier,
        title: updatedIssue.title,
        assignee: updatedIssue.assignee,
        workflowState: updatedIssue.workflowState,
      },
    };
  });

  // Quick triage actions
  fastify.post('/teams/:teamId/triage/:issueId/snooze', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { teamId, issueId } = request.params as { teamId: string; issueId: string };
    const userId = (request as any).user!.id;
    const workspaceId = request.workspace!.id;
    const { days = 7 } = request.body as { days?: number };

    const snoozeUntil = new Date();
    snoozeUntil.setDate(snoozeUntil.getDate() + days);

    const updatedIssue = await fastify.prisma.issue.update({
      where: { id: issueId, teamId, workspaceId, deletedAt: null },
      data: {
        dueDate: snoozeUntil,
        updatedAt: new Date(),
      },
    });

    return { success: true, snoozeUntil: snoozeUntil.toISOString() };
  });

  // Mark as duplicate
  fastify.post('/teams/:teamId/triage/:issueId/duplicate', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { teamId, issueId } = request.params as { teamId: string; issueId: string };
    const userId = (request as any).user!.id;
    const workspaceId = request.workspace!.id;
    const { duplicateOfId } = request.body as { duplicateOfId: string };

    if (!duplicateOfId) {
      return reply.status(400).send({ error: 'duplicateOfId is required' });
    }

    // Get duplicate state
    const duplicateState = await fastify.prisma.teamWorkflowState.findFirst({
      where: { teamId, isDuplicate: true },
    });

    const updatedIssue = await fastify.prisma.issue.update({
      where: { id: issueId, teamId, workspaceId, deletedAt: null },
      data: {
        workflowStateId: duplicateState?.id || null,
        state: duplicateState ? undefined : 'CANCELLED',
        updatedAt: new Date(),
      },
    });

    // Create relation
    await fastify.prisma.issueRelation.create({
      data: {
        issueId: duplicateOfId,
        relatedIssueId: issueId,
        type: 'DUPLICATES',
        createdAt: new Date(),
      },
    });

    return { success: true, message: 'Issue marked as duplicate' };
  });

  // Decline/Close without action
  fastify.post('/teams/:teamId/triage/:issueId/decline', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { teamId, issueId } = request.params as { teamId: string; issueId: string };
    const userId = (request as any).user!.id;
    const workspaceId = request.workspace!.id;
    const { reason } = request.body as { reason?: string };

    // Get cancelled state
    const cancelledState = await fastify.prisma.teamWorkflowState.findFirst({
      where: { teamId, category: { in: ['DONE', 'CANCELLED'] } },
      orderBy: { position: 'desc' },
    });

    const updatedIssue = await fastify.prisma.issue.update({
      where: { id: issueId, teamId, workspaceId, deletedAt: null },
      data: {
        workflowStateId: cancelledState?.id || null,
        state: 'CANCELLED',
        updatedAt: new Date(),
      },
    });

    // Create activity
    await fastify.prisma.activity.create({
      data: {
        workspaceId,
        issueId,
        actorId: userId,
        type: 'ISSUE_STATE_CHANGED',
        description: reason ? `Issue declined: ${reason}` : 'Issue declined from triage',
        metadata: { reason, fromTriage: true },
      },
    });

    return { success: true, message: 'Issue declined' };
  });

  // Get triage stats
  fastify.get('/teams/:teamId/triage/stats', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { teamId } = request.params as { teamId: string };
    const workspaceId = request.workspace!.id;

    const team = await fastify.prisma.team.findFirst({
      where: { id: teamId, workspaceId },
      include: {
        _count: { select: { issues: { where: { deletedAt: null } } } },
      },
    });

    if (!team) {
      return reply.status(404).send({ error: 'Team not found' });
    }

    const triageState = await fastify.prisma.teamWorkflowState.findFirst({
      where: { teamId, isTriage: true },
    });

    const where: any = {
      teamId,
      workspaceId,
      deletedAt: null,
      archivedAt: null,
    };

    if (triageState) {
      where.workflowStateId = triageState.id;
    } else {
      where.assigneeId = null;
      where.state = 'BACKLOG';
    }

    const [totalTriage, byPriority, oldestIssue] = await Promise.all([
      fastify.prisma.issue.count({ where }),
      fastify.prisma.issue.groupBy({
        by: ['priority'],
        where,
        _count: { id: true },
      }),
      fastify.prisma.issue.findFirst({
        where,
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true, identifier: true, title: true },
      }),
    ]);

    const priorityCounts = {
      NO_PRIORITY: 0,
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      URGENT: 0,
    };

    byPriority.forEach(p => {
      priorityCounts[p.priority as keyof typeof priorityCounts] = p._count.id;
    });

    return {
      stats: {
        totalTriage,
        totalTeamIssues: team._count.issues,
        byPriority: priorityCounts,
        oldestIssue: oldestIssue ? {
          identifier: oldestIssue.identifier,
          title: oldestIssue.title,
          createdAt: oldestIssue.createdAt.toISOString(),
          daysOld: Math.floor((Date.now() - oldestIssue.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
        } : null,
      },
    };
  });
}
