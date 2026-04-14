import { config } from 'dotenv';
import { existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import type { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import { app } from './app.js';
import { start } from 'workflow/api';
import { handleUserSignup } from './workflows/user-signup.js';

// Ensure workflow step functions are registered in the runtime.
// This is a workaround for a bundling issue where rolldown tree-shakes the
// workflow/nitro virtual handler's bare import of the steps bundle.
const stepsBundlePath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../node_modules/.nitro/workflow/steps.mjs'
);
if (existsSync(stepsBundlePath)) {
  await import(pathToFileURL(stepsBundlePath).href);
}

function loadEnv() {
  if (process.env.NODE_ENV === 'production') return;

  const candidates = [
    resolve(process.cwd(), '.env.dev'),
    resolve(process.cwd(), '../.env.dev'),
    resolve(process.cwd(), '../../.env.dev'),
    resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env.dev'),
    resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../.env.dev'),
  ];

  for (const path of candidates) {
    if (existsSync(path)) {
      config({ path });
      break;
    }
  }
}

loadEnv();

const server = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  },
});

const workflowPlugin = async (fastify: FastifyInstance) => {
  fastify.post('/api/signup', async (req, reply) => {
    const { email } = req.body as { email: string };
    await start(handleUserSignup, [email]);
    return reply.send({ message: 'User signup workflow started' });
  });
};

// Register workflow routes first so they stay outside the auth hook encapsulation
await server.register(workflowPlugin);
await server.register(app);
await server.ready();

export default (req: any, res: any) => {
  server.server.emit('request', req, res);
};
