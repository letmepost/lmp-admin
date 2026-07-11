import { Card } from "@/components/ui";
import { cn, fmt } from "@/lib/utils";

export function StatCard({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "neutral" | "green" | "red";
}) {
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="tnum mt-1 text-2xl font-semibold text-neutral-50">
        {typeof value === "number" ? fmt(value) : value}
      </div>
      {sub && (
        <div
          className={cn(
            "tnum mt-0.5 text-xs",
            tone === "green" && "text-emerald-400",
            tone === "red" && "text-red-400",
            tone === "neutral" && "text-neutral-500",
          )}
        >
          {sub}
        </div>
      )}
    </Card>
  );
}
