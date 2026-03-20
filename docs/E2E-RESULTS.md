# E2E Test Results

> Generated: 2026-03-20T02:07:39.662Z

**10/10 passed** 

| Story | Status | Duration | Artifacts |
|-------|--------|----------|-----------|
| ✅ US-01: bulk review sends single request to /api/transactions/bulk | passed | 8034ms | [screenshot](../e2e-artifacts/us-01-bulk-review-sends-single-request-to-apitransactionsbulk.png) · [video](../e2e-artifacts/us-01-bulk-review-sends-single-request-to-apitransactionsbulk.webm) · [trace](../e2e-artifacts/us-01-bulk-review-sends-single-request-to-apitransactionsbulk-trace.zip) |
| ✅ US-02: initial load shows <= 100 rows with Load More button | passed | 1976ms | [screenshot](../e2e-artifacts/us-02-initial-load-shows-100-rows-with-load-more-button.png) · [video](../e2e-artifacts/us-02-initial-load-shows-100-rows-with-load-more-button.webm) · [trace](../e2e-artifacts/us-02-initial-load-shows-100-rows-with-load-more-button-trace.zip) |
| ✅ US-03: Load More appends rows without page reload | passed | 3503ms | [screenshot](../e2e-artifacts/us-03-load-more-appends-rows-without-page-reload.png) · [video](../e2e-artifacts/us-03-load-more-appends-rows-without-page-reload.webm) · [trace](../e2e-artifacts/us-03-load-more-appends-rows-without-page-reload-trace.zip) |
| ✅ US-04: category change updates immediately without refetching all transactions | passed | 3470ms | [screenshot](../e2e-artifacts/us-04-category-change-updates-immediately-without-refetching-all-transactions.png) · [video](../e2e-artifacts/us-04-category-change-updates-immediately-without-refetching-all-transactions.webm) · [trace](../e2e-artifacts/us-04-category-change-updates-immediately-without-refetching-all-transactions-trace.zip) |
| ✅ US-05: search filters table rows client-side | passed | 2098ms | [screenshot](../e2e-artifacts/us-05-search-filters-table-rows-client-side.png) · [video](../e2e-artifacts/us-05-search-filters-table-rows-client-side.webm) · [trace](../e2e-artifacts/us-05-search-filters-table-rows-client-side-trace.zip) |
| ✅ US-06: stats card updates after marking a transaction reviewed | passed | 2173ms | [screenshot](../e2e-artifacts/us-06-stats-card-updates-after-marking-a-transaction-reviewed.png) · [video](../e2e-artifacts/us-06-stats-card-updates-after-marking-a-transaction-reviewed.webm) · [trace](../e2e-artifacts/us-06-stats-card-updates-after-marking-a-transaction-reviewed-trace.zip) |
| ✅ US-07: single workflow run completes successfully | passed | 5248ms | [screenshot](../e2e-artifacts/us-07-single-workflow-run-completes-successfully.png) · [video](../e2e-artifacts/us-07-single-workflow-run-completes-successfully.webm) · [trace](../e2e-artifacts/us-07-single-workflow-run-completes-successfully-trace.zip) |
| ✅ US-08: batch run of 5 succeeds at least 4/5 times | passed | 8001ms | [screenshot](../e2e-artifacts/us-08-batch-run-of-5-succeeds-at-least-45-times.png) · [video](../e2e-artifacts/us-08-batch-run-of-5-succeeds-at-least-45-times.webm) · [trace](../e2e-artifacts/us-08-batch-run-of-5-succeeds-at-least-45-times-trace.zip) |
| ✅ US-09: expanding a completed run shows all 5 steps | passed | 1000ms | [screenshot](../e2e-artifacts/us-09-expanding-a-completed-run-shows-all-5-steps.png) · [video](../e2e-artifacts/us-09-expanding-a-completed-run-shows-all-5-steps.webm) · [trace](../e2e-artifacts/us-09-expanding-a-completed-run-shows-all-5-steps-trace.zip) |
| ✅ US-10: clearing history empties the run list | passed | 989ms | [screenshot](../e2e-artifacts/us-10-clearing-history-empties-the-run-list.png) · [video](../e2e-artifacts/us-10-clearing-history-empties-the-run-list.webm) · [trace](../e2e-artifacts/us-10-clearing-history-empties-the-run-list-trace.zip) |

## Details

### ✅ US-01: bulk review sends single request to /api/transactions/bulk

![US-01: bulk review sends single request to /api/transactions/bulk](../e2e-artifacts/us-01-bulk-review-sends-single-request-to-apitransactionsbulk.png)

<details><summary>API Evidence Log</summary>

```
API Evidence: Bulk review: 1 PATCH /api/transactions/bulk, 0 individual PATCHes
============================================================
✅ GET /api/cases → 200 (270ms)
✅ GET /api/transactions?caseId=2065ad00-d15a-409f-a120-c44b1d8ebce0&limit=100 → 200 (151ms)
✅ GET /api/transactions?caseId=3ccc5019-38ea-418d-85ab-28d590d4a75c&limit=100 → 200 (258ms)
✅ PATCH /api/transactions/bulk → 200 (420ms)

Total: 4 requests, 4 succeeded
```
</details>

