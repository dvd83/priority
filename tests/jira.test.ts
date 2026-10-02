import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pilotageConfig } from "@/config/pilotage";
import { readJiraEnv, type JiraEnv } from "@/lib/jira/env";
import { JiraError } from "@/lib/jira/errors";
import { adfToText, fieldToText, normalizeIssue } from "@/lib/jira/normalize";
import { issueSchema } from "@/lib/jira/schema";
import { searchIssues } from "@/lib/jira/search";
import { __resetCache, getTickets } from "@/lib/tickets-service";

const rawIssue = (key: string, extra: Record<string, unknown> = {}) => ({
  id: "1",
  key,
  fields: {
    summary: `Résumé ${key}`,
    priority: { name: "High" },
    status: { name: "En cours", statusCategory: { key: "indeterminate" } },
    assignee: { accountId: "abc", displayName: "Jean Martin", emailAddress: "jean@example.com" },
    reporter: null,
    created: "2026-09-01T10:00:00.000+0200",
    updated: "2026-09-02T10:00:00.000+0200",
    duedate: "2026-10-05",
    issuetype: { name: "Incident" },
    project: { key: "ITS", name: "IT Service" },
    labels: ["infra"],
    components: [{ name: "Réseau" }],
    description: "Une description",
    ...extra,
  },
});

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

const cloudEnv: JiraEnv = {
  baseUrl: "https://acme.atlassian.net",
  deployment: "cloud",
  authType: "basic",
  authorization: "Basic SECRET",
  timeoutMs: 1000,
};

describe("variables d'environnement", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it("détecte Jira Cloud et l'authentification basic", () => {
    process.env.JIRA_BASE_URL = "https://acme.atlassian.net/";
    process.env.JIRA_EMAIL = "me@acme.com";
    process.env.JIRA_API_TOKEN = "tok";
    const r = readJiraEnv();
    expect(r.ok && r.env.deployment).toBe("cloud");
    expect(r.ok && r.env.baseUrl).toBe("https://acme.atlassian.net");
    expect(r.ok && r.env.authorization).toBe(`Basic ${Buffer.from("me@acme.com:tok").toString("base64")}`);
  });

  it("utilise Data Center + bearer (PAT) si JIRA_EMAIL est vide", () => {
    process.env.JIRA_BASE_URL = "https://jira.example.com";
    process.env.JIRA_EMAIL = "";
    process.env.JIRA_API_TOKEN = "pat";
    const r = readJiraEnv();
    expect(r.ok && r.env.deployment).toBe("datacenter");
    expect(r.ok && r.env.authorization).toBe("Bearer pat");
  });

  it("signale les variables manquantes", () => {
    delete process.env.JIRA_BASE_URL;
    delete process.env.JIRA_API_TOKEN;
    const r = readJiraEnv();
    expect(r).toEqual({ ok: false, reason: "missing", missing: ["JIRA_BASE_URL", "JIRA_API_TOKEN"] });
  });
});

describe("normalisation", () => {
  it("normalise une issue Jira validée", () => {
    const issue = issueSchema.parse(rawIssue("ITS-42", { customfield_1: { value: "Équipe A" } }));
    const t = normalizeIssue(issue, {
      baseUrl: "https://jira.example.com",
      customFieldIds: ["customfield_1"],
      flaggedFieldId: "",
      descriptionMaxLength: 100,
    });
    expect(t).toMatchObject({
      key: "ITS-42",
      url: "https://jira.example.com/browse/ITS-42",
      priorityName: "High",
      status: "En cours",
      statusCategory: "indeterminate",
      assignee: { id: "abc", name: "Jean Martin", email: "jean@example.com" },
      dueDate: "2026-10-05",
      components: ["Réseau"],
      customFields: { customfield_1: "Équipe A" },
    });
    expect(t.created).toBe("2026-09-01T08:00:00.000Z");
  });

  it("rejette une issue invalide", () => {
    expect(issueSchema.safeParse({ key: "pas une clé", fields: {} }).success).toBe(false);
  });

  it("convertit l'ADF et les valeurs de champs en texte", () => {
    const adf = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Bonjour" }] },
        { type: "paragraph", content: [{ type: "text", text: "Monde" }] },
      ],
    };
    expect(adfToText(adf).trim()).toBe("Bonjour\nMonde");
    expect(fieldToText(adf)).toBe("Bonjour\nMonde");
    expect(fieldToText([{ value: "A" }, { name: "B" }])).toBe("A, B");
    expect(fieldToText({ value: "Parent", child: { value: "Enfant" } })).toBe("Parent / Enfant");
  });
});

