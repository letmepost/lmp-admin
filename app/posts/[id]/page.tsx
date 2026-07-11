import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostDetail } from "@/lib/metrics";
import { AppHeader } from "@/components/app-header";
import { Card, CardHeader, CardTitle, CardContent, Badge, type Tone } from "@/components/ui";
import { DataTable } from "@/components/data-table";
import { DetailList } from "@/components/detail-list";
import { ErrorCard } from "@/components/error-card";
import { fmtDateTime } from "@/lib/utils";

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

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let post;
  try {
    post = await getPostDetail(id);
  } catch (err) {
    return (
      <main className="mx-auto max-w-6xl px-5 py-8">
        <AppHeader />
        <ErrorCard message={err instanceof Error ? err.message : String(err)} />
      </main>
    );
  }
  if (!post) notFound();

  const uriIsLink = post.platformUri?.startsWith("http");

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <AppHeader />

      <Link
        href={`/orgs/${post.orgId}`}
        className="text-xs text-neutral-500 hover:text-neutral-300"
      >
        ← {post.orgName}
      </Link>
      <div className="mt-1 flex items-center gap-3">
        <h1 className="text-xl font-semibold text-neutral-50">Post</h1>
        <Badge tone={statusTone(post.status)}>{post.status}</Badge>
      </div>

      <Card className="mt-4 p-5">
        <DetailList
          items={[
            { label: "ID", value: <span className="font-mono text-xs">{post.id}</span> },
            {
              label: "Org",
              value: (
                <Link
                  href={`/orgs/${post.orgId}`}
                  className="text-emerald-400 hover:underline"
                >
                  {post.orgName}
                </Link>
              ),
            },
            { label: "Platform", value: post.platform ? cap(post.platform) : "unattributed" },
            { label: "Account", value: post.accountName ?? "—" },
            { label: "Created", value: fmtDateTime(post.createdAt) },
            { label: "Scheduled", value: fmtDateTime(post.scheduledAt) },
            { label: "Published", value: fmtDateTime(post.publishedAt) },
            {
              label: "Platform URI",
              value: post.platformUri ? (
                uriIsLink ? (
                  <a
                    href={post.platformUri}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 hover:underline break-all"
                  >
                    {post.platformUri}
                  </a>
                ) : (
                  <span className="font-mono text-xs break-all">{post.platformUri}</span>
                )
              ) : (
                "—"
              ),
            },
          ]}
        />
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Text</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm text-neutral-200">
            {post.text || "(no text)"}
          </p>
        </CardContent>
      </Card>

      {post.error != null && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-red-400">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-lg bg-neutral-950 p-3 text-xs text-red-300">
              {JSON.stringify(post.error, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Attempts ({post.attempts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { header: "#", align: "right" },
              { header: "Started" },
              { header: "Finished" },
              { header: "Result" },
              { header: "Error" },
            ]}
            rows={post.attempts.map((a) => [
              a.attemptNumber,
              fmtDateTime(a.startedAt),
              fmtDateTime(a.finishedAt),
              a.succeeded == null ? (
                <Badge tone="amber">pending</Badge>
              ) : a.succeeded ? (
                <Badge tone="green">ok</Badge>
              ) : (
                <Badge tone="red">failed</Badge>
              ),
              <span className="text-xs text-neutral-400">
                {a.errorCode ? (
                  <>
                    <span className="text-red-300">{a.errorCode}</span>
                    {a.errorMessage ? ` — ${a.errorMessage}` : ""}
                  </>
                ) : (
                  "—"
                )}
              </span>,
            ])}
            empty="No attempts recorded."
          />
        </CardContent>
      </Card>
    </main>
  );
}
