import type { PilotageConfig, PriorityLevel } from "./config-types";
import { normalizeText } from "./text";

/** Ordre de tri des niveaux ; les tickets sans niveau passent après P4. */
export const LEVEL_RANK: Record<PriorityLevel | "NONE", number> = { P1: 1, P2: 2, P3: 3, P4: 4, NONE: 5 };

export function buildPriorityResolver(config: PilotageConfig): (priorityName: string | null) => PriorityLevel | null {
  const map = new Map<string, PriorityLevel>();
  for (const [name, level] of Object.entries(config.priorityMapping)) {
    map.set(normalizeText(name), level);
  }
  return (priorityName) => (priorityName ? map.get(normalizeText(priorityName)) ?? null : null);
}
