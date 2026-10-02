import type { JiraTicket, Person, StatusCategory } from "@/lib/types";
import type { RawIssue } from "./schema";

type RawUser = RawIssue["fields"]["assignee"];

function toPerson(u: RawUser): Person | null {
  if (!u) return null;
  const id = u.accountId ?? u.name ?? u.key ?? u.emailAddress ?? u.displayName;
  if (!id) return null;
  return { id, name: u.displayName ?? u.name ?? id, email: u.emailAddress || undefined };
}

function toStatusCategory(key: string | undefined): StatusCategory {
  return key === "new" || key === "indeterminate" || key === "done" ? key : "unknown";
}

/** Convertit un document ADF (Atlassian Document Format) en texte brut. */
export function adfToText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as { type?: string; text?: string; content?: unknown[]; attrs?: { text?: string } };
  if (n.type === "text") return n.text ?? "";
  if (n.type === "hardBreak") return "\n";
  if (n.type === "mention" || n.type === "emoji") return n.attrs?.text ?? "";
  const inner = Array.isArray(n.content) ? n.content.map(adfToText).join("") : "";
  const blocks = ["paragraph", "heading", "listItem", "codeBlock", "blockquote", "tableRow", "rule"];
  return n.type && blocks.includes(n.type) ? `${inner}\n` : inner;
}

/** Valeur de champ (standard ou personnalisé) → texte lisible. */
export function fieldToText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const parts = value.map(fieldToText).filter((v): v is string => !!v);
    return parts.length ? parts.join(", ") : null;
  }
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    if (o.type === "doc") return adfToText(o).trim() || null;
    for (const k of ["value", "displayName", "name", "key"]) {
      if (typeof o[k] === "string") {
        const child = o.child && typeof o.child === "object" ? fieldToText(o.child) : null;
        return child ? `${o[k]} / ${child}` : (o[k] as string);
      }
    }
  }
  return null;
}

function cleanText(value: string, max: number): string {
  // Retire les caractères de contrôle (hors retours à la ligne / tabulations).
  // eslint-disable-next-line no-control-regex
  const clean = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

function isValidDate(value: string | null | undefined): value is string {
  return !!value && !Number.isNaN(Date.parse(value));
}

export interface NormalizeOptions {
  baseUrl: string;
  customFieldIds: string[];
  flaggedFieldId: string;
  descriptionMaxLength: number;
}

/** Transforme une issue Jira validée en ticket applicatif. */
export function normalizeIssue(issue: RawIssue, opts: NormalizeOptions): JiraTicket {
  const f = issue.fields;
  const description = fieldToText(f.description);
  const now = new Date().toISOString();

  const customFields: Record<string, string | null> = {};
  for (const id of opts.customFieldIds) customFields[id] = fieldToText(f[id]);

  const flaggedRaw = opts.flaggedFieldId ? f[opts.flaggedFieldId] : null;
  const flagged = Array.isArray(flaggedRaw) ? flaggedRaw.length > 0 : !!flaggedRaw;

  return {
    key: issue.key,
    url: `${opts.baseUrl}/browse/${encodeURIComponent(issue.key)}`,
    summary: cleanText(f.summary ?? "(sans résumé)", 500),
    description: description ? cleanText(description, opts.descriptionMaxLength) : null,
    priorityName: f.priority?.name ?? null,
    status: f.status?.name ?? "Inconnu",
    statusCategory: toStatusCategory(f.status?.statusCategory?.key),
    assignee: toPerson(f.assignee),
    reporter: toPerson(f.reporter),
    created: isValidDate(f.created) ? new Date(f.created).toISOString() : now,
    updated: isValidDate(f.updated) ? new Date(f.updated).toISOString() : now,
    dueDate: f.duedate && /^\d{4}-\d{2}-\d{2}$/.test(f.duedate) ? f.duedate : null,
    issueType: f.issuetype?.name ?? "Inconnu",
    projectKey: f.project?.key ?? issue.key.split("-")[0],
    projectName: f.project?.name ?? f.project?.key ?? "",
    labels: f.labels ?? [],
    components: (f.components ?? []).map((c) => c.name),
    customFields,
    flagged,
  };
}
