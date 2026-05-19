export type CategorieDepenseJoueur =
  | "billet_avion"
  | "hebergement"
  | "restauration"
  | "transport"
  | "stage"
  | "materiel"
  | "autre";

export type JoueurDepense = {
  id: string;
  joueur_id: string;
  date_depense: string;
  categorie: CategorieDepenseJoueur;
  libelle: string;
  montant: number;
  devise: string;
  reference_type: "billet_avion" | "budget_deplacement" | null;
  reference_id: string | null;
  created_at: string;
};

export type JoueurDepenseInput = Omit<JoueurDepense, "id" | "created_at">;
