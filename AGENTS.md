# AGENTS.md

This file is the source of truth for AI coding agents working on this project.

## Big Picture

Flowpig is a full-stack project-management application (a Linear × Notion mashup) built as an npm-workspace monorepo.

- **Backend**: Fastify 5 + TypeScript 5.9 in `apps/api`.
- **Frontend**: React Router v7 (framework mode) + Vite 7 + React 19 + Tailwind CSS 4 in `apps/web`.
- **Database**: Prisma 7 + PostgreSQL 17. Schema lives in `packages/db/prisma/schema.prisma` (~50 models).
- **Shared packages**: `@flowpigdev/contracts` (Zod schemas + TypeScript types), `@flowpigdev/ui` (Framer Motion animation wrappers), `@flowpigdev/db` (Prisma client + seed).
- **Auth**: Better Auth 1.6.2 with session-based HTTP-only cookies. OAuth providers (GitHub, Google) are optional.
- **Realtime**: Custom WebSocket server at `/ws` (`@fastify/websocket`). Supports workspace subscriptions, presence, cursor sync, and typing indicators.
- **AI**: OpenAI and Anthropic SDKs. SSE streaming at `/ai/stream`, JSON at `/ai/chat`. Action confirmation flow for AI mutations.
- **Storage**: Pluggable abstraction (`apps/api/src/lib/storage/storage.ts`). Local filesystem is active; S3 is stubbed for future use.
- **Payments**: Stripe integration with webhook support.
- **Primary runtime data flow**: Web UI → REST endpoints (`/workspaces/...`) → Prisma models → JSON responses with ISO date strings.
- **Realtime flow**: API writes events via `broadcastToWorkspace` / `broadcastToUser` (`apps/api/src/plugins/websocket.ts`) → web consumes via `useWorkspaceRealtime` (`apps/web/src/lib/ws.ts`).
- **AI flow**: web `useAIStream` posts to `/ai/stream` and parses SSE `data:` frames (`apps/web/src/lib/ai.ts`), backend streams OpenAI/Anthropic tokens (`apps/api/src/modules/ai/ai.routes.ts`).

All comments, docs, and variable names are in English.

## Repo Topology

