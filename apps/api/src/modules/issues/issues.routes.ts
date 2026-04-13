import type { FastifyInstance } from 'fastify';
import { requireAuth, type AuthenticatedRequest } from '../../plugins/auth.js';
import { extractWorkspace, type WorkspaceRequest } from '../../middleware/workspace.js';
import { CreateIssueSchema, UpdateIssueSchema } from '@flowpigdev/contracts';

export default async function issueRoutes(fastify: FastifyInstance) {
  // List issues in workspace
  fastify.get('/', { 
    preHandler: [requireAuth, extractWorkspace] 
  }, async (request: WorkspaceRequest, reply) => {
    const { state, priority, assigneeId, teamId, search, page = '1', limit = '50' } = 
      request.query as { 
        state?: string; 
        priority?: string; 
        assigneeId?: string;
        teamId?: string;
        search?: string;
        page?: string;
        limit?: string;
      };

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      workspaceId: request.workspace!.id,
      deletedAt: null,
    };

    if (state) where.state = state;
    if (priority) where.priority = priority;
    if (assigneeId) where.assigneeId = assigneeId;
    if (teamId) where.teamId = teamId;

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { identifier: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [issues, total] = await Promise.all([
      fastify.prisma.issue.findMany({
        where,
        include: {
          assignee: {
            select: { id: true, name: true, image: true },
          },
          creator: {
            select: { id: true, name: true, image: true },
          },
          team: {
            select: { id: true, name: true, key: true, color: true },
          },
          workflowState: {
            select: { id: true, name: true, key: true, color: true },
          },
          labels: {
            select: { id: true, name: true, color: true },
          },
          _count: {
            select: { comments: { where: { deletedAt: null } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      fastify.prisma.issue.count({ where }),
    ]);

    return {
      issues: issues.map(issue => ({
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        description: issue.description,
        state: issue.state,
        priority: issue.priority,
        createdAt: issue.createdAt.toISOString(),
        updatedAt: issue.updatedAt.toISOString(),
        dueDate: issue.dueDate?.toISOString() || null,
        assignee: issue.assignee,
        creator: issue.creator,
        team: issue.team,
        workflowState: issue.workflowState,
        labels: issue.labels,
        commentCount: issue._count.comments,
      })),
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        hasMore: skip + issues.length < total,
      },
    };
  });

  // Get single issue
  fastify.get('/:issueId', { 
    preHandler: [requireAuth, extractWorkspace] 
  }, async (request: WorkspaceRequest, reply) => {
    const { issueId } = request.params as { issueId: string };

    const issue = await fastify.prisma.issue.findFirst({
      where: {
        id: issueId,
        workspaceId: request.workspace!.id,
        deletedAt: null,
      },
      include: {
        assignee: {
          select: { id: true, name: true, image: true, email: true },
        },
        creator: {
          select: { id: true, name: true, image: true, email: true },
        },
        team: {
          select: { id: true, name: true, key: true, color: true },
        },
        workflowState: {
          select: { id: true, name: true, key: true, color: true, category: true },
        },
        labels: {
          select: { id: true, name: true, color: true },
        },
        comments: {
          where: { deletedAt: null },
          include: {
            creator: {
              select: { id: true, name: true, image: true },
            },
            reactions: {
              where: { deletedAt: null },
              include: {
                user: {
                  select: { id: true, name: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        subscriptions: {
          where: { userId: (request as any).user!.id },
        },
      },
    });

    if (!issue) {
      return reply.status(404).send({ error: 'Issue not found' });
    }

    return {
      issue: {
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        description: issue.description,
        state: issue.state,
        priority: issue.priority,
        createdAt: issue.createdAt.toISOString(),
        updatedAt: issue.updatedAt.toISOString(),
        dueDate: issue.dueDate?.toISOString() || null,
        assignee: issue.assignee,
        creator: issue.creator,
        team: issue.team,
        workflowState: issue.workflowState,
        labels: issue.labels,
        comments: issue.comments.map(comment => ({
          id: comment.id,
          content: comment.content,
          createdAt: comment.createdAt.toISOString(),
          updatedAt: comment.updatedAt.toISOString(),
          creator: comment.creator,
          reactions: comment.reactions,
        })),
        isSubscribed: issue.subscriptions.length > 0,
      },
    };
  });

  // Create issue
  fastify.post('/', { 
    preHandler: [requireAuth, extractWorkspace] 
  }, async (request: WorkspaceRequest, reply) => {
    const parseResult = CreateIssueSchema.safeParse(request.body);
    
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Invalid input',
        details: parseResult.error.flatten(),
      });
    }

    const { title, description, teamId, priority, assigneeId, labelIds, dueDate } = parseResult.data;
    const userId = (request as any).user!.id;
    const workspaceId = request.workspace!.id;

    // Get team to generate identifier
    const team = await fastify.prisma.team.findFirst({
      where: { 
        id: teamId, 
        workspaceId,
        deletedAt: null,
      },
    });

    if (!team) {
      return reply.status(400).send({ error: 'Invalid team' });
    }

    // Get next issue number for this team
    const lastIssue = await fastify.prisma.issue.findFirst({
      where: { teamId },
      orderBy: { identifier: 'desc' },
    });

    const issueNumber = lastIssue 
      ? parseInt(lastIssue.identifier.split('-')[1]) + 1 
      : 1;
    const identifier = `${team.key}-${issueNumber}`;

    // Get default workflow state for this team
    const defaultState = await fastify.prisma.teamWorkflowState.findFirst({
      where: { 
        teamId, 
        isDefault: true,
      },
    });

    const issue = await fastify.prisma.issue.create({
      data: {
        identifier,
        title,
        description: description || {},
        workspaceId,
        teamId,
        creatorId: userId,
        priority: priority || 'NO_PRIORITY',
        assigneeId: assigneeId || null,
        workflowStateId: defaultState?.id,
        dueDate: dueDate ? new Date(dueDate) : null,
        labels: labelIds ? {
          connect: labelIds.map(id => ({ id })),
        } : undefined,
      },
      include: {
        assignee: {
          select: { id: true, name: true, image: true },
        },
        creator: {
          select: { id: true, name: true, image: true },
        },
        team: {
          select: { id: true, name: true, key: true, color: true },
        },
        workflowState: {
          select: { id: true, name: true, key: true, color: true },
        },
        labels: {
          select: { id: true, name: true, color: true },
        },
      },
    });

    // Create activity
    await fastify.prisma.activity.create({
      data: {
        workspaceId,
        issueId: issue.id,
        actorId: userId,
        type: 'ISSUE_CREATED',
        description: `created issue ${identifier}`,
      },
    });

    return reply.status(201).send({
      issue: {
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        description: issue.description,
        state: issue.state,
        priority: issue.priority,
        createdAt: issue.createdAt.toISOString(),
        updatedAt: issue.updatedAt.toISOString(),
        assignee: issue.assignee,
        creator: issue.creator,
        team: issue.team,
        workflowState: issue.workflowState,
        labels: issue.labels,
        commentCount: 0,
      },
    });
  });

  // Update issue
  fastify.patch('/:issueId', { 
    preHandler: [requireAuth, extractWorkspace] 
  }, async (request: WorkspaceRequest, reply) => {
    const { issueId } = request.params as { issueId: string };
    const userId = (request as any).user!.id;

    const parseResult = UpdateIssueSchema.safeParse(request.body);
    
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Invalid input',
        details: parseResult.error.flatten(),
      });
    }

    const { title, description, state, priority, assigneeId, labelIds, workflowStateId, dueDate } = parseResult.data;

    // Check if issue exists and user has access
    const existingIssue = await fastify.prisma.issue.findFirst({
      where: {
        id: issueId,
        workspaceId: request.workspace!.id,
        deletedAt: null,
      },
    });

    if (!existingIssue) {
      return reply.status(404).send({ error: 'Issue not found' });
    }

    // Build update data
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (state !== undefined) updateData.state = state;
    if (priority !== undefined) updateData.priority = priority;
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId;
    if (workflowStateId !== undefined) updateData.workflowStateId = workflowStateId;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

    // Handle labels separately
    if (labelIds !== undefined) {
      await fastify.prisma.issue.update({
        where: { id: issueId },
        data: {
          labels: {
            set: labelIds.map(id => ({ id })),
          },
        },
      });
    }

    const issue = await fastify.prisma.issue.update({
      where: { id: issueId },
      data: updateData,
      include: {
        assignee: {
          select: { id: true, name: true, image: true },
        },
        creator: {
          select: { id: true, name: true, image: true },
        },
        team: {
          select: { id: true, name: true, key: true, color: true },
        },
        workflowState: {
          select: { id: true, name: true, key: true, color: true },
        },
        labels: {
          select: { id: true, name: true, color: true },
        },
        _count: {
          select: { comments: { where: { deletedAt: null } } },
        },
      },
    });

    // Create activity for state change
    if (state && state !== existingIssue.state) {
      await fastify.prisma.activity.create({
        data: {
          workspaceId: request.workspace!.id,
          issueId: issue.id,
          actorId: userId,
          type: 'ISSUE_STATE_CHANGED',
          description: `changed state from ${existingIssue.state} to ${state}`,
          metadata: { from: existingIssue.state, to: state },
        },
      });
    }

    return {
      issue: {
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        description: issue.description,
        state: issue.state,
        priority: issue.priority,
        createdAt: issue.createdAt.toISOString(),
        updatedAt: issue.updatedAt.toISOString(),
        assignee: issue.assignee,
        creator: issue.creator,
        team: issue.team,
        workflowState: issue.workflowState,
        labels: issue.labels,
        commentCount: issue._count.comments,
      },
    };
  });

  // Delete issue (soft delete)
  fastify.delete('/:issueId', { 
    preHandler: [requireAuth, extractWorkspace] 
  }, async (request: WorkspaceRequest, reply) => {
    const { issueId } = request.params as { issueId: string };
    const userId = (request as any).user!.id;

    const issue = await fastify.prisma.issue.findFirst({
      where: {
        id: issueId,
        workspaceId: request.workspace!.id,
        deletedAt: null,
      },
    });

    if (!issue) {
      return reply.status(404).send({ error: 'Issue not found' });
    }

    await fastify.prisma.issue.update({
      where: { id: issueId },
      data: { deletedAt: new Date() },
    });

    // Create activity
    await fastify.prisma.activity.create({
      data: {
        workspaceId: request.workspace!.id,
        issueId: issue.id,
        actorId: userId,
        type: 'ISSUE_DELETED',
        description: `deleted issue ${issue.identifier}`,
      },
    });

    return { success: true };
  });

  // Get my assigned issues (grouped like Linear)
  fastify.get('/my-issues/grouped', {
    preHandler: [requireAuth, extractWorkspace]
  }, async (request: WorkspaceRequest, reply) => {
    const userId = (request as any).user!.id;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const baseWhere = {
      workspaceId: request.workspace!.id,
      assigneeId: userId,
      deletedAt: null,
      archivedAt: null,
      state: { not: 'CANCELLED' },
    };

    // Fetch all assigned issues
    const issues = await fastify.prisma.issue.findMany({
      where: baseWhere,
      include: {
        assignee: {
          select: { id: true, name: true, image: true },
        },
        creator: {
          select: { id: true, name: true, image: true },
        },
        team: {
          select: { id: true, name: true, key: true, color: true },
        },
        workflowState: {
          select: { id: true, name: true, key: true, color: true, category: true },
        },
        labels: {
          select: { id: true, name: true, color: true },
        },
        cycle: {
          select: { id: true, name: true, number: true, isActive: true },
        },
        _count: {
          select: { comments: { where: { deletedAt: null } } },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    // Group issues like Linear
    const overdue: typeof issues = [];
    const todayIssues: typeof issues = [];
    const upcoming: typeof issues = [];
    const noDueDate: typeof issues = [];
    const completedRecently: typeof issues = [];

    for (const issue of issues) {
      const isDone = issue.state === 'DONE' || issue.workflowState?.category === 'DONE';
      
      if (isDone && issue.completedAt) {
        const completedDate = new Date(issue.completedAt);
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        if (completedDate >= sevenDaysAgo) {
          completedRecently.push(issue);
        }
        continue;
      }

      if (!issue.dueDate) {
        noDueDate.push(issue);
        continue;
      }

      const dueDate = new Date(issue.dueDate);
      const dueDateStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

      if (dueDateStart < today) {
        overdue.push(issue);
      } else if (dueDateStart.getTime() === today.getTime()) {
        todayIssues.push(issue);
      } else {
        upcoming.push(issue);
      }
    }

    // Format issues for response
    const formatIssue = (issue: typeof issues[0]) => ({
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      state: issue.state,
      priority: issue.priority,
      dueDate: issue.dueDate?.toISOString() || null,
      completedAt: issue.completedAt?.toISOString() || null,
      createdAt: issue.createdAt.toISOString(),
      assignee: issue.assignee,
      creator: issue.creator,
      team: issue.team,
      workflowState: issue.workflowState,
      labels: issue.labels,
      cycle: issue.cycle,
      commentCount: issue._count.comments,
    });

    return {
      groups: [
        {
          id: 'overdue',
          title: 'Overdue',
          count: overdue.length,
          issues: overdue.map(formatIssue),
        },
        {
          id: 'today',
          title: 'Due today',
          count: todayIssues.length,
          issues: todayIssues.map(formatIssue),
        },
        {
          id: 'upcoming',
          title: 'Upcoming',
          count: upcoming.length,
          issues: upcoming.map(formatIssue),
        },
        {
          id: 'noDueDate',
          title: 'No due date',
          count: noDueDate.length,
          issues: noDueDate.map(formatIssue),
        },
        {
          id: 'completed',
          title: 'Completed recently',
          count: completedRecently.length,
          issues: completedRecently.map(formatIssue),
        },
      ],
      stats: {
        totalAssigned: issues.length,
        overdue: overdue.length,
        dueToday: todayIssues.length,
        completedThisWeek: completedRecently.length,
      },
    };
  });

  // Bulk update issues
  fastify.post('/bulk-update', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const userId = (request as any).user!.id;
    const { issueIds, updates } = request.body as {
      issueIds: string[];
      updates: {
        state?: string;
        priority?: string;
        assigneeId?: string;
        cycleId?: string | null;
        labelIds?: string[];
      };
    };

    if (!issueIds || issueIds.length === 0) {
      return reply.status(400).send({ error: 'No issue IDs provided' });
    }

    const issues = await fastify.prisma.issue.findMany({
      where: {
        id: { in: issueIds },
        workspaceId: request.workspace!.id,
        deletedAt: null,
      },
    });

    if (issues.length !== issueIds.length) {
      return reply.status(400).send({ error: 'Some issues not found' });
    }

    const updateData: any = {};
    if (updates.state) updateData.state = updates.state;
    if (updates.priority) updateData.priority = updates.priority;
    if (updates.assigneeId !== undefined) updateData.assigneeId = updates.assigneeId;
    if (updates.cycleId !== undefined) updateData.cycleId = updates.cycleId;

    await fastify.prisma.issue.updateMany({
      where: { id: { in: issueIds } },
      data: updateData,
    });

    if (updates.labelIds) {
      for (const issueId of issueIds) {
        await fastify.prisma.issue.update({
          where: { id: issueId },
          data: {
            labels: {
              set: updates.labelIds.map(id => ({ id })),
            },
          },
        });
      }
    }

    if (updates.state) {
      for (const issue of issues) {
        await fastify.prisma.activity.create({
          data: {
            workspaceId: request.workspace!.id,
            issueId: issue.id,
            actorId: userId,
            type: 'ISSUE_STATE_CHANGED',
            description: `changed state to ${updates.state}`,
            metadata: { to: updates.state },
          },
        });
      }
    }

    return {
      success: true,
      updatedCount: issueIds.length,
    };
  });

  // Bulk delete issues
  fastify.post('/bulk-delete', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const userId = (request as any).user!.id;
    const { issueIds } = request.body as { issueIds: string[] };

    if (!issueIds || issueIds.length === 0) {
      return reply.status(400).send({ error: 'No issue IDs provided' });
    }

    const issues = await fastify.prisma.issue.findMany({
      where: {
        id: { in: issueIds },
        workspaceId: request.workspace!.id,
        deletedAt: null,
      },
    });

    if (issues.length !== issueIds.length) {
      return reply.status(400).send({ error: 'Some issues not found' });
    }

    await fastify.prisma.issue.updateMany({
      where: { id: { in: issueIds } },
      data: { deletedAt: new Date() },
    });

    for (const issue of issues) {
      await fastify.prisma.activity.create({
        data: {
          workspaceId: request.workspace!.id,
          issueId: issue.id,
          actorId: userId,
          type: 'ISSUE_DELETED',
          description: `deleted issue ${issue.identifier}`,
        },
      });
    }

    return {
      success: true,
      deletedCount: issueIds.length,
    };
  });
}
