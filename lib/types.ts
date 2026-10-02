/**
 * Modèle de données partagé entre le serveur et l'interface.
 * Aucune donnée sensible (credentials) ne transite par ces types.
 */
import type { PriorityLevel } from "@/lib/pilotage/config-types";

export type { PriorityLevel };

export type StatusCategory = "new" | "indeterminate" | "done" | "unknown";

export interface Person {
  id: string;
  name: string;
  email?: string;
}

/** Ticket tel que lu dans Jira, normalisé (aucun champ calculé). */
export interface JiraTicket {
  key: string;
  url: string;
  summary: string;
  description: string | null;
  priorityName: string | null;
  status: string;
  statusCategory: StatusCategory;
  assignee: Person | null;
  reporter: Person | null;
  created: string; // ISO
  updated: string; // ISO
  dueDate: string | null; // YYYY-MM-DD
  issueType: string;
  projectKey: string;
  projectName: string;
  labels: string[];
  components: string[];
  /** Valeurs des champs personnalisés configurés, converties en texte. */
  customFields: Record<string, string | null>;
  /** Champ « Flagged » Jira positionné. */
  flagged: boolean;
}

export type Recommendation = "ACTION" | "ARBITRATE" | "PLAN" | "WAITING" | "BACKLOG";

export interface ScoreReason {
  label: string;
  points: number;
}

/** Ticket enrichi des indicateurs calculés par l'application. */
export interface Ticket extends JiraTicket {
  level: PriorityLevel | null; // null = sans priorité ou priorité non mappée
  teamId: string | null;
  teamLabel: string;
  ageDays: number;
  /** Jours restants avant l'échéance (négatif = en retard). */
  dueInDays: number | null;
  isUnassigned: boolean;
  isUnprioritized: boolean;
  isOld: boolean;
  isVeryOld: boolean;
  isOverdue: boolean;
  isDueSoon: boolean;
  isBlocked: boolean;
  isWaiting: boolean;
  score: number;
  scoreReasons: ScoreReason[];
  recommendation: Recommendation;
  /** Explication lisible, ex. « Action requise : P2 + âgé de 47 j + échéance dépassée ». */
  explanation: string;
}

export interface TeamInfo {
  id: string;
  label: string;
  shortLabel: string;
}

/** Sous-ensemble de configuration exposé au navigateur (non sensible). */
export interface PublicConfig {
  priorityLevels: Record<PriorityLevel, { label: string; emoji: string }>;
  teams: TeamInfo[];
  unassignedTeamLabel: string;
  agingThresholds: { warning: number; critical: number };
  dueSoonDays: number;
  customFields: { id: string; label: string }[];
  scopes: { id: string; label: string }[];
}

export interface TicketsResponse {
  tickets: Ticket[];
  syncedAt: string; // ISO
  source: "jira" | "demo";
  jiraBaseUrl: string | null;
  /** Données servies depuis le cache après une erreur Jira. */
  stale: boolean;
  warnings: string[];
  error: string | null;
  config: PublicConfig;
}
