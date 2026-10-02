"use client";

import clsx from "clsx";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatDueIn, formatShortDate } from "@/lib/format";
import { compareDefault } from "@/lib/pilotage/enrich";
import type { Ticket } from "@/lib/types";
import { PriorityBadge, RecommendationBadge, StatusBadge } from "./ui";

export type SortKey = "default" | "score" | "age" | "due" | "updated" | "key";

interface Props {
  tickets: Ticket[];
  selectedKey: string | null;
  onSelect: (ticket: Ticket) => void;
  agingWarning: number;
  agingCritical: number;
}

const PAGE_SIZES = [25, 50, 100];

const comparators: Record<Exclude<SortKey, "default">, (a: Ticket, b: Ticket) => number> = {
  score: (a, b) => b.score - a.score || compareDefault(a, b),
  age: (a, b) => b.ageDays - a.ageDays || compareDefault(a, b),
  due: (a, b) => (a.dueInDays ?? Infinity) - (b.dueInDays ?? Infinity) || compareDefault(a, b),
  updated: (a, b) => a.updated.localeCompare(b.updated) || compareDefault(a, b),
  key: (a, b) => a.key.localeCompare(b.key, "fr", { numeric: true }),
};

export function TicketTable({ tickets, selectedKey, onSelect, agingWarning, agingCritical }: Props) {
  const [sort, setSort] = useState<{ key: SortKey; reverse: boolean }>({ key: "default", reverse: false });
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    const cmp = sort.key === "default" ? compareDefault : comparators[sort.key];
    const list = [...tickets].sort(cmp);
    return sort.reverse ? list.reverse() : list;
  }, [tickets, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  // Revenir à la première page quand la liste filtrée change.
  useEffect(() => setPage(0), [tickets, pageSize, sort]);
  const current = Math.min(page, pageCount - 1);
  const rows = sorted.slice(current * pageSize, (current + 1) * pageSize);

  const header = (label: string, key: SortKey | null, className?: string, title?: string) => {
    const active = key !== null && sort.key === key;
    return (
      <th scope="col" className={clsx("px-3 py-2.5 font-medium", className)} title={title}>
        {key ? (
          <button
            type="button"
            onClick={() => setSort((s) => (s.key === key ? { key, reverse: !s.reverse } : { key, reverse: false }))}
            className={clsx("inline-flex items-center gap-1 uppercase hover:text-slate-900 dark:hover:text-slate-100", active && "text-slate-900 dark:text-slate-100")}
          >
            {label}
            {active && (sort.reverse ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
          </button>
        ) : (
          label
        )}
      </th>
    );
  };

  if (tickets.length === 0) {
    return (
      <div className="px-6 py-16 text-center text-sm text-slate-500 dark:text-slate-400">
        Aucun ticket ne correspond aux filtres sélectionnés.
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[740px] table-fixed lg:min-w-[980px] text-sm">
          <thead className="border-y border-slate-200 bg-slate-50 text-left text-[11px] tracking-wide text-slate-500 uppercase dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
            <tr>
              {header("Priorité", "default", "w-20", "Tri par défaut : priorité, échéance, ancienneté")}
              {header("Ticket", "key", "w-28")}
              {header("Résumé", null)}
              {header("État", null, "w-36")}
              {header("Responsable", null, "hidden w-36 lg:table-cell")}
              {header("Âge", "age", "w-14 text-right")}
              {header("Échéance", "due", "w-24")}
              {header("Action", "score", "w-36", "Recommandation calculée (aide au pilotage, ne modifie pas Jira) — tri par score")}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((t) => (
              <tr
                key={t.key}
                onClick={() => onSelect(t)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(t);
                  }
                }}
                tabIndex={0}
                aria-selected={selectedKey === t.key}
                className={clsx(
                  "cursor-pointer transition-colors focus:outline-none focus-visible:bg-slate-100 dark:focus-visible:bg-slate-800",
                  selectedKey === t.key ? "bg-slate-100 dark:bg-slate-800" : "hover:bg-slate-50 dark:hover:bg-slate-800/50",
                )}
              >
                <td className="px-3 py-3">
                  <PriorityBadge ticket={t} />
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <a
                    href={t.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 font-mono text-[13px] font-medium text-sky-700 hover:underline dark:text-sky-400"
                    title="Ouvrir dans Jira (nouvel onglet)"
                  >
                    {t.key}
                    <ExternalLink className="h-3 w-3 opacity-60" />
                  </a>
                </td>
                <td className="px-3 py-3">
                  <div className="truncate font-medium text-slate-800 dark:text-slate-100" title={t.summary}>
                    {t.summary}
                  </div>
                  <div className="truncate text-xs text-slate-400 dark:text-slate-500">
                    {t.issueType} · {t.teamLabel}
                    <span className="lg:hidden">
                      {" · "}
                      {t.assignee ? t.assignee.name : <span className="font-medium text-amber-600 dark:text-amber-300">à affecter</span>}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <StatusBadge ticket={t} />
                </td>
                <td className="hidden px-3 py-3 lg:table-cell">
                  {t.assignee ? (
                    <span className="block truncate text-slate-700 dark:text-slate-300" title={t.assignee.name}>
                      {t.assignee.name}
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-300">— À affecter</span>
                  )}
                </td>
                <td
                  className={clsx(
                    "px-3 py-3 text-right tabular whitespace-nowrap",
                    t.ageDays >= agingCritical
                      ? "font-semibold text-red-600 dark:text-red-400"
                      : t.ageDays >= agingWarning
                        ? "font-semibold text-amber-600 dark:text-amber-300"
                        : "text-slate-600 dark:text-slate-400",
                  )}
                >
                  {t.ageDays}j
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  {t.dueDate && t.dueInDays !== null ? (
                    <span
                      className={clsx(
                        "tabular",
                        t.isOverdue
                          ? "font-semibold text-red-600 dark:text-red-400"
                          : t.isDueSoon
                            ? "font-semibold text-orange-600 dark:text-orange-400"
                            : "text-slate-600 dark:text-slate-400",
                      )}
                      title={formatDueIn(t.dueInDays)}
                    >
                      {formatShortDate(t.dueDate)}
                      {t.isOverdue && <span className="ml-1 text-[11px]">({t.dueInDays} j)</span>}
                    </span>
                  ) : (
                    <span className="text-slate-300 dark:text-slate-600">—</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <RecommendationBadge ticket={t} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <span className="tabular">
          {current * pageSize + 1}–{Math.min((current + 1) * pageSize, sorted.length)} sur {sorted.length} ticket
          {sorted.length > 1 ? "s" : ""}
        </span>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5">
            Par page
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded border border-slate-200 bg-white px-1.5 py-1 dark:border-slate-700 dark:bg-slate-900"
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage(current - 1)}
              disabled={current === 0}
              className="rounded p-1 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
              aria-label="Page précédente"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="tabular">
              {current + 1} / {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage(current + 1)}
              disabled={current >= pageCount - 1}
              className="rounded p-1 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
              aria-label="Page suivante"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
