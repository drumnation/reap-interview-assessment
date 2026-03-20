# E2E Test Results

> Generated: 2026-03-20T00:44:53.388Z

**10/10 passed** 

| Story | Status | Duration | Artifacts |
|-------|--------|----------|-----------|
| ✅ US-01: bulk review sends single request to /api/transactions/bulk | passed | 9753ms | [screenshot](../e2e-artifacts/us-01-bulk-review-sends-single-request-to-apitransactionsbulk.png) · [video](../e2e-artifacts/us-01-bulk-review-sends-single-request-to-apitransactionsbulk.webm) · [trace](../e2e-artifacts/us-01-bulk-review-sends-single-request-to-apitransactionsbulk-trace.zip) |
| ✅ US-02: initial load shows <= 100 rows with Load More button | passed | 2366ms | [screenshot](../e2e-artifacts/us-02-initial-load-shows-100-rows-with-load-more-button.png) · [video](../e2e-artifacts/us-02-initial-load-shows-100-rows-with-load-more-button.webm) · [trace](../e2e-artifacts/us-02-initial-load-shows-100-rows-with-load-more-button-trace.zip) |
| ✅ US-03: Load More appends rows without page reload | passed | 3582ms | [screenshot](../e2e-artifacts/us-03-load-more-appends-rows-without-page-reload.png) · [video](../e2e-artifacts/us-03-load-more-appends-rows-without-page-reload.webm) · [trace](../e2e-artifacts/us-03-load-more-appends-rows-without-page-reload-trace.zip) |
| ✅ US-04: category change updates immediately without refetching all transactions | passed | 3841ms | [screenshot](../e2e-artifacts/us-04-category-change-updates-immediately-without-refetching-all-transactions.png) · [video](../e2e-artifacts/us-04-category-change-updates-immediately-without-refetching-all-transactions.webm) · [trace](../e2e-artifacts/us-04-category-change-updates-immediately-without-refetching-all-transactions-trace.zip) |
| ✅ US-05: search filters table rows client-side | passed | 2003ms | [screenshot](../e2e-artifacts/us-05-search-filters-table-rows-client-side.png) · [video](../e2e-artifacts/us-05-search-filters-table-rows-client-side.webm) · [trace](../e2e-artifacts/us-05-search-filters-table-rows-client-side-trace.zip) |
| ✅ US-06: stats card updates after marking a transaction reviewed | passed | 2294ms | [screenshot](../e2e-artifacts/us-06-stats-card-updates-after-marking-a-transaction-reviewed.png) · [video](../e2e-artifacts/us-06-stats-card-updates-after-marking-a-transaction-reviewed.webm) · [trace](../e2e-artifacts/us-06-stats-card-updates-after-marking-a-transaction-reviewed-trace.zip) |
| ✅ US-07: single workflow run completes successfully | passed | 4881ms | [screenshot](../e2e-artifacts/us-07-single-workflow-run-completes-successfully.png) · [video](../e2e-artifacts/us-07-single-workflow-run-completes-successfully.webm) · [trace](../e2e-artifacts/us-07-single-workflow-run-completes-successfully-trace.zip) |
| ✅ US-08: batch run of 5 succeeds at least 4/5 times | passed | 8805ms | [screenshot](../e2e-artifacts/us-08-batch-run-of-5-succeeds-at-least-45-times.png) · [video](../e2e-artifacts/us-08-batch-run-of-5-succeeds-at-least-45-times.webm) · [trace](../e2e-artifacts/us-08-batch-run-of-5-succeeds-at-least-45-times-trace.zip) |
| ✅ US-09: expanding a completed run shows all 5 steps | passed | 3077ms | [screenshot](../e2e-artifacts/us-09-expanding-a-completed-run-shows-all-5-steps.png) · [video](../e2e-artifacts/us-09-expanding-a-completed-run-shows-all-5-steps.webm) · [trace](../e2e-artifacts/us-09-expanding-a-completed-run-shows-all-5-steps-trace.zip) |
| ✅ US-10: clearing history empties the run list | passed | 1089ms | [screenshot](../e2e-artifacts/us-10-clearing-history-empties-the-run-list.png) · [video](../e2e-artifacts/us-10-clearing-history-empties-the-run-list.webm) · [trace](../e2e-artifacts/us-10-clearing-history-empties-the-run-list-trace.zip) |

## Details

### ✅ US-01: bulk review sends single request to /api/transactions/bulk

![US-01: bulk review sends single request to /api/transactions/bulk](../e2e-artifacts/us-01-bulk-review-sends-single-request-to-apitransactionsbulk.png)

Video: [us-01-bulk-review-sends-single-request-to-apitransactionsbulk.webm](../e2e-artifacts/us-01-bulk-review-sends-single-request-to-apitransactionsbulk.webm)

