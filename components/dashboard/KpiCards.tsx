"use client";

import clsx from "clsx";
import { NONE, type FilterState } from "@/lib/pilotage/filters";
import { PRIORITY_LEVELS } from "@/lib/pilotage/config-types";
import type { PriorityLevel, PublicConfig, Ticket } from "@/lib/types";
import { LEVEL_STYLES } from "./ui";

interface Props {
  tickets: Ticket[];
  config: PublicConfig;
  active: FilterState["level"];
  onSelect: (level: FilterState["level"]) => void;
}

export function KpiCards({ tickets, config, active, onSelect }: Props) {
  const counts: Record<PriorityLevel | "NONE", number> = { P1: 0, P2: 0, P3: 0, P4: 0, NONE: 0 };
  const actionCounts: Record<PriorityLevel, number> = { P1: 0, P2: 0, P3: 0, P4: 0 };
  for (const t of tickets) {
    counts[t.level ?? "NONE"]++;
    if (t.level && t.recommendation === "ACTION") actionCounts[t.level]++;
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {PRIORITY_LEVELS.map((level) => {
        const meta = config.priorityLevels[level];
        const s = LEVEL_STYLES[level];
        const isActive = active === level;
        return (
          <button
            key={level}
            type="button"
            onClick={() => onSelect(isActive ? "" : level)}
            aria-pressed={isActive}
            className={clsx(
              "group relative overflow-hidden rounded-xl border bg-white p-4 text-left shadow-sm transition sm:p-5 dark:bg-slate-900",
              isActive
                ? clsx("ring-2", s.ring, "border-transparent")
                : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700",
            )}
          >
            <span className={clsx("absolute inset-y-0 left-0 w-1", s.dot)} aria-hidden />
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              <span aria-hidden>{meta.emoji}</span>
              <span>
                {level} / {meta.label}
              </span>
            </div>
            <div className={clsx("mt-2 text-4xl font-bold tabular", counts[level] > 0 ? s.text : "text-slate-300 dark:text-slate-600")}>
              {counts[level]}
            </div>
            <div className="mt-1 h-4 text-xs text-slate-500 dark:text-slate-400">
              {actionCounts[level] > 0 && `dont ${actionCounts[level]} action requise`}
            </div>
          </button>
        );
      })}
      {counts.NONE > 0 && (
        <button
          type="button"
          onClick={() => onSelect(active === NONE ? "" : NONE)}
          className={clsx(
            "col-span-2 rounded-lg border border-dashed px-4 py-2 text-left text-xs text-slate-600 lg:col-span-4 dark:text-slate-400",
            active === NONE ? "border-slate-500 bg-slate-100 dark:bg-slate-800" : "border-slate-300 dark:border-slate-700",
          )}
        >
          + {counts.NONE} ticket{counts.NONE > 1 ? "s" : ""} sans priorité ou avec une priorité Jira non mappée
          (voir <code className="font-mono">priorityMapping</code>) — cliquer pour filtrer
        </button>
      )}
    </div>
  );
}
