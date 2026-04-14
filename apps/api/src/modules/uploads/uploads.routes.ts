import type { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import { requireAuth, type AuthenticatedRequest } from '../../plugins/auth.js';
import { extractWorkspace, type WorkspaceRequest } from '../../middleware/workspace.js';
import { storagePlugin, generateFileKey, getContentType, formatFileSize } from '../../lib/storage/storage.js';
import { broadcastIssueUpdated } from '../../plugins/websocket.js';

export default async function uploadRoutes(fastify: FastifyInstance) {
  // Register multipart plugin
  await fastify.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB max
      files: 10, // Max 10 files per request
    },
  });

  // Register storage plugin
  await fastify.register(storagePlugin);

  // Upload file
  fastify.post('/', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const userId = (request as any).user!.id;
    const workspaceId = request.workspace!.id;

    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: 'No file uploaded' });
    }

    const { filename, mimetype, file } = data;

    // Generate key
    const key = generateFileKey(workspaceId, userId, filename);

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of file) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Upload to storage
    const result = await fastify.storage.upload({
      key,
      contentType: mimetype || getContentType(filename),
      body: buffer,
      metadata: {
        originalName: filename,
        uploadedBy: userId,
        workspaceId,
      },
    });

    // Create upload record in database
    const upload = await fastify.prisma.upload.create({
      data: {
        workspaceId,
        uploadedById: userId,
        key: result.key,
        originalName: filename,
        contentType: mimetype || getContentType(filename),
        size: result.size,
        url: result.url,
      },
    });

    return reply.status(201).send({
      upload: {
        id: upload.id,
        url: upload.url,
        originalName: upload.originalName,
        contentType: upload.contentType,
        size: upload.size,
        sizeFormatted: formatFileSize(upload.size),
        createdAt: upload.createdAt.toISOString(),
      },
    });
  });

  // Attach file to issue
  fastify.post('/attach-to-issue', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const userId = (request as any).user!.id;
    const workspaceId = request.workspace!.id;
    const { issueId, uploadId } = request.body as { issueId: string; uploadId: string };

    // Verify issue exists
    const issue = await fastify.prisma.issue.findFirst({
      where: {
        id: issueId,
        workspaceId,
        deletedAt: null,
      },
    });

    if (!issue) {
      return reply.status(404).send({ error: 'Issue not found' });
    }

    // Get upload
    const upload = await fastify.prisma.upload.findFirst({
      where: {
        id: uploadId,
        workspaceId,
      },
    });

    if (!upload) {
      return reply.status(404).send({ error: 'Upload not found' });
    }

    // Create attachment
    const attachment = await fastify.prisma.issueAttachment.create({
      data: {
        issueId,
        uploadId,
        workspaceId,
        attachedById: userId,
      },
      include: {
        upload: true,
        attachedBy: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    // Broadcast update
    await broadcastIssueUpdated(fastify, workspaceId, issueId, {
      attachments: { added: [attachment] },
    });

    return reply.status(201).send({
      attachment: {
        id: attachment.id,
        upload: {
          id: attachment.upload.id,
          url: attachment.upload.url,
          originalName: attachment.upload.originalName,
          contentType: attachment.upload.contentType,
          size: attachment.upload.size,
          sizeFormatted: formatFileSize(attachment.upload.size),
        },
        attachedBy: attachment.attachedBy,
        createdAt: attachment.createdAt.toISOString(),
      },
    });
  });

  // List issue attachments
  fastify.get('/issue/:issueId', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { issueId } = request.params as { issueId: string };
    const workspaceId = request.workspace!.id;

    const attachments = await fastify.prisma.issueAttachment.findMany({
      where: {
        issueId,
        workspaceId,
        deletedAt: null,
      },
      include: {
        upload: true,
        attachedBy: {
          select: { id: true, name: true, image: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      attachments: attachments.map(a => ({
        id: a.id,
        upload: {
          id: a.upload.id,
          url: a.upload.url,
          originalName: a.upload.originalName,
          contentType: a.upload.contentType,
          size: a.upload.size,
          sizeFormatted: formatFileSize(a.upload.size),
        },
        attachedBy: a.attachedBy,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  });

  // Delete upload
  fastify.delete('/:uploadId', {
    preHandler: [requireAuth, extractWorkspace],
  }, async (request: WorkspaceRequest, reply) => {
    const { uploadId } = request.params as { uploadId: string };
    const workspaceId = request.workspace!.id;

    const upload = await fastify.prisma.upload.findFirst({
      where: {
        id: uploadId,
        workspaceId,
      },
    });

    if (!upload) {
      return reply.status(404).send({ error: 'Upload not found' });
    }

    // Delete from storage
    await fastify.storage.delete(upload.key);

    // Soft delete in database
    await fastify.prisma.upload.update({
      where: { id: uploadId },
      data: { deletedAt: new Date() },
    });

    // Also soft delete attachments
    await fastify.prisma.issueAttachment.updateMany({
      where: { uploadId },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  });
}
