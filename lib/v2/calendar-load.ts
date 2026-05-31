import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";

import { getCalendrierPeriode } from "@/lib/data/terrains";

import { getSafeSupabaseClient } from "@/lib/supabase/client";

import {

  getBilletsAvion,

  getHebergements,

  getRestaurations,

  getStages,

} from "@/lib/supabase/queries";

import type {

  DemandeBilletAvionV2,

  HebergementStageV2,

  ReservationEnrichedV2,

  RestaurationStageV2,

  StageProgrammeV2,

} from "@/lib/types/v2";

import type { CalendarRawData } from "@/lib/v2/calendar-events";

import { dateOnlyString, rangesOverlap } from "@/lib/v2/calendar-dates";

export type CalendarLoadResult = CalendarRawData & {

  loadError: string | null;

  debugCounts: Record<string, number>;

};



type ViewMode = "year" | "month" | "week" | "day";



function mapStageRow(row: Record<string, unknown>): StageProgrammeV2 {

  const r = row as StageProgrammeV2;

  return {

    ...r,

    stage_action: String(r.stage_action ?? (row.nom as string) ?? "Stage"),

    date_debut: dateOnlyString(r.date_debut),

    date_fin: dateOnlyString(r.date_fin || r.date_debut),

  };

}



function creneauToIso(

  day: string,

  creneau: string

): { debut: string; fin: string; creneau: "matin" | "apres_midi" | "journee" } {

  const d = dateOnlyString(day);

  const c = (creneau ?? "").toLowerCase();

  if (c.includes("apres")) {

    return { debut: `${d}T14:00:00`, fin: `${d}T18:00:00`, creneau: "apres_midi" };

  }

  if (c.includes("matin")) {

    return { debut: `${d}T09:00:00`, fin: `${d}T13:00:00`, creneau: "matin" };

  }

  return { debut: `${d}T09:00:00`, fin: `${d}T18:00:00`, creneau: "journee" };

}



function mapTerrainRow(row: Record<string, unknown>): ReservationEnrichedV2 | null {

  const stageId = row.stage_id as string | undefined;

  if (!stageId) return null;

  const day = dateOnlyString(String(row.date_debut ?? ""));

  if (!day) return null;

  const { debut, fin, creneau } = creneauToIso(day, String(row.creneau ?? "journee"));

  const reservationId = String(row.reservation_id ?? `${stageId}-${row.terrain_id}-${day}-${creneau}`);

  return {

    id: reservationId,

    infrastructure_id: String(row.terrain_id ?? ""),

    stage_id: stageId,

    date_debut: debut,

    date_fin: fin,

    creneau,

    heure_debut: debut.slice(11, 16),

    heure_fin: fin.slice(11, 16),

    statut: String(row.resa_statut ?? "confirmee"),

    notes: null,

    stage_nom: (row.stage_nom as string) ?? null,

    stage_categorie: (row.stage_categorie as string) ?? null,

    court_nom: (row.terrain_nom as string) ?? null,

    court_surface: (row.terrain_surface as string) ?? null,

    groupe: (row.stage_categorie as string) ?? null,

  };

}



async function loadStagesForCalendar(debut: string, fin: string): Promise<StageProgrammeV2[]> {

  const all = await getStages();

  return all

    .filter((s) => s.statut !== "annule")

    .map((s) => ({

      ...s,

      stage_action: String(s.stage_action ?? "Stage").trim() || "Stage",

      date_debut: dateOnlyString(s.date_debut),

      date_fin: dateOnlyString(s.date_fin || s.date_debut),

    }))

    .filter((s) => rangesOverlap(s.date_debut, s.date_fin, debut, fin));

}



async function loadMergedCalendarReservations(

  debut: string,

  fin: string

): Promise<ReservationEnrichedV2[]> {

  const terrainRows = await getCalendrierPeriode(debut, fin).catch(
    () => [] as Record<string, unknown>[]
  );

  const byId = new Map<string, ReservationEnrichedV2>();

  for (const row of terrainRows) {

    const mapped = mapTerrainRow(row as Record<string, unknown>);

    if (!mapped) continue;

    const d = dateOnlyString(mapped.date_debut);

    if (d < debut || d > fin) continue;

    if (!byId.has(mapped.id)) byId.set(mapped.id, mapped);

  }



  return [...byId.values()].sort((a, b) => a.date_debut.localeCompare(b.date_debut));

}



async function loadHebergementsForCalendar(debut: string, fin: string) {

  const rows = await getHebergements();

  return rows.filter((h) => rangesOverlap(h.date_debut, h.date_fin ?? h.date_debut, debut, fin));

}



export function getVisibleDateWindow(cursor: Date, view: ViewMode): { debut: string; fin: string } {

  if (view === "year") {

    const y = cursor.getFullYear();

    return { debut: `${y}-01-01`, fin: `${y}-12-31` };

  }

  if (view === "week") {

    const ws = startOfWeek(cursor, { weekStartsOn: 1 });

    const we = endOfWeek(cursor, { weekStartsOn: 1 });

    return { debut: format(ws, "yyyy-MM-dd"), fin: format(we, "yyyy-MM-dd") };

  }

  if (view === "day") {

    const d = format(cursor, "yyyy-MM-dd");

    return { debut: d, fin: d };

  }

  const mStart = startOfMonth(cursor);

  const mEnd = endOfMonth(cursor);

  return { debut: format(mStart, "yyyy-MM-dd"), fin: format(mEnd, "yyyy-MM-dd") };

}



