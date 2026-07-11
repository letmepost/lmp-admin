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
