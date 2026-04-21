import type { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { prismaPlugin } from './plugins/prisma.js';
import { authPlugin, type AuthenticatedRequest } from './plugins/auth.js';
import { workspaceContextPlugin } from './middleware/workspace.js';
import authRoutes from './modules/auth/auth.routes.js';
import workspaceRoutes from './modules/workspaces/workspaces.routes.js';
import healthRoutes from './modules/health/health.routes.js';
import issueRoutes from './modules/issues/issues.routes.js';
import commentRoutes from './modules/comments/comments.routes.js';
import noteRoutes from './modules/notes/notes.routes.js';
import noteShareRoutes from './modules/notes/notes.share.routes.js';
import notePublicRoutes from './modules/notes/notes.public.routes.js';
import noteCommentRoutes from './modules/notes/notes.comments.routes.js';
import aiRoutes from './modules/ai/ai.routes.js';
import uploadRoutes from './modules/uploads/uploads.routes.js';
import notificationRoutes from './modules/notifications/notifications.routes.js';
import searchRoutes from './modules/search/search.routes.js';
import databaseRoutes from './modules/databases/databases.routes.js';
import cycleRoutes from './modules/cycles/cycles.routes.js';
import teamRoutes from './modules/teams/teams.routes.js';
import triageRoutes from './modules/triage/triage.routes.js';
import roadmapRoutes from './modules/roadmap/roadmap.routes.js';
import historyRoutes from './modules/history/history.routes.js';
import gitRoutes from './modules/git/git.routes.js';
import analyticsRoutes from './modules/analytics/analytics.routes.js';
import issueRelationsRoutes from './modules/issues/issues.relations.routes.js';
import noteVersionRoutes from './modules/notes/notes.versions.routes.js';
import billingRoutes, { stripeWebhookRoute } from './modules/billing/billing.routes.js';
import projectRoutes from './modules/projects/projects.routes.js';
import templateRoutes from './modules/templates/templates.routes.js';
import issueViewRoutes from './modules/issue-views/issue-views.routes.js';
import { websocketPlugin } from './plugins/websocket.js';
import uploadPublicRoutes from './modules/uploads/uploads.public.routes.js';
import { getTrustedOrigins } from './lib/env.js';

export async function app(fastify: FastifyInstance) {
  const trustedOrigins = getTrustedOrigins();

  await fastify.register(cors, {
    origin: trustedOrigins,
    credentials: true,
  });

  await fastify.register(prismaPlugin);
  await fastify.register(authPlugin);
  await fastify.register(workspaceContextPlugin);

  // Public routes - no auth required
  await fastify.register(async function publicRoutes(app) {
    await app.register(healthRoutes, { prefix: '/health' });
    await app.register(authRoutes, { prefix: '/auth' });
    await app.register(uploadPublicRoutes, { prefix: '/uploads' });
    await app.register(notePublicRoutes, { prefix: '/share' });
  });

  // Protected routes - auth middleware applies here only
  await fastify.register(async function protectedRoutes(app) {
    app.addHook('onRequest', async (request: AuthenticatedRequest, _reply) => {
      try {
        const session = await app.auth.api.getSession({
          headers: request.headers,
        });

        if (session?.user) {
          request.user = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name || null,
            image: session.user.image || null,
          };
        }
      } catch {
        // Not authenticated - continue without user
      }
    });

    await app.register(workspaceRoutes, { prefix: '/workspaces' });
    await app.register(issueRoutes, { prefix: '/workspaces/:workspaceId/issues' });
    await app.register(commentRoutes, { prefix: '/workspaces/:workspaceId' });
    await app.register(noteRoutes, { prefix: '/workspaces/:workspaceId/notes' });
    await app.register(noteShareRoutes, { prefix: '/workspaces/:workspaceId/notes' });
    await app.register(noteCommentRoutes, { prefix: '/workspaces/:workspaceId' });
    await app.register(aiRoutes, { prefix: '/ai' });
    await app.register(uploadRoutes, { prefix: '/workspaces/:workspaceId/uploads' });
    await app.register(notificationRoutes, { prefix: '/notifications' });
    await app.register(searchRoutes, { prefix: '/search' });
    await app.register(databaseRoutes, { prefix: '/workspaces/:workspaceId/databases' });
    await app.register(cycleRoutes, { prefix: '/workspaces/:workspaceId/cycles' });
    await app.register(teamRoutes, { prefix: '/workspaces/:workspaceId/teams' });
    await app.register(triageRoutes, { prefix: '/workspaces/:workspaceId' });
    await app.register(roadmapRoutes, { prefix: '/workspaces/:workspaceId/roadmap' });
    await app.register(historyRoutes, { prefix: '/workspaces/:workspaceId/history' });
    await app.register(gitRoutes, { prefix: '/workspaces/:workspaceId/git' });
    await app.register(analyticsRoutes, { prefix: '/workspaces/:workspaceId/analytics' });
    await app.register(issueRelationsRoutes, { prefix: '/workspaces/:workspaceId/issues' });
    await app.register(noteVersionRoutes, { prefix: '/workspaces/:workspaceId/notes' });
    await app.register(billingRoutes, { prefix: '/workspaces/:workspaceId/billing' });
    await app.register(projectRoutes, { prefix: '/workspaces/:workspaceId' });
    await app.register(templateRoutes, { prefix: '/workspaces/:workspaceId/templates' });
    await app.register(issueViewRoutes, { prefix: '/workspaces/:workspaceId/issue-views' });
  });

  // Stripe webhooks need raw body - keep outside protected routes
  await fastify.register(async function webhookRoutes(app) {
    await app.register(stripeWebhookRoute, { prefix: '/webhooks' });
  });

  await fastify.register(websocketPlugin);
}
