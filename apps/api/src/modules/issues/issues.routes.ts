import type { FastifyInstance } from 'fastify';
import { requireAuth, type AuthenticatedRequest } from '../../plugins/auth.js';
import { extractWorkspace, type WorkspaceRequest } from '../../middleware/workspace.js';
import { CreateIssueSchema, UpdateIssueSchema } from '@flowpigdev/contracts';

type IssueState = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'CANCELLED';

export default async function issueRoutes(fastify: FastifyInstance) {
  // List issues in workspace
  fastify.get('/', { 
    preHandler: [requireAuth, extractWorkspace] 
  }, async (request: WorkspaceRequest, reply) => {
    const { state, priority, assigneeId, assignee, teamId, team, projectId, search, sort = 'createdAt', order = 'desc', page = '1', limit = '50' } = 
      request.query as { 
        state?: string; 
        priority?: string; 
        assigneeId?: string;
        assignee?: string;
        teamId?: string;
        team?: string;
        projectId?: string;
        search?: string;
        sort?: string;
        order?: 'asc' | 'desc';
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

    if (state) {
      const states = state.split(',').map((value) => value.trim()).filter(Boolean);
      where.state = states.length > 1 ? { in: states } : states[0];
    }

    if (priority) {
      const priorities = priority.split(',').map((value) => value.trim()).filter(Boolean);
      where.priority = priorities.length > 1 ? { in: priorities } : priorities[0];
    }

    if (assigneeId || assignee) {
      const assigneeValues = (assigneeId || assignee || '').split(',').map((value) => value.trim()).filter(Boolean);
      where.assigneeId = assigneeValues.length > 1 ? { in: assigneeValues } : assigneeValues[0];
    }

    if (teamId || team) {
      const teamValues = (teamId || team || '').split(',').map((value) => value.trim()).filter(Boolean);
      where.teamId = teamValues.length > 1 ? { in: teamValues } : teamValues[0];
    }

    if (projectId) {
      const projectValues = projectId.split(',').map((value) => value.trim()).filter(Boolean);
      where.projectId = projectValues.length > 1 ? { in: projectValues } : projectValues[0];
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { identifier: { contains: search, mode: 'insensitive' } },
      ];
    }

    const allowedSortFields = new Set(['createdAt', 'updatedAt', 'priority', 'dueDate', 'title']);
    const sortField = allowedSortFields.has(sort) ? sort : 'createdAt';
    const sortOrder = order === 'asc' ? 'asc' : 'desc';

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
          project: {
            select: { id: true, name: true },
          },
          cycle: {
            select: { id: true, number: true, isActive: true },
          },
          workflowState: {
            select: { id: true, name: true, key: true, color: true, category: true },
          },
          labels: {
            select: { id: true, name: true, color: true },
          },
          _count: {
            select: { comments: { where: { deletedAt: null } }, children: { where: { deletedAt: null } } },
          },
        },
        orderBy: { [sortField]: sortOrder },
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
        project: issue.project,
        cycle: issue.cycle,
        workflowState: issue.workflowState,
        labels: issue.labels,
        commentCount: issue._count.comments,
        childrenCount: issue._count.children,
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
        project: {
          select: { id: true, name: true },
        },
        cycle: {
          select: { id: true, number: true, name: true, isActive: true },
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
              select: { id: true, name: true, email: true, image: true },
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
        relations: {
          where: { deletedAt: null },
          include: {
            relatedIssue: {
              select: { id: true, identifier: true, title: true, state: true },
            },
          },
        },
        relatedTo: {
          where: { deletedAt: null },
          include: {
            issue: {
              select: { id: true, identifier: true, title: true, state: true },
            },
          },
        },
        parent: {
          select: { id: true, identifier: true, title: true, state: true },
        },
        children: {
          where: { deletedAt: null },
          select: { id: true, identifier: true, title: true, state: true, priority: true },
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
        project: issue.project,
        cycle: issue.cycle ? {
          id: issue.cycle.id,
          number: issue.cycle.number,
          name: issue.cycle.name,
          isActive: issue.cycle.isActive,
        } : null,
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
        relatedIssues: [
          ...issue.relations.map((relation) => ({
            id: relation.relatedIssue.id,
            identifier: relation.relatedIssue.identifier,
            title: relation.relatedIssue.title,
            state: relation.relatedIssue.state,
            type: relation.type.toLowerCase(),
          })),
          ...issue.relatedTo.map((relation) => ({
            id: relation.issue.id,
            identifier: relation.issue.identifier,
            title: relation.issue.title,
            state: relation.issue.state,
            type: relation.type.toLowerCase(),
          })),
        ],
        isSubscribed: issue.subscriptions.length > 0,
        parent: issue.parent,
        children: issue.children,
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

    const { title, description, teamId, projectId, cycleId, priority, assigneeId, labelIds, dueDate, parentId } = parseResult.data;
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

    if (projectId) {
      const project = await fastify.prisma.project.findFirst({
        where: {
          id: projectId,
          workspaceId,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!project) {
        return reply.status(400).send({ error: 'Invalid project' });
      }
    }

    if (cycleId) {
      const cycle = await fastify.prisma.cycle.findFirst({
        where: {
          id: cycleId,
          workspaceId,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!cycle) {
        return reply.status(400).send({ error: 'Invalid cycle' });
      }
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
        projectId: projectId || null,
        cycleId: cycleId || null,
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

    const { title, description, state, priority, projectId, cycleId, assigneeId, labelIds, workflowStateId, dueDate, parentId } = parseResult.data;

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

    if (projectId) {
      const project = await fastify.prisma.project.findFirst({
        where: {
          id: projectId,
          workspaceId: request.workspace!.id,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!project) {
        return reply.status(400).send({ error: 'Invalid project' });
      }
    }

    if (cycleId) {
      const cycle = await fastify.prisma.cycle.findFirst({
        where: {
          id: cycleId,
          workspaceId: request.workspace!.id,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!cycle) {
        return reply.status(400).send({ error: 'Invalid cycle' });
      }
    }

    if (parentId) {
      const parent = await fastify.prisma.issue.findFirst({
        where: {
          id: parentId,
          workspaceId: request.workspace!.id,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!parent) {
        return reply.status(400).send({ error: 'Invalid parent issue' });
      }
    }

    // Build update data
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (state !== undefined) updateData.state = state;
    if (priority !== undefined) updateData.priority = priority;
    if (projectId !== undefined) updateData.projectId = projectId || null;
    if (cycleId !== undefined) updateData.cycleId = cycleId || null;
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId;
    if (workflowStateId !== undefined) updateData.workflowStateId = workflowStateId;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (parseResult.data.parentId !== undefined) updateData.parentId = parseResult.data.parentId || null;

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

    // Create activities for changes
    const workspaceId = request.workspace!.id;
    if (state && state !== existingIssue.state) {
      await fastify.prisma.activity.create({
        data: {
          workspaceId,
          issueId: issue.id,
          actorId: userId,
          type: 'ISSUE_STATE_CHANGED',
          description: `changed state from ${existingIssue.state} to ${state}`,
          metadata: { from: existingIssue.state, to: state },
        },
      });
    }
    if (priority && priority !== existingIssue.priority) {
      await fastify.prisma.activity.create({
        data: {
          workspaceId,
          issueId: issue.id,
          actorId: userId,
          type: 'ISSUE_PRIORITY_CHANGED',
          description: `changed priority from ${existingIssue.priority} to ${priority}`,
          metadata: { from: existingIssue.priority, to: priority },
        },
      });
    }
    if (assigneeId !== undefined && assigneeId !== existingIssue.assigneeId) {
      await fastify.prisma.activity.create({
        data: {
          workspaceId,
          issueId: issue.id,
          actorId: userId,
          type: 'ISSUE_ASSIGNED',
          description: assigneeId ? `assigned to user` : `unassigned`,
          metadata: { assigneeId: assigneeId || null },
        },
      });
    }
    if (title && title !== existingIssue.title) {
      await fastify.prisma.activity.create({
        data: {
          workspaceId,
          issueId: issue.id,
          actorId: userId,
          type: 'ISSUE_UPDATED',
          description: `updated title`,
          metadata: { field: 'title' },
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
      state: { not: 'CANCELLED' as IssueState },
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

  // Get issue activities
  fastify.get('/:issueId/activities', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { issueId } = request.params as { issueId: string };

    const activities = await fastify.prisma.activity.findMany({
      where: {
        issueId,
        workspaceId: request.workspace!.id,
      },
      include: {
        actor: {
          select: { id: true, name: true, image: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      activities: activities.map((a) => ({
        id: a.id,
        type: a.type,
        description: a.description,
        metadata: a.metadata,
        createdAt: a.createdAt.toISOString(),
        actor: a.actor,
      })),
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
