import Link from "next/link";
import { getOrgsPageData } from "@/lib/metrics";
import { AppHeader } from "@/components/app-header";
import { Card, Badge } from "@/components/ui";
import { DataTable } from "@/components/data-table";
import { ErrorCard } from "@/components/error-card";
import { ListToolbar } from "@/components/list-toolbar";
import { Pagination } from "@/components/pagination";
import { parseOrgParams, type RawParams } from "@/lib/list-params";
import { fmt, fmtDate } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function OrgsPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  const sp = await searchParams;
  const p = parseOrgParams(sp);

  let data;
  try {
    data = await getOrgsPageData(p);
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
        <span className="font-normal text-neutral-600">
          ({fmt(data.total)})
        </span>
      </h1>

      {p.userId && (
        <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
          <Badge tone="blue">orgs of {data.userLabel ?? "unknown user"}</Badge>
          <Link
            href={`/users/${p.userId}`}
            className="text-neutral-500 hover:text-emerald-400 hover:underline"
          >
            open user →
          </Link>
        </p>
      )}

      <div className="mt-3">
        <ListToolbar
          searchPlaceholder="Search name or slug…"
          filters={[
            {
              key: "tier",
              label: "Plan",
              options: data.tiers.map((t) => ({ value: t, label: t })),
            },
            {
              key: "status",
              label: "Sub",
              options: data.statuses.map((s) => ({ value: s, label: s })),
            },
          ]}
          sorts={[
            { value: "created", label: "created" },
            { value: "name", label: "name" },
            { value: "members", label: "members" },
            { value: "accounts", label: "accounts" },
            { value: "posts", label: "posts" },
          ]}
        />
      </div>

      <Card className="mt-4 p-4">
        <DataTable
          columns={[
            { header: "Org" },
            { header: "Slug" },
            { header: "Owner" },
            { header: "Plan" },
            { header: "Members", align: "right" },
            { header: "Accounts", align: "right" },
            { header: "Posts", align: "right" },
            { header: "Created", align: "right" },
          ]}
          rows={data.rows.map((o) => [
            <Link
              key={o.id}
              href={`/orgs/${o.id}`}
              className="text-neutral-100 hover:text-emerald-400 hover:underline"
            >
              {o.name}
            </Link>,
            <span key={`${o.id}-slug`} className="text-neutral-500">
              {o.slug || "—"}
            </span>,
            o.owner ? (
              <Link
                key={`${o.id}-owner`}
                href={`/users/${o.owner.id}`}
                className="text-xs text-neutral-400 hover:text-emerald-400 hover:underline"
                title={o.owner.name || undefined}
              >
                {o.owner.email}
              </Link>
            ) : (
              <span key={`${o.id}-owner`} className="text-neutral-600">
                —
              </span>
            ),
            o.tier ?? "—",
            <Link
              key={`${o.id}-members`}
              href={`/users?org=${o.id}`}
              className="tnum text-neutral-200 hover:text-emerald-400 hover:underline"
            >
              {fmt(o.members)}
            </Link>,
            fmt(o.accounts),
            fmt(o.posts),
            fmtDate(o.createdAt),
          ])}
          empty="No organizations match these filters."
        />
        <Pagination
          pathname="/orgs"
          params={sp}
          page={p.page}
          perPage={p.perPage}
          total={data.total}
          unit="orgs"
        />
      </Card>
    </main>
  );
}
