import { createReadStream, promises as fs } from 'fs';
import path from 'path';
import type { FastifyInstance } from 'fastify';
import { getContentType } from '../../lib/storage/storage.js';

function normalizeUploadKey(rawPath: string) {
  let decodedPath: string;

  try {
    decodedPath = decodeURIComponent(rawPath).replace(/^\/+/, '');
  } catch {
    return null;
  }

  const segments = decodedPath.split('/').filter(Boolean);

  if (
    segments.length === 0
    || segments.some((segment) => segment === '.' || segment === '..')
    || segments[segments.length - 1]?.endsWith('.meta.json')
  ) {
    return null;
  }

  return segments.join(path.sep);
}

export default async function uploadPublicRoutes(fastify: FastifyInstance) {
  fastify.get('/*', async (request, reply) => {
    const uploadRoot = path.resolve(process.env.UPLOAD_ROOT || './uploads');
    const wildcard = (request.params as { '*': string })['*'];
    const normalizedKey = normalizeUploadKey(wildcard);

    if (!normalizedKey) {
      return reply.status(404).send({ error: 'File not found' });
    }

    const filePath = path.resolve(uploadRoot, normalizedKey);
    const isWithinUploadRoot = filePath === uploadRoot || filePath.startsWith(`${uploadRoot}${path.sep}`);

    if (!isWithinUploadRoot) {
      return reply.status(404).send({ error: 'File not found' });
    }

    try {
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) {
        return reply.status(404).send({ error: 'File not found' });
      }

      reply.header('Cache-Control', 'public, max-age=31536000, immutable');
      reply.header('Content-Length', stats.size);
      reply.type(getContentType(filePath));
      return reply.send(createReadStream(filePath));
    } catch {
      return reply.status(404).send({ error: 'File not found' });
    }
  });
}
