import type { CompetitionReportData, StageReportData } from "@/lib/rapports/types";

export const MOCK_STAGE_U18_ID = "mock-stage-u18-mai-2026";
export const MOCK_COMPETITION_ID = "mock-competition-casablanca-2026";

const JOUEURS_U18 = [
  { id: "j1", nom: "Alaoui", prenom: "Youssef", sexe: "M", categorie: "U18" },
  { id: "j2", nom: "Benjelloun", prenom: "Karim", sexe: "M", categorie: "U18" },
  { id: "j3", nom: "Chraibi", prenom: "Amine", sexe: "M", categorie: "U18" },
  { id: "j4", nom: "El Fassi", prenom: "Mehdi", sexe: "M", categorie: "U18" },
  { id: "j5", nom: "Idrissi", prenom: "Omar", sexe: "M", categorie: "U18" },
  { id: "j6", nom: "Lahlou", prenom: "Rachid", sexe: "M", categorie: "U18" },
  { id: "j7", nom: "Mansouri", prenom: "Hassan", sexe: "M", categorie: "U18" },
  { id: "j8", nom: "Bennani", prenom: "Sara", sexe: "F", categorie: "U18" },
  { id: "j9", nom: "Tazi", prenom: "Lina", sexe: "F", categorie: "U18" },
  { id: "j10", nom: "Ziani", prenom: "Nadia", sexe: "F", categorie: "U18" },
  { id: "j11", nom: "Ouazzani", prenom: "Adam", sexe: "M", categorie: "U18" },
  { id: "j12", nom: "Berrada", prenom: "Ilyas", sexe: "M", categorie: "U18" },
];

const COACHS = [
  { id: "c1", nom: "Benkirane", prenom: "Ahmed" },
  { id: "c2", nom: "Sefrioui", prenom: "Khalid" },
  { id: "c3", nom: "Amrani", prenom: "Nabil" },
];

/** Stage National U18 — Mai 2026 (~85 400 MAD) */
export function getMockStageU18Report(): StageReportData {
  const montantHebergement = 34_200;
  const montantRestauration = 31_800;
  const montantTerrains = 14_400;
  const montantKine = 3_000;
  const montantAutres = 2_000;
  const montantTotal =
    montantHebergement + montantRestauration + montantTerrains + montantKine + montantAutres;

  return {
    kind: "stage",
    entity_id: MOCK_STAGE_U18_ID,
    titre: "Stage National U18 — Mai 2026",
    categorie: "U18",
    lieu: "Complexe FRMT",
    date_debut: "2026-05-04",
    date_fin: "2026-05-17",
    statut: "termine",
    responsable: "S. Abderrazzaq",
    participants: [
      ...JOUEURS_U18.map((j, idx) => ({
        id: j.id,
        nom: j.nom,
        prenom: j.prenom,
        role: "joueur" as const,
        categorie: j.categorie,
        sexe: j.sexe,
        presence_pct: 90 + (idx % 8),
      })),
      ...COACHS.map((c) => ({
        id: c.id,
        nom: c.nom,
        prenom: c.prenom,
        role: "entraineur" as const,
        presence_pct: 100,
      })),
    ],
    restauration: {
      date_debut: "2026-05-04",
      date_fin: "2026-05-17",
      total_repas: 546,
      pdj: 182,
      dej: 182,
      diner: 182,
      montant_mad: montantRestauration,
    },
    hebergement: {
      date_debut: "2026-05-04",
      date_fin: "2026-05-17",
      nuits: 13,
      chambres_joueurs: 8,
      chambres_coachs: 3,
      taux_occupation_pct: 92,
      montant_mad: montantHebergement,
    },
    terrains: {
      seances: 24,
      heures: 96,
      terrains_utilises: ["Court central", "Court 2", "Court 3", "Court couvert"],
      montant_mad: montantTerrains,
    },
    kinesitherapie: {
      seances: 36,
      joueurs_suivis: 9,
      blessures_signalees: 2,
      notes: "Suivi préventif renforcé en fin de stage. Deux entorses légères prises en charge.",
    },
    financier: {
      montant_hebergement: montantHebergement,
      montant_restauration: montantRestauration,
      montant_terrains: montantTerrains,
      montant_kinesitherapie: montantKine,
      montant_autres: montantAutres,
      montant_total: montantTotal,
      repartition: [
        { label: "Hébergement", montant: montantHebergement, pct: 40 },
        { label: "Restauration", montant: montantRestauration, pct: 37 },
        { label: "Terrains", montant: montantTerrains, pct: 17 },
        { label: "Kinésithérapie", montant: montantKine, pct: 4 },
        { label: "Autres", montant: montantAutres, pct: 2 },
      ],
    },
    resultats: [
      { joueur: "Youssef Alaoui", epreuve: "Matchs internes", resultat: "12V / 3D", classement: "1er" },
      { joueur: "Sara Bennani", epreuve: "Matchs internes", resultat: "10V / 5D", classement: "2e" },
      { joueur: "Karim Benjelloun", epreuve: "Tests physiques", resultat: "Progression +8%", classement: "—" },
      { joueur: "Lina Tazi", epreuve: "Tests physiques", resultat: "Progression +6%", classement: "—" },
    ],
    recommandations:
      "Prévoir une séance kiné quotidienne pour les catégories U18 lors des stages de plus de 10 jours. Renforcer le suivi nutritionnel.",
    kpis: [
      { label: "Joueurs", value: "12", sub: "3F / 9M" },
      { label: "Entraîneurs", value: "3" },
      { label: "Séances", value: "24", sub: "96 h terrains" },
      { label: "Budget total", value: `${montantTotal.toLocaleString("fr-FR")} MAD` },
    ],
  };
}

