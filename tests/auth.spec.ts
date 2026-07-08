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
    await page.waitForURL('http://localhost:3000/');
    await expect(page.getByText('Focus Session')).toBeVisible();
  });

  test('form validation prevents empty submission', async ({ page }) => {
    await page.goto('/auth');

    // Email and password are required — clicking submit with empty fields
    // should keep us on the auth page (HTML5 validation prevents navigation)
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/auth/);
  });
});
