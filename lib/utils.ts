export function cn(...inputs: Array<string | false | null | undefined>): string {
  return inputs.filter(Boolean).join(" ");
}

const nf = new Intl.NumberFormat("en-US");

export function fmt(n: number): string {
  return nf.format(n);
}

export function pct(n: number | null): string {
  return n == null ? "—" : `${(n * 100).toFixed(1)}%`;
}

export function signed(n: number): string {
  return `${n >= 0 ? "+" : ""}${fmt(n)}`;
}

// Postgres ::text timestamps look like "2026-07-11 13:45:00+00". Normalize to
// something the JS Date parser reliably accepts.
function toDate(iso: string): Date {
  let s = iso.trim();
  if (s.includes(" ") && !s.includes("T")) s = s.replace(" ", "T");
  s = s.replace(/([+-]\d\d)$/, "$1:00"); // "+00" -> "+00:00"
  return new Date(s);
}

export function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = toDate(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = toDate(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function truncate(s: string, n = 80): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
