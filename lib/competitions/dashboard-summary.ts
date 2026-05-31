import type { CompetitionStatut } from "@/lib/types/competition";
import type { PasseportAlerteNiveau, VisaStatutAffiche } from "@/lib/competitions/passeport-competition";

export type CompetitionDashboardCard = {
  id: string;
  nom: string;
  categorie: string;
  date_debut: string;
  date_fin: string;
  lieu: string | null;
  statut_affichage: CompetitionStatut;
  visas_requis: boolean;
  nb_participants: number;
  visas_a_prevoir: number;
  visas_en_cours: number;
  visas_obtenus: number;
  passeports_alerte: number;
  billets_en_attente: number;
  jours_avant: number;
  pret_logistique_pct: number;
};

export type CompetitionVisaUrgentRow = {
  competition_id: string;
  competition_nom: string;
  date_fin: string;
  participant_id: string;
  participant_type: "joueur" | "coach";
  nom: string;
  prenom: string;
  poste: string;
  visa_statut: VisaStatutAffiche;
  passeport_alerte: PasseportAlerteNiveau;
};

export type CompetitionDashboardSummary = {
  competitions: CompetitionDashboardCard[];
  kpis: {
    actives: number;
    avec_visas: number;
    visas_a_prevoir: number;
    passeports_critiques: number;
    billets_en_attente: number;
    participants_total: number;
  };
  visasUrgents: CompetitionVisaUrgentRow[];
  error?: string;
};
