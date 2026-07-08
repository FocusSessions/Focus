import { test, expect } from '@playwright/test';

/**
 * Helper: if the app redirects us to /auth (no session), enter as guest.
 */
async function enterAsGuestIfNeeded(page: import('@playwright/test').Page) {
  if (page.url().includes('/auth')) {
    const guestLink = page.getByText('Continue as Guest');
    if (await guestLink.isVisible()) {
      await guestLink.click();
      await page.waitForURL('/');
    }
  }
}

test.describe('Profile Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Enter the app first (might redirect to auth)
    await page.goto('/');
    await enterAsGuestIfNeeded(page);

    // Navigate to profile
    await page.goto('/profile');
  });

  test('renders profile header with productivity score', async ({ page }) => {
    // The profile header should display "Productivity Score"
    await expect(page.getByText('Productivity Score')).toBeVisible();

    // The streak card with its text
    await expect(page.getByText('Start your first session to begin a streak.')).toBeVisible();
  });

  test('shows streak card with current streak info', async ({ page }) => {
    // Streak card shows "Current streak:" text
    await expect(page.getByText(/Current streak:/)).toBeVisible();
  });

  test('guest user sees sign-up prompt', async ({ page }) => {
    // When in guest mode, the profile header shows a "Sign up" link
    await expect(page.getByText('Sign up')).toBeVisible();
  });
});
