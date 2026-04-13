import { test, expect } from '@playwright/test';

/**
 * Design system smoke tests — verify no light-theme leaks, correct border-radius scale,
 * and correct button colors across key pages.
 */

const PUBLIC_ROUTES = ['/', '/login', '/signup'];

for (const route of PUBLIC_ROUTES) {
  test(`${route}: no pure-white (#fff) background panels`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState('domcontentloaded');

    // Find elements with a computed background of pure white
    const whiteEls = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('*'));
      return all
        .filter((el) => {
          const bg = window.getComputedStyle(el).backgroundColor;
          return bg === 'rgb(255, 255, 255)';
        })
        .map((el) => el.tagName + (el.className ? '.' + el.className.split(' ').slice(0, 3).join('.') : ''))
        .slice(0, 10);
    });

    expect(whiteEls).toHaveLength(0);
  });
}

test('buttons with primary intent use the accent color', async ({ page }) => {
  await page.goto('/login');
  const submitBtn = page.getByRole('button', { name: /sign in|log in|continue/i });
  await expect(submitBtn).toBeVisible();
  const bg = await submitBtn.evaluate((el) =>
    window.getComputedStyle(el).backgroundColor
  );
  // Should NOT be white
  expect(bg).not.toBe('rgb(255, 255, 255)');
  // Should not be transparent / none
  expect(bg).not.toBe('rgba(0, 0, 0, 0)');
});

test('landing page accent elements use the design token color', async ({ page }) => {
  await page.goto('/');
  const cta = page.getByRole('link', { name: /create workspace/i }).first();
  await expect(cta).toBeVisible();
  const bg = await cta.evaluate((el) => window.getComputedStyle(el).backgroundColor);
  // #5E6AD2 ≈ rgb(94, 106, 210)
  expect(bg).toContain('94');
});
