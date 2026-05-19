import type { HistoriqueEntry } from "@/lib/types/historique";

const now = new Date().toISOString();

export const seedHistorique: HistoriqueEntry[] = [
  {
    id: "h1",
    utilisateur_nom: "Admin Démo",
    utilisateur_role: "admin",
    action: "creation",
    module: "joueurs",
    entite_id: "j5",
    entite_label: "Thomas Petit",
    ancienne_valeur: null,
    nouvelle_valeur: "Joueur créé",
    commentaire: null,
    created_at: now,
  },
  {
    id: "h2",
    utilisateur_nom: "P. Dupont",
    utilisateur_role: "coach",
    action: "validation",
    module: "billets",
    entite_id: "ba2",
    entite_label: "Billet Lyon → Rome",
    ancienne_valeur: "en_attente",
    nouvelle_valeur: "validee_direction",
    commentaire: "Urgence mission",
    created_at: now,
  },
  {
    id: "h3",
    utilisateur_nom: "Service logistique",
    utilisateur_role: "logistique",
    action: "export",
    module: "rapports",
    entite_id: null,
    entite_label: "Planning semaine",
    ancienne_valeur: null,
    nouvelle_valeur: "Export PDF",
    commentaire: null,
    created_at: now,
  },
];
