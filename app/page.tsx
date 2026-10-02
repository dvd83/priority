import { Dashboard } from "@/components/dashboard/Dashboard";
import { getTickets } from "@/lib/tickets-service";

export const dynamic = "force-dynamic";

/** Page principale : les données sont chargées côté serveur pour un affichage immédiat. */
export default async function Page() {
  const initialData = await getTickets();
  return <Dashboard initialData={initialData} />;
}
