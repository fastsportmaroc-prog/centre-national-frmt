import { getTarifsTransport } from "@/lib/v2/settings-store";
import type { StageCompletFormData } from "@/lib/types/v2";

export function emptyStageForm(dates?: { debut?: string; fin?: string }): StageCompletFormData {
  const tarifs = typeof window !== "undefined" ? getTarifsTransport() : { prix_billet_eur: 350 };
  const debut = dates?.debut ?? "2026-06-02";
  const fin = dates?.fin ?? "2026-06-08";
  return {
    stage_action: "",
    categorie: "U16",
    date_debut: debut,
    date_fin: fin,
    lieu: "Centre National FRMT",
    statut: "prevu",
    notes: "",
    joueur_ids: [],
    entraineur_ids: [],
    hebergement: {
      actif: true,
      date_debut: debut,
      date_fin: fin,
      type_chambre_joueurs: "double",
      type_chambre_coachs: "single",
      nb_chambres_joueurs: 0,
      nb_chambres_coachs: 0,
      kitchenette: false,
      remarques: "",
      dates_participants_actif: false,
      participants_dates: [],
    },
    restauration: {
      actif: false,
      petit_dejeuner: true,
      dejeuner: true,
      diner: true,
      date_debut: debut,
      date_fin: fin,
      remarques: "",
    },
    terrains: {
      actif: false,
      nb_courts: 2,
      surface: "terre_battue",
      creneau: "journee",
      fitness: false,
      natation: false,
      espace_physique: false,
    },
    transport_avion: {
      actif: false,
      aeroport_depart: "CMN - Casablanca",
      date_depart: debut,
      heure_depart: "10:00",
      aeroport_retour: "CMN - Casablanca",
      date_retour: fin,
      heure_retour: "18:00",
      prix_unitaire: tarifs.prix_billet_eur,
      tous_joueurs: true,
      tous_entraineurs: true,
      joueur_ids: [],
      entraineur_ids: [],
    },
    lettre: {
      club_destinataire: "Club de l'Agriculture",
      lieu_envoi: "Rabat",
      type: "reservation",
      exceptions: [],
      contenu_personnalise: "",
    },
  };
}
