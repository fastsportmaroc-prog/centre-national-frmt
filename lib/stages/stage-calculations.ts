import type { Infrastructure } from "@/lib/types/infrastructures";
import type { ReservationInfrastructure } from "@/lib/types/reservation-infra";
import type {
  AccommodationNeeds,
  CreneauTerrain,
  MealNeeds,
  StageCalendarEntry,
  StageHebergementConfig,
  StageRestaurationConfig,
  StageTerrainsConfig,
  SurfaceSouhaitee,
} from "@/lib/types/stage-logistique";
import { countNightsHebergement } from "@/lib/v2/stage-calculations";
import { hasInfrastructureOverlap } from "@/lib/utils/stage-automation";

export function calculateStageDuration(dateDebut: string, dateFin: string): number {
  const start = new Date(dateDebut);
  const end = new Date(dateFin);
  const diff = end.getTime() - start.getTime();
  return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1);
}

export function calculateStageParticipants(
  joueurIds: string[],
  coachIds: string[]
): { joueurs: number; coachs: number; total: number } {
  const joueurs = joueurIds.length;
  const coachs = coachIds.length;
  return { joueurs, coachs, total: joueurs + coachs };
}

function occupantsPerRoom(type: "individuelle" | "double" | "triple"): number {
  if (type === "individuelle") return 1;
  if (type === "triple") return 3;
  return 2;
}

export function calculateAccommodationNeeds(
  config: StageHebergementConfig,
  nombreJoueurs: number,
  nombreStaff: number
): AccommodationNeeds {
  const nuits = countNightsHebergement(config.date_debut, config.date_fin);
  const chambres_joueurs = Math.ceil(
    nombreJoueurs / occupantsPerRoom(config.type_chambre_joueurs)
  );
  const chambres_staff = Math.ceil(
    nombreStaff / occupantsPerRoom(config.type_chambre_staff === "individuelle" ? "individuelle" : "double")
  );
  const chambres_kitchenette = config.kitchenette ? Math.max(0, config.chambres_kitchenette) : 0;
  const total_chambres = chambres_joueurs + chambres_staff + chambres_kitchenette;
  const total_nuitees = total_chambres * nuits;
  return {
    nuits,
    chambres_joueurs,
    chambres_staff,
    chambres_kitchenette,
    total_chambres,
    total_nuitees,
  };
}

export function calculateMealNeeds(
  config: StageRestaurationConfig,
  nombrePersonnes: number
): MealNeeds {
  const jours = calculateStageDuration(config.date_debut, config.date_fin);
  const petits_dejeuners = config.petit_dejeuner ? jours * nombrePersonnes : 0;
  const dejeuners = config.dejeuner ? jours * nombrePersonnes : 0;
  const diners = config.diner ? jours * nombrePersonnes : 0;
  return {
    jours,
    personnes: nombrePersonnes,
    petits_dejeuners,
    dejeuners,
    diners,
    total_repas: petits_dejeuners + dejeuners + diners,
  };
}

export function creneauHoraires(creneau: CreneauTerrain, custom?: { debut?: string; fin?: string }) {
  switch (creneau) {
    case "matin":
      return { debut: "09:00", fin: "12:00" };
    case "apres_midi":
      return { debut: "15:00", fin: "18:00" };
    case "personnalise":
      return { debut: custom?.debut ?? "09:00", fin: custom?.fin ?? "18:00" };
    case "journee":
    default:
      return { debut: "09:00", fin: "18:00" };
  }
}

function matchesSurface(infra: Infrastructure, surface: SurfaceSouhaitee): boolean {
  if (surface === "indifferent") return infra.type === "terrain" || infra.nom.toLowerCase().includes("court");
  if (surface === "terre_battue") {
    return infra.surface === "terre_battue" || infra.nom.toLowerCase().includes("terre");
  }
  if (surface === "dur") {
    return infra.surface === "dur" || infra.nom.toLowerCase().includes("dur");
  }
  return true;
}

