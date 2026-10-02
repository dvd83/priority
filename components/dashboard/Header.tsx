"use client";

import clsx from "clsx";
import { Moon, RefreshCw, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { formatDateTime, formatTime } from "@/lib/format";
import { NONE } from "@/lib/pilotage/filters";
import type { TeamInfo, TicketsResponse } from "@/lib/types";

interface Props {
  data: TicketsResponse;
  teams: TeamInfo[];
  hasUnclassified: boolean;
  team: string;
  onTeamChange: (team: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
}

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("pilotage-theme", next ? "dark" : "light");
    } catch {
      /* stockage indisponible : préférence non mémorisée */
    }
  };
  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      title={dark ? "Passer en thème clair" : "Passer en thème sombre"}
      aria-label="Changer de thème"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

export function Header({ data, teams, hasUnclassified, team, onTeamChange, onRefresh, refreshing }: Props) {
  const tabs = [
    { id: "", label: "Tous" },
    ...teams.map((t) => ({ id: t.id, label: t.shortLabel })),
    ...(hasUnclassified ? [{ id: NONE, label: data.config.unassignedTeamLabel }] : []),
  ];

  return (
    <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto flex max-w-[1680px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden>
            🎯
          </span>
          <div>
            <h1 className="text-lg font-bold tracking-wide uppercase">Pilotage IT</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Dernière synchronisation :{" "}
              <time dateTime={data.syncedAt} title={formatDateTime(data.syncedAt)} className="font-medium tabular">
                {formatTime(data.syncedAt)}
              </time>
              {" · "}
              {data.tickets.length} ticket{data.tickets.length > 1 ? "s" : ""} ouverts
              {data.source === "demo" && (
                <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 uppercase dark:bg-amber-400/15 dark:text-amber-300">
                  Démo
                </span>
              )}
              <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 uppercase dark:bg-slate-800 dark:text-slate-400">
                Lecture seule
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            <RefreshCw className={clsx("h-4 w-4", refreshing && "animate-spin")} />
            {refreshing ? "Synchronisation…" : "Actualiser"}
          </button>
        </div>
      </div>

      <nav className="mx-auto max-w-[1680px] px-4 sm:px-6 lg:px-8" aria-label="Équipes">
        <ul className="-mb-px flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <li key={tab.id || "all"}>
              <button
                type="button"
                onClick={() => onTeamChange(tab.id)}
                className={clsx(
                  "border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                  team === tab.id
                    ? "border-slate-900 text-slate-900 dark:border-slate-100 dark:text-slate-100"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
                )}
                aria-current={team === tab.id ? "page" : undefined}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
