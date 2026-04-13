import type { FastifyInstance } from 'fastify';
import { requireAuth, type AuthenticatedRequest } from '../../plugins/auth.js';
import { extractWorkspace, type WorkspaceRequest } from '../../middleware/workspace.js';

export default async function analyticsRoutes(fastify: FastifyInstance) {
  // Get workspace overview stats
  fastify.get('/overview', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const workspaceId = request.workspace!.id;
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalIssues,
      openIssues,
      completedIssues30d,
      avgCycleTime,
      activeCycles,
      totalTeams,
    ] = await Promise.all([
      // Total issues
      fastify.prisma.issue.count({
        where: { workspaceId, deletedAt: null },
      }),
      // Open issues
      fastify.prisma.issue.count({
        where: { 
          workspaceId, 
          deletedAt: null, 
          state: { not: 'DONE' },
        },
      }),
      // Completed in last 30 days
      fastify.prisma.issue.count({
        where: {
          workspaceId,
          deletedAt: null,
          state: 'DONE',
          completedAt: { gte: thirtyDaysAgo },
        },
      }),
      // Average cycle time (days from creation to completion)
      fastify.prisma.issue.findMany({
        where: {
          workspaceId,
          deletedAt: null,
          state: 'DONE',
          completedAt: { not: null },
        },
        select: {
          createdAt: true,
          completedAt: true,
        },
        take: 100,
        orderBy: { completedAt: 'desc' },
      }),
      // Active cycles
      fastify.prisma.cycle.count({
        where: { workspaceId, isActive: true, deletedAt: null },
      }),
      // Total teams
      fastify.prisma.team.count({
        where: { workspaceId, deletedAt: null },
      }),
    ]);

    // Calculate average cycle time
    const cycleTimes = avgCycleTime.map(issue => {
      const created = new Date(issue.createdAt);
      const completed = new Date(issue.completedAt!);
      return (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    });
    const avgCycleTimeDays = cycleTimes.length > 0
      ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length
      : 0;

    return {
      totalIssues,
      openIssues,
      completedIssues30d,
      avgCycleTimeDays: Math.round(avgCycleTimeDays * 10) / 10,
      activeCycles,
      totalTeams,
      completionRate: totalIssues > 0 
        ? Math.round((completedIssues30d / totalIssues) * 100) 
        : 0,
    };
  });

  // Get velocity data (issues completed per week)
  fastify.get('/velocity', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const workspaceId = request.workspace!.id;
    const { weeks = '12' } = request.query as { weeks?: string };
    const numWeeks = parseInt(weeks, 10);

    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - (numWeeks * 7));

    // Get completed issues grouped by week
    const completedIssues = await fastify.prisma.issue.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        state: 'DONE',
        completedAt: { gte: startDate },
      },
      select: {
        completedAt: true,
        estimate: true,
      },
      orderBy: { completedAt: 'asc' },
    });

    // Group by week
    const weeklyData: Record<string, { count: number; points: number }> = {};
    
    for (let i = 0; i < numWeeks; i++) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - ((numWeeks - i) * 7));
      weekStart.setHours(0, 0, 0, 0);
      const weekKey = weekStart.toISOString().split('T')[0];
      weeklyData[weekKey] = { count: 0, points: 0 };
    }

    for (const issue of completedIssues) {
      const completed = new Date(issue.completedAt!);
      // Find which week this belongs to
      const weekStart = new Date(completed);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (weeklyData[weekKey]) {
        weeklyData[weekKey].count++;
        weeklyData[weekKey].points += issue.estimate || 0;
      }
    }

    const velocityData = Object.entries(weeklyData).map(([date, data]) => ({
      date,
      count: data.count,
      points: data.points,
    }));

    // Calculate rolling average
    const avgVelocity = velocityData.length > 0
      ? Math.round(velocityData.reduce((sum, w) => sum + w.count, 0) / velocityData.length * 10) / 10
      : 0;
    const avgPoints = velocityData.length > 0
      ? Math.round(velocityData.reduce((sum, w) => sum + w.points, 0) / velocityData.length * 10) / 10
      : 0;

    return {
      data: velocityData,
      average: {
        issuesPerWeek: avgVelocity,
        pointsPerWeek: avgPoints,
      },
      trend: velocityData.length >= 2
        ? velocityData[velocityData.length - 1].count - velocityData[velocityData.length - 2].count
        : 0,
    };
  });

  // Get burndown chart data for active cycle
  fastify.get('/burndown/:cycleId', {
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
    });

    if (!cycle) {
      return reply.status(404).send({ error: 'Cycle not found' });
    }

    // Get all issues in cycle
    const issues = await fastify.prisma.issue.findMany({
      where: {
        cycleId,
        deletedAt: null,
      },
      select: {
        id: true,
        state: true,
        estimate: true,
        completedAt: true,
        createdAt: true,
      },
    });

    const totalIssues = issues.length;
    const totalPoints = issues.reduce((sum, i) => sum + (i.estimate || 0), 0);

    // Generate burndown data points
    const startDate = new Date(cycle.startDate);
    const endDate = new Date(cycle.endDate);
    const now = new Date();
    const days: Array<{
      date: string;
      totalRemaining: number;
      pointsRemaining: number;
      idealRemaining: number;
      idealPoints: number;
    }> = [];

    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    for (let d = new Date(startDate); d <= endDate && d <= now; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);

      // Count remaining issues/points at end of this day
      const completedByDay = issues.filter(i => 
        i.state === 'DONE' && 
        i.completedAt && 
        new Date(i.completedAt) <= dayEnd
      );
      
      const completedCount = completedByDay.length;
      const completedPoints = completedByDay.reduce((sum, i) => sum + (i.estimate || 0), 0);
      
      const day = Math.ceil((d.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const progress = totalDays > 0 ? day / totalDays : 0;
      
      days.push({
        date: dateStr,
        totalRemaining: totalIssues - completedCount,
        pointsRemaining: totalPoints - completedPoints,
        idealRemaining: Math.round(totalIssues * (1 - progress)),
        idealPoints: Math.round(totalPoints * (1 - progress)),
      });
    }

    // Calculate stats
    const completedIssues = issues.filter(i => i.state === 'DONE').length;
    const completedPoints = issues
      .filter(i => i.state === 'DONE')
      .reduce((sum, i) => sum + (i.estimate || 0), 0);

    return {
      cycle: {
        id: cycle.id,
        name: cycle.name,
        number: cycle.number,
        startDate: cycle.startDate.toISOString(),
        endDate: cycle.endDate.toISOString(),
        isActive: cycle.isActive,
      },
      summary: {
        totalIssues,
        totalPoints,
        completedIssues,
        completedPoints,
        completionRate: totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 0,
        daysRemaining: Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))),
      },
      burndown: days,
    };
  });

  // Get team performance
  fastify.get('/teams', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const workspaceId = request.workspace!.id;
    const { period = '30' } = request.query as { period?: string };
    const daysBack = parseInt(period, 10);
    
    const since = new Date();
    since.setDate(since.getDate() - daysBack);

    const teams = await fastify.prisma.team.findMany({
      where: { workspaceId, deletedAt: null },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, image: true },
            },
          },
        },
      },
    });

    const teamStats = await Promise.all(
      teams.map(async (team) => {
        const [
          totalIssues,
          completedIssues,
          avgCycleTime,
        ] = await Promise.all([
          fastify.prisma.issue.count({
            where: {
              workspaceId,
              teamId: team.id,
              deletedAt: null,
              createdAt: { gte: since },
            },
          }),
          fastify.prisma.issue.count({
            where: {
              workspaceId,
              teamId: team.id,
              deletedAt: null,
              state: 'DONE',
              completedAt: { gte: since },
            },
          }),
          fastify.prisma.issue.findMany({
            where: {
              workspaceId,
              teamId: team.id,
              deletedAt: null,
              state: 'DONE',
              completedAt: { gte: since },
            },
            select: {
              createdAt: true,
              completedAt: true,
            },
          }),
        ]);

        const cycleTimes = avgCycleTime.map(issue => {
          const created = new Date(issue.createdAt);
          const completed = new Date(issue.completedAt!);
          return (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        });
        const avgDays = cycleTimes.length > 0
          ? Math.round(cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length * 10) / 10
          : 0;

        return {
          id: team.id,
          name: team.name,
          key: team.key,
          color: team.color,
          memberCount: team.members.length,
          stats: {
            totalIssues,
            completedIssues,
            completionRate: totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 0,
            avgCycleTimeDays: avgDays,
          },
        };
      })
    );

    return { teams: teamStats };
  });

  // Get issue distribution by state/priority
  fastify.get('/distribution', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const workspaceId = request.workspace!.id;

    const [byState, byPriority, byTeam] = await Promise.all([
      // By state
      fastify.prisma.issue.groupBy({
        by: ['state'],
        where: { workspaceId, deletedAt: null },
        _count: { id: true },
      }),
      // By priority
      fastify.prisma.issue.groupBy({
        by: ['priority'],
        where: { workspaceId, deletedAt: null },
        _count: { id: true },
      }),
      // By team
      fastify.prisma.team.findMany({
        where: { workspaceId, deletedAt: null },
        select: {
          id: true,
          name: true,
          key: true,
          color: true,
          _count: {
            select: { issues: { where: { deletedAt: null } } },
          },
        },
      }),
    ]);

    return {
      byState: byState.map(s => ({
        state: s.state,
        count: s._count.id,
      })),
      byPriority: byPriority.map(p => ({
        priority: p.priority,
        count: p._count.id,
      })),
      byTeam: byTeam.map(t => ({
        teamId: t.id,
        teamName: t.name,
        teamKey: t.key,
        teamColor: t.color,
        count: t._count.issues,
      })),
    };
  });

  // Get contributor leaderboard
  fastify.get('/contributors', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const workspaceId = request.workspace!.id;
    const { period = '30' } = request.query as { period?: string };
    const daysBack = parseInt(period, 10);
    
    const since = new Date();
    since.setDate(since.getDate() - daysBack);

    // Get issues created by each user
    const createdByUser = await fastify.prisma.issue.groupBy({
      by: ['creatorId'],
      where: {
        workspaceId,
        deletedAt: null,
        createdAt: { gte: since },
      },
      _count: { id: true },
    });

    // Get issues completed by each user (as assignee)
    const completedByUser = await fastify.prisma.issue.groupBy({
      by: ['assigneeId'],
      where: {
        workspaceId,
        deletedAt: null,
        state: 'DONE',
        completedAt: { gte: since },
      },
      _count: { id: true },
    });

    // Get user details
    const userIds = [
      ...new Set([
        ...createdByUser.map(c => c.creatorId),
        ...completedByUser.map(c => c.assigneeId!).filter(Boolean),
      ]),
    ];

    const users = await fastify.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, image: true },
    });

    const contributors = users.map(user => {
      const created = createdByUser.find(c => c.creatorId === user.id)?._count.id || 0;
      const completed = completedByUser.find(c => c.assigneeId === user.id)?._count.id || 0;
      return {
        user: {
          id: user.id,
          name: user.name,
          image: user.image,
        },
        issuesCreated: created,
        issuesCompleted: completed,
        totalActivity: created + completed,
      };
    });

    // Sort by total activity
    contributors.sort((a, b) => b.totalActivity - a.totalActivity);

    return { contributors: contributors.slice(0, 20) };
  });
}
