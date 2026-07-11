import Link from "next/link";
import { listUsers } from "@/lib/metrics";
import { AppHeader } from "@/components/app-header";
import { Card, Badge } from "@/components/ui";
import { DataTable } from "@/components/data-table";
import { ErrorCard } from "@/components/error-card";
import { fmt, fmtDate } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function UsersPage() {
  let users;
  try {
    users = await listUsers();
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
      <h1 className="text-lg font-semibold text-neutral-50">
        Users{" "}
        <span className="font-normal text-neutral-600">({fmt(users.length)})</span>
      </h1>
      <Card className="mt-4 p-4">
        <DataTable
          columns={[
            { header: "Name" },
            { header: "Email" },
            { header: "Verified" },
            { header: "Source" },
            { header: "Created", align: "right" },
          ]}
          rows={users.map((u) => [
            <Link
              key={u.id}
              href={`/users/${u.id}`}
              className="text-neutral-100 hover:text-emerald-400 hover:underline"
            >
              {u.name || "(no name)"}
            </Link>,
            <span className="text-neutral-300">{u.email}</span>,
            u.emailVerified ? (
              <Badge tone="green">yes</Badge>
            ) : (
              <Badge tone="amber">no</Badge>
            ),
            u.signupSource ?? "—",
            fmtDate(u.createdAt),
          ])}
          empty="No users."
        />
      </Card>
    </main>
  );
}
