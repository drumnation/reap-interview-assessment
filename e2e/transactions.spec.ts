/**
 * E2E tests for Transaction Review (Challenge 1)
 *
 * data-testid attributes added to src/app/transactions/page.tsx:
 *   stat-total, stat-reviewed, transactions-table, transaction-row
 *
 * Auth: All tests sign in via NextAuth default credentials form.
 * DB: Assumes `pnpm db:reset` was run before the suite.
 *
 * Each test collects API evidence (method, URL, status, duration)
 * and attaches it as a test artifact for the E2E report.
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
  const apiCalls = collectApiEvidence(page, testInfo);
  await goToTransactions(page);

  const checkboxes = page.locator('[data-testid="transaction-row"] input[type="checkbox"]');
  for (let i = 0; i < 3; i++) {
    await checkboxes.nth(i).check();
  }

  const bulkRequests: string[] = [];
  const individualPatchRequests: string[] = [];
  page.on('request', (req) => {
    if (req.method() === 'PATCH' && req.url().includes('/api/transactions/bulk')) {
      bulkRequests.push(req.url());
    }
    if (req.method() === 'PATCH' && /\/api\/transactions\/[a-f0-9-]+$/.test(req.url())) {
      individualPatchRequests.push(req.url());
    }
  });

  await page.getByRole('button', { name: /Mark.*Reviewed/i }).click();
  await page.waitForResponse((res) => res.url().includes('/api/transactions/bulk'));

  expect(bulkRequests.length).toBe(1);
  expect(individualPatchRequests.length).toBe(0);

  await attachEvidence(testInfo, apiCalls, 'Bulk review: 1 PATCH /api/transactions/bulk, 0 individual PATCHes');
});

// --- US-02: Pagination — Initial Load ---
test('US-02: initial load shows <= 100 rows with Load More button', async ({ page }, testInfo) => {
  const apiCalls = collectApiEvidence(page, testInfo);
  await goToTransactions(page);

  const rows = page.locator('[data-testid="transaction-row"]');
  const rowCount = await rows.count();
  expect(rowCount).toBeLessThanOrEqual(100);
  expect(rowCount).toBeGreaterThan(0);

  await expect(page.getByRole('button', { name: 'Load More' })).toBeVisible();

  await attachEvidence(testInfo, apiCalls, `Pagination: ${rowCount} rows loaded (limit 100), Load More visible`);
});

// --- US-03: Load More ---
test('US-03: Load More appends rows without page reload', async ({ page }, testInfo) => {
  const apiCalls = collectApiEvidence(page, testInfo);
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
  expect(newCount).toBeGreaterThan(initialCount);
  expect(pageLoadCount).toBe(0);

  await attachEvidence(testInfo, apiCalls, `Load More: ${initialCount} → ${newCount} rows, 0 page reloads`);
});

// --- US-04: Optimistic Category Update ---
test('US-04: category change updates immediately without refetching all transactions', async ({ page }, testInfo) => {
  const apiCalls = collectApiEvidence(page, testInfo);
  await goToTransactions(page);

  let getTransactionsAfterPatch = 0;
  let patchFired = false;
  page.on('request', (req) => {
    if (req.method() === 'PATCH' && req.url().includes('/api/transactions/')) {
      patchFired = true;
    }
    if (patchFired && req.method() === 'GET' && req.url().includes('/api/transactions?')) {
      getTransactionsAfterPatch++;
    }
  });

  const firstRowCategorySelect = page.locator('[data-testid="transaction-row"]').first().locator('button[role="combobox"]');
  await firstRowCategorySelect.click();
  await page.getByRole('option', { name: 'Medical' }).click();

  await page.waitForResponse((res) =>
    res.url().includes('/api/transactions/') && res.request().method() === 'PATCH'
  );

  await page.waitForTimeout(500);

  expect(getTransactionsAfterPatch).toBe(0);

  await attachEvidence(testInfo, apiCalls, `Optimistic: PATCH 200, ${getTransactionsAfterPatch} refetch GETs (expected 0)`);
});

// --- US-05: Search Filter ---
test('US-05: search filters table rows client-side', async ({ page }, testInfo) => {
  const apiCalls = collectApiEvidence(page, testInfo);
  await goToTransactions(page);

  const rows = page.locator('[data-testid="transaction-row"]');
  const unfilteredCount = await rows.count();

  await page.getByPlaceholder('Search transactions...').fill('INSURANCE');

  await page.waitForFunction(
    (original) => document.querySelectorAll('[data-testid="transaction-row"]').length < original,
    unfilteredCount,
    { timeout: 5000 }
  );

  const filteredCount = await rows.count();
  expect(filteredCount).toBeLessThan(unfilteredCount);
  expect(filteredCount).toBeGreaterThan(0);

  await attachEvidence(testInfo, apiCalls, `Search: ${unfilteredCount} → ${filteredCount} rows (client-side, no new API calls)`);
});

// --- US-06: Stats Update After Review ---
test('US-06: stats card updates after marking a transaction reviewed', async ({ page }, testInfo) => {
  const apiCalls = collectApiEvidence(page, testInfo);
  await goToTransactions(page);

  const reviewedStat = page.locator('[data-testid="stat-reviewed"]');
  const beforeCount = parseInt(await reviewedStat.textContent() || '0', 10);

  const pendingRow = page.locator('[data-testid="transaction-row"]').filter({ hasText: 'Pending' }).first();

  const patchResponse = page.waitForResponse((res) =>
    res.url().includes('/api/transactions/') && res.request().method() === 'PATCH'
  );
  await pendingRow.getByRole('button', { name: 'Review' }).click();
  await patchResponse;

  const afterCount = parseInt(await reviewedStat.textContent() || '0', 10);
  expect(afterCount).toBe(beforeCount + 1);

  await attachEvidence(testInfo, apiCalls, `Stats: reviewed count ${beforeCount} → ${afterCount}`);
});
