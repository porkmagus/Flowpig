import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '@flowpigdev/db';
import { getAuthSecret, getApiBaseUrl, getTrustedOrigins } from '../lib/env.js';

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
  const trustedOrigins = getTrustedOrigins();

  const auth = betterAuth({
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    secret: getAuthSecret(),
    baseURL: getApiBaseUrl(),
    basePath: '/auth',
    trustedOrigins,
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      autoSignIn: true,
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

  fastify.decorate('auth', auth as FastifyInstance['auth']);
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
