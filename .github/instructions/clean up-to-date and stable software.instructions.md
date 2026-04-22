---
description: Project conventions, coding rules, and critical gotchas for AI agents working on the Flowpig codebase.
applyTo: '**/*.{ts,tsx,js,jsx,json,md,prisma,css}'
---

# Flowpig — Agent Coding Instructions

Read [AGENTS.md](../../AGENTS.md) first for full architecture overview. These instructions are the quick-reference rules.

---

## 1. TypeScript Rules

### Never use `as any`
If TypeScript complains about `request.user`, `request.workspace`, or Prisma return types, find the proper fix:
- `request.user!` — non-null assertion after `requireAuth`
- `request.workspace!` — non-null assertion after `extractWorkspace`
- Import types from `@flowpigdev/db` or `@flowpigdev/contracts`
- Add type guards (e.g., `isRelationValue()`) instead of casting

### TypeScript version split
- Root `package.json` pins `typescript: 6.0.2` in devDependencies
- `apps/api` explicitly depends on `typescript: 5.9.3`
- **The API must compile with 5.9.3**. Do not use TS 6-only syntax in `apps/api`.

---

## 2. API Route Rules

### Route registration
All routes are registered in `apps/api/src/app.ts`. Public routes, protected routes (with `onRequest` hook), and webhook routes each have their own section.

### Workspace route protection
Always use the explicit `preHandler` array:
```typescript
preHandler: [requireAuth, extractWorkspace]
```

### Workspace param duality
`extractWorkspace` accepts **either a slug or an ID** in the `workspaceId` param. Frontend navigates with slugs (`/acme-corp/issues`). **Do not break this duality**.

### Soft deletes
Nearly every model has `deletedAt DateTime?`. **Always filter `deletedAt: null`** in list/detail queries.

### Date serialization
Manually serialize dates with `.toISOString()` in API responses. Do not return raw Date objects.

### Database cells shape
API returns `cells: Record<string, any>` (property ID → value). **Not** `Array<{propertyId, value}>`.

### Content-type parser scope
If you need to customize body parsing in a route plugin, scope it to that route only. **Never call `fastify.removeAllContentTypeParsers()` globally** inside a plugin — it breaks sibling routes (e.g., uploads) that expect parsed JSON bodies.

### Cookie forwarding
When proxying/auth-related, use `response.headers.getSetCookie()` for multi-cookie forwarding. Do not manually parse `set-cookie` headers.

---

## 3. Auth Rules

### Email/password login
**Do not pass `callbackURL`** to `authClient.signIn.email()` or `signUp.email()`. Better Auth's `redirectPlugin` forces a hard `window.location.href` reload when `callbackURL` is present, breaking React state and session cookie processing. Let the React app call `navigate()` after login.

### OAuth login
GitHub/Google OAuth **still need** `callbackURL` because external redirects are required.

### Session cookies
Always include `credentials: 'include'` in `fetch` calls from the frontend so session cookies are sent.

---

## 4. Frontend Rules

### Data fetching
Use `fetchApi` from `apps/web/src/lib/api.ts`. It wraps `fetch` with the correct base URL and `credentials: 'include'`.

### React Query keys
Use route/domain-scoped keys:
```typescript
['issue', workspace, issueId]
['notifications', 'count']
['workspace', workspaceSlug]
```

### Navigation URLs
All workspace-scoped URLs use the workspace **slug**:
```
/${workspaceSlug}/issues
/${workspaceSlug}/issues/${issueId}
/${workspaceSlug}/notes/${noteSlug}
```

### TipTap JSON rendering
`Issue.description` is TipTap JSON (`Json?` in Prisma). **Never render it directly** as `{issue.description}` — it crashes React. Use `getDescriptionText()` from `apps/web/src/lib/description.ts` for plain-text display.

### Theme handling
Workspace appearance (color + theme) auto-saves on click. The `applyThemeToDom()` helper updates `localStorage` and toggles the `.light` class on `<html>` immediately, then fires the API PATCH. Do not add "Save" buttons for appearance.

---

## 5. Database / Prisma Rules

### Enum imports
Import Prisma enums from `@flowpigdev/db`, not `@prisma/client`:
```typescript
import { TemplateType } from '@flowpigdev/db';
```
The `@prisma/client` stub does not export enums directly.

### Prisma client access
Use `fastify.prisma` (decorated by `prismaPlugin`). Never instantiate `PrismaClient` directly in routes.

### Settings merge
`PATCH /:workspaceId` uses `mergeJsonSettings()` to deeply merge incoming `settings` JSON. Send partial nested objects like `{ settings: { appearance: { theme: 'dark' } } }` instead of replacing the entire object.

---

## 6. Styling Rules

### Design tokens
Use the custom `@theme` tokens, never raw Tailwind grays in dark UI:
| ❌ Bad | ✅ Good |
|---|---|
| `bg-white`, `bg-gray-50/100/200` | `bg-linear-surface`, `bg-linear-elevated` |
| `text-gray-400/500/700/900` | `text-linear-text-secondary`, `text-linear-text` |
| `bg-blue-500/600`, `bg-cyan-*` | `bg-linear-accent` |
| `rounded-2xl/3xl/4xl` (app UI) | `rounded-lg`, `rounded-xl` |
| `flex-shrink-0`, `flex-grow` | `shrink-0`, `grow` |

See `.github/skills/style-achiever-and-maintainer/SKILL.md` for the full audit procedure.

---

## 7. Build & Test Rules

### Before committing changes
1. Run `npm run build:api` — must compile cleanly
2. Run `npm run build:web` — must build successfully
3. Run `npm run test:e2e` — all tests must pass (32 passed is baseline)

### Platform mismatch
If you see esbuild/rollup platform mismatch errors, delete `node_modules` and `npm install` from the current OS. `scripts/check-native-deps.cjs` enforces this.

### No unit tests
Do not add Jest/Vitest unit tests unless explicitly requested. Validation is TypeScript + Playwright E2E only.

---

## 8. Critical Gotchas (Check Before Refactoring)

1. **Dual routing setup**: Active path is React Router **framework mode** (`vite.config.ts` uses `reactRouter()` plugin). Do not refactor routing without confirming which system boots.
2. **Slug vs. ID in workspace params**: Frontend uses slugs, backend accepts both. Keep the duality intact.
3. **Issue identifier generation**: Finds numeric max (`parseInt(match[1], 10) + 1`), not lexicographic sort. Lexicographic breaks after 10 issues.
4. **Prisma adapter runtime**: `DATABASE_URL` must be set before importing `@flowpigdev/db`.
5. **Native dependency guard**: Runs before `dev:web` and `build:web`. Cross-platform `node_modules` will fail.
