import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from './generated/prisma/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function loadDatabaseEnv() {
  if (process.env.DATABASE_URL) {
    return;
  }

  const currentDir = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(currentDir, '../../..');
  const envFiles = [resolve(repoRoot, '.env'), resolve(repoRoot, '.env.dev')];

  for (const envFile of envFiles) {
    if (existsSync(envFile)) {
      config({ path: envFile, override: false });
    }
  }
}

loadDatabaseEnv();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    'DATABASE_URL must be set before initializing Prisma. Checked process env and repo .env/.env.dev files.'
  );
}

// Create connection pool
const pool = new Pool({
  connectionString,
});

// Create adapter
const adapter = new PrismaPg(pool);

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  adapter,
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
