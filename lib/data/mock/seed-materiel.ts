import type { Materiel } from "@/lib/types/materiel";

const ts = new Date().toISOString();

function m(
  id: string,
  nom: string,
  categorie: Materiel["categorie"],
  total: number,
  utilise: number,
  seuil: number,
  emplacement: string
): Materiel {
  const quantite_disponible = Math.max(0, total - utilise);
  return {
    id,
    nom,
    categorie,
    quantite_totale: total,
    quantite_disponible,
    quantite_utilisee: utilise,
    seuil_alerte: seuil,
    etat: quantite_disponible <= seuil ? "a_commander" : "disponible",
    emplacement,
    fournisseur: null,
    prix_unitaire: null,
    notes: null,
    photo_url: null,
    created_at: ts,
    updated_at: ts,
  };
}

/** Catalogue Centre National FRMT */
export const seedMateriels: Materiel[] = [
  m("mat-1", "Balles dures — tubes", "balles_dures", 420, 120, 80, "Magasin central"),
  m("mat-2", "Balles orange (stages jeunes)", "balles_orange", 180, 40, 50, "Magasin central"),
  m("mat-3", "Balles vertes", "balles_vertes", 150, 30, 40, "Magasin central"),
  m("mat-4", "Balles rouges", "balles_rouges", 200, 25, 45, "Magasin central"),
  m("mat-5", "Paniers d'entraînement", "paniers", 18, 4, 4, "Local courts"),
  m("mat-6", "Packs raquettes prêt U16", "packs", 12, 3, 2, "Magasin central"),
  m("mat-7", "Raquettes compétition", "raquettes", 24, 8, 5, "Magasin central"),
  m("mat-8", "Plots / cônes", "plots", 120, 20, 30, "Local courts"),
  m("mat-9", "Élastiques fitness", "elastiques", 40, 10, 10, "Salle fitness"),
  m("mat-10", "Médecine balls 5 kg", "medecine_balls", 16, 5, 5, "Salle fitness"),
  m("mat-11", "Filets de rechange", "filets", 6, 1, 2, "Local courts"),
  m("mat-12", "Tapis de récupération", "materiel_fitness", 20, 4, 5, "Salle fitness"),
  m("mat-13", "Corde à sauter", "materiel_fitness", 30, 6, 8, "Salle fitness"),
  m("mat-14", "Sacs de sport FRMT", "autres", 50, 12, 10, "Accueil"),
];
