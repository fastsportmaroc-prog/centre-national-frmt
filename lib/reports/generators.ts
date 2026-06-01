import type { ReportMeta } from "@/lib/export/reports";
import { getJoueursWithGroupes } from "@/lib/data/joueurs";
import { getCourtsWithStats } from "@/lib/data/courts";
import { getReservationsWithRelations } from "@/lib/data/reservations";
import { getDemandesLogistique } from "@/lib/data/logistique";
import { getBilletsAvion } from "@/lib/data/billets";
import { getGroupes } from "@/lib/data/groupes";
import { formatDatePrint, formatDateTimePrint } from "@/lib/print/format-date";
import { calculerAge } from "@/lib/utils/joueur";

export async function reportListeJoueurs(): Promise<ReportMeta> {
  const joueurs = await getJoueursWithGroupes();
  const actifs = joueurs.filter((j) => j.statut === "actif").length;
  return {
    titre: "Liste des joueurs",
    mainTableTitle: "Effectif",
    kpis: [
      { label: "Total", value: String(joueurs.length), sub: "fiches" },
      { label: "Actifs", value: String(actifs), sub: "effectif" },
      {
        label: "Groupes",
        value: String(new Set(joueurs.map((j) => j.groupe_id).filter(Boolean)).size),
        sub: "distincts",
      },
      {
        label: "Catégories",
        value: String(new Set(joueurs.map((j) => j.categorie_age)).size),
        sub: "âge",
      },
    ],
    colonnes: ["Nom", "Catégorie", "Âge", "Groupe", "Niveau"],
    headerAlign: ["left", "center", "center", "left", "center"],
    cellAlign: ["left", "center", "center", "left", "center"],
    lignes: joueurs.map((j) => [
      `${j.prenom} ${j.nom}`,
      j.categorie_age,
      String(calculerAge(j.date_naissance)),
      j.groupe?.nom ?? "—",
      j.niveau ?? "—",
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
    mainTableTitle: "Membres du groupe",
    kpis: [
      { label: "Joueurs", value: String(filtered.length), sub: g?.nom ?? "groupe" },
      { label: "Catégories", value: String(new Set(filtered.map((j) => j.categorie_age)).size), sub: "distinctes" },
      { label: "Actifs", value: String(filtered.filter((j) => j.statut === "actif").length), sub: "effectif" },
      { label: "Groupe", value: g?.nom ?? "—", sub: "référence" },
    ],
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
  const confirmees = res.filter((r) => r.statut === "confirmee").length;
  return {
    titre: "Réservations par court",
    mainTableTitle: "Créneaux réservés",
    kpis: [
      { label: "Réservations", value: String(res.length), sub: "total" },
      { label: "Confirmées", value: String(confirmees), sub: "réservations" },
      {
        label: "Courts",
        value: String(new Set(res.map((r) => r.court_id).filter(Boolean)).size),
        sub: "distincts",
      },
      { label: "Joueurs", value: String(new Set(res.map((r) => r.joueur_id).filter(Boolean)).size), sub: "distincts" },
    ],
    colonnes: ["Joueur", "Court", "Début", "Fin"],
    lignes: res.map((r) => [
      `${r.joueur?.prenom ?? ""} ${r.joueur?.nom ?? ""}`.trim() || "—",
      r.court?.nom ?? "—",
      formatDateTimePrint(r.date_debut),
      formatDateTimePrint(r.date_fin),
    ]),
  };
}

export async function reportOccupationCourts(): Promise<ReportMeta> {
  const courts = await getCourtsWithStats();
  const moyenne =
    courts.length > 0
      ? Math.round(courts.reduce((s, c) => s + c.taux_occupation, 0) / courts.length)
      : 0;
  return {
    titre: "Taux d'occupation des courts",
    mainTableTitle: "Par infrastructure",
    kpis: [
      { label: "Courts", value: String(courts.length), sub: "référencés" },
      { label: "Occupation", value: `${moyenne}%`, sub: "moyenne" },
      {
        label: "Résa. jour",
        value: String(courts.reduce((s, c) => s + c.reservations_count, 0)),
        sub: "cumul",
      },
      {
        label: "Maintenance",
        value: String(courts.filter((c) => c.statut === "maintenance").length),
        sub: "hors service",
      },
    ],
    colonnes: ["Court", "Surface", "Résa. jour", "Occupation %"],
    lignes: courts.map((c) => [
      c.nom,
      c.surface,
      String(c.reservations_count),
      `${c.taux_occupation}%`,
    ]),
  };
}

export async function reportDemandesLogistique(): Promise<ReportMeta> {
  const d = await getDemandesLogistique();
  const enAttente = d.filter((x) => x.statut === "en_attente").length;
  return {
    titre: "Demandes logistiques",
    mainTableTitle: "Suivi des demandes",
    kpis: [
      { label: "Demandes", value: String(d.length), sub: "total" },
      { label: "En attente", value: String(enAttente), sub: "à traiter" },
      { label: "Types", value: String(new Set(d.map((x) => x.type)).size), sub: "distincts" },
      {
        label: "Validées",
        value: String(
          d.filter(
            (x) =>
              x.statut === "validee_direction" ||
              x.statut === "validee_logistique" ||
              x.statut === "traitee"
          ).length
        ),
        sub: "validées",
      },
    ],
    colonnes: ["Type", "Titre", "Demandeur", "Date"],
    lignes: d.map((x) => [
      x.type,
      x.titre,
      x.demandeur_nom,
      formatDatePrint(x.created_at),
    ]),
  };
}

export async function reportBilletsAvion(): Promise<ReportMeta> {
  const b = await getBilletsAvion();
  const urgents = b.filter((x) => x.urgence).length;
  return {
    titre: "Demandes billets d'avion",
    mainTableTitle: "Dossiers voyage",
    kpis: [
      { label: "Dossiers", value: String(b.length), sub: "total" },
      { label: "Urgents", value: String(urgents), sub: "priorité" },
      {
        label: "En cours",
        value: String(b.filter((x) => x.statut !== "refusee" && x.statut !== "traitee").length),
        sub: "actifs",
      },
      { label: "Aller-retour", value: String(b.filter((x) => x.date_retour).length), sub: "trajets" },
    ],
    colonnes: ["Trajet", "Personne", "Dates", "Urgence"],
    lignes: b.map((x) => [
      `${x.ville_depart} → ${x.ville_arrivee}`,
      x.joueur_concerne_nom ?? x.type_personne,
      `${formatDatePrint(x.date_aller)}${x.date_retour ? ` / ${formatDatePrint(x.date_retour)}` : ""}`,
      x.urgence ? "Oui" : "Non",
    ]),
  };
}
