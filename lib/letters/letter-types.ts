import type { EntraineurV2, HebergementStageV2, JoueurV2, StageProgrammeV2 } from "@/lib/types/v2";

export type LettreType =
  | "reservation"
  | "terrains_only"
  | "liste_participants"
  | "libre";

/** Choix dans le formulaire stage */
export type LettreDemandeType = "avec_hebergement" | "sans_hebergement";

export type LettreHebergementBesoins = {
  chambres_garcons?: number;
  chambres_filles?: number;
  chambres_staff?: number;
  chambre_individuelle?: number;
  chambre_kitchenette?: number;
};

export type LettreHebergementException = {
  personne_id: string;
  personne_type: "joueur" | "entraineur";
  date_debut?: string;
  date_fin?: string;
  kitchenette?: boolean;
  note?: string;
};

export type LettreFormSection = {
  club_destinataire: string;
  lieu_envoi: string;
  type: LettreType;
  exceptions: LettreHebergementException[];
  contenu_personnalise?: string;
};

export type LettreReservationInput = {
  stage_id?: string;
  stage: Pick<
    StageProgrammeV2,
    "id" | "stage_action" | "date_debut" | "date_fin" | "lieu" | "categorie"
  >;
  joueurs: Pick<JoueurV2, "id" | "nom" | "prenom" | "sexe">[];
  coachs: Pick<EntraineurV2, "id" | "nom" | "prenom">[];
  hebergement: HebergementStageV2 | null;
  clubDestinataire: string;
  dateLettre: string;
  type?: LettreType;
  nbCourts?: number;
  exceptions?: LettreHebergementException[];
  contenuPersonnalise?: string;
  notes?: string;
  besoinsSpecifiques?: string;
  hebergementBesoins?: LettreHebergementBesoins;
  /** Dates de nuitées (onglet hébergement ou saisie manuelle lettre). */
  nuiteesDateDebut?: string;
  nuiteesDateFin?: string;
  logoBase64?: string | null;
  logoFormat?: "PNG" | "SVG";
};

export type LettreParticipantLine = {
  nom: string;
  prenom: string;
  label: string;
};

export type LettreExceptionLine = {
  label: string;
  detail: string;
};

/** Groupe de chambres + noms (modèle Word avec hébergement). */
export type LettreChambreGroupe = {
  title: string;
  participants: LettreParticipantLine[];
};

export type LettreRenderMode = "hebergement_complet" | "liste_participants";

export type LettreBuiltContent = {
  dateLettre: string;
  /** Toujours affiché : CLUB DE L'AGRICULTURE */
  destinataireLigne: string;
  stageNom: string;
  stageDates: string;
  objet: string;
  mode: LettreRenderMode;
  introParagraphs: string[];
  /** Après les listes, mode liste (ex. hébergement coachs uniquement). */
  hebergementCoachParagraph?: string;
  /** Mode hébergement complet : texte avant répartition des chambres. */
  hebergementRepartitionIntro?: string;
  chambreGroupes: LettreChambreGroupe[];
  joueurs: LettreParticipantLine[];
  coachs: LettreParticipantLine[];
  participants: LettreParticipantLine[];
  exceptions: LettreExceptionLine[];
  closingParagraphs: string[];
  signatureName: string;
  signatureTitle: string;
  avecHebergement: boolean;
};

export type LettreOfficielleRecord = {
  id: string;
  stage_id: string;
  stage_nom?: string;
  club_destinataire: string;
  date_lettre: string;
  type: LettreType;
  avec_hebergement: boolean;
  avec_terrains: boolean;
  participants: LettreParticipantLine[];
  exceptions_hebergement: LettreHebergementException[];
  contenu_personnalise?: string | null;
  statut: string;
  created_at: string;
  pdf_base64?: string | null;
  docx_base64?: string | null;
  input_snapshot?: LettreReservationInput;
  licences_complet?: boolean;
  licences_manquantes?: string[];
  pdf_filename?: string;
};

export type GenerateLettreResult = {
  pdf: Uint8Array;
  docx: Uint8Array;
  pdfBase64: string;
  docxBase64: string;
  filenameBase: string;
  content: LettreBuiltContent;
};

export type StageLettreOverview = {
  id: string;
  stage_action: string;
  date_debut: string;
  date_fin: string;
  lieu: string | null;
  categorie: string;
  hebergement: boolean;
  terrains: boolean;
  nb_joueurs: number;
  nb_coachs: number;
  club_default: string;
  lettre_id: string | null;
  lettre_date: string | null;
};
