import type { FastifyInstance } from 'fastify';
import { requireAuth, type AuthenticatedRequest } from '../../plugins/auth.js';
import { extractWorkspace, type WorkspaceRequest } from '../../middleware/workspace.js';

interface RawIssueResult {
  id: string;
  identifier: string;
  title: string;
  state: string;
  priority: string;
  team_id: string | null;
  team_name: string | null;
  team_key: string | null;
  team_color: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
  assignee_image: string | null;
  workflow_state_id: string | null;
  workflow_state_name: string | null;
  workflow_state_color: string | null;
  rank: number | null;
}

interface RawNoteResult {
  id: string;
  title: string;
  slug: string;
  emoji: string | null;
  creator_id: string | null;
  creator_name: string | null;
  creator_image: string | null;
  rank: number | null;
}

export default async function searchRoutes(fastify: FastifyInstance) {
  // Global search across workspace (enhanced with full-text)
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
    const results: Array<
      | { type: 'issue'; id: string; title: string; subtitle: string; url: string; meta: Record<string, unknown> }
      | { type: 'note'; id: string; title: string; subtitle: string; url: string; meta: Record<string, unknown> }
      | { type: 'user'; id: string; title: string; subtitle: string; url: string; meta: Record<string, unknown> }
    > = [];
    const searchTerm = q.trim();

    // Search issues with full-text when available
    if (!type || type === 'issue' || type === 'all') {
      let issues: RawIssueResult[] = [];
      
      try {
        // Try full-text search first
        issues = await fastify.prisma.$queryRaw<RawIssueResult[]>`
          SELECT 
            i.id,
            i.identifier,
            i.title,
            i.state,
            i.priority,
            t.id as team_id,
            t.name as team_name,
            t.key as team_key,
            t.color as team_color,
            u.id as assignee_id,
            u.name as assignee_name,
            u.image as assignee_image,
            ws.id as workflow_state_id,
            ws.name as workflow_state_name,
            ws.color as workflow_state_color,
            ts_rank(i."search_vector", plainto_tsquery('english', ${searchTerm})) as rank
          FROM issues i
          LEFT JOIN teams t ON i.team_id = t.id
          LEFT JOIN users u ON i.assignee_id = u.id
          LEFT JOIN team_workflow_states ws ON i.workflow_state_id = ws.id
          WHERE i.workspace_id = ${workspaceId}
            AND i.deleted_at IS NULL
            AND (
              i."search_vector" @@ plainto_tsquery('english', ${searchTerm})
              OR i.title ILIKE ${`%${searchTerm}%`}
              OR i.identifier ILIKE ${`%${searchTerm}%`}
            )
          ORDER BY rank DESC NULLS LAST, i.updated_at DESC
          LIMIT ${limitNum}
        `;
      } catch (e) {
        // Fallback to basic search if full-text not available
        const fallbackIssues = await fastify.prisma.issue.findMany({
          where: {
            workspaceId,
            deletedAt: null,
            OR: [
              { title: { contains: searchTerm, mode: 'insensitive' } },
              { identifier: { contains: searchTerm, mode: 'insensitive' } },
            ],
          },
          include: {
            assignee: { select: { id: true, name: true, image: true } },
            team: { select: { id: true, name: true, key: true, color: true } },
            workflowState: { select: { id: true, name: true, color: true } },
          },
          take: limitNum,
        });
        issues = fallbackIssues.map((i) => ({
          id: i.id,
          identifier: i.identifier,
          title: i.title,
          state: i.state,
          priority: i.priority,
          team_id: i.team?.id ?? null,
          team_name: i.team?.name ?? null,
          team_key: i.team?.key ?? null,
          team_color: i.team?.color ?? null,
          assignee_id: i.assignee?.id ?? null,
          assignee_name: i.assignee?.name ?? null,
          assignee_image: i.assignee?.image ?? null,
          workflow_state_id: i.workflowState?.id ?? null,
          workflow_state_name: i.workflowState?.name ?? null,
          workflow_state_color: i.workflowState?.color ?? null,
          rank: null,
        }));
      }

      for (const i of issues) {
        results.push({
          type: 'issue' as const,
          id: i.id,
          title: i.title,
          subtitle: i.identifier,
          url: `/${request.workspace!.slug}/issues/${i.id}`,
          meta: {
            state: i.state,
            priority: i.priority,
            assignee: i.assignee_id ? { id: i.assignee_id, name: i.assignee_name, image: i.assignee_image } : null,
            team: i.team_id ? { id: i.team_id, name: i.team_name, key: i.team_key, color: i.team_color } : null,
            workflowState: i.workflow_state_id ? { id: i.workflow_state_id, name: i.workflow_state_name, color: i.workflow_state_color } : null,
          },
        });
      }
    }

    // Search notes with full-text when available
    if (!type || type === 'note' || type === 'all') {
      let notes: RawNoteResult[] = [];
      
      try {
        notes = await fastify.prisma.$queryRaw<RawNoteResult[]>`
          SELECT 
            n.id,
            n.title,
            n.slug,
            n.emoji,
            u.id as creator_id,
            u.name as creator_name,
            u.image as creator_image,
            ts_rank(n."search_vector", plainto_tsquery('english', ${searchTerm})) as rank
          FROM notes n
          LEFT JOIN users u ON n.created_by_id = u.id
          WHERE n.workspace_id = ${workspaceId}
            AND n.deleted_at IS NULL
            AND n.is_archived = false
            AND (
              n."search_vector" @@ plainto_tsquery('english', ${searchTerm})
              OR n.title ILIKE ${`%${searchTerm}%`}
            )
          ORDER BY rank DESC NULLS LAST, n.updated_at DESC
          LIMIT ${limitNum}
        `;
      } catch (e) {
        const fallbackNotes = await fastify.prisma.note.findMany({
          where: {
            workspaceId,
            deletedAt: null,
            isArchived: false,
            title: { contains: searchTerm, mode: 'insensitive' },
          },
          include: {
            creator: { select: { id: true, name: true, image: true } },
          },
          take: limitNum,
        });
        notes = fallbackNotes.map((n) => ({
          id: n.id,
          title: n.title,
          slug: n.slug,
          emoji: n.emoji,
          creator_id: n.creator?.id ?? null,
          creator_name: n.creator?.name ?? null,
          creator_image: n.creator?.image ?? null,
          rank: null,
        }));
      }

      for (const n of notes) {
        results.push({
          type: 'note' as const,
          id: n.id,
          title: n.title,
          subtitle: n.emoji || '📄',
          url: `/${request.workspace!.slug}/notes/${n.slug}`,
          meta: {
            creator: n.creator_id ? { id: n.creator_id, name: n.creator_name, image: n.creator_image } : null,
          },
        });
      }
    }

    // Search users
    if (!type || type === 'user' || type === 'all') {
      const members = await fastify.prisma.workspaceMember.findMany({
        where: {
          workspaceId,
          deletedAt: null,
          user: {
            OR: [
              { name: { contains: searchTerm, mode: 'insensitive' } },
              { email: { contains: searchTerm, mode: 'insensitive' } },
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

    // Sort by relevance
    results.sort((a, b) => {
      const aStarts = a.title.toLowerCase().startsWith(searchTerm.toLowerCase());
      const bStarts = b.title.toLowerCase().startsWith(searchTerm.toLowerCase());
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return 0;
    });

    return {
      results: results.slice(0, limitNum),
      meta: {
        query: searchTerm,
        total: results.length,
      },
    };
  });

  // Advanced search with filters
  fastify.get('/advanced', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { q, filters, page = '1', limit = '20' } = request.query as {
      q: string;
      filters?: string;
      page?: string;
      limit?: string;
    };

    const workspaceId = request.workspace!.id;
    const pageNum = parseInt(page, 10);
    const limitNum = Math.min(parseInt(limit, 10), 50);
    const skip = (pageNum - 1) * limitNum;

    const parsedFilters = filters ? JSON.parse(filters) : {};

    const issueWhere: any = {
      workspaceId,
      deletedAt: null,
    };

    if (q && q.length >= 2) {
      issueWhere.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { identifier: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (parsedFilters.state) issueWhere.state = parsedFilters.state;
    if (parsedFilters.priority) issueWhere.priority = parsedFilters.priority;
    if (parsedFilters.assigneeId) issueWhere.assigneeId = parsedFilters.assigneeId;
    if (parsedFilters.teamId) issueWhere.teamId = parsedFilters.teamId;
    if (parsedFilters.labelIds?.length > 0) {
      issueWhere.labels = { some: { id: { in: parsedFilters.labelIds } } };
    }

    const [issues, totalIssues] = await Promise.all([
      fastify.prisma.issue.findMany({
        where: issueWhere,
        include: {
          assignee: { select: { id: true, name: true, image: true } },
          team: { select: { id: true, name: true, key: true, color: true } },
          labels: { select: { id: true, name: true, color: true } },
          _count: { select: { comments: { where: { deletedAt: null } } } },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limitNum,
      }),
      fastify.prisma.issue.count({ where: issueWhere }),
    ]);

    return {
      issues: issues.map(issue => ({
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        state: issue.state,
        priority: issue.priority,
        createdAt: issue.createdAt.toISOString(),
        updatedAt: issue.updatedAt.toISOString(),
        assignee: issue.assignee,
        team: issue.team,
        labels: issue.labels,
        commentCount: issue._count.comments,
      })),
      meta: {
        page: pageNum,
        limit: limitNum,
        total: totalIssues,
        hasMore: skip + issues.length < totalIssues,
      },
    };
  });
}
