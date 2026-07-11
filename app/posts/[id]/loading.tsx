import { AppHeader } from "@/components/app-header";
import { Skeleton, CardSkeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <AppHeader />
      <Skeleton className="h-3 w-16" />
      <Skeleton className="mt-2 h-6 w-24" />
      <div className="mt-4">
        <CardSkeleton lines={4} title={false} />
      </div>
      <div className="mt-4">
        <CardSkeleton lines={3} />
      </div>
      <div className="mt-4">
        <CardSkeleton lines={4} />
      </div>
    </main>
  );
}
