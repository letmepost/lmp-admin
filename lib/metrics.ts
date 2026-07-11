import "server-only";
import { readonly } from "@/lib/db";
import type { Range } from "@/lib/range";

// All product metrics + entity detail queries. Every function runs inside a
// single read-only transaction (see lib/db `readonly`), and issues its
// independent queries concurrently via Promise.all. Because they share one
// reserved connection, postgres-js pipelines them — ~1 network round trip for
// the whole batch instead of one per query, while the transaction keeps them
// read-only and consistent.
//
// Dashboard "flow" metrics are scoped to the date range; "stock" totals are
// cumulative.
//
// Schema notes: "user" is reserved (quoted). No soft-deletes. posts.status
// drives success/failure. Platform for a post = posts.account_id ->
// platform_accounts.platform (nullable ON DELETE SET NULL -> "unattributed").
// posts have no user_id, so activity is org-grained; "active users" is
// session-based.

type Row = Record<string, unknown>;
const num = (v: unknown): number => (v == null ? 0 : Number(v));
const str = (v: unknown): string => (v == null ? "" : String(v));
const strn = (v: unknown): string | null => (v == null ? null : String(v));
const bool = (v: unknown): boolean => v === true || v === "t" || v === "true";

/* ------------------------------- types ------------------------------- */

export type Kpis = {
  totalUsers: number;
  totalOrgs: number;
  totalAccounts: number;
  liveSessions: number;
  newUsers: number;
  postsCreated: number;
  published: number;
  failed: number;
  successRate: number | null;
  activeUsers: number;
};

export type DailyPoint = { day: string; count: number };
export type PostsDailyPoint = { day: string; created: number; published: number };
export type NameCount = { name: string; count: number };
export type OrgCount = { id: string; name: string; count: number };
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
  topOrgs: OrgCount[];
  topErrors: NameCount[];
  signupAttribution: NameCount[];
  monthlyUsage: MonthlyUsage[];
};

/* ----------------------------- dashboard ----------------------------- */