Trace: `pnpm exec playwright show-trace e2e-artifacts/us-01-bulk-review-sends-single-request-to-apitransactionsbulk-trace.zip`

### ✅ US-02: initial load shows <= 100 rows with Load More button

![US-02: initial load shows <= 100 rows with Load More button](../e2e-artifacts/us-02-initial-load-shows-100-rows-with-load-more-button.png)

Video: [us-02-initial-load-shows-100-rows-with-load-more-button.webm](../e2e-artifacts/us-02-initial-load-shows-100-rows-with-load-more-button.webm)

Trace: `pnpm exec playwright show-trace e2e-artifacts/us-02-initial-load-shows-100-rows-with-load-more-button-trace.zip`

### ✅ US-03: Load More appends rows without page reload

![US-03: Load More appends rows without page reload](../e2e-artifacts/us-03-load-more-appends-rows-without-page-reload.png)

Video: [us-03-load-more-appends-rows-without-page-reload.webm](../e2e-artifacts/us-03-load-more-appends-rows-without-page-reload.webm)

Trace: `pnpm exec playwright show-trace e2e-artifacts/us-03-load-more-appends-rows-without-page-reload-trace.zip`

### ✅ US-04: category change updates immediately without refetching all transactions

![US-04: category change updates immediately without refetching all transactions](../e2e-artifacts/us-04-category-change-updates-immediately-without-refetching-all-transactions.png)

Video: [us-04-category-change-updates-immediately-without-refetching-all-transactions.webm](../e2e-artifacts/us-04-category-change-updates-immediately-without-refetching-all-transactions.webm)

Trace: `pnpm exec playwright show-trace e2e-artifacts/us-04-category-change-updates-immediately-without-refetching-all-transactions-trace.zip`

### ✅ US-05: search filters table rows client-side

![US-05: search filters table rows client-side](../e2e-artifacts/us-05-search-filters-table-rows-client-side.png)

Video: [us-05-search-filters-table-rows-client-side.webm](../e2e-artifacts/us-05-search-filters-table-rows-client-side.webm)

Trace: `pnpm exec playwright show-trace e2e-artifacts/us-05-search-filters-table-rows-client-side-trace.zip`

### ✅ US-06: stats card updates after marking a transaction reviewed

![US-06: stats card updates after marking a transaction reviewed](../e2e-artifacts/us-06-stats-card-updates-after-marking-a-transaction-reviewed.png)

Video: [us-06-stats-card-updates-after-marking-a-transaction-reviewed.webm](../e2e-artifacts/us-06-stats-card-updates-after-marking-a-transaction-reviewed.webm)

Trace: `pnpm exec playwright show-trace e2e-artifacts/us-06-stats-card-updates-after-marking-a-transaction-reviewed-trace.zip`

### ✅ US-07: single workflow run completes successfully

![US-07: single workflow run completes successfully](../e2e-artifacts/us-07-single-workflow-run-completes-successfully.png)

Video: [us-07-single-workflow-run-completes-successfully.webm](../e2e-artifacts/us-07-single-workflow-run-completes-successfully.webm)

Trace: `pnpm exec playwright show-trace e2e-artifacts/us-07-single-workflow-run-completes-successfully-trace.zip`

### ✅ US-08: batch run of 5 succeeds at least 4/5 times

![US-08: batch run of 5 succeeds at least 4/5 times](../e2e-artifacts/us-08-batch-run-of-5-succeeds-at-least-45-times.png)

Video: [us-08-batch-run-of-5-succeeds-at-least-45-times.webm](../e2e-artifacts/us-08-batch-run-of-5-succeeds-at-least-45-times.webm)

Trace: `pnpm exec playwright show-trace e2e-artifacts/us-08-batch-run-of-5-succeeds-at-least-45-times-trace.zip`

### ✅ US-09: expanding a completed run shows all 5 steps

![US-09: expanding a completed run shows all 5 steps](../e2e-artifacts/us-09-expanding-a-completed-run-shows-all-5-steps.png)

Video: [us-09-expanding-a-completed-run-shows-all-5-steps.webm](../e2e-artifacts/us-09-expanding-a-completed-run-shows-all-5-steps.webm)

Trace: `pnpm exec playwright show-trace e2e-artifacts/us-09-expanding-a-completed-run-shows-all-5-steps-trace.zip`

### ✅ US-10: clearing history empties the run list

![US-10: clearing history empties the run list](../e2e-artifacts/us-10-clearing-history-empties-the-run-list.png)

Video: [us-10-clearing-history-empties-the-run-list.webm](../e2e-artifacts/us-10-clearing-history-empties-the-run-list.webm)

Trace: `pnpm exec playwright show-trace e2e-artifacts/us-10-clearing-history-empties-the-run-list-trace.zip`
