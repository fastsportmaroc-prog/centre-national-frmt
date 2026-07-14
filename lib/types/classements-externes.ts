export type ClassementExterneRow = {
  id: string;
  joueur_id: string;
  nom_joueur: string;
  categorie: string;
  rang: number;
  points: number | null;
  date_maj: string;
  source: string | null;
  evolution: number | null;
  rang_precedent: number | null;
};

export type ClassementExterneCategorie = "all" | "ATP" | "WTA" | "ITF Junior";
