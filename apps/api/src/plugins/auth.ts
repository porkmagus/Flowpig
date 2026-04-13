import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '@flowpigdev/db';

// Extend Fastify instance with auth
declare module 'fastify' {
  interface FastifyInstance {
    auth: ReturnType<typeof betterAuth>;
  }
}

// Extend Fastify request with user
export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
  };
}

export const authPlugin = fp(async (fastify: FastifyInstance) => {
  const auth = betterAuth({
    database: prismaAdapter(prisma),
    secret: process.env.AUTH_SECRET!,
    baseURL: process.env.BETTER_AUTH_URL!,
    trustedOrigins: process.env.NODE_ENV === 'development' 
      ? ['http://localhost:5173', 'http://127.0.0.1:5173']
      : [process.env.APP_URL!].filter(Boolean),
    emailAndPassword: {
      enabled: true,
    },
    socialProviders: {
      github: process.env.GITHUB_CLIENT_ID ? {
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      } : undefined,
      google: process.env.GOOGLE_CLIENT_ID ? {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      } : undefined,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
    },
  });

  fastify.decorate('auth', auth);

  // Add auth middleware hook
  fastify.addHook('onRequest', async (request: AuthenticatedRequest, reply: FastifyReply) => {
    // Skip auth for public routes
    const publicRoutes = [
      '/health',
      '/auth/sign-in',
      '/auth/sign-up',
      '/auth/callback',
      '/auth/forgot-password',
      '/auth/reset-password',
    ];

    if (publicRoutes.some(route => request.url.startsWith(route))) {
      return;
    }

    try {
      const session = await auth.api.getSession({
        headers: request.headers,
      });

      if (!session?.user) {
        reply.status(401).send({ error: 'Unauthorized' });
        return;
      }

      request.user = session.user;
    } catch (error) {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });
});

// Helper to require auth on specific routes
export async function requireAuth(
  request: AuthenticatedRequest,
  reply: FastifyReply
) {
  if (!request.user) {
    reply.status(401).send({ 
      error: 'Unauthorized',
      message: 'You must be logged in to access this resource' 
    });
    return;
  }
}
