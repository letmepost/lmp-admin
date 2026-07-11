import { AppHeader } from "@/components/app-header";
import { Skeleton, CardSkeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <AppHeader active="users" />
      <Skeleton className="h-5 w-44" />
      <div className="mt-4">
        <CardSkeleton lines={12} title={false} />
      </div>
    </main>
  );
}
