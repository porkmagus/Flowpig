# Flowpig

Modern project management rebuilt with Fastify 5 + React Router v7 + Prisma 7.

Deployment notes for Coolify live in [docs/coolify.md](docs/coolify.md).
AI coding agent instructions live in [AGENTS.md](AGENTS.md).

---

## Architecture

- **Monorepo**: npm workspaces (no Turbo for simplicity)
- **Backend**: Fastify 5.8.4 with TypeScript 5.9
- **Frontend**: React Router v7 (framework mode) + Vite 7.3 + React 19 + Tailwind CSS 4.2
- **Database**: Prisma 7.7 + PostgreSQL 17
- **Auth**: Better Auth 1.6.2 (merged with existing User table)
- **Realtime**: Custom WebSocket server (`@fastify/websocket`)
- **AI**: OpenAI & Anthropic SDKs with SSE streaming
- **Animations**: Framer Motion throughout
- **Styling**: Tailwind CSS 4 with custom `@theme` tokens (`linear-bg`, `linear-surface`, etc.)

---

## What's Built

### Backend (apps/api)

- ✅ Fastify server with CORS + trusted origins
- ✅ Better Auth integration (`/auth/*` routes proxied)
- ✅ Session-based authentication (HTTP-only cookies)
- ✅ Workspace CRUD + authorization middleware
- ✅ **Issues Module** — Full CRUD with filters, auto-generated identifiers (`TEAM-1`)
- ✅ **Comments Module** — Issue & Note comments with reactions
- ✅ **Notes Module** — Document management with slug generation, children, publishing
- ✅ **WebSocket Server** — Real-time updates, workspace subscriptions, presence
- ✅ **AI Module** — OpenAI/Anthropic SSE streaming + JSON chat + action confirmation
- ✅ **File Uploads** — Local filesystem storage (S3-ready abstraction)
- ✅ **Notifications** — Real-time WebSocket delivery + mark-as-read
- ✅ **Search** — Full-text search across issues, notes, users
- ✅ **Database Module** — Notion-style databases with properties, views, rows, cells
- ✅ **Teams, Cycles, Projects, Roadmap, Triage, Analytics, Billing, Git** — Route stubs + partial implementations
- ✅ **Templates** — Issue templates with `TemplateType` enum

### Frontend (apps/web)

- ✅ React Router framework mode with file-based routing
- ✅ TanStack Query for data fetching
- ✅ Better Auth client integration
- ✅ Landing page with animations (forced dark theme)
- ✅ Login / Signup / Onboarding flow
- ✅ Workspace shell layout with sidebar
- ✅ **Issues List** — Search, filters, sortable columns, assignee avatars
- ✅ **Issue Detail** — Status sidebar, comment thread, emoji reactions
- ✅ **Notes List & Detail** — Grid layout, subpages, rich text editor
- ✅ **Databases** — Table, Board, Calendar, Gallery, Timeline, List views with inline cell editing
- ✅ **WebSocket Client** — `useWorkspaceRealtime()` hook with auto-reconnection
- ✅ **AI Streaming** — `useAIStream()` with token-by-token display
- ✅ **Command Palette** — CMD+K search across issues, notes, users
- ✅ **Notification Badge** — Bell icon with unread count + dropdown
- ✅ **Rich Text Editor** — TipTap with bold, headings, lists, links, images, task lists
- ✅ **File Uploader** — Drag & drop with progress bars and previews

### Database (packages/db)

- ✅ Complete Prisma schema (~50 models)
- ✅ Better Auth tables integrated (no dual user tables)
- ✅ Soft deletes (`deletedAt`) on nearly every model
- ✅ CUID primary keys everywhere
- ✅ Full audit trail (`createdAt`, `updatedAt`)
- ✅ Seed script with test data:
  - User: `test@flowpig.dev` / `testpassword123`
  - Workspace: "Acme Corp" (`acme-corp` slug)
  - Team: "Engineering" (`ENG`)
  - 10 sample issues (ENG-1 through ENG-10)
  - 3 sample notes
  - "Product Tasks" database with TABLE view, 3 properties, 3 rows

### Shared Packages

