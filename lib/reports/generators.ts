import type { ReportMeta } from "@/lib/export/reports";
import { getJoueursWithGroupes } from "@/lib/data/joueurs";
import { getCourtsWithStats } from "@/lib/data/courts";
import { getReservationsWithRelations } from "@/lib/data/reservations";
import { getDemandesLogistique } from "@/lib/data/logistique";
import { getBilletsAvion } from "@/lib/data/billets";
import { getGroupes } from "@/lib/data/groupes";
import { formatDateTime, formatDate } from "@/lib/utils/dates";
import { STATUTS_DEMANDE } from "@/lib/constants/logistique";
import { calculerAge } from "@/lib/utils/joueur";

export async function reportListeJoueurs(): Promise<ReportMeta> {
  const joueurs = await getJoueursWithGroupes();
  return {
    titre: "Liste des joueurs",
    colonnes: ["Nom", "Catégorie", "Âge", "Groupe", "Niveau", "Statut"],
    lignes: joueurs.map((j) => [
      `${j.prenom} ${j.nom}`,
      j.categorie_age,
      String(calculerAge(j.date_naissance)),
      j.groupe?.nom ?? "—",
      j.niveau ?? "—",
      j.statut,
    ]),
  };
}

export async function reportJoueursParGroupe(groupeId: string): Promise<ReportMeta> {
  const [joueurs, groupes] = await Promise.all([getJoueursWithGroupes(), getGroupes()]);
  const g = groupes.find((x) => x.id === groupeId);
  const filtered = joueurs.filter((j) => j.groupe_id === groupeId);
  return {
    titre: `Joueurs — Groupe ${g?.nom ?? ""}`,
    filtres: g?.nom,
    colonnes: ["Nom", "Catégorie", "Classement"],
    lignes: filtered.map((j) => [
      `${j.prenom} ${j.nom}`,
      j.categorie_age,
      j.classement ?? "—",
    ]),
  };
}

export async function reportReservationsCourts(): Promise<ReportMeta> {
  const res = await getReservationsWithRelations();
  return {
    titre: "Réservations par court",
    colonnes: ["Joueur", "Court", "Début", "Fin", "Statut"],
    lignes: res.map((r) => [
      `${r.joueur?.prenom ?? ""} ${r.joueur?.nom ?? ""}`,
      r.court?.nom ?? "—",
      formatDateTime(r.date_debut),
      formatDateTime(r.date_fin),
      r.statut,
    ]),
  };
}

export async function reportOccupationCourts(): Promise<ReportMeta> {
  const courts = await getCourtsWithStats();
  return {
    titre: "Taux d'occupation des courts",
    colonnes: ["Court", "Surface", "Statut", "Résa. jour", "Occupation %"],
    lignes: courts.map((c) => [
      c.nom,
      c.surface,
      c.statut,
      String(c.reservations_count),
      `${c.taux_occupation}%`,
    ]),
  };
}

export async function reportDemandesLogistique(): Promise<ReportMeta> {
  const d = await getDemandesLogistique();
  return {
    titre: "Demandes logistiques",
    colonnes: ["Type", "Titre", "Demandeur", "Statut", "Date"],
    lignes: d.map((x) => [
      x.type,
      x.titre,
      x.demandeur_nom,
      STATUTS_DEMANDE.find((s) => s.value === x.statut)?.label ?? x.statut,
      formatDate(x.created_at),
    ]),
  };
}

export async function reportBilletsAvion(): Promise<ReportMeta> {
  const b = await getBilletsAvion();
  return {
    titre: "Demandes billets d'avion",
    colonnes: ["Trajet", "Personne", "Dates", "Statut", "Urgence"],
    lignes: b.map((x) => [
      `${x.ville_depart} → ${x.ville_arrivee}`,
      x.joueur_concerne_nom ?? x.type_personne,
      `${formatDate(x.date_aller)}${x.date_retour ? ` / ${formatDate(x.date_retour)}` : ""}`,
      x.statut,
      x.urgence ? "Oui" : "Non",
    ]),
  };
}
