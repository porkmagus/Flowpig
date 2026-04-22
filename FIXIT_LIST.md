# Flowpig Exhaustive Testing — Fixit List (Historical Record)

Generated: 2026-04-20
Tested: local dev servers (API 3001, Web 5173), seeded user `test@flowpig.dev`

**Status: ALL DISCREPANCIES RESOLVED ✅**

> This file documents the fixes applied during a comprehensive testing pass. All items below are fixed and verified. See [AGENTS.md](../../AGENTS.md) for current conventions and [README.md](../../README.md) for project overview.

---

## 🔴 P0 — CRASHES (FIXED)

### 1. Issue detail page crashes on load ✅
- **Symptom**: White error boundary: `Cannot read properties of undefined (reading 'length')`
- **Root cause**: API `GET /:issueId` returns `{ issue: { ... } }` (wrapped), but the frontend did `const { data: issue } = useQuery(...)` and treated `data` as the inner issue object.
- **Fix**: Changed queryFn to unwrap `payload.issue` before returning.
- **File**: `apps/web/src/routes/$workspace/issues.$issueId.tsx`

### 2. Notes list page crashes on load ✅
- **Symptom**: White error boundary: `useEffect is not defined`
- **Root cause**: Missing `useEffect` import (`useState` only).
- **Fix**: Added `useEffect` to the React import.
- **File**: `apps/web/src/routes/$workspace/notes.tsx`

### 3. Cycles page crashes on load ✅
- **Symptom**: White error boundary: `useEffect is not defined`
- **Root cause**: Same as Notes — missing `useEffect` import.
- **Fix**: Added `useEffect` to the React import.
- **File**: `apps/web/src/routes/$workspace/cycles.tsx`

### 4. Triage page crashes on load ✅
- **Symptom**: White error boundary: `Objects are not valid as a React child (found: object with keys {type, content})`
- **Root cause**: Prisma schema defines `Issue.description` as `Json?` (TipTap document). The triage page rendered it directly as text: `{issue.description}`.
- **Fix**: Created `getDescriptionText()` helper that extracts plain text from TipTap JSON docs, and applied it in triage and issue detail.
- **Files**: `apps/web/src/lib/description.ts` (new), `apps/web/src/routes/$workspace/triage.tsx`, `apps/web/src/routes/$workspace/issues.$issueId.tsx`

---

## 🟠 P1 — MAJOR FUNCTIONAL / VISUAL ISSUES (FIXED)

### 5. Landing page unreadable in light-mode browsers ✅
- **Symptom**: Hero text was white on a white/light background; feature cards appeared empty.
- **Root cause**: Landing page used `bg-linear-bg` which resolves to `#FFFFFF` when `.light` class is on `<html>` (from `prefers-color-scheme: light`), but text was hardcoded `text-white`.
- **Fix**: Added `.force-dark` CSS class that re-sets all theme variables to dark values, and applied `className="force-dark"` to the landing page root div.
- **Files**: `apps/web/src/styles/globals.css`, `apps/web/src/routes/index.tsx`

### 6. Hydration mismatch on every page load ✅
- **Symptom**: Console warning about mismatched `className` on `<html>`.
- **Root cause**: Inline theme script in `<body>` mutated `<html class>` before React hydrated.
- **Fix**: Added `suppressHydrationWarning` to the `<html>` element.
- **File**: `apps/web/src/app/root.tsx`

---

## 🟡 P2 — MEDIUM (FIXED)

### 7. Missing `/labels` API endpoint ✅
- **Symptom**: Console CORS errors on `GET /workspaces/:workspace/labels`.
- **Root cause**: Frontend called this endpoint but no route existed.
- **Fix**: Added `GET /workspaces/:workspaceId/labels` to `workspaces.routes.ts`.
- **File**: `apps/api/src/modules/workspaces/workspaces.routes.ts`

### 8. Context menu lacks ARIA roles ✅
- **Symptom**: Context menu buttons had no `role="menuitem"`.
- **Fix**: Added `role="menuitem"` to each context menu button.
- **File**: `apps/web/src/components/ui/context-menu.tsx`

---

## 🟢 P3 — LOW (FIXED)

### 9. No databases in seeded workspace ✅
- **Symptom**: Databases list showed empty state.
- **Fix**: Added a sample "Product Tasks" database with TABLE view, 3 properties (Title, Status, Priority), and 3 rows to `seed.ts`.
- **File**: `packages/db/seed.ts`

### 10. JSON description rendering audit ✅
- **Fix**: All places that render `issue.description` as text now use `getDescriptionText()`.
- **Files**: `apps/web/src/routes/$workspace/triage.tsx`, `apps/web/src/routes/$workspace/issues.$issueId.tsx`

---

## Verification

- **API build**: ✅ `tsc` compiles cleanly
- **Web build**: ✅ Vite builds successfully
- **E2E tests**: ✅ 32 passed, 3 skipped (same baseline)
- **Manual pages verified**: Landing, Auth, Onboarding, Dashboard, Issues, Issue Detail, Notes, Databases, Cycles, Projects, Team, Analytics, Triage, Roadmap, Settings, Command Palette, Shortcuts
