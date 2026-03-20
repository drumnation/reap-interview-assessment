# Architecture

## Data Model

### Case

| Field | Type | Notes |
|-------|------|-------|
| id | String (UUID) | Primary key |
| createdAt | DateTime | Auto-set |
| updatedAt | DateTime | Auto-updated |
| residentName | String | Medicaid resident (PHI) |
| facilityName | String | Care facility (PHI) |
| status | String | Default: `DRAFT`. Values: DRAFT, IN_PROGRESS, SUBMITTED, APPROVED, DENIED |
| ownerId | String | Default: `system`. Used for row-level access control (IDOR prevention) |

Relations: `Case` has many `FinancialTransaction` (cascade delete).
Indexes: ownerId.

### FinancialTransaction

| Field | Type | Notes |
|-------|------|-------|
| id | String (UUID) | Primary key |
| createdAt | DateTime | Auto-set |
| updatedAt | DateTime | Auto-updated |
| date | DateTime | Transaction date |
| description | String | |
| amountInCents | Int | Positive = income, negative = expense |
| category | String | Default: `UNCATEGORIZED` |
| isReviewed | Boolean | Default: false |
| isFlagged | Boolean | Default: false |
| flagReason | String? | Nullable |
| reviewNote | String? | Nullable |
| accountLastFour | String? | Nullable |
| caseId | String | FK to Case |

**Indexes**: caseId, date, category, isReviewed, isFlagged

**Category enum values** (string, not DB enum):
- Income: SOCIAL_SECURITY, SSI, PENSION, VETERANS_BENEFITS, INTEREST_DIVIDENDS
- Assets: HEALTH_INSURANCE, LIFE_INSURANCE, UTILITIES, VEHICLE_EXPENSES
- Transfers: INTERNAL_TRANSFER, EXTERNAL_TRANSFER, ATM_WITHDRAWAL, CHECK, DEPOSIT
- Other: GROCERIES, MEDICAL, ENTERTAINMENT, OTHER, UNCATEGORIZED

### AuditLog

| Field | Type | Notes |
|-------|------|-------|
| id | String (UUID) | Primary key |
| createdAt | DateTime | Auto-set |
| userId | String | Authenticated user's email |
| action | String | LIST, READ, UPDATE, BULK_UPDATE |
| resourceType | String | Case, FinancialTransaction |
| resourceId | String | The resource ID(s) accessed |
| ipAddress | String? | Client IP from X-Forwarded-For |

Indexes: userId, (resourceType + resourceId).

## Authentication and Authorization

### Authentication (`src/lib/auth.ts`, `src/middleware.ts`)

NextAuth.js with CredentialsProvider (demo only). JWT session strategy. Middleware protects all `/api/cases/*`, `/api/transactions/*`, `/api/workflows/*`, `/transactions/*`, `/workflows/*` routes.

### Authorization (IDOR Prevention)

Every API route that returns PHI calls `getServerSession(authOptions)` and scopes Prisma queries to `case: { ownerId: session.user.email }`. This prevents users from accessing cases belonging to other users even if they know the resource ID.

### Audit Logging (`src/lib/audit.ts`)

`logAccess(request, session, action, resourceType, resourceId)` writes to the AuditLog table after every PHI access. Captures the client IP from `X-Forwarded-For`.

## API Routes

All routes below require authentication (enforced by middleware). PHI routes also enforce ownership scoping.

| Method | Path | Auth | IDOR | Audit | Purpose |
|--------|------|------|------|-------|---------|
| GET/POST | `/api/auth/*` | Public | — | — | NextAuth login/logout/session |
| GET | `/api/cases` | Yes | ownerId | Yes | List user's cases |
| GET | `/api/transactions?caseId=` | Yes | ownerId | Yes | List transactions (paginated) |
| GET | `/api/transactions/:id` | Yes | ownerId | Yes | Get single transaction |
| PATCH | `/api/transactions/:id` | Yes | ownerId | Yes | Update transaction |
| PATCH | `/api/transactions/bulk` | Yes | ownerId | Yes | Bulk update transactions |
| GET | `/api/transactions/stats?caseId=` | Yes | ownerId | — | Aggregated stats |
| GET | `/api/workflows` | Yes | — | — | List workflow runs |
| POST | `/api/workflows` | Yes | — | — | Execute workflow |
| GET | `/api/workflows/:id` | Yes | — | — | Get workflow run |
| POST | `/api/workflows/clear` | Yes | — | — | Clear workflow history |

## Workflow Engine

### Core Types (`src/lib/workflow/types.ts`)

- **WorkflowStatus**: `PENDING | RUNNING | COMPLETED | FAILED`
- **StepStatus**: `PENDING | RUNNING | COMPLETED | FAILED | SKIPPED`
- **StepResult**: `{ success: boolean, data?: Record<string, unknown>, error?: string }`
- **StepDefinition**: `{ key: string, name: string, execute: (context) => Promise<StepResult> }`
- **WorkflowDefinition**: `{ name: string, steps: StepDefinition[] }`
- **StepLog**: Runtime step execution log with status, timing, result, error
- **WorkflowRun**: Full workflow execution record with id, status, context, steps[], timing

### WorkflowExecutor (`src/lib/workflow/executor.ts`)

Class that executes a `WorkflowDefinition` step-by-step in sequence. Each step receives the shared context and can merge data into it via `result.data`. Steps marked `retryable: true` are wrapped in `withRetry` (up to 3 retries with exponential backoff). On final failure, the executor marks the workflow as `FAILED`.