function filterOverlapping<T extends { date_debut: string; date_fin?: string }>(

  rows: T[],

  debut: string,

  fin: string

): T[] {

  return rows.filter((r) =>

    rangesOverlap(r.date_debut, r.date_fin ?? r.date_debut, debut, fin)

  );

}



function filterBilletsMonth(rows: DemandeBilletAvionV2[], debut: string, fin: string) {

  return rows.filter((b) => {

    const d = dateOnlyString(b.date_depart);

    return d >= debut && d <= fin;

  });

}



async function loadFromSupabaseFiltered(

  debut: string,

  fin: string

): Promise<CalendarRawData | null> {

  const client = getSafeSupabaseClient();

  if (!client) return null;



  const [stagesRes, hebRes, hebStageRes, restRes, bilRes] = await Promise.all([

    client

      .from("stages_programme")

      .select("*")

      .lte("date_debut", fin)

      .gte("date_fin", debut)

      .neq("statut", "annule")

      .order("date_debut", { ascending: true }),

    client

      .from("hebergements")

      .select("*")

      .lte("date_debut", fin)

      .gte("date_fin", debut)

      .order("date_debut", { ascending: true }),

    client

      .from("hebergements_stage")

      .select("*")

      .lte("date_debut", fin)

      .gte("date_fin", debut)

      .order("date_debut", { ascending: true }),

    client

      .from("restaurations")

      .select("*")

      .lte("date_debut", fin)

      .gte("date_fin", debut)

      .order("date_debut", { ascending: true }),

    client

      .from("demandes_billet_avion")

      .select("*")

      .gte("date_depart", debut)

      .lte("date_depart", fin)

      .order("date_depart", { ascending: true }),

  ]);



  const errors = [stagesRes.error, hebRes.error, hebStageRes.error, restRes.error, bilRes.error].filter(Boolean);

  if (errors.length > 0) {

    console.warn("[Calendrier] Supabase filtres:", errors.map((e) => e!.message).join(" | "));

  }



  let stages = ((stagesRes.data ?? []) as Record<string, unknown>[]).map(mapStageRow);

  if (stages.length === 0) stages = await loadStagesForCalendar(debut, fin);



  const hebergementsRaw = [

    ...((hebRes.data ?? []) as HebergementStageV2[]),

    ...((hebStageRes.data ?? []) as HebergementStageV2[]),

  ];

  const hebergementsById = new Map(hebergementsRaw.map((h) => [h.id, h]));

  const hebergements = [...hebergementsById.values()].filter((h) =>

    rangesOverlap(h.date_debut, h.date_fin ?? h.date_debut, debut, fin)

  );



  const reservations = await loadMergedCalendarReservations(debut, fin);



  return {

    stages,

    hebergements,

    reservations,

    restaurations: (restRes.data ?? []) as RestaurationStageV2[],

    billets: (bilRes.data ?? []) as DemandeBilletAvionV2[],

  };

}



async function loadFallbackAll(debut: string, fin: string): Promise<CalendarRawData> {

  const [stages, hebergements, reservations, restaurations, billets] = await Promise.all([

    loadStagesForCalendar(debut, fin),

    loadHebergementsForCalendar(debut, fin),

    loadMergedCalendarReservations(debut, fin),

    getRestaurations(),

    getBilletsAvion(),

  ]);



  return {

    stages,

    hebergements,

    reservations,

    restaurations: filterOverlapping(restaurations, debut, fin),

    billets: filterBilletsMonth(billets, debut, fin),

  };

}



export async function loadCalendarMonthData(

  cursor: Date,

  view: ViewMode

): Promise<CalendarLoadResult> {

  const { debut, fin } = getVisibleDateWindow(cursor, view);



  try {

    const filtered = await loadFromSupabaseFiltered(debut, fin);

    const raw = filtered ?? (await loadFallbackAll(debut, fin));



    if (process.env.NODE_ENV === "development") {

      console.log("[Calendrier] chargement", { debut, fin, view, counts: {

        stages: raw.stages.length,

        hebergements: raw.hebergements.length,

        reservations: raw.reservations.length,

        restaurations: raw.restaurations.length,

        billets: raw.billets.length,

      }});

    }



    return {

      ...raw,

      loadError: null,

      debugCounts: {

        stages: raw.stages.length,

        hebergements: raw.hebergements.length,

        reservations: raw.reservations.length,

        restaurations: raw.restaurations.length,

        billets: raw.billets.length,

      },

    };

  } catch (e) {

    const msg = e instanceof Error ? e.message : String(e);

    console.warn("[Calendrier] erreur chargement:", msg);

    const raw = await loadFallbackAll(debut, fin);

    return {

      ...raw,

      loadError: msg,

      debugCounts: {

        stages: raw.stages.length,

        hebergements: raw.hebergements.length,

        reservations: raw.reservations.length,

        restaurations: raw.restaurations.length,

        billets: raw.billets.length,

      },

    };

  }

}