describe("recherche Jira", () => {
  beforeEach(() => vi.useRealTimers());
  afterEach(() => vi.unstubAllGlobals());

  it("pagine via nextPageToken (Cloud) en un appel par page", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ issues: [rawIssue("ITS-1"), rawIssue("ITS-2")], nextPageToken: "p2", isLast: false }))
      .mockResolvedValueOnce(json({ issues: [rawIssue("ITS-3"), { key: "invalide" }], isLast: true }));
    vi.stubGlobal("fetch", fetchMock);

    const r = await searchIssues(cloudEnv, "project = ITS", ["summary"], { pageSize: 2, maxIssues: 100 });
    expect(r.issues.map((i) => i.key)).toEqual(["ITS-1", "ITS-2", "ITS-3"]);
    expect(r.invalidCount).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe("https://acme.atlassian.net/rest/api/2/search/jql");
    expect(JSON.parse(init.body)).toMatchObject({ jql: "project = ITS", nextPageToken: "p2", maxResults: 2 });
  });

  it("pagine via startAt (Data Center)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ issues: [rawIssue("ITS-1")], startAt: 0, total: 2 }))
      .mockResolvedValueOnce(json({ issues: [rawIssue("ITS-2")], startAt: 1, total: 2 }));
    vi.stubGlobal("fetch", fetchMock);
    const r = await searchIssues({ ...cloudEnv, deployment: "datacenter" }, "x", [], { pageSize: 1, maxIssues: 100 });
    expect(r.issues).toHaveLength(2);
    expect(fetchMock.mock.calls[0][0]).toBe("https://acme.atlassian.net/rest/api/2/search");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).startAt).toBe(1);
  });

  it("réessaie après un 429 en respectant Retry-After", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({}, 429, { "Retry-After": "0.01" }))
      .mockResolvedValueOnce(json({ issues: [rawIssue("ITS-1")], isLast: true }));
    vi.stubGlobal("fetch", fetchMock);
    const r = await searchIssues(cloudEnv, "x", [], { pageSize: 50, maxIssues: 100 });
    expect(r.issues).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("renvoie une erreur lisible sans exposer le token (401 / JQL invalide)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ errorMessages: [] }, 401)));
    const err = await searchIssues(cloudEnv, "x", [], { pageSize: 50, maxIssues: 100 }).catch((e) => e);
    expect(err).toBeInstanceOf(JiraError);
    expect(err.kind).toBe("auth");
    expect(err.message).not.toContain("SECRET");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ errorMessages: ["Le champ 'foo' n'existe pas."] }, 400)));
    const err2 = await searchIssues(cloudEnv, "x", [], { pageSize: 50, maxIssues: 100 }).catch((e) => e);
    expect(err2.kind).toBe("bad_request");
    expect(err2.message).toContain("Le champ 'foo' n'existe pas.");
  });
});

describe("service tickets (cache, démo, erreurs)", () => {
  const saved = { ...process.env };
  beforeEach(() => __resetCache());
  afterEach(() => {
    process.env = { ...saved };
    vi.unstubAllGlobals();
  });

  it("sert des données de démonstration si Jira n'est pas configuré", async () => {
    delete process.env.JIRA_BASE_URL;
    delete process.env.JIRA_API_TOKEN;
    const r = await getTickets();
    expect(r.source).toBe("demo");
    expect(r.tickets.length).toBeGreaterThan(10);
    expect(r.warnings[0]).toContain("JIRA_BASE_URL");
  });

  it("met en cache, puis sert les données en cache (stale) si Jira tombe", async () => {
    process.env.JIRA_BASE_URL = "https://acme.atlassian.net";
    process.env.JIRA_EMAIL = "me@acme.com";
    process.env.JIRA_API_TOKEN = "SECRET-TOKEN";
    const fetchMock = vi.fn().mockResolvedValue(json({ issues: [rawIssue("ITS-1")], isLast: true }));
    vi.stubGlobal("fetch", fetchMock);

    const first = await getTickets();
    expect(first.source).toBe("jira");
    expect(first.tickets.map((t) => t.key)).toEqual(["ITS-1"]);
    await getTickets();
    expect(fetchMock).toHaveBeenCalledTimes(pilotageConfig.scopes.length); // 2e appel servi par le cache

    // Le rafraîchissement forcé est limité dans le temps : on simule un cache ancien.
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now + 3_600_000);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({}, 503)));
    const stale = await getTickets({ forceRefresh: true });
    vi.restoreAllMocks();
    expect(stale.stale).toBe(true);
    expect(stale.error).toContain("503");
    expect(stale.tickets).toHaveLength(1);
    expect(JSON.stringify(stale)).not.toContain("SECRET-TOKEN");
  }, 20_000);
});