export async function getDashboardData(range: Range): Promise<DashboardData> {
  const { from, to, bucket, step } = range;

  return readonly(async (tx) => {
    const [
      kpiRows,
      signups,
      posts,
      statusBreakdown,
      postsPerPlatform,
      unattributedRows,
      accountsPerPlatform,
      planDistribution,
      topOrgs,
      topErrors,
      signupAttribution,
      monthlyUsage,
    ] = await Promise.all([
      tx<Row[]>`
        SELECT
          (SELECT count(*) FROM "user") AS total_users,
          (SELECT count(*) FROM organization) AS total_orgs,
          (SELECT count(*) FROM platform_accounts) AS total_accounts,
          (SELECT count(*) FROM session WHERE expires_at > now()) AS live_sessions,
          (SELECT count(*) FROM "user" WHERE created_at >= ${from} AND created_at <= ${to}) AS new_users,
          (SELECT count(*) FROM posts WHERE created_at >= ${from} AND created_at <= ${to}) AS posts_created,
          (SELECT count(*) FROM posts WHERE status = 'published' AND created_at >= ${from} AND created_at <= ${to}) AS published,
          (SELECT count(*) FROM posts WHERE status IN ('failed','rejected') AND created_at >= ${from} AND created_at <= ${to}) AS failed,
          (SELECT count(DISTINCT user_id) FROM session WHERE updated_at >= ${from} AND updated_at <= ${to}) AS active_users
      `,
      tx<Row[]>`
        WITH b AS (
          SELECT gs AS bucket_start
          FROM generate_series(
            date_trunc(${bucket}, ${from}::timestamptz),
            date_trunc(${bucket}, ${to}::timestamptz),
            ${step}::interval
          ) gs
        ),
        s AS (
          SELECT date_trunc(${bucket}, created_at) AS bucket_start, count(*) AS n
          FROM "user" WHERE created_at >= ${from} AND created_at <= ${to} GROUP BY 1
        )
        SELECT b.bucket_start::date::text AS day, coalesce(s.n, 0) AS count
        FROM b LEFT JOIN s ON s.bucket_start = b.bucket_start ORDER BY b.bucket_start
      `,
      tx<Row[]>`
        WITH b AS (
          SELECT gs AS bucket_start
          FROM generate_series(
            date_trunc(${bucket}, ${from}::timestamptz),
            date_trunc(${bucket}, ${to}::timestamptz),
            ${step}::interval
          ) gs
        ),
        c AS (
          SELECT date_trunc(${bucket}, created_at) AS bucket_start, count(*) AS n
          FROM posts WHERE created_at >= ${from} AND created_at <= ${to} GROUP BY 1
        ),
        p AS (
          SELECT date_trunc(${bucket}, published_at) AS bucket_start, count(*) AS n
          FROM posts WHERE status = 'published' AND published_at >= ${from} AND published_at <= ${to} GROUP BY 1
        )
        SELECT b.bucket_start::date::text AS day, coalesce(c.n, 0) AS created, coalesce(p.n, 0) AS published
        FROM b
        LEFT JOIN c ON c.bucket_start = b.bucket_start
        LEFT JOIN p ON p.bucket_start = b.bucket_start
        ORDER BY b.bucket_start
      `,
      tx<Row[]>`
        SELECT status, count(*) AS count FROM posts
        WHERE created_at >= ${from} AND created_at <= ${to}
        GROUP BY status ORDER BY count DESC
      `,
      tx<Row[]>`
        SELECT pa.platform, count(*) AS count
        FROM posts p JOIN platform_accounts pa ON pa.id = p.account_id
        WHERE p.created_at >= ${from} AND p.created_at <= ${to}
        GROUP BY pa.platform ORDER BY count DESC
      `,
      tx<Row[]>`
        SELECT count(*) AS count FROM posts
        WHERE account_id IS NULL AND created_at >= ${from} AND created_at <= ${to}
      `,
      tx<Row[]>`
        SELECT platform,
          count(*) AS total,
          count(*) FILTER (WHERE token_expires_at IS NOT NULL AND token_expires_at < now()) AS expired
        FROM platform_accounts GROUP BY platform ORDER BY total DESC
      `,
      tx<Row[]>`
        SELECT tier, count(*) AS count FROM billing_subscriptions GROUP BY tier ORDER BY count DESC
      `,
      tx<Row[]>`
        SELECT o.id, o.name, count(p.id) AS count
        FROM organization o
        JOIN posts p ON p.organization_id = o.id AND p.created_at >= ${from} AND p.created_at <= ${to}
        GROUP BY o.id, o.name ORDER BY count DESC LIMIT 10
      `,
      tx<Row[]>`
        SELECT coalesce(error_code, '(unknown)') AS name, count(*) AS count
        FROM post_attempts
        WHERE succeeded = false AND started_at >= ${from} AND started_at <= ${to}
        GROUP BY error_code ORDER BY count DESC LIMIT 10
      `,
      tx<Row[]>`
        SELECT coalesce(signup_source, '(none)') AS name, count(*) AS count
        FROM "user" WHERE created_at >= ${from} AND created_at <= ${to}
        GROUP BY signup_source ORDER BY count DESC LIMIT 10
      `,
      tx<Row[]>`
        SELECT period, sum(posts_count) AS count
        FROM billing_usage GROUP BY period ORDER BY period DESC LIMIT 6
      `,
    ]);

    const kpi = kpiRows[0];
    const published = num(kpi.published);
    const failed = num(kpi.failed);
    const terminal = published + failed;

    const kpis: Kpis = {
      totalUsers: num(kpi.total_users),
      totalOrgs: num(kpi.total_orgs),
      totalAccounts: num(kpi.total_accounts),
      liveSessions: num(kpi.live_sessions),
      newUsers: num(kpi.new_users),
      postsCreated: num(kpi.posts_created),
      published,
      failed,
      successRate: terminal > 0 ? published / terminal : null,
      activeUsers: num(kpi.active_users),
    };

    return {
      kpis,
      signupsDaily: signups.map((r) => ({ day: str(r.day), count: num(r.count) })),
      postsDaily: posts.map((r) => ({
        day: str(r.day),
        created: num(r.created),
        published: num(r.published),
      })),
      statusBreakdown: statusBreakdown.map((r) => ({ status: str(r.status), count: num(r.count) })),
      postsPerPlatform: postsPerPlatform.map((r) => ({ platform: str(r.platform), count: num(r.count) })),
      unattributedPosts: num(unattributedRows[0].count),
      accountsPerPlatform: accountsPerPlatform.map((r) => ({
        platform: str(r.platform),
        total: num(r.total),
        expired: num(r.expired),
      })),
      planDistribution: planDistribution.map((r) => ({ tier: str(r.tier), count: num(r.count) })),
      topOrgs: topOrgs.map((r) => ({ id: str(r.id), name: str(r.name) || "(unnamed)", count: num(r.count) })),
      topErrors: topErrors.map((r) => ({ name: str(r.name), count: num(r.count) })),
      signupAttribution: signupAttribution.map((r) => ({ name: str(r.name), count: num(r.count) })),
      monthlyUsage: monthlyUsage
        .map((r) => ({ period: str(r.period), count: num(r.count) }))
        .reverse(),
    };
  });
}

