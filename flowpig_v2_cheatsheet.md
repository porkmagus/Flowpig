# Flowpig v2 Cheat Sheet

Bare-essential scaffold and conventions for the backend-first rebuild.

## Core decisions

- Frontend: **React Router v7** (framework mode)
- Backend: **Fastify 5**
- Auth: **Better Auth 1.6.2**, merged into existing auth tables
- IDs: **CUID** everywhere
- ORM: **Prisma 7**
- Realtime: **WebSocket** for app events, **SSE** for AI token streaming
- Storage: **local filesystem first**, object storage later
- Deploy: **Coolify** (see docs/coolify.md)
- Local dev DB: **Postgres 17 in Docker**
- VPS app routing: via reverse proxy, not public app ports

---

## Repo scaffold

```text
flowpig-v2/
  apps/
    web/
      src/
        app/
          router.tsx
          providers.tsx
        components/
        features/            # (not yet scaffolded — code lives in routes/ + components/)
        hooks/               # (not yet scaffolded)
        lib/
          api/
          auth/
          realtime/
          utils/
        routes/
        styles/
        types/
      public/
      index.html
      package.json
      tsconfig.json
      vite.config.ts

    api/
      src/
        app.ts
        server.ts
        env.ts
        plugins/
          prisma.ts
          websocket.ts
          multipart.ts
        middleware/
          auth.ts
          workspace.ts
          rate-limit.ts
        lib/
          auth/
            better-auth.ts
            auth-options.ts
            auth-helpers.ts
          db/
            client.ts
          realtime/
            bus.ts
            events.ts
            ws-server.ts
          storage/
            storage.ts
            filesystem.ts
            s3.ts
          queue/
            jobs.ts
          utils/
            errors.ts
            logger.ts
        modules/
          auth/auth.routes.ts
          health/health.routes.ts
          workspaces/workspaces.routes.ts
          issues/issues.routes.ts
          issues/issues.relations.routes.ts
          comments/comments.routes.ts
          notes/notes.routes.ts
          notes/notes.comments.routes.ts
          notes/notes.public.routes.ts
          notes/notes.share.routes.ts
          notes/notes.versions.routes.ts
          templates/templates.routes.ts
          ai/ai.routes.ts
          uploads/uploads.routes.ts
          uploads/uploads.public.routes.ts
          notifications/notifications.routes.ts
          search/search.routes.ts
          databases/databases.routes.ts
          cycles/cycles.routes.ts
          teams/teams.routes.ts
          triage/triage.routes.ts
          roadmap/roadmap.routes.ts
          history/history.routes.ts
          git/git.routes.ts
          analytics/analytics.routes.ts
          billing/billing.routes.ts
          projects/projects.routes.ts
          # Note: no .service.ts / .schemas.ts subfiles — logic is inline in routes
      package.json
      tsconfig.json
      Dockerfile

  packages/
    db/
      prisma/
        schema.prisma
      src/
        client.ts
        index.ts
      package.json
      tsconfig.json

    contracts/
      src/
        auth.ts
        common.ts
        issues.ts
        notes.ts
        comments.ts
        notifications.ts
        realtime.ts
      package.json
      tsconfig.json

    ui/
      src/
        components/
        lib/
        index.ts
      package.json
      tsconfig.json

    config/
      eslint/
      typescript/
      package.json

  ops/
    docker/
      compose.dev.yml
      compose.prod.yml
    caddy/
      Caddyfile
    scripts/
      dev-setup.mjs
      migrate.mjs
      seed.mjs

  .github/
    workflows/
      ci.yml
      deploy.yml

  .env.example
  .env.dev.example
  .env.prod.example
  .gitignore
  package.json
  tsconfig.base.json
  README.md
```

---

## Ground rules

### `apps/web`
Only client-side app concerns:
- routes
- screens
- components
- query/cache/state
- API client calls
- websocket client hookup

Do **not** put server business logic here.

