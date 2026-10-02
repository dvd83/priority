/** Types de la configuration (config/pilotage.ts). */

export type PriorityLevel = "P1" | "P2" | "P3" | "P4";
export const PRIORITY_LEVELS: readonly PriorityLevel[] = ["P1", "P2", "P3", "P4"] as const;

export interface ScopeConfig {
  id: string;
  label: string;
  jql: string;
}

export interface CustomFieldConfig {
  id: string;
  label: string;
}

export type TeamRuleType =
  | "project"
  | "component"
  | "label"
  | "assignee"
  | "issueType"
  | "summary"
  | "customField";

export type TeamRule =
  | { type: Exclude<TeamRuleType, "customField">; values: string[] }
  | { type: "customField"; fieldId: string; values: string[] };

export interface TeamConfig {
  id: string;
  label: string;
  shortLabel?: string;
  rules: TeamRule[];
}

export interface StatusLabelRule {
  statuses: string[];
  labels: string[];
}

export interface PilotageConfig {
  scopes: ScopeConfig[];
  maxIssues: number;
  jiraPageSize: number;
  cacheTtlSeconds: number;
  timeZone: string;
  descriptionMaxLength: number;
  customFields: CustomFieldConfig[];
  priorityMapping: Record<string, PriorityLevel>;
  priorityLevels: Record<PriorityLevel, { label: string; emoji: string }>;
  teams: TeamConfig[];
  unassignedTeamLabel: string;
  blocked: StatusLabelRule & { flaggedFieldId: string };
  waitingForCustomer: StatusLabelRule;
  agingThresholds: { warning: number; critical: number };
  dueSoonDays: number;
  scoring: {
    priorityPoints: Record<PriorityLevel | "NONE", number>;
    bonus: {
      overdue: number;
      dueSoon: number;
      agingWarning: number;
      agingCritical: number;
      unassigned: number;
      blocked: number;
    };
    thresholds: { actionRequired: number; toPlan: number };
  };
}
