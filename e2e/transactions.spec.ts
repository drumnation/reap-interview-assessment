/**
 * E2E tests for Transaction Review (Challenge 1)
 *
 * data-testid attributes added to src/app/transactions/page.tsx:
 *   stat-total, stat-reviewed, transactions-table, transaction-row
 *
 * Auth: All tests sign in via NextAuth default credentials form.
 * DB: Assumes `pnpm db:reset` was run before the suite.
 */
import { test, expect, type Page } from '@playwright/test';

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

  // Select "John Smith" (the case with ~1400 transactions) if not already selected
  const caseSelector = page.locator('button[role="combobox"]').first();
  const currentCase = await caseSelector.textContent();
  if (!currentCase?.includes('John Smith')) {
    await caseSelector.click();
    await page.getByRole('option', { name: 'John Smith' }).click();
  }

  // Wait for table to load
  await page.locator('[data-testid="transaction-row"]').first().waitFor({ timeout: 15000 });
}

// --- US-01: Bulk Review ---
test('US-01: bulk review sends single request to /api/transactions/bulk', async ({ page }) => {
  await goToTransactions(page);

  // Check first 3 checkboxes
  const checkboxes = page.locator('[data-testid="transaction-row"] input[type="checkbox"]');
  for (let i = 0; i < 3; i++) {
    await checkboxes.nth(i).check();
  }

  // Intercept network
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

  // Click bulk review button
  await page.getByRole('button', { name: /Mark.*Reviewed/i }).click();
  await page.waitForResponse((res) => res.url().includes('/api/transactions/bulk'));

  expect(bulkRequests.length).toBe(1);
  expect(individualPatchRequests.length).toBe(0);
});

// --- US-02: Pagination — Initial Load ---
test('US-02: initial load shows <= 100 rows with Load More button', async ({ page }) => {
  await goToTransactions(page);

  const rows = page.locator('[data-testid="transaction-row"]');
  const rowCount = await rows.count();
  expect(rowCount).toBeLessThanOrEqual(100);
  expect(rowCount).toBeGreaterThan(0);

  await expect(page.getByRole('button', { name: 'Load More' })).toBeVisible();
});

// --- US-03: Load More ---
test('US-03: Load More appends rows without page reload', async ({ page }) => {
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

  expect(await rows.count()).toBeGreaterThan(initialCount);
  expect(pageLoadCount).toBe(0);
});

// --- US-04: Optimistic Category Update ---
test('US-04: category change updates immediately without refetching all transactions', async ({ page }) => {
  await goToTransactions(page);

  // Track GET requests after PATCH fires
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

  // The category select is the SECOND combobox in each row (first is the case selector at top).
  // Each row has a Select with role="combobox" for category.
  const firstRowCategorySelect = page.locator('[data-testid="transaction-row"]').first().locator('button[role="combobox"]');
  await firstRowCategorySelect.click();

  // Pick "Medical"
  await page.getByRole('option', { name: 'Medical' }).click();

  // Wait for PATCH
  await page.waitForResponse((res) =>
    res.url().includes('/api/transactions/') && res.request().method() === 'PATCH'
  );

  // Allow a moment for any stray GET to fire
  await page.waitForTimeout(500);

  expect(getTransactionsAfterPatch).toBe(0);
});

// --- US-05: Search Filter ---
test('US-05: search filters table rows client-side', async ({ page }) => {
  await goToTransactions(page);

  const rows = page.locator('[data-testid="transaction-row"]');
  const unfilteredCount = await rows.count();

  // Use a description substring that definitely exists in the seed data
  await page.getByPlaceholder('Search transactions...').fill('INSURANCE');

  // Wait for filtering
  await page.waitForFunction(
    (original) => document.querySelectorAll('[data-testid="transaction-row"]').length < original,
    unfilteredCount,
    { timeout: 5000 }
  );

  const filteredCount = await rows.count();
  expect(filteredCount).toBeLessThan(unfilteredCount);
  expect(filteredCount).toBeGreaterThan(0);
});

// --- US-06: Stats Update After Review ---
test('US-06: stats card updates after marking a transaction reviewed', async ({ page }) => {
  await goToTransactions(page);

  const reviewedStat = page.locator('[data-testid="stat-reviewed"]');
  const beforeCount = parseInt(await reviewedStat.textContent() || '0', 10);

  // Find a row with "Pending" badge and click its "Review" button
  const pendingRow = page.locator('[data-testid="transaction-row"]').filter({ hasText: 'Pending' }).first();

  // Set up response waiter BEFORE clicking to avoid race condition
  const patchResponse = page.waitForResponse((res) =>
    res.url().includes('/api/transactions/') && res.request().method() === 'PATCH'
  );
  await pendingRow.getByRole('button', { name: 'Review' }).click();
  await patchResponse;

  const afterCount = parseInt(await reviewedStat.textContent() || '0', 10);
  expect(afterCount).toBe(beforeCount + 1);
});
