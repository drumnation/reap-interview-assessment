# Security

## Authentication

This application uses [NextAuth.js](https://next-auth.js.org/) with a CredentialsProvider for demonstration purposes.

### Configuration

Set these environment variables in `.env`:

```
NEXTAUTH_SECRET=<random-secret>
NEXTAUTH_URL=http://localhost:3000
TEST_USERNAME=admin
TEST_PASSWORD=changeme
```

### Protected Routes

All `/api/cases/*`, `/api/transactions/*`, `/api/workflows/*`, `/transactions/*`, and `/workflows/*` routes require authentication via the NextAuth middleware.

The `/api/auth/*` routes are public (login/logout/session).

## PHI (Protected Health Information)

The following fields contain PHI under HIPAA:

- `Case.residentName` — Medicaid resident's full name
- `Case.facilityName` — Care facility name (can identify residents)
- `FinancialTransaction.description` — May contain identifying details
- `FinancialTransaction.amountInCents` — Financial data tied to a resident
- `FinancialTransaction.accountLastFour` — Partial account number

All API routes that return PHI require authentication and are scoped to the authenticated user's cases via `Case.ownerId`.

## Authorization (IDOR Protection)

Every API route that touches PHI scopes Prisma queries to:

```ts
where: { case: { ownerId: session.user.email } }
```

This prevents users from accessing cases or transactions that belong to other users, even if they know the resource ID.

## Audit Logging

All PHI access is logged to the `AuditLog` table:

| Field | Description |
|-------|-------------|
| userId | Authenticated user's email |
| action | LIST, READ, UPDATE, BULK_UPDATE |
| resourceType | Case, FinancialTransaction |
| resourceId | The resource ID(s) accessed |
| ipAddress | Client IP from X-Forwarded-For header |
| createdAt | Timestamp |

Query audit logs via Prisma Studio (`npm run db:studio`) or direct SQL.

## Security Headers

The following headers are set on all responses via `next.config.ts`:

- `Strict-Transport-Security` — Forces HTTPS
- `X-Frame-Options: DENY` — Prevents clickjacking
- `X-Content-Type-Options: nosniff` — Prevents MIME sniffing
- `Referrer-Policy: strict-origin-when-cross-origin` — Limits referrer leakage
- `Permissions-Policy` — Disables camera, microphone, geolocation

## Error Handling

All API error responses return generic messages (`"Internal server error"`) to prevent leaking Prisma errors, stack traces, or internal details to clients. Detailed errors are logged server-side only.

## Input Validation

- All API inputs are validated with Zod schemas
- `flagReason` is limited to 500 characters
- `reviewNote` is limited to 2000 characters
- Bulk update `ids` array requires at least 1 element
- Transaction category must be a valid enum value

## Production Requirements

This assessment uses simplified implementations. For production HIPAA compliance:

| Area | Current | Production Required |
|------|---------|-------------------|
| Auth provider | CredentialsProvider (test only) | SAML/OIDC with a real IdP (Okta, Azure AD) |
| Database | SQLite (no encryption at rest) | PostgreSQL with TDE or encrypted volumes |
| Secrets | `.env` file | AWS Secrets Manager, Vault, or similar |
| HTTPS | Header only (HSTS) | TLS termination at load balancer, cert management |
| Audit logs | Same database | Append-only log store (immutable) |
| Session | JWT (stateless) | Consider server-side sessions for revocation |
| Role-based access | Not implemented | Admin vs. case worker vs. read-only roles |
| Data retention | No policy | HIPAA requires defined retention and disposal |
| Backup encryption | Not implemented | Encrypted backups with key rotation |
