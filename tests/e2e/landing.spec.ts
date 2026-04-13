import { test, expect } from '@playwright/test';

test.describe('Landing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders the hero section', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('Flowpig')).toBeVisible();
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
    const startFree = page.getByRole('link', { name: /start free/i });
    await expect(startFree).toBeVisible();
  });

  test('sign in link is present', async ({ page }) => {
    const signIn = page.getByRole('link', { name: /sign in/i });
    await expect(signIn).toBeVisible();
  });

  test('has no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });
});
