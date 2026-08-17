// Shared parsing for the users/orgs list URL params. Imported by both the
// server components (to build queries) and the client toolbar (to build links),
// so it must stay free of "server-only" and of any DB import.

export const USER_SORTS = ["created", "name", "email"] as const;
export const ORG_SORTS = [
  "created",
  "name",
  "members",
  "accounts",
  "posts",
] as const;

export type UserSort = (typeof USER_SORTS)[number];
export type OrgSort = (typeof ORG_SORTS)[number];
export type SortDir = "asc" | "desc";

export const PER_PAGE_OPTIONS = [25, 50, 100, 200] as const;
const PER_PAGE_DEFAULT = 50;
const PER_PAGE_MAX = 200;

// Next passes repeated params as arrays; we only ever want one value.
export type RawParams = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}

function intParam(v: string | string[] | undefined, fallback: number): number {
  const n = Number.parseInt(one(v), 10);
  return Number.isFinite(n) ? n : fallback;
}

function dirParam(v: string | string[] | undefined, fallback: SortDir): SortDir {
  const s = one(v);
  return s === "asc" || s === "desc" ? s : fallback;
}

function enumParam<T extends readonly string[]>(
  v: string | string[] | undefined,
  allowed: T,
  fallback: T[number],
): T[number] {
  const s = one(v);
  return (allowed as readonly string[]).includes(s) ? (s as T[number]) : fallback;
}

function pageParam(v: string | string[] | undefined): number {
  return Math.max(1, intParam(v, 1));
}

function perPageParam(v: string | string[] | undefined): number {
  const n = intParam(v, PER_PAGE_DEFAULT);
  return Math.min(PER_PAGE_MAX, Math.max(1, n));
}

export type UserListParams = {
  q: string;
  verified: "" | "yes" | "no";
  source: string;
  orgId: string;
  sort: UserSort;
  dir: SortDir;
  page: number;
  perPage: number;
};

export function parseUserParams(sp: RawParams): UserListParams {
  return {
    q: one(sp.q).trim(),
    verified: enumParam(sp.verified, ["", "yes", "no"] as const, ""),
    source: one(sp.source).trim(),
    orgId: one(sp.org).trim(),
    sort: enumParam(sp.sort, USER_SORTS, "created"),
    // Newest-first by default; name/email read better ascending.
    dir: dirParam(sp.dir, one(sp.sort) === "created" || !one(sp.sort) ? "desc" : "asc"),
    page: pageParam(sp.page),
    perPage: perPageParam(sp.perPage),
  };
}

export type OrgListParams = {
  q: string;
  tier: string;
  status: string;
  userId: string;
  sort: OrgSort;
  dir: SortDir;
  page: number;
  perPage: number;
};

export function parseOrgParams(sp: RawParams): OrgListParams {
  const sort = enumParam(sp.sort, ORG_SORTS, "created");
  return {
    q: one(sp.q).trim(),
    tier: one(sp.tier).trim(),
    status: one(sp.status).trim(),
    userId: one(sp.user).trim(),
    sort,
    // Counts and dates are most useful biggest/newest-first; names ascending.
    dir: dirParam(sp.dir, sort === "name" ? "asc" : "desc"),
    page: pageParam(sp.page),
    perPage: perPageParam(sp.perPage),
  };
}

// Build a querystring from the current params plus an overriding patch.
// `null` clears a key. Any change other than an explicit page jump resets to
// page 1, otherwise narrowing a filter can leave you on an empty page.
export function buildQuery(
  current: RawParams,
  patch: Record<string, string | number | null>,
): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(current)) {
    const val = one(v);
    if (val) sp.set(k, val);
  }
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === "") sp.delete(k);
    else sp.set(k, String(v));
  }
  if (!("page" in patch)) sp.delete("page");
  const s = sp.toString();
  return s ? `?${s}` : "";
}