/* ------------------------------- orgs -------------------------------- */

export type OrgListRow = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  members: number;
  accounts: number;
  posts: number;
  tier: string | null;
};

export async function listOrgs(): Promise<OrgListRow[]> {
  return readonly(async (tx) => {
    // Pre-aggregate each child table once and hash-join, instead of running
    // correlated subqueries per org row.
    const rows = await tx<Row[]>`
      SELECT o.id, o.name, o.slug, o.created_at::text AS created_at,
        coalesce(mc.n, 0) AS members,
        coalesce(ac.n, 0) AS accounts,
        coalesce(pc.n, 0) AS posts,
        bs.tier
      FROM organization o
      LEFT JOIN (SELECT organization_id, count(*) AS n FROM member GROUP BY 1) mc ON mc.organization_id = o.id
      LEFT JOIN (SELECT organization_id, count(*) AS n FROM platform_accounts GROUP BY 1) ac ON ac.organization_id = o.id
      LEFT JOIN (SELECT organization_id, count(*) AS n FROM posts GROUP BY 1) pc ON pc.organization_id = o.id
      LEFT JOIN billing_subscriptions bs ON bs.organization_id = o.id
      ORDER BY o.created_at DESC LIMIT 500
    `;
    return rows.map((r) => ({
      id: str(r.id),
      name: str(r.name) || "(unnamed)",
      slug: str(r.slug),
      createdAt: str(r.created_at),
      members: num(r.members),
      accounts: num(r.accounts),
      posts: num(r.posts),
      tier: strn(r.tier),
    }));
  });
}

export type OrgMember = {
  userId: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: string;
  joinedAt: string;
};
export type OrgAccount = {
  id: string;
  platform: string;
  displayName: string | null;
  platformAccountId: string;
  tokenExpiresAt: string | null;
  createdAt: string;
};
export type OrgPost = {
  id: string;
  status: string;
  text: string;
  platform: string | null;
  createdAt: string;
  publishedAt: string | null;
};
export type OrgDetail = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  tier: string | null;
  subStatus: string | null;
  periodEnd: string | null;
  members: OrgMember[];
  accounts: OrgAccount[];
  statusCounts: StatusCount[];
  totalPosts: number;
  recentPosts: OrgPost[];
  usage: MonthlyUsage[];
};

export async function getOrgDetail(id: string): Promise<OrgDetail | null> {
  return readonly(async (tx) => {
    const [orgRows, subRows, members, accounts, statusCounts, totalRows, recent, usage] =
      await Promise.all([
        tx<Row[]>`SELECT id, name, slug, created_at::text AS created_at FROM organization WHERE id = ${id}`,
        tx<Row[]>`SELECT tier, status, current_period_end::text AS period_end FROM billing_subscriptions WHERE organization_id = ${id}`,
        tx<Row[]>`
          SELECT u.id AS user_id, u.name, u.email, u.email_verified, m.role, m.created_at::text AS joined_at
          FROM member m JOIN "user" u ON u.id = m.user_id
          WHERE m.organization_id = ${id}
          ORDER BY (m.role = 'owner') DESC, m.created_at ASC
        `,
        tx<Row[]>`
          SELECT id, platform, display_name, platform_account_id,
            token_expires_at::text AS token_expires_at, created_at::text AS created_at
          FROM platform_accounts WHERE organization_id = ${id} ORDER BY created_at ASC
        `,
        tx<Row[]>`
          SELECT status, count(*) AS count FROM posts WHERE organization_id = ${id} GROUP BY status ORDER BY count DESC
        `,
        tx<Row[]>`SELECT count(*) AS total FROM posts WHERE organization_id = ${id}`,
        tx<Row[]>`
          SELECT p.id, p.status, p.text, pa.platform,
            p.created_at::text AS created_at, p.published_at::text AS published_at
          FROM posts p LEFT JOIN platform_accounts pa ON pa.id = p.account_id
          WHERE p.organization_id = ${id} ORDER BY p.created_at DESC LIMIT 20
        `,
        tx<Row[]>`
          SELECT period, posts_count AS count FROM billing_usage
          WHERE organization_id = ${id} ORDER BY period DESC LIMIT 6
        `,
      ]);

    const org = orgRows[0];
    if (!org) return null;
    const sub = subRows[0];

    return {
      id: str(org.id),
      name: str(org.name) || "(unnamed)",
      slug: str(org.slug),
      createdAt: str(org.created_at),
      tier: sub ? strn(sub.tier) : null,
      subStatus: sub ? strn(sub.status) : null,
      periodEnd: sub ? strn(sub.period_end) : null,
      members: members.map((r) => ({
        userId: str(r.user_id),
        name: str(r.name),
        email: str(r.email),
        emailVerified: bool(r.email_verified),
        role: str(r.role),
        joinedAt: str(r.joined_at),
      })),
      accounts: accounts.map((r) => ({
        id: str(r.id),
        platform: str(r.platform),
        displayName: strn(r.display_name),
        platformAccountId: str(r.platform_account_id),
        tokenExpiresAt: strn(r.token_expires_at),
        createdAt: str(r.created_at),
      })),
      statusCounts: statusCounts.map((r) => ({ status: str(r.status), count: num(r.count) })),
      totalPosts: num(totalRows[0].total),
      recentPosts: recent.map((r) => ({
        id: str(r.id),
        status: str(r.status),
        text: str(r.text),
        platform: strn(r.platform),
        createdAt: str(r.created_at),
        publishedAt: strn(r.published_at),
      })),
      usage: usage.map((r) => ({ period: str(r.period), count: num(r.count) })).reverse(),
    };
  });
}

/* ------------------------------- users ------------------------------- */

export type UserListRow = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  signupSource: string | null;
};

export async function listUsers(): Promise<UserListRow[]> {
  return readonly(async (tx) => {
    const rows = await tx<Row[]>`
      SELECT id, name, email, email_verified, created_at::text AS created_at, signup_source
      FROM "user" ORDER BY created_at DESC LIMIT 500
    `;
    return rows.map((r) => ({
      id: str(r.id),
      name: str(r.name),
      email: str(r.email),
      emailVerified: bool(r.email_verified),
      createdAt: str(r.created_at),
      signupSource: strn(r.signup_source),
    }));
  });
}

export type UserOrg = { id: string; name: string; role: string; joinedAt: string };
export type UserSession = {
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  ip: string | null;
  userAgent: string | null;
};
export type UserDetail = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  signupSource: string | null;
  signupReferrer: string | null;
  signupLandingPath: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  orgs: UserOrg[];
  sessions: UserSession[];
};

