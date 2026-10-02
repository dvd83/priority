import type { JiraTicket, Ticket } from "@/lib/types";
import type { PilotageConfig } from "./config-types";
import { buildPriorityResolver, LEVEL_RANK } from "./priority";
import { buildTeamResolver } from "./teams";
import { matcher } from "./text";
import { dateInZone, daysBetween, todayInZone } from "./dates";
import { scoreTicket } from "./scoring";

/**
 * Calcule tous les indicateurs de pilotage (niveau, équipe, âge, retard,
 * blocage, score…) à partir des tickets Jira normalisés.
 */
export function enrichTickets(tickets: JiraTicket[], config: PilotageConfig, now: Date = new Date()): Ticket[] {
  const resolveLevel = buildPriorityResolver(config);
  const resolveTeam = buildTeamResolver(config);
  const isBlockedStatus = matcher(config.blocked.statuses);
  const isBlockedLabel = matcher(config.blocked.labels);
  const isWaitingStatus = matcher(config.waitingForCustomer.statuses);
  const isWaitingLabel = matcher(config.waitingForCustomer.labels);
  const today = todayInZone(config.timeZone, now);

  return tickets.map((t) => {
    const level = resolveLevel(t.priorityName);
    const team = resolveTeam(t);
    const createdDay = dateInZone(new Date(t.created), config.timeZone);
    const ageDays = Math.max(0, daysBetween(createdDay, today));
    const dueInDays = t.dueDate ? daysBetween(today, t.dueDate) : null;
    const isUnassigned = !t.assignee;
    const isBlocked = t.flagged || isBlockedStatus(t.status) || t.labels.some(isBlockedLabel);
    const isWaiting = isWaitingStatus(t.status) || t.labels.some(isWaitingLabel);

    const scoring = scoreTicket(
      { level, priorityName: t.priorityName, ageDays, dueInDays, isUnassigned, isBlocked, isWaiting },
      config,
    );

    return {
      ...t,
      level,
      teamId: team?.id ?? null,
      teamLabel: team?.label ?? config.unassignedTeamLabel,
      ageDays,
      dueInDays,
      isUnassigned,
      isUnprioritized: !t.priorityName,
      isOld: ageDays >= config.agingThresholds.warning,
      isVeryOld: ageDays >= config.agingThresholds.critical,
      isOverdue: dueInDays !== null && dueInDays < 0,
      isDueSoon: dueInDays !== null && dueInDays >= 0 && dueInDays <= config.dueSoonDays,
      isBlocked,
      isWaiting,
      score: scoring.score,
      scoreReasons: scoring.reasons,
      recommendation: scoring.recommendation,
      explanation: scoring.explanation,
    };
  });
}

/**
 * Tri par défaut de la file de priorisation :
 *   1. niveau de priorité (P1 → P4, puis sans priorité)
 *   2. urgence : échéance la plus proche / la plus dépassée d'abord (sans échéance à la fin)
 *   3. ancienneté : le plus ancien d'abord
 */
export function compareDefault(a: Ticket, b: Ticket): number {
  const byLevel = LEVEL_RANK[a.level ?? "NONE"] - LEVEL_RANK[b.level ?? "NONE"];
  if (byLevel !== 0) return byLevel;
  const dueA = a.dueInDays ?? Number.POSITIVE_INFINITY;
  const dueB = b.dueInDays ?? Number.POSITIVE_INFINITY;
  if (dueA !== dueB) return dueA < dueB ? -1 : 1;
  if (a.ageDays !== b.ageDays) return b.ageDays - a.ageDays;
  return a.key.localeCompare(b.key, "fr", { numeric: true });
}
