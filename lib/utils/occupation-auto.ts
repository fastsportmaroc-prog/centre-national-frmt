import type { StageProgramme } from "@/lib/types/stages";
import type { Infrastructure } from "@/lib/types/infrastructures";
import type { ReservationInfrastructure } from "@/lib/types/reservation-infra";
import type { Hebergement } from "@/lib/types/database";
import type { OccupationCentreResume } from "@/lib/types/occupation-cne";

function dateInRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

export function computeOccupationJour(params: {
  date: string;
  stages: StageProgramme[];
  infrastructures: Infrastructure[];
  reservations: ReservationInfrastructure[];
  hebergements: Hebergement[];
}): OccupationCentreResume & {
  taux_terrains_pct: number;
  taux_fitness_pct: number;
  taux_natation_pct: number;
  alertes: string[];
} {
  const { date, stages, infrastructures, reservations, hebergements } = params;
  const alertes: string[] = [];

  const stagesJour = stages.filter((s) => dateInRange(date, s.date_debut, s.date_fin) && s.statut !== "annule");
  const chambresRequises = stagesJour.reduce((sum, s) => sum + (s.hebergement ? Math.max(s.chambres, Math.ceil((s.nombre_joueurs + s.nombre_encadrants) / 2)) : 0), 0);
  const chambresTotal = hebergements.length || 15;
  const chambresOccupees = Math.min(chambresTotal, chambresRequises);
  if (chambresRequises > chambresTotal) {
    alertes.push(`Surcharge hébergement: ${chambresRequises} chambres requises pour ${chambresTotal} disponibles`);
  }

  const terrains = infrastructures.filter((i) => i.type === "terrain" && i.actif);
  const fitness = infrastructures.filter((i) => i.type === "fitness" && i.actif);
  const natation = infrastructures.filter((i) => i.type === "natation" && i.actif);

  function tauxType(list: Infrastructure[]): number {
    if (list.length === 0) return 0;
    const busy = list.filter((infra) =>
      reservations.some(
        (r) =>
          r.infrastructure_id === infra.id &&
          r.statut !== "annulee" &&
          dateInRange(date, r.date_debut.slice(0, 10), r.date_fin.slice(0, 10))
      )
    ).length;
    return Math.round((busy / list.length) * 100);
  }

  const taux_terrains_pct = tauxType(terrains);
  const taux_fitness_pct = tauxType(fitness);
  const taux_natation_pct = tauxType(natation);

  const terrainsOccupes = Math.round((taux_terrains_pct / 100) * terrains.length);
  if (taux_terrains_pct >= 100) alertes.push("Tous les terrains sont réservés sur cette date");

  return {
    date,
    taux_chambres_pct: Math.round((chambresOccupees / chambresTotal) * 100),
    chambres_occupees: chambresOccupees,
    chambres_total: chambresTotal,
    alertes_surcharge: alertes.length,
    terrains_occupes: terrainsOccupes,
    terrains_total: terrains.length || 5,
    taux_terrains_pct,
    taux_fitness_pct,
    taux_natation_pct,
    alertes,
  };
}
