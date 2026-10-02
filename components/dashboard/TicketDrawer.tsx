"use client";

import { ExternalLink, X } from "lucide-react";
import { useEffect } from "react";
import { formatDate, formatDateTime, formatDueIn } from "@/lib/format";
import type { PublicConfig, Ticket } from "@/lib/types";
import { PriorityBadge, RecommendationBadge, StatusBadge } from "./ui";

interface Props {
  ticket: Ticket | null;
  config: PublicConfig;
  onClose: () => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800 dark:text-slate-200">{children}</dd>
    </div>
  );
}

/** Panneau de détail en lecture seule. Aucune action de modification n'est proposée. */
export function TicketDrawer({ ticket, config, onClose }: Props) {
  useEffect(() => {
    if (!ticket) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ticket, onClose]);

  if (!ticket) return null;
  const t = ticket;

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      <button type="button" className="absolute inset-0 bg-slate-900/30 backdrop-blur-[1px]" onClick={onClose} aria-label="Fermer" />
      <aside className="relative flex h-full w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <PriorityBadge ticket={t} />
              <span className="font-mono text-sm font-semibold text-slate-500 dark:text-slate-400">{t.key}</span>
            </div>
            <h2 id="drawer-title" className="mt-1.5 text-lg leading-snug font-semibold">
              {t.summary}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Fermer le panneau"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <a
            href={t.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
          >
            <ExternalLink className="h-4 w-4" /> Ouvrir dans Jira
          </a>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex items-center justify-between gap-3">
              <RecommendationBadge ticket={t} />
              <span className="text-xs text-slate-500 tabular dark:text-slate-400">Score indicatif : {t.score}</span>
            </div>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {t.scoreReasons.map((r) => (
                <li key={r.label} className="rounded bg-white px-2 py-0.5 text-xs text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">
                  {r.label} <span className="text-slate-400 tabular">+{r.points}</span>
                </li>
              ))}
              {t.isWaiting && (
                <li className="rounded bg-white px-2 py-0.5 text-xs text-violet-700 ring-1 ring-violet-200 dark:bg-slate-900 dark:text-violet-300 dark:ring-violet-500/30">
                  en attente client
                </li>
              )}
            </ul>
            <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
              Indicateur calculé par l&apos;application pour aider au pilotage. Il ne modifie pas la priorité Jira et
              ne constitue pas une décision métier.
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            <Field label="Priorité Jira">{t.priorityName ?? <span className="text-amber-600">Aucune</span>}</Field>
            <Field label="État">
              <StatusBadge ticket={t} />
            </Field>
            <Field label="Responsable">{t.assignee?.name ?? <span className="text-amber-600">Non affecté</span>}</Field>
            <Field label="Rapporteur">{t.reporter?.name ?? "—"}</Field>
            <Field label="Création">{formatDateTime(t.created)}</Field>
            <Field label="Âge">
              {t.ageDays} jour{t.ageDays > 1 ? "s" : ""}
            </Field>
            <Field label="Échéance">
              {t.dueDate && t.dueInDays !== null ? (
                <span className={t.isOverdue ? "font-semibold text-red-600 dark:text-red-400" : undefined}>
                  {formatDate(t.dueDate)} ({formatDueIn(t.dueInDays)})
                </span>
              ) : (
                "—"
              )}
            </Field>
            <Field label="Dernière mise à jour">{formatDateTime(t.updated)}</Field>
            <Field label="Type">{t.issueType}</Field>
            <Field label="Équipe">{t.teamLabel}</Field>
            <Field label="Projet">
              {t.projectKey}
              {t.projectName && t.projectName !== t.projectKey ? ` – ${t.projectName}` : ""}
            </Field>
            <Field label="Composants">{t.components.length ? t.components.join(", ") : "—"}</Field>
            <Field label="Labels">{t.labels.length ? t.labels.join(", ") : "—"}</Field>
            {config.customFields.map((f) => (
              <Field key={f.id} label={f.label}>
                {t.customFields[f.id] ?? "—"}
              </Field>
            ))}
          </dl>

          <div>
            <h3 className="text-[11px] font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">Description</h3>
            {t.description ? (
              <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-300">{t.description}</p>
            ) : (
              <p className="mt-1.5 text-sm text-slate-400">Aucune description.</p>
            )}
          </div>

          <p className="text-xs break-all text-slate-400">
            URL Jira :{" "}
            <a href={t.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {t.url}
            </a>
          </p>
        </div>
      </aside>
    </div>
  );
}
