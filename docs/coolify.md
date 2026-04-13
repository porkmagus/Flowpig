# Coolify Deployment Guide

This repo deploys cleanest on Coolify as three resources:

1. PostgreSQL
2. API app
3. Web app

The API and web app should be separate Dockerfile applications that both build from the repo root.

## Recommended domains

- `app.example.com` -> web app
- `api.example.com` -> API app

## API app

- Build pack: `Dockerfile`
- Dockerfile location: `apps/api/Dockerfile`
- Build context: repo root
- Port: `3001`
- Persistent storage: add storage for uploads at `/app/data/uploads`

### API persistent storage

In the current Coolify `Add Volume Mount` UI, use:

- Name: `uploads`
- Source path: `/data/flowpig/uploads`
- Destination path: `/app/data/uploads`

That matches the current Coolify form fields shown in the app UI.

### Required API environment variables

```env
NODE_ENV=production
HOST=0.0.0.0
PORT=3001

DATABASE_URL=postgresql://...
APP_URL=https://app.example.com
API_URL=https://api.example.com
BETTER_AUTH_URL=https://api.example.com
BETTER_AUTH_SECRET=replace-with-a-long-random-secret

STORAGE_DRIVER=filesystem
UPLOAD_ROOT=/app/data/uploads
```

### Optional API environment variables

```env
STORAGE_PUBLIC_URL=https://api.example.com/uploads

AI_PROVIDER=openai
AI_API_KEY=
AI_API_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini

OPENAI_API_KEY=
ANTHROPIC_API_KEY=

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_PRO_MONTHLY=
STRIPE_PRICE_PRO_YEARLY=
STRIPE_PRICE_ENTERPRISE_MONTHLY=
```

## Web app

- Build pack: `Dockerfile`
- Dockerfile location: `apps/web/Dockerfile`
- Build context: repo root
- Port: `3000`

### Required web build variables

Set these as build-time variables in Coolify for the web app:

```env
VITE_API_URL=https://api.example.com
VITE_WS_URL=wss://api.example.com/ws
```

### Runtime variables for the web app

```env
NODE_ENV=production
HOST=0.0.0.0
PORT=3000
```

## Database migrations

Run this once after the first successful API deploy, and again whenever migrations are added:

```bash
npm --workspace @flowpigdev/db run deploy
```

If you run it from inside the API container, make sure `DATABASE_URL` is already present there.

## Uploads

- File uploads are stored inside the API container at `/app/data/uploads`.
- In Coolify, the current `Volume Mount` form should be filled as:
  - Name: `uploads`
  - Source path: `/data/flowpig/uploads`
  - Destination path: `/app/data/uploads`
- Upload URLs are served from `/uploads/*` on the API domain.
- If you switch to object storage later, set `STORAGE_DRIVER` and `STORAGE_PUBLIC_URL` accordingly.

## Notes

- The API container intentionally runs the TypeScript source with `tsx` in production. That avoids runtime breakage from workspace packages that still export TypeScript source.
- The web image requires `VITE_API_URL` at build time. If it is missing, the Docker build should fail early instead of silently baking localhost into the bundle.
