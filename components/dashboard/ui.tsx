import clsx from "clsx";
import type { PriorityLevel, Recommendation, Ticket } from "@/lib/types";
import { RECOMMENDATION_LABELS } from "@/lib/pilotage/scoring";

export const LEVEL_STYLES: Record<PriorityLevel | "NONE", { dot: string; text: string; ring: string; soft: string }> = {
  P1: {
    dot: "bg-red-500",
    text: "text-red-700 dark:text-red-400",
    ring: "ring-red-500/60",
    soft: "bg-red-50 dark:bg-red-500/10",
  },
  P2: {
    dot: "bg-orange-500",
    text: "text-orange-700 dark:text-orange-400",
    ring: "ring-orange-500/60",
    soft: "bg-orange-50 dark:bg-orange-500/10",
  },
  P3: {
    dot: "bg-amber-400",
    text: "text-amber-700 dark:text-amber-300",
    ring: "ring-amber-400/60",
    soft: "bg-amber-50 dark:bg-amber-400/10",
  },
  P4: {
    dot: "bg-slate-300 dark:bg-slate-500",
    text: "text-slate-600 dark:text-slate-400",
    ring: "ring-slate-400/60",
    soft: "bg-slate-100 dark:bg-slate-500/10",
  },
  NONE: {
    dot: "border border-dashed border-slate-400 bg-transparent",
    text: "text-slate-500 dark:text-slate-400",
    ring: "ring-slate-400/60",
    soft: "bg-slate-100 dark:bg-slate-500/10",
  },
};

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section
      className={clsx(
        "rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
      <h2 className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">{children}</h2>
      {right}
    </div>
  );
}

export function PriorityBadge({ ticket }: { ticket: Pick<Ticket, "level" | "priorityName"> }) {
  const key = ticket.level ?? "NONE";
  const s = LEVEL_STYLES[key];
  return (
    <span
      className={clsx("inline-flex items-center gap-1.5 text-sm font-semibold whitespace-nowrap", s.text)}
      title={ticket.priorityName ? `Priorité Jira : ${ticket.priorityName}` : "Aucune priorité Jira"}
    >
      <span className={clsx("h-2.5 w-2.5 shrink-0 rounded-full", s.dot)} aria-hidden />
      {ticket.level ?? "—"}
    </span>
  );
}

export function StatusBadge({ ticket }: { ticket: Pick<Ticket, "status" | "statusCategory" | "isBlocked" | "isWaiting"> }) {
  return (
    <span
      className={clsx(
        "inline-block max-w-full truncate rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
        ticket.isBlocked
          ? "bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30"
          : ticket.isWaiting
            ? "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300"
            : ticket.statusCategory === "new"
              ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              : "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
      )}
      title={ticket.status}
    >
      {ticket.status}
    </span>
  );
}

const RECO_STYLES: Record<Recommendation, string> = {
  ACTION: "bg-red-600 text-white dark:bg-red-500/90",
  ARBITRATE: "bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200",
  PLAN: "bg-sky-50 text-sky-800 dark:bg-sky-500/10 dark:text-sky-200",
  WAITING: "bg-violet-50 text-violet-800 dark:bg-violet-500/10 dark:text-violet-200",
  BACKLOG: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

export function RecommendationBadge({ ticket }: { ticket: Pick<Ticket, "recommendation" | "explanation"> }) {
  const r = RECOMMENDATION_LABELS[ticket.recommendation];
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        RECO_STYLES[ticket.recommendation],
      )}
      title={ticket.explanation}
    >
      <span aria-hidden>{r.emoji}</span>
      {r.label}
    </span>
  );
}
