# Decision Log

## D001: Fix Payment Step Before Adding Retry Logic

**Decision**: Fix the inverted payment step condition as the very first bug fix, before tackling retry logic.

**Context**: The payment step's if/else was backwards, causing 100% failure rate. Even with retries, the payment step would never succeed because it's a logic bug, not a transient failure.

**Alternatives**: Could have fixed retry first, but that would have masked the real problem — retrying a deterministic failure is pointless.

**Files changed**: `src/lib/workflow/steps/order-steps.ts:82` (1-line change)

## D002: Retry in Executor, Not in Steps

**Decision**: Added retry logic (`withRetry`) in `WorkflowExecutor.executeStep()` rather than inside each individual step function.

**Context**: The step functions simulate external services and are pure (input -> output). Retry is an infrastructure concern, not a business logic concern. Steps declare `retryable: true` and the executor handles the retry mechanics.

**Alternatives**:
- Retry inside each step: Would duplicate retry logic in every flaky step
- Global retry on all steps: Would retry deterministic failures (validation, payment) unnecessarily
- Middleware/decorator pattern: Overcomplicated for this codebase size

**Files changed**: `src/lib/workflow/executor.ts`, `src/lib/workflow/types.ts`, `src/lib/workflow/workflows/order-workflow.ts`

## D003: Optimistic UI Updates Over Full Refetch

**Decision**: Use `setTransactions(prev => prev.map(...))` for immediate UI updates after PATCH, with `fetchTransactions()` as error fallback.

**Context**: The original code re-fetched all ~1500 transactions after every single checkbox toggle or category change. This caused visible lag and unnecessary network/DB load.

**Alternatives**:
- SWR/React Query with cache invalidation: Better for production, but adds a dependency and changes the data fetching pattern used throughout the codebase
- Debounced refetch: Still hits the server, just less often — doesn't solve the core issue
- Server-sent events for real-time sync: Overkill for a single-user review tool

**Trade-off**: Optimistic updates can diverge from DB state on network error. We revert to a full refetch in the catch block to self-heal.

**Files changed**: `src/app/transactions/page.tsx`

## D004: Cursor-Based Pagination Over Offset-Based

**Decision**: Used cursor-based pagination (`take + cursor`) instead of offset-based (`skip + take`).

**Context**: The transactions API had no pagination at all — returning all ~1500 records per request.

**Alternatives**:
- Offset-based (`?page=2&pageSize=50`): Simpler API, but suffers from drift when records are inserted/deleted between pages
- Cursor-based: Stable pagination that works correctly even when data changes between requests
- No pagination + virtual scroll: Would still transfer all data over the wire

**Trade-off**: Frontend now needs a "Load More" button instead of page numbers. Simpler UX but less random-access navigation. Acceptable for a chronological transaction list.

**Files changed**: `src/app/api/transactions/route.ts`, `src/app/transactions/page.tsx`

## D005: Single Bulk Endpoint Call Over N Individual Requests

**Decision**: Replaced `Promise.all(ids.map(id => fetch(...)))` with a single `fetch('/api/transactions/bulk', ...)`.

**Context**: The frontend's "Mark as Reviewed" button fired one HTTP request per selected transaction. With 100+ selections, this would create 100+ concurrent connections.

**Alternatives**:
- Batch in chunks (e.g., 50 at a time): More resilient to partial failure, but adds complexity
- WebSocket for batch operations: Overkill

**Files changed**: `src/app/transactions/page.tsx`

## D006: updateMany Over Sequential Loop in Bulk Endpoint

**Decision**: Replaced `for (const id of ids) { prisma.update(...) }` with `prisma.updateMany({ where: { id: { in: ids } } })`.

**Context**: The bulk endpoint already existed but performed N sequential database queries internally.

**Trade-off**: `updateMany` returns only a count, not individual results. We lose per-record error granularity. For the "mark reviewed" use case, this is acceptable — either all updates succeed or we report the count.

**Files changed**: `src/app/api/transactions/bulk/route.ts`

## D007: Test Strategy — Direct Route Handler Tests with Mocked Prisma

**Decision**: Import route handlers directly and call them with real `Request` objects. Mock only `@/lib/prisma` at the module boundary.

**Context**: Setting up MSW + JSDOM + React Testing Library for Next.js App Router is substantial setup work for an assessment. The bugs are structural — wrong endpoint, wrong Prisma method, wrong data flow — and can be verified by calling the route handlers with real Request objects.

**Alternatives**:
- Source pattern-matching (grep for `updateMany` in source): Brittle to refactoring, not behavior-driven, doesn't verify actual request/response contract
- Full integration tests with HTTP: More realistic but requires test DB, server startup, seed data
- E2E with Playwright: Gold standard but significant setup

**Trade-off**: Tests require the Next.js route module to be importable in a Vitest environment. Vitest config needs `@vitejs/plugin-react` and path aliases. Acceptable for an assessment.

**Files changed**: `src/__tests__/transactions.test.ts`, `vitest.config.ts`

## D008: Exponential Backoff Parameters

**Decision**: Base delay of 50ms, exponential backoff (50, 100, 200, 400ms), up to 3 retries (4 total attempts).

**Context**: External services fail transiently. Need enough retries to overcome random failures without adding excessive latency to the happy path.

**Math**:
- Inventory (40% fail): P(all 4 fail) = 0.4^4 = 2.56%
- Notification (25% fail): P(all 4 fail) = 0.25^4 = 0.39%
- Combined success: ~97%

**Alternatives**:
- Fixed delay: Simpler but doesn't handle thundering herd
- Jitter: Production should add random jitter to prevent correlated retries
- Circuit breaker: Would be appropriate if the services had sustained outages, not random transient failures

**Files changed**: `src/lib/workflow/executor.ts`