Video: [us-01-bulk-review-sends-single-request-to-apitransactionsbulk.webm](../e2e-artifacts/us-01-bulk-review-sends-single-request-to-apitransactionsbulk.webm)

Trace: `pnpm exec playwright show-trace e2e-artifacts/us-01-bulk-review-sends-single-request-to-apitransactionsbulk-trace.zip`

### ✅ US-02: initial load shows <= 100 rows with Load More button

![US-02: initial load shows <= 100 rows with Load More button](../e2e-artifacts/us-02-initial-load-shows-100-rows-with-load-more-button.png)

<details><summary>API Evidence Log</summary>

```
API Evidence: Pagination: 100 rows loaded (limit 100), Load More visible
============================================================
✅ GET /api/cases → 200 (3ms)
✅ GET /api/transactions?caseId=2065ad00-d15a-409f-a120-c44b1d8ebce0&limit=100 → 200 (4ms)
✅ GET /api/transactions?caseId=3ccc5019-38ea-418d-85ab-28d590d4a75c&limit=100 → 200 (12ms)

Total: 3 requests, 3 succeeded
```
</details>

Video: [us-02-initial-load-shows-100-rows-with-load-more-button.webm](../e2e-artifacts/us-02-initial-load-shows-100-rows-with-load-more-button.webm)

Trace: `pnpm exec playwright show-trace e2e-artifacts/us-02-initial-load-shows-100-rows-with-load-more-button-trace.zip`

### ✅ US-03: Load More appends rows without page reload

![US-03: Load More appends rows without page reload](../e2e-artifacts/us-03-load-more-appends-rows-without-page-reload.png)

<details><summary>API Evidence Log</summary>

```
API Evidence: Load More: 100 → 200 rows, 0 page reloads
============================================================
✅ GET /api/cases → 200 (4ms)
✅ GET /api/transactions?caseId=2065ad00-d15a-409f-a120-c44b1d8ebce0&limit=100 → 200 (3ms)
✅ GET /api/transactions?caseId=3ccc5019-38ea-418d-85ab-28d590d4a75c&limit=100 → 200 (12ms)
✅ GET /api/transactions?caseId=3ccc5019-38ea-418d-85ab-28d590d4a75c&limit=100&cursor=f12c1a14-20f6-48af-a410-30bc435e52c1 → 200 (4ms)

Total: 4 requests, 4 succeeded
```
</details>

Video: [us-03-load-more-appends-rows-without-page-reload.webm](../e2e-artifacts/us-03-load-more-appends-rows-without-page-reload.webm)

Trace: `pnpm exec playwright show-trace e2e-artifacts/us-03-load-more-appends-rows-without-page-reload-trace.zip`

### ✅ US-04: category change updates immediately without refetching all transactions

![US-04: category change updates immediately without refetching all transactions](../e2e-artifacts/us-04-category-change-updates-immediately-without-refetching-all-transactions.png)

<details><summary>API Evidence Log</summary>

```
API Evidence: Optimistic: PATCH 200, 0 refetch GETs (expected 0)
============================================================
✅ GET /api/cases → 200 (19ms)
✅ GET /api/transactions?caseId=2065ad00-d15a-409f-a120-c44b1d8ebce0&limit=100 → 200 (57ms)
✅ GET /api/transactions?caseId=3ccc5019-38ea-418d-85ab-28d590d4a75c&limit=100 → 200 (53ms)
✅ PATCH /api/transactions/195115ce-4b79-4110-90e9-dd78e4d1d9c1 → 200 (409ms)

Total: 4 requests, 4 succeeded
```
</details>

Video: [us-04-category-change-updates-immediately-without-refetching-all-transactions.webm](../e2e-artifacts/us-04-category-change-updates-immediately-without-refetching-all-transactions.webm)

Trace: `pnpm exec playwright show-trace e2e-artifacts/us-04-category-change-updates-immediately-without-refetching-all-transactions-trace.zip`

### ✅ US-05: search filters table rows client-side

![US-05: search filters table rows client-side](../e2e-artifacts/us-05-search-filters-table-rows-client-side.png)

<details><summary>API Evidence Log</summary>

```
API Evidence: Search: 100 → 5 rows (client-side, no new API calls)
============================================================
✅ GET /api/cases → 200 (4ms)
✅ GET /api/transactions?caseId=2065ad00-d15a-409f-a120-c44b1d8ebce0&limit=100 → 200 (5ms)
✅ GET /api/transactions?caseId=3ccc5019-38ea-418d-85ab-28d590d4a75c&limit=100 → 200 (50ms)

Total: 3 requests, 3 succeeded
```
</details>

Video: [us-05-search-filters-table-rows-client-side.webm](../e2e-artifacts/us-05-search-filters-table-rows-client-side.webm)

