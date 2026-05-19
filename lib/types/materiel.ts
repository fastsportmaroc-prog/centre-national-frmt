export type CategorieMateriel =
  | "balles_dures"
  | "balles_orange"
  | "balles_vertes"
  | "balles_rouges"
  | "paniers"
  | "packs"
  | "raquettes"
  | "plots"
  | "elastiques"
  | "medecine_balls"
  | "filets"
  | "materiel_fitness"
  | "autres";

export type EtatMateriel = "disponible" | "utilise" | "use" | "perdu" | "a_commander";

export type TypeMouvementMateriel =
  | "entree_stock"
  | "sortie_stock"
  | "affectation_stage"
  | "retour"
  | "perte"
  | "casse";

export type Materiel = {
  id: string;
  nom: string;
  categorie: CategorieMateriel;
  quantite_totale: number;
  quantite_disponible: number;
  quantite_utilisee: number;
  seuil_alerte: number;
  etat: EtatMateriel;
  emplacement: string | null;
  fournisseur: string | null;
  prix_unitaire: number | null;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
};

export type MaterielInput = Omit<Materiel, "id" | "created_at" | "updated_at">;

export type MouvementMateriel = {
  id: string;
  materiel_id: string;
  stage_id: string | null;
  type_mouvement: TypeMouvementMateriel;
  quantite: number;
  commentaire: string | null;
  created_at: string;
};

export type MouvementMaterielInput = Omit<MouvementMateriel, "id" | "created_at">;
