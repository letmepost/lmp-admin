import "server-only";
import { getSql } from "@/lib/db";

// All product metrics, computed in ONE read-only transaction. `SET TRANSACTION
// READ ONLY` is the hard safety net: any accidental write throws instead of
// touching production. Queries run sequentially on the reserved connection.
//
// Schema notes (from letmepost.dev/apps/api/src/db/schema):
//   - "user" is a reserved word -> always quoted.
//   - No soft-deletes anywhere.
//   - posts.status drives success/failure. Platform for a post comes from
//     posts.account_id -> platform_accounts.platform (account_id is nullable
//     ON DELETE SET NULL, so deleted-account posts are "unattributed").
//   - posts have no user_id -> "active users" is session-based only.

const num = (v: unknown): number => (v == null ? 0 : Number(v));

export type Kpis = {
  totalUsers: number;
  newUsersToday: number;
  newUsers7d: number;
  newUsers30d: number;
  totalOrgs: number;
  totalAccounts: number;
  totalPosts: number;
  posts7d: number;
  published: number;
  failed: number;
  successRate: number | null;
  activeUsers7d: number;
  liveSessions: number;
};

export type DailyPoint = { day: string; count: number };
export type PostsDailyPoint = { day: string; created: number; published: number };
export type NameCount = { name: string; count: number };
export type StatusCount = { status: string; count: number };
export type PostsPerPlatform = { platform: string; count: number };
export type AccountsPerPlatform = { platform: string; total: number; expired: number };
export type PlanCount = { tier: string; count: number };
export type MonthlyUsage = { period: string; count: number };

export type DashboardData = {
  kpis: Kpis;
  signupsDaily: DailyPoint[];
  postsDaily: PostsDailyPoint[];
  statusBreakdown: StatusCount[];
  postsPerPlatform: PostsPerPlatform[];
  unattributedPosts: number;
  accountsPerPlatform: AccountsPerPlatform[];
  planDistribution: PlanCount[];
  topOrgs: NameCount[];
  topErrors: NameCount[];
  signupAttribution: NameCount[];
  monthlyUsage: MonthlyUsage[];
};

type Row = Record<string, string | number | null>;

