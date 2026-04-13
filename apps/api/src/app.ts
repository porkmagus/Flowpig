import type { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { prismaPlugin } from './plugins/prisma.js';
import { authPlugin } from './plugins/auth.js';
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
import { websocketPlugin } from './plugins/websocket.js';

export async function app(fastify: FastifyInstance) {
  // Register plugins
  await fastify.register(cors, {
    origin: process.env.NODE_ENV === 'development' 
      ? ['http://localhost:5173', 'http://127.0.0.1:5173'] 
      : process.env.APP_URL || true,
    credentials: true,
  });

  await fastify.register(prismaPlugin);
  await fastify.register(authPlugin);

  // Register middleware
  await fastify.register(workspaceContextPlugin);

  // Register routes
  await fastify.register(healthRoutes, { prefix: '/health' });
  await fastify.register(authRoutes, { prefix: '/auth' });
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
  await fastify.register(uploadRoutes, { prefix: '/uploads' });
  await fastify.register(notificationRoutes, { prefix: '/notifications' });
  await fastify.register(searchRoutes, { prefix: '/search' });
  await fastify.register(aiRoutes, { prefix: '/ai' });
  await fastify.register(cycleRoutes, { prefix: '/workspaces/:workspaceId/cycles' });
  await fastify.register(teamRoutes, { prefix: '/workspaces/:workspaceId/teams' });
  await fastify.register(triageRoutes, { prefix: '/workspaces/:workspaceId' });
  await fastify.register(roadmapRoutes, { prefix: '/workspaces/:workspaceId/roadmap' });
  await fastify.register(historyRoutes, { prefix: '/workspaces/:workspaceId/history' });

  // Register WebSocket plugin
  await fastify.register(websocketPlugin);
}
