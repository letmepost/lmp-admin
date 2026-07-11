import "server-only";
import postgres from "postgres";

// Single cached postgres-js client. Reused across hot reloads in dev via a
// global so we don't exhaust connections. Every query runs inside a read-only
// transaction (see metrics.ts), so this dashboard cannot mutate production
// even if a query is written wrong.

const globalForDb = globalThis as unknown as { __lmpSql?: postgres.Sql };

// Lazily created so `next build` (which imports this module graph) never fails
// when DATABASE_URL is absent at build time — the client is only created on the
// first query, where the page's error boundary can surface a clean message.
export function getSql(): postgres.Sql {
  if (globalForDb.__lmpSql) return globalForDb.__lmpSql;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  const client = postgres(url, {
    max: 3,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 15,
  });
  globalForDb.__lmpSql = client;
  return client;
}
