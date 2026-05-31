/** Types du module Rapports V2 — FRMT */

export type RapportType =
  | "bilan_stage"
  | "hebdomadaire"
  | "mensuel"
  | "annuel"
  | "competition";

export type RapportStatut = "brouillon" | "genere" | "valide" | "archive";

/** Sections A–I du rapport détaillé */
export type ReportSectionKey =
  | "resume_executif"
  | "participants"
  | "restauration"
  | "hebergement"
  | "terrains"
  | "kinesitherapie"
  | "financier"
  | "resultats"
  | "recommandations";

export type ReportSectionsConfig = Record<ReportSectionKey, boolean>;

export const DEFAULT_SECTIONS_CONFIG: ReportSectionsConfig = {
  resume_executif: true,
  participants: true,
  restauration: true,
  hebergement: true,
  terrains: true,
  kinesitherapie: true,
  financier: true,
  resultats: true,
  recommandations: true,
};

export const SECTION_LABELS: Record<ReportSectionKey, string> = {
  resume_executif: "A — Résumé exécutif",
  participants: "B — Participants",
  restauration: "C — Restauration",
  hebergement: "D — Hébergement",
  terrains: "E — Terrains",
  kinesitherapie: "F — Kinésithérapie",
  financier: "G — Financier",
  resultats: "H — Résultats",
  recommandations: "I — Recommandations",
};

export type RapportPeriode = {
  debut: string;
  fin: string;
  label?: string;
};

export type ParticipantResume = {
  id: string;
  nom: string;
  prenom: string;
  role: "joueur" | "entraineur" | "staff";
  categorie?: string;
  sexe?: string;
  presence_pct?: number;
};

export type RestaurationReportData = {
  date_debut: string;
  date_fin: string;
  total_repas: number;
  pdj: number;
  dej: number;
  diner: number;
  montant_mad: number;
  observations?: string;
};

export type HebergementReportData = {
  date_debut: string;
  date_fin: string;
  nuits: number;
  chambres_joueurs: number;
  chambres_coachs: number;
  taux_occupation_pct: number;
  montant_mad: number;
};

export type TerrainsReportData = {
  seances: number;
  heures: number;
  terrains_utilises: string[];
  montant_mad: number;
};

export type KinesitherapieReportData = {
  seances: number;
  joueurs_suivis: number;
  blessures_signalees: number;
  notes?: string;
};

export type FinancierReportData = {
  montant_hebergement: number;
  montant_restauration: number;
  montant_terrains: number;
  montant_kinesitherapie: number;
  montant_autres: number;
  montant_total: number;
  repartition: { label: string; montant: number; pct: number }[];
};

export type ResultatSportif = {
  joueur: string;
  epreuve?: string;
  resultat: string;
  classement?: string;
};

export type StageReportData = {
  kind: "stage";
  entity_id: string;
  titre: string;
  categorie: string;
  lieu: string;
  date_debut: string;
  date_fin: string;
  statut: string;
  responsable?: string;
  participants: ParticipantResume[];
  restauration: RestaurationReportData;
  hebergement: HebergementReportData;
  terrains: TerrainsReportData;
  kinesitherapie: KinesitherapieReportData;
  financier: FinancierReportData;
  resultats: ResultatSportif[];
  observations?: string;
  recommandations?: string;
  kpis: { label: string; value: string; sub?: string }[];
};

export type CompetitionReportData = {
  kind: "competition";
  entity_id: string;
  titre: string;
  categorie: string;
  lieu: string;
  date_debut: string;
  date_fin: string;
  statut: string;
  participants: ParticipantResume[];
  restauration: RestaurationReportData;
  hebergement: HebergementReportData;
  terrains: TerrainsReportData;
  kinesitherapie: KinesitherapieReportData;
  financier: FinancierReportData;
  resultats: ResultatSportif[];
  observations?: string;
  recommandations?: string;
  kpis: { label: string; value: string; sub?: string }[];
};

export type RapportEntityData = StageReportData | CompetitionReportData;

export type RapportTypeLabel = Record<RapportType, string>;

export const RAPPORT_TYPE_LABELS: RapportTypeLabel = {
  bilan_stage: "Bilan stage",
  hebdomadaire: "Hebdomadaire",
  mensuel: "Mensuel",
  annuel: "Annuel",
  competition: "Compétition",
};

export const RAPPORT_STATUT_LABELS: Record<RapportStatut, string> = {
  brouillon: "Brouillon",
  genere: "Généré",
  valide: "Validé",
  archive: "Archivé",
};

/** Ligne budget prévu / réel (graphiques comparatifs) */
export type RapportFinancierRow = {
  poste: string;
  budget: number;
  reel: number;
};
