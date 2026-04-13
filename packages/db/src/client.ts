import { PrismaClient } from './generated/prisma/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL must be set before initializing Prisma');
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
