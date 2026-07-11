import Link from "next/link";
import { listOrgs } from "@/lib/metrics";
import { AppHeader } from "@/components/app-header";
import { Card } from "@/components/ui";
import { DataTable } from "@/components/data-table";
import { ErrorCard } from "@/components/error-card";
import { fmt, fmtDate } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function OrgsPage() {
  let orgs;
  try {
    orgs = await listOrgs();
  } catch (err) {
    return (
      <main className="mx-auto max-w-6xl px-5 py-8">
        <AppHeader active="orgs" />
        <ErrorCard message={err instanceof Error ? err.message : String(err)} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <AppHeader active="orgs" />
      <h1 className="text-lg font-semibold text-neutral-50">
        Organizations{" "}
        <span className="font-normal text-neutral-600">({fmt(orgs.length)})</span>
      </h1>
      <Card className="mt-4 p-4">
        <DataTable
          columns={[
            { header: "Org" },
            { header: "Slug" },
            { header: "Plan" },
            { header: "Members", align: "right" },
            { header: "Accounts", align: "right" },
            { header: "Posts", align: "right" },
            { header: "Created", align: "right" },
          ]}
          rows={orgs.map((o) => [
            <Link
              key={o.id}
              href={`/orgs/${o.id}`}
              className="text-neutral-100 hover:text-emerald-400 hover:underline"
            >
              {o.name}
            </Link>,
            <span className="text-neutral-500">{o.slug || "—"}</span>,
            o.tier ?? "—",
            fmt(o.members),
            fmt(o.accounts),
            fmt(o.posts),
            fmtDate(o.createdAt),
          ])}
          empty="No organizations."
        />
      </Card>
    </main>
  );
}