### `apps/api`
Owns:
- Better Auth
- HTTP API
- SSE AI streaming
- WebSocket realtime
- uploads/storage
- permissions
- DB writes
- background jobs later

### `packages/db`
Single Prisma package. The API imports this.

### `packages/contracts`
Shared Zod/request-response/event types for:
- web
- api
- future mobile/desktop clients

### `packages/ui`
Only truly reusable UI pieces.

---

## Endpoint map

Base URL:
- local API: `http://localhost:3001`
- prod API: `https://api.flowpig.dev`

### Auth
- `POST /auth/sign-up`
- `POST /auth/sign-in`
- `POST /auth/sign-out`
- `GET /auth/session`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /auth/callback/:provider`
- `POST /auth/link/:provider`

Notes:
- Better Auth uses your existing merged auth tables.
- Browser web app uses session/cookie auth.
- Future native clients can use bearer token support later.

### Users
- `GET /users/me`
- `PATCH /users/me`
- `GET /users/me/notifications`
- `POST /users/me/notifications/read`

### Workspaces
- `GET /workspaces`
- `POST /workspaces`
- `GET /workspaces/:workspaceId`
- `PATCH /workspaces/:workspaceId`
- `GET /workspaces/:workspaceId/members`
- `POST /workspaces/:workspaceId/invitations`

### Teams
- `GET /workspaces/:workspaceId/teams`
- `POST /workspaces/:workspaceId/teams`
- `GET /teams/:teamId`
- `PATCH /teams/:teamId`
- `GET /workspaces/:workspaceId/labels`

### Issues
- `GET /workspaces/:workspaceId/issues`
- `POST /workspaces/:workspaceId/issues`
- `GET /issues/:issueId`
- `PATCH /issues/:issueId`
- `DELETE /issues/:issueId`
- `GET /issues/:issueId/comments`
- `POST /issues/:issueId/comments`
- `POST /issues/:issueId/archive`
- `POST /issues/:issueId/subscribe`
- `DELETE /issues/:issueId/subscribe`

### Notes
- `GET /workspaces/:workspaceId/notes`
- `POST /workspaces/:workspaceId/notes`
- `GET /notes/:noteId`
- `PATCH /notes/:noteId`
- `DELETE /notes/:noteId`
- `GET /notes/:noteId/comments`
- `POST /notes/:noteId/comments`
- `POST /notes/:noteId/publish`
- `POST /notes/:noteId/archive`
- `POST /notes/:noteId/subscribe`
- `DELETE /notes/:noteId/subscribe`

### Comments
- `GET /issues/:issueId/comments`
- `POST /issues/:issueId/comments`
- `GET /notes/:noteId/comments`
- `POST /notes/:noteId/comments`
- `PATCH /comments/:commentId`
- `DELETE /comments/:commentId`
- `POST /comments/:commentId/reactions`
- `DELETE /comments/:commentId/reactions`

### Notifications
- `GET /notifications`
- `POST /notifications/read`

### Uploads
- `POST /uploads`
- `DELETE /uploads/:fileId`
- `GET /uploads/public/:key`

Notes:
- Start with local filesystem-backed storage.
- Switch provider via storage adapter later.

### Databases
- `GET /workspaces/:workspaceId/databases`
- `POST /workspaces/:workspaceId/databases`
- `GET /workspaces/:workspaceId/databases/:databaseId`
- `POST /workspaces/:workspaceId/databases/:databaseId/rows`
- `PATCH /workspaces/:workspaceId/databases/:databaseId/rows/:rowId`
- `DELETE /workspaces/:workspaceId/databases/:databaseId/rows/:rowId`
- `POST /workspaces/:workspaceId/databases/:databaseId/views`
- `POST /workspaces/:workspaceId/databases/:databaseId/properties`
- `PATCH /workspaces/:workspaceId/databases/:databaseId/rows/:rowId/cells/:propertyId`

### Search
- `GET /search/workspace/:workspaceId`

### AI
- `POST /ai/chat` -> normal JSON response
- `POST /ai/stream` -> **SSE** streamed tokens/events
- `POST /ai/actions/:actionId/confirm`
- `GET /ai/conversations/:conversationId`
- `GET /ai/conversations/:conversationId/messages`

### Webhooks / integrations later
- `POST /webhooks/github`
- `POST /webhooks/stripe`
- `GET /integrations/slack/callback`

---

## AI transport rules

### Use SSE for AI
- best for token streaming
- simpler than WebSocket
- easier through proxies
- server -> client stream fits the use case

### Use WebSocket for app realtime
- issue updates
- note updates
- notifications
- presence later

### Use normal JSON HTTP for non-streaming AI

---

## WebSocket channel model

Endpoint:
- local: `ws://localhost:3001/ws`
- prod: `wss://api.flowpig.dev/ws`

