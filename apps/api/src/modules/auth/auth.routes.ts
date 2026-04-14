import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getApiBaseUrl } from '../../lib/env.js';
import { getConfiguredAuthProviders } from '../../plugins/auth.js';

function addContentTypeParser(fastify: FastifyInstance) {
  // Better Auth expects access to the raw request body for its own parsing.
  fastify.removeAllContentTypeParsers();
  fastify.addContentTypeParser('*', { parseAs: 'buffer' }, async (_req: FastifyRequest, body: Buffer) => {
    return body;
  });
}

function getAuthRequestBody(request: FastifyRequest) {
  if (request.method === 'GET' || request.method === 'HEAD') {
    return undefined;
  }

  const body = request.body;
  if (body == null) {
    return undefined;
  }

  if (Buffer.isBuffer(body)) {
    return body.toString('utf8');
  }

  if (body instanceof Uint8Array) {
    return Buffer.from(body).toString('utf8');
  }

  if (typeof body === 'string') {
    return body;
  }

  return JSON.stringify(body);
}

export default async function authRoutes(fastify: FastifyInstance) {
  addContentTypeParser(fastify);

  fastify.get('/providers', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      emailPassword: true,
      social: getConfiguredAuthProviders(),
    });
  });

  // This plugin is mounted at `/auth`, so match the remaining path only once.
  fastify.all('/*', async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = fastify.auth;
    const url = new URL(request.url, getApiBaseUrl());

    const headers = new Headers(request.headers as Record<string, string>);
    const rawBody = getAuthRequestBody(request);
    headers.delete('content-length');
    headers.delete('host');

    if (rawBody && !headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }
    
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