```
package.json                          # Root workspace orchestrator (no Turbo)
apps/
  api/
    src/
      server.ts                       # Entry point (port 3001, host 0.0.0.0)
      app.ts                          # Central plugin + route registration
      plugins/
        auth.ts                       # Better Auth server plugin
        prisma.ts                     # Prisma client Fastify decorator
        websocket.ts                  # WS server, broadcast helpers, presence
      middleware/
        workspace.ts                  # extractWorkspace (accepts slug OR ID)
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
      lib/
        env.ts                        # URL / secret resolution, trusted origins
        storage/storage.ts            # StorageProvider interface + filesystem impl
    entrypoint.sh                     # Prod container: prisma db push + start
  web/
    src/
      app/
        root.tsx                      # HTML shell, meta, dark theme body
        routes.ts                     # React Router framework route config
        router.tsx                    # Manual browser router (also present)
        providers.tsx                 # QueryClientProvider + AuthProvider
        entry.client.tsx
        entry.server.tsx
      routes/
        index.tsx                     # Landing page
        login.tsx                     # Sign-in page
        signup.tsx                    # Sign-up page
        onboarding.tsx                # Workspace selection / creation
        share.$token.tsx              # Public note share page
        invite.$token.tsx             # Workspace invite acceptance
        $workspace/
          layout.tsx                  # Workspace shell with sidebar
          index.tsx                   # Dashboard
          issues.tsx                  # Issue list
          issues.$issueId.tsx         # Issue detail
          notes.tsx                   # Note list
          notes.$noteSlug.tsx         # Note detail
          cycles.tsx / cycles.$cycleId.tsx
          databases.tsx / databases.$databaseId.tsx
          projects.tsx / projects.$projectId.tsx
          roadmap.tsx / triage.tsx / inbox.tsx
          analytics.tsx / team.tsx / settings.tsx
          my-issues.tsx / initiatives.tsx
          git-integration.tsx
      lib/
        api.ts                        # fetchApi helper + queryClient
        auth-client.tsx               # React auth context (Better Auth wrapper)
        ws.ts                         # useWebSocket + useWorkspaceRealtime
        ai.ts                         # useAIStream + useAIChat
        runtime-config.ts             # API_URL / WS_URL resolution with subdomain inference
        formula-engine.ts             # Formula evaluation for databases
        presence.ts                   # Presence UI helpers
      components/
        ui/                           # Primitive components (button, card, avatar, etc.)
        file-uploader.tsx
        rich-text-editor.tsx          # TipTap editor wrapper
        command-palette.tsx           # CMD+K search
        notification-badge.tsx
        create-issue-modal.tsx
        page-tree.tsx
        share-dialog.tsx
        database-views/               # Table, Board, Calendar, Gallery, Timeline views
packages/
  db/
    prisma/schema.prisma              # Source of truth (~50 models, soft deletes, CUIDs)
    src/
      client.ts                       # PrismaClient singleton with @prisma/adapter-pg
      index.ts                        # Re-exports prisma
    seed.ts                           # Seed script (test user + workspace + issues)
  contracts/
    src/
      auth.ts, workspace.ts, issue.ts, note.ts
      realtime.ts, common.ts, history.ts, roadmap.ts, triage.ts
      index.ts                        # Re-exports all schemas
  ui/
    src/
      components/motion.tsx           # AnimatedPage, AnimatedList, AnimatedItem, AnimatedCard
      index.ts
ops/
  docker/
    compose.dev.yml                   # Postgres 17 + Redis 7 for local dev
    compose.prod.yml                  # Prod services (referenced by root compose.prod.yml)
  nginx/
    nginx.conf                        # Optional reverse proxy config
docs/
  coolify.md                          # Coolify deployment notes
tests/e2e/                            # Playwright E2E tests
  auth.spec.ts
  issues.spec.ts
  landing.spec.ts
  style-regression.spec.ts
scripts/
  check-native-deps.cjs               # Platform mismatch guard for esbuild/rollup
```

## Technology Stack & Versions

| Layer | Tech | Version | Notes |
|-------|------|---------|-------|
| Runtime | Node.js | ≥24.0.0 | `.nvmrc` pinned; npm ≥11 |
| Monorepo | npm workspaces | 11.12.1 | No Turbo |
| Backend framework | Fastify | 5.8.4 | `type: "module"` |
| Backend TS | TypeScript | 5.9.3 | `apps/api` only |
| Frontend framework | React Router | 7.14.0 | Framework mode (Vite plugin) |
| Frontend build | Vite | 7.3.2 | |
| React | React | 19.2.5 | |
| Styling | Tailwind CSS | 4.2.2 | `@tailwindcss/vite` plugin |
| Animation | Framer Motion | 12.38.0 | Used in `@flowpigdev/ui` |
| Database ORM | Prisma | 7.7.0 | Client + adapter-pg |
| DB Runtime | pg (node-postgres) | ^8.20.0 | Pool adapter |
| Auth | Better Auth | 1.6.2 | Session-based cookies |
| Query client | TanStack Query | 5.99.0 | |
| Editor | TipTap | 3.22.3 | Rich text with many extensions |
| Charts | Recharts | 3.8.1 | |
| E2E Tests | Playwright | ^1.49.0 | |
| AI SDKs | openai | 6.34.0 | |
| AI SDKs | @anthropic-ai/sdk | 0.88.0 | |
| Payments | stripe | ^16.0.0 | |

Root `package.json` pins `typescript` to `6.0.2` in devDependencies, but `apps/api` explicitly uses `5.9.3`. The API must compile with its own TS version.

## Developer Workflows

All commands run from the repo root unless noted.

### Prerequisites
- Node.js 24+ and npm 11+
- Docker Desktop (for Postgres + Redis)

### Environment Setup
1. Copy `.env.dev.example` → `.env.dev` and fill values.
2. Copy `.env.prod.example` → `.env.prod` for production.

### Infrastructure (Docker)
```bash
npm run dev:infra          # Start Postgres 17 + Redis 7
npm run dev:infra:down     # Stop infrastructure
```

