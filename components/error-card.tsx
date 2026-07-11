import { Card, CardTitle } from "@/components/ui";

export function ErrorCard({ message }: { message: string }) {
  return (
    <Card className="p-6">
      <CardTitle className="text-red-400">Something went wrong</CardTitle>
      <p className="mt-2 text-sm text-neutral-400">
        The database query failed. Check that{" "}
        <code className="text-neutral-200">DATABASE_URL</code> is set and
        reachable.
      </p>
      <pre className="mt-3 overflow-x-auto rounded-lg bg-neutral-950 p-3 text-xs text-red-300">
        {message}
      </pre>
    </Card>
  );
}
