import { createWriteStream, createReadStream, promises as fs } from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { randomUUID } from 'crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import type { MultipartFile } from '@fastify/multipart';
import { getStoragePublicUrl } from '../env.js';

// Storage abstraction interface
export interface StorageProvider {
  upload(input: {
    key: string;
    contentType: string;
    body: Buffer | Readable;
    metadata?: Record<string, string>;
  }): Promise<{ url: string; key: string; size: number }>;

  delete(key: string): Promise<void>;

  getPublicUrl(key: string): string;

  getSignedUrl?(key: string, expiresIn?: number): Promise<string>;
}

// Local filesystem implementation
class FilesystemStorage implements StorageProvider {
  private uploadDir: string;
  private publicUrl: string;

  constructor(uploadDir: string, publicUrl: string) {
    this.uploadDir = uploadDir;
    this.publicUrl = publicUrl;
  }

  async upload({
    key,
    contentType,
    body,
    metadata,
  }: {
    key: string;
    contentType: string;
    body: Buffer | Readable;
    metadata?: Record<string, string>;
  }): Promise<{ url: string; key: string; size: number }> {
    const filePath = path.join(this.uploadDir, key);
    const dir = path.dirname(filePath);

    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true });

    // Write file
    if (Buffer.isBuffer(body)) {
      await fs.writeFile(filePath, body);
    } else {
      const writeStream = createWriteStream(filePath);
      await pipeline(body, writeStream);
    }

    // Save metadata
    if (metadata) {
      await fs.writeFile(
        `${filePath}.meta.json`,
        JSON.stringify({ contentType, ...metadata }, null, 2)
      );
    }

    const stats = await fs.stat(filePath);

    return {
      url: this.getPublicUrl(key),
      key,
      size: stats.size,
    };
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.uploadDir, key);
    try {
      await fs.unlink(filePath);
      // Also delete metadata if exists
      try {
        await fs.unlink(`${filePath}.meta.json`);
      } catch {
        // Ignore if metadata doesn't exist
      }
    } catch (error) {
      // File might not exist
    }
  }

  getPublicUrl(key: string): string {
    return `${this.publicUrl}/${key}`;
  }
}

// S3-compatible storage implementation (for future)
class S3Storage implements StorageProvider {
  // Implementation for AWS S3, MinIO, etc.
  // Stub for now
  async upload(): Promise<{ url: string; key: string; size: number }> {
    throw new Error('S3 not yet implemented');
  }

  async delete(): Promise<void> {
    throw new Error('S3 not yet implemented');
  }

  getPublicUrl(key: string): string {
    return `https://storage.example.com/${key}`;
  }
}

// Storage factory
export function createStorage(config: {
  driver: 'filesystem' | 's3';
  uploadDir?: string;
  publicUrl?: string;
}): StorageProvider {
  switch (config.driver) {
    case 'filesystem':
      return new FilesystemStorage(
        config.uploadDir || './uploads',
        config.publicUrl || '/uploads'
      );
    case 's3':
      return new S3Storage();
    default:
      throw new Error(`Unknown storage driver: ${config.driver}`);
  }
}

// Fastify plugin for storage
declare module 'fastify' {
  interface FastifyInstance {
    storage: StorageProvider;
  }
}

export const storagePlugin = fp(async (fastify: FastifyInstance) => {
  const driver = process.env.STORAGE_DRIVER || 'filesystem';
  const uploadDir = process.env.UPLOAD_ROOT || './uploads';
  const publicUrl = getStoragePublicUrl();

  await fs.mkdir(uploadDir, { recursive: true });

  const storage = createStorage({
    driver: driver as 'filesystem' | 's3',
    uploadDir,
    publicUrl,
  });

  fastify.decorate('storage', storage);
});

// File type detection
export function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const types: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.json': 'application/json',
    '.csv': 'text/csv',
    '.zip': 'application/zip',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
  };
  return types[ext] || 'application/octet-stream';
}

// Generate unique file key
export function generateFileKey(
  workspaceId: string,
  userId: string,
  filename: string
): string {
  const ext = path.extname(filename);
  const uuid = randomUUID();
  const date = new Date().toISOString().split('T')[0];
  return `workspaces/${workspaceId}/${date}/${uuid}${ext}`;
}

// Image processing stub (for future)
export async function generateThumbnails(
  buffer: Buffer,
  key: string
): Promise<{ thumbnail?: string; preview?: string }> {
  // Placeholder for Sharp image processing
  // Would generate thumbnails, previews, WebP versions
  return {};
}

// File size formatting
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
