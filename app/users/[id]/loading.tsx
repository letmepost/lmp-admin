import { AppHeader } from "@/components/app-header";
import { Skeleton, CardSkeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <AppHeader active="users" />
      <Skeleton className="h-3 w-12" />
      <Skeleton className="mt-2 h-6 w-48" />
      <Skeleton className="mt-2 h-4 w-64" />
      <div className="mt-4">
        <CardSkeleton lines={5} title={false} />
      </div>
      <div className="mt-4">
        <CardSkeleton lines={4} />
      </div>
      <div className="mt-4">
        <CardSkeleton lines={5} />
      </div>
    </main>
  );
}
