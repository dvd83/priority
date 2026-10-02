import "server-only";
import { pilotageConfig } from "@/config/pilotage";
import type { PilotageConfig } from "@/lib/pilotage/config-types";
import { compareDefault, enrichTickets } from "@/lib/pilotage/enrich";
import type { JiraTicket, PublicConfig, TicketsResponse } from "@/lib/types";
import { buildDemoTickets } from "@/lib/demo/demo-data";
import { isDemoForced, readJiraEnv } from "@/lib/jira/env";
import { JiraError } from "@/lib/jira/errors";
import { normalizeIssue } from "@/lib/jira/normalize";
import { searchIssues, STANDARD_FIELDS } from "@/lib/jira/search";

/** Délai minimal entre deux rafraîchissements forcés (protection de l'API Jira). */
const MIN_FORCED_REFRESH_MS = 10_000;

interface CacheEntry {
  data: Omit<TicketsResponse, "stale" | "error">;
  fetchedAt: number;
}

// Cache mémoire du processus serveur (survit au rechargement à chaud en dev).
const store = globalThis as unknown as {
  __pilotageCache?: CacheEntry;
  __pilotageInflight?: Promise<CacheEntry>;
};

export function toPublicConfig(config: PilotageConfig): PublicConfig {
  return {
    priorityLevels: config.priorityLevels,
    teams: config.teams.map((t) => ({ id: t.id, label: t.label, shortLabel: t.shortLabel ?? t.label })),
    unassignedTeamLabel: config.unassignedTeamLabel,
    agingThresholds: config.agingThresholds,
    dueSoonDays: config.dueSoonDays,
    customFields: config.customFields,
    scopes: config.scopes.map((s) => ({ id: s.id, label: s.label })),
  };
}

function cacheTtlMs(config: PilotageConfig): number {
  const env = Number(process.env.PILOTAGE_CACHE_TTL_SECONDS);
  return (Number.isFinite(env) && env >= 0 ? env : config.cacheTtlSeconds) * 1000;
}

async function load(config: PilotageConfig): Promise<CacheEntry> {
  const envResult = readJiraEnv();
  const now = new Date();
  const warnings: string[] = [];
  let raw: JiraTicket[];
  let source: TicketsResponse["source"];
  let jiraBaseUrl: string | null;

  if (isDemoForced() || (!envResult.ok && envResult.reason === "missing")) {
    source = "demo";
    jiraBaseUrl = envResult.ok ? envResult.env.baseUrl : null;
    raw = buildDemoTickets(jiraBaseUrl ?? "https://jira.example.com", now);
    warnings.push(
      envResult.ok
        ? "Mode démonstration forcé (PILOTAGE_DEMO_MODE=true)."
        : `Jira non configuré (${envResult.reason === "missing" ? envResult.missing.join(", ") : ""} manquant) : données de démonstration affichées.`,
    );
  } else if (!envResult.ok) {
    throw new JiraError("config", envResult.message);
  } else {
    const env = envResult.env;
    source = "jira";
    jiraBaseUrl = env.baseUrl;
    const fields = [
      ...STANDARD_FIELDS,
      ...config.customFields.map((f) => f.id),
      ...(config.blocked.flaggedFieldId ? [config.blocked.flaggedFieldId] : []),
    ];
    const byKey = new Map<string, JiraTicket>();
    // Périmètres interrogés séquentiellement pour ménager l'API Jira.
    for (const scope of config.scopes) {
      const remaining = config.maxIssues - byKey.size;
      if (remaining <= 0) {
        warnings.push(`Limite de ${config.maxIssues} tickets atteinte : périmètre « ${scope.label} » ignoré.`);
        continue;
      }
      const result = await searchIssues(env, scope.jql.replace(/\s+/g, " ").trim(), fields, {
        pageSize: config.jiraPageSize,
        maxIssues: remaining,
      });
      for (const issue of result.issues) {
        if (!byKey.has(issue.key)) {
          byKey.set(
            issue.key,
            normalizeIssue(issue, {
              baseUrl: env.baseUrl,
              customFieldIds: config.customFields.map((f) => f.id),
              flaggedFieldId: config.blocked.flaggedFieldId,
              descriptionMaxLength: config.descriptionMaxLength,
            }),
          );
        }
      }
      if (result.invalidCount) {
        warnings.push(`${result.invalidCount} ticket(s) ignoré(s) car leurs données Jira sont invalides (${scope.label}).`);
      }
      if (result.truncated) {
        warnings.push(`Résultats tronqués à ${config.maxIssues} tickets (${scope.label}) : affinez la JQL.`);
      }
    }
    raw = [...byKey.values()];
  }

  const tickets = enrichTickets(raw, config, now).sort(compareDefault);
  return {
    fetchedAt: now.getTime(),
    data: {
      tickets,
      syncedAt: now.toISOString(),
      source,
      jiraBaseUrl,
      warnings,
      config: toPublicConfig(config),
    },
  };
}

/**
 * Point d'entrée unique : renvoie les tickets enrichis, depuis le cache si
 * possible. En cas d'erreur Jira, renvoie les dernières données connues
 * (marquées `stale`) avec le message d'erreur.
 */
export async function getTickets(
  opts: { forceRefresh?: boolean } = {},
  config: PilotageConfig = pilotageConfig,
): Promise<TicketsResponse> {
  const cached = store.__pilotageCache;
  const age = cached ? Date.now() - cached.fetchedAt : Infinity;
  const fresh = age < cacheTtlMs(config);
  const forcedTooSoon = opts.forceRefresh && age < MIN_FORCED_REFRESH_MS;

  if (cached && ((fresh && !opts.forceRefresh) || forcedTooSoon)) {
    return { ...cached.data, stale: false, error: null };
  }

  try {
    // Déduplication : un seul appel Jira en vol, partagé entre requêtes concurrentes.
    store.__pilotageInflight ??= load(config).finally(() => {
      store.__pilotageInflight = undefined;
    });
    const entry = await store.__pilotageInflight;
    store.__pilotageCache = entry;
    return { ...entry.data, stale: false, error: null };
  } catch (err) {
    const message =
      err instanceof JiraError ? err.message : "Erreur inattendue lors de la récupération des tickets Jira.";
    // Journalisation sans données sensibles : type d'erreur + statut uniquement.
    console.error(
      `[pilotage] échec de synchronisation Jira : ${err instanceof JiraError ? `${err.kind}${err.status ? ` (${err.status})` : ""}` : (err as Error)?.name ?? "erreur"}`,
    );
    if (cached) return { ...cached.data, stale: true, error: message };
    return {
      tickets: [],
      syncedAt: new Date().toISOString(),
      source: "jira",
      jiraBaseUrl: null,
      stale: false,
      warnings: [],
      error: message,
      config: toPublicConfig(config),
    };
  }
}

/** Réservé aux tests. */
export function __resetCache() {
  store.__pilotageCache = undefined;
  store.__pilotageInflight = undefined;
}
