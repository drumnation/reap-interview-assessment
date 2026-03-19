# Architecture

## Data Model

### Case

| Field | Type | Notes |
|-------|------|-------|
| id | String (UUID) | Primary key |
| createdAt | DateTime | Auto-set |
| updatedAt | DateTime | Auto-updated |
| residentName | String | Medicaid resident |
| facilityName | String | Care facility |
| status | String | Default: `DRAFT`. Values: DRAFT, IN_PROGRESS, SUBMITTED, APPROVED, DENIED |

Relations: `Case` has many `FinancialTransaction` (cascade delete).

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

## API Routes

| Method | Path | Purpose | Input | Output |
|--------|------|---------|-------|--------|
| GET | `/api/cases` | List all cases | — | `Case[]` |
| GET | `/api/transactions?caseId=` | List transactions for a case | `caseId` query param (required) | `FinancialTransaction[]` |
| GET | `/api/transactions/:id` | Get single transaction | URL param `id` | `FinancialTransaction` |
| PATCH | `/api/transactions/:id` | Update single transaction | JSON body: `{ category?, isReviewed?, isFlagged?, flagReason?, reviewNote? }` | Updated `FinancialTransaction` |
| PATCH | `/api/transactions/bulk` | Bulk update transactions | JSON body: `{ ids: string[], updates: { category?, isReviewed?, isFlagged? } }` | `{ message, results }` |
| GET | `/api/transactions/stats?caseId=` | Aggregated stats for a case | `caseId` query param (required) | `{ total, reviewed, flagged, uncategorized, income, expenses, byCategory }` |
| GET | `/api/workflows` | List all workflow runs | — | `WorkflowRun[]` |
| POST | `/api/workflows` | Execute a new workflow | — | `WorkflowRun` |
| GET | `/api/workflows/:id` | Get specific workflow run | URL param `id` | `WorkflowRun` |
| POST | `/api/workflows/clear` | Clear all workflow history | — | `{ message }` |

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

Class that executes a `WorkflowDefinition` step-by-step in sequence. Each step receives the shared context and can merge data into it via `result.data`. On any step failure, the executor throws immediately and marks the workflow as `FAILED`.

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

## Known Bugs (Pre-Fix)

### Challenge 1: Transaction Review

1. **Bulk review fires N individual requests** (`src/app/transactions/page.tsx:190-208`): `handleBulkMarkReviewed` creates `Promise.all` of individual PATCH requests to `/api/transactions/:id` instead of using the existing `/api/transactions/bulk` endpoint.

2. **Bulk API endpoint loops instead of batch** (`src/app/api/transactions/bulk/route.ts:20-31`): The bulk endpoint iterates IDs with individual `prisma.update()` calls in a serial for-loop. Should use `prisma.financialTransaction.updateMany()`.

3. **Full refetch on every action** (`src/app/transactions/page.tsx:218-219, 231-233`): Every checkbox toggle and category change triggers a full `fetchTransactions()` reload of all ~1500 records.

4. **No pagination** (`src/app/api/transactions/route.ts:16-23`): `GET /api/transactions` returns all records with no limit/offset/cursor.

### Challenge 2: Order Processing Workflow

5. **Payment step inverted logic** (`src/lib/workflow/steps/order-steps.ts:82-95`): The `if (!paymentResult.success)` condition is backwards. Since the payment gateway always returns `success: true`, the code falls through to the failure branch every time, causing 0% workflow success rate past the payment step.

6. **No retry on transient failures** (`src/lib/workflow/executor.ts:27-29`): The executor has no retry mechanism. Steps that fail due to transient errors (inventory ~40%, notification ~25%) immediately kill the entire workflow.
