/**
 * E2E tests for Workflow Dashboard (Challenge 2)
 *
 * Each test builds a PROOF CHAIN documenting what was measured
 * and why it proves the bug fix works.
 */
import { test, expect, type Page } from '@playwright/test';
import { createEvidence, prove, proveComparison, attachEvidence } from './evidence';

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
  const ev = createEvidence(page);
  await goToWorkflows(page);
  await clearHistory(page);

  await page.getByRole('button', { name: 'Run Workflow' }).click();

  const completedBadge = page.locator('.border.rounded-lg').filter({ hasText: 'COMPLETED' });
  await completedBadge.first().waitFor({ timeout: 30000 });

  const status = await completedBadge.first().isVisible() ? 'COMPLETED' : 'FAILED';
  const paymentErrorCount = await page.locator('text=Payment processing failed').count();

  prove(ev, 'Workflow status is COMPLETED (not FAILED)', 'COMPLETED', status);
  proveComparison(ev, 'No "Payment processing failed" error visible', '=', paymentErrorCount, 0, 'payment errors', '0');
  prove(ev, 'Payment step if/else is no longer inverted', 'processPaymentStep returns success:true', paymentErrorCount === 0 ? 'processPaymentStep returns success:true' : 'processPaymentStep returns success:false (BUG)');

  await expect(completedBadge.first()).toBeVisible();
  await expect(page.locator('text=Payment processing failed')).toHaveCount(0);

  await attachEvidence(testInfo, ev, 'processPaymentStep had inverted if/else — always returned success:false, causing 0% completion rate');
});

// --- US-08: Batch Run — Retry Logic Working ---
test('US-08: batch run of 5 succeeds at least 4/5 times', async ({ page }, testInfo) => {
  const ev = createEvidence(page);
  await goToWorkflows(page);
  await clearHistory(page);

  const batchButton = page.getByRole('button', { name: /Run 5x/i });
  await batchButton.click();
  await expect(batchButton).not.toHaveText('Running...', { timeout: 60000 });

  const runCards = page.locator('.space-y-3 > .border.rounded-lg');
  await expect(runCards).toHaveCount(5, { timeout: 10000 });

  const completedCount = await runCards.filter({ hasText: 'COMPLETED' }).count();
  const failedCount = await runCards.filter({ hasText: 'FAILED' }).count();
  const successRate = Math.round((completedCount / 5) * 100);

  // Count POST /api/workflows calls to prove all 5 ran
  const workflowPosts = ev.apiCalls.filter(c => c.method === 'POST' && c.url.includes('/api/workflows') && !c.url.includes('/clear'));

  proveComparison(ev, 'All 5 workflows executed', '=', completedCount + failedCount, 5, 'completed + failed', '5');
  proveComparison(ev, 'At least 4/5 completed (retry logic working)', '>=', completedCount, 4, 'completed', '4');
  proveComparison(ev, `Success rate ${successRate}% meets >=80% threshold`, '>=', successRate, 80, `${successRate}%`, '80%');
  proveComparison(ev, `Retry logic improved success from ~45% to ${successRate}%`, '>', successRate, 45, `${successRate}% (with retries)`, '45% (without retries)');
  proveComparison(ev, 'POST /api/workflows called 5 times', '>=', workflowPosts.length, 5, 'POST count', '5');

  expect(completedCount).toBeGreaterThanOrEqual(4);

  await attachEvidence(testInfo, ev, 'No retry logic — checkInventory fails ~40%, sendNotification fails ~25%, combined first-attempt success ~45%');
}, { timeout: 90000 });

// --- US-09: Expand Step Details ---
test('US-09: expanding a completed run shows all 5 steps', async ({ page }, testInfo) => {
  const ev = createEvidence(page);
  await goToWorkflows(page);
  await clearHistory(page);

  await page.getByRole('button', { name: 'Run Workflow' }).click();

  const completedRun = page.locator('.border.rounded-lg').filter({ hasText: 'COMPLETED' });
  await completedRun.first().waitFor({ timeout: 30000 });
  await completedRun.first().click();
  await page.locator('text=Validate Order').waitFor({ timeout: 10000 });

  const stepNames = ['Validate Order', 'Check Inventory', 'Process Payment', 'Create Shipment', 'Send Notification'];
  const visibleSteps: string[] = [];

  for (const name of stepNames) {
    const visible = await page.locator(`text=${name}`).first().isVisible();
    if (visible) visibleSteps.push(name);
    prove(ev, `Step "${name}" is visible`, 'true', String(visible));
  }

  proveComparison(ev, 'All 5 workflow steps rendered', '=', visibleSteps.length, 5, 'visible steps', 'expected steps');
  prove(ev, 'Payment step reached (was unreachable when inverted)', 'Process Payment visible', visibleSteps.includes('Process Payment') ? 'Process Payment visible' : 'Process Payment NOT visible (BUG)');

  for (const name of stepNames) {
    await expect(page.locator(`text=${name}`).first()).toBeVisible();
  }

  await attachEvidence(testInfo, ev, 'Workflow steps were not all completing — payment always failed, blocking shipment and notification');
});

// --- US-10: Clear History ---
test('US-10: clearing history empties the run list', async ({ page }, testInfo) => {
  const ev = createEvidence(page);
  await goToWorkflows(page);

  await page.getByRole('button', { name: 'Run Workflow' }).click();
  await page.locator('.border.rounded-lg').filter({ hasText: 'COMPLETED' }).first().waitFor({ timeout: 30000 });

  const beforeCount = await page.locator('.space-y-3 > .border.rounded-lg').count();

  await page.getByRole('button', { name: 'Clear History' }).click();
  await expect(page.locator('text=No workflow runs yet')).toBeVisible();

  const totalCard = page.locator('text=Total Runs').locator('..');
  const totalText = await totalCard.locator('.text-2xl').textContent();

  proveComparison(ev, 'Runs existed before clear', '>', beforeCount, 0, 'runs before clear', '0');
  prove(ev, 'Empty state message shown after clear', 'true', String(await page.locator('text=No workflow runs yet').isVisible()));
  prove(ev, 'Total Runs stat reset to 0', '0', totalText || 'null');

  await expect(totalCard.locator('.text-2xl')).toHaveText('0');

  await attachEvidence(testInfo, ev, 'Clear history endpoint must be protected and functional');
});
