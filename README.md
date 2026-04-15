# Flowpig.dev

Modern project management rebuilt with Fastify + React Router + Prisma.

Deployment notes for Coolify live in [docs/coolify.md](docs/coolify.md).

## ✅ What's Been Built

### Phase 2: Issues, Notes, Real-time & AI (NEW!)

### Architecture
- **Monorepo**: npm workspaces (no Turbo for simplicity)
- **Backend**: Fastify 5 with TypeScript
- **Frontend**: React Router v7 + Vite 6 + React 19
- **Database**: Prisma 6 + PostgreSQL
- **Auth**: Better Auth (merged with existing User table)
- **Animations**: Framer Motion throughout
- **Styling**: Tailwind CSS 3.4

### Features Implemented

#### Backend (apps/api)
- ✅ Fastify server with CORS
- ✅ Better Auth integration (/auth/* routes)
- ✅ Session-based authentication
- ✅ Workspace CRUD API
  - GET /workspaces (list with member counts)
  - POST /workspaces (create)
  - GET /workspaces/:id (with stats)
  - PATCH /workspaces/:id
  - GET /workspaces/:id/members
- ✅ Workspace authorization middleware
- ✅ Health check endpoints

#### Frontend (apps/web)
- ✅ React Router file-based routing
- ✅ TanStack Query for data fetching
- ✅ Better Auth client integration
- ✅ Landing page with animations
- ✅ Login page with test credentials hint
- ✅ Signup page
- ✅ Onboarding flow (workspace selection/creation)
- ✅ Workspace shell layout with sidebar
- ✅ Workspace dashboard with stats
- ✅ Framer Motion animations:
  - Page transitions
  - Staggered list items
  - Card hover effects
  - Smooth sidebar

#### Phase 2: Backend (apps/api)
- ✅ **Issues Module** - Full CRUD with filters
  - GET /workspaces/:id/issues (list with pagination, search, filters)
  - POST /workspaces/:id/issues (create with auto-generated identifier)
  - GET /workspaces/:id/issues/:id (detail with comments)
  - PATCH /workspaces/:id/issues/:id (update with activity tracking)
  - DELETE /workspaces/:id/issues/:id (soft delete)
- ✅ **Comments Module** - Issue & Note comments
  - GET /workspaces/:id/issues/:id/comments
  - POST /workspaces/:id/issues/:id/comments
  - PATCH /comments/:id (update)
  - DELETE /comments/:id (soft delete)
  - POST /comments/:id/reactions (emoji reactions)
  - DELETE /comments/:id/reactions (remove reaction)
- ✅ **Notes Module** - Document management
  - GET /workspaces/:id/notes (list with child count)
  - POST /workspaces/:id/notes (create with slug generation)
  - GET /workspaces/:id/notes/:id (detail with children & comments)
  - PATCH /workspaces/:id/notes/:id (update with slug regeneration)
  - DELETE /workspaces/:id/notes/:id (soft delete)
  - GET /workspaces/:id/notes/:id/comments
  - POST /workspaces/:id/notes/:id/comments
- ✅ **WebSocket Server** - Real-time updates
  - WebSocket endpoint at /ws
  - Session-based authentication
  - Workspace subscription model
  - Broadcast helpers for live updates
  - Event types: issue.updated, comment.created, note.updated, notification.created
- ✅ **AI Module** - OpenAI/Anthropic integration
  - POST /ai/chat (non-streaming JSON response)
  - POST /ai/stream (SSE streaming endpoint)
  - POST /ai/actions/:id/confirm (action confirmation flow)
  - Support for GPT-4o-mini, GPT-4o, Claude 3.5 Sonnet
  - Action execution system (CREATE_ISSUE, UPDATE_ISSUE, etc.)

#### Phase 2: Frontend (apps/web)
- ✅ **Issues List Page** - `/[workspace]/issues`
  - Search functionality
  - State & priority filters
  - Sortable columns
  - Comment counts
  - Assignee avatars
- ✅ **Issue Detail Page** - `/[workspace]/issues/[id]`
  - Full issue information display
  - Status sidebar with quick actions
  - Comment thread with real-time updates
  - Emoji reactions on comments
  - Add new comment with form
- ✅ **Notes List Page** - `/[workspace]/notes`
  - Grid layout of note cards
  - Search functionality
  - Subpage counts
  - Author/Editor info
- ✅ **WebSocket Client Hook** (`lib/ws.ts`)
  - useWebSocket() - Generic WebSocket management
  - useWorkspaceRealtime() - Workspace-specific updates
  - Automatic reconnection
  - Auth integration
  - Subscription management
- ✅ **AI Streaming Hook** (`lib/ai.ts`)
  - useAIStream() - Real-time streaming responses
  - useAIChat() - Non-streaming chat
  - Token-by-token display
  - Error handling
  - AbortController support

### Phase 3: Uploads, Rich Text, Notifications, Search & Databases (NEW!)

#### Backend (apps/api)
- ✅ **File Upload System**
  - Storage abstraction (local filesystem + S3-ready)
  - POST /uploads endpoint
  - Attach files to issues
  - Issue attachment management
  - File type detection
  - Size limits & validation
  - Upload tracking in database
- ✅ **Notification System**
  - Notification service with createNotification()
  - notifyIssueSubscribers() for issue updates
  - notifyWorkspaceMembers() for workspace events
  - GET /notifications (list with pagination)
  - GET /notifications/unread-count
  - POST /notifications/:id/read
  - POST /notifications/read-all
  - WebSocket real-time delivery
- ✅ **Search System**
  - Full-text search across issues, notes, users
  - GET /search/workspace/:id endpoint
  - Results ranking by relevance
  - Type filtering (issue, note, user)
- ✅ **Database Module (Notion-style)**
  - POST /workspaces/:id/databases (create)
  - GET /workspaces/:id/databases (list)
  - GET /workspaces/:id/databases/:id (with rows)
  - POST /workspaces/:id/databases/:id/rows (create row)
  - PATCH /workspaces/:id/databases/:id/rows/:id (update)
  - DELETE /workspaces/:id/databases/:id/rows/:id (delete)
  - Property types: TITLE, STATUS, PERSON, etc.
  - View system (Table, Board, Calendar, etc.)

#### Frontend (apps/web)
- ✅ **File Uploader Component** (`components/file-uploader.tsx`)
  - Drag & drop zone
  - Multiple file support
  - Progress bars
  - Image previews
  - Error handling
- ✅ **Rich Text Editor** (`components/rich-text-editor.tsx`)
  - TipTap editor integration
  - Bold, italic, strike
  - Headings (H1, H2, H3)
  - Lists (bullet, ordered, task)
  - Blockquotes
  - Code blocks
  - Links & images
  - Floating menu for quick actions
  - Bubble menu for text formatting
  - Undo/redo support
- ✅ **Notification Badge** (`components/notification-badge.tsx`)
  - Bell icon with unread count
  - Dropdown notification list
  - Real-time updates via WebSocket
  - Mark as read functionality
  - Mark all as read
  - Notification type icons
- ✅ **Command Palette** (`components/command-palette.tsx`)
  - CMD+K / Ctrl+K shortcut
  - Search across issues, notes, users
  - Keyboard navigation (arrow keys)
  - Quick navigation to results
  - Beautiful modal design
  - Type icons for results
- ✅ **useDebounce Hook** (`hooks/use-debounce.ts`)
  - Debounced search input
  - Performance optimization

#### Database (packages/db)
- ✅ **New Models Added**
  - Upload model (file metadata)
  - IssueAttachment model (file-issue links)
  - Extended User model with upload relations
  - Extended Workspace model with upload relations
  - Extended Issue model with attachments relation

#### Dependencies Added
- ✅ **TipTap Editor Stack**
  - @tiptap/core, @tiptap/react, @tiptap/starter-kit
  - @tiptap/extension-image, @tiptap/extension-link
  - @tiptap/extension-placeholder
  - @tiptap/extension-task-item, @tiptap/extension-task-list
  - @tiptap/extension-bubble-menu, @tiptap/extension-floating-menu
- ✅ **React Hot Toast** - Toast notifications

#### Shared Packages
- ✅ **Storage Abstraction** (`lib/storage/storage.ts`)
  - StorageProvider interface
  - FilesystemStorage implementation
  - S3Storage stub (future-ready)
  - File type detection
  - Size formatting utilities

#### Database (packages/db)
- ✅ Complete Prisma schema (50+ models)
- ✅ Better Auth tables integrated
- ✅ Seed script with test data
  - Test user: test@flowpig.dev / testpassword123
  - Sample workspace: "Acme Corp"
  - Sample team: "Engineering"
  - 5 sample issues (ENG-1 through ENG-5)
  - 3 sample notes
  - Workflow states

#### Shared Packages
- ✅ packages/contracts: Zod schemas + TypeScript types
- ✅ packages/ui: Framer Motion animation components

### Docker Dev Environment
- PostgreSQL 16
- Redis 7 (ready for future use)

## 📁 Project Structure

```
flowpigdev/
├── package.json                    # Root workspace config
├── .env.dev.example               # Dev environment template
├── .env.prod.example              # Prod environment template
├── .env.example                   # General template
├── .gitignore
├── ops/
│   └── docker/
│       └── compose.dev.yml        # Postgres + Redis
├── packages/
│   ├── db/                        # Prisma + seed
│   │   ├── prisma/schema.prisma  # 1,200+ lines, 50+ models
│   │   ├── src/client.ts         # PrismaClient singleton
│   │   └── seed.ts               # Test data
│   ├── contracts/                 # Shared types
│   │   └── src/
│   │       ├── auth.ts
│   │       ├── workspace.ts
│   │       ├── issue.ts
│   │       ├── note.ts
│   │       ├── realtime.ts
│   │       └── common.ts
│   └── ui/                        # Shared UI
│       └── src/components/motion.tsx
└── apps/
    ├── api/                       # Fastify backend
    │   ├── src/
    │   │   ├── server.ts          # Entry point (port 3001)
    │   │   ├── app.ts             # App configuration
    │   │   ├── plugins/
    │   │   │   ├── prisma.ts
    │   │   │   └── auth.ts        # Better Auth
    │   │   ├── middleware/
    │   │   │   └── workspace.ts   # Workspace authorization
    │   │   └── modules/
    │   │       ├── auth/auth.routes.ts
    │   │       ├── health/health.routes.ts
    │   │       └── workspaces/workspaces.routes.ts
    │   ├── package.json
    │   └── tsconfig.json
    └── web/                       # React Router SPA
        ├── src/
        │   ├── app/
        │   │   ├── router.tsx     # File-based routing setup
        │   │   └── providers.tsx  # QueryClient + AuthProvider
        │   ├── routes/
        │   │   ├── __root.tsx     # Root layout
        │   │   ├── index.tsx      # Landing page
        │   │   ├── login.tsx      # Login form
        │   │   ├── signup.tsx     # Signup form
        │   │   ├── onboarding.tsx # Workspace selection
        │   │   └── $workspace/
        │   │       ├── layout.tsx   # Workspace shell
        │   │       └── index.tsx    # Dashboard
        │   ├── lib/
        │   │   ├── auth-client.ts  # Better Auth React integration
        │   │   └── api.ts          # API client
        │   └── styles/
        │       ├── globals.css    # Tailwind + custom styles
        │       └── tailwind.css
        ├── index.html
        ├── vite.config.ts         # Vite + React Router
        └── package.json
```

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- Docker Desktop

### 1. Start Infrastructure

```bash
cd flowpigdev
docker compose -f ops/docker/compose.dev.yml up -d
```

This starts:
- PostgreSQL on port 5432
- Redis on port 6379

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Database

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed with test data
npm run db:seed
```

### 4. Start Development Servers

Terminal 1 - API:
```bash
npm run dev:api
```
→ http://localhost:3001

Terminal 2 - Web:
```bash
npm run dev:web
```
→ http://localhost:5173

### 5. Test Login

Navigate to http://localhost:5173/login

**Test Credentials:**
- Email: test@flowpig.dev
- Password: testpassword123

Or create a new account at /signup

## 📦 Key Commands

```bash
# Infrastructure
npm run dev:infra          # Start Postgres + Redis
npm run dev:infra:down     # Stop infrastructure

# Development
npm run dev:api            # API server (port 3001)
npm run dev:web            # Web dev server (port 5173)

# Database
npm run db:generate        # Generate Prisma client
npm run db:migrate         # Run migrations
npm run db:deploy          # Deploy migrations (prod)
npm run db:seed            # Seed test data
npm run db:studio          # Open Prisma Studio
```

## 🔌 API Endpoints

### Auth (Better Auth)
- `POST /auth/sign-in/email`
- `POST /auth/sign-up/email`
- `POST /auth/sign-out`
- `GET /auth/session`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- OAuth callbacks: `/auth/callback/:provider`

### Workspaces
- `GET /workspaces` - List all (with member counts)
- `POST /workspaces` - Create new
- `GET /workspaces/:id` - Get details + stats
- `PATCH /workspaces/:id` - Update
- `GET /workspaces/:id/members` - List members

### Issues
- `GET /workspaces/:id/issues` - List with filters, pagination, search
- `POST /workspaces/:id/issues` - Create issue (auto-generates identifier)
- `GET /workspaces/:id/issues/:id` - Get issue detail with comments
- `PATCH /workspaces/:id/issues/:id` - Update issue
- `DELETE /workspaces/:id/issues/:id` - Soft delete issue

### Issue Comments
- `GET /workspaces/:id/issues/:id/comments` - List comments
- `POST /workspaces/:id/issues/:id/comments` - Add comment
- `PATCH /comments/:id` - Update comment
- `DELETE /comments/:id` - Delete comment
- `POST /comments/:id/reactions` - Add reaction
- `DELETE /comments/:id/reactions?emoji=:emoji` - Remove reaction

### Notes
- `GET /workspaces/:id/notes` - List notes
- `POST /workspaces/:id/notes` - Create note (auto-generates slug)
- `GET /workspaces/:id/notes/:id` - Get note with children & comments
- `PATCH /workspaces/:id/notes/:id` - Update note
- `DELETE /workspaces/:id/notes/:id` - Delete note

### Note Comments
- `GET /workspaces/:id/notes/:id/comments` - List comments
- `POST /workspaces/:id/notes/:id/comments` - Add comment

### AI
- `POST /ai/chat` - Non-streaming chat (returns JSON)
- `POST /ai/stream` - Streaming chat (SSE - Server Sent Events)
- `POST /ai/actions/:id/confirm` - Confirm/cancel AI action

### WebSocket
- `GET /ws` - WebSocket endpoint for real-time updates
  - Send: `{ type: 'auth', token: 'session_token' }`
  - Send: `{ type: 'subscribe', workspaceId: '...' }`
  - Receive: `{ type: 'issue.updated', payload: {...} }`
  - Receive: `{ type: 'comment.created', payload: {...} }`
  - Receive: `{ type: 'note.updated', payload: {...} }`

### Health
- `GET /health` - Status check
- `GET /health/db` - Database connectivity

## 🎨 Animation Highlights

### Framer Motion Usage
- **Page transitions**: Smooth fade + slide on route changes
- **Staggered lists**: Items animate in sequence (0.05s delay each)
- **Card hover**: Scale 1.02 with spring physics
- **Button press**: Scale 0.98 on tap
- **Sidebar**: Smooth layout animations

### Example Components
```typescript
// Animated page wrapper
<AnimatedPage>
  <YourContent />
</AnimatedPage>

// Staggered list
<AnimatedList>
  {items.map(item => (
    <AnimatedItem key={item.id}>
      <YourCard />
    </AnimatedItem>
  ))}
</AnimatedList>
```

## 🔐 Security

- Session-based authentication via Better Auth
- CORS configured for local development
- Workspace-level authorization middleware
- All routes protected except public pages
- Password hashing with bcrypt (12 rounds)

## 📊 Database Stats

- **50+ models** (complete Linear/Notion clone schema)
- **CUIDs everywhere** (Better Auth compatible)
- **Soft deletes** (deletedAt pattern)
- **Full audit trail** (createdAt, updatedAt)
- **Relations** properly indexed

## 🎯 Next Steps (Phase 2)

1. **Issues Module**
   - List view with filters
   - Detail view with comments
   - Create/edit forms
   - State transitions

2. **Notes Module**
   - Rich text editor
   - Nested pages
   - Publishing

3. **Real-time**
   - WebSocket server setup
   - Live issue updates
   - Comment notifications

4. **AI Integration**
   - SSE streaming for AI responses
   - OpenAI/Anthropic providers
   - Action confirmation flow

## 📝 Notes

- **No Turbo**: Kept simple with npm workspaces only
- **No SSR**: Pure SPA as requested
- **Better Auth**: Uses existing User table, no dual tables
- **Local storage**: Files stored in ./data/uploads (filesystem)
- **Fresh DB**: No migration from old data, clean slate

## 🐛 Troubleshooting

**Database connection errors:**
- Check Docker is running: `docker ps`
- Verify env vars: `cat .env`
- Try: `npm run dev:infra:down && npm run dev:infra`

**Auth issues:**
- Clear browser cookies for localhost
- Check Better Auth secret is set in .env
- Verify database has user after seed

**Port conflicts:**
- API uses port 3001
- Web uses port 5173
- Change in .env if needed

---

**Phase 1 Complete!** 🎉

Ready for Phase 2: Issues, Notes, Real-time, and AI features.
