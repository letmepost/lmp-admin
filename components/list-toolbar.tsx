"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export type SelectFilter = {
  key: string;
  label: string;
  options: { value: string; label: string }[];
};

const controlClass =
  "rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1 text-xs text-neutral-200 outline-none focus:border-emerald-600";

/**
 * Search + filter bar for the list pages. State lives entirely in the URL so a
 * filtered view is linkable and the server component can do the filtering in
 * SQL — the tables are paginated, so anything filtered client-side would only
 * ever narrow the current page.
 */
export function ListToolbar({
  searchPlaceholder,
  filters,
  sorts,
}: {
  searchPlaceholder: string;
  filters: SelectFilter[];
  sorts: { value: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const urlQ = params.get("q") ?? "";

  // Any change other than an explicit page jump resets to page 1 — otherwise
  // narrowing a filter can strand you on a page that no longer exists.
  function apply(patch: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    sp.delete("page");
    const s = sp.toString();
    router.push(s ? `${pathname}?${s}` : pathname);
  }

  const activeSort = params.get("sort") ?? "created";
  const activeDir = params.get("dir") ?? "desc";
  const hasAny =
    Boolean(urlQ) ||
    filters.some((f) => params.get(f.key)) ||
    params.has("sort") ||
    params.has("dir") ||
    params.has("org") ||
    params.has("user");

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Uncontrolled + keyed on the URL value: the box resets itself when the
          query string changes (back button, Clear) without an effect syncing
          state on every render. */}
      <form
        key={urlQ}
        onSubmit={(e) => {
          e.preventDefault();
          const value = new FormData(e.currentTarget).get("q");
          apply({ q: typeof value === "string" ? value.trim() : "" });
        }}
        className="flex items-center gap-1.5"
      >
        <input
          type="search"
          name="q"
          defaultValue={urlQ}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className={cn(controlClass, "w-56")}
        />
        <button
          type="submit"
          className="rounded-md border border-neutral-800 px-2.5 py-1 text-xs text-neutral-400 hover:bg-neutral-800"
        >
          Search
        </button>
      </form>

      {filters.map((f) => (
        <select
          key={f.key}
          value={params.get(f.key) ?? ""}
          onChange={(e) => apply({ [f.key]: e.target.value })}
          aria-label={f.label}
          className={cn(controlClass, "[color-scheme:dark]")}
        >
          <option value="">{f.label}: any</option>
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ))}

      <select
        value={activeSort}
        onChange={(e) => apply({ sort: e.target.value })}
        aria-label="Sort by"
        className={cn(controlClass, "[color-scheme:dark]")}
      >
        {sorts.map((s) => (
          <option key={s.value} value={s.value}>
            Sort: {s.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => apply({ dir: activeDir === "asc" ? "desc" : "asc" })}
        aria-label={`Sort ${activeDir === "asc" ? "descending" : "ascending"}`}
        className="rounded-md border border-neutral-800 px-2 py-1 text-xs text-neutral-400 hover:bg-neutral-800"
      >
        {activeDir === "asc" ? "↑ asc" : "↓ desc"}
      </button>

      {hasAny && (
        <button
          type="button"
          onClick={() => router.push(pathname)}
          className="text-xs text-neutral-500 underline-offset-2 hover:text-neutral-300 hover:underline"
        >
          Clear
        </button>
      )}
    </div>
  );
}
