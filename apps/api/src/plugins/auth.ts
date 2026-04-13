import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '@flowpigdev/db';

declare module 'fastify' {
  interface FastifyInstance {
    auth: ReturnType<typeof betterAuth>;
  }
}

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
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    secret: process.env.BETTER_AUTH_SECRET!,
    baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3001',
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
      expiresIn: 60 * 60 * 24 * 7,
    },
  });

  fastify.decorate('auth', auth);
});

export async function requireAuth(
  request: AuthenticatedRequest,
  reply: FastifyReply
) {
  if (!request.user) {
    reply.status(401).send({
      error: 'Unauthorized',
      message: 'You must be logged in to access this resource',
    });
  }
}