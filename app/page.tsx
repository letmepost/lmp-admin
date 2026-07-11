import { getDashboardData } from "@/lib/metrics";
import { Card, CardContent, CardHeader, CardTitle, Badge, type Tone } from "@/components/ui";
import { StatCard } from "@/components/stat-card";
import { MetricTable } from "@/components/metric-table";
import { SignupsChart } from "@/components/charts/signups-chart";
import { PostsChart } from "@/components/charts/posts-chart";
import { fmt, pct, signed } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function statusTone(status: string): Tone {
  if (status === "published") return "green";
  if (status === "failed" || status === "rejected") return "red";
  if (status === "canceled") return "neutral";
  return "amber"; // queued / validated / publishing
}

export default async function Page() {
  let data;
  try {
    data = await getDashboardData();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return (
      <main className="mx-auto max-w-2xl px-5 py-16">
        <Card className="p-6">
          <CardTitle className="text-red-400">Couldn&apos;t load metrics</CardTitle>
          <p className="mt-2 text-sm text-neutral-400">
            The dashboard reached the app but the database query failed. Check
            that <code className="text-neutral-200">DATABASE_URL</code> is set
            and reachable.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-neutral-950 p-3 text-xs text-red-300">
            {message}
          </pre>
        </Card>
      </main>
    );
  }

  const k = data.kpis;
  const generatedAt = new Date().toUTCString();

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-neutral-50">
            letmepost <span className="text-neutral-500">· admin</span>
          </h1>
          <p className="tnum mt-0.5 text-xs text-neutral-600">
            live · read-only · generated {generatedAt}
          </p>
        </div>
        <a
          href="/api/logout"
          className="text-xs text-neutral-500 underline-offset-2 hover:text-neutral-300 hover:underline"
        >
          Sign out
        </a>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Users"
          value={k.totalUsers}
          sub={`${signed(k.newUsers7d)} this week`}
          tone={k.newUsers7d > 0 ? "green" : "neutral"}
        />
        <StatCard label="Organizations" value={k.totalOrgs} />
        <StatCard label="Connected accounts" value={k.totalAccounts} />
        <StatCard
          label="Posts"
          value={k.totalPosts}
          sub={`${signed(k.posts7d)} this week`}
          tone={k.posts7d > 0 ? "green" : "neutral"}
        />
        <StatCard label="Published" value={k.published} tone="green" />
        <StatCard
          label="Failed / rejected"
          value={k.failed}
          tone={k.failed > 0 ? "red" : "neutral"}
        />
        <StatCard label="Success rate" value={pct(k.successRate)} />
        <StatCard
          label="Active users (7d)"
          value={k.activeUsers7d}
          sub={`${fmt(k.liveSessions)} live sessions`}
        />
      </section>

      <p className="mt-2 text-xs text-neutral-600">
        Active users = distinct users with a session active in the last 7 days.
        Posts aren&apos;t tied to a user, so per-user posting activity
        isn&apos;t available.
      </p>

      {/* Charts */}
      <section className="mt-6 grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Signups · last 30 days</CardTitle>
          </CardHeader>
          <CardContent>
            <SignupsChart data={data.signupsDaily} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Posts · created vs published · last 30 days</CardTitle>
          </CardHeader>
          <CardContent>
            <PostsChart data={data.postsDaily} />
          </CardContent>
        </Card>
      </section>

      {/* Breakdowns */}
      <section className="mt-6 grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Posts per platform</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricTable
              head={["Platform", "Posts"]}
              rows={data.postsPerPlatform.map((r) => [cap(r.platform), fmt(r.count)])}
            />
            {data.unattributedPosts > 0 && (
              <p className="mt-2 text-xs text-neutral-600">
                {fmt(data.unattributedPosts)} unattributed (account since
                deleted).
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connected accounts per platform</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricTable
              head={["Platform", "Total", "Expired"]}
              rows={data.accountsPerPlatform.map((r) => [
                cap(r.platform),
                fmt(r.total),
                r.expired > 0 ? (
                  <Badge tone="red">{fmt(r.expired)}</Badge>
                ) : (
                  <span className="text-neutral-600">0</span>
                ),
              ])}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Post status</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricTable
              head={["Status", "Count"]}
              rows={data.statusBreakdown.map((r) => [
                <Badge key={r.status} tone={statusTone(r.status)}>
                  {r.status}
                </Badge>,
                fmt(r.count),
              ])}
            />
          </CardContent>
        </Card>
      </section>

      {/* Secondary */}
      <section className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Plan distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricTable
              head={["Tier", "Orgs"]}
              rows={data.planDistribution.map((r) => [cap(r.tier), fmt(r.count)])}
              empty="No subscriptions (billing off during alpha)."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top orgs by posts</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricTable
              head={["Org", "Posts"]}
              rows={data.topOrgs.map((r) => [r.name, fmt(r.count)])}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top publish errors</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricTable
              head={["Error code", "Count"]}
              rows={data.topErrors.map((r) => [
                <span key={r.name} className="text-neutral-300">
                  {r.name}
                </span>,
                fmt(r.count),
              ])}
              empty="No failed attempts recorded."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Signup source</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricTable
              head={["Source", "Users"]}
              rows={data.signupAttribution.map((r) => [r.name, fmt(r.count)])}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly usage</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricTable
              head={["Month", "Posts"]}
              rows={data.monthlyUsage.map((r) => [r.period, fmt(r.count)])}
              empty="No usage rows yet."
            />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
