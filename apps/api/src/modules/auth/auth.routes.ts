import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

function addContentTypeParser(fastify: FastifyInstance) {
  // Better Auth expects access to the raw request body for its own parsing.
  fastify.removeAllContentTypeParsers();
  fastify.addContentTypeParser('*', { parseAs: 'buffer' }, async (_req: FastifyRequest, body: Buffer) => {
    return body;
  });
}

export default async function authRoutes(fastify: FastifyInstance) {
  addContentTypeParser(fastify);

  // This plugin is mounted at `/auth`, so match the remaining path only once.
  fastify.all('/*', async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = fastify.auth;
    const baseURL = process.env.BETTER_AUTH_URL ?? 'http://127.0.0.1:3001';
    const url = new URL(request.url, baseURL);

    const headers = new Headers(request.headers as Record<string, string>);
    const rawBody = request.body as Buffer | undefined;
    
    const init: RequestInit = {
      method: request.method,
      headers,
      body: rawBody
    };

    try {
      const req = new Request(url, init);
      const response = await auth.handler(req);
      
      for (const [key, value] of response.headers.entries()) {
        if (key === 'set-cookie') {
          const cookies = Array.isArray(value) ? value : [value];
          for (const cookie of cookies) {
            reply.header('Set-Cookie', cookie);
          }
        } else if (!['content-encoding', 'transfer-encoding'].includes(key.toLowerCase())) {
          reply.header(key, value);
        }
      }
      
      const responseBody = await response.text();
      return reply.status(response.status).send(responseBody);
    } catch (error) {
      console.error('Auth handler error:', error);
      reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
