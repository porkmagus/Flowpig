import type { FastifyInstance } from 'fastify';
import { requireAuth, type AuthenticatedRequest } from '../../plugins/auth.js';
import { extractWorkspace, type WorkspaceRequest } from '../../middleware/workspace.js';

export default async function searchRoutes(fastify: FastifyInstance) {
  // Global search across workspace
  fastify.get('/workspace/:workspaceId', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { q, type, limit = '20' } = request.query as { 
      q: string; 
      type?: 'issue' | 'note' | 'user' | 'all';
      limit?: string;
    };

    if (!q || q.length < 2) {
      return reply.status(400).send({ error: 'Query must be at least 2 characters' });
    }

    const workspaceId = request.workspace!.id;
    const limitNum = parseInt(limit, 10);
    const results: any[] = [];

    // Search issues
    if (!type || type === 'issue' || type === 'all') {
      const issues = await fastify.prisma.issue.findMany({
        where: {
          workspaceId,
          deletedAt: null,
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { identifier: { contains: q, mode: 'insensitive' } },
          ],
        },
        include: {
          assignee: { select: { id: true, name: true, image: true } },
          team: { select: { id: true, name: true, key: true, color: true } },
          workflowState: { select: { id: true, name: true, color: true } },
        },
        take: limitNum,
      });

      results.push(...issues.map(i => ({
        type: 'issue' as const,
        id: i.id,
        title: i.title,
        subtitle: i.identifier,
        url: `/${request.workspace!.slug}/issues/${i.id}`,
        meta: {
          state: i.state,
          priority: i.priority,
          assignee: i.assignee,
          team: i.team,
          workflowState: i.workflowState,
        },
      })));
    }

    // Search notes
    if (!type || type === 'note' || type === 'all') {
      const notes = await fastify.prisma.note.findMany({
        where: {
          workspaceId,
          deletedAt: null,
          isArchived: false,
          title: { contains: q, mode: 'insensitive' },
        },
        include: {
          creator: { select: { id: true, name: true, image: true } },
        },
        take: limitNum,
      });

      results.push(...notes.map(n => ({
        type: 'note' as const,
        id: n.id,
        title: n.title,
        subtitle: n.emoji || '📄',
        url: `/${request.workspace!.slug}/notes/${n.slug}`,
        meta: {
          creator: n.creator,
          updatedAt: n.updatedAt.toISOString(),
        },
      })));
    }

    // Search users
    if (!type || type === 'user' || type === 'all') {
      const members = await fastify.prisma.workspaceMember.findMany({
        where: {
          workspaceId,
          deletedAt: null,
          user: {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          },
        },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
        take: limitNum,
      });

      results.push(...members.map(m => ({
        type: 'user' as const,
        id: m.user.id,
        title: m.user.name || m.user.email,
        subtitle: m.user.email,
        url: `/${request.workspace!.slug}/team`,
        meta: {
          role: m.role,
          image: m.user.image,
        },
      })));
    }

    // Sort by relevance (simple: title starts with query first)
    results.sort((a, b) => {
      const aStarts = a.title.toLowerCase().startsWith(q.toLowerCase());
      const bStarts = b.title.toLowerCase().startsWith(q.toLowerCase());
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return 0;
    });

    return {
      results: results.slice(0, limitNum),
      meta: {
        query: q,
        total: results.length,
      },
    };
  });
}
