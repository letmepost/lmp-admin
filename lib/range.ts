// Date-range resolution shared by the dashboard. Driven by URL search params
// (?range=7d|30d|90d or ?from=YYYY-MM-DD&to=YYYY-MM-DD) so it's shareable and
// server-rendered. Flow metrics are scoped to the range; stock metrics (totals)
// are always cumulative.

export type Bucket = "day" | "week";

export type Range = {
  from: Date;
  to: Date;
  preset: string; // "7d" | "30d" | "90d" | "custom"
  days: number;
  bucket: Bucket;
  step: string; // interval literal for generate_series
};

export const PRESETS: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
const DAY_MS = 86_400_000;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function resolveRange(params: {
  range?: string;
  from?: string;
  to?: string;
}): Range {
  const now = new Date();
  let from: Date;
  let to: Date;
  let preset: string;

  if (params.from || params.to) {
    const parsedTo = params.to ? endOfDay(new Date(params.to)) : now;
    const parsedFrom = params.from
      ? startOfDay(new Date(params.from))
      : new Date(parsedTo.getTime() - 30 * DAY_MS);
    to = isNaN(parsedTo.getTime()) ? now : parsedTo;
    from = isNaN(parsedFrom.getTime())
      ? new Date(to.getTime() - 30 * DAY_MS)
      : parsedFrom;
    preset = "custom";
  } else {
    preset = params.range && PRESETS[params.range] ? params.range : "30d";
    to = now;
    from = new Date(now.getTime() - PRESETS[preset] * DAY_MS);
  }

  if (from > to) [from, to] = [to, from];

  const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / DAY_MS));
  const bucket: Bucket = days > 92 ? "week" : "day";
  const step = bucket === "week" ? "1 week" : "1 day";

  return { from, to, preset, days, bucket, step };
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
