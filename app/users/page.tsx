import Link from "next/link";
import { getUsersPageData } from "@/lib/metrics";
import { AppHeader } from "@/components/app-header";
import { Card, Badge } from "@/components/ui";
import { DataTable } from "@/components/data-table";
import { ErrorCard } from "@/components/error-card";
import { ListToolbar } from "@/components/list-toolbar";
import { Pagination } from "@/components/pagination";
import { parseUserParams, type RawParams } from "@/lib/list-params";
import { fmt, fmtDate } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  const sp = await searchParams;
  const p = parseUserParams(sp);

  let data;
  try {
    data = await getUsersPageData(p);
  } catch (err) {
    return (
      <main className="mx-auto max-w-6xl px-5 py-8">
        <AppHeader active="users" />
        <ErrorCard message={err instanceof Error ? err.message : String(err)} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <AppHeader active="users" />

      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-lg font-semibold text-neutral-50">
          Users{" "}
          <span className="font-normal text-neutral-600">
            ({fmt(data.total)})
          </span>
        </h1>
      </div>

      {p.orgId && (
        <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
          <Badge tone="blue">
            members of {data.orgName ?? "unknown org"}
          </Badge>
          <Link
            href={`/orgs/${p.orgId}`}
            className="text-neutral-500 hover:text-emerald-400 hover:underline"
          >
            open org →
          </Link>
        </p>
      )}

      <div className="mt-3">
        <ListToolbar
          searchPlaceholder="Search name or email…"
          filters={[
            {
              key: "verified",
              label: "Verified",
              options: [
                { value: "yes", label: "verified" },
                { value: "no", label: "unverified" },
              ],
            },
            {
              key: "source",
              label: "Source",
              options: data.sources.map((s) => ({ value: s, label: s })),
            },
          ]}
          sorts={[
            { value: "created", label: "created" },
            { value: "name", label: "name" },
            { value: "email", label: "email" },
          ]}
        />
      </div>

      <Card className="mt-4 p-4">
        <DataTable
          columns={[
            { header: "Name" },
            { header: "Email" },
            { header: "Orgs" },
            { header: "Verified" },
            { header: "Source" },
            { header: "Created", align: "right" },
          ]}
          rows={data.rows.map((u) => [
            <Link
              key={u.id}
              href={`/users/${u.id}`}
              className="text-neutral-100 hover:text-emerald-400 hover:underline"
            >
              {u.name || "(no name)"}
            </Link>,
            <span key={`${u.id}-email`} className="text-neutral-300">
              {u.email}
            </span>,
            u.orgs.length === 0 ? (
              <span key={`${u.id}-orgs`} className="text-neutral-600">
                —
              </span>
            ) : (
              <span
                key={`${u.id}-orgs`}
                className="flex flex-wrap gap-x-1.5 gap-y-1"
              >
                {u.orgs.map((o) => (
                  <Link
                    key={o.id}
                    href={`/orgs/${o.id}`}
                    className="text-xs text-neutral-400 hover:text-emerald-400 hover:underline"
                  >
                    {o.name}
                  </Link>
                ))}
              </span>
            ),
            u.emailVerified ? (
              <Badge tone="green">yes</Badge>
            ) : (
              <Badge tone="amber">no</Badge>
            ),
            u.signupSource ?? "—",
            fmtDate(u.createdAt),
          ])}
          empty="No users match these filters."
        />
        <Pagination
          pathname="/users"
          params={sp}
          page={p.page}
          perPage={p.perPage}
          total={data.total}
          unit="users"
        />
      </Card>
    </main>
  );
}
