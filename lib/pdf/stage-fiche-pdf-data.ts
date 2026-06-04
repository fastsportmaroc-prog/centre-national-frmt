import { formatDateFR, formatStatutPdf, safePdfCell } from "@/lib/pdf/pdf-format";
import type { HebergementStageV2, JourRepasStage, RestaurationStageV2 } from "@/lib/types/v2";
import { getCreneauInfoForReservation } from "@/lib/v2/reservations-utils";

export type StageTerrainReservationPdfRow = {
  reservation_id: string;
  terrain_id?: string | null;
  terrain_nom?: string | null;
  date_debut: string;
  date_fin: string;
  creneau?: string | null;
  mode?: string | null;
  nb_joueurs_dispatches?: number | null;
  resa_statut?: string | null;
  stage_id?: string;
};

export type StageRestaurationPdfContext = {
  /** Case « restauration » sur le stage (stages_programme.restauration). */
  stageIncluded?: boolean;
  /** Fiche restaurations ou onglet restauration actif. */
  active?: boolean;
  /** Planning repas (stage_restauration_jours). */
  hasJoursRepas?: boolean;
  dates: { debut: string; fin: string };
  meals: { pdj: boolean; dej: boolean; din: boolean; eau: boolean };
  record: RestaurationStageV2 | null;
  personsCount: number;
  totalRepasEstimate?: number;
};

/** Restauration considérée incluse (évite « Non » à tort dans le PDF). */
export function isStageRestaurationIncluded(ctx: StageRestaurationPdfContext): boolean {
  if (ctx.stageIncluded) return true;
  if (ctx.record) return true;
  if (ctx.active) return true;
  if (ctx.hasJoursRepas) return true;
  if (ctx.meals.pdj || ctx.meals.dej || ctx.meals.din) return true;
  return false;
}

export function mealsFromRestaurationJours(jours: JourRepasStage[]): {
  pdj: boolean;
  dej: boolean;
  din: boolean;
} {
  return {
    pdj: jours.some((j) => j.petit_dejeuner),
    dej: jours.some((j) => j.dejeuner),
    din: jours.some((j) => j.diner),
  };
}

function champValeurRows(entries: [string, string][]): Record<string, string>[] {
  return entries.map(([Champ, Valeur]) => ({ Champ, Valeur }));
}

export function buildHebergementPdfRows(
  stageHebergementFlag: boolean,
  hebergement: HebergementStageV2 | null
): Record<string, string>[] {
  if (!stageHebergementFlag && !hebergement) {
    return champValeurRows([["Hébergement", "Non activé pour ce stage"]]);
  }
  if (!hebergement) {
    return champValeurRows([["Hébergement", "Activé — fiche non enregistrée"]]);
  }

  const totalChambres =
    (hebergement.nb_chambres_joueurs ?? 0) + (hebergement.nb_chambres_coachs ?? 0) ||
    hebergement.chambres;

  return champValeurRows([
    ["Statut", formatStatutPdf(hebergement.statut)],
    [
      "Période",
      `${formatDateFR(hebergement.date_debut)} → ${formatDateFR(hebergement.date_fin)}`,
    ],
    ["Chambres joueurs", safePdfCell(hebergement.nb_chambres_joueurs)],
    ["Chambres encadrants", safePdfCell(hebergement.nb_chambres_coachs)],
    ["Total chambres", safePdfCell(totalChambres)],
    ["Type chambre joueurs", safePdfCell(hebergement.type_chambre_joueurs)],
    ["Type chambre encadrants", safePdfCell(hebergement.type_chambre_coachs)],
    ["Kitchenette", hebergement.kitchenette ? "Oui" : "Non"],
    ["Remarques", safePdfCell(hebergement.remarques)],
  ]);
}

function stripRestaurationNotes(raw: string | null | undefined): string {
  if (!raw) return "—";
  return raw.replace(/\[EAU:(oui|non)\]/gi, "").trim() || "—";
}

export function buildRestaurationPdfRows(ctx: StageRestaurationPdfContext): Record<string, string>[] {
  const included = isStageRestaurationIncluded(ctx);
  if (!included) {
    return champValeurRows([["Restauration incluse", "Non"]]);
  }

  const repasLabels = [
    ctx.meals.pdj ? "Petit-déjeuner" : null,
    ctx.meals.dej ? "Déjeuner" : null,
    ctx.meals.din ? "Dîner" : null,
  ].filter(Boolean) as string[];

  const rows: [string, string][] = [
    ["Restauration incluse", "Oui"],
    ["Statut", formatStatutPdf(ctx.record?.statut ?? (ctx.hasJoursRepas ? "confirme" : "prevu"))],
    [
      "Période",
      ctx.dates.debut && ctx.dates.fin
        ? `${formatDateFR(ctx.dates.debut)} → ${formatDateFR(ctx.dates.fin)}`
        : "—",
    ],
    [
      "Repas prévus",
      repasLabels.length ? repasLabels.join(", ") : "À préciser (planning repas)",
    ],
    ["Eau incluse", ctx.meals.eau ? "Oui" : "Non"],
    ["Personnes (stage)", String(ctx.personsCount)],
  ];

  if (ctx.hasJoursRepas && !ctx.record) {
    rows.push(["Planning repas", "Configuré (détail par jour en application)"]);
  } else if (!ctx.record) {
    rows.push(["Fiche facturation", "À enregistrer si besoin"]);
  }

  if (ctx.record) {
    rows.push(
      ["Nb personnes (fiche)", safePdfCell(ctx.record.nb_personnes)],
      ["Total repas (fiche)", safePdfCell(ctx.record.total_repas)]
    );
  }
  if (ctx.totalRepasEstimate != null && ctx.totalRepasEstimate > 0) {
    rows.push(["Total repas estimé", String(ctx.totalRepasEstimate)]);
  }
  rows.push(["Remarques", stripRestaurationNotes(ctx.record?.remarques)]);

  return champValeurRows(rows);
}

export function buildTerrainsPdfRows(
  reservations: StageTerrainReservationPdfRow[],
  terrainsConfigured: boolean
): Record<string, string>[] {
  if (reservations.length === 0) {
    return champValeurRows([
      ["Terrains", terrainsConfigured ? "Configuré — aucune réservation enregistrée" : "Non configuré"],
    ]);
  }

  return reservations.map((r) => {
    const creneau = getCreneauInfoForReservation({
      id: String(r.reservation_id),
      infrastructure_id: String(r.terrain_id ?? ""),
      stage_id: String(r.stage_id ?? ""),
      date_debut: String(r.date_debut).includes("T")
        ? String(r.date_debut)
        : `${String(r.date_debut).slice(0, 10)}T12:00:00`,
      date_fin: String(r.date_fin).includes("T")
        ? String(r.date_fin)
        : `${String(r.date_fin).slice(0, 10)}T12:00:00`,
      creneau: String(r.creneau ?? "journee").replace("apres-midi", "apres_midi"),
      heure_debut: null,
      heure_fin: null,
      statut: String(r.resa_statut ?? "confirmee"),
    });
    const dateLine =
      r.date_fin !== r.date_debut
        ? `${formatDateFR(r.date_debut)} → ${formatDateFR(r.date_fin)}`
        : formatDateFR(r.date_debut);

    return {
      Terrain: safePdfCell(r.terrain_nom),
      Date: dateLine,
      Créneau: creneau.label,
      Mode: safePdfCell(r.mode),
      Dispatch: safePdfCell(r.nb_joueurs_dispatches ?? 0),
      Statut: formatStatutPdf(String(r.resa_statut ?? "confirme")),
    };
  });
}