Trace: `pnpm exec playwright show-trace e2e-artifacts/us-05-search-filters-table-rows-client-side-trace.zip`

### ✅ US-06: stats card updates after marking a transaction reviewed

![US-06: stats card updates after marking a transaction reviewed](../e2e-artifacts/us-06-stats-card-updates-after-marking-a-transaction-reviewed.png)

<details><summary>API Evidence Log</summary>

```
API Evidence: Stats: reviewed count 34 → 35
============================================================
✅ GET /api/cases → 200 (3ms)
✅ GET /api/transactions?caseId=2065ad00-d15a-409f-a120-c44b1d8ebce0&limit=100 → 200 (3ms)
✅ GET /api/transactions?caseId=3ccc5019-38ea-418d-85ab-28d590d4a75c&limit=100 → 200 (5ms)
✅ PATCH /api/transactions/344f66d0-dbdc-4e7c-a54a-3f0687c4df81 → 200 (2ms)

Total: 4 requests, 4 succeeded
```
</details>

Video: [us-06-stats-card-updates-after-marking-a-transaction-reviewed.webm](../e2e-artifacts/us-06-stats-card-updates-after-marking-a-transaction-reviewed.webm)

Trace: `pnpm exec playwright show-trace e2e-artifacts/us-06-stats-card-updates-after-marking-a-transaction-reviewed-trace.zip`

### ✅ US-07: single workflow run completes successfully

![US-07: single workflow run completes successfully](../e2e-artifacts/us-07-single-workflow-run-completes-successfully.png)

<details><summary>API Evidence Log</summary>

```
API Evidence: Single run: POST /api/workflows → 200 COMPLETED, no payment error
============================================================
✅ GET /api/workflows → 200 (654ms)
✅ POST /api/workflows → 200 (1709ms)
✅ GET /api/workflows → 200 (8ms)

Total: 3 requests, 3 succeeded
```
</details>

Video: [us-07-single-workflow-run-completes-successfully.webm](../e2e-artifacts/us-07-single-workflow-run-completes-successfully.webm)

Trace: `pnpm exec playwright show-trace e2e-artifacts/us-07-single-workflow-run-completes-successfully-trace.zip`

### ✅ US-08: batch run of 5 succeeds at least 4/5 times

![US-08: batch run of 5 succeeds at least 4/5 times](../e2e-artifacts/us-08-batch-run-of-5-succeeds-at-least-45-times.png)

<details><summary>API Evidence Log</summary>

```
API Evidence: Batch: 5/5 COMPLETED, 0 FAILED (retry threshold: >=4)
============================================================
✅ GET /api/workflows → 200 (2ms)
✅ POST /api/workflows/clear → 200 (162ms)
✅ POST /api/workflows → 200 (1460ms)
✅ POST /api/workflows → 200 (1105ms)
✅ POST /api/workflows → 200 (811ms)
✅ POST /api/workflows → 200 (803ms)
✅ POST /api/workflows → 200 (798ms)
✅ GET /api/workflows → 200 (11ms)

Total: 8 requests, 8 succeeded
```
</details>

Video: [us-08-batch-run-of-5-succeeds-at-least-45-times.webm](../e2e-artifacts/us-08-batch-run-of-5-succeeds-at-least-45-times.webm)

Trace: `pnpm exec playwright show-trace e2e-artifacts/us-08-batch-run-of-5-succeeds-at-least-45-times-trace.zip`

### ✅ US-09: expanding a completed run shows all 5 steps

![US-09: expanding a completed run shows all 5 steps](../e2e-artifacts/us-09-expanding-a-completed-run-shows-all-5-steps.png)

<details><summary>API Evidence Log</summary>

```
API Evidence: Steps: all 5 visible — Validate Order, Check Inventory, Process Payment, Create Shipment, Send Notification
============================================================
✅ GET /api/workflows → 200 (38ms)

Total: 1 requests, 1 succeeded
```
</details>

Video: [us-09-expanding-a-completed-run-shows-all-5-steps.webm](../e2e-artifacts/us-09-expanding-a-completed-run-shows-all-5-steps.webm)

Trace: `pnpm exec playwright show-trace e2e-artifacts/us-09-expanding-a-completed-run-shows-all-5-steps-trace.zip`

### ✅ US-10: clearing history empties the run list

![US-10: clearing history empties the run list](../e2e-artifacts/us-10-clearing-history-empties-the-run-list.png)

<details><summary>API Evidence Log</summary>

```
API Evidence: Clear: POST /api/workflows/clear → 200, run list empty, stats zeroed
============================================================
✅ GET /api/workflows → 200 (22ms)
✅ POST /api/workflows/clear → 200 (6ms)

Total: 2 requests, 2 succeeded
```
</details>

Video: [us-10-clearing-history-empties-the-run-list.webm](../e2e-artifacts/us-10-clearing-history-empties-the-run-list.webm)

Trace: `pnpm exec playwright show-trace e2e-artifacts/us-10-clearing-history-empties-the-run-list-trace.zip`
