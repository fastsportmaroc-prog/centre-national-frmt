import type { CalendarRawData } from "@/lib/v2/calendar-events";
import type { PlayerCategoryContext } from "@/lib/auth/player-category-context";
import { matchesEntityCategory } from "@/lib/auth/player-category-context";

/** Filtre les données calendrier selon la catégorie des stages. */
export function filterCalendarRawData(
  raw: CalendarRawData,
  ctx: PlayerCategoryContext
): CalendarRawData {
  if (!ctx.restricted) return raw;

  const allowedStageIds = new Set(
    raw.stages
      .filter((s) => matchesEntityCategory(s.categorie, ctx.allowedCategories, false))
      .map((s) => s.id)
  );

  return {
    stages: raw.stages.filter((s) => allowedStageIds.has(s.id)),
    hebergements: raw.hebergements.filter((h) => allowedStageIds.has(h.stage_id)),
    reservations: raw.reservations.filter((r) => r.stage_id && allowedStageIds.has(r.stage_id)),
    restaurations: raw.restaurations.filter((r) => allowedStageIds.has(r.stage_id)),
    billets: raw.billets.filter((b) => allowedStageIds.has(b.stage_id)),
  };
}