export async function getDashboardData(): Promise<DashboardData> {
  return getSql().begin(async (tx) => {
    await tx`SET TRANSACTION READ ONLY`;

    const kpi = (
      await tx<Row[]>`
        SELECT
          (SELECT count(*) FROM "user") AS total_users,
          (SELECT count(*) FROM "user" WHERE created_at >= date_trunc('day', now())) AS new_users_today,
          (SELECT count(*) FROM "user" WHERE created_at >= now() - interval '7 days') AS new_users_7d,
          (SELECT count(*) FROM "user" WHERE created_at >= now() - interval '30 days') AS new_users_30d,
          (SELECT count(*) FROM organization) AS total_orgs,
          (SELECT count(*) FROM platform_accounts) AS total_accounts,
          (SELECT count(*) FROM posts) AS total_posts,
          (SELECT count(*) FROM posts WHERE created_at >= now() - interval '7 days') AS posts_7d,
          (SELECT count(*) FROM posts WHERE status = 'published') AS published,
          (SELECT count(*) FROM posts WHERE status IN ('failed','rejected')) AS failed,
          (SELECT count(DISTINCT user_id) FROM session WHERE updated_at >= now() - interval '7 days') AS active_users_7d,
          (SELECT count(*) FROM session WHERE expires_at > now()) AS live_sessions
      `
    )[0];

    const published = num(kpi.published);
    const failed = num(kpi.failed);
    const terminal = published + failed;

    const kpis: Kpis = {
      totalUsers: num(kpi.total_users),
      newUsersToday: num(kpi.new_users_today),
      newUsers7d: num(kpi.new_users_7d),
      newUsers30d: num(kpi.new_users_30d),
      totalOrgs: num(kpi.total_orgs),
      totalAccounts: num(kpi.total_accounts),
      totalPosts: num(kpi.total_posts),
      posts7d: num(kpi.posts_7d),
      published,
      failed,
      successRate: terminal > 0 ? published / terminal : null,
      activeUsers7d: num(kpi.active_users_7d),
      liveSessions: num(kpi.live_sessions),
    };

    const signups = await tx<Row[]>`
      WITH days AS (
        SELECT d::date AS day
        FROM generate_series(date_trunc('day', now()) - interval '29 days', date_trunc('day', now()), interval '1 day') d
      ),
      s AS (
        SELECT created_at::date AS day, count(*) AS n
        FROM "user" WHERE created_at >= now() - interval '30 days' GROUP BY 1
      )
      SELECT days.day::text AS day, coalesce(s.n, 0) AS count
      FROM days LEFT JOIN s ON s.day = days.day ORDER BY days.day
    `;

    const posts = await tx<Row[]>`
      WITH days AS (
        SELECT d::date AS day
        FROM generate_series(date_trunc('day', now()) - interval '29 days', date_trunc('day', now()), interval '1 day') d
      ),
      created AS (
        SELECT created_at::date AS day, count(*) AS n
        FROM posts WHERE created_at >= now() - interval '30 days' GROUP BY 1
      ),
      pub AS (
        SELECT published_at::date AS day, count(*) AS n
        FROM posts WHERE status = 'published' AND published_at >= now() - interval '30 days' GROUP BY 1
      )
      SELECT days.day::text AS day, coalesce(created.n, 0) AS created, coalesce(pub.n, 0) AS published
      FROM days
      LEFT JOIN created ON created.day = days.day
      LEFT JOIN pub ON pub.day = days.day
      ORDER BY days.day
    `;

    const statusBreakdown = await tx<Row[]>`
      SELECT status, count(*) AS count FROM posts GROUP BY status ORDER BY count DESC
    `;

    const postsPerPlatform = await tx<Row[]>`
      SELECT pa.platform, count(*) AS count
      FROM posts p JOIN platform_accounts pa ON pa.id = p.account_id
      GROUP BY pa.platform ORDER BY count DESC
    `;

    const unattributed = (
      await tx<Row[]>`SELECT count(*) AS count FROM posts WHERE account_id IS NULL`
    )[0];

    const accountsPerPlatform = await tx<Row[]>`
      SELECT platform,
        count(*) AS total,
        count(*) FILTER (WHERE token_expires_at IS NOT NULL AND token_expires_at < now()) AS expired
      FROM platform_accounts GROUP BY platform ORDER BY total DESC
    `;

    const planDistribution = await tx<Row[]>`
      SELECT tier, count(*) AS count FROM billing_subscriptions GROUP BY tier ORDER BY count DESC
    `;

    const topOrgs = await tx<Row[]>`
      SELECT o.name, count(p.id) AS count
      FROM organization o JOIN posts p ON p.organization_id = o.id
      GROUP BY o.id, o.name ORDER BY count DESC LIMIT 10
    `;

    const topErrors = await tx<Row[]>`
      SELECT coalesce(error_code, '(unknown)') AS name, count(*) AS count
      FROM post_attempts WHERE succeeded = false
      GROUP BY error_code ORDER BY count DESC LIMIT 10
    `;

    const signupAttribution = await tx<Row[]>`
      SELECT coalesce(signup_source, '(none)') AS name, count(*) AS count
      FROM "user" GROUP BY signup_source ORDER BY count DESC LIMIT 10
    `;

    const monthlyUsage = await tx<Row[]>`
      SELECT period, sum(posts_count) AS count
      FROM billing_usage GROUP BY period ORDER BY period DESC LIMIT 6
    `;

    return {
      kpis,
      signupsDaily: signups.map((r) => ({ day: String(r.day), count: num(r.count) })),
      postsDaily: posts.map((r) => ({
        day: String(r.day),
        created: num(r.created),
        published: num(r.published),
      })),
      statusBreakdown: statusBreakdown.map((r) => ({
        status: String(r.status),
        count: num(r.count),
      })),
      postsPerPlatform: postsPerPlatform.map((r) => ({
        platform: String(r.platform),
        count: num(r.count),
      })),
      unattributedPosts: num(unattributed.count),
      accountsPerPlatform: accountsPerPlatform.map((r) => ({
        platform: String(r.platform),
        total: num(r.total),
        expired: num(r.expired),
      })),
      planDistribution: planDistribution.map((r) => ({
        tier: String(r.tier),
        count: num(r.count),
      })),
      topOrgs: topOrgs.map((r) => ({ name: String(r.name ?? "(unnamed)"), count: num(r.count) })),
      topErrors: topErrors.map((r) => ({ name: String(r.name), count: num(r.count) })),
      signupAttribution: signupAttribution.map((r) => ({
        name: String(r.name),
        count: num(r.count),
      })),
      monthlyUsage: monthlyUsage
        .map((r) => ({ period: String(r.period), count: num(r.count) }))
        .reverse(),
    };
  });
}
