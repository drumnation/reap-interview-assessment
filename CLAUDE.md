# CLAUDE.md — REAP Interview Assessment

## Stack

Next.js 16 App Router · SQLite + Prisma · Tailwind + Radix UI · NextAuth

## Data Models

- `Case` → id, residentName, facilityName, status, ownerId
- `FinancialTransaction` → id, date, description, amountInCents, category, isReviewed, isFlagged, caseId
- `AuditLog` → id, userId, action, resourceType, resourceId, ipAddress

## API Routes (all require auth, PHI routes scoped by ownerId)

- `GET /api/cases` — list user's cases
- `GET /api/transactions?caseId=&limit=&cursor=` — paginated transactions
- `PATCH /api/transactions/[id]` — update single transaction
- `PATCH /api/transactions/bulk` — bulk update (ids[], updates{})
- `GET /api/transactions/stats?caseId=` — aggregated stats (DB-side)
- `GET/POST /api/workflows` — workflow runs
- `POST /api/workflows/clear` — clear history (auth required)

## CLI Tool — Agent-Accessible Backend

The CLI provides direct Prisma access to all backend operations. No running server needed.
All output is structured JSON with `{ ok: true, data }` or `{ ok: false, error }`.
Exit code 0 on success, 1 on error.

### Usage

```bash
pnpm cli <command> [subcommand] [args]
```

### Commands

```bash
# Cases
pnpm cli cases list                          # List all cases
pnpm cli cases get <id>                      # Get case by ID

# Transactions
pnpm cli transactions list --case-id <id>    # List transactions (default limit 100)
pnpm cli transactions list --case-id <id> --limit 50
pnpm cli transactions get <id>               # Get single transaction
pnpm cli transactions update <id> --category MEDICAL --reviewed true
pnpm cli transactions update <id> --flagged true --flag-reason "Suspicious"
pnpm cli transactions bulk-review <id1> <id2> <id3>  # Mark multiple as reviewed
pnpm cli transactions stats --case-id <id>   # Aggregated stats

# Workflows
pnpm cli workflow run                        # Execute order processing workflow
pnpm cli workflow list                       # List all runs
pnpm cli workflow get <id>                   # Get specific run with step details
pnpm cli workflow clear                      # Clear all workflow history

# Help
pnpm cli help                                # Show all commands
```

### Agent Integration Notes

- Output is always JSON — pipe through `jq` for field extraction
- Transaction IDs from `cases list` → use as `--case-id` for transactions
- Workflow runs are in-memory only — lost on process restart
- The CLI bypasses HTTP auth (direct Prisma access) — use for dev/testing only
- Stats use DB-side aggregation (count/aggregate/groupBy), not JS

### Example Agent Workflow

```bash
# 1. Find cases
CASE_ID=$(pnpm cli cases list | jq -r '.data[0].id')

# 2. Get transaction stats
pnpm cli transactions stats --case-id $CASE_ID

# 3. List unreviewed transactions
pnpm cli transactions list --case-id $CASE_ID | jq '.data[] | select(.isReviewed == false) | .id'

# 4. Bulk review them
pnpm cli transactions bulk-review id1 id2 id3

# 5. Run and verify a workflow
pnpm cli workflow run | jq '.data.status'
```

## Testing

```bash
pnpm test           # Unit tests (30 tests, ~10s)
pnpm test:e2e       # E2E tests (10 tests, ~26s, requires pnpm db:reset first)
pnpm db:reset       # Reset + reseed database
```

## Setup

```bash
npm run setup       # Install + DB setup + seed
npm run dev         # Start dev server
npm run db:studio   # Prisma Studio
npm run db:reset    # Reset + reseed DB
```
