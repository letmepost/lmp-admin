import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Column = { header: string; align?: "left" | "right" };

export function DataTable({
  columns,
  rows,
  empty = "No data.",
}: {
  columns: Column[];
  rows: ReactNode[][];
  empty?: string;
}) {
  if (rows.length === 0) {
    return <div className="py-2 text-sm text-neutral-500">{empty}</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.header}
                className={cn(
                  "pb-2 pr-3 text-xs font-medium uppercase tracking-wide text-neutral-500",
                  c.align === "right" ? "text-right" : "text-left",
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="align-top">
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={cn(
                    "border-t border-neutral-800/70 py-2 pr-3 text-neutral-200",
                    columns[ci]?.align === "right"
                      ? "tnum text-right"
                      : "text-left",
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
