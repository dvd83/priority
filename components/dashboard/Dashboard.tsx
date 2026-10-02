"use client";

import { AlertTriangle, Info } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { formatTime } from "@/lib/format";
import { applyFilters, EMPTY_FILTERS, type FilterState, type QuickFilter } from "@/lib/pilotage/filters";
import type { Ticket, TicketsResponse } from "@/lib/types";
import { AttentionPanel } from "./AttentionPanel";
import { FilterBar } from "./FilterBar";
import { Header } from "./Header";
import { KpiCards } from "./KpiCards";
import { TeamSummary } from "./TeamSummary";
import { TicketDrawer } from "./TicketDrawer";
import { TicketTable } from "./TicketTable";
import { Card, SectionTitle } from "./ui";

export function Dashboard({ initialData }: { initialData: TicketsResponse }) {
  const [data, setData] = useState(initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const { config } = data;

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setClientError(null);
    try {
      const res = await fetch("/api/tickets?refresh=1", { cache: "no-store" });
      const json = (await res.json()) as TicketsResponse;
      setData((prev) => (json.tickets.length || !prev.tickets.length ? json : { ...prev, stale: true, error: json.error }));
    } catch {
      setClientError("Le serveur de l'application est injoignable.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  const updateFilters = useCallback((patch: Partial<FilterState>) => setFilters((f) => ({ ...f, ...patch })), []);

  // Périmètre équipe (onglets du haut) : base des indicateurs et des compteurs.
  const teamScoped = useMemo(
    () => applyFilters(data.tickets, { ...EMPTY_FILTERS, team: filters.team }, config),
    [data.tickets, filters.team, config],
  );
  const filtered = useMemo(() => applyFilters(data.tickets, filters, config), [data.tickets, filters, config]);
  const selected: Ticket | null = useMemo(
    () => data.tickets.find((t) => t.key === selectedKey) ?? null,
    [data.tickets, selectedKey],
  );
  const closeDrawer = useCallback(() => setSelectedKey(null), []);

  const hasUnclassified = data.tickets.some((t) => t.teamId === null);
  const error = clientError ?? data.error;

  return (
    <div className="min-h-screen">
      <Header
        data={data}
        teams={config.teams}
        hasUnclassified={hasUnclassified}
        team={filters.team}
        onTeamChange={(team) => updateFilters({ team })}
        onRefresh={refresh}
        refreshing={refreshing}
      />

      <main className="mx-auto max-w-[1680px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {error && (
          <div role="alert" className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Synchronisation Jira impossible</p>
              <p>{error}</p>
              {data.stale && data.tickets.length > 0 && (
                <p className="mt-1 text-xs opacity-80">
                  Affichage des dernières données connues (synchronisées à {formatTime(data.syncedAt)}).
                </p>
              )}
            </div>
          </div>
        )}
        {data.warnings.map((w) => (
          <div key={w} className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{w}</p>
          </div>
        ))}

        <KpiCards tickets={teamScoped} config={config} active={filters.level} onSelect={(level) => updateFilters({ level })} />

        <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="min-w-0">
            <SectionTitle
              right={
                <span className="text-xs text-slate-400 tabular">
                  {filtered.length} / {teamScoped.length} affichés
                </span>
              }
            >
              File de priorisation
            </SectionTitle>
            <div className="px-5 pb-4">
              <FilterBar tickets={teamScoped} config={config} filters={filters} onChange={updateFilters} />
            </div>
            <TicketTable
              tickets={filtered}
              selectedKey={selectedKey}
              onSelect={(t) => setSelectedKey(t.key)}
              agingWarning={config.agingThresholds.warning}
              agingCritical={config.agingThresholds.critical}
            />
          </Card>

          <div className="grid grid-cols-1 content-start gap-6 lg:grid-cols-2 2xl:grid-cols-1">
            <AttentionPanel
              tickets={teamScoped}
              config={config}
              active={filters.quick}
              onSelect={(quick: QuickFilter) => updateFilters({ quick })}
            />
            <TeamSummary
              tickets={data.tickets}
              config={config}
              activeTeam={filters.team}
              onSelect={(team, quick) => updateFilters({ ...EMPTY_FILTERS, team: team === filters.team && quick === "all" ? "" : team, quick })}
            />
            <p className="px-1 text-[11px] lg:col-span-2 2xl:col-span-1 leading-relaxed text-slate-400 dark:text-slate-500">
              Interface en lecture seule : Jira reste le système de référence. Les recommandations (🔥 👀 📅 ⏳ 💤) sont
              des indicateurs d&apos;aide au pilotage calculés par l&apos;application ; survolez un badge pour voir
              l&apos;explication.
            </p>
          </div>
        </div>
      </main>

      <TicketDrawer ticket={selected} config={config} onClose={closeDrawer} />
    </div>
  );
}

