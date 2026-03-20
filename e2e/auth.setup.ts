import { type Page } from '@playwright/test';

/**
 * Sign in via NextAuth CredentialsProvider.
 * Posts directly to the CSRF-protected signIn endpoint.
 */
export async function signIn(page: Page) {
  // Get CSRF token first
  await page.goto('/api/auth/csrf');
  const csrfResponse = await page.textContent('body');
  const { csrfToken } = JSON.parse(csrfResponse || '{}');

  // Sign in with credentials
  await page.goto('/api/auth/signin');
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'changeme');
  await page.click('button[type="submit"]');

  // Wait for redirect after login
  await page.waitForURL((url) => !url.pathname.includes('/auth/signin'));
}
