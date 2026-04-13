import { spawn } from 'child_process';
import http from 'http';

const server = spawn('npx', ['tsx', 'src/server.ts'], {
  cwd: process.cwd(),
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: true,
});

function fetchUrl(path: string, method = 'GET', body?: any): Promise<{ status: number; body: string; cookies?: string[] }> {
  return new Promise((resolve) => {
    const opts: http.RequestOptions = {
      hostname: '127.0.0.1',
      port: 3001,
      path,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    const req = http.request(opts, (res) => {
      let d = '';
      res.on('data', (c: Buffer) => d += c.toString());
      res.on('end', () => {
        resolve({ status: res.statusCode || 0, body: d, cookies: res.headers['set-cookie'] as string[] | undefined });
      });
    });
    req.on('error', () => resolve({ status: 0, body: '' }));
    req.setTimeout(5000, () => { req.destroy(); resolve({ status: 0, body: 'timeout' }); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function waitAndTest() {
  // Wait for server
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetchUrl('/health');
      if (res.status > 0) { console.log('Server is up! Health:', res.status, res.body); break; }
    } catch {}
    await new Promise(r => setTimeout(r, 500));
  }

  // Test auth session (no auth)
  const session = await fetchUrl('/auth/get-session');
  console.log('GET /auth/get-session:', session.status, session.body.substring(0, 200));

  // Test sign-in
  const signin = await fetchUrl('/auth/sign-in/email', 'POST', { email: 'test@flowpig.dev', password: 'testpassword123' });
  console.log('POST /auth/sign-in/email:', signin.status, signin.body.substring(0, 300));
  if (signin.cookies) console.log('  Cookies:', signin.cookies);

  server.kill();
  process.exit(0);
}

waitAndTest();
