/**
 * SCORING D'AIDE AU PILOTAGE
 * ==========================
 * Indicateur interne, sans effet sur Jira et sans valeur de vérité métier.
 *
 *   score = points de priorité (P1 100 · P2 60 · P3 30 · P4 10 · sans priorité 40)
 *         + échéance dépassée (+40)  OU  échéance proche (+20)
 *         + très ancien ≥ 60 j (+30) OU  ancien ≥ 30 j (+15)
 *         + sans responsable (+20)
 *         + bloqué (+25)
 *   (valeurs par défaut, modifiables dans config/pilotage.ts > scoring)
 *
 * Recommandation (première règle vérifiée) :
 *   1. ⏳ En attente     : statut / label « attente client »
 *   2. 🔥 Action requise : score ≥ seuil actionRequired (100)
 *   3. 👀 À arbitrer     : sans priorité, bloqué ou sans responsable
 *   4. 📅 À planifier    : score ≥ seuil toPlan (30)
 *   5. 💤 Backlog        : le reste
 */
import type { Recommendation, ScoreReason } from "@/lib/types";
import type { PilotageConfig, PriorityLevel } from "./config-types";

export interface ScoringInput {
  level: PriorityLevel | null;
  priorityName: string | null;
  ageDays: number;
  dueInDays: number | null;
  isUnassigned: boolean;
  isBlocked: boolean;
  isWaiting: boolean;
}

export interface ScoringResult {
  score: number;
  reasons: ScoreReason[];
  recommendation: Recommendation;
  explanation: string;
}

export const RECOMMENDATION_LABELS: Record<Recommendation, { label: string; emoji: string }> = {
  ACTION: { label: "Action requise", emoji: "🔥" },
  ARBITRATE: { label: "À arbitrer", emoji: "👀" },
  PLAN: { label: "À planifier", emoji: "📅" },
  WAITING: { label: "En attente", emoji: "⏳" },
  BACKLOG: { label: "Backlog", emoji: "💤" },
};

export function scoreTicket(input: ScoringInput, config: PilotageConfig): ScoringResult {
  const { priorityPoints, bonus, thresholds } = config.scoring;
  const { warning, critical } = config.agingThresholds;
  const reasons: ScoreReason[] = [];

  if (input.level) {
    reasons.push({ label: input.level, points: priorityPoints[input.level] });
  } else {
    reasons.push({
      label: input.priorityName ? `priorité « ${input.priorityName} » non mappée` : "sans priorité",
      points: priorityPoints.NONE,
    });
  }

  if (input.dueInDays !== null && input.dueInDays < 0) {
    const late = -input.dueInDays;
    reasons.push({ label: `échéance dépassée de ${late} j`, points: bonus.overdue });
  } else if (input.dueInDays !== null && input.dueInDays <= config.dueSoonDays) {
    reasons.push({
      label: input.dueInDays === 0 ? "échéance aujourd'hui" : `échéance dans ${input.dueInDays} j`,
      points: bonus.dueSoon,
    });
  }

  if (input.ageDays >= critical) {
    reasons.push({ label: `âgé de ${input.ageDays} j`, points: bonus.agingCritical });
  } else if (input.ageDays >= warning) {
    reasons.push({ label: `âgé de ${input.ageDays} j`, points: bonus.agingWarning });
  }

  if (input.isUnassigned) reasons.push({ label: "sans responsable", points: bonus.unassigned });
  if (input.isBlocked) reasons.push({ label: "bloqué", points: bonus.blocked });

  const score = reasons.reduce((sum, r) => sum + r.points, 0);

  let recommendation: Recommendation;
  if (input.isWaiting) recommendation = "WAITING";
  else if (score >= thresholds.actionRequired) recommendation = "ACTION";
  else if (!input.level || input.isBlocked || input.isUnassigned) recommendation = "ARBITRATE";
  else if (score >= thresholds.toPlan) recommendation = "PLAN";
  else recommendation = "BACKLOG";

  const parts = reasons.map((r) => r.label);
  if (input.isWaiting) parts.push("en attente client");
  const explanation = `${RECOMMENDATION_LABELS[recommendation].label} : ${parts.join(" + ")}`;

  return { score, reasons, recommendation, explanation };
}
