/**
 * E2E tests for Transaction Review (Challenge 1)
 *
 * Each test builds a PROOF CHAIN documenting:
 * - What the bug was
 * - What we measured (before/after, counts, comparisons)
 * - Why the measurement proves the fix works
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

async function goToTransactions(page: Page) {
  await signIn(page);
  await page.goto('/transactions');

  const caseSelector = page.locator('button[role="combobox"]').first();
  const currentCase = await caseSelector.textContent();
  if (!currentCase?.includes('John Smith')) {
    await caseSelector.click();
    await page.getByRole('option', { name: 'John Smith' }).click();
  }

  await page.locator('[data-testid="transaction-row"]').first().waitFor({ timeout: 15000 });
}

// --- US-01: Bulk Review ---
test('US-01: bulk review sends single request to /api/transactions/bulk', async ({ page }, testInfo) => {
  const ev = createEvidence(page);
  await goToTransactions(page);

  const checkboxes = page.locator('[data-testid="transaction-row"] input[type="checkbox"]');
  for (let i = 0; i < 3; i++) {
    await checkboxes.nth(i).check();
  }

  let bulkPatchCount = 0;
  let individualPatchCount = 0;
  page.on('request', (req) => {
    if (req.method() === 'PATCH' && req.url().includes('/api/transactions/bulk')) bulkPatchCount++;
    if (req.method() === 'PATCH' && /\/api\/transactions\/[a-f0-9-]+$/.test(req.url())) individualPatchCount++;
  });

  await page.getByRole('button', { name: /Mark.*Reviewed/i }).click();
  await page.waitForResponse((res) => res.url().includes('/api/transactions/bulk'));

  proveComparison(ev, 'Bulk endpoint called exactly once', '=', bulkPatchCount, 1, 'PATCH /bulk count', '1');
  proveComparison(ev, 'Zero individual PATCH requests fired', '=', individualPatchCount, 0, 'individual PATCH count', '0');
  prove(ev, 'Used /api/transactions/bulk not /api/transactions/:id', 'single bulk request', bulkPatchCount === 1 && individualPatchCount === 0 ? 'single bulk request' : 'individual requests');

  expect(bulkPatchCount).toBe(1);
  expect(individualPatchCount).toBe(0);

  await attachEvidence(testInfo, ev, 'handleBulkMarkReviewed fired N individual PATCH requests instead of one /api/transactions/bulk call');
});

// --- US-02: Pagination — Initial Load ---
test('US-02: initial load shows <= 100 rows with Load More button', async ({ page }, testInfo) => {
  const ev = createEvidence(page);
  await goToTransactions(page);

  const rows = page.locator('[data-testid="transaction-row"]');
  const rowCount = await rows.count();
  const loadMoreVisible = await page.getByRole('button', { name: 'Load More' }).isVisible();

  proveComparison(ev, 'Row count is at most 100 (pagination limit)', '<=', rowCount, 100, 'rendered rows', 'limit');
  proveComparison(ev, 'Row count is greater than 0 (data loaded)', '>', rowCount, 0, 'rendered rows', '0');
  prove(ev, 'Load More button is visible (more data exists)', 'true', String(loadMoreVisible));

  expect(rowCount).toBeLessThanOrEqual(100);
  expect(rowCount).toBeGreaterThan(0);
  await expect(page.getByRole('button', { name: 'Load More' })).toBeVisible();

  await attachEvidence(testInfo, ev, 'GET /api/transactions returned all ~1500 rows with no limit parameter');
});

// --- US-03: Load More ---
test('US-03: Load More appends rows without page reload', async ({ page }, testInfo) => {
  const ev = createEvidence(page);
  await goToTransactions(page);

  const rows = page.locator('[data-testid="transaction-row"]');
  const initialCount = await rows.count();

  let pageLoadCount = 0;
  page.on('load', () => pageLoadCount++);

  await page.getByRole('button', { name: 'Load More' }).click();

  await page.waitForFunction(
    (initial) => document.querySelectorAll('[data-testid="transaction-row"]').length > initial,
    initialCount,
    { timeout: 10000 }
  );

  const newCount = await rows.count();

  proveComparison(ev, 'More rows appeared after clicking Load More', '>', newCount, initialCount, 'rows after', 'rows before');
  proveComparison(ev, 'Page did not fully reload (SPA append)', '=', pageLoadCount, 0, 'page load events', '0');

  expect(newCount).toBeGreaterThan(initialCount);
  expect(pageLoadCount).toBe(0);

  await attachEvidence(testInfo, ev, 'No pagination existed — full dataset loaded on every request');
});

// --- US-04: Optimistic Category Update ---
test('US-04: category change updates immediately without refetching all transactions', async ({ page }, testInfo) => {
  const ev = createEvidence(page);
  await goToTransactions(page);

  let getCountAfterPatch = 0;
  let patchFired = false;
  let patchStatus = 0;
  page.on('request', (req) => {
    if (req.method() === 'PATCH' && req.url().includes('/api/transactions/')) patchFired = true;
    if (patchFired && req.method() === 'GET' && req.url().includes('/api/transactions?')) getCountAfterPatch++;
  });
  page.on('response', (res) => {
    if (res.request().method() === 'PATCH' && res.url().includes('/api/transactions/')) patchStatus = res.status();
  });

  const firstRowCategorySelect = page.locator('[data-testid="transaction-row"]').first().locator('button[role="combobox"]');
  await firstRowCategorySelect.click();
  await page.getByRole('option', { name: 'Medical' }).click();

  await page.waitForResponse((res) =>
    res.url().includes('/api/transactions/') && res.request().method() === 'PATCH'
  );
  await page.waitForTimeout(500);

  prove(ev, 'PATCH request succeeded', '200', String(patchStatus));
  proveComparison(ev, 'No GET /api/transactions refetch fired after PATCH (optimistic update)', '=', getCountAfterPatch, 0, 'GET requests after PATCH', '0');
  prove(ev, 'UI updated via setTransactions() not fetchTransactions()', 'optimistic (0 GETs)', getCountAfterPatch === 0 ? 'optimistic (0 GETs)' : `refetched (${getCountAfterPatch} GETs)`);

  expect(getCountAfterPatch).toBe(0);

  await attachEvidence(testInfo, ev, 'Every category change and toggle triggered fetchTransactions() reloading all ~1500 rows');
});

// --- US-05: Search Filter ---
test('US-05: search filters table rows client-side', async ({ page }, testInfo) => {
  const ev = createEvidence(page);
  await goToTransactions(page);

  const rows = page.locator('[data-testid="transaction-row"]');
  const unfilteredCount = await rows.count();

  // Count API calls before and after search to prove it's client-side
  const apiCallsBefore = ev.apiCalls.length;

  await page.getByPlaceholder('Search transactions...').fill('INSURANCE');

  await page.waitForFunction(
    (original) => document.querySelectorAll('[data-testid="transaction-row"]').length < original,
    unfilteredCount,
    { timeout: 5000 }
  );

  const filteredCount = await rows.count();
  const apiCallsAfter = ev.apiCalls.length;

  proveComparison(ev, 'Filtered rows fewer than unfiltered', '<', filteredCount, unfilteredCount, 'filtered', 'unfiltered');
  proveComparison(ev, 'At least one matching row found', '>', filteredCount, 0, 'matching rows', '0');
  proveComparison(ev, 'No new API calls during search (client-side filtering)', '=', apiCallsAfter, apiCallsBefore, 'API calls after search', 'API calls before search');

  expect(filteredCount).toBeLessThan(unfilteredCount);
  expect(filteredCount).toBeGreaterThan(0);

  await attachEvidence(testInfo, ev, 'Search and filter verify client-side behavior works correctly');
});

// --- US-06: Stats Update After Review ---
test('US-06: stats card updates after marking a transaction reviewed', async ({ page }, testInfo) => {
  const ev = createEvidence(page);
  await goToTransactions(page);

  const reviewedStat = page.locator('[data-testid="stat-reviewed"]');
  const beforeCount = parseInt(await reviewedStat.textContent() || '0', 10);

  const pendingRow = page.locator('[data-testid="transaction-row"]').filter({ hasText: 'Pending' }).first();

  const patchResponse = page.waitForResponse((res) =>
    res.url().includes('/api/transactions/') && res.request().method() === 'PATCH'
  );
  await pendingRow.getByRole('button', { name: 'Review' }).click();
  const res = await patchResponse;

  const afterCount = parseInt(await reviewedStat.textContent() || '0', 10);

  prove(ev, 'PATCH request succeeded', '200', String(res.status()));
  proveComparison(ev, 'Reviewed count incremented by exactly 1', '=', afterCount, beforeCount + 1, 'after count', 'before + 1');
  prove(ev, `Stats card before: ${beforeCount}, after: ${afterCount}`, String(beforeCount + 1), String(afterCount));

  expect(afterCount).toBe(beforeCount + 1);

  await attachEvidence(testInfo, ev, 'Stats were computed client-side from full transaction array — verify they update after optimistic review');
});
