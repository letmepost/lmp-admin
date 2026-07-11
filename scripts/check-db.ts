// Standalone DB smoke test. Run: `pnpm check` (needs .env.local with DATABASE_URL).
// Prints a KPI snapshot and confirms the read-only safety net actually blocks writes.
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config();

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (put it in .env.local)");

  const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 15 });

  try {
    const [snapshot] = await sql`
      SELECT
        (SELECT count(*) FROM "user") AS users,
        (SELECT count(*) FROM organization) AS orgs,
        (SELECT count(*) FROM platform_accounts) AS accounts,
        (SELECT count(*) FROM posts) AS posts,
        (SELECT count(*) FROM posts WHERE status = 'published') AS published,
        (SELECT count(*) FROM posts WHERE status IN ('failed','rejected')) AS failed,
        (SELECT count(*) FROM session WHERE expires_at > now()) AS live_sessions
    `;
    console.log("\nKPI snapshot:");
    console.table(snapshot);

    const platforms = await sql`
      SELECT platform, count(*) AS accounts
      FROM platform_accounts GROUP BY platform ORDER BY accounts DESC
    `;
    console.log("Accounts per platform:");
    console.table(platforms);

    process.stdout.write("Read-only safety net: ");
    try {
      await sql.begin(async (tx) => {
        await tx`SET TRANSACTION READ ONLY`;
        await tx`CREATE TEMP TABLE _ro_probe (x int)`;
      });
      console.log("FAIL — a write succeeded inside a read-only transaction!");
    } catch (err) {
      const msg = err instanceof Error ? err.message.split("\n")[0] : String(err);
      console.log(`OK — write blocked (${msg})`);
    }
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
