import "server-only";

/**
 * Lecture des variables d'environnement Jira. Ce module est strictement
 * serveur (`server-only`) : le token ne peut pas être importé côté navigateur.
 */

export type JiraDeployment = "cloud" | "datacenter";
export type JiraAuthType = "basic" | "bearer";

export interface JiraEnv {
  baseUrl: string;
  deployment: JiraDeployment;
  authType: JiraAuthType;
  /** En-tête Authorization prêt à l'emploi — ne jamais logger ni renvoyer au client. */
  authorization: string;
  timeoutMs: number;
}

export type JiraEnvResult =
  | { ok: true; env: JiraEnv }
  | { ok: false; reason: "missing"; missing: string[] }
  | { ok: false; reason: "invalid"; message: string };

export function isDemoForced(): boolean {
  return (process.env.PILOTAGE_DEMO_MODE ?? "").toLowerCase() === "true";
}

export function readJiraEnv(): JiraEnvResult {
  const rawUrl = (process.env.JIRA_BASE_URL ?? "").trim();
  const email = (process.env.JIRA_EMAIL ?? "").trim();
  const token = (process.env.JIRA_API_TOKEN ?? "").trim();

  const missing: string[] = [];
  if (!rawUrl) missing.push("JIRA_BASE_URL");
  if (!token) missing.push("JIRA_API_TOKEN");
  if (missing.length) return { ok: false, reason: "missing", missing };

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "invalid", message: "JIRA_BASE_URL n'est pas une URL valide." };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, reason: "invalid", message: "JIRA_BASE_URL doit commencer par https://" };
  }
  const baseUrl = `${url.origin}${url.pathname.replace(/\/+$/, "")}`;

  const deploymentVar = (process.env.JIRA_DEPLOYMENT ?? "").trim().toLowerCase();
  const deployment: JiraDeployment =
    deploymentVar === "cloud" || deploymentVar === "datacenter"
      ? deploymentVar
      : deploymentVar === "server"
        ? "datacenter"
        : url.hostname.endsWith(".atlassian.net")
          ? "cloud"
          : "datacenter";

  const authVar = (process.env.JIRA_AUTH_TYPE ?? "").trim().toLowerCase();
  const authType: JiraAuthType = authVar === "basic" || authVar === "bearer" ? authVar : email ? "basic" : "bearer";
  if (authType === "basic" && !email) {
    return { ok: false, reason: "missing", missing: ["JIRA_EMAIL"] };
  }

  const authorization =
    authType === "basic" ? `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}` : `Bearer ${token}`;

  const timeout = Number(process.env.JIRA_TIMEOUT_MS);
  const timeoutMs = Number.isFinite(timeout) && timeout >= 1000 ? timeout : 20_000;

  return { ok: true, env: { baseUrl, deployment, authType, authorization, timeoutMs } };
}
