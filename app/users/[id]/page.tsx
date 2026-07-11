import Link from "next/link";
import { notFound } from "next/navigation";
import { getUserDetail } from "@/lib/metrics";
import { AppHeader } from "@/components/app-header";
import { Card, CardHeader, CardTitle, CardContent, Badge } from "@/components/ui";
import { DataTable } from "@/components/data-table";
import { DetailList } from "@/components/detail-list";
import { ErrorCard } from "@/components/error-card";
import { fmt, fmtDate, fmtDateTime, truncate } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let user;
  try {
    user = await getUserDetail(id);
  } catch (err) {
    return (
      <main className="mx-auto max-w-6xl px-5 py-8">
        <AppHeader active="users" />
        <ErrorCard message={err instanceof Error ? err.message : String(err)} />
      </main>
    );
  }
  if (!user) notFound();

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <AppHeader active="users" />

      <Link href="/users" className="text-xs text-neutral-500 hover:text-neutral-300">
        ← Users
      </Link>
      <h1 className="mt-1 text-xl font-semibold text-neutral-50">
        {user.name || "(no name)"}
      </h1>
      <p className="text-sm text-neutral-400">{user.email}</p>

      <Card className="mt-4 p-5">
        <DetailList
          items={[
            { label: "ID", value: <span className="font-mono text-xs">{user.id}</span> },
            { label: "Email", value: user.email },
            {
              label: "Verified",
              value: user.emailVerified ? (
                <Badge tone="green">yes</Badge>
              ) : (
                <Badge tone="amber">no</Badge>
              ),
            },
            { label: "Created", value: fmtDateTime(user.createdAt) },
            { label: "Signup source", value: user.signupSource ?? "—" },
            { label: "Referrer", value: user.signupReferrer ?? "—" },
            { label: "Landing path", value: user.signupLandingPath ?? "—" },
            { label: "UTM source", value: user.utmSource ?? "—" },
            { label: "UTM medium", value: user.utmMedium ?? "—" },
            { label: "UTM campaign", value: user.utmCampaign ?? "—" },
          ]}
        />
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Organizations ({fmt(user.orgs.length)})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { header: "Org" },
              { header: "Role" },
              { header: "Joined", align: "right" },
            ]}
            rows={user.orgs.map((o) => [
              <Link
                key={o.id}
                href={`/orgs/${o.id}`}
                className="text-neutral-100 hover:text-emerald-400 hover:underline"
              >
                {o.name}
              </Link>,
              <Badge tone={o.role === "owner" ? "green" : "neutral"}>{o.role}</Badge>,
              fmtDate(o.joinedAt),
            ])}
            empty="No organization memberships."
          />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Recent sessions ({fmt(user.sessions.length)})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { header: "Last active" },
              { header: "Started" },
              { header: "Expires" },
              { header: "IP" },
              { header: "Device" },
            ]}
            rows={user.sessions.map((s, i) => [
              <span key={i}>{fmtDateTime(s.updatedAt)}</span>,
              fmtDateTime(s.createdAt),
              fmtDateTime(s.expiresAt),
              <span className="font-mono text-xs text-neutral-400">{s.ip ?? "—"}</span>,
              <span className="text-xs text-neutral-500">
                {s.userAgent ? truncate(s.userAgent, 42) : "—"}
              </span>,
            ])}
            empty="No sessions."
          />
        </CardContent>
      </Card>
    </main>
  );
}
