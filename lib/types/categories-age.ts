/** Catégorie d'âge, cohorte par année de naissance, ou libellé stage. */
export type AgeCategoryKind = "age" | "birthYear" | "label";

/** Catégorie d'âge ou catégorie de stage (code affiché : U10, Elite Pro, 2012, …). */
export type AgeCategoryDefinition = {
  id: string;
  /** Code court (U10, Elite Pro, 2012) */
  code: string;
  /** Libellé affiché */
  label: string;
  kind?: AgeCategoryKind;
  /**
   * Âge strictement inférieur pour les catégories jeunes (U10 → moins de 10 ans).
   * `null` = pas de règle d'âge (ex. Elite Pro, Encadrement).
   */
  maxAge: number | null;
  /** Si renseigné : catégorie = joueurs nés cette année-là. */
  birthYear?: number | null;
  sortOrder: number;
  /** Couleurs badge / calendrier (optionnel) */
  color?: { bg: string; border: string; text: string };
};