import { AppHeader } from "@/components/app-header";
import { Skeleton, CardSkeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <AppHeader active="orgs" />
      <Skeleton className="h-3 w-12" />
      <Skeleton className="mt-2 h-6 w-56" />
      <div className="mt-4">
        <CardSkeleton lines={4} title={false} />
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <CardSkeleton lines={5} />
        <CardSkeleton lines={5} />
      </div>
      <div className="mt-4">
        <CardSkeleton lines={6} />
      </div>
    </main>
  );
}
