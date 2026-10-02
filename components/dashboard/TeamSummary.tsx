"use client";

import clsx from "clsx";
import { NONE, type QuickFilter } from "@/lib/pilotage/filters";
import type { PublicConfig, Ticket } from "@/lib/types";
import { Card, SectionTitle } from "./ui";

interface Props {
  tickets: Ticket[];
  config: PublicConfig;
  activeTeam: string;
  onSelect: (team: string, quick: QuickFilter) => void;
}

interface Row {
  id: string;
  label: string;
  open: number;
  high: number;
  old: number;
  unassigned: number;
}

export function TeamSummary({ tickets, config, activeTeam, onSelect }: Props) {
  const rows: Row[] = config.teams.map((t) => ({ id: t.id, label: t.label, open: 0, high: 0, old: 0, unassigned: 0 }));
  const other: Row = { id: NONE, label: config.unassignedTeamLabel, open: 0, high: 0, old: 0, unassigned: 0 };
  const byId = new Map(rows.map((r) => [r.id, r]));
  for (const t of tickets) {
    const row = (t.teamId && byId.get(t.teamId)) || other;
    row.open++;
    if (t.level === "P1" || t.level === "P2") row.high++;
    if (t.isOld) row.old++;
    if (t.isUnassigned) row.unassigned++;
  }
  if (other.open > 0) rows.push(other);
  const max = Math.max(1, ...rows.map((r) => r.open));

  const cell = (row: Row, value: number, quick: QuickFilter, tone?: string) => (
    <td className="px-2 py-2.5 text-right">
      <button
        type="button"
        onClick={() => onSelect(row.id, quick)}
        className={clsx(
          "rounded px-1.5 py-0.5 font-semibold tabular hover:bg-slate-100 dark:hover:bg-slate-800",
          value === 0 ? "text-slate-300 dark:text-slate-600" : tone ?? "text-slate-800 dark:text-slate-200",
        )}
      >
        {value}
      </button>
    </td>
  );

  return (
    <Card>
      <SectionTitle>Vue par équipe</SectionTitle>
      <div className="overflow-x-auto px-3 pb-3">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] tracking-wide text-slate-500 uppercase dark:text-slate-400">
              <th className="px-2 py-1.5 text-left font-medium">Équipe</th>
              <th className="px-2 py-1.5 text-right font-medium">Ouverts</th>
              <th className="px-2 py-1.5 text-right font-medium">P1/P2</th>
              <th className="px-2 py-1.5 text-right font-medium">&gt;{config.agingThresholds.warning}j</th>
              <th className="px-2 py-1.5 text-right font-medium" title="Sans responsable">
                Sans resp.
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((row) => (
              <tr key={row.id} className={clsx(activeTeam === row.id && "bg-slate-50 dark:bg-slate-800/50")}>
                <td className="px-2 py-2.5">
                  <button type="button" onClick={() => onSelect(row.id, "all")} className="text-left font-medium hover:underline">
                    {row.label}
                  </button>
                  <div className="mt-1 h-1 rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden>
                    <div className="h-1 rounded-full bg-slate-400 dark:bg-slate-500" style={{ width: `${(row.open / max) * 100}%` }} />
                  </div>
                </td>
                {cell(row, row.open, "all")}
                {cell(row, row.high, "p1p2", "text-orange-600 dark:text-orange-400")}
                {cell(row, row.old, "old")}
                {cell(row, row.unassigned, "unassigned", "text-amber-600 dark:text-amber-300")}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
