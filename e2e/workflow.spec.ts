/**
 * E2E tests for Workflow Dashboard (Challenge 2)
 *
 * Auth: All tests sign in via NextAuth default credentials form.
 * DB: Assumes `pnpm db:reset` was run before the suite.
 *
 * Note: Workflow runs are in-memory (WorkflowStore), so clearing
 * happens via the UI button, not DB reset.
 */
import { test, expect, type Page } from '@playwright/test';

async function signIn(page: Page) {
  await page.goto('/api/auth/signin');
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'changeme');
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/signin'));
}

async function goToWorkflows(page: Page) {
  await signIn(page);
  await page.goto('/workflows');
  await page.locator('h1').waitFor({ timeout: 10000 });
}

async function clearHistory(page: Page) {
  const clearButton = page.getByRole('button', { name: 'Clear History' });
  if (await clearButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await clearButton.click();
    await page.locator('text=No workflow runs yet').waitFor({ timeout: 5000 });
  }
}

// --- US-07: Single Workflow Run Completes ---
test('US-07: single workflow run completes successfully', async ({ page }) => {
  await goToWorkflows(page);
  await clearHistory(page);

  // Click Run Workflow
  const runButton = page.getByRole('button', { name: 'Run Workflow' });
  await runButton.click();

  // Wait for a status badge to appear (COMPLETED or FAILED)
  const completedBadge = page.locator('.border.rounded-lg').filter({ hasText: 'COMPLETED' });
  await completedBadge.first().waitFor({ timeout: 30000 });

  await expect(completedBadge.first()).toBeVisible();

  // No "Payment processing failed" error should be visible
  const paymentError = page.locator('text=Payment processing failed');
  await expect(paymentError).toHaveCount(0);
});

// --- US-08: Batch Run — Retry Logic Working ---
test('US-08: batch run of 5 succeeds at least 4/5 times', async ({ page }) => {
  await goToWorkflows(page);
  await clearHistory(page);

  // Click Run 5x
  const batchButton = page.getByRole('button', { name: /Run 5x/i });
  await batchButton.click();

  // Wait for batch to finish (button text changes back from "Running...")
  await expect(batchButton).not.toHaveText('Running...', { timeout: 60000 });

  // Count workflow run cards (each .border.rounded-lg in the list)
  const runCards = page.locator('.space-y-3 > .border.rounded-lg');
  await expect(runCards).toHaveCount(5, { timeout: 10000 });

  // Count COMPLETED badges within run cards specifically
  const completedRuns = runCards.filter({ hasText: 'COMPLETED' });
  const completedCount = await completedRuns.count();

  expect(completedCount).toBeGreaterThanOrEqual(4);
}, { timeout: 90000 });

// --- US-09: Expand Step Details ---
test('US-09: expanding a completed run shows all 5 steps', async ({ page }) => {
  await goToWorkflows(page);
  await clearHistory(page);

  // Run one workflow
  const runButton = page.getByRole('button', { name: 'Run Workflow' });
  await runButton.click();

  // Wait for COMPLETED
  const completedRun = page.locator('.border.rounded-lg').filter({ hasText: 'COMPLETED' });
  await completedRun.first().waitFor({ timeout: 30000 });

  // Click on the completed run header to expand it
  await completedRun.first().click();

  // Wait for step details to appear — look for step names
  await page.locator('text=Validate Order').waitFor({ timeout: 10000 });

  // All 5 step names should be visible
  const stepNames = ['Validate Order', 'Check Inventory', 'Process Payment', 'Create Shipment', 'Send Notification'];
  for (const name of stepNames) {
    await expect(page.locator(`text=${name}`).first()).toBeVisible();
  }
});

// --- US-10: Clear History ---
test('US-10: clearing history empties the run list', async ({ page }) => {
  await goToWorkflows(page);

  // Ensure at least one run exists
  const runButton = page.getByRole('button', { name: 'Run Workflow' });
  await runButton.click();
  await page.locator('.border.rounded-lg').filter({ hasText: 'COMPLETED' }).first().waitFor({ timeout: 30000 });

  // Click Clear History
  const clearButton = page.getByRole('button', { name: 'Clear History' });
  await clearButton.click();

  // Run list should be empty
  await expect(page.locator('text=No workflow runs yet')).toBeVisible();

  // Stats should show 0
  const totalCard = page.locator('text=Total Runs').locator('..');
  await expect(totalCard.locator('.text-2xl')).toHaveText('0');
});
