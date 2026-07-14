import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import type { ProgrammationEvenementEnriched } from "@/lib/types/programmation-joueurs";
import type { EntraineurV2, JoueurV2 } from "@/lib/types/v2";
import {
  capitalizeFr,
  safeEachDayInRange,
} from "@/lib/programmation-joueurs/planning-cne-period";
import {
  cellStyleForEvent,
  type PlanningCneCellStyle,
  type PlanningCneColorKey,
} from "@/lib/programmation-joueurs/planning-cne-colors";
import { planningCneColumnId } from "@/lib/programmation-joueurs/planning-cne-stages";

export type PlanningCnePersonKind = "joueur" | "coach";

export type PlanningCneColumn = {
  id: string;
  kind: PlanningCnePersonKind;
  prenom: string;
  nom: string;
  label: string;
};

export type PlanningCneCellEvent = {
  id: string;
  label: string;
  fullLabel: string;
  colorKey: PlanningCneColorKey;
  style: PlanningCneCellStyle;
  evenement: ProgrammationEvenementEnriched;
};

export type PlanningCneRow = {
  dateKey: string;
  dateLabel: string;
  jourLabel: string;
  moisLabel: string;
  cells: Record<string, PlanningCneCellEvent[]>;
};

export type PlanningCnePeriodPreset =
  | "mois_precedent"
  | "ce_mois"
  | "mois_prochain"
  | "trimestre"
  | "personnalise";

export type PlanningCneDisplayMode = "joueurs" | "coaches" | "both";

function overlapsDay(ev: ProgrammationEvenementEnriched, day: Date): boolean {
  const d0 = parseISO(ev.date_debut.slice(0, 10));
  const d1 = parseISO(ev.date_fin.slice(0, 10));
  const t = day.getTime();
  return d0.getTime() <= t && d1.getTime() >= t;
}

export function buildJoueurColumns(joueurs: JoueurV2[]): PlanningCneColumn[] {
  return joueurs
    .filter((j) => (j.statut ?? "actif") === "actif")
    .map((j) => ({
      id: j.id,
      kind: "joueur" as const,
      prenom: j.prenom ?? "",
      nom: j.nom ?? "",
      label: `${j.prenom ?? ""} ${j.nom ?? ""}`.trim().toUpperCase(),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));
}

export function buildCoachColumns(coaches: EntraineurV2[]): PlanningCneColumn[] {
  return coaches
    .filter((c) => (c.statut ?? "actif") === "actif")
    .map((c) => ({
      id: `coach-${c.id}`,
      kind: "coach" as const,
      prenom: c.prenom ?? "",
      nom: c.nom ?? "",
      label: `${c.prenom ?? ""} ${c.nom ?? ""}`.trim().toUpperCase(),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));
}

export function filterColumnsByDisplay(
  columns: PlanningCneColumn[],
  mode: PlanningCneDisplayMode
): PlanningCneColumn[] {
  if (mode === "joueurs") return columns.filter((c) => c.kind === "joueur");
  if (mode === "coaches") return columns.filter((c) => c.kind === "coach");
  return columns;
}

/** Synchronise les colonnes visibles quand on change Joueurs / Coaches / Les deux. */
export function syncVisibleColumnsForDisplayMode(
  mode: PlanningCneDisplayMode,
  prev: Iterable<string>,
  joueurIds: string[],
  coachIds: string[]
): Set<string> {
  const prevSet = new Set(prev);
  const joueurSet = new Set(joueurIds);
  const coachSet = new Set(coachIds);

  if (mode === "joueurs") {
    const kept = [...prevSet].filter((id) => !id.startsWith("coach-") && joueurSet.has(id));
    return new Set(kept.length > 0 ? kept : joueurIds);
  }
  if (mode === "coaches") {
    const kept = [...prevSet].filter((id) => id.startsWith("coach-") && coachSet.has(id));
    return new Set(kept.length > 0 ? kept : coachIds);
  }

  const keptJoueurs = [...prevSet].filter((id) => !id.startsWith("coach-") && joueurSet.has(id));
  const keptCoaches = [...prevSet].filter((id) => id.startsWith("coach-") && coachSet.has(id));
  const finalJoueurs = keptJoueurs.length > 0 ? keptJoueurs : joueurIds;
  const finalCoaches = keptCoaches.length > 0 ? keptCoaches : coachIds;
  return new Set([...finalJoueurs, ...finalCoaches]);
}

/** Retire les ids hors liste / hors mode sans réinitialiser toute la sélection. */
export function pruneVisibleColumns(
  mode: PlanningCneDisplayMode,
  prev: Iterable<string>,
  joueurIds: string[],
  coachIds: string[]
): Set<string> {
  const joueurSet = new Set(joueurIds);
  const coachSet = new Set(coachIds);
  let kept = [...prev].filter((id) => {
    if (id.startsWith("coach-")) return coachSet.has(id);
    return joueurSet.has(id);
  });
  if (mode === "joueurs") kept = kept.filter((id) => !id.startsWith("coach-"));
  if (mode === "coaches") kept = kept.filter((id) => id.startsWith("coach-"));
  if (kept.length > 0) return new Set(kept);
  return syncVisibleColumnsForDisplayMode(mode, [], joueurIds, coachIds);
}

export function buildPlanningCneGrid(params: {
  rangeStart: string;
  rangeEnd: string;
  columns: PlanningCneColumn[];
  evenements: ProgrammationEvenementEnriched[];
  visibleColumnIds: Set<string>;
}): PlanningCneRow[] {
  const days = safeEachDayInRange(params.rangeStart, params.rangeEnd);

  const activeCols = params.columns.filter((c) => params.visibleColumnIds.has(c.id));

  const eventsByColumn = new Map<string, ProgrammationEvenementEnriched[]>();
  for (const ev of params.evenements) {
    const colId = planningCneColumnId(ev);
    const list = eventsByColumn.get(colId) ?? [];
    list.push(ev);
    eventsByColumn.set(colId, list);
  }

  return days.map((day) => {
    const dateKey = format(day, "yyyy-MM-dd");
    const cells: Record<string, PlanningCneCellEvent[]> = {};

    for (const col of activeCols) {
      const list = (eventsByColumn.get(col.id) ?? [])
        .filter((ev) => overlapsDay(ev, day))
        .map((ev) => {
          const style = cellStyleForEvent(ev);
          return {
            id: ev.id,
            label: style.label,
            fullLabel: style.fullLabel,
            colorKey: style.colorKey,
            style,
            evenement: ev,
          };
        });
      cells[col.id] = list;
    }

    return {
      dateKey,
      dateLabel: format(day, "dd/MM/yyyy", { locale: fr }),
      jourLabel: capitalizeFr(format(day, "EEEE", { locale: fr })),
      moisLabel: capitalizeFr(format(day, "MMMM", { locale: fr })),
      cells,
    };
  });
}
