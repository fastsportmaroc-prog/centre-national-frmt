import { shouldUseLocalTestStorage } from "@/lib/local-test/mode";
import { readJson } from "@/lib/local-test/storage";
import { getStageProvisionSummaries } from "@/lib/data/stage-besoins";
import type { StageCalendarEntry } from "@/lib/types/stage-logistique";

export type CalendrierEvenementType = "stage" | "hebergement" | "restauration" | "terrain" | "alerte";

export type CalendrierEvenement = {
  id: string;
  type: CalendrierEvenementType;
  titre: string;
  date_debut: string;
  date_fin: string;
  stage_id: string;
  href?: string;
};

const TYPE_COLORS: Record<CalendrierEvenementType, string> = {
  stage: "bg-frmt-green/20 border-frmt-green text-frmt-green",
  hebergement: "bg-blue-500/15 border-blue-500 text-blue-300",
  restauration: "bg-orange-500/15 border-orange-500 text-orange-300",
  terrain: "bg-violet-500/15 border-violet-500 text-violet-300",
  alerte: "bg-red-500/15 border-red-500 text-red-300",
};

export function calendrierTypeClass(type: CalendrierEvenementType): string {
  return TYPE_COLORS[type];
}

/** Événements calendrier issus des stages provisionnés (local + Supabase). */
export async function getCalendrierEvenementsStage(): Promise<CalendrierEvenement[]> {
  const events: CalendrierEvenement[] = [];
  const summaries = await getStageProvisionSummaries();

  for (const { stage, hebergement, besoins_restauration, reservations, conflits } of summaries) {
    events.push({
      id: `stage-${stage.id}`,
      type: "stage",
      titre: stage.stage_action,
      date_debut: stage.date_debut,
      date_fin: stage.date_fin,
      stage_id: stage.id,
      href: `/stages/${stage.id}`,
    });

    if (hebergement) {
      events.push({
        id: `heb-${stage.id}`,
        type: "hebergement",
        titre: `Hébergement — ${stage.stage_action}`,
        date_debut: hebergement.date_debut,
        date_fin: hebergement.date_fin,
        stage_id: stage.id,
        href: `/stages/${stage.id}`,
      });
    }

    if (besoins_restauration.length > 0) {
      const d0 = besoins_restauration[0]!.date_evenement;
      const d1 =
        besoins_restauration[besoins_restauration.length - 1]!.date_evenement ?? d0;
      events.push({
        id: `resto-${stage.id}`,
        type: "restauration",
        titre: `Restauration — ${stage.stage_action}`,
        date_debut: d0,
        date_fin: d1,
        stage_id: stage.id,
        href: `/stages/${stage.id}`,
      });
    }

    for (const r of reservations) {
      events.push({
        id: `terrain-${r.id}`,
        type: "terrain",
        titre: r.notes ?? `Terrain — ${stage.stage_action}`,
        date_debut: r.date_debut.slice(0, 10),
        date_fin: r.date_fin.slice(0, 10),
        stage_id: stage.id,
        href: `/stages/${stage.id}`,
      });
    }

    for (const c of conflits) {
      events.push({
        id: `alert-${stage.id}-${events.length}`,
        type: "alerte",
        titre: c,
        date_debut: stage.date_debut,
        date_fin: stage.date_fin,
        stage_id: stage.id,
      });
    }
  }

  if (shouldUseLocalTestStorage()) {
    const cal = readJson<{ stage_id: string; entries: StageCalendarEntry[] }[]>(
      "calendrier_stages",
      []
    );
    for (const block of cal) {
      for (const entry of block.entries) {
        if (events.some((e) => e.id === `terrain-local-${entry.infrastructure_id}-${entry.date}`)) {
          continue;
        }
        events.push({
          id: `terrain-local-${entry.infrastructure_id}-${entry.date}`,
          type: "terrain",
          titre: entry.label,
          date_debut: entry.date,
          date_fin: entry.date,
          stage_id: block.stage_id,
          href: `/stages/${block.stage_id}`,
        });
      }
    }
  }

  return events.sort((a, b) => a.date_debut.localeCompare(b.date_debut));
}
