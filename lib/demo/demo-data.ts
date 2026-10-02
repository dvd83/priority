/**
 * Données de démonstration — utilisées uniquement quand Jira n'est pas
 * configuré (ou si PILOTAGE_DEMO_MODE=true). Elles permettent de voir le
 * cockpit immédiatement. Générées de façon déterministe, relativement à « maintenant ».
 */
import type { JiraTicket, Person } from "@/lib/types";

const DAY = 86_400_000;

const people: Person[] = [
  { id: "u-jean", name: "Jean Martin", email: "jean.martin@example.com" },
  { id: "u-paul", name: "Paul Durand", email: "paul.durand@example.com" },
  { id: "u-sophie", name: "Sophie Bernard", email: "sophie.bernard@example.com" },
  { id: "u-karim", name: "Karim Haddad", email: "karim.haddad@example.com" },
  { id: "u-lea", name: "Léa Petit", email: "lea.petit@example.com" },
  { id: "u-marc", name: "Marc Lefèvre", email: "marc.lefevre@example.com" },
];
const reporters: Person[] = [
  { id: "r-compta", name: "Claire Dubois (Comptabilité)" },
  { id: "r-rh", name: "Nicolas Moreau (RH)" },
  { id: "r-log", name: "Isabelle Roux (Logistique)" },
  { id: "r-dir", name: "Direction Générale" },
];

type Seed = [
  summary: string,
  priority: string | null,
  status: string,
  category: "new" | "indeterminate",
  assignee: number | null,
  ageDays: number,
  dueOffsetDays: number | null,
  type: string,
  components: string[],
  labels: string[],
];