### Install Dependencies
```bash
npm install
```

### Database Lifecycle
```bash
npm run db:generate        # Generate Prisma client
npm run db:migrate         # Run migrations (dev)
npm run db:deploy          # Deploy migrations (production)
npm run db:seed            # Seed test data
npm run db:studio          # Open Prisma Studio
```

Seed data creates:
- User: `test@flowpig.dev` / `testpassword123`
- Workspace: `acme-corp` (slug)
- Team: `ENG`
- 10 sample issues (ENG-1 through ENG-10)
- 3 sample notes
- "Product Tasks" database with TABLE view, 3 properties, and 3 rows

### Development Servers
```bash
npm run dev:api            # Fastify with tsx watch (port 3001)
npm run dev:web            # React Router dev server (port 5173)
```
The web dev server proxies `/api` to `http://localhost:3001`.

### Build
```bash
npm run build:api          # tsc in apps/api
npm run build:web          # react-router build in apps/web
npm run build:all          # Both sequentially
```

### Production (Docker)
```bash
npm run prod:build         # docker compose -f compose.prod.yml build
npm run prod:up            # Start full stack
npm run prod:down          # Stop
npm run prod:logs          # Follow logs
npm run prod:ps            # List containers
```

### E2E Testing
```bash
npm run test:e2e           # Playwright headless
npm run test:e2e:ui        # Playwright UI mode
npm run test:e2e:headed    # Playwright headed
```
E2E tests assume dev servers are running and the database is seeded. Override the workspace slug with `WORKSPACE=your-slug`.

### Lint / Type Check
There are no `test` scripts in workspace package manifests. Validation is done via TypeScript:
```bash
npm run lint --workspaces --if-present
npm run type-check --workspaces --if-present
```
(These are used in CI.)

## API Conventions

### Route Registration
All routes are registered centrally in `apps/api/src/app.ts`. The file is split into:
- **Public routes** (`/health`, `/auth`, `/uploads`, `/share`) — no auth required.
- **Protected routes** — nested plugin with an `onRequest` hook that populates `request.user` from the Better Auth session.
- **Webhook routes** (`/webhooks`) — outside protected routes so Stripe can send raw bodies.

### Route Protection Pattern
Workspace resource routes use an explicit `preHandler` array:
```typescript
preHandler: [requireAuth, extractWorkspace]
```
- `requireAuth` (`apps/api/src/plugins/auth.ts`) sends 401 if `request.user` is missing.
- `extractWorkspace` (`apps/api/src/middleware/workspace.ts`) sends 403 if the user is not a member.

### `request.user` Type Pattern
`AuthenticatedRequest` declares `user` as optional (`user?: User`). After `requireAuth` runs, it is guaranteed present, but TypeScript still sees it as optional. **Do not add `as any` casts** — use non-null assertions (`request.user!`) or guard checks instead. All existing routes have been cleaned of `as any` on `request.user`.

### Workspace Identifier Duality
`extractWorkspace` accepts **either a workspace slug or a workspace ID** in the `workspaceId` route parameter. The frontend navigates with slugs (e.g., `/acme-corp/issues`), but some internal/backend paths may still pass IDs. Do not break this duality.

### Soft Deletes
Nearly every model has `deletedAt DateTime?`. Reads must filter `deletedAt: null`. This applies to issues, comments, notes, uploads, workspace members, etc.

### Date Serialization
API responses manually serialize dates with `.toISOString()`. Keep this consistent when adding new response fields.

### Validation
Many write routes import Zod schemas from `@flowpigdev/contracts` (e.g., `CreateIssueSchema`, `UpdateWorkspaceSchema`). Some newer modules may still parse raw request bodies.

### Workspace Settings Merge
The `PATCH /:workspaceId` endpoint uses `mergeJsonSettings()` to deeply merge incoming `settings` JSON with existing values. This preserves unrelated keys (e.g., updating `appearance.theme` does not wipe `appearance.color`). Frontend settings patches should send partial nested objects like `{ settings: { appearance: { theme: 'dark' } } }`.

