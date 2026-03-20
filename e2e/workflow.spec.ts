/**
 * E2E tests for Workflow Dashboard (Challenge 2)
 *
 * Auth: All tests sign in via NextAuth default credentials form.
 * DB: Assumes `pnpm db:reset` was run before the suite.
 *
 * Each test collects API evidence and attaches it for the report.
 */
import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { collectApiEvidence, attachEvidence } from './evidence';

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
test('US-07: single workflow run completes successfully', async ({ page }, testInfo) => {
  const apiCalls = collectApiEvidence(page, testInfo);
  await goToWorkflows(page);
  await clearHistory(page);

  await page.getByRole('button', { name: 'Run Workflow' }).click();

  const completedBadge = page.locator('.border.rounded-lg').filter({ hasText: 'COMPLETED' });
  await completedBadge.first().waitFor({ timeout: 30000 });
  await expect(completedBadge.first()).toBeVisible();

  const paymentError = page.locator('text=Payment processing failed');
  await expect(paymentError).toHaveCount(0);

  await attachEvidence(testInfo, apiCalls, 'Single run: POST /api/workflows → 200 COMPLETED, no payment error');
});

// --- US-08: Batch Run — Retry Logic Working ---
test('US-08: batch run of 5 succeeds at least 4/5 times', async ({ page }, testInfo) => {
  const apiCalls = collectApiEvidence(page, testInfo);
  await goToWorkflows(page);
  await clearHistory(page);

  const batchButton = page.getByRole('button', { name: /Run 5x/i });
  await batchButton.click();

  await expect(batchButton).not.toHaveText('Running...', { timeout: 60000 });

  const runCards = page.locator('.space-y-3 > .border.rounded-lg');
  await expect(runCards).toHaveCount(5, { timeout: 10000 });

  const completedRuns = runCards.filter({ hasText: 'COMPLETED' });
  const completedCount = await completedRuns.count();
  const failedCount = 5 - completedCount;

  expect(completedCount).toBeGreaterThanOrEqual(4);

  await attachEvidence(testInfo, apiCalls, `Batch: ${completedCount}/5 COMPLETED, ${failedCount} FAILED (retry threshold: >=4)`);
}, { timeout: 90000 });

// --- US-09: Expand Step Details ---
test('US-09: expanding a completed run shows all 5 steps', async ({ page }, testInfo) => {
  const apiCalls = collectApiEvidence(page, testInfo);
  await goToWorkflows(page);
  await clearHistory(page);

  await page.getByRole('button', { name: 'Run Workflow' }).click();

  const completedRun = page.locator('.border.rounded-lg').filter({ hasText: 'COMPLETED' });
  await completedRun.first().waitFor({ timeout: 30000 });

  await completedRun.first().click();
  await page.locator('text=Validate Order').waitFor({ timeout: 10000 });

  const stepNames = ['Validate Order', 'Check Inventory', 'Process Payment', 'Create Shipment', 'Send Notification'];
  for (const name of stepNames) {
    await expect(page.locator(`text=${name}`).first()).toBeVisible();
  }

  await attachEvidence(testInfo, apiCalls, `Steps: all 5 visible — ${stepNames.join(', ')}`);
});

// --- US-10: Clear History ---
test('US-10: clearing history empties the run list', async ({ page }, testInfo) => {
  const apiCalls = collectApiEvidence(page, testInfo);
  await goToWorkflows(page);

  await page.getByRole('button', { name: 'Run Workflow' }).click();
  await page.locator('.border.rounded-lg').filter({ hasText: 'COMPLETED' }).first().waitFor({ timeout: 30000 });

  await page.getByRole('button', { name: 'Clear History' }).click();

  await expect(page.locator('text=No workflow runs yet')).toBeVisible();

  const totalCard = page.locator('text=Total Runs').locator('..');
  await expect(totalCard.locator('.text-2xl')).toHaveText('0');

  await attachEvidence(testInfo, apiCalls, 'Clear: POST /api/workflows/clear → 200, run list empty, stats zeroed');
});
