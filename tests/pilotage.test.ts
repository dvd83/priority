import { describe, expect, it } from "vitest";
import { pilotageConfig } from "@/config/pilotage";
import type { PilotageConfig } from "@/lib/pilotage/config-types";
import { compareDefault, enrichTickets } from "@/lib/pilotage/enrich";
import { applyFilters, EMPTY_FILTERS, NONE } from "@/lib/pilotage/filters";
import { buildPriorityResolver } from "@/lib/pilotage/priority";
import { buildTeamResolver } from "@/lib/pilotage/teams";
import { makeTicket, NOW } from "./helpers";

const enrich = (overrides: Parameters<typeof makeTicket>[0], config: PilotageConfig = pilotageConfig) =>
  enrichTickets([makeTicket(overrides)], config, NOW)[0];

describe("mapping des priorités", () => {
  const resolve = buildPriorityResolver(pilotageConfig);
  it("mappe les priorités Jira configurées, sans tenir compte de la casse", () => {
    expect(resolve("Highest")).toBe("P1");
    expect(resolve("high")).toBe("P2");
    expect(resolve("Medium")).toBe("P3");
    expect(resolve("Low")).toBe("P4");
  });
  it("n'invente pas de niveau pour une priorité inconnue ou absente", () => {
    expect(resolve("Urgentissime")).toBeNull();
    expect(resolve(null)).toBeNull();
  });
});

describe("affectation des équipes", () => {
  const config: PilotageConfig = {
    ...pilotageConfig,
    teams: [
      { id: "a", label: "A", rules: [{ type: "customField", fieldId: "customfield_1", values: ["Équipe A"] }] },
      { id: "b", label: "B", rules: [{ type: "assignee", values: ["paul@example.com"] }] },
      { id: "c", label: "C", rules: [{ type: "project", values: ["NET"] }] },
      { id: "d", label: "D", rules: [{ type: "summary", values: ["vpn"] }] },
    ],
  };
  const resolve = buildTeamResolver(config);
  it("supporte champ personnalisé, assignee, projet et mot-clé", () => {
    expect(resolve(makeTicket({ customFields: { customfield_1: "equipe a" } }))?.id).toBe("a");
    expect(resolve(makeTicket({ assignee: { id: "x", name: "Paul", email: "paul@example.com" } }))?.id).toBe("b");
    expect(resolve(makeTicket({ projectKey: "NET" }))?.id).toBe("c");
    expect(resolve(makeTicket({ summary: "Coupure VPN Lyon" }))?.id).toBe("d");
    expect(resolve(makeTicket({}))).toBeNull();
  });
  it("utilise la configuration par défaut (composant puis label, insensible aux accents)", () => {
    const def = buildTeamResolver(pilotageConfig);
    expect(def(makeTicket({ components: ["reseau"] }))?.id).toBe("reseau");
    expect(def(makeTicket({ labels: ["VMware"] }))?.id).toBe("infra");
  });
});

describe("indicateurs calculés", () => {
  it("calcule âge, retard, ancienneté et absence de responsable", () => {
    const t = enrich({
      created: "2026-08-16T08:00:00.000Z", // 47 jours
      dueDate: "2026-09-29",
      assignee: null,
    });
    expect(t.ageDays).toBe(47);
    expect(t.isOld).toBe(true);
    expect(t.isVeryOld).toBe(false);
    expect(t.dueInDays).toBe(-3);
    expect(t.isOverdue).toBe(true);
    expect(t.isUnassigned).toBe(true);
  });

  it("détecte les tickets bloqués et en attente via la configuration", () => {
    expect(enrich({ status: "BLOQUÉ" }).isBlocked).toBe(true);
    expect(enrich({ labels: ["blocked"] }).isBlocked).toBe(true);
    expect(enrich({ flagged: true }).isBlocked).toBe(true);
    expect(enrich({ status: "En attente client" }).isWaiting).toBe(true);
    expect(enrich({ status: "En cours" }).isWaiting).toBe(false);
  });

  it("classe les tickets sans équipe sous le libellé configuré", () => {
    const t = enrich({ issueType: "Incident" });
    expect(t.teamId).toBeNull();
    expect(t.teamLabel).toBe(pilotageConfig.unassignedTeamLabel);
  });
});

