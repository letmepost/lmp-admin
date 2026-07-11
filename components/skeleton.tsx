import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-neutral-800/60 motion-reduce:animate-none",
        className,
      )}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-2.5 h-7 w-16" />
    </div>
  );
}

export function CardSkeleton({
  lines = 5,
  title = true,
}: {
  lines?: number;
  title?: boolean;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
      {title && <Skeleton className="h-4 w-32" />}
      <div className={cn("space-y-2.5", title && "mt-4")}>
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-4 h-56 w-full" />
    </div>
  );
}
