import Link from "next/link";
import { buildQuery, PER_PAGE_OPTIONS, type RawParams } from "@/lib/list-params";
import { fmt } from "@/lib/utils";
import { cn } from "@/lib/utils";

const btn =
  "rounded-md border border-neutral-800 px-2.5 py-1 text-xs text-neutral-400 hover:bg-neutral-800";
const btnOff = "rounded-md border border-neutral-900 px-2.5 py-1 text-xs text-neutral-700";

/**
 * Range footer + prev/next. Renders the true total so a filtered view can't be
 * mistaken for the whole table — the old lists capped at 500 rows with no count,
 * which silently hid everything past that.
 */
export function Pagination({
  pathname,
  params,
  page,
  perPage,
  total,
  unit,
}: {
  pathname: string;
  params: RawParams;
  page: number;
  perPage: number;
  total: number;
  unit: string;
}) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-800/70 pt-3">
      <p className="text-xs text-neutral-500">
        {total === 0 ? (
          <>No {unit}</>
        ) : (
          <>
            {fmt(from)}–{fmt(to)} of {fmt(total)} {unit}
          </>
        )}
      </p>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          {PER_PAGE_OPTIONS.map((n) => (
            <Link
              key={n}
              href={`${pathname}${buildQuery(params, { perPage: n })}`}
              className={cn(
                "text-xs",
                n === perPage
                  ? "text-emerald-400"
                  : "text-neutral-600 hover:text-neutral-300",
              )}
            >
              {n}
            </Link>
          ))}
          <span className="text-xs text-neutral-700">/ page</span>
        </div>

        {page > 1 ? (
          <Link
            href={`${pathname}${buildQuery(params, { page: page - 1 })}`}
            className={btn}
          >
            ← Prev
          </Link>
        ) : (
          <span className={btnOff}>← Prev</span>
        )}
        <span className="text-xs text-neutral-500">
          {fmt(page)} / {fmt(pages)}
        </span>
        {page < pages ? (
          <Link
            href={`${pathname}${buildQuery(params, { page: page + 1 })}`}
            className={btn}
          >
            Next →
          </Link>
        ) : (
          <span className={btnOff}>Next →</span>
        )}
      </div>
    </div>
  );
}
