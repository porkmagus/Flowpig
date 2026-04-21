# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: landing.spec.ts >> Landing page >> has no console errors
- Location: tests/e2e/landing.spec.ts:42:7

# Error details

```
Error: expect(received).toHaveLength(expected)

Expected length: 0
Received length: 1
Received array:  ["Failed to check session: TypeError: Failed to fetch"]
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - banner [ref=e3]:
    - generic [ref=e4]:
      - link "Flowpig Work that stays connected" [ref=e5] [cursor=pointer]:
        - /url: /
        - img [ref=e7]
        - generic [ref=e11]:
          - generic [ref=e12]: Flowpig
          - generic [ref=e13]: Work that stays connected
      - generic [ref=e14]:
        - link "Product" [ref=e15] [cursor=pointer]:
          - /url: "#product"
        - link "Workflow" [ref=e16] [cursor=pointer]:
          - /url: "#workflow"
        - link "Proof" [ref=e17] [cursor=pointer]:
          - /url: "#proof"
      - generic [ref=e18]:
        - link "Sign in" [ref=e19] [cursor=pointer]:
          - /url: /login
        - link "Start free" [ref=e20] [cursor=pointer]:
          - /url: /signup
          - text: Start free
          - img [ref=e21]
  - main [ref=e23]:
    - generic [ref=e24]:
      - generic [ref=e25]:
        - generic [ref=e26]:
          - img [ref=e27]
          - text: Docs, issues, and planning in one workspace
        - heading "Calm execution for focused teams." [level=1] [ref=e30]
        - paragraph [ref=e31]: One workspace for notes, issues, and planning. Less noise, clearer progress.
        - link "Create a workspace" [ref=e33] [cursor=pointer]:
          - /url: /signup
          - text: Create a workspace
          - img [ref=e34]
      - generic [ref=e38]:
        - generic [ref=e39]:
          - generic [ref=e40]: Workspace overview
          - generic [ref=e41]: Live
        - generic [ref=e42]:
          - generic [ref=e43]:
            - img [ref=e44]
            - generic [ref=e47]: Triage summarized into follow-up issues
          - generic [ref=e48]:
            - img [ref=e49]
            - generic [ref=e52]: Roadmap linked to active cycle
          - generic [ref=e53]:
            - img [ref=e54]
            - generic [ref=e57]: Specs, comments, and notes preserved
        - generic [ref=e58]:
          - generic [ref=e59]:
            - img [ref=e60]
            - text: Inbox + notifications
          - generic [ref=e63]:
            - img [ref=e64]
            - text: Git-aware execution
          - generic [ref=e68]:
            - img [ref=e69]
            - text: Comments and collaboration
          - generic [ref=e71]:
            - img [ref=e72]
            - text: Analytics and velocity
    - generic [ref=e74]:
      - generic [ref=e75]:
        - generic [ref=e76]: Roadmap
        - heading "Release planning" [level=2] [ref=e77]
        - paragraph [ref=e78]: Line up initiatives and keep delivery tied to the work.
      - generic [ref=e79]:
        - generic [ref=e80]: Analytics
        - heading "Cycle health" [level=2] [ref=e81]
        - paragraph [ref=e82]: Track completion and velocity without extra tools.
      - generic [ref=e83]:
        - generic [ref=e84]: Execution
        - heading "Issue flow" [level=2] [ref=e85]
        - paragraph [ref=e86]: Triage, assign, and keep updates visible.
    - generic [ref=e87]:
      - generic [ref=e88]:
        - generic [ref=e89]: Product pillars
        - heading "Coherent before feature-rich." [level=2] [ref=e90]
        - paragraph [ref=e91]: Notes, issues, roadmap, cycles, and AI—made to feel unified, fast, and obvious.
      - generic [ref=e92]:
        - generic [ref=e93]:
          - img [ref=e95]
          - heading "Docs tied to execution" [level=3] [ref=e98]
          - paragraph [ref=e99]: Notes and specs stay linked to the work.
        - generic [ref=e100]:
          - img [ref=e102]
          - heading "Issue tracking for momentum" [level=3] [ref=e106]
          - paragraph [ref=e107]: Plan and prioritize without splitting the team.
        - generic [ref=e108]:
          - img [ref=e110]
          - heading "Cycles and roadmap together" [level=3] [ref=e113]
          - paragraph [ref=e114]: Move from planning to execution with less drift.
        - generic [ref=e115]:
          - img [ref=e117]
          - heading "AI where it helps" [level=3] [ref=e120]
          - paragraph [ref=e121]: Draft issues and summarize context without gimmicks.
    - generic [ref=e123]:
      - generic [ref=e124]:
        - generic [ref=e125]: Workflow
        - heading "Better flow, fewer tabs." [level=2] [ref=e126]
        - paragraph [ref=e127]: Keep context tight from the first note to the final release.
      - generic [ref=e128]:
        - generic [ref=e129]:
          - generic [ref=e130]: Capture
          - heading "Write once, keep context" [level=3] [ref=e131]
          - paragraph [ref=e132]: Turn notes into living references.
          - generic [ref=e133]:
            - generic [ref=e134]:
              - img [ref=e135]
              - generic [ref=e138]: Nested notes
            - generic [ref=e139]:
              - img [ref=e140]
              - generic [ref=e143]: Comments near work
            - generic [ref=e144]:
              - img [ref=e145]
              - generic [ref=e148]: Linked docs
        - generic [ref=e149]:
          - generic [ref=e150]: Coordinate
          - heading "See what matters" [level=3] [ref=e151]
          - paragraph [ref=e152]: Keep triage, inbox, and roadmap visible.
          - generic [ref=e153]:
            - generic [ref=e154]:
              - img [ref=e155]
              - generic [ref=e158]: Unified inbox
            - generic [ref=e159]:
              - img [ref=e160]
              - generic [ref=e163]: Realtime activity
            - generic [ref=e164]:
              - img [ref=e165]
              - generic [ref=e168]: Cycles in one flow
        - generic [ref=e169]:
          - generic [ref=e170]: Ship
          - heading "Plan to delivery faster" [level=3] [ref=e171]
          - paragraph [ref=e172]: Make progress measurable.
          - generic [ref=e173]:
            - generic [ref=e174]:
              - img [ref=e175]
              - generic [ref=e178]: Priority issues
            - generic [ref=e179]:
              - img [ref=e180]
              - generic [ref=e183]: Git context
            - generic [ref=e184]:
              - img [ref=e185]
              - generic [ref=e188]: Analytics
    - generic [ref=e191]:
      - generic [ref=e192]:
        - generic [ref=e193]: Ready
        - heading "Start with the product your team wants to use." [level=2] [ref=e194]
        - paragraph [ref=e195]: A calmer front door to a workspace built for product, design, and engineering.
      - generic [ref=e196]:
        - link "Start free Create your workspace Get into the app" [ref=e197] [cursor=pointer]:
          - /url: /signup
          - generic [ref=e198]: Start free
          - generic [ref=e199]: Create your workspace
          - generic [ref=e200]:
            - text: Get into the app
            - img [ref=e201]
        - link "Existing team Jump back in Sign in" [ref=e203] [cursor=pointer]:
          - /url: /login
          - generic [ref=e204]: Existing team
          - generic [ref=e205]: Jump back in
          - generic [ref=e206]:
            - text: Sign in
            - img [ref=e207]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Landing page', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     await page.goto('/');
  6  |   });
  7  | 
  8  |   test('renders the hero section', async ({ page }) => {
  9  |     await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  10 |     // Exact match avoids strict-mode if multiple parent elements contain the text
  11 |     await expect(page.getByText('Flowpig', { exact: true }).first()).toBeVisible();
  12 |   });
  13 | 
  14 |   test('has no light background leaking into the dark UI', async ({ page }) => {
  15 |     // Background of body should be dark, not white
  16 |     const bgColor = await page.evaluate(() =>
  17 |       window.getComputedStyle(document.body).backgroundColor
  18 |     );
  19 |     // Should not be rgb(255, 255, 255) (white)
  20 |     expect(bgColor).not.toBe('rgb(255, 255, 255)');
  21 |   });
  22 | 
  23 |   test('primary CTA links to signup', async ({ page }) => {
  24 |     const cta = page.getByRole('link', { name: /create a workspace/i }).first();
  25 |     await expect(cta).toBeVisible();
  26 |     await expect(cta).toHaveAttribute('href', /signup/);
  27 |   });
  28 | 
  29 |   test('start free nav button links to signup', async ({ page }) => {
  30 |     // Multiple "Start free" links exist; target the first visible one
  31 |     const startFree = page.getByRole('link', { name: /start free/i }).first();
  32 |     await expect(startFree).toBeVisible();
  33 |   });
  34 | 
  35 |   test('sign in link is present', async ({ page }) => {
  36 |     // The nav header link is "Sign in" (hidden on xs, visible sm+); use first() to
  37 |     // avoid strict-mode with the bottom-section link that also contains "Sign in"
  38 |     const signIn = page.getByRole('link', { name: /sign in/i }).first();
  39 |     await expect(signIn).toBeVisible();
  40 |   });
  41 | 
  42 |   test('has no console errors', async ({ page }) => {
  43 |     const errors: string[] = [];
  44 |     page.on('console', (msg) => {
  45 |       if (msg.type() === 'error') {
  46 |         const text = msg.text();
  47 |         // Ignore network-level failures (e.g. Google Fonts CDN in offline dev env)
  48 |         // Ignore framework/auth network failures when API server is not running in CI
  49 |         if (
  50 |           !text.startsWith('Failed to load resource') &&
  51 |           !text.includes('auth-client') &&
  52 |           !text.includes('checkSession') &&
  53 |           !text.includes('localhost:3001') &&
  54 |           !text.startsWith('Failed to fetch')
  55 |         ) {
  56 |           errors.push(text);
  57 |         }
  58 |       }
  59 |     });
  60 |     await page.goto('/');
  61 |     await page.waitForLoadState('load');
> 62 |     expect(errors).toHaveLength(0);
     |                    ^ Error: expect(received).toHaveLength(expected)
  63 |   });
  64 | });
  65 | 
```