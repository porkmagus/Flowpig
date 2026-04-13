import type { FastifyInstance } from 'fastify';

export default async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/', async () => {
    return { 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
    };
  });

  fastify.get('/db', async () => {
    try {
      await fastify.prisma.$queryRaw`SELECT 1`;
      return { 
        status: 'healthy', 
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      };
    }
  });
}
