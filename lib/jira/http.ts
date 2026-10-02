import "server-only";
import type { JiraEnv } from "./env";
import { extractJiraErrorDetails, JiraError, messageForStatus } from "./errors";

const MAX_RETRIES = 3;
const MAX_RETRY_DELAY_MS = 30_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function retryDelay(attempt: number, retryAfterHeader: string | null): number {
  const retryAfter = Number(retryAfterHeader);
  if (Number.isFinite(retryAfter) && retryAfter > 0) return Math.min(retryAfter * 1000, MAX_RETRY_DELAY_MS);
  // Backoff exponentiel avec gigue : ~1 s, 2 s, 4 s.
  return Math.min(1000 * 2 ** attempt + Math.random() * 250, MAX_RETRY_DELAY_MS);
}

/**
 * Appel HTTP vers l'API REST Jira (lecture seule) avec :
 *  - timeout par requête ;
 *  - nouvelles tentatives sur 429 / 502 / 503 / 504 et erreurs réseau, en
 *    respectant l'en-tête Retry-After ;
 *  - erreurs normalisées, sans jamais exposer l'en-tête d'authentification.
 *
 * Seules les méthodes GET et POST *de recherche* sont utilisées.
 */
export async function jiraRequest<T = unknown>(
  env: JiraEnv,
  path: string,
  init: { method: "GET" | "POST"; body?: unknown },
): Promise<T> {
  const url = `${env.baseUrl}${path}`;
  let lastError: JiraError | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, {
        method: init.method,
        headers: {
          Authorization: env.authorization,
          Accept: "application/json",
          ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
        signal: AbortSignal.timeout(env.timeoutMs),
        cache: "no-store",
      });
    } catch (err) {
      const isTimeout = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
      lastError = isTimeout
        ? new JiraError("timeout", `Jira n'a pas répondu dans le délai imparti (${Math.round(env.timeoutMs / 1000)} s).`)
        : new JiraError("network", "Impossible de joindre Jira : vérifiez JIRA_BASE_URL et l'accès réseau.");
      if (attempt < MAX_RETRIES) {
        await sleep(retryDelay(attempt, null));
        continue;
      }
      throw lastError;
    }

    if (res.ok) {
      try {
        return (await res.json()) as T;
      } catch {
        throw new JiraError("invalid_response", "Réponse Jira illisible (JSON attendu).", res.status);
      }
    }

    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* corps non JSON : ignoré */
    }
    const { kind, message } = messageForStatus(res.status, extractJiraErrorDetails(body));
    lastError = new JiraError(kind, message, res.status);

    const retriable = res.status === 429 || res.status === 502 || res.status === 503 || res.status === 504;
    if (retriable && attempt < MAX_RETRIES) {
      await sleep(retryDelay(attempt, res.headers.get("Retry-After")));
      continue;
    }
    throw lastError;
  }
  throw lastError ?? new JiraError("network", "Erreur Jira inconnue.");
}
