"use client";

import clsx from "clsx";
import type { QuickFilter } from "@/lib/pilotage/filters";
import { QUICK_FILTERS } from "@/lib/pilotage/filters";
import type { PublicConfig, Ticket } from "@/lib/types";
import { Card, SectionTitle } from "./ui";

interface Props {
  tickets: Ticket[];
  config: PublicConfig;
  active: QuickFilter;
  onSelect: (quick: QuickFilter) => void;
}

type Tone = "red" | "amber" | "violet" | "slate";

const TONES: Record<Tone, string> = {
  red: "text-red-600 dark:text-red-400",
  amber: "text-amber-600 dark:text-amber-300",
  violet: "text-violet-600 dark:text-violet-300",
  slate: "text-slate-700 dark:text-slate-300",
};

export function AttentionPanel({ tickets, config, active, onSelect }: Props) {
  const blocks: { id: QuickFilter; emoji: string; label: string; hint: string; tone: Tone }[] = [
    { id: "unassigned", emoji: "⚠️", label: "Sans responsable", hint: "Aucun assignee", tone: "amber" },
    { id: "unprioritized", emoji: "⚠️", label: "Sans priorité", hint: "Priorité Jira vide", tone: "amber" },
    {
      id: "old",
      emoji: "🕐",
      label: "Tickets anciens",
      hint: `Ouverts depuis ≥ ${config.agingThresholds.warning} j`,
      tone: "slate",
    },
    { id: "overdue", emoji: "🔴", label: "En retard", hint: "Échéance dépassée", tone: "red" },
    { id: "blocked", emoji: "🚧", label: "Bloqués", hint: "Statut / label / flag", tone: "red" },
    { id: "waiting", emoji: "⏳", label: "Attente client", hint: "Statut d'attente", tone: "violet" },
  ];

  return (
    <Card>
      <SectionTitle>Nécessitent une attention</SectionTitle>
      <div className="grid grid-cols-2 gap-px border-t border-slate-200 bg-slate-200 sm:grid-cols-3 lg:grid-cols-2 2xl:grid-cols-2 dark:border-slate-800 dark:bg-slate-800">
        {blocks.map((b) => {
          const count = tickets.filter(QUICK_FILTERS[b.id]).length;
          const isActive = active === b.id;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => onSelect(isActive ? "all" : b.id)}
              aria-pressed={isActive}
              className={clsx(
                "flex flex-col items-start gap-1 bg-white px-4 py-3 text-left transition-colors dark:bg-slate-900",
                isActive ? "bg-slate-100 dark:bg-slate-800!" : "hover:bg-slate-50 dark:hover:bg-slate-800/60",
                // Dernière ligne : coins arrondis du conteneur.
                "last:rounded-br-xl",
              )}
            >
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                <span aria-hidden className="mr-1">
                  {b.emoji}
                </span>
                {b.label}
              </span>
              <span className={clsx("text-2xl font-bold tabular", count > 0 ? TONES[b.tone] : "text-slate-300 dark:text-slate-600")}>
                {count}
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">{b.hint}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
