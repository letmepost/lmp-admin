import type { ReactNode } from "react";

export function DetailList({
  items,
}: {
  items: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
      {items.map((it) => (
        <div key={it.label} className="flex flex-col gap-0.5">
          <dt className="text-xs uppercase tracking-wide text-neutral-500">
            {it.label}
          </dt>
          <dd className="text-sm break-words text-neutral-200">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}
