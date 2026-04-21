import type { FastifyInstance } from 'fastify';
import { requireAuth, type AuthenticatedRequest } from '../../plugins/auth.js';
import { extractWorkspace, type WorkspaceRequest } from '../../middleware/workspace.js';

export default async function issueRelationsRoutes(fastify: FastifyInstance) {
  // Get all relations for an issue
  fastify.get('/:issueId/relations', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { issueId } = request.params as { issueId: string };
    const workspaceId = request.workspace!.id;

    const issue = await fastify.prisma.issue.findFirst({
      where: {
        OR: [{ id: issueId }, { identifier: issueId }],
        workspaceId,
        deletedAt: null,
      },
    });

    if (!issue) {
      return reply.status(404).send({ error: 'Issue not found' });
    }

    // Get relations where this issue is the source
    const relations = await fastify.prisma.issueRelation.findMany({
      where: {
        issueId: issue.id,
        deletedAt: null,
      },
      include: {
        relatedIssue: {
          select: {
            id: true,
            identifier: true,
            title: true,
            state: true,
            priority: true,
            assignee: {
              select: { id: true, name: true, image: true },
            },
            team: {
              select: { id: true, key: true, color: true },
            },
          },
        },
      },
    });

    // Get relations where this issue is the target (reverse relations)
    const reverseRelations = await fastify.prisma.issueRelation.findMany({
      where: {
        relatedIssueId: issue.id,
        deletedAt: null,
      },
      include: {
        issue: {
          select: {
            id: true,
            identifier: true,
            title: true,
            state: true,
            priority: true,
            assignee: {
              select: { id: true, name: true, image: true },
            },
            team: {
              select: { id: true, key: true, color: true },
            },
          },
        },
      },
    });

    return {
      relations: [
        // Outgoing relations
        ...relations.map(r => ({
          id: r.id,
          type: r.type,
          direction: 'outgoing',
          issue: r.relatedIssue,
        })),
        // Incoming relations (reverse the type for display)
        ...reverseRelations.map(r => ({
          id: r.id,
          type: reverseRelationType(r.type),
          direction: 'incoming',
          issue: r.issue,
        })),
      ],
    };
  });

  // Create relation
  fastify.post('/:issueId/relations', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { issueId } = request.params as { issueId: string };
    const userId = request.user!.id;
    const { relatedIssueId, type } = request.body as {
      relatedIssueId: string;
      type: 'RELATES_TO' | 'BLOCKS' | 'BLOCKED_BY' | 'DUPLICATES' | 'DUPLICATED_BY';
    };
    const workspaceId = request.workspace!.id;

    // Validate issue exists
    const issue = await fastify.prisma.issue.findFirst({
      where: {
        OR: [{ id: issueId }, { identifier: issueId }],
        workspaceId,
        deletedAt: null,
      },
    });

    if (!issue) {
      return reply.status(404).send({ error: 'Issue not found' });
    }

    // Validate related issue exists
    const relatedIssue = await fastify.prisma.issue.findFirst({
      where: {
        id: relatedIssueId,
        workspaceId,
        deletedAt: null,
      },
    });

    if (!relatedIssue) {
      return reply.status(404).send({ error: 'Related issue not found' });
    }

    // Prevent self-relations
    if (issue.id === relatedIssueId) {
      return reply.status(400).send({ error: 'Cannot relate issue to itself' });
    }

    // Check if relation already exists
    const existing = await fastify.prisma.issueRelation.findFirst({
      where: {
        issueId: issue.id,
        relatedIssueId,
        type,
        deletedAt: null,
      },
    });

    if (existing) {
      return reply.status(400).send({ error: 'Relation already exists' });
    }

    const relation = await fastify.prisma.issueRelation.create({
      data: {
        issueId: issue.id,
        relatedIssueId,
        type,
      },
      include: {
        relatedIssue: {
          select: {
            id: true,
            identifier: true,
            title: true,
            state: true,
            priority: true,
            assignee: {
              select: { id: true, name: true, image: true },
            },
            team: {
              select: { id: true, key: true, color: true },
            },
          },
        },
      },
    });

    // Create activity
    await fastify.prisma.activity.create({
      data: {
        workspaceId,
        issueId: issue.id,
        actorId: userId,
        type: 'ISSUE_RELATED',
        description: `${type.toLowerCase().replace(/_/g, ' ')} ${relatedIssue.identifier}`,
        metadata: { relatedIssueId, type },
      },
    });

    return reply.status(201).send({
      relation: {
        id: relation.id,
        type: relation.type,
        direction: 'outgoing',
        issue: relation.relatedIssue,
      },
    });
  });

  // Delete relation
  fastify.delete('/:issueId/relations/:relationId', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { issueId, relationId } = request.params as { issueId: string; relationId: string };
    const workspaceId = request.workspace!.id;

    const issue = await fastify.prisma.issue.findFirst({
      where: {
        OR: [{ id: issueId }, { identifier: issueId }],
        workspaceId,
        deletedAt: null,
      },
    });

    if (!issue) {
      return reply.status(404).send({ error: 'Issue not found' });
    }

    const relation = await fastify.prisma.issueRelation.findFirst({
      where: {
        id: relationId,
        OR: [
          { issueId: issue.id },
          { relatedIssueId: issue.id },
        ],
        deletedAt: null,
      },
    });

    if (!relation) {
      return reply.status(404).send({ error: 'Relation not found' });
    }

    await fastify.prisma.issueRelation.update({
      where: { id: relationId },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  });

  // Search issues to relate
  fastify.get('/search-for-relation', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { q, excludeIssueId, limit = '10' } = request.query as {
      q: string;
      excludeIssueId?: string;
      limit?: string;
    };

    if (!q || q.length < 2) {
      return { issues: [] };
    }

    const workspaceId = request.workspace!.id;
    const limitNum = parseInt(limit, 10);

    const issues = await fastify.prisma.issue.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        id: excludeIssueId ? { not: excludeIssueId } : undefined,
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { identifier: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        identifier: true,
        title: true,
        state: true,
        team: {
          select: { key: true, color: true },
        },
      },
      take: limitNum,
      orderBy: { updatedAt: 'desc' },
    });

    return { issues };
  });
}

// Helper to reverse relation type for display
function reverseRelationType(type: string): string {
  const reversals: Record<string, string> = {
    'BLOCKS': 'BLOCKED_BY',
    'BLOCKED_BY': 'BLOCKS',
    'DUPLICATES': 'DUPLICATED_BY',
    'DUPLICATED_BY': 'DUPLICATES',
    'RELATES_TO': 'RELATES_TO',
  };
  return reversals[type] || type;
}
