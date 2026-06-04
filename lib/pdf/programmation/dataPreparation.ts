import { differenceInCalendarDays, parseISO } from "date-fns";
import type { ProgrammationEvenementEnriched } from "@/lib/types/programmation-joueurs";
import type { JoueurPdfRow, ProgrammationPdfContext } from "@/lib/pdf/programmation/types";

export function joueurLabel(e: ProgrammationEvenementEnriched): string {
  return [e.joueur_prenom, e.joueur_nom].filter(Boolean).join(" ") || e.joueur_id.slice(0, 8);
}

export function eventsForJoueur(
  events: ProgrammationEvenementEnriched[],
  joueurId: string,
  dateDebut: string,
  dateFin: string
) {
  return events.filter(
    (e) =>
      e.joueur_id === joueurId &&
      e.date_fin >= dateDebut.slice(0, 10) &&
      e.date_debut <= dateFin.slice(0, 10)
  );
}

export function buildJoueurRows(ctx: ProgrammationPdfContext): JoueurPdfRow[] {
  return ctx.joueurIds.map((id) => {
    const evs = eventsForJoueur(ctx.evenements, id, ctx.dateDebut, ctx.dateFin);
    const sample = evs[0] ?? ctx.evenements.find((e) => e.joueur_id === id);
    return {
      id,
      label: sample ? joueurLabel(sample) : id.slice(0, 8),
      categorie: sample?.joueur_categorie,
      classement: sample?.joueur_classement,
      photoUrl: sample?.joueur_photo_url,
      events: evs,
    };
  });
}

export function computeKpis(events: ProgrammationEvenementEnriched[]) {
  const tournois = events.filter((e) =>
    ["tournoi_itf", "tournoi_atp_wta", "coupe_davis", "bjk_cup"].includes(e.type)
  ).length;
  const stages = events.filter((e) => ["stage_national", "stage_etranger"].includes(e.type)).length;
  const pays = new Set(events.map((e) => e.pays).filter(Boolean)).size;
  let compDays = 0;
  let points = 0;
  let prize = 0;
  for (const e of events) {
    points += e.points_gagnes ?? 0;
    prize += Number(e.prize_money_usd ?? 0);
    if (e.type !== "repos" && e.type !== "blessure") {
      compDays +=
        differenceInCalendarDays(parseISO(e.date_fin.slice(0, 10)), parseISO(e.date_debut.slice(0, 10))) +
        1;
    }
  }
  return {
    tournois,
    stages,
    semaines: Math.max(1, Math.round(compDays / 7)),
    pays,
    points,
    prize,
  };
}

export function eventsInWeek(
  events: ProgrammationEvenementEnriched[],
  weekStart: Date,
  weekEnd: Date
): ProgrammationEvenementEnriched[] {
  const ws = weekStart.toISOString().slice(0, 10);
  const we = weekEnd.toISOString().slice(0, 10);
  return events.filter((e) => e.date_debut.slice(0, 10) <= we && e.date_fin.slice(0, 10) >= ws);
}