- ✅ `packages/contracts` — Zod schemas + TypeScript types
- ✅ `packages/ui` — Framer Motion animation wrappers (`AnimatedPage`, `AnimatedList`, etc.)
- ✅ `packages/db` — Prisma client singleton with `@prisma/adapter-pg`

---

## 📁 Project Structure

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
        runtime-config.ts             # API_URL / WS_URL resolution
        formula-engine.ts             # Formula evaluation for databases
        presence.ts                   # Presence UI helpers
        description.ts                # getDescriptionText() for TipTap JSON
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
    prisma/schema.prisma              # Source of truth (~50 models)
    src/
      client.ts                       # PrismaClient singleton with @prisma/adapter-pg
      index.ts                        # Re-exports prisma + TemplateType enum
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
    compose.prod.yml                  # Prod services
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

---

## 🚀 Getting Started

### Prerequisites
- Node.js 24+ and npm 11+
- Docker Desktop (for Postgres + Redis)

### 1. Environment Setup

```bash
# Copy dev environment template
cp .env.dev.example .env.dev
# Fill in values (especially DATABASE_URL, BETTER_AUTH_SECRET)
```

### 2. Start Infrastructure

```bash
npm run dev:infra          # Start Postgres 17 + Redis 7
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Setup Database

```bash
npm run db:generate        # Generate Prisma client
npm run db:migrate         # Run migrations
npm run db:seed            # Seed test data
```

### 5. Start Development Servers

```bash
# Terminal 1 — API
npm run dev:api            # → http://localhost:3001

# Terminal 2 — Web
npm run dev:web            # → http://localhost:5173
```

The web dev server proxies `/api` to `http://localhost:3001`.

### 6. Test Login

Navigate to http://localhost:5173/login

**Test Credentials:**
- Email: `test@flowpig.dev`
- Password: `testpassword123`

Or create a new account at `/signup`.

---

## 📦 Key Commands

```bash
# Infrastructure
npm run dev:infra          # Start Postgres + Redis
npm run dev:infra:down     # Stop infrastructure

# Development
npm run dev:api            # API server (port 3001, tsx watch)
npm run dev:web            # React Router dev server (port 5173)

# Database
npm run db:generate        # Generate Prisma client
npm run db:migrate         # Run migrations (dev)
npm run db:deploy          # Deploy migrations (production)
npm run db:seed            # Seed test data
npm run db:studio          # Open Prisma Studio

# Build
npm run build:api          # tsc in apps/api
npm run build:web          # react-router build in apps/web
npm run build:all          # Both sequentially

# Production (Docker)
npm run prod:build         # docker compose build
npm run prod:up            # Start full stack
npm run prod:down          # Stop
npm run prod:logs          # Follow logs

# E2E Testing
npm run test:e2e           # Playwright headless
npm run test:e2e:ui        # Playwright UI mode
npm run test:e2e:headed    # Playwright headed
```

---

## 🔌 API Endpoints

### Auth (Better Auth — proxied through `/auth`)
- `POST /auth/sign-in/email`
- `POST /auth/sign-up/email`
- `POST /auth/sign-out`
- `GET /auth/session`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- OAuth callbacks: `/auth/callback/:provider`

### Workspaces
- `GET /workspaces` — List all (with member counts)
- `POST /workspaces` — Create new
- `GET /workspaces/:id` — Get details + stats
- `PATCH /workspaces/:id` — Update (deep-merges `settings` JSON)
- `GET /workspaces/:id/members` — List members

### Issues
- `GET /workspaces/:id/issues` — List with filters, pagination, search
- `POST /workspaces/:id/issues` — Create issue (auto-generates `TEAM-N` identifier)
- `GET /workspaces/:id/issues/:id` — Get issue detail with comments
- `PATCH /workspaces/:id/issues/:id` — Update issue
- `DELETE /workspaces/:id/issues/:id` — Soft delete issue

### Issue Comments
- `GET /workspaces/:id/issues/:id/comments` — List comments
- `POST /workspaces/:id/issues/:id/comments` — Add comment
- `PATCH /comments/:id` — Update comment
- `DELETE /comments/:id` — Delete comment
- `POST /comments/:id/reactions` — Add reaction
- `DELETE /comments/:id/reactions?emoji=:emoji` — Remove reaction

