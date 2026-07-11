import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrgDetail } from "@/lib/metrics";
import { AppHeader } from "@/components/app-header";
import { Card, CardHeader, CardTitle, CardContent, Badge, type Tone } from "@/components/ui";
import { DataTable } from "@/components/data-table";
import { DetailList } from "@/components/detail-list";
import { ErrorCard } from "@/components/error-card";
import { fmt, fmtDate, fmtDateTime, truncate } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function statusTone(s: string): Tone {
  if (s === "published") return "green";
  if (s === "failed" || s === "rejected") return "red";
  if (s === "canceled") return "neutral";
  return "amber";
}

function tokenBadge(iso: string | null) {
  if (!iso) return <Badge tone="neutral">no expiry</Badge>;
  const t = new Date(iso.replace(" ", "T").replace(/([+-]\d\d)$/, "$1:00")).getTime();
  if (Number.isNaN(t)) return <Badge tone="neutral">unknown</Badge>;
  return t < Date.now() ? (
    <Badge tone="red">expired</Badge>
  ) : (
    <Badge tone="green">valid</Badge>
  );
}

export default async function OrgDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let org;
  try {
    org = await getOrgDetail(id);
  } catch (err) {
    return (
      <main className="mx-auto max-w-6xl px-5 py-8">
        <AppHeader active="orgs" />
        <ErrorCard message={err instanceof Error ? err.message : String(err)} />
      </main>
    );
  }
  if (!org) notFound();

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <AppHeader active="orgs" />

      <Link href="/orgs" className="text-xs text-neutral-500 hover:text-neutral-300">
        ← Orgs
      </Link>
      <h1 className="mt-1 text-xl font-semibold text-neutral-50">{org.name}</h1>

      <Card className="mt-4 p-5">
        <DetailList
          items={[
            { label: "ID", value: <span className="font-mono text-xs">{org.id}</span> },
            { label: "Slug", value: org.slug || "—" },
            { label: "Created", value: fmtDateTime(org.createdAt) },
            { label: "Plan", value: org.tier ? cap(org.tier) : "—" },
            { label: "Subscription", value: org.subStatus ?? "—" },
            { label: "Period end", value: fmtDate(org.periodEnd) },
          ]}
        />
      </Card>

      <section className="mt-4 grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Members ({fmt(org.members.length)})</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                { header: "Name" },
                { header: "Email" },
                { header: "Role" },
                { header: "Joined", align: "right" },
              ]}
              rows={org.members.map((m) => [
                <Link
                  key={m.userId}
                  href={`/users/${m.userId}`}
                  className="text-neutral-100 hover:text-emerald-400 hover:underline"
                >
                  {m.name || "(no name)"}
                </Link>,
                <span className="text-neutral-300">
                  {m.email}
                  {!m.emailVerified && (
                    <span className="ml-1 text-xs text-amber-500">(unverified)</span>
                  )}
                </span>,
                <Badge tone={m.role === "owner" ? "green" : "neutral"}>{m.role}</Badge>,
                fmtDate(m.joinedAt),
              ])}
              empty="No members."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connected accounts ({fmt(org.accounts.length)})</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                { header: "Platform" },
                { header: "Display name" },
                { header: "Token" },
                { header: "Expires", align: "right" },
              ]}
              rows={org.accounts.map((a) => [
                cap(a.platform),
                <span className="text-neutral-300">{a.displayName || "—"}</span>,
                tokenBadge(a.tokenExpiresAt),
                a.tokenExpiresAt ? fmtDate(a.tokenExpiresAt) : "—",
              ])}
              empty="No connected accounts."
            />
          </CardContent>
        </Card>
      </section>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Posts ({fmt(org.totalPosts)})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap gap-2">
            {org.statusCounts.map((s) => (
              <Badge key={s.status} tone={statusTone(s.status)}>
                {s.status} · {fmt(s.count)}
              </Badge>
            ))}
          </div>
          <DataTable
            columns={[
              { header: "Status" },
              { header: "Platform" },
              { header: "Text" },
              { header: "Published", align: "right" },
            ]}
            rows={org.recentPosts.map((p) => [
              <Badge key={p.id} tone={statusTone(p.status)}>
                {p.status}
              </Badge>,
              p.platform ? cap(p.platform) : "—",
              <Link
                href={`/posts/${p.id}`}
                className="text-neutral-200 hover:text-emerald-400 hover:underline"
              >
                {truncate(p.text || "(no text)", 60)}
              </Link>,
              p.publishedAt ? fmtDate(p.publishedAt) : "—",
            ])}
            empty="No posts."
          />
        </CardContent>
      </Card>

      {org.usage.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Monthly usage</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[{ header: "Month" }, { header: "Posts", align: "right" }]}
              rows={org.usage.map((u) => [u.period, fmt(u.count)])}
            />
          </CardContent>
        </Card>
      )}
    </main>
  );
}
