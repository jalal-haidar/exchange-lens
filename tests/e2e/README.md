# Exchange Lens — E2E Testing

Playwright E2E tests for the Exchange Lens currency exchange management app.

## Setup

Install the pinned runner:

```powershell
pnpm add -Dw --save-exact @playwright/test@1.61.1
```

The configuration uses the locally installed Google Chrome browser, so a
Playwright-managed browser download is not required.

## Environment Variables

Set these values in `.env.local` (already configured for dev):

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
TEST_USER_EMAIL=qatester@gmail.com
TEST_USER_PASSWORD=tester123
NEXT_PUBLIC_HUB_URL=http://localhost:3000
NEXT_PUBLIC_EXCHANGE_URL=http://localhost:3005
```

## Running Tests

```powershell
# Run all E2E tests
pnpm test:e2e

# Run a specific test file
pnpm test:e2e -- tests/e2e/auth.spec.mjs

# Run tests with UI mode (interactive)
pnpm test:e2e:ui
```

## Prerequisites

- Hub must be running on port 3000 (`pnpm dev:hub` in `../lifelens`)
- Exchange Lens will be auto-started on port 3005 by the Playwright config
- Test user must exist in Supabase dev project

## Test Files

| File | Tests | Coverage |
|------|-------|----------|
| `auth.spec.mjs` | 6 | Auth redirect, bridge login, API auth, root redirect |
| `dashboard.spec.mjs` | 10 | Stats cards, quick actions, nav links, theme toggle |
| `customers.spec.mjs` | 10 | Create, search, view, edit, delete, pagination, validation |
| `transactions.spec.mjs` | 10 | CRUD via API, filters, search, type pre-fill, validation |
| `rates.spec.mjs` | 4 | Table load, editing, save/discard |
| `expenses.spec.mjs` | 5 | Add, list, validation, cancel |
| `reports.spec.mjs` | 4 | P&L, daily summary, date picker |

**Total: 49 tests**

## Test Data

- All test data is prefixed with `e2e-{timestamp}-{random}` for uniqueness
- Cleanup runs automatically in `afterAll` via Supabase service-role client
- Tests are serial (1 worker) to avoid race conditions on shared DB

## Artifacts

Test artifacts (traces, screenshots) are written to:
```
C:\tmp\exchange-lens-playwright-results
```
