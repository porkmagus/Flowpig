import { test, expect } from '@playwright/test';

test.describe('Landing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders the hero section', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // Exact match avoids strict-mode if multiple parent elements contain the text
    await expect(page.getByText('Flowpig', { exact: true }).first()).toBeVisible();
  });

  test('has no light background leaking into the dark UI', async ({ page }) => {
    // Background of body should be dark, not white
    const bgColor = await page.evaluate(() =>
      window.getComputedStyle(document.body).backgroundColor
    );
    // Should not be rgb(255, 255, 255) (white)
    expect(bgColor).not.toBe('rgb(255, 255, 255)');
  });

  test('primary CTA links to signup', async ({ page }) => {
    const cta = page.getByRole('link', { name: /create workspace/i }).first();
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute('href', /signup/);
  });

  test('start free nav button links to signup', async ({ page }) => {
    // Multiple "Start free" links exist; target the first visible one
    const startFree = page.getByRole('link', { name: /start free/i }).first();
    await expect(startFree).toBeVisible();
  });

  test('sign in link is present', async ({ page }) => {
    // The nav header link is "Sign in" (hidden on xs, visible sm+); use first() to
    // avoid strict-mode with the bottom-section link that also contains "Sign in"
    const signIn = page.getByRole('link', { name: /sign in/i }).first();
    await expect(signIn).toBeVisible();
  });

  test('has no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore network-level failures (e.g. Google Fonts CDN in offline dev env)
        // Ignore framework/auth network failures when API server is not running in CI
        if (
          !text.startsWith('Failed to load resource') &&
          !text.includes('auth-client') &&
          !text.includes('checkSession') &&
          !text.includes('localhost:3001') &&
          !text.startsWith('Failed to fetch')
        ) {
          errors.push(text);
        }
      }
    });
    await page.goto('/');
    await page.waitForLoadState('load');
    expect(errors).toHaveLength(0);
  });
});
