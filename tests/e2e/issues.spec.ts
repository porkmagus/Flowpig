import { test, expect } from '@playwright/test';

/**
 * Issues e2e tests — Chromium only (webkit binary not installed).
 *
 * Requires dev servers running:
 *   npm run dev:web   (Vite, port 5173)
 *   npm run dev:api   (Fastify, port 3001)
 *   npm run db:seed   (run once to populate seed data)
 *
 * Workspace slug comes from the seeded workspace (packages/db/seed.ts).
 * Override with the WORKSPACE environment variable.
 *
 * NOTE: The frontend has no route-level auth guards; auth is enforced by the
 * API. Unauthenticated users see the page shell with no data — they are NOT
 * redirected to /login by the frontend.
 */
const WORKSPACE = process.env.WORKSPACE ?? 'acme-corp';

test.describe('Issues list page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/${WORKSPACE}/issues`);
    await page.waitForLoadState('domcontentloaded');
  });

  test('loads at the issues URL (no frontend auth redirect)', async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(`/${WORKSPACE}/issues`));
  });

  test('renders "Issues" heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Issues', exact: true })).toBeVisible();
  });

  test('shows a "New issue" create button', async ({ page }) => {
    // Two "New issue" buttons exist (sidebar header + issues page header); .first() avoids strict-mode error
    await expect(page.getByRole('button', { name: 'New issue' }).first()).toBeVisible();
  });

  test('has "Search issues…" input', async ({ page }) => {
    await expect(page.getByPlaceholder('Search issues...')).toBeVisible();
  });

  test('page background is not white (dark-theme check)', async ({ page }) => {
    const bg = await page.evaluate(() =>
      window.getComputedStyle(document.body).backgroundColor
    );
    expect(bg).not.toBe('rgb(255, 255, 255)');
  });
});

test.describe('Create issue modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/${WORKSPACE}/issues`);
    await page.waitForLoadState('domcontentloaded');
  });

  test('opens modal (shows title input) when create button is clicked', async ({ page }) => {
    // Use .first() because two "New issue" buttons are present
    await page.getByRole('button', { name: 'New issue' }).first().click();
    // The modal renders an "Issue title" input (no role="dialog" on the container)
    await expect(page.getByPlaceholder('Issue title')).toBeVisible();
  });

  test('submit button is disabled when title is empty', async ({ page }) => {
    await page.getByRole('button', { name: 'New issue' }).first().click();
    await expect(page.getByPlaceholder('Issue title')).toBeVisible();

    // The "Create issue" submit button is disabled while the title field is blank
    const submitBtn = page.getByRole('button', { name: /create issue/i });
    await expect(submitBtn).toBeDisabled();
  });

  test('submit button becomes enabled after entering a title', async ({ page }) => {
    await page.getByRole('button', { name: 'New issue' }).first().click();
    await page.getByPlaceholder('Issue title').fill('My test issue');

    const submitBtn = page.getByRole('button', { name: /create issue/i });
    await expect(submitBtn).toBeEnabled();
  });

  test('closes modal (hides title input) when Escape is pressed', async ({ page }) => {
    await page.getByRole('button', { name: 'New issue' }).first().click();
    await expect(page.getByPlaceholder('Issue title')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByPlaceholder('Issue title')).not.toBeVisible();
  });
});

test.describe('Issue detail page', () => {
  // Navigate via the issues list to pick up the real (auto-generated) issue ID
  test.beforeEach(async ({ page }) => {
    await page.goto(`/${WORKSPACE}/issues`);
    await page.waitForLoadState('domcontentloaded');
  });

  test('clicking an issue in the list navigates to its detail page', async ({ page }) => {
    // Wait for at least one issue link to appear (requires API to be running + seeded)
    const firstIssueLink = page.locator(`a[href^="/${WORKSPACE}/issues/"]`).first();
    const visible = await firstIssueLink.isVisible().catch(() => false);
    if (!visible) {
      test.skip(); // skip gracefully when API is not running
      return;
    }
    await firstIssueLink.click();
    // URL should have changed to the detail page
    await expect(page).toHaveURL(new RegExp(`/${WORKSPACE}/issues/[^/]+$`));
  });

  test('detail page shows a breadcrumb link back to issues list', async ({ page }) => {
    const firstIssueLink = page.locator(`a[href^="/${WORKSPACE}/issues/"]`).first();
    const visible = await firstIssueLink.isVisible().catch(() => false);
    if (!visible) {
      test.skip();
      return;
    }
    await firstIssueLink.click();
    // The breadcrumb "Issues" link is in the main content area (sidebar also has one)
    const backLink = page.locator('main').getByRole('link', { name: 'Issues', exact: true });
    await expect(backLink).toBeVisible();
  });

  test('detail page renders the Comments tab button', async ({ page }) => {
    const firstIssueLink = page.locator(`a[href^="/${WORKSPACE}/issues/"]`).first();
    const visible = await firstIssueLink.isVisible().catch(() => false);
    if (!visible) {
      test.skip();
      return;
    }
    await firstIssueLink.click();
    // The comments section is a tab button, not a heading element
    await expect(page.getByRole('button', { name: /^comments/i }).first()).toBeVisible();
  });

  test('navigating to an unknown issue ID shows "Issue not found"', async ({ page }) => {
    await page.goto(`/${WORKSPACE}/issues/nonexistent-id-00000`);
    await page.waitForLoadState('domcontentloaded');
    // When the API returns no issue, the component shows "Issue not found"
    await expect(page.getByText('Issue not found')).toBeVisible({ timeout: 8000 });
  });
});

test.describe('Issue filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/${WORKSPACE}/issues`);
    await page.waitForLoadState('domcontentloaded');
  });

  test('clicking the Filters button toggles the filter panel', async ({ page }) => {
    const filterBtn = page.getByRole('button', { name: 'Filters' });
    await expect(filterBtn).toBeVisible();
    await filterBtn.click();

    // The filter panel reveals state / priority filter chips
    await expect(page.getByText('State').first()).toBeVisible();
  });

  test('searching by title hides non-matching issues', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search issues...');
    await searchInput.fill('nonexistent-xyz-issue-title-99999');
    // Give the debounce and query time to settle
    await page.waitForTimeout(600);

    // Either "No issues found" empty-state message or zero issue rows
    const emptyState = page.getByText('No issues found');
    const rows = page.locator('[data-testid="issue-row"]');
    const rowCount = await rows.count();
    const isEmpty = (await emptyState.isVisible()) || rowCount === 0;
    expect(isEmpty).toBe(true);
  });
});
