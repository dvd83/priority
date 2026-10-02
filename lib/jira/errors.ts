export type JiraErrorKind =
  | "config"
  | "auth"
  | "forbidden"
  | "bad_request"
  | "rate_limited"
  | "timeout"
  | "network"
  | "server"
  | "invalid_response";

/**
 * Erreur Jira présentable à l'utilisateur. Le message ne contient jamais de
 * credentials : il est construit à partir du code HTTP et des messages
 * d'erreur fonctionnels renvoyés par Jira (ex. erreur de syntaxe JQL).
 */
export class JiraError extends Error {
  constructor(
    public readonly kind: JiraErrorKind,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "JiraError";
  }
}

export function messageForStatus(status: number, details: string[]): { kind: JiraErrorKind; message: string } {
  const suffix = details.length ? ` — ${details.slice(0, 3).join(" ; ")}` : "";
  if (status === 400) return { kind: "bad_request", message: `Requête refusée par Jira (JQL invalide ?)${suffix}` };
  if (status === 401)
    return { kind: "auth", message: "Authentification Jira refusée : vérifiez JIRA_EMAIL et JIRA_API_TOKEN." };
  if (status === 403)
    return { kind: "forbidden", message: `Accès refusé par Jira : droits insuffisants sur le projet.${suffix}` };
  if (status === 404)
    return { kind: "config", message: "API Jira introuvable : vérifiez JIRA_BASE_URL (et JIRA_DEPLOYMENT)." };
  if (status === 429) return { kind: "rate_limited", message: "Limite d'appels Jira atteinte. Réessayez dans quelques instants." };
  return { kind: "server", message: `Jira a répondu avec une erreur ${status}.${suffix}` };
}

/** Extrait les messages d'erreur fonctionnels d'une réponse d'erreur Jira. */
export function extractJiraErrorDetails(body: unknown): string[] {
  if (!body || typeof body !== "object") return [];
  const b = body as { errorMessages?: unknown; errors?: unknown; message?: unknown };
  const out: string[] = [];
  if (Array.isArray(b.errorMessages)) out.push(...b.errorMessages.filter((m): m is string => typeof m === "string"));
  if (b.errors && typeof b.errors === "object") {
    for (const v of Object.values(b.errors)) if (typeof v === "string") out.push(v);
  }
  if (typeof b.message === "string") out.push(b.message);
  return out.map((m) => m.slice(0, 300));
}
