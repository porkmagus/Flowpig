import type { FastifyInstance } from 'fastify';

export default async function authRoutes(fastify: FastifyInstance) {
  // Better Auth handles most auth routes automatically
  // We just need to mount the handler
  
  // Get current session
  fastify.get('/session', async (request, reply) => {
    try {
      const session = await fastify.auth.api.getSession({
        headers: request.headers,
      });

      if (!session) {
        return reply.status(401).send({ error: 'No session found' });
      }

      return { user: session.user, expiresAt: session.session.expiresAt };
    } catch (error) {
      return reply.status(401).send({ error: 'Invalid session' });
    }
  });

  // Sign out
  fastify.post('/sign-out', async (request, reply) => {
    try {
      await fastify.auth.api.signOut({
        headers: request.headers,
      });
      return { success: true };
    } catch (error) {
      return reply.status(500).send({ error: 'Failed to sign out' });
    }
  });
}
