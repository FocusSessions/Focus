import { test, expect } from '@playwright/test';

/**
 * Helper: if the app redirects us to /auth (no session), enter as guest.
 */
async function enterAsGuestIfNeeded(page: import('@playwright/test').Page) {
  if (page.url().includes('/auth')) {
    const guestLink = page.getByText('Continue as Guest');
    if (await guestLink.isVisible()) {
      await guestLink.click();
      await page.waitForURL('http://localhost:3000/');
    }
  }
}

test.describe('Timer Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await enterAsGuestIfNeeded(page);

    // Wait for the timer page to render
    await expect(page.getByText('Focus Session')).toBeVisible();
  });

  test('renders idle timer with categories', async ({ page }) => {
    // Start button is visible
    await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();

    // Default categories are visible
    for (const cat of ['Work', 'Study', 'Coding', 'Reading', 'Gaming']) {
      await expect(page.getByRole('button', { name: cat, exact: true })).toBeVisible();
    }

    // Stats section is visible
    await expect(page.getByText('Current Streak', { exact: true })).toBeVisible();
    await expect(page.locator('p', { hasText: 'Today' })).toBeVisible();
    await expect(page.getByText('Sessions', { exact: true })).toBeVisible();
  });

  test('can start, pause, resume, and stop the timer', async ({ page }) => {
    // 1. Start
    await page.getByRole('button', { name: 'Start' }).click();

    // 2. Verify running state — Pause and Stop visible
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible();

    // 3. Pause → Resume should appear
    await page.getByRole('button', { name: 'Pause' }).click();
    await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();

    // 4. Stop → should return to idle
    await page.getByRole('button', { name: 'Stop' }).click();

    // Back to idle — Start button should reappear
    await expect(page.getByRole('button', { name: 'Start' })).toBeVisible({ timeout: 10_000 });
  });

  test('category selection works', async ({ page }) => {
    // Click each category — just verify it doesn't crash (visual state is CSS)
    for (const cat of ['Work', 'Coding', 'Reading', 'Gaming', 'Study']) {
      await page.getByRole('button', { name: cat, exact: true }).click();
    }
  });
});
