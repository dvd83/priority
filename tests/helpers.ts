import type { JiraTicket } from "@/lib/types";

export function makeTicket(overrides: Partial<JiraTicket> = {}): JiraTicket {
  return {
    key: "ITS-1",
    url: "https://jira.example.com/browse/ITS-1",
    summary: "Test",
    description: null,
    priorityName: "Medium",
    status: "Ouvert",
    statusCategory: "new",
    assignee: { id: "u1", name: "Jean" },
    reporter: null,
    created: "2026-10-01T08:00:00.000Z",
    updated: "2026-10-01T08:00:00.000Z",
    dueDate: null,
    issueType: "Incident",
    projectKey: "ITS",
    projectName: "IT Service",
    labels: [],
    components: [],
    customFields: {},
    flagged: false,
    ...overrides,
  };
}

export const NOW = new Date("2026-10-02T10:00:00.000Z");