export function findAvailableCourts(
  infrastructures: Infrastructure[],
  reservations: ReservationInfrastructure[],
  dateDebut: string,
  dateFin: string,
  surface: SurfaceSouhaitee,
  excludeStageId?: string
): Infrastructure[] {
  const debut = new Date(`${dateDebut}T00:00:00`);
  const fin = new Date(`${dateFin}T23:59:59`);
  return infrastructures.filter((infra) => {
    if (!infra.actif || infra.statut === "maintenance" || infra.statut === "ferme") return false;
    if (!matchesSurface(infra, surface) && infra.type === "terrain") return false;
    const isTerrainLike =
      infra.type === "terrain" ||
      infra.nom.toLowerCase().includes("court") ||
      infra.nom.toLowerCase().includes("terrain");
    if (!isTerrainLike && surface !== "indifferent") return false;
    const overlap = reservations.some((r) => {
      if (r.statut === "annulee") return false;
      if (excludeStageId && r.stage_id === excludeStageId) return false;
      if (r.infrastructure_id !== infra.id) return false;
      const b0 = new Date(r.date_debut).getTime();
      const b1 = new Date(r.date_fin).getTime();
      return debut.getTime() < b1 && fin.getTime() > b0;
    });
    return !overlap;
  });
}

export function detectCourtConflicts(
  reservations: ReservationInfrastructure[],
  infrastructureId: string,
  dateDebutIso: string,
  dateFinIso: string,
  excludeStageId?: string
): boolean {
  const filtered = excludeStageId
    ? reservations.filter((r) => r.stage_id !== excludeStageId)
    : reservations;
  return hasInfrastructureOverlap(
    filtered,
    infrastructureId,
    new Date(dateDebutIso),
    new Date(dateFinIso)
  );
}

export function assignCourtsAutomatically(
  infrastructures: Infrastructure[],
  reservations: ReservationInfrastructure[],
  config: StageTerrainsConfig,
  stageDates: { date_debut: string; date_fin: string },
  stageId?: string
): { courtIds: string[]; conflits: string[] } {
  const conflits: string[] = [];
  if (config.infrastructure_ids_manuels.length > 0) {
    return { courtIds: config.infrastructure_ids_manuels.slice(0, config.nombre_courts), conflits };
  }
  const available = findAvailableCourts(
    infrastructures,
    reservations,
    stageDates.date_debut,
    stageDates.date_fin,
    config.surface,
    stageId
  );
  if (available.length < config.nombre_courts) {
    conflits.push(
      `Pas assez de terrains disponibles sur ce créneau (${available.length}/${config.nombre_courts}).`
    );
  }
  return { courtIds: available.slice(0, config.nombre_courts).map((i) => i.id), conflits };
}

function eachDay(dateDebut: string, dateFin: string): string[] {
  const days: string[] = [];
  const cur = new Date(dateDebut);
  const end = new Date(dateFin);
  while (cur <= end) {
    days.push(cur.toISOString().split("T")[0]!);
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

export function generateStageCalendarEntries(
  stageId: string,
  stageLabel: string,
  dateDebut: string,
  dateFin: string,
  courtIds: string[],
  config: StageTerrainsConfig
): StageCalendarEntry[] {
  const { debut, fin } = creneauHoraires(config.creneau, {
    debut: config.heure_debut,
    fin: config.heure_fin,
  });
  const entries: StageCalendarEntry[] = [];
  for (const day of eachDay(dateDebut, dateFin)) {
    for (const infraId of courtIds) {
      entries.push({
        date: day,
        label: `${stageLabel} — terrain`,
        date_debut: `${day}T${debut}:00`,
        date_fin: `${day}T${fin}:00`,
        infrastructure_id: infraId,
      });
    }
  }
  return entries;
}

export function defaultHebergementConfig(
  dateDebut: string,
  dateFin: string
): StageHebergementConfig {
  return {
    actif: false,
    date_debut: dateDebut,
    date_fin: dateFin,
    type_chambre_joueurs: "double",
    type_chambre_staff: "double",
    kitchenette: false,
    chambres_kitchenette: 0,
    remarques: null,
  };
}

export function defaultRestaurationConfig(
  dateDebut: string,
  dateFin: string
): StageRestaurationConfig {
  return {
    actif: false,
    date_debut: dateDebut,
    date_fin: dateFin,
    petit_dejeuner: true,
    dejeuner: true,
    diner: true,
    allergies: null,
  };
}

export function defaultTerrainsConfig(): StageTerrainsConfig {
  return {
    actif: false,
    nombre_courts: 1,
    surface: "indifferent",
    creneau: "matin",
    infrastructure_ids_manuels: [],
    affectation_auto: true,
  };
}
