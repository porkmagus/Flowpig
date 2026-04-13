import { defineConfig, env } from 'prisma/config';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.dev from root
config({ path: resolve(__dirname, '../../.env.dev') });

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
});
