# AGENTS.md

## Big Picture
- Monorepo uses npm workspaces (`apps/*`, `packages/*`) with no Turbo; root scripts orchestrate API, web, infra, and DB tasks (`package.json`).
- Backend is Fastify + Prisma in `apps/api`; frontend is React Router + Vite in `apps/web`; shared schemas/types live in `packages/contracts`; Prisma schema/client live in `packages/db`.
- Primary runtime data flow: Web UI -> REST endpoints (`/workspaces/...`) -> Prisma models (`packages/db/prisma/schema.prisma`) -> JSON responses with ISO date strings.
- Realtime flow: API writes events via `broadcastToWorkspace`/`broadcastToUser` (`apps/api/src/plugins/websocket.ts`) -> web hook `useWorkspaceRealtime` (`apps/web/src/lib/ws.ts`).
- AI flow: web `useAIStream` posts to `/ai/stream` and parses SSE `data:` frames (`apps/web/src/lib/ai.ts`), backend streams OpenAI/Anthropic tokens (`apps/api/src/modules/ai/ai.routes.ts`).

## Repo Topology
- `apps/api/src/app.ts`: central plugin + route registration (health, auth, workspaces, issues, comments, notes, AI, uploads, notifications, search, databases, cycles, teams, websocket).
- `apps/web/src/routes`: route-per-file UI pages (`$workspace/*` pattern for workspace-scoped pages).
- `packages/contracts/src/*.ts`: Zod schemas used by API for request validation (for example `CreateIssueSchema`, `UpdateWorkspaceSchema`).
- `packages/db/prisma/schema.prisma`: source of truth for enums, relations, and soft-delete fields.

## Developer Workflows
- Install deps from repo root: `npm install`.
- Start infra (uses `.env.dev` values): `npm run dev:infra`; stop with `npm run dev:infra:down`.
- DB lifecycle: `npm run db:generate`; `npm run db:migrate`; `npm run db:seed`; optional `npm run db:studio`.
- Run services separately: `npm run dev:api` (Fastify `tsx watch`), `npm run dev:web` (React Router dev server).
- There are no `test` scripts in workspace package manifests; validation is primarily TypeScript checks (`lint` / `typecheck` scripts).

## API Conventions (Project-Specific)
- Route protection pattern is explicit preHandlers, usually `preHandler: [requireAuth, extractWorkspace]` for workspace resources.
- `extractWorkspace` enforces membership and injects `request.workspace` (`apps/api/src/middleware/workspace.ts`).
- Soft delete is standard (`deletedAt`), and reads typically filter `deletedAt: null` (issues, comments, notes, uploads, etc.).
- API responses manually serialize dates with `.toISOString()`; keep this consistent when adding fields.
- Validation is mixed: many writes use shared Zod schemas from `@flowpigdev/contracts`, while some newer modules still parse raw request bodies.

## Frontend Conventions
- Data fetching is mostly direct `fetch(..., { credentials: 'include' })`; keep cookie auth enabled on all API calls.
- React Query keys are route/domain scoped (for example `['issue', workspace, issueId]`, `['notifications', 'count']`).
- Navigation URLs are workspace-slug based (`/${workspaceSlug}/issues/...`), while many backend routes are mounted as `:workspaceId` params.
- Shared animation wrappers (`AnimatedPage`, `AnimatedList`, `AnimatedCard`) from `@flowpigdev/ui` are used throughout workspace screens.

## Integrations and External Dependencies
- Better Auth: server plugin in `apps/api/src/plugins/auth.ts`, client session usage in `apps/web/src/lib/auth-client.tsx`.
- PostgreSQL via Prisma (`packages/db`), Redis container exists in dev compose but is not heavily used in app code yet.
- WebSocket endpoint at `/ws` with message types `auth`, `subscribe`, `unsubscribe`, `ping`.
- File uploads use `@fastify/multipart` + pluggable storage provider (`filesystem` active, S3 stubbed) in `apps/api/src/lib/storage/storage.ts`.

## Known Drift / Verify Before Refactoring
- Web code contains both React Router framework config (`react-router.config.ts`) and a manual router (`src/app/router.tsx`); check which entry path is active before routing refactors.
- Frontend often passes workspace slug in URLs while backend middleware expects `workspaceId`; preserve existing behavior unless you can migrate both sides together.

