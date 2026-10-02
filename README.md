# 🎯 Pilotage IT

Cockpit de pilotage **en lecture seule** des tickets Jira de l'équipe IT.
Jira reste le système de référence : l'application ne fait que lire (recherche JQL) et
ne modifie jamais un ticket.

![stack](https://img.shields.io/badge/Next.js-16-black) ![ts](https://img.shields.io/badge/TypeScript-5.9-blue) ![tw](https://img.shields.io/badge/Tailwind-4-38bdf8)

## Démarrage rapide

Prérequis : **Node.js ≥ 20.9**.

```bash
npm install
cp .env.example .env.local   # puis renseigner les variables (voir ci-dessous)
npm run dev                  # http://localhost:3000
```

Sans variables Jira, l'application démarre en **mode démonstration** (40 tickets fictifs,
bandeau « Démo ») : le dashboard est visible immédiatement.

Production :

```bash
npm run build
npm start                    # http://localhost:3000 (PORT=xxxx pour changer)
```

Autres commandes : `npm test` (tests unitaires), `npm run typecheck`.

## Variables d'environnement

À mettre dans `.env.local` (jamais commité) — elles ne sont lues que côté serveur.

| Variable | Obligatoire | Description |
| --- | --- | --- |
| `JIRA_BASE_URL` | oui | URL de l'instance, ex. `https://jira.example.com` ou `https://societe.atlassian.net` |
| `JIRA_EMAIL` | Cloud | E-mail du compte Atlassian. **Laisser vide** pour Jira Data Center avec un PAT |
| `JIRA_API_TOKEN` | oui | Cloud : API token ([créer](https://id.atlassian.com/manage-profile/security/api-tokens)). Data Center : Personal Access Token |
| `JIRA_DEPLOYMENT` | non | `cloud` ou `datacenter`. Auto : `cloud` si l'URL finit par `atlassian.net` |
| `JIRA_AUTH_TYPE` | non | `basic` (e-mail + token) ou `bearer` (PAT). Auto : `basic` si `JIRA_EMAIL` est renseigné |
| `JIRA_TIMEOUT_MS` | non | Timeout par appel Jira (défaut 20000) |
| `PILOTAGE_CACHE_TTL_SECONDS` | non | Durée du cache serveur (défaut : `cacheTtlSeconds` de la config, 300 s) |
| `PILOTAGE_DEMO_MODE` | non | `true` pour forcer les données de démonstration |

Le compte utilisé n'a besoin que de droits de **lecture** sur les projets concernés.

## Configuration métier — `config/pilotage.ts`

Toutes les règles sont centralisées dans ce fichier (commenté) :

| Clé | Rôle |
| --- | --- |
| `scopes` | Liste de requêtes JQL (périmètre). Ajouter une entrée pour un autre projet ; résultats fusionnés sans doublon |
| `priorityMapping` | Nom de priorité Jira → `P1`…`P4`. Une priorité absente est affichée « non mappée » (jamais inventée) |
| `teams` | Équipes et règles d'appartenance : `project`, `component`, `label`, `assignee`, `issueType`, `customField`, `summary`. La première équipe qui correspond l'emporte |
| `blocked` | Statuts / labels / champ « Flagged » qui rendent un ticket « bloqué » |
| `waitingForCustomer` | Statuts / labels « attente client » |
| `agingThresholds` | Seuils d'ancienneté (`warning` 30 j, `critical` 60 j) |
| `dueSoonDays` | Fenêtre « échéance proche » |
| `scoring` | Points et seuils du score d'aide au pilotage |
| `customFields` | Champs personnalisés à récupérer (affichés dans le détail, utilisables pour les équipes) |
| `maxIssues`, `jiraPageSize`, `cacheTtlSeconds`, `timeZone` | Paramètres techniques |

Les comparaisons de noms ignorent casse et accents (`"Bloqué"` = `"BLOQUE"`).

> Pour identifier les vrais noms de statuts / priorités / composants de votre instance :
> `GET {JIRA_BASE_URL}/rest/api/2/status`, `/rest/api/2/priority`, `/rest/api/2/project/ITS/components`.

## Score et recommandations (aide au pilotage)

Indicateur **calculé par l'application** — il ne modifie pas la priorité Jira et ne constitue
pas une vérité métier. Logique (valeurs par défaut, modifiables) :

```
score = priorité (P1 100 · P2 60 · P3 30 · P4 10 · sans priorité 40)
      + échéance dépassée +40   | échéance ≤ 3 j +20
      + âge ≥ 60 j +30          | âge ≥ 30 j +15
      + sans responsable +20
      + bloqué +25
```

Recommandation (première règle vraie) :

1. ⏳ **En attente** — statut/label d'attente client
2. 🔥 **Action requise** — score ≥ 100
3. 👀 **À arbitrer** — sans priorité, bloqué ou sans responsable
4. 📅 **À planifier** — score ≥ 30
5. 💤 **Backlog** — le reste

Chaque ticket porte son explication, ex. *« Action requise : P2 + échéance dépassée de 3 j + âgé de 47 j »*
(survol du badge, détail dans le panneau latéral). Code : `lib/pilotage/scoring.ts`.

## Fonctionnalités (V1)

- Indicateurs P1 / P2 / P3 / P4 cliquables (filtrent la liste)
- File de priorisation triée par priorité → échéance → ancienneté, tri par colonne, pagination
- Blocs d'attention : sans responsable, sans priorité, anciens, en retard, bloqués, attente client
- Vue par équipe (ouverts, P1/P2, > 30 j, sans responsable), cellules cliquables
- Onglets d'équipe, filtres rapides et filtres détaillés (priorité, équipe, état, responsable, type, âge, échéance, recherche) — instantanés côté navigateur
- Panneau de détail en lecture seule + bouton « Ouvrir dans Jira » ; la clé ouvre Jira dans un nouvel onglet
- Bouton « Actualiser », heure de dernière synchronisation, thème clair / sombre
- Desktop, laptop et tablette

## Architecture

```
config/pilotage.ts          ← règles métier modifiables
app/
  page.tsx                  ← page (données chargées côté serveur → affichage immédiat)
  api/tickets/route.ts      ← GET /api/tickets[?refresh=1] (lecture seule)
lib/
  jira/                     ← SERVEUR UNIQUEMENT (import "server-only")
    env.ts                    variables d'environnement, en-tête d'auth
    http.ts                   fetch + timeout + retries (429/5xx, Retry-After)
    search.ts                 recherche JQL paginée (Cloud : /search/jql + nextPageToken ; DC : /search + startAt)
    schema.ts                 validation zod des réponses Jira
    normalize.ts              issue Jira → JiraTicket (ADF → texte, champs perso)
    errors.ts                 erreurs lisibles, sans secret
  pilotage/                 ← logique pure, testée (partagée serveur / navigateur)
    priority.ts teams.ts scoring.ts enrich.ts filters.ts
  tickets-service.ts        ← cache mémoire, déduplication, repli sur cache si Jira KO
  demo/demo-data.ts         ← données de démonstration
components/dashboard/       ← interface (Header, KpiCards, FilterBar, TicketTable, TicketDrawer…)
tests/                      ← Vitest
```

### Performances et robustesse

- Un appel de recherche **par page de 100 tickets**, jamais par ticket ; uniquement les champs utiles.
- Cache serveur (5 min par défaut), requêtes concurrentes dédupliquées, « Actualiser » limité à 1 synchro / 10 s.
- Timeout par appel, 3 nouvelles tentatives avec backoff sur 429 / 502 / 503 / 504 en respectant `Retry-After`.
- Si Jira est indisponible, les dernières données connues restent affichées avec un bandeau d'erreur.
- Réponses Jira validées (zod) ; les tickets invalides sont ignorés et signalés.

### Sécurité

- Credentials uniquement dans les variables d'environnement serveur, jamais préfixées `NEXT_PUBLIC_`.
- Les modules Jira importent `server-only` : impossible de les embarquer côté navigateur.
- Le token n'est jamais loggé ni renvoyé ; les logs ne contiennent que le type d'erreur et le code HTTP.
- Aucun endpoint d'écriture ; seules des requêtes de recherche sont émises vers Jira.
- Pas d'authentification applicative en V1 : à déployer sur le réseau interne uniquement
  (ou derrière un reverse proxy / SSO).

## Pistes d'évolution

La séparation `lib/jira` (lecture) / `lib/pilotage` (règles pures) / `components` permet d'ajouter :
plusieurs projets (nouveaux `scopes`), historisation (persister les snapshots produits par
`tickets-service`), statistiques de backlog, SLA (champs personnalisés Jira Service Management),
capacité des équipes, priorisation avancée ou recommandations IA (nouveau module dans `lib/pilotage`).
