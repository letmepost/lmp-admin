import { AppHeader } from "@/components/app-header";
import { StatCardSkeleton, ChartSkeleton, CardSkeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <AppHeader active="dashboard" />
      <div className="mb-2 h-3 w-32" />
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </section>
      <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </section>
      <section className="mt-6 grid gap-3 md:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </section>
      <section className="mt-6 grid gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <CardSkeleton key={i} lines={6} />
        ))}
      </section>
    </main>
  );
}
