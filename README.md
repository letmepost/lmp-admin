# letmepost-admin

Private, read-only internal metrics dashboard for letmepost. Reads the
**production Postgres directly** and shows signups, orgs, posts, publish
success rate, active sessions, posts-per-platform, and connected-accounts
health. Next.js (App Router) + Tailwind, gated by a single access key.

## Safety

- Every query runs inside a `SET TRANSACTION READ ONLY` transaction, so the
  dashboard physically cannot write to production, even with a bad query.
- The whole app is behind `DASHBOARD_AUTH_KEY`. The raw key never leaves the
  server; the auth cookie only holds its SHA-256.
- Recommended: give it a **read-only** `DATABASE_URL` (a dedicated Postgres
  role with only `SELECT`, or a Neon read replica).

## Local dev

```bash
pnpm install
cp .env.example .env.local     # fill in DATABASE_URL + DASHBOARD_AUTH_KEY
pnpm check                     # optional: prints a KPI snapshot + verifies the read-only net
pnpm dev                       # http://localhost:3000  -> /login
```

## Deploy (Vercel)

1. Push to a **private** GitHub repo.
2. Import it in Vercel (framework auto-detects as Next.js).
3. Set env vars: `DATABASE_URL`, `DASHBOARD_AUTH_KEY`.
4. Deploy. Everything sits behind the key at `/login`.

## Notes

- "Active users" is session-based (better-auth `session`). Posts carry no
  `user_id`, so per-user posting activity isn't derivable.
- Posts whose platform account was later deleted show as "unattributed".
- Metrics are grounded in the letmepost DB schema; success/failure comes from
  `posts.status`, platform from `posts.account_id -> platform_accounts.platform`.