export async function getUserDetail(id: string): Promise<UserDetail | null> {
  return readonly(async (tx) => {
    const [userRows, orgs, sessions] = await Promise.all([
      tx<Row[]>`
        SELECT id, name, email, email_verified, created_at::text AS created_at,
          signup_source, signup_referrer, signup_landing_path,
          signup_utm_source, signup_utm_medium, signup_utm_campaign
        FROM "user" WHERE id = ${id}
      `,
      tx<Row[]>`
        SELECT o.id, o.name, m.role, m.created_at::text AS joined_at
        FROM member m JOIN organization o ON o.id = m.organization_id
        WHERE m.user_id = ${id} ORDER BY m.created_at ASC
      `,
      tx<Row[]>`
        SELECT created_at::text AS created_at, updated_at::text AS updated_at,
          expires_at::text AS expires_at, ip_address, user_agent
        FROM session WHERE user_id = ${id} ORDER BY updated_at DESC LIMIT 10
      `,
    ]);

    const u = userRows[0];
    if (!u) return null;

    return {
      id: str(u.id),
      name: str(u.name),
      email: str(u.email),
      emailVerified: bool(u.email_verified),
      createdAt: str(u.created_at),
      signupSource: strn(u.signup_source),
      signupReferrer: strn(u.signup_referrer),
      signupLandingPath: strn(u.signup_landing_path),
      utmSource: strn(u.signup_utm_source),
      utmMedium: strn(u.signup_utm_medium),
      utmCampaign: strn(u.signup_utm_campaign),
      orgs: orgs.map((r) => ({
        id: str(r.id),
        name: str(r.name) || "(unnamed)",
        role: str(r.role),
        joinedAt: str(r.joined_at),
      })),
      sessions: sessions.map((r) => ({
        createdAt: str(r.created_at),
        updatedAt: str(r.updated_at),
        expiresAt: str(r.expires_at),
        ip: strn(r.ip_address),
        userAgent: strn(r.user_agent),
      })),
    };
  });
}

/* ------------------------------- posts ------------------------------- */

export type PostAttempt = {
  attemptNumber: number;
  startedAt: string;
  finishedAt: string | null;
  succeeded: boolean | null;
  errorCode: string | null;
  errorMessage: string | null;
};
export type PostDetail = {
  id: string;
  status: string;
  text: string;
  orgId: string;
  orgName: string;
  platform: string | null;
  accountName: string | null;
  accountId: string | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  platformUri: string | null;
  platformCid: string | null;
  error: unknown;
  attempts: PostAttempt[];
};

export async function getPostDetail(id: string): Promise<PostDetail | null> {
  return readonly(async (tx) => {
    const [postRows, attempts] = await Promise.all([
      tx<Row[]>`
        SELECT p.id, p.status, p.text, p.organization_id, o.name AS org_name,
          pa.platform, pa.display_name AS account_name, p.account_id,
          p.scheduled_at::text AS scheduled_at, p.published_at::text AS published_at,
          p.created_at::text AS created_at, p.platform_uri, p.platform_cid, p.error
        FROM posts p
        JOIN organization o ON o.id = p.organization_id
        LEFT JOIN platform_accounts pa ON pa.id = p.account_id
        WHERE p.id = ${id}
      `,
      tx<Row[]>`
        SELECT attempt_number, started_at::text AS started_at, finished_at::text AS finished_at,
          succeeded, error_code, error_message
        FROM post_attempts WHERE post_id = ${id} ORDER BY attempt_number ASC
      `,
    ]);

    const p = postRows[0];
    if (!p) return null;

    return {
      id: str(p.id),
      status: str(p.status),
      text: str(p.text),
      orgId: str(p.organization_id),
      orgName: str(p.org_name) || "(unnamed)",
      platform: strn(p.platform),
      accountName: strn(p.account_name),
      accountId: strn(p.account_id),
      scheduledAt: strn(p.scheduled_at),
      publishedAt: strn(p.published_at),
      createdAt: str(p.created_at),
      platformUri: strn(p.platform_uri),
      platformCid: strn(p.platform_cid),
      error: p.error ?? null,
      attempts: attempts.map((r) => ({
        attemptNumber: num(r.attempt_number),
        startedAt: str(r.started_at),
        finishedAt: strn(r.finished_at),
        succeeded: r.succeeded == null ? null : bool(r.succeeded),
        errorCode: strn(r.error_code),
        errorMessage: strn(r.error_message),
      })),
    };
  });
}