### Prisma Access
Use `fastify.prisma` (decorated by `prismaPlugin`). Do not instantiate `PrismaClient` directly in routes.

### Storage Access
Use `fastify.storage` (decorated by `storagePlugin`). The interface is `StorageProvider` with `upload`, `delete`, and `getPublicUrl`.

### Database Endpoints (Added)
The databases module now supports full property/view/cell management:
- `POST /:databaseId/views` — create a DatabaseView
- `POST /:databaseId/properties` — create a DatabaseProperty (order auto-increments from max existing)
- `PATCH /:databaseId/rows/:rowId/cells/:propertyId` — upsert a DatabaseCell
- Cells are returned as `Record<string, any>` (property ID → value), not an array of `{propertyId, value}` objects.

### WebSocket Broadcasts
Use the decorated helpers:
- `fastify.broadcastToWorkspace(workspaceId, event)`
- `fastify.broadcastToUser(userId, event)`

Event types emitted by the backend include: `issue.updated`, `comment.created`, `note.updated`, `notification.created`.

### Auth Route Proxy
All `/auth/*` requests are proxied through `apps/api/src/modules/auth/auth.routes.ts` to the Better Auth handler. The proxy uses a **scoped** content-type parser (`parseAs: 'buffer'`) so Better Auth can parse its own JSON. **Do not call `removeAllContentTypeParsers()` globally** inside the auth plugin — it breaks sibling routes (e.g., uploads) that expect parsed bodies.

Cookie forwarding from the proxy to the client uses `response.headers.getSetCookie()` to properly handle multiple `Set-Cookie` headers. The proxy skips forwarding the `Location` header on 2xx JSON responses so the React app receives clean JSON without hard redirects.

## Frontend Conventions

### Data Fetching
Most data fetching is done through direct `fetch(..., { credentials: 'include' })` via the `fetchApi` helper in `apps/web/src/lib/api.ts`. **Always include `credentials: 'include'`** so session cookies are sent.

### React Query Keys
Keys are route/domain scoped, for example:
- `['issue', workspace, issueId]`
- `['notifications', 'count']`
- `['workspace', workspaceSlug]`

### Navigation URLs
All workspace-scoped URLs use the workspace **slug**:
```
/${workspaceSlug}/issues
/${workspaceSlug}/issues/${issueId}
/${workspaceSlug}/notes/${noteSlug}
```

### Auth
The `AuthProvider` in `apps/web/src/lib/auth-client.tsx` wraps `better-auth/react`. It exposes `login`, `signup`, `loginWithProvider`, `logout`, and `useAuth`. The `RequireAuth` component redirects unauthenticated users to `/login`.

**Email/password auth**: Do **not** pass `callbackURL` to `authClient.signIn.email()` or `signUp.email()`. Better Auth's `redirectPlugin` forces a hard `window.location.href` reload when `callbackURL` is present, which breaks React state and session cookie processing. The React app calls `navigate()` after successful login instead.

**Appearance auto-save**: Workspace color and theme settings auto-save on click without requiring a "Save appearance" button. The `applyThemeToDom()` helper in `settings.tsx` updates `localStorage` and toggles the `.light` class on `<html>` immediately, then fires the API PATCH.

### Animations
Shared wrappers from `@flowpigdev/ui` are used throughout workspace screens:
- `<AnimatedPage>` — fade + slide on mount
- `<AnimatedList>` + `<AnimatedItem>` — staggered list entrance
- `<AnimatedCard>` — hover scale + tap shrink

### TipTap JSON Text Extraction
`Issue.description` is stored as TipTap JSON (`Json?` in Prisma). Do not render it directly as `{issue.description}` — it will crash React. Use `getDescriptionText()` from `apps/web/src/lib/description.ts` to extract plain text for list views, triage cards, and any non-editor display.

### Runtime Config
`apps/web/src/lib/runtime-config.ts` resolves `API_URL` and `WS_URL`:
- Infers API subdomain from window location (`app.example.com` → `api.example.com`).
- Replaces localhost URLs with the actual page hostname in dev (for LAN/mobile testing).
- Falls back to `http://localhost:3001` and `ws://localhost:3001/ws`.