describe("scoring et recommandations", () => {
  it("P1 → action requise", () => {
    const t = enrich({ priorityName: "Highest" });
    expect(t.score).toBe(100);
    expect(t.recommendation).toBe("ACTION");
  });

  it("produit une explication lisible", () => {
    const t = enrich({ priorityName: "High", created: "2026-08-16T08:00:00.000Z", dueDate: "2026-09-29" });
    expect(t.score).toBe(60 + 40 + 15);
    expect(t.recommendation).toBe("ACTION");
    expect(t.explanation).toBe("Action requise : P2 + échéance dépassée de 3 j + âgé de 47 j");
  });

  it("attente client prime sur le score", () => {
    expect(enrich({ priorityName: "Highest", status: "Attente client" }).recommendation).toBe("WAITING");
  });

  it("sans priorité / sans responsable / bloqué → à arbitrer", () => {
    expect(enrich({ priorityName: null }).recommendation).toBe("ARBITRATE");
    expect(enrich({ priorityName: "High", assignee: null }).recommendation).toBe("ARBITRATE");
    expect(enrich({ priorityName: "Medium", status: "Bloqué" }).recommendation).toBe("ARBITRATE");
  });

  it("P3 → à planifier, P4 → backlog", () => {
    expect(enrich({ priorityName: "Medium" }).recommendation).toBe("PLAN");
    expect(enrich({ priorityName: "Low" }).recommendation).toBe("BACKLOG");
  });

  it("les seuils sont configurables", () => {
    const config: PilotageConfig = {
      ...pilotageConfig,
      scoring: { ...pilotageConfig.scoring, thresholds: { actionRequired: 50, toPlan: 5 } },
    };
    expect(enrich({ priorityName: "High" }, config).recommendation).toBe("ACTION");
    expect(enrich({ priorityName: "Low" }, config).recommendation).toBe("PLAN");
  });
});

describe("tri par défaut", () => {
  it("trie par priorité, puis échéance, puis ancienneté", () => {
    const tickets = enrichTickets(
      [
        makeTicket({ key: "ITS-1", priorityName: "Low" }),
        makeTicket({ key: "ITS-2", priorityName: "High", created: "2026-09-01T00:00:00Z" }),
        makeTicket({ key: "ITS-3", priorityName: "High", dueDate: "2026-10-05" }),
        makeTicket({ key: "ITS-4", priorityName: "Highest" }),
        makeTicket({ key: "ITS-5", priorityName: "High", created: "2026-07-01T00:00:00Z" }),
        makeTicket({ key: "ITS-6", priorityName: null }),
        makeTicket({ key: "ITS-7", priorityName: "High", dueDate: "2026-09-30" }),
      ],
      pilotageConfig,
      NOW,
    ).sort(compareDefault);
    expect(tickets.map((t) => t.key)).toEqual(["ITS-4", "ITS-7", "ITS-3", "ITS-5", "ITS-2", "ITS-1", "ITS-6"]);
  });
});

describe("filtres", () => {
  const tickets = enrichTickets(
    [
      makeTicket({ key: "ITS-1", priorityName: "Highest", components: ["Réseau"] }),
      makeTicket({ key: "ITS-2", priorityName: "Low", assignee: null, created: "2026-07-01T00:00:00Z" }),
      makeTicket({ key: "ITS-3", priorityName: "High", dueDate: "2026-09-01", summary: "Migration VCF9" }),
    ],
    pilotageConfig,
    NOW,
  );
  const ctx = { agingThresholds: pilotageConfig.agingThresholds, dueSoonDays: pilotageConfig.dueSoonDays };
  const keys = (f: Partial<typeof EMPTY_FILTERS>) => applyFilters(tickets, { ...EMPTY_FILTERS, ...f }, ctx).map((t) => t.key);

  it("filtres rapides", () => {
    expect(keys({ quick: "p1" })).toEqual(["ITS-1"]);
    expect(keys({ quick: "unassigned" })).toEqual(["ITS-2"]);
    expect(keys({ quick: "old" })).toEqual(["ITS-2"]);
    expect(keys({ quick: "overdue" })).toEqual(["ITS-3"]);
    expect(keys({ quick: "action" })).toEqual(["ITS-1", "ITS-3"]);
  });
  it("filtres combinés", () => {
    expect(keys({ team: "reseau" })).toEqual(["ITS-1"]);
    expect(keys({ team: NONE })).toEqual(["ITS-2", "ITS-3"]);
    expect(keys({ assignee: NONE })).toEqual(["ITS-2"]);
    expect(keys({ due: "with" })).toEqual(["ITS-3"]);
    expect(keys({ age: "gt60" })).toEqual(["ITS-2"]);
    expect(keys({ search: "vcf" })).toEqual(["ITS-3"]);
    expect(keys({ level: "P2", quick: "overdue" })).toEqual(["ITS-3"]);
  });
});
