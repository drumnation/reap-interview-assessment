# Assessment Notes

## Problems Found

### Challenge 1: Transaction Review

**Bug 1 (Critical): Bulk review bypasses the bulk endpoint**
The UI's `handleBulkMarkReviewed` fired N parallel `fetch()` calls — one per selected transaction — to `/api/transactions/:id` instead of using the existing `/api/transactions/bulk` endpoint. With 1500 transactions selected, this saturated the browser's request pool and caused SQLite write lock contention, resulting in partial updates and timeouts.

**Bug 2 (Critical): Bulk API endpoint used sequential individual updates**
Even the `/api/transactions/bulk` route looped through IDs calling `prisma.update()` one at a time in a serial for-loop. Should use `updateMany` for a single DB round trip.

**Bug 3 (High): Full dataset refetch on every action**
Every checkbox toggle and category change triggered a full refetch of all ~1500 transactions via `fetchTransactions()`. Replaced with optimistic local state updates.

**Bug 4 (Medium): No pagination**
`GET /api/transactions` returned all records with no limit. Added cursor-based pagination with default limit of 100.

### Challenge 2: Order Processing Workflow

**Bug 1 (Critical): Payment step success/failure logic inverted**
`processPaymentStep` had its if/else arms swapped. The gateway always returns `{success: true}`, but the code checked `!paymentResult.success` — so the success branch was unreachable, and the step always returned `{success: false}`. This caused 0% workflow success rate. One-line fix: change `!paymentResult.success` to `paymentResult.success`.

**Bug 2 (High): No retry on transient external service failures**
`checkInventoryStep` fails ~40% of the time (simulated timeouts/rate limits). `sendNotificationStep` fails ~25% of the time. The `WorkflowExecutor` had no retry mechanism — first failure killed the entire workflow. Added `withRetry` with exponential backoff. With up to 3 retries, expected success rate goes from ~45% to ~97%.

**Bug 3 (Medium): No compensation on partial failure**
If payment succeeds but shipment fails, there's no rollback of the charge. Noted as a gap; full saga/compensation pattern would be needed in production.

**Bug 4 (Low): In-memory workflow store**
`WorkflowStore` is a module-level `Map` — lost on restart or hot reload. Would need a DB-persisted model in production.

## What I Fixed

1. Corrected inverted payment step condition (`!paymentResult.success` -> `paymentResult.success`)
2. Wired bulk review UI to use `/api/transactions/bulk` endpoint (single request instead of N)
3. Replaced sequential loop in bulk API with `prisma.updateMany()` (single SQL statement)
4. Added `withRetry` helper with exponential backoff to `WorkflowExecutor`
5. Added `retryable` flag to `StepDefinition`; marked inventory and notification steps as retryable
6. Replaced full refetch with optimistic UI updates on category change and toggle reviewed
7. Added cursor-based pagination to transactions API with "Load More" in the frontend
8. Added failing tests first (TDD: red -> green), then fixed bugs to make them pass

## Trade-offs Considered

- **updateMany vs. per-record updates**: `updateMany` loses per-record error granularity. Kept the bulk route returning a success count for observability but used `updateMany` for performance. If partial failure reporting is critical, a transaction with individual updates + error collection is the right call.
- **Optimistic updates vs. consistency**: Optimistic UI can diverge from DB on network failure. Acceptable for this use case; added error handling to revert on failure by re-fetching.
- **Retry backoff**: Simple exponential backoff (50ms base) is sufficient for an assessment. Production would add jitter to avoid thundering herd.
- **Notification as non-fatal**: Could make `sendNotificationStep` non-blocking (log failure, don't fail the workflow). Chose to retry instead to preserve the workflow contract, but this is a valid product decision.
- **Pagination limit**: Defaulted to 100 records per page (max 500). The frontend still does client-side filtering/search over the loaded set. Server-side search would be better for very large datasets.

## What I Would Do With More Time

- Persist `WorkflowRun` to SQLite (add Prisma model) for durability and resumability
- Add saga/compensation pattern to `WorkflowExecutor` for rollback on partial failure
- Use `/api/transactions/stats` endpoint for server-side aggregation instead of client-side `useMemo`
- Add virtual scrolling to the transactions table for smoother rendering of large lists
- Refactor the 650-line `TransactionsPage` into smaller focused components
- Add E2E tests with Playwright for the bulk review flow
- CI pipeline (GitHub Actions) to run tests on every push
