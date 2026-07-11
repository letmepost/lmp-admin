"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyPoint } from "@/lib/metrics";

function shortDay(day: string): string {
  const d = new Date(`${day}T00:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function SignupsChart({ data }: { data: DailyPoint[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2a24" vertical={false} />
          <XAxis
            dataKey="day"
            tickFormatter={shortDay}
            tick={{ fontSize: 11, fill: "#6b7d72" }}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "#6b7d72" }}
            tickLine={false}
            axisLine={false}
            width={32}
          />
          <Tooltip
            contentStyle={{
              background: "#0f1613",
              border: "1px solid #26332c",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(l) => shortDay(String(l))}
            labelStyle={{ color: "#9fb0a6" }}
          />
          <Line
            type="monotone"
            dataKey="count"
            name="Signups"
            stroke="#3fb469"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
