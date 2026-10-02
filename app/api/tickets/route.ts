import { NextResponse, type NextRequest } from "next/server";
import { getTickets } from "@/lib/tickets-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/tickets           → tickets (cache serveur)
 * GET /api/tickets?refresh=1 → force une synchronisation Jira
 *
 * Endpoint en lecture seule : aucune méthode d'écriture n'est exposée.
 */
export async function GET(request: NextRequest) {
  const forceRefresh = request.nextUrl.searchParams.get("refresh") === "1";
  const data = await getTickets({ forceRefresh });
  const status = data.error && data.tickets.length === 0 ? 502 : 200;
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
