import type { JiraTicket } from "@/lib/types";
import type { PilotageConfig, TeamConfig, TeamRule } from "./config-types";
import { matcher, normalizeText } from "./text";

type CompiledRule = (ticket: JiraTicket) => boolean;

function compileRule(rule: TeamRule): CompiledRule {
  const has = matcher(rule.values);
  switch (rule.type) {
    case "project":
      return (t) => has(t.projectKey) || has(t.projectName);
    case "component":
      return (t) => t.components.some(has);
    case "label":
      return (t) => t.labels.some(has);
    case "assignee":
      return (t) => !!t.assignee && (has(t.assignee.name) || has(t.assignee.email) || has(t.assignee.id));
    case "issueType":
      return (t) => has(t.issueType);
    case "summary": {
      const needles = rule.values.map(normalizeText).filter(Boolean);
      return (t) => {
        const s = normalizeText(t.summary);
        return needles.some((n) => s.includes(n));
      };
    }
    case "customField":
      // Valeur simple ou liste séparée par des virgules (champs multi-valeurs).
      return (t) => (t.customFields[rule.fieldId] ?? "").split(",").some(has);
  }
}

/**
 * Détermine l'équipe d'un ticket. Toute la logique d'affectation est pilotée par
 * `config.teams` : la première équipe dont une règle correspond l'emporte.
 */
export function buildTeamResolver(config: PilotageConfig): (ticket: JiraTicket) => TeamConfig | null {
  const compiled = config.teams.map((team) => ({ team, rules: team.rules.map(compileRule) }));
  return (ticket) => compiled.find(({ rules }) => rules.some((r) => r(ticket)))?.team ?? null;
}