### Notes
- `GET /workspaces/:id/notes` — List notes
- `POST /workspaces/:id/notes` — Create note (auto-generates slug)
- `GET /workspaces/:id/notes/:id` — Get note with children & comments
- `PATCH /workspaces/:id/notes/:id` — Update note
- `DELETE /workspaces/:id/notes/:id` — Delete note

### Note Comments
- `GET /workspaces/:id/notes/:id/comments` — List comments
- `POST /workspaces/:id/notes/:id/comments` — Add comment

### Databases
- `GET /workspaces/:id/databases` — List databases
- `POST /workspaces/:id/databases` — Create database
- `GET /workspaces/:id/databases/:id` — Get database with rows, views, properties
- `POST /workspaces/:id/databases/:id/rows` — Create row
- `PATCH /workspaces/:id/databases/:id/rows/:id` — Update row
- `DELETE /workspaces/:id/databases/:id/rows/:id` — Delete row
- `POST /workspaces/:id/databases/:id/views` — Create view
- `POST /workspaces/:id/databases/:id/properties` — Create property
- `PATCH /workspaces/:id/databases/:id/rows/:rowId/cells/:propertyId` — Update cell

### AI
- `POST /ai/chat` — Non-streaming chat (returns JSON)
- `POST /ai/stream` — Streaming chat (SSE — Server Sent Events)
- `POST /ai/actions/:id/confirm` — Confirm/cancel AI action

### WebSocket
- `GET /ws` — WebSocket endpoint for real-time updates
  - Send: `{ type: 'auth', token: 'session_token' }`
  - Send: `{ type: 'subscribe', workspaceId: '...' }`
  - Receive: `{ type: 'issue.updated', payload: {...} }`
  - Receive: `{ type: 'comment.created', payload: {...} }`
  - Receive: `{ type: 'note.updated', payload: {...} }`
  - Receive: `{ type: 'notification.created', payload: {...} }`

### Health
- `GET /health` — Status check
- `GET /health/db` — Database connectivity

---

## 🎨 Design System

Custom Tailwind v4 `@theme` tokens defined in `apps/web/src/styles/globals.css`:

| Token | Hex / Value | Use |
|---|---|---|
| `linear-bg` | `#05070b` | Page background |
| `linear-surface` | `#0b1016` | Panels, sidebars, card backgrounds |
| `linear-elevated` | `#111820` | Modals, popovers, dropdowns |
| `linear-border` | `#1e2a38` | All borders |
| `linear-text` | `#eef1f6` | Primary text |
| `linear-text-secondary` | `#7f8fa4` | Secondary / helper text |
| `linear-accent` | `#5E6AD2` | Primary CTA, active state, links |

See `.github/skills/style-achiever-and-maintainer/SKILL.md` for full design system audit rules.

---

## 🔐 Security

- Session-based authentication via Better Auth (HTTP-only cookies)
- CORS restricted to `getTrustedOrigins()`
- Workspace-level authorization middleware (`extractWorkspace`)
- Soft deletes on all models (`deletedAt: null` filtering)
- Password hashing with bcrypt (min 8 chars)
- Stripe webhooks kept outside protected-routes plugin for raw body access
- Uploads stored under `workspaces/${workspaceId}/${date}/${uuid}${ext}`

---

## 🧪 Testing

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
  - Default workspace slug: `acme-corp`

### Validation
No unit tests in workspace manifests. Validation is purely TypeScript:
```bash
npm run lint --workspaces --if-present
npm run type-check --workspaces --if-present
```

---

## 📝 Notes

- **No Turbo**: Kept simple with npm workspaces only
- **No SSR**: Pure SPA
- **Better Auth**: Uses existing User table, no dual tables
- **Local storage**: Files stored in `./data/uploads` (filesystem)
- **Cookie name**: `better-auth.session_token`
- **Frontend has no route-level auth guards**: Unauthenticated users visiting workspace pages see the shell with no data; the API returns 401/403

---

**Built and maintained** 🐷
