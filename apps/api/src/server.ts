import { config } from 'dotenv';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const currentDir = dirname(fileURLToPath(import.meta.url));

if (process.env.NODE_ENV !== 'production') {
  config({ path: resolve(currentDir, '../../../.env.dev') });
}

const { default: Fastify } = await import('fastify');
const { app } = await import('./app.js');

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  try {
    const server = Fastify({
      logger: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      },
    });

    await server.register(app);

    await server.listen({ port: PORT, host: HOST });

    console.log(`API server running on http://${HOST}:${PORT}`);
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

start();
