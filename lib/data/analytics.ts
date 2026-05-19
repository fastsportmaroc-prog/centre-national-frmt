import { format, subDays, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import type { AnalyticsDashboard } from "@/lib/types/analytics";
import { getJoueurs } from "./joueurs";
import { getCourts } from "./courts";
import { getReservations } from "./reservations";
import { getGroupes } from "./groupes";
import { getDemandesLogistique } from "./logistique";
import { getBilletsAvion } from "./billets";
import { getHebergements } from "./hebergements";
import { getRepas } from "./repas";
import { getStagesProgramme } from "./stages";
import { getBudgetsDeplacement } from "./budget-deplacement";
import { getMateriels } from "./materiel";
import { isToday } from "@/lib/utils/dates";

export async function getAnalyticsDashboard(): Promise<AnalyticsDashboard> {
  const [
    joueurs,
    courts,
    reservations,
    groupes,
    demandes,
    billets,
    hebergements,
    repas,
    stages,
    budgetsDeplacement,
    materiels,
  ] = await Promise.all([
    getJoueurs(),
    getCourts(),
    getReservations(),
    getGroupes(),
    getDemandesLogistique(),
    getBilletsAvion(),
    getHebergements(),
    getRepas(),
    getStagesProgramme(),
    getBudgetsDeplacement(),
    getMateriels(),
  ]);

  const joueursActifs = joueurs.filter((j) => j.statut === "actif").length;
  const reservationsAujourdhui = reservations.filter(
    (r) => r.statut !== "annulee" && isToday(r.date_debut)
  ).length;
  const courtsActifs = courts.filter((c) => c.actif).length;
  const slots = courtsActifs * 12;
  const tauxOccupationCourts =
    slots > 0 ? Math.min(100, Math.round((reservationsAujourdhui / slots) * 100)) : 0;

  const evolutionReservationsSemaine = Array.from({ length: 7 }, (_, i) => {
    const day = subDays(new Date(), 6 - i);
    const label = format(day, "EEE", { locale: fr });
    const count = reservations.filter((r) => {
      const d = new Date(r.date_debut);
      return (
        d.getFullYear() === day.getFullYear() &&
        d.getMonth() === day.getMonth() &&
        d.getDate() === day.getDate() &&
        r.statut !== "annulee"
      );
    }).length;
    return { jour: label, count };
  });

  const statsParGroupe = groupes.map((g) => ({
    nom: g.nom,
    count: joueurs.filter((j) => j.groupe_id === g.id).length,
  }));

  const statsParCourt = courts.map((c) => ({
    nom: c.nom,
    reservations: reservations.filter(
      (r) => r.court_id === c.id && r.statut !== "annulee"
    ).length,
  }));

  const today = new Date().toISOString().split("T")[0];
  const monthPrefix = today.slice(0, 7);

  const stagesActifs = stages.filter((s) => s.date_fin >= today).length;
  const budgetsDeplacementValides = budgetsDeplacement.filter(
    (b) => b.statut === "valide" || b.statut === "paye"
  ).length;
  const budgetMensuelMAD = budgetsDeplacement
    .filter((b) => b.created_at.startsWith(monthPrefix))
    .reduce((sum, b) => sum + b.total_reel, 0);
  const materielStockFaible = materiels.filter(
    (m) => m.quantite_disponible <= m.seuil_alerte
  ).length;

  const budgetsParJoueur = joueurs
    .map((j) => {
      const total = budgetsDeplacement
        .filter((b) => b.joueur_id === j.id)
        .reduce((s, b) => s + b.total_reel, 0);
      return { nom: `${j.prenom} ${j.nom}`, total };
    })
    .filter((x) => x.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  return {
    joueursActifs,
    reservationsAujourdhui,
    tauxOccupationCourts,
    reservationsAnnulees: reservations.filter((r) => r.statut === "annulee").length,
    courtsMaintenance: courts.filter((c) => c.statut === "maintenance").length,
    demandesLogistiqueEnAttente: demandes.filter((d) =>
      ["en_attente", "validee_direction"].includes(d.statut)
    ).length,
    billetsValides: billets.filter((b) =>
      ["validee_direction", "validee_logistique", "envoyee", "traitee"].includes(b.statut)
    ).length,
    repasAujourdhui: repas.filter((r) => r.date_repas === today).length,
    chambresOccupees: hebergements.filter((h) => h.occupe).length,
    chambresTotal: hebergements.length,
    evolutionReservationsSemaine,
    statsParGroupe,
    statsParCourt,
    stagesActifs,
    budgetsDeplacementValides,
    budgetMensuelMAD,
    materielStockFaible,
    budgetsParJoueur,
  };
}