## Database Conventions

### Schema Patterns
- **Primary keys**: CUIDs (`@id @default(cuid())`).
- **Soft deletes**: `deletedAt DateTime?` on almost every model.
- **Audit fields**: `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`.
- **Indexes**: Added on foreign keys and frequently queried fields (e.g., `@@index([slug])`, `@@index([userId])`).

### Better Auth Tables
The schema includes Better Auth-managed tables (`Account`, `Session`, `VerificationToken`) alongside application tables. There is no separate auth user table — the app `User` model is the Better Auth user.

### Prisma Client Generation
The generator outputs to `packages/db/src/generated/prisma`. Import from `@flowpigdev/db` or `@flowpigdev/db/client`.

### Prisma Enum Exports
The `@prisma/client` stub in `packages/db` does **not** export generated enums directly. Enums like `TemplateType` are re-exported from `packages/db/src/index.ts`:
```typescript
export { TemplateType } from './generated/prisma/index.js';
```
API routes should import enums from `@flowpigdev/db`, not `@prisma/client`.

### Client Singleton
`packages/db/src/client.ts` creates a single `PrismaClient` instance using `@prisma/adapter-pg` with a `pg.Pool`. In non-production, the instance is cached on `globalThis` to survive HMR.

### Seed Script
`packages/db/seed.ts` explicitly loads `.env.dev` before importing the Prisma client. Run it with:
```bash
npm run db:seed
```

## Testing Strategy

### E2E Tests (Playwright)
- **Location**: `tests/e2e/`
- **Config**: `playwright.config.ts` at repo root
- **Test files**:
  - `auth.spec.ts` — Login / signup form rendering, validation, navigation
  - `issues.spec.ts` — Issue list, create modal, detail page, filtering
  - `landing.spec.ts` — Landing page smoke tests
  - `style-regression.spec.ts` — Visual regression guards
- **Assumptions**:
  - Dev servers running (`npm run dev:api` + `npm run dev:web`)
  - Database seeded (`npm run db:seed`)
  - Default workspace slug: `acme-corp` (override with `WORKSPACE` env var)
- **Important**: The frontend has **no route-level auth guards**. Unauthenticated users visiting a workspace page see the shell with no data; they are **not** redirected to `/login` by the frontend. The API returns 401/403 for protected data.

### CI / CD
- **CI** (`.github/workflows/ci.yml`):
  - Runs on push/PR to `main` and `develop`
  - Spins up Postgres 17 + Redis 7 services
  - Steps: install → `db:generate` → `db:migrate` → `lint` (workspaces) → `type-check` (workspaces) → `test` (workspaces, if-present) → Docker build test
- **Build & Push** (`.github/workflows/build-push.yml`):
  - Runs on push to `main` when `apps/**`, `packages/**`, or compose files change
  - Builds and pushes API + Web images to GHCR (`ghcr.io/.../flowpig-api`, `ghcr.io/.../flowpig-web`)

### No Unit Tests
There are no `test` scripts in any workspace `package.json`. Do not add Jest/Vitest unit tests unless explicitly requested.

## Deployment & Docker

### API Container (`apps/api/Dockerfile`)
- Multi-stage build: `builder` compiles TypeScript; `runner` runs the compiled output.
- `tsx` is installed globally in the runner image because the server still needs to load workspace TypeScript packages at runtime.
- `entrypoint.sh` runs `prisma db push --accept-data-loss` on startup, then `tsx dist/server.js`.
- Healthcheck hits `/health`.

### Web Container (`apps/web/Dockerfile`)
- Multi-stage build: `builder` runs `react-router build`; `runner` serves with `react-router-serve`.
- Build args: `VITE_API_URL`, `VITE_WS_URL`.
- Healthcheck hits the root path.

### Production Compose (`compose.prod.yml`)
Services:
- `postgres` — Postgres 17-alpine with persistent volume
- `redis` — Redis 7-alpine with AOF and password
- `api` — Fastify backend (port 3001)
- `web` — React Router frontend (port 3000)

Optional `nginx` service is commented out in the compose file. Security options (`no-new-privileges:true`) and resource limits are set on all services.