### WorkflowStore (`src/lib/workflow/store.ts`)

In-memory `Map<string, WorkflowRun>` singleton. Not persisted to disk or database. Lost on restart.

### Order Workflow (`src/lib/workflow/workflows/order-workflow.ts`)

5 sequential steps:
1. **Validate Order** — Checks orderId, customerId, items, totalAmount
2. **Check Inventory** — Calls simulated external service (~40% transient failure rate)
3. **Process Payment** — Calls simulated payment gateway (always returns success)
4. **Create Shipment** — Creates shipment record (requires paymentId in context)
5. **Send Notification** — Calls simulated notification service (~25% transient failure rate)

### Step Implementations (`src/lib/workflow/steps/order-steps.ts`)

Each step is a standalone async function. Three simulator functions mock external services:
- `simulateExternalInventoryService` — 40% random failure (timeout, rate limit, etc.)
- `simulatePaymentGateway` — Always returns `{ success: true, transactionId: ... }`
- `simulateNotificationService` — 25% random failure (email/SMS unavailable)

## Component Tree

```
app/
  layout.tsx (RootLayout)
  page.tsx (HomePage — links to challenges)
  transactions/
    page.tsx (TransactionsPage — full CRUD UI)
      Case selector (Select)
      Stats cards (4x Card)
      Income/Expense summary (2x Card)
      Filters (Search, Category Select, Status Tabs)
      Actions (Bulk Review Button, Export CSV)
      Transaction Table (Checkbox, Date, Description, Amount, Category Select, Status Badge, Review Button)
  workflows/
    page.tsx (WorkflowDashboard)
      Run controls (single run, batch of 5, clear history)
      Stats summary
      History list with expandable step details
```

UI primitives in `src/components/ui/`: Badge, Button, Card, Checkbox, Input, Progress, Select, Tabs — all Radix-based, shadcn-style.

Extracted domain components in `src/components/ui/`:
- `TransactionRow` — single transaction table row with review toggle, category badge, flag indicator
- `WorkflowStep` — single workflow step with status icon, duration, error display
- `WorkflowStats` — stats card grid (total, completed, failed, success rate)

## Storybook

Component documentation at `pnpm storybook` (port 6006).

| Story | Component | What it documents |
|-------|-----------|-------------------|
| Badge/AllVariants | Badge | All 6 variants with transaction domain labels |
| TransactionRow/* | TransactionRow | Default, Reviewed, Flagged, FlaggedAndReviewed states |
| WorkflowStep/* | WorkflowStep | All 5 step statuses (Completed, Failed, Running, Pending, Skipped) |
| WorkflowSuccessRate/* | WorkflowStats | Before/after comparison (0% → 90% success rate) |

Storybook E2E tests verify all stories render with correct content. Report: `docs/STORYBOOK-RESULTS.md`.

## Testing Strategy

| Layer | Command | Count | What it tests |
|-------|---------|-------|---------------|
| Unit | `pnpm test` | 44 | API routes (mocked Prisma), workflow steps, CLI commands |
| E2E (app) | `pnpm test:e2e` | 10 | Bug fixes work in the real app with auth + network evidence |
| E2E (storybook) | `pnpm test:storybook` | 7 | Components render correctly in isolation |
| CLI | `pnpm cli` | — | Agent-accessible backend operations |

## Security Architecture

### Request Flow

```
Client → Middleware (auth check) → Route Handler → getServerSession → IDOR scope → Prisma → Audit Log
```

### Security Headers (next.config.ts)

All responses include: HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, strict Referrer-Policy, Permissions-Policy (camera/mic/geo disabled).

### Error Handling

All API catch blocks return `{ error: "Internal server error" }` with status 500. Raw errors are logged server-side only (`console.error("[Internal]", error)`) and never exposed to clients.

### Input Validation

- All inputs validated with Zod schemas
- `flagReason` max 500 chars, `reviewNote` max 2000 chars
- Bulk `ids` array requires min 1 element
- Category must be a valid enum value

## Known Bugs (Pre-Fix)

### Challenge 1: Transaction Review

1. **Bulk review fires N individual requests** (`src/app/transactions/page.tsx:190-208`): `handleBulkMarkReviewed` creates `Promise.all` of individual PATCH requests to `/api/transactions/:id` instead of using the existing `/api/transactions/bulk` endpoint.

2. **Bulk API endpoint loops instead of batch** (`src/app/api/transactions/bulk/route.ts:20-31`): The bulk endpoint iterates IDs with individual `prisma.update()` calls in a serial for-loop. Should use `prisma.financialTransaction.updateMany()`.

3. **Full refetch on every action** (`src/app/transactions/page.tsx:218-219, 231-233`): Every checkbox toggle and category change triggers a full `fetchTransactions()` reload of all ~1500 records.

4. **No pagination** (`src/app/api/transactions/route.ts:16-23`): `GET /api/transactions` returns all records with no limit/offset/cursor.

### Challenge 2: Order Processing Workflow

5. **Payment step inverted logic** (`src/lib/workflow/steps/order-steps.ts:82-95`): The `if (!paymentResult.success)` condition is backwards. Since the payment gateway always returns `success: true`, the code falls through to the failure branch every time, causing 0% workflow success rate past the payment step.

6. **No retry on transient failures** (`src/lib/workflow/executor.ts:27-29`): The executor has no retry mechanism. Steps that fail due to transient errors (inventory ~40%, notification ~25%) immediately kill the entire workflow.
