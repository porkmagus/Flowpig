import { test, expect } from '@playwright/test';

/**
 * Issues e2e tests.
 *
 * These tests run against the dev server and require an authenticated session.
 * They describe desired behaviour — most will fail (red) until auth fixtures and
 * seed data are wired up, making them proper TDD red-phase tests.
 *
 * Workspace slug comes from the seeded workspace; override with WORKSPACE env var.
 */
const WORKSPACE = process.env.WORKSPACE ?? 'test-workspace';

test.describe('Issues list page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the issues list; unauthenticated requests should redirect to login
    await page.goto(`/${WORKSPACE}/issues`);
  });

  test('redirects unauthenticated users to login', async ({ page }) => {
    // Without auth the app should redirect to /login
    await expect(page).toHaveURL(/login/);
  });

  test('renders issues list heading when authenticated', async ({ page }) => {
    // Once auth works this heading should be present
    await expect(page.getByRole('heading', { name: /issues/i })).toBeVisible();
  });

  test('shows a "New issue" / create button', async ({ page }) => {
    const createBtn = page.getByRole('button', { name: /new issue|create issue|\+/i });
    await expect(createBtn).toBeVisible();
  });

  test('has search input for filtering issues', async ({ page }) => {
    await expect(page.getByPlaceholder(/search/i)).toBeVisible();
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
  });

  test('opens create-issue modal when create button is clicked', async ({ page }) => {
    const createBtn = page.getByRole('button', { name: /new issue|create issue|\+/i });
    await createBtn.click();
    // Modal or dialog should appear
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('shows validation error when submitting empty title', async ({ page }) => {
    const createBtn = page.getByRole('button', { name: /new issue|create issue|\+/i });
    await createBtn.click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Attempt to submit without filling in title
    const submitBtn = page.getByRole('button', { name: /create|save|submit/i });
    await submitBtn.click();

    // Should show an error (native validity or inline message)
    const titleField = page.getByPlaceholder(/issue title|title/i);
    const valueMissing = await titleField.evaluate(
      (el: HTMLInputElement) => el.validity.valueMissing
    );
    expect(valueMissing).toBe(true);
  });

  test('closes modal when cancel or escape is pressed', async ({ page }) => {
    const createBtn = page.getByRole('button', { name: /new issue|create issue|\+/i });
    await createBtn.click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});

test.describe('Issue detail page', () => {
  test.beforeEach(async ({ page }) => {
    // Attempt to navigate to a specific issue (ID "TEST-1" is seeded)
    await page.goto(`/${WORKSPACE}/issues/TEST-1`);
  });

  test('redirects unauthenticated users to login', async ({ page }) => {
    await expect(page).toHaveURL(/login/);
  });

  test('shows issue title and identifier when authenticated', async ({ page }) => {
    // The identifier badge or heading should contain TEST-1
    await expect(page.getByText(/TEST-1/i)).toBeVisible();
  });

  test('shows back-to-issues navigation', async ({ page }) => {
    const backLink = page.getByRole('link', { name: /issues|back/i });
    await expect(backLink).toBeVisible();
  });

  test('renders comments section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /comments?/i })).toBeVisible();
  });
});

test.describe('Issue filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/${WORKSPACE}/issues`);
  });

  test('filtering by state updates the URL query parameter', async ({ page }) => {
    // Click a state filter if present
    const stateFilter = page.getByRole('button', { name: /state|status/i }).first();
    await stateFilter.click();

    // Pick "In Progress" from the dropdown
    const inProgressOption = page.getByText(/in progress/i);
    if (await inProgressOption.isVisible()) {
      await inProgressOption.click();
      await expect(page).toHaveURL(/state=/i);
    }
  });

  test('searching by title filters the issue list', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('nonexistent-xyz-issue-title');
    await page.waitForTimeout(400); // debounce

    // Either empty state message or no issue rows
    const emptyState = page.getByText(/no issues|nothing here|empty/i);
    const rows = page.locator('[data-testid="issue-row"]');
    const rowCount = await rows.count();

    // At least one of these conditions must be true
    const isEmpty = (await emptyState.isVisible()) || rowCount === 0;
    expect(isEmpty).toBe(true);
  });
});
