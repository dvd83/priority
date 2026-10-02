/**
 * ============================================================================
 *  CONFIGURATION CENTRALE DU COCKPIT « PILOTAGE IT »
 * ============================================================================
 *
 *  Toutes les règles métier modifiables sont ici : périmètre JQL, mapping des
 *  priorités, équipes, statuts « bloqué » / « attente client », seuils
 *  d'ancienneté et règles de scoring.
 *
 *  Les comparaisons de noms (statuts, priorités, labels, composants…) ignorent
 *  la casse et les accents : "En attente client" == "EN ATTENTE CLIENT"
 *  == "en attente client".
 *
 *  Rappel : l'application est READ-ONLY. Rien ici ne modifie Jira.
 * ============================================================================
 */

import type { PilotageConfig } from "@/lib/pilotage/config-types";

export const pilotageConfig: PilotageConfig = {
  // --------------------------------------------------------------------------
  // PÉRIMÈTRE
  // --------------------------------------------------------------------------
  // Chaque périmètre est une requête JQL. Les résultats sont fusionnés (sans
  // doublon). Pour ajouter un projet : ajouter une entrée ou élargir la JQL.
  scopes: [
    {
      id: "its",
      label: "IT Service (ITS)",
      jql: `project = ITS
        AND issuetype IN ("Demande de Service", "Demande de service avec approbations", Incident, "Problème", "Sous-tâche")
        AND statusCategory != Done`,
    },
    // {
    //   id: "infra",
    //   label: "Projet Infra",
    //   jql: `project = INFRA AND statusCategory != Done`,
    // },
  ],

  // Nombre max de tickets récupérés (toutes JQL confondues) — garde-fou.
  maxIssues: 3000,

  // Taille de page des appels de recherche Jira (Jira plafonne en général à 100).
  jiraPageSize: 100,

  // Durée de vie du cache serveur (secondes). Le bouton « Actualiser » le contourne.
  cacheTtlSeconds: 300,

  // Fuseau horaire utilisé pour les calculs « en retard » / « âge » en jours.
  timeZone: "Europe/Paris",

  // Longueur max de la description conservée (caractères) pour limiter le volume.
  descriptionMaxLength: 4000,

  // --------------------------------------------------------------------------
  // CHAMPS PERSONNALISÉS (optionnel)
  // --------------------------------------------------------------------------
  // Ajoutés à la requête de recherche et disponibles dans `ticket.customFields`
  // (affichés dans le panneau de détail). Utilisables aussi pour les équipes.
  // Trouver l'id : Jira > Paramètres > Champs personnalisés, ou /rest/api/2/field
  customFields: [
    // { id: "customfield_10050", label: "Impact" },
    // { id: "customfield_10051", label: "Équipe" },
  ],

  // --------------------------------------------------------------------------
  // PRIORITÉS
  // --------------------------------------------------------------------------
  // Nom de priorité Jira → niveau de pilotage. Les priorités absentes de ce
  // mapping sont classées « Non mappée » (visibles, jamais inventées).
  priorityMapping: {
    Highest: "P1",
    Critique: "P1",
    Critical: "P1",
    Blocker: "P1",
    Bloquant: "P1",
    High: "P2",
    Haute: "P2",
    Majeur: "P2",
    Major: "P2",
    Medium: "P3",
    Moyenne: "P3",
    Normal: "P3",
    Low: "P4",
    Basse: "P4",
    Lowest: "P4",
    "La plus basse": "P4",
    Minor: "P4",
    Mineur: "P4",
    Trivial: "P4",
  },

  // Libellés et ordre d'affichage des niveaux (ne pas renommer les clés P1..P4).
  priorityLevels: {
    P1: { label: "Critique", emoji: "🔴" },
    P2: { label: "Prioritaire", emoji: "🟠" },
    P3: { label: "À planifier", emoji: "🟡" },
    P4: { label: "Backlog", emoji: "⚪" },
  },

  // --------------------------------------------------------------------------
  // ÉQUIPES
  // --------------------------------------------------------------------------
  // La première équipe dont UNE règle correspond gagne (ordre important).
  // Types de règles possibles :
  //   project      → clé du projet (ex. "ITS")
  //   component    → nom d'un composant
  //   label        → label Jira
  //   assignee     → nom affiché, e-mail ou accountId/username du responsable
  //   issueType    → type de ticket
  //   customField  → valeur d'un champ personnalisé (préciser `fieldId`)
  //   summary      → mot-clé contenu dans le résumé (dernier recours)
  teams: [
    {
      id: "infra",
      label: "Infrastructure",
      shortLabel: "Infra",
      rules: [
        { type: "component", values: ["Infrastructure", "Infra", "Serveurs", "Stockage", "Sauvegarde", "Virtualisation", "SAP Basis"] },
        { type: "label", values: ["infra", "infrastructure", "serveur", "vmware", "veeam", "backup"] },
      ],
    },
    {
      id: "reseau",
      label: "Réseau",
      shortLabel: "Réseau",
      rules: [
        { type: "component", values: ["Réseau", "Network", "Télécom", "Sécurité réseau", "Firewall", "VPN", "Wifi"] },
        { type: "label", values: ["reseau", "network", "firewall", "vpn", "wifi", "switch"] },
      ],
    },
    {
      id: "servicedesk",
      label: "Service Desk",
      shortLabel: "Service Desk",
      rules: [
        { type: "component", values: ["Service Desk", "Support", "Poste de travail", "Téléphonie", "Applications"] },
        { type: "label", values: ["servicedesk", "support", "poste", "n1"] },
        // Par défaut, les demandes de service non classées vont au Service Desk.
        { type: "issueType", values: ["Demande de Service", "Demande de service avec approbations"] },
      ],
    },
  ],
  // Libellé des tickets qui ne correspondent à aucune équipe.
  unassignedTeamLabel: "Non classé",

  // --------------------------------------------------------------------------
  // TICKETS BLOQUÉS
  // --------------------------------------------------------------------------
  // Un ticket est « bloqué » si au moins une condition est vraie.
  blocked: {
    statuses: ["Bloqué", "Blocked", "Suspendu", "On hold", "En pause"],
    labels: ["bloque", "blocked", "blocage"],
    // Champ « Flagged / Signalé » de Jira (Cloud : souvent customfield_10021).
    // Laisser vide si inconnu.
    flaggedFieldId: "",
  },

  // --------------------------------------------------------------------------
  // EN ATTENTE CLIENT / TIERS
  // --------------------------------------------------------------------------
  waitingForCustomer: {
    statuses: [
      "Attente client",
      "En attente client",
      "En attente du client",
      "Waiting for customer",
      "Waiting for support",
      "En attente",
      "Pending",
      "En attente fournisseur",
      "Attente fournisseur",
      "Waiting for third party",
    ],
    labels: ["attente-client", "waiting-customer"],
  },

  // --------------------------------------------------------------------------
  // ANCIENNETÉ (jours depuis la création)
  // --------------------------------------------------------------------------
  agingThresholds: {
    warning: 30, // « Ticket ancien »
    critical: 60, // « Ticket très ancien »
  },

  // Une échéance est « proche » si elle tombe dans les N jours.
  dueSoonDays: 3,

  // --------------------------------------------------------------------------
  // SCORING D'AIDE AU PILOTAGE
  // --------------------------------------------------------------------------
  // Indicateur calculé par l'application, SANS effet sur Jira et sans valeur
  // de vérité métier. score = points de priorité + somme des bonus applicables.
  scoring: {
    priorityPoints: {
      P1: 100,
      P2: 60,
      P3: 30,
      P4: 10,
      NONE: 40, // sans priorité ou priorité non mappée : à qualifier
    },
    bonus: {
      overdue: 40, // échéance dépassée
      dueSoon: 20, // échéance dans `dueSoonDays` jours
      agingWarning: 15, // âge ≥ agingThresholds.warning
      agingCritical: 30, // âge ≥ agingThresholds.critical (remplace agingWarning)
      unassigned: 20, // aucun responsable
      blocked: 25, // ticket bloqué
    },
    // Seuils de recommandation (voir lib/pilotage/scoring.ts pour l'ordre d'application).
    thresholds: {
      actionRequired: 100, // score ≥ 100 → 🔥 Action requise
      toPlan: 30, // score ≥ 30 → 📅 À planifier (sinon 💤 Backlog)
    },
  },
};
