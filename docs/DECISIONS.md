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

## D009: CredentialsProvider for Demo Authentication

**Decision**: Use NextAuth.js CredentialsProvider reading from environment variables, not a real IdP.

**Context**: The assessment needs authentication to demonstrate HIPAA awareness, but setting up SAML/OIDC with an external IdP is out of scope. CredentialsProvider with `TEST_USERNAME` / `TEST_PASSWORD` shows the pattern without infrastructure dependencies.

**Alternatives**:
- No auth: Fails HIPAA requirement for access control on PHI
- OAuth with GitHub/Google: Not appropriate for a Medicaid case management app — real users would use enterprise SSO
- Basic HTTP auth: No session management, no middleware integration

**Production requirement**: Replace with SAML/OIDC provider (Okta, Azure AD). The CredentialsProvider must not be used in production — it has no MFA, no password hashing, no account lockout.

**Files changed**: `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/middleware.ts`

## D010: Row-Level Access Control via Case.ownerId

**Decision**: Add `ownerId` field to Case model and scope every PHI query to `case: { ownerId: session.user.email }`.

**Context**: Without ownership scoping, any authenticated user can access any case's transactions by guessing IDs (IDOR vulnerability). This is a HIPAA violation — users must only see their assigned cases.

**Alternatives**:
- Role-based access only (no row-level): Insufficient — case workers should only see their cases, not all cases
- Separate tenant databases: Overkill for this scale
- Prisma middleware for automatic scoping: Cleaner but harder to audit — explicit scoping in each route makes the authorization check visible in code review

**Trade-off**: `ownerId` defaults to `"system"` for backward compatibility with existing seeded data. In production, this would be set to the creating user's ID. The `findUnique` calls were changed to `findFirst` to support the compound where clause (ownership + ID).

**Performance note**: Added index on `ownerId` to avoid full table scans on the ownership filter.

**Files changed**: `prisma/schema.prisma`, all PHI API routes

## D011: Audit Logging on PHI Access

**Decision**: Log every PHI access (LIST, READ, UPDATE, BULK_UPDATE) to an AuditLog table with userId, action, resourceType, resourceId, and client IP.

**Context**: HIPAA requires audit controls — a record of who accessed what PHI and when. This is non-negotiable for compliance.

**Alternatives**:
- Application logs only: Not queryable, not structured, gets mixed with debug output
- External audit service (Datadog, Splunk): Better for production, but adds external dependency
- Database triggers: Would capture all DB access but harder to correlate with user sessions

**Trade-off**: Audit logging adds a write to every PHI request. For this SQLite assessment app, the overhead is negligible. In production with PostgreSQL, the audit table should be append-only (no UPDATE/DELETE permissions) and potentially moved to a separate database to prevent tampering.

**Files changed**: `prisma/schema.prisma`, `src/lib/audit.ts`, all PHI API routes

## D012: Generic Error Responses

**Decision**: All API catch blocks return `{ error: "Internal server error" }` instead of exposing raw error messages.

**Context**: The original code returned messages that could leak Prisma error details or stack traces if the error object was serialized differently. HIPAA requires safeguarding system internals. OWASP Top 10 lists information disclosure as a risk.

**Alternatives**:
- Structured error codes (e.g., `ERR_TXN_NOT_FOUND`): Better UX but more work
- Error boundary middleware: Cleaner but Next.js App Router doesn't have route-level middleware for this

**Trade-off**: Generic errors make debugging harder for API consumers. Detailed errors are still logged server-side via `console.error("[Internal]", error)`.

**Files changed**: All API route files

## D013: Input Length Limits on Free-Text Fields

**Decision**: Cap `flagReason` at 500 characters and `reviewNote` at 2000 characters in the Zod schema.

**Context**: Unbounded string inputs can be used for denial-of-service (large payloads filling the database) or injection attacks. HIPAA requires data integrity controls.

**Alternatives**:
- Database-level constraints: Would catch issues at the DB layer but return cryptic Prisma errors
- No limits: Acceptable for a demo but bad practice for PHI data

**Files changed**: `src/app/api/transactions/[id]/route.ts`

## D014: Extract Domain Components for Storybook

**Decision**: Extract `TransactionRow`, `WorkflowStep`, and `WorkflowStats` from page components into standalone `src/components/ui/` files.

**Context**: The original page components (`transactions/page.tsx`, `workflows/page.tsx`) rendered everything inline — 650+ line files with no reusable pieces. Storybook requires importable components to document.

**Alternatives**:
- Story inline components (define in story file): Causes Vite dynamic import failures in Storybook v10 — the framework can't chunk-split inline definitions
- Test against the full page: Would require full app context (auth, routing, data fetching) just to see a badge variant

**Trade-off**: The extracted components duplicate some logic from the page components. The pages still render their own versions. In a production codebase, the pages would import the extracted components — but that refactor would change the existing code beyond what the assessment asked for.

**Files changed**: `src/components/ui/transaction-row.tsx`, `src/components/ui/workflow-step.tsx`, `src/components/ui/workflow-stats.tsx`

## D015: Storybook E2E Tests with Proof Chains

**Decision**: Write Playwright E2E tests against the static Storybook build, not just visual snapshots.

**Context**: Storybook alone proves "the component can render." It doesn't prove "the component renders the right content." The Storybook E2E tests navigate to each story iframe and assert specific text, DOM structure, and interaction behavior — the same proof chain system used for app E2E tests.

**Alternatives**:
- Visual regression (Chromatic): Better for catching unintended visual changes, but doesn't assert on content
- Storybook interaction tests only (play functions): Limited to component internals, can't verify what's visible to the user
- No Storybook tests: Leaves component documentation unverified

**Files changed**: `e2e/storybook.spec.ts`, `playwright.storybook.config.ts`, `docs/STORYBOOK-RESULTS.md`