const SEEDS: Seed[] = [
  ["SAP - Ajout transaction VF11", "Highest", "Escaladé", "indeterminate", 0, 0, null, "Incident", ["SAP Basis"], []],
  ["Installation Veeam SAP HANA", "Highest", "À affecter", "new", null, 1, null, "Demande de Service", ["Sauvegarde"], ["veeam"]],
  ["Migration VCF9", "High", "Attente client", "indeterminate", 1, 1, 3, "Demande de Service", ["Virtualisation"], []],
  ["Coupure VPN site de Lyon", "Highest", "En cours", "indeterminate", 3, 0, 0, "Incident", ["VPN"], ["reseau"]],
  ["Saturation datastore PROD-02", "High", "En cours", "indeterminate", 2, 4, -2, "Incident", ["Stockage"], []],
  ["Renouvellement certificat wildcard", "High", "Ouvert", "new", null, 12, -1, "Demande de Service", ["Infrastructure"], []],
  ["Création compte nouvel arrivant - Compta", "Medium", "Ouvert", "new", 4, 2, 5, "Demande de Service", ["Poste de travail"], []],
  ["Imprimante 2e étage hors service", "Medium", "En cours", "indeterminate", 4, 3, null, "Incident", ["Support"], []],
  ["Remplacement switch cœur de réseau bât. B", "High", "Bloqué", "indeterminate", 3, 47, -6, "Demande de service avec approbations", ["Réseau"], ["switch"]],
  ["Lenteurs Wifi salle de réunion", "Low", "Ouvert", "new", null, 35, null, "Incident", ["Wifi"], []],
  ["Mise à jour firmware firewall", "Medium", "En attente fournisseur", "indeterminate", 3, 21, 10, "Demande de Service", ["Firewall"], []],
  ["Analyse incidents récurrents messagerie", "High", "En analyse", "indeterminate", 5, 64, null, "Problème", ["Applications"], []],
  ["Accès dossier partagé RH", "Low", "Attente client", "indeterminate", 4, 9, null, "Demande de Service", ["Support"], []],
  ["Commande 15 laptops pour la logistique", "Medium", "Bloqué", "indeterminate", 5, 40, -12, "Demande de service avec approbations", ["Poste de travail"], ["blocked"]],
  ["Plan de reprise d'activité - test annuel", "Low", "Ouvert", "new", 2, 92, 30, "Demande de Service", ["Infrastructure"], []],
  ["Erreur synchronisation AD / Azure AD", "Highest", "En cours", "indeterminate", 1, 2, null, "Incident", ["Serveurs"], []],
  ["Téléphone fixe accueil ne sonne plus", null, "Ouvert", "new", null, 1, null, "Incident", ["Téléphonie"], []],
  ["Demande installation Visio", "Lowest", "Ouvert", "new", 4, 15, null, "Demande de Service", ["Poste de travail"], []],
  ["Supervision : alerte disque SRV-FILE01", "Medium", "Ouvert", "new", null, 5, 1, "Incident", ["Serveurs"], []],
  ["Extension réseau entrepôt Nord", "Medium", "En cours", "indeterminate", 3, 58, 14, "Demande de service avec approbations", ["Réseau"], []],
  ["Montée de version vCenter", "Low", "Ouvert", "new", 2, 70, null, "Demande de Service", ["Virtualisation"], []],
  ["Sous-tâche : câblage baie B2", "Medium", "À faire", "new", 3, 6, 2, "Sous-tâche", ["Réseau"], []],
  ["Sous-tâche : sauvegarde config switch", "Low", "À faire", "new", null, 6, null, "Sous-tâche", ["Réseau"], []],
  ["Écran noir poste direction", "High", "En cours", "indeterminate", 4, 0, 0, "Incident", ["Poste de travail"], []],
  ["Ouverture de flux vers nouveau SaaS RH", "Medium", "Attente client", "indeterminate", 3, 26, null, "Demande de service avec approbations", ["Firewall"], []],
  ["Nettoyage anciens comptes AD", null, "Ouvert", "new", null, 120, null, "Demande de Service", ["Serveurs"], []],
  ["Problème récurrent coupure Wifi atelier", "High", "Ouvert", "new", null, 33, null, "Problème", ["Wifi"], []],
  ["Restauration fichier supprimé - Compta", "High", "En cours", "indeterminate", 0, 1, 1, "Demande de Service", ["Sauvegarde"], []],
  ["Mise en place MFA comptes admin", "High", "En cours", "indeterminate", 1, 18, 7, "Demande de Service", ["Infrastructure"], []],
  ["Badge accès salle serveur", "Low", "En attente", "indeterminate", 5, 11, null, "Demande de Service", ["Support"], []],
  ["Licence Office manquante stagiaire", "Medium", "Ouvert", "new", 4, 4, null, "Demande de Service", ["Applications"], []],
  ["Latence réseau application WMS", "Highest", "Escaladé", "indeterminate", 3, 3, -1, "Incident", ["Network"], []],
  ["Renouvellement contrat maintenance SAN", "Medium", "Ouvert", "new", 2, 45, -3, "Demande de service avec approbations", ["Stockage"], []],
  ["Smartphone à configurer (DG)", "High", "Ouvert", "new", null, 0, 2, "Demande de Service", ["Téléphonie"], []],
  ["Documenter architecture réseau DMZ", "Lowest", "Ouvert", "new", 3, 140, null, "Demande de Service", ["Réseau"], []],
  ["Mise à jour Windows Server 2016 → 2022", "Medium", "En cours", "indeterminate", 2, 88, 20, "Demande de Service", ["Serveurs"], []],
  ["Scanner réseau non détecté", "Low", "Ouvert", "new", 5, 8, null, "Incident", ["Support"], []],
  ["Ajout VLAN invités", "Medium", "Ouvert", "new", null, 13, null, "Demande de Service", ["Réseau"], []],
  ["Erreur sauvegarde nocturne SQL", "High", "En cours", "indeterminate", 0, 2, null, "Incident", ["Sauvegarde"], []],
  ["Accès VPN prestataire", "Medium", "Attente client", "indeterminate", 3, 7, null, "Demande de service avec approbations", ["VPN"], []],
];

/** Petit PRNG déterministe (mulberry32). */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function buildDemoTickets(baseUrl: string, now: Date = new Date()): JiraTicket[] {
  const rand = rng(42);
  const nowMs = now.getTime();
  return SEEDS.map(([summary, priority, status, category, assignee, ageDays, due, type, components, labels], i) => {
    const key = `ITS-${32229 - i * 3}`;
    const created = nowMs - ageDays * DAY - Math.floor(rand() * 6) * 3_600_000;
    const updated = Math.min(nowMs, created + Math.floor(rand() * Math.max(1, ageDays)) * DAY);
    return {
      key,
      url: `${baseUrl}/browse/${key}`,
      summary,
      description:
        `Ticket de démonstration.\n\nContexte : ${summary}.\n` +
        `Merci de traiter cette demande selon les procédures habituelles.`,
      priorityName: priority,
      status,
      statusCategory: category,
      assignee: assignee === null ? null : people[assignee],
      reporter: reporters[i % reporters.length],
      created: new Date(created).toISOString(),
      updated: new Date(updated).toISOString(),
      dueDate: due === null ? null : isoDate(nowMs + due * DAY),
      issueType: type,
      projectKey: "ITS",
      projectName: "IT Service",
      labels,
      components,
      customFields: {},
      flagged: false,
    };
  });
}