Event types to support first:

```ts
export type RealtimeEvent =
  | { type: "issue.updated"; workspaceId: string; issueId: string }
  | { type: "comment.created"; workspaceId: string; commentId: string }
  | { type: "note.updated"; workspaceId: string; noteId: string }
  | { type: "notification.created"; userId: string; notificationId: string }
```

Do **not** start with multiplayer editor cursors.

---

## Storage abstraction

```ts
export interface StorageProvider {
  upload(input: {
    key: string
    contentType: string
    body: Buffer
  }): Promise<{ url: string; key: string }>

  delete(key: string): Promise<void>

  getPublicUrl(key: string): string
}
```

Implementations:
- `filesystem.ts` first
- `s3.ts` later

Recommended local upload root:
- `./data/uploads`

Recommended VPS upload root:
- `/var/lib/flowpig/uploads`

---

## Local dev setup

### Minimum
- Node.js
- Docker Desktop / Docker Engine
- Postgres in Docker
- app code on host

### Start local DB
```bash
docker compose -f ops/docker/compose.dev.yml --env-file .env.dev up -d
```

### Run web
```bash
npm --workspace @flowpig/web run dev
```

### Run api
```bash
npm --workspace @flowpig/api run dev
```

### Migrate DB
```bash
npm --workspace @flowpig/db run migrate
```

### Seed DB
```bash
npm --workspace @flowpig/db run seed
```

---

## Example env files

### `.env.dev.example`
```env
NODE_ENV=development
APP_URL=http://localhost:5173
API_URL=http://localhost:3001
BETTER_AUTH_URL=http://localhost:3001
DATABASE_URL=postgresql://flowpig:flowpig_dev_password@localhost:5432/flowpig_dev
REDIS_URL=redis://localhost:6379
AUTH_SECRET=replace_me_with_a_long_secret
STORAGE_DRIVER=filesystem
UPLOAD_ROOT=./data/uploads
AI_PROVIDER=openai
AI_API_KEY=
AI_API_URL=
AI_MODEL=
S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
```

### `.env.prod.example`
```env
NODE_ENV=production
APP_URL=https://app.flowpig.dev
API_URL=https://api.flowpig.dev
BETTER_AUTH_URL=https://api.flowpig.dev
DATABASE_URL=postgresql://flowpig:replace_me@postgres:5432/flowpig_prod
REDIS_URL=redis://redis:6379
AUTH_SECRET=replace_me_with_a_long_secret
STORAGE_DRIVER=filesystem
UPLOAD_ROOT=/var/lib/flowpig/uploads
AI_PROVIDER=openai
AI_API_KEY=
AI_API_URL=
AI_MODEL=
S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
```

---

## Example local Docker compose

`ops/docker/compose.dev.yml`

```yaml
services:
  postgres:
    image: postgres:17
    container_name: flowpig-postgres-dev
    restart: unless-stopped
    environment:
      POSTGRES_USER: flowpig
      POSTGRES_PASSWORD: flowpig_dev_password
      POSTGRES_DB: flowpig_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_dev_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: flowpig-redis-dev
    restart: unless-stopped
    ports:
      - "6379:6379"

volumes:
  postgres_dev_data:
```

