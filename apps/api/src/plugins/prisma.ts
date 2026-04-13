import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { prisma } from '@flowpigdev/db';

// Extend Fastify instance with prisma
declare module 'fastify' {
  interface FastifyInstance {
    prisma: typeof prisma;
  }
}

export const prismaPlugin = fp(async (fastify: FastifyInstance) => {
  fastify.decorate('prisma', prisma);

  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
});
