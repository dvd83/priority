import "server-only";
import type { JiraEnv } from "./env";
import { JiraError } from "./errors";
import { jiraRequest } from "./http";
import { cloudSearchPageSchema, dcSearchPageSchema, issueSchema, type RawIssue } from "./schema";

export const STANDARD_FIELDS = [
  "summary",
  "description",
  "priority",
  "status",
  "assignee",
  "reporter",
  "created",
  "updated",
  "duedate",
  "issuetype",
  "project",
  "labels",
  "components",
];

export interface SearchResult {
  issues: RawIssue[];
  invalidCount: number;
  truncated: boolean;
}

/**
 * Recherche JQL paginée : UN appel par page de résultats (jamais un appel par
 * ticket), avec uniquement les champs nécessaires.
 *  - Cloud       : POST /rest/api/2/search/jql (pagination par nextPageToken)
 *  - Data Center : POST /rest/api/2/search     (pagination par startAt)
 * L'API v2 renvoie la description en texte brut ; un document ADF est aussi géré.
 */
export async function searchIssues(
  env: JiraEnv,
  jql: string,
  fields: string[],
  opts: { pageSize: number; maxIssues: number },
): Promise<SearchResult> {
  const issues: RawIssue[] = [];
  let invalidCount = 0;
  let truncated = false;

  const collect = (rawIssues: unknown[]) => {
    for (const raw of rawIssues) {
      const parsed = issueSchema.safeParse(raw);
      if (parsed.success) issues.push(parsed.data);
      else invalidCount++;
    }
  };

  if (env.deployment === "cloud") {
    let nextPageToken: string | undefined;
    do {
      const json = await jiraRequest(env, "/rest/api/2/search/jql", {
        method: "POST",
        body: { jql, fields, maxResults: opts.pageSize, ...(nextPageToken ? { nextPageToken } : {}) },
      });
      const page = cloudSearchPageSchema.safeParse(json);
      if (!page.success) throw new JiraError("invalid_response", "Réponse de recherche Jira inattendue.");
      collect(page.data.issues);
      nextPageToken =
        page.data.isLast === true || page.data.issues.length === 0 ? undefined : page.data.nextPageToken ?? undefined;
      if (issues.length >= opts.maxIssues && nextPageToken) {
        truncated = true;
        break;
      }
    } while (nextPageToken);
  } else {
    let startAt = 0;
    for (;;) {
      const json = await jiraRequest(env, "/rest/api/2/search", {
        method: "POST",
        body: { jql, fields, startAt, maxResults: opts.pageSize },
      });
      const page = dcSearchPageSchema.safeParse(json);
      if (!page.success) throw new JiraError("invalid_response", "Réponse de recherche Jira inattendue.");
      collect(page.data.issues);
      startAt += page.data.issues.length;
      const total = page.data.total ?? startAt;
      if (page.data.issues.length === 0 || startAt >= total) break;
      if (issues.length >= opts.maxIssues) {
        truncated = true;
        break;
      }
    }
  }

  return { issues: issues.slice(0, opts.maxIssues), invalidCount, truncated: truncated || issues.length > opts.maxIssues };
}
