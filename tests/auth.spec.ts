import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('renders auth page with sign-in form', async ({ page }) => {
    await page.goto('/auth');

    // Title contains "Focus"
    await expect(page).toHaveTitle(/Focus/);

    // The heading reads "Focus"
    await expect(page.locator('h1', { hasText: 'Focus' })).toBeVisible();

    // Sign-in form elements are present
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();

    // Submit button says "Sign In"
    await expect(page.locator('button[type="submit"]', { hasText: /Sign In/i })).toBeVisible();
  });

  test('shows sign-up tab when clicked', async ({ page }) => {
    await page.goto('/auth');

    // Click the "Sign Up" tab (the first button with exactly "Sign Up")
    await page.getByRole('button', { name: 'Sign Up', exact: true }).first().click();

    // Username and display name fields appear
    await expect(page.locator('input#username')).toBeVisible();
    await expect(page.locator('input#displayName')).toBeVisible();

    // Submit button now says "Create Account"
    await expect(page.locator('button[type="submit"]', { hasText: /Create Account/i })).toBeVisible();
  });

  test('guest link navigates to the main app', async ({ page }) => {
    await page.goto('/auth');

    // The guest link is a <button> with specific text
    const guestLink = page.getByText('Continue as Guest');
    await expect(guestLink).toBeVisible();

    await guestLink.click();

    // Should navigate to the home page (timer)
    await page.waitForURL('/');
    await expect(page.getByText('Focus Session')).toBeVisible();
  });

  test('form validation prevents empty submission', async ({ page }) => {
    await page.goto('/auth');

    // Email and password are required — clicking submit with empty fields
    // should keep us on the auth page (HTML5 validation prevents navigation)
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/auth/);
  });

  test('real user signup and login flow', async ({ page }) => {
    // Skip this test in CI environments where real Supabase keys aren't provided
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
      test.skip();
    }

    const testEmail = 'ZeroDayZapper@proton.me';
    const testPassword = 'TestPassword123!';

    await page.goto('/auth');

    // Attempt to Sign In first
    await page.fill('input#email', testEmail);
    await page.fill('input#password', testPassword);
    await page.locator('button[type="submit"]', { hasText: /Sign In/i }).click();

    // If it navigates to Home, we are logged in. If it stays on /auth, check for error.
    try {
      await page.waitForURL('/', { timeout: 3000 });
      await expect(page.getByText('Focus Session')).toBeVisible();
      return; // Successfully logged in
    } catch {
      // Sign in failed, meaning the account might not exist yet. Let's try signing up.
      await page.getByRole('button', { name: 'Sign Up', exact: true }).first().click();
      
      await page.fill('input#email', testEmail);
      await page.fill('input#password', testPassword);
      await page.fill('input#username', 'zeroday');
      
      await page.locator('button[type="submit"]', { hasText: /Create Account/i }).click();
      
      // Wait for it to navigate to home, or check if it throws an error
      await page.waitForURL('/', { timeout: 5000 });
      await expect(page.getByText('Focus Session')).toBeVisible();
    }
  });
});
