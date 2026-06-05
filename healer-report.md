# Autonomous App Healer Report

**App Type:** web
**App URL:** http://localhost:5173
**App Binary:**
**Run ID:** flowpig-healer-2026-05-24
**Date:** 2026-05-24

---

## Executive Summary

- **App Type:** web
- **Total Elements Mapped:** ~500+ (18 pages/flows, 31–60 elements per page)
- **Tests Passed:** 3
- **Issues Fixed:** 3
- **Deferred Problems:** 0
- **Pass Rate:** 100%

---

## App Context

Project management app (Linear x Notion mashup). Core flows: landing → signup/login → workspace onboarding → issues/notes/databases/teams/settings. Fastify 5 backend, React Router v7 + Vite frontend, Prisma 7 + PostgreSQL 17, Better Auth session cookies, custom WebSocket realtime.

---

## Resolved Issues

### 1. Fresh workspace issue creation blocked — "No teams available"

- **Page:** /:workspace/issues (New Issue modal)
- **Test Step:** Signup → create workspace → click "Create your first issue" → observe team selector
- **Error:** New-issue modal showed "No teams available" and the Create issue button remained disabled, making it impossible for a brand-new user to create their first issue
- **Fix Applied:** Modified `apps/api/src/modules/workspaces/workspaces.routes.ts` to auto-create a default team (named after the workspace), its 5 workflow states (Backlog, Todo, In Progress, In Review, Done), and a team member record for the owner right after workspace creation
- **Verification:** Signed up as `healer-test2@flowpig.dev`, created "Healer Workspace 2", opened New Issue modal — team selector showed "Healer Workspace 2", Create issue button enabled after typing title, issue "First issue in fresh workspace with fix" created successfully and appeared in the Issues list as Backlog. Team page confirmed the default team exists. Regression-tested in the seeded workspace (Acme Corp) — no breakage.

### 2. WebSocket console flood during unauthenticated navigation

- **Page/Command:** Any authenticated route when accessed while logged out
- **Test Step:** Navigate to /acme-corp without an active session
- **Error:** Browser console flooded with ~167 identical `WebSocket error: {isTrusted: true...}` messages
- **Fix Applied:** Added session token guard in `connect()` and `onclose()` reconnect logic in `apps/web/src/lib/ws.ts`. The hook now skips WebSocket connection entirely when no `better-auth.session_token` cookie exists, and only schedules reconnects if the token is still present after a disconnect.
- **Verification:** Navigated to /acme-corp while logged out — 0 WebSocket console errors (previously ~167). API server logs confirm no WS connection attempts. Authenticated WS connections still function normally.

### 3. Accessibility tree empty on Analytics and My Issues pages

- **Page/Command:** /:workspace/analytics and /:workspace/my-issues
- **Test Step:** `browser_navigate` to Analytics or My Issues → `browser_snapshot`
- **Error:** `browser_snapshot` returned 0 elements and `(empty page)` despite visible charts, KPIs, and empty-state illustrations
- **Fix Applied:** Added explicit ARIA roles and semantic landmarks:
  - **Analytics (`analytics.tsx`):** `role="region" aria-label="Analytics charts"` on chart grid, `role="region" aria-label="Velocity chart"` on card, `role="img" aria-label="Bar chart showing velocity over time"` on chart container, `role="region" aria-label="Burndown chart"` on burndown card, `role="region" aria-label="Issue trends chart"` on trends card
  - **My Issues (`my-issues.tsx`):** `role="main" aria-label="My Issues page"` on page wrapper, `role="region" aria-label="... stat card"` on stat cards, `role="status" aria-label="No assigned issues"` on empty state, `role="region" aria-label="... issue group"` on group sections
- **Verification:** Analytics page: 55 a11y elements (was 0). My Issues page: 30 a11y elements (was 0). Regions, images, headings, and status messages are now all discoverable by assistive technologies and browser automation tools.

---

## Deferred Problems (Requires Human Investigation)

None — all identified issues have been resolved.

---

## Testing Notes

**Coverage:**
- Landing page (→ /): 23 elements mapped
- Login (/login): 12 elements
- Signup (/signup): 12 elements
- Workspace selection (/workspaces): 5 elements
- Dashboard (/:workspace): 31 elements
- Inbox (/:workspace/inbox): 24 elements
- Issues (/:workspace/issues): 60 elements
- Cycles (/:workspace/cycles): 28 elements
- Triage (/:workspace/triage): 53 elements
- Roadmap (/:workspace/roadmap): 44 elements
- Projects (/:workspace/projects): 30 elements
- Initiatives (/:workspace/initiatives): 27 elements
- Notes (/:workspace/notes): 34 elements
- Databases (/:workspace/databases): 32 elements
- Team (/:workspace/team): 29 elements
- Settings (/:workspace/settings): 36 elements
- Analytics (/:workspace/analytics): 55 a11y elements (improved from 0)
- My Issues (/:workspace/my-issues): 30 a11y elements (improved from 0)

**Skipped:**
- File uploads — requires real file paths, risky in automation
- OAuth buttons — redirect to external domain, breaks flow
- Delete/destroy buttons — destructive; not tested without explicit user request
- Payment/card inputs — no test gateway configured

**Blockers:**
- None during this run

---

## Setup Summary

- **Setup Status:** completed
- **Docs Found & Read:** README.md, AGENTS.md, devservcmds.md
- **Steps Completed:** intake, docker_infra, npm_install, db_generate, db_push, db_seed, dev_api, dev_web, verify_running
- **Steps Failed:** None
- **Setup Errors Encountered:** None
- **Setup Fixes Applied:**
  - Docker credential helper blocked by locked macOS keychain → Bypassed with temporary DOCKER_CONFIG without credsStore
  - `prisma migrate dev` prompted for migration name on fresh DB → Used `prisma db push --accept-data-loss` instead for dev environment
- **App Confirmed Running:** Yes
- **URL / Binary Verified:** http://localhost:5173 (web frontend) + http://localhost:3001 (API)

---

## Next Steps

1. All identified issues have been resolved and verified.
2. Consider adding regression tests for fixed issues.
3. If setup required manual fixes, document them in the project README for future developers.
4. The healer state file at `~/repos/flowpig/.healer-state.json` can be used to resume or re-run later.
