"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

const PRESETS = ["7d", "30d", "90d"] as const;

export function DateRangePicker() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const isCustom = Boolean(params.get("from") || params.get("to"));
  const activePreset = isCustom ? "custom" : (params.get("range") ?? "30d");

  const [from, setFrom] = useState(params.get("from") ?? "");
  const [to, setTo] = useState(params.get("to") ?? "");

  function setPreset(preset: string) {
    router.push(`${pathname}?range=${preset}`);
  }

  function applyCustom() {
    const sp = new URLSearchParams();
    if (from) sp.set("from", from);
    if (to) sp.set("to", to);
    if (!from && !to) sp.set("range", "30d");
    router.push(`${pathname}?${sp.toString()}`);
  }

  const inputClass =
    "rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1 text-xs text-neutral-200 outline-none focus:border-emerald-600 [color-scheme:dark]";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex overflow-hidden rounded-lg border border-neutral-800">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPreset(p)}
            className={cn(
              "px-2.5 py-1 text-xs",
              activePreset === p
                ? "bg-emerald-600 text-white"
                : "text-neutral-400 hover:bg-neutral-800",
            )}
          >
            {p}
          </button>
        ))}
      </div>
      <input
        type="date"
        value={from}
        onChange={(e) => setFrom(e.target.value)}
        className={inputClass}
        aria-label="From date"
      />
      <span className="text-xs text-neutral-600">→</span>
      <input
        type="date"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        className={inputClass}
        aria-label="To date"
      />
      <button
        type="button"
        onClick={applyCustom}
        className={cn(
          "rounded-md border px-2.5 py-1 text-xs",
          activePreset === "custom"
            ? "border-emerald-600 text-emerald-400"
            : "border-neutral-800 text-neutral-400 hover:bg-neutral-800",
        )}
      >
        Apply
      </button>
    </div>
  );
}
