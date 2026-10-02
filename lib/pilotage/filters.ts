/**
 * Filtrage côté interface (instantané, sur les données déjà chargées).
 * Fonctions pures : testables et réutilisables côté serveur si besoin.
 */
import type { PriorityLevel, Ticket } from "@/lib/types";
import { normalizeText } from "./text";

export type QuickFilter =
  | "all"
  | "action"
  | "p1"
  | "p2"
  | "p1p2"
  | "unassigned"
  | "unprioritized"
  | "old"
  | "overdue"
  | "blocked"
  | "waiting";

export type AgeFilter = "all" | "lt7" | "7to30" | "gt30" | "gt60";
export type DueFilter = "all" | "overdue" | "soon" | "week" | "with" | "none";

export const NONE = "__none__";

export interface FilterState {
  quick: QuickFilter;
  level: PriorityLevel | typeof NONE | "";
  team: string; // id d'équipe, NONE pour « non classé », "" pour toutes
  status: string;
  assignee: string; // nom affiché, NONE pour « sans responsable »
  issueType: string;
  age: AgeFilter;
  due: DueFilter;
  search: string;
}

export const EMPTY_FILTERS: FilterState = {
  quick: "all",
  level: "",
  team: "",
  status: "",
  assignee: "",
  issueType: "",
  age: "all",
  due: "all",
  search: "",
};

export const QUICK_FILTERS: Record<QuickFilter, (t: Ticket) => boolean> = {
  all: () => true,
  action: (t) => t.recommendation === "ACTION",
  p1: (t) => t.level === "P1",
  p2: (t) => t.level === "P2",
  p1p2: (t) => t.level === "P1" || t.level === "P2",
  unassigned: (t) => t.isUnassigned,
  unprioritized: (t) => t.isUnprioritized,
  old: (t) => t.isOld,
  overdue: (t) => t.isOverdue,
  blocked: (t) => t.isBlocked,
  waiting: (t) => t.isWaiting,
};

function matchAge(t: Ticket, age: AgeFilter, warning: number, critical: number): boolean {
  switch (age) {
    case "all":
      return true;
    case "lt7":
      return t.ageDays < 7;
    case "7to30":
      return t.ageDays >= 7 && t.ageDays < warning;
    case "gt30":
      return t.ageDays >= warning;
    case "gt60":
      return t.ageDays >= critical;
  }
}

function matchDue(t: Ticket, due: DueFilter, dueSoonDays: number): boolean {
  const d = t.dueInDays;
  switch (due) {
    case "all":
      return true;
    case "overdue":
      return d !== null && d < 0;
    case "soon":
      return d !== null && d >= 0 && d <= dueSoonDays;
    case "week":
      return d !== null && d >= 0 && d <= 7;
    case "with":
      return d !== null;
    case "none":
      return d === null;
  }
}

export interface FilterContext {
  agingThresholds: { warning: number; critical: number };
  dueSoonDays: number;
}

export function applyFilters(tickets: Ticket[], f: FilterState, ctx: FilterContext): Ticket[] {
  const q = normalizeText(f.search);
  const quick = QUICK_FILTERS[f.quick];
  return tickets.filter((t) => {
    if (!quick(t)) return false;
    if (f.level === NONE ? t.level !== null : f.level && t.level !== f.level) return false;
    if (f.team === NONE ? t.teamId !== null : f.team && t.teamId !== f.team) return false;
    if (f.status && t.status !== f.status) return false;
    if (f.assignee === NONE ? !t.isUnassigned : f.assignee && t.assignee?.name !== f.assignee) return false;
    if (f.issueType && t.issueType !== f.issueType) return false;
    if (!matchAge(t, f.age, ctx.agingThresholds.warning, ctx.agingThresholds.critical)) return false;
    if (!matchDue(t, f.due, ctx.dueSoonDays)) return false;
    if (q) {
      const hay = normalizeText(`${t.key} ${t.summary} ${t.assignee?.name ?? ""} ${t.labels.join(" ")}`);
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/** Les filtres hors « filtre rapide » et hors équipe sont-ils actifs ? */
export function hasAdvancedFilters(f: FilterState): boolean {
  return !!(f.level || f.status || f.assignee || f.issueType || f.age !== "all" || f.due !== "all" || f.search);
}