### Environment Variables (Production)
Key required vars in `.env.prod`:
- `DB_PASSWORD`, `DB_NAME`, `DB_USER`
- `REDIS_PASSWORD`
- `BETTER_AUTH_SECRET` (min 32 chars)
- `APP_URL`, `API_URL`, `BETTER_AUTH_URL`
- `VITE_API_URL`, `VITE_WS_URL`
- Optional: `AI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GITHUB_CLIENT_ID`, `GOOGLE_CLIENT_ID`, etc.

## Security Considerations

- **Session-based auth**: Better Auth uses HTTP-only cookies. All API calls from the frontend must include `credentials: 'include'`.
- **CORS**: Restricted to `getTrustedOrigins()`. In dev, this includes `APP_URL` aliases plus `localhost`/`127.0.0.1` on ports 5173–5199, 4173, and 3000. In production, it derives origins from `APP_URL`, `FRONTEND_URL`, `API_URL`, and auto-infers `app.` subdomain from `api.` subdomain.
- **Workspace authorization**: `extractWorkspace` enforces membership before any workspace-scoped data is returned.
- **Soft deletes**: All list/detail queries filter `deletedAt: null` to prevent access to deleted records.
- **Password policy**: Minimum 8 characters via Better Auth config.
- **Stripe webhooks**: Kept outside the protected-routes plugin so Fastify does not parse the raw body before the Stripe handler receives it.
- **Upload security**: Files are stored under `workspaces/${workspaceId}/${date}/${uuid}${ext}`. Metadata JSON files accompany uploads.

## Known Drift / Verify Before Refactoring

1. **Dual routing setup**: The web app contains both a React Router framework config (`src/app/routes.ts`) and a manual browser router (`src/app/router.tsx`). The **active entry path is framework mode** (`vite.config.ts` uses the `reactRouter()` plugin, and `package.json` scripts use `react-router dev` / `react-router build`). Do not refactor routing without confirming which system is actually booting.

2. **Slug vs. ID in workspace params**: Frontend URLs use workspace slugs, but `extractWorkspace` accepts both slug and ID. If you change one side, you must migrate both or keep the duality intact.

3. **TypeScript version split**: Root devDependencies list `typescript: 6.0.2`, but `apps/api` explicitly depends on `typescript: 5.9.3`. The API build must remain compatible with 5.9.

4. **No unit tests in workspace manifests**: Validation is purely TypeScript checks + Playwright E2E. Adding unit tests is a new workflow, not a missing fix.

5. **Native dependency guard**: `scripts/check-native-deps.cjs` runs before `npm run dev:web` and `npm run build:web`. It aborts the build if `node_modules` were installed for a different platform (common with WSL/Windows switching). If you see an error about esbuild/rollup platform mismatches, delete `node_modules` and reinstall from the current OS.

6. **Prisma adapter runtime**: The Prisma client uses `@prisma/adapter-pg` with a `pg.Pool`. This requires `DATABASE_URL` to be set before any import of `@flowpigdev/db`. The client singleton searches parent directories for `.env` / `.env.dev` as a fallback, but explicit env is preferred.

7. **Issue identifier generation**: The identifier generator finds the maximum issue number **numerically** (`parseInt(match[1], 10) + 1`), not by lexicographic `orderBy: { identifier: 'desc' }`. Lexicographic sort breaks after 10 issues (`ENG-9` > `ENG-10`).

8. **Content-type parser scope**: The auth route proxy previously called `fastify.removeAllContentTypeParsers()` globally, which broke upload routes expecting parsed JSON bodies. The fix uses a scoped parser. Never remove all parsers inside a plugin.

9. **Better Auth `callbackURL` on email auth**: Passing `callbackURL` to `authClient.signIn.email()` triggers Better Auth's built-in `redirectPlugin`, which sets `window.location.href = response.data.url` and interrupts React state / session cookie processing. **Do not pass `callbackURL` for email/password auth** — let the React app handle navigation smoothly via `navigate()`. OAuth flows (GitHub, Google) still need `callbackURL` because external redirects are required.