Remove Redis if not needed yet.

---

## Prod / Coolify notes

### Subdomains
- `app.example.com` -> web app (port 3000)
- `api.example.com` -> API app (port 3001)

### Port rules
- local web uses `5173`
- local api uses `3001`
- in production, containers listen on internal ports; reverse proxy routes by domain

### Firewall on VPS
Allow only:
- `22/tcp`
- `80/tcp`
- `443/tcp`

Do not expose:
- `5432`
- `6379`
- internal app ports

---

## Suggested root scripts

```json
{
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev:web": "npm --workspace @flowpigdev/web run dev",
    "dev:api": "npm --workspace @flowpigdev/api run dev",
    "dev:infra": "docker compose -f ops/docker/compose.dev.yml up -d",
    "dev:infra:down": "docker compose -f ops/docker/compose.dev.yml down",
    "db:generate": "npm --workspace @flowpigdev/db run generate",
    "db:migrate": "npm --workspace @flowpigdev/db run migrate",
    "db:deploy": "npm --workspace @flowpigdev/db run deploy",
    "db:seed": "npm --workspace @flowpigdev/db run seed"
  }
}
```

No Turbo required initially.

---

## Migration map from old Flowpig

### Old Next UI files
Move into:
- `apps/web/src/components`
- `apps/web/src/features`
- `apps/web/src/routes`

### Old Next route handlers
Split into:
- `apps/api/src/modules/*/*.routes.ts`
- `apps/api/src/modules/*/*.service.ts`
- `packages/contracts/src/*.ts`

Example:

```text
old: apps/web/src/app/api/v1/workspaces/[workspace]/issues/route.ts
new: apps/api/src/modules/issues/issues.routes.ts
new: apps/api/src/modules/issues/issues.service.ts
new: packages/contracts/src/issues.ts
```

### Old auth helpers
Move into:
- `apps/api/src/lib/auth/`

### Old Prisma helpers
Move into:
- `packages/db/src/`

### Old upload logic
Move into:
- `apps/api/src/modules/uploads/`
- `apps/api/src/lib/storage/`

### Old AI logic
Move into:
- `apps/api/src/modules/ai/`

---

## Build order for the agent

### Phase 1
- scaffold repo
- workspace config
- env examples
- local docker compose

### Phase 2
- move Prisma schema into `packages/db`
- verify migrations and seed

### Phase 3
- Fastify API boot
- Better Auth merged with existing auth tables
- auth endpoints working

### Phase 4
- React Router app shell
- login
- workspace shell

### Phase 5
- issues
- notes
- comments
- notifications

### Phase 6
- uploads/storage
- websocket event bus

### Phase 7
- AI routes
- SSE streaming
- action confirmation flows

---

## Keep / avoid

### Keep
- one canonical `users` table
- CUID IDs
- Prisma
- filesystem storage first
- API-first design

### Avoid
- dual user tables
- host-installed Postgres on VPS
- exposing DB/Redis to public internet
- WebSocket for AI token streaming first
- over-sharing UI packages too early
- monorepo tool bloat before needed

---

## Fast reference

### Local
- web: `http://localhost:5173`
- api: `http://localhost:3001`
- ws: `ws://localhost:3001/ws`
- db: `postgresql://flowpig:flowpig_dev_password@localhost:5432/flowpig_dev`

### Prod
- web: `https://app.flowpig.dev`
- api: `https://api.flowpig.dev`
- ws: `wss://api.flowpig.dev/ws`

### AI
- JSON: `POST /ai/chat`
- streaming: `POST /ai/stream` via **SSE**

### Realtime
- websocket: `/ws`
- first event types: `issue.updated`, `comment.created`, `note.updated`, `notification.created`

