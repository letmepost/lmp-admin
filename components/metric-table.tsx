import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function MetricTable({
  head,
  rows,
  empty = "No data yet.",
}: {
  head: string[];
  rows: ReactNode[][];
  empty?: string;
}) {
  if (rows.length === 0) {
    return <div className="py-2 text-sm text-neutral-500">{empty}</div>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr>
          {head.map((h, i) => (
            <th
              key={h}
              className={cn(
                "pb-2 text-xs font-medium uppercase tracking-wide text-neutral-500",
                i === 0 ? "text-left" : "text-right",
              )}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri}>
            {row.map((cell, ci) => (
              <td
                key={ci}
                className={cn(
                  "border-t border-neutral-800/70 py-1.5 text-neutral-200",
                  ci === 0 ? "text-left" : "tnum text-right",
                )}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
