import { differenceInCalendarDays, parseISO } from "date-fns";
import type { StageHebergementForm, StageRestaurationForm, StageTerrainsForm } from "@/lib/types/v2";

function parseStageDate(value: string): Date {
  return parseISO(value.slice(0, 10));
}

/** Jours de présence sur le stage (inclusif). Ex. 05→07 juin = 3 jours (repas, planning). */
export function countDaysInclusive(debut: string, fin: string): number {
  const d0 = parseStageDate(debut);
  const d1 = parseStageDate(fin);
  if (Number.isNaN(d0.getTime()) || Number.isNaN(d1.getTime())) return 1;
  return Math.max(1, differenceInCalendarDays(d1, d0) + 1);
}

/** Nuits d'hôtel : nuits du soir d'arrivée jusqu'à la veille du départ. Ex. 05→07 juin = 2 nuits. */
export function countNightsHebergement(debut: string, fin: string): number {
  const d0 = parseStageDate(debut);
  const d1 = parseStageDate(fin);
  if (Number.isNaN(d0.getTime()) || Number.isNaN(d1.getTime())) return 1;
  return Math.max(1, differenceInCalendarDays(d1, d0));
}

export function calcChambresJoueurs(
  nbJoueurs: number,
  type: StageHebergementForm["type_chambre_joueurs"]
): number {
  const cap = type === "single" ? 1 : type === "double" ? 2 : 3;
  return Math.ceil(nbJoueurs / cap);
}

export function calcChambresCoachs(
  nbCoachs: number,
  type: StageHebergementForm["type_chambre_coachs"]
): number {
  const cap = type === "single" ? 1 : 2;
  return Math.ceil(nbCoachs / cap);
}

export function calcTotalRepas(
  form: StageRestaurationForm,
  nbPersonnes: number,
  jours: number
): number {
  let repasParJour = 0;
  if (form.petit_dejeuner) repasParJour++;
  if (form.dejeuner) repasParJour++;
  if (form.diner) repasParJour++;
  return repasParJour * nbPersonnes * jours;
}

export function getCreneauHoraires(form: StageTerrainsForm): { debut: string; fin: string } {
  if (form.creneau === "matin") return { debut: "09:00", fin: "13:00" };
  if (form.creneau === "apres_midi") return { debut: "14:00", fin: "18:00" };
  return { debut: "09:00", fin: "18:00" };
}

export function eachDayOfStage(debut: string, fin: string): string[] {
  const days: string[] = [];
  const cur = new Date(debut);
  const end = new Date(fin);
  while (cur <= end) {
    days.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}
