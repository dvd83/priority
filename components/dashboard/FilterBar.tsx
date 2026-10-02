"use client";

import clsx from "clsx";
import { Search, X } from "lucide-react";
import { useMemo } from "react";
import { PRIORITY_LEVELS } from "@/lib/pilotage/config-types";
import {
  EMPTY_FILTERS,
  hasAdvancedFilters,
  NONE,
  QUICK_FILTERS,
  type AgeFilter,
  type DueFilter,
  type FilterState,
  type QuickFilter,
} from "@/lib/pilotage/filters";
import type { PublicConfig, Ticket } from "@/lib/types";

interface Props {
  /** Tickets du périmètre équipe (avant filtres) : sert aux compteurs et aux listes d'options. */
  tickets: Ticket[];
  config: PublicConfig;
  filters: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
}

const QUICK: { id: QuickFilter; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "action", label: "🔥 À traiter" },
  { id: "p1", label: "🔴 P1" },
  { id: "p2", label: "🟠 P2" },
  { id: "unassigned", label: "Sans responsable" },
  { id: "old", label: ">30 jours" },
  { id: "overdue", label: "En retard" },
  { id: "blocked", label: "Bloqués" },
  { id: "waiting", label: "En attente client" },
];

function uniqueSorted(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b, "fr"));
}

const selectClass =
  "h-9 min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200";

export function FilterBar({ tickets, config, filters, onChange }: Props) {
  const options = useMemo(
    () => ({
      statuses: uniqueSorted(tickets.map((t) => t.status)),
      assignees: uniqueSorted(tickets.map((t) => t.assignee?.name)),
      types: uniqueSorted(tickets.map((t) => t.issueType)),
    }),
    [tickets],
  );

  const quickLabel = (id: QuickFilter, label: string) =>
    id === "old" ? `>${config.agingThresholds.warning} jours` : label;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5" role="toolbar" aria-label="Filtres rapides">
        {QUICK.map(({ id, label }) => {
          const count = id === "all" ? tickets.length : tickets.filter(QUICK_FILTERS[id]).length;
          const active = filters.quick === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange({ quick: id })}
              aria-pressed={active}
              className={clsx(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
                active
                  ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-500",
              )}
            >
              {quickLabel(id, label)}
              <span className={clsx("text-xs tabular", active ? "opacity-80" : "text-slate-400")}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        <label className="relative col-span-2 sm:col-span-3 lg:col-span-1">
          <span className="sr-only">Rechercher</span>
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="Rechercher clé, résumé, responsable…"
            className={clsx(selectClass, "w-full pl-8")}
          />
        </label>

        <select aria-label="Priorité" className={selectClass} value={filters.level} onChange={(e) => onChange({ level: e.target.value as FilterState["level"] })}>
          <option value="">Priorité : toutes</option>
          {PRIORITY_LEVELS.map((l) => (
            <option key={l} value={l}>
              {l} – {config.priorityLevels[l].label}
            </option>
          ))}
          <option value={NONE}>Sans priorité / non mappée</option>
        </select>

        <select aria-label="Équipe" className={selectClass} value={filters.team} onChange={(e) => onChange({ team: e.target.value })}>
          <option value="">Équipe : toutes</option>
          {config.teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
          <option value={NONE}>{config.unassignedTeamLabel}</option>
        </select>

        <select aria-label="État" className={selectClass} value={filters.status} onChange={(e) => onChange({ status: e.target.value })}>
          <option value="">État : tous</option>
          {options.statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select aria-label="Responsable" className={selectClass} value={filters.assignee} onChange={(e) => onChange({ assignee: e.target.value })}>
          <option value="">Responsable : tous</option>
          <option value={NONE}>— Sans responsable —</option>
          {options.assignees.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        <select aria-label="Type de ticket" className={selectClass} value={filters.issueType} onChange={(e) => onChange({ issueType: e.target.value })}>
          <option value="">Type : tous</option>
          {options.types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select aria-label="Âge" className={selectClass} value={filters.age} onChange={(e) => onChange({ age: e.target.value as AgeFilter })}>
          <option value="all">Âge : tous</option>
          <option value="lt7">Moins de 7 j</option>
          <option value="7to30">7 à {config.agingThresholds.warning} j</option>
          <option value="gt30">≥ {config.agingThresholds.warning} j</option>
          <option value="gt60">≥ {config.agingThresholds.critical} j</option>
        </select>

        <select aria-label="Échéance" className={selectClass} value={filters.due} onChange={(e) => onChange({ due: e.target.value as DueFilter })}>
          <option value="all">Échéance : toutes</option>
          <option value="overdue">Dépassée</option>
          <option value="soon">Sous {config.dueSoonDays} j</option>
          <option value="week">Sous 7 j</option>
          <option value="with">Avec échéance</option>
          <option value="none">Sans échéance</option>
        </select>
      </div>

      {(hasAdvancedFilters(filters) || filters.quick !== "all" || filters.team) && (
        <button
          type="button"
          onClick={() => onChange(EMPTY_FILTERS)}
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          <X className="h-3.5 w-3.5" /> Réinitialiser les filtres
        </button>
      )}
    </div>
  );
}