/** Compétition sample — Open de Casablanca U18 */
export function getMockCompetitionReport(): CompetitionReportData {
  const montantTotal = 62_500;
  return {
    kind: "competition",
    entity_id: MOCK_COMPETITION_ID,
    titre: "Open de Casablanca U18 — Juin 2026",
    categorie: "U18",
    lieu: "Casablanca",
    date_debut: "2026-06-10",
    date_fin: "2026-06-15",
    statut: "a_venir",
    participants: JOUEURS_U18.slice(0, 6).map((j) => ({
      id: j.id,
      nom: j.nom,
      prenom: j.prenom,
      role: "joueur" as const,
      categorie: j.categorie,
      sexe: j.sexe,
    })),
    restauration: {
      date_debut: "2026-06-10",
      date_fin: "2026-06-15",
      total_repas: 90,
      pdj: 30,
      dej: 30,
      diner: 30,
      montant_mad: 18_500,
    },
    hebergement: {
      date_debut: "2026-06-10",
      date_fin: "2026-06-15",
      nuits: 5,
      chambres_joueurs: 4,
      chambres_coachs: 2,
      taux_occupation_pct: 85,
      montant_mad: 22_000,
    },
    terrains: {
      seances: 0,
      heures: 0,
      terrains_utilises: ["Complexe hôte"],
      montant_mad: 8_000,
    },
    kinesitherapie: {
      seances: 8,
      joueurs_suivis: 4,
      blessures_signalees: 0,
    },
    financier: {
      montant_hebergement: 22_000,
      montant_restauration: 18_500,
      montant_terrains: 8_000,
      montant_kinesitherapie: 4_000,
      montant_autres: 10_000,
      montant_total: montantTotal,
      repartition: [
        { label: "Hébergement", montant: 22_000, pct: 35 },
        { label: "Restauration", montant: 18_500, pct: 30 },
        { label: "Transport", montant: 10_000, pct: 16 },
        { label: "Terrains", montant: 8_000, pct: 13 },
        { label: "Kinésithérapie", montant: 4_000, pct: 6 },
      ],
    },
    resultats: [],
    recommandations: "Valider les visas et billets 3 semaines avant le départ.",
    kpis: [
      { label: "Participants", value: "6" },
      { label: "Encadrement", value: "2 coaches" },
      { label: "Durée", value: "6 jours" },
      { label: "Budget prévu", value: `${montantTotal.toLocaleString("fr-FR")} MAD` },
    ],
  };
}
