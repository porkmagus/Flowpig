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
    const isSocialSignIn = request.url.includes('/sign-in/social');

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

    const isEmailSignIn = request.url.includes('/sign-in/email');
    const isEmailSignUp = request.url.includes('/sign-up/email');

    if (isSocialSignIn || isEmailSignIn || isEmailSignUp) {
      console.log('[auth] auth request:', {
        url: request.url,
        origin: headers.get('origin') || 'missing',
        body: rawBody?.slice(0, 200),
      });
    }

    try {
      const req = new Request(url, init);
      const response = await auth.handler(req);

      // Use getSetCookie() for correct handling of multiple Set-Cookie headers
      const setCookies = response.headers.getSetCookie?.() || [];
      for (const cookie of setCookies) {
        reply.header('Set-Cookie', cookie);
      }

      for (const [key, value] of response.headers.entries()) {
        if (key === 'set-cookie') {
          // Already handled above; skip to avoid duplication.
          continue;
        }
        // Don't forward Location on successful JSON responses (Better Auth sets it
        // for compatibility, but it can confuse fetch clients into following it).
        if (key.toLowerCase() === 'location' && response.status >= 200 && response.status < 300) {
          continue;
        }
        if (!['content-encoding', 'transfer-encoding'].includes(key.toLowerCase())) {
          reply.header(key, value);
        }
      }

      const responseBody = await response.text();
      if (isSocialSignIn || isEmailSignIn || isEmailSignUp) {
        console.log('[auth] auth response:', {
          url: request.url,
          status: response.status,
          cookies: setCookies,
          body: responseBody.slice(0, 500),
        });
      }
      if (response.status >= 500 && !responseBody) {
        console.error('Auth handler returned empty 500 for', request.method, request.url);
      }
      return reply.status(response.status).send(responseBody || { error: 'Auth handler error' });
    } catch (error) {
      console.error('Auth handler exception:', error);
      const message = error instanceof Error ? error.message : String(error);
      reply.status(500).send({ error: 'Internal server error', message });
    }
  });
}
