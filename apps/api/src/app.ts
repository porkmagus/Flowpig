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
import { websocketPlugin } from './plugins/websocket.js';

export async function app(fastify: FastifyInstance) {
  await fastify.register(cors, {
    origin: process.env.NODE_ENV === 'development'
      ? ['http://localhost:5173', 'http://127.0.0.1:5173']
      : process.env.APP_URL || true,
    credentials: true,
  });

  await fastify.register(prismaPlugin);
  await fastify.register(authPlugin);
  await fastify.register(workspaceContextPlugin);

  // Public routes - no auth required
  await fastify.register(healthRoutes, { prefix: '/health' });
  await fastify.register(authRoutes, { prefix: '/auth' });

  // Auth middleware for all other routes
  fastify.addHook('onRequest', async (request: AuthenticatedRequest, reply) => {
    if (request.url.startsWith('/health') || request.url.startsWith('/auth')) {
      return;
    }

    try {
      const session = await fastify.auth.api.getSession({
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

  // Protected routes
  await fastify.register(workspaceRoutes, { prefix: '/workspaces' });
  await fastify.register(issueRoutes, { prefix: '/workspaces/:workspaceId/issues' });
  await fastify.register(commentRoutes, { prefix: '/workspaces/:workspaceId' });
  await fastify.register(noteRoutes, { prefix: '/workspaces/:workspaceId/notes' });
  await fastify.register(noteCommentRoutes, { prefix: '/workspaces/:workspaceId' });
  await fastify.register(aiRoutes, { prefix: '/ai' });
  await fastify.register(uploadRoutes, { prefix: '/uploads' });
  await fastify.register(notificationRoutes, { prefix: '/notifications' });
  await fastify.register(searchRoutes, { prefix: '/search' });
  await fastify.register(databaseRoutes, { prefix: '/workspaces/:workspaceId/databases' });
  await fastify.register(cycleRoutes, { prefix: '/workspaces/:workspaceId/cycles' });
  await fastify.register(teamRoutes, { prefix: '/workspaces/:workspaceId/teams' });
  await fastify.register(triageRoutes, { prefix: '/workspaces/:workspaceId' });
  await fastify.register(roadmapRoutes, { prefix: '/workspaces/:workspaceId/roadmap' });
  await fastify.register(historyRoutes, { prefix: '/workspaces/:workspaceId/history' });
  await fastify.register(gitRoutes, { prefix: '/workspaces/:workspaceId/git' });
  await fastify.register(analyticsRoutes, { prefix: '/workspaces/:workspaceId/analytics' });
  await fastify.register(issueRelationsRoutes, { prefix: '/workspaces/:workspaceId/issues' });
  await fastify.register(noteVersionRoutes, { prefix: '/workspaces/:workspaceId/notes' });
  await fastify.register(billingRoutes, { prefix: '/workspaces/:workspaceId/billing' });
  // Stripe webhooks need raw body - registered separately
  await fastify.register(stripeWebhookRoute, { prefix: '/webhooks' });

  await fastify.register(websocketPlugin);
}