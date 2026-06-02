import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseDataClient } from "@/lib/supabase/data-client";
import { infraRowToConflictRow } from "@/lib/terrain/conflict-adapters";
import { eachDayOfStage } from "@/lib/v2/stage-calculations";
import { hasConflict } from "@/services/conflictDetector";
import { getCreneauRange } from "@/services/terrain-constants";

/** Client Supabase (lectures + appels depuis Client Components). */
async function getTerrainsSupabaseClient(): Promise<SupabaseClient> {
  return getSupabaseDataClient();
}

/* ─── TYPES ─── */
export type Creneau = "matin" | "apres-midi" | "journee";
export type ModeDispatch = "stage" | "dispatch";

export interface TerrainBesoin {
  terrainId: string;
  terrainNom?: string;
  terrainType?: string;
  terrainSurface?: string;
  terrainCapacite?: number;
  jours?: string[]; // YYYY-MM-DD choisis explicitement
  creneaux: Creneau[];
  mode: ModeDispatch;
  joueurIds?: string[];
  notes?: string;
}

function asError(err: unknown, fallback = "Erreur terrain"): Error {
  if (err instanceof Error) return err;
  if (typeof err === "string") return new Error(err);
  if (err && typeof err === "object" && "message" in err) {
    return new Error(String((err as any).message));
  }
  try {
    return new Error(JSON.stringify(err));
  } catch {
    return new Error(fallback);
  }
}

function inferCreneauFromLegacyRow(row: {
  creneau?: string | null;
  date_debut?: string | null;
  date_fin?: string | null;
  heure_debut?: string | null;
  heure_fin?: string | null;
}): "matin" | "apres-midi" | "journee" {
  const c = (row.creneau ?? "").toLowerCase().replace(/-/g, "_");
  if (c.includes("journee") || c.includes("journée")) return "journee";
  if (c.includes("apres")) return "apres-midi";
  if (c === "matin" || c.includes("matin")) return "matin";

  const hD = String(row.heure_debut ?? "").slice(0, 5);
  const hF = String(row.heure_fin ?? "").slice(0, 5);
  if (hD === "09:00" && hF === "13:00") return "matin";
  if (hD === "14:00" && hF === "18:00") return "apres-midi";
  if (hD === "09:00" && hF === "18:00") return "journee";

  const start = String(row.date_debut ?? "");
  const end = String(row.date_fin ?? "");
  const hasTime = start.includes("T") && end.includes("T");
  if (hasTime) {
    const hStart = Number(start.slice(11, 13)) + Number(start.slice(14, 16)) / 60;
    const hEnd = Number(end.slice(11, 13)) + Number(end.slice(14, 16)) / 60;
    if (hStart >= 13) return "apres-midi";
    if (hEnd <= 13.5) return "matin";
    if (hStart < 12 && hEnd > 15) return "journee";
  }
  return "journee";
}

function mapLegacyCreneau(
  creneau: string | null | undefined,
  row?: {
    date_debut?: string | null;
    date_fin?: string | null;
    heure_debut?: string | null;
    heure_fin?: string | null;
  }
): "matin" | "apres-midi" | "journee" {
  if (creneau?.trim()) {
    const c = creneau.toLowerCase().replace(/-/g, "_");
    if (c.includes("journee") || c.includes("journée")) return "journee";
    if (c.includes("apres")) return "apres-midi";
    if (c === "matin" || c.includes("matin")) return "matin";
  }
  if (row) return inferCreneauFromLegacyRow({ creneau, ...row });
  return "journee";
}

function extractLegacyModeAndDispatch(notes: string | null | undefined): {
  mode: ModeDispatch;
  nbDispatch: number;
} {
  const n = notes ?? "";
  const mode = /\[MODE:dispatch\]/i.test(n) || /\bdispatch\b/i.test(n) ? "dispatch" : "stage";
  const countMatch = n.match(/\[DISPATCH_N:(\d+)\]/i);
  const fallbackCountMatch = n.match(/(\d+)\s*joueur/i);
  const nbDispatch = countMatch
    ? Number(countMatch[1]) || 0
    : fallbackCountMatch
      ? Number(fallbackCountMatch[1]) || 0
      : 0;
  return { mode, nbDispatch };
}

async function fetchLegacyReservationsInfra(
  supabase: Awaited<ReturnType<typeof getTerrainsSupabaseClient>>,
  filters?: {
    stageId?: string;
    terrainId?: string;
    dateDebut?: string;
    dateFin?: string;
  }
) {
  const { fetchAllPages } = await import("@/lib/supabase/paged-select");

  const selectWithCreneau =
    "id, infrastructure_id, stage_id, date_debut, date_fin, creneau, statut, notes";
  const selectLegacy = "id, infrastructure_id, stage_id, date_debut, date_fin, statut, notes";

  function baseQuery(columns: string) {
    let q = supabase.from("reservations_infrastructure").select(columns);
    if (filters?.stageId) q = q.eq("stage_id", filters.stageId);
    if (filters?.terrainId) q = q.eq("infrastructure_id", filters.terrainId);
    if (filters?.dateDebut) q = q.gte("date_fin", filters.dateDebut);
    if (filters?.dateFin) q = q.lte("date_debut", filters.dateFin);
    return q;
  }

  const probe = await baseQuery(selectWithCreneau)
    .order("date_debut", { ascending: true })
    .range(0, 0);

  if (!probe.error) {
    return fetchAllPages<Record<string, unknown>>((from, to) =>
      baseQuery(selectWithCreneau)
        .order("date_debut", { ascending: true })
        .range(from, to)
        .then(({ data, error }) => ({ data: data as Record<string, unknown>[] | null, error }))
    );
  }

  const rows = await fetchAllPages<Record<string, unknown>>((from, to) =>
    baseQuery(selectLegacy)
      .order("date_debut", { ascending: true })
      .range(from, to)
      .then(({ data, error }) => ({ data: data as Record<string, unknown>[] | null, error }))
  );
  return rows.map((r) => ({
    ...r,
    creneau: inferCreneauFromLegacyRow(r),
  }));
}

async function buildLegacyCalendrierRows(filters?: {
  stageId?: string;
  terrainId?: string;
  dateDebut?: string;
  dateFin?: string;
}) {
  const supabase = await getTerrainsSupabaseClient();
  const resa = await fetchLegacyReservationsInfra(supabase, filters);
  if (!resa?.length) return [];

  const infraIds = [...new Set(resa.map((r: any) => r.infrastructure_id).filter(Boolean))];
  const stageIds = [...new Set(resa.map((r: any) => r.stage_id).filter(Boolean))];

  const [{ data: infras }, { data: stages }, dispatchRes] = await Promise.all([
    infraIds.length
      ? supabase
          .from("infrastructures")
          .select("id, nom, type, surface")
          .in("id", infraIds)
      : Promise.resolve({ data: [] as any[] }),
    stageIds.length
      ? supabase
          .from("stages_programme")
          .select("id, stage_action, categorie, statut")
          .in("id", stageIds)
      : Promise.resolve({ data: [] as any[] }),
    // La table terrain_dispatch peut ne pas exister selon l'environnement
    supabase.from("terrain_dispatch").select("reservation_id, joueur_id"),
  ]);

  const infraById = new Map((infras ?? []).map((i: any) => [i.id, i]));
  const stageById = new Map((stages ?? []).map((s: any) => [s.id, s]));
  const dispatchCount = new Map<string, number>();
  const dispatchNames = new Map<string, string[]>();
  if (!dispatchRes.error) {
    const joueurIds = [
      ...new Set((dispatchRes.data ?? []).map((d: any) => d.joueur_id).filter(Boolean)),
    ];
    let joueurNameById = new Map<string, string>();
    if (joueurIds.length > 0) {
      const joueursRes = await supabase
        .from("joueurs")
        .select("id, nom, prenom")
        .in("id", joueurIds);
      if (!joueursRes.error) {
        joueurNameById = new Map(
          (joueursRes.data ?? []).map((j: any) => [
            j.id,
            [j.prenom, j.nom].filter(Boolean).join(" ").trim() || "Joueur",
          ])
        );
      }
    }
    for (const d of dispatchRes.data ?? []) {
      const k = (d as any).reservation_id as string;
      dispatchCount.set(k, (dispatchCount.get(k) ?? 0) + 1);
      const joueurNom = joueurNameById.get((d as any).joueur_id as string);
      if (joueurNom) {
        const prev = dispatchNames.get(k) ?? [];
        dispatchNames.set(k, [...prev, joueurNom]);
      }
    }
  }

  return resa.map((r: any) => {
    const infra = infraById.get(r.infrastructure_id);
    const st = stageById.get(r.stage_id);
    const extra = extractLegacyModeAndDispatch(r.notes);
    const nbDispatch = Math.max(dispatchCount.get(r.id) ?? 0, extra.nbDispatch);
    return {
      reservation_id: r.id,
      terrain_id: r.infrastructure_id,
      terrain_nom: infra?.nom ?? "—",
      terrain_type: infra?.type ?? "court-tennis",
      terrain_surface: infra?.surface ?? "—",
      stage_id: r.stage_id,
      stage_nom: st?.stage_action ?? "—",
      stage_categorie: st?.categorie ?? "—",
      stage_statut: st?.statut ?? "—",
      date_debut: String(r.date_debut).slice(0, 10),
      date_fin: String(r.date_fin).slice(0, 10),
      creneau: mapLegacyCreneau(r.creneau, r),
      mode: extra.mode,
      resa_statut: r.statut ?? "confirmee",
      nb_joueurs_dispatches: nbDispatch,
      dispatch_joueurs_noms: dispatchNames.get(r.id) ?? [],
    };
  });
}

async function enrichDispatchNames(rows: any[]): Promise<any[]> {
  if (!rows.length) return rows;
  const supabase = await getTerrainsSupabaseClient();
  const reservationIds = [...new Set(rows.map((r: any) => r.reservation_id).filter(Boolean))];
  if (!reservationIds.length) return rows;
  const dispatchRes = await supabase
    .from("terrain_dispatch")
    .select("reservation_id, joueur_id")
    .in("reservation_id", reservationIds);
  if (dispatchRes.error || !(dispatchRes.data ?? []).length) return rows;

  const joueurIds = [...new Set((dispatchRes.data ?? []).map((d: any) => d.joueur_id).filter(Boolean))];
  const joueursRes = joueurIds.length
    ? await supabase.from("joueurs").select("id, nom, prenom").in("id", joueurIds)
    : { data: [] as any[], error: null as any };
  const joueurNameById = new Map(
    (joueursRes.data ?? []).map((j: any) => [
      j.id,
      [j.prenom, j.nom].filter(Boolean).join(" ").trim() || "Joueur",
    ])
  );

  const namesByReservation = new Map<string, string[]>();
  for (const d of dispatchRes.data ?? []) {
    const rid = String((d as any).reservation_id);
    const name = joueurNameById.get((d as any).joueur_id as string);
    if (!name) continue;
    const prev = namesByReservation.get(rid) ?? [];
    namesByReservation.set(rid, [...prev, name]);
  }

  return rows.map((r: any) => ({
    ...r,
    dispatch_joueurs_noms: namesByReservation.get(String(r.reservation_id)) ?? [],
    nb_joueurs_dispatches: Math.max(
      Number(r.nb_joueurs_dispatches ?? 0),
      (namesByReservation.get(String(r.reservation_id)) ?? []).length
    ),
  }));
}

/* ─── LISTER TOUS LES TERRAINS ─── */
export const getTerrains = async () => {
  const supabase = await getTerrainsSupabaseClient();
  const { data, error } = await supabase
    .from("terrains")
    .select("*")
    .eq("actif", true)
    .order("ordre");
  if (!error && (data?.length ?? 0) > 0) return data ?? [];

  // Fallback compatibilité : utiliser la table historique "infrastructures"
  // quand "terrains" n'est pas encore alimentée/migrée.
  const { data: infra, error: infraErr } = await supabase
    .from("infrastructures")
    .select("id, nom, type, surface, capacite, actif")
    .eq("actif", true)
    .order("nom");
  if (infraErr) throw asError(infraErr, "Erreur lecture infrastructures");
  const normalizeType = (t?: string) => {
    const v = (t ?? "").toLowerCase();
    if (v.includes("terrain") || v.includes("court")) return "court-tennis";
    if (v.includes("fitness") || v.includes("physique")) return "salle-fitness";
    if (v.includes("natation") || v.includes("piscine")) return "piscine";
    if (v.includes("gym")) return "gymnase";
    return v || "court-tennis";
  };

  const normalizeSurface = (s?: string) => {
    const v = (s ?? "").toLowerCase();
    if (v.includes("terre")) return "terre-battue";
    if (v.includes("dur") || v.includes("hard")) return "dur";
    if (v.includes("eau")) return "eau";
    if (v.includes("indoor") || v.includes("interieur") || v.includes("intérieur")) return "intérieur";
    return s ?? "autre";
  };

  const normalizeNom = (nom?: string, surface?: string) => {
    const n = (nom ?? "").trim();
    const match = n.match(/court\s*([0-9]+)/i);
    const num = match?.[1];
    const surf = normalizeSurface(surface);
    if (num && surf === "terre-battue") return `Court ${num} — Terre Battue`;
    if (num && surf === "dur") return `Court ${num} — Surface Dure`;
    return n;
  };

  return (infra ?? []).map((i: any, idx: number) => {
    const surface = normalizeSurface(i.surface);
    return {
      id: i.id,
      nom: normalizeNom(i.nom, i.surface),
      type: normalizeType(i.type),
      surface,
      capacite: i.capacite ?? 0,
      actif: i.actif ?? true,
      ordre: idx + 1,
    };
  });
};

/* ─── OCCUPATION GLOBALE ─── */
export const getOccupation = async () => {
  const supabase = await getTerrainsSupabaseClient();
  const { data, error } = await supabase
    .from("v_occupation_terrains")
    .select("*");
  if (!error && (data?.length ?? 0) > 0) return data ?? [];

  // Fallback legacy si la vue n'est pas disponible
  let { data: infras, error: infraErr } = await supabase
    .from("infrastructures")
    .select("id, nom, type, surface, capacite, actif")
    .eq("actif", true);
  if (infraErr) throw asError(infraErr, "Erreur lecture infrastructures");
  if (!infras?.length) {
    const terrainsFallback = await getTerrains().catch(() => []);
    infras = terrainsFallback.map((t: any) => ({
      id: t.id,
      nom: t.nom,
      type: t.type,
      surface: t.surface,
      capacite: t.capacite,
      actif: true,
    }));
  }
  let { data: resa, error: resaErr } = await supabase
    .from("reservations_infrastructure")
    .select("id, infrastructure_id, stage_id, date_debut, creneau, statut")
    .in("statut", ["confirmee", "confirme", "confirmé", "confirmer"]);
  if (resaErr) {
    // Fallback schéma legacy sans colonne creneau
    const r2 = await supabase
      .from("reservations_infrastructure")
      .select("id, infrastructure_id, stage_id, date_debut, statut")
      .in("statut", ["confirmee", "confirme", "confirmé", "confirmer"]);
    resa = (r2.data ?? []).map((r: any) => ({
      ...r,
      creneau: inferCreneauFromLegacyRow(r),
    }));
    resaErr = r2.error;
  }
  if (resaErr) throw asError(resaErr, "Erreur lecture reservations_infrastructure");

  const today = new Date();
  const start = new Date();
  start.setDate(today.getDate() - 30);
  const end = new Date();
  end.setDate(today.getDate() + 30);
  const inWindow = (v: string) => {
    const d = new Date(v.includes("T") ? v : `${v}T12:00:00`);
    return !Number.isNaN(d.getTime()) && d >= start && d <= end;
  };

  return (infras ?? []).map((t: any, idx: number) => {
    const rows = (resa ?? []).filter(
      (r: any) => r.infrastructure_id === t.id && inWindow(String(r.date_debut))
    );
    const uniqDay = (pred: (r: any) => boolean) =>
      new Set(rows.filter(pred).map((r: any) => String(r.date_debut).slice(0, 10))).size;
    const nbRes = rows.length;
    return {
      id: t.id,
      nom: t.nom,
      type: t.type,
      surface: t.surface,
      capacite: t.capacite ?? 4,
      ordre: idx + 1,
      nb_stages: new Set(rows.map((r: any) => r.stage_id).filter(Boolean)).size,
      nb_reservations: nbRes,
      jours_matin: uniqDay((r: any) => String(r.creneau ?? "").includes("matin")),
      jours_aprem: uniqDay((r: any) => String(r.creneau ?? "").includes("apres")),
      jours_journee: uniqDay((r: any) => String(r.creneau ?? "").includes("journee")),
      taux_occupation_pct: Number(((nbRes * 100) / (30 * 2)).toFixed(1)),
      prochaine_resa: rows.length ? rows[0].date_debut : null,
    };
  });
};

/* ─── CALENDRIER D'UN TERRAIN ─── */
export const getCalendrierTerrain = async (
  terrainId: string,
  dateDebut: string,
  dateFin: string
) => {
  const supabase = await getTerrainsSupabaseClient();
  const { data, error } = await supabase
    .from("v_calendrier_terrains")
    .select("*")
    .eq("terrain_id", terrainId)
    .lte("date_debut", dateFin)
    .gte("date_fin", dateDebut);
  if (!error && (data?.length ?? 0) > 0) return enrichDispatchNames(data ?? []);
  return buildLegacyCalendrierRows({ terrainId, dateDebut, dateFin });
};

/* ─── CALENDRIER TOUS TERRAINS (période libre) ─── */
export const getCalendrierPeriode = async (dateDebut: string, dateFin: string) => {
  const supabase = await getTerrainsSupabaseClient();
  const { data, error } = await supabase
    .from("v_calendrier_terrains")
    .select("*")
    .lte("date_debut", dateFin)
    .gte("date_fin", dateDebut);
  if (!error && (data?.length ?? 0) > 0) return data ?? [];
  const rows = await buildLegacyCalendrierRows({ dateDebut, dateFin });
  if (rows.length > 0) return rows;
  return buildLegacyCalendrierRows();
};

/* ─── CALENDRIER TOUS TERRAINS (mois) ─── */
export const getCalendrierMois = async (annee: number, mois: number) => {
  const debut = `${annee}-${String(mois).padStart(2, "0")}-01`;
  const lastDay = new Date(annee, mois, 0).getDate();
  const fin = `${annee}-${String(mois).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const supabase = await getTerrainsSupabaseClient();
  const { data, error } = await supabase
    .from("v_calendrier_terrains")
    .select("*")
    .lte("date_debut", fin)
    .gte("date_fin", debut);
  if (!error && (data?.length ?? 0) > 0) return enrichDispatchNames(data ?? []);
  const monthRows = await buildLegacyCalendrierRows({ dateDebut: debut, dateFin: fin });
  if (monthRows.length > 0) return monthRows;
  // Dernier fallback : renvoyer les réservations récentes, même hors mois courant,
  // pour éviter une page totalement vide quand l'utilisateur n'est pas sur le bon mois.
  return buildLegacyCalendrierRows();
};

function dedupeStageTerrainRows(rows: any[]): any[] {
  const byKey = new Map<string, any>();
  for (const r of rows) {
    const day = String(r.date_debut ?? "").slice(0, 10);
    const creneau = String(r.creneau ?? "journee");
    const terrainId = String(r.terrain_id ?? r.infrastructure_id ?? "");
    const key = `${terrainId}|${day}|${creneau}`;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, r);
      continue;
    }
    const prevId = String(prev.reservation_id ?? "");
    const nextId = String(r.reservation_id ?? "");
    if (prevId.length > nextId.length) byKey.set(key, r);
  }
  return [...byKey.values()].sort((a, b) =>
    String(a.date_debut).localeCompare(String(b.date_debut))
  );
}

/* ─── RÉSERVATIONS TERRAINS D'UN STAGE ─── */
export const getReservationsStageTerrains = async (stageId: string) => {
  const supabase = await getTerrainsSupabaseClient();
  const { data, error } = await supabase
    .from("v_calendrier_terrains")
    .select("*")
    .eq("stage_id", stageId)
    .order("date_debut", { ascending: true });
  if (!error && (data?.length ?? 0) > 0) {
    return enrichDispatchNames(dedupeStageTerrainRows(data ?? []));
  }
  return dedupeStageTerrainRows(await buildLegacyCalendrierRows({ stageId }));
};

function isCancelledReservationStatut(statut: string | null | undefined): boolean {
  const s = (statut ?? "").toLowerCase();
  return s.includes("annul");
}

async function fetchInfraConflictCandidates(
  supabase: SupabaseClient,
  infrastructureId: string,
  jour: string,
  excludeStageId?: string
) {
  const { data } = await supabase
    .from("reservations_infrastructure")
    .select("id, stage_id, infrastructure_id, date_debut, creneau, heure_debut, heure_fin, statut")
    .eq("infrastructure_id", infrastructureId)
    .gte("date_debut", `${jour}T00:00:00`)
    .lte("date_debut", `${jour}T23:59:59`);
  return (data ?? [])
    .map((row) => infraRowToConflictRow(row))
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .filter((row) => !excludeStageId || row.stage_id !== excludeStageId);
}

async function hasInfraTimeConflict(
  supabase: SupabaseClient,
  params: {
    infrastructure_id: string;
    stage_id: string;
    jour: string;
    creneau: Creneau;
    heure_debut: string;
    heure_fin: string;
  }
): Promise<boolean> {
  const others = await fetchInfraConflictCandidates(
    supabase,
    params.infrastructure_id,
    params.jour,
    params.stage_id
  );
  return hasConflict(
    {
      stage_id: params.stage_id,
      terrain_id: params.infrastructure_id,
      date: params.jour,
      creneau: params.creneau,
      heure_debut: params.heure_debut,
      heure_fin: params.heure_fin,
    },
    others
  );
}

/* ─── VÉRIFIER CONFLITS (créneaux horaires, hors même stage) ─── */
export const verifierConflits = async (
  terrainId: string,
  dateDebut: string,
  _dateFin: string,
  creneau: Creneau,
  stageIdExclu?: string
): Promise<boolean> => {
  const supabase = await getTerrainsSupabaseClient();
  const jour = dateDebut.slice(0, 10);
  const range = getCreneauRange(creneau);
  const infraId = terrainId;

  const infraConflict = await hasInfraTimeConflict(supabase, {
    infrastructure_id: infraId,
    stage_id: stageIdExclu ?? "__check__",
    jour,
    creneau,
    heure_debut: range.start,
    heure_fin: range.end,
  });
  if (infraConflict) return true;

  const { data: terrainRows } = await supabase
    .from("terrain_reservations")
    .select("id, stage_id, terrain_id, date_debut, creneau, heure_debut, heure_fin, statut")
    .eq("terrain_id", terrainId)
    .eq("date_debut", jour)
    .eq("statut", "confirme");

  const mapped = (terrainRows ?? [])
    .filter((r) => !isCancelledReservationStatut(r.statut))
    .filter((r) => !stageIdExclu || r.stage_id !== stageIdExclu)
    .map((r) => ({
      id: r.id as string,
      stage_id: (r.stage_id as string | null) ?? null,
      terrain_id: r.terrain_id as string,
      date: jour,
      creneau: String(r.creneau ?? creneau),
      heure_debut: r.heure_debut ? String(r.heure_debut).slice(0, 5) : range.start,
      heure_fin: r.heure_fin ? String(r.heure_fin).slice(0, 5) : range.end,
    }));

  return hasConflict(
    {
      stage_id: stageIdExclu ?? "__check__",
      terrain_id: terrainId,
      date: jour,
      creneau,
      heure_debut: range.start,
      heure_fin: range.end,
    },
    mapped
  );
};

/* ─── RÉSERVER TERRAINS DEPUIS UN STAGE ─── */
export const reserverTerrains = async (stage: any): Promise<{
  ok: string[];
  conflits: string[];
}> => {
  const supabase = await getTerrainsSupabaseClient();
  const ok: string[] = [];
  const conflits: string[] = [];
  const creneauLegacy = (c: Creneau): "matin" | "apres_midi" | "journee" =>
    c === "apres-midi" ? "apres_midi" : c;
  const legacyHours = (c: Creneau) => {
    if (c === "matin") return { debut: "09:00:00", fin: "13:00:00" };
    if (c === "apres-midi") return { debut: "14:00:00", fin: "18:00:00" };
    return { debut: "09:00:00", fin: "18:00:00" };
  };
  const normalizeType = (t?: string) => {
    const v = (t ?? "").toLowerCase();
    if (v.includes("terrain") || v.includes("court")) return "court-tennis";
    if (v.includes("fitness") || v.includes("physique")) return "salle-fitness";
    if (v.includes("natation") || v.includes("piscine")) return "piscine";
    if (v.includes("gym")) return "gymnase";
    return v || "court-tennis";
  };
  const normalizeSurface = (s?: string) => {
    const v = (s ?? "").toLowerCase();
    if (v.includes("terre")) return "terre-battue";
    if (v.includes("dur") || v.includes("hard")) return "dur";
    if (v.includes("eau")) return "eau";
    if (v.includes("indoor") || v.includes("interieur") || v.includes("intérieur")) return "intérieur";
    return s ?? "autre";
  };
  const ensureTerrainExists = async (besoin: TerrainBesoin): Promise<string | null> => {
    const terrainId = besoin.terrainId;
    const { data: exists } = await supabase
      .from("terrains")
      .select("id")
      .eq("id", terrainId)
      .maybeSingle();
    if (exists?.id) return exists.id as string;

    const { data: infra } = await supabase
      .from("infrastructures")
      .select("id, nom, type, surface, capacite, actif")
      .eq("id", terrainId)
      .maybeSingle();
    if (infra?.id) {
      const { error: insErr } = await supabase.from("terrains").insert({
        id: infra.id,
        nom: infra.nom,
        type: normalizeType(infra.type ?? undefined),
        surface: normalizeSurface(infra.surface ?? undefined),
        capacite: infra.capacite ?? 4,
        actif: infra.actif ?? true,
        ordre: 0,
      });
      if (!insErr) return infra.id as string;
    }

    // Dernier fallback : résolution par nom (utile si ID diverge entre tables)
    if (besoin.terrainNom) {
      const { data: byNom } = await supabase
        .from("terrains")
        .select("id")
        .eq("nom", besoin.terrainNom)
        .maybeSingle();
      if (byNom?.id) return byNom.id as string;

      const { data: inserted } = await supabase
        .from("terrains")
        .insert({
          nom: besoin.terrainNom,
          type: normalizeType(besoin.terrainType),
          surface: normalizeSurface(besoin.terrainSurface),
          capacite: besoin.terrainCapacite ?? 4,
          actif: true,
          ordre: 0,
        })
        .select("id")
        .single();
      if (inserted?.id) return inserted.id as string;
    }

    return null;
  };
  const eachDay = (debut: string, fin: string): string[] => {
    const out: string[] = [];
    const d0 = new Date(`${debut.slice(0, 10)}T12:00:00`);
    const d1 = new Date(`${fin.slice(0, 10)}T12:00:00`);
    if (Number.isNaN(d0.getTime()) || Number.isNaN(d1.getTime())) return [debut.slice(0, 10)];
    const cur = new Date(d0);
    while (cur <= d1) {
      out.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
    return out;
  };

  // Rubrique Réservations V2 lit `reservations_infrastructure` — toujours persister ici en priorité.
  const useLegacyReservations = true;
  const ensureLegacyInfrastructureId = async (besoin: TerrainBesoin): Promise<string | null> => {
    // 1) ID déjà valide côté infrastructures
    const { data: infraById } = await supabase
      .from("infrastructures")
      .select("id")
      .eq("id", besoin.terrainId)
      .maybeSingle();
    if (infraById?.id) return infraById.id as string;

    // 2) Résolution via table terrains + nom
    const { data: terrainRow } = await supabase
      .from("terrains")
      .select("id, nom, type, surface, capacite")
      .eq("id", besoin.terrainId)
      .maybeSingle();
    const terrainNom = besoin.terrainNom ?? terrainRow?.nom ?? null;
    if (terrainNom) {
      const { data: infraByName } = await supabase
        .from("infrastructures")
        .select("id")
        .eq("nom", terrainNom)
        .maybeSingle();
      if (infraByName?.id) return infraByName.id as string;
    }

    // 3) Créer l'infrastructure manquante et retourner son id
    const { data: created } = await supabase
      .from("infrastructures")
      .insert({
        nom: terrainNom ?? `Terrain ${besoin.terrainId.slice(0, 8)}`,
        type: normalizeType(besoin.terrainType ?? terrainRow?.type),
        surface: normalizeSurface(besoin.terrainSurface ?? terrainRow?.surface),
        capacite: besoin.terrainCapacite ?? terrainRow?.capacite ?? 4,
        actif: true,
        statut: "disponible",
      })
      .select("id")
      .single();
    return (created?.id as string | undefined) ?? null;
  };
  const saveLegacyDispatch = async (
    reservationId: string,
    besoin: TerrainBesoin,
    terrainIdToUse: string,
    jour: string,
    creneau: Creneau
  ) => {
    if (besoin.mode !== "dispatch" || !besoin.joueurIds?.length) return;
    const rows = besoin.joueurIds.map((jid: string) => ({
      reservation_id: reservationId,
      joueur_id: jid,
      stage_id: stage.id,
      terrain_id: terrainIdToUse,
      date_debut: jour,
      date_fin: jour,
      creneau,
    }));
    // Schéma complet
    const up1 = await supabase
      .from("terrain_dispatch")
      .upsert(rows, { onConflict: "joueur_id,stage_id,terrain_id,creneau,date_debut" });
    if (!up1.error) return;
    // Fallback schéma réduit
    const minimal = rows.map((r) => ({
      reservation_id: r.reservation_id,
      joueur_id: r.joueur_id,
    }));
    await supabase.from("terrain_dispatch").upsert(minimal, { onConflict: "reservation_id,joueur_id" });
  };

  for (const besoin of (stage.besoins?.terrains ?? []) as TerrainBesoin[]) {
    const terrainIdToUse = useLegacyReservations
      ? await ensureLegacyInfrastructureId(besoin)
      : await ensureTerrainExists(besoin);
    if (!terrainIdToUse) {
      conflits.push(`${besoin.terrainId}/introuvable`);
      continue;
    }
    const creneauxEffectifs: Creneau[] =
      besoin.creneaux?.length ? besoin.creneaux : (["journee"] as Creneau[]);
    const clearPartialCreneaux = async (jour: string, creneau: Creneau) => {
      if (creneau !== "journee") return;
      await supabase
        .from("terrain_reservations")
        .delete()
        .eq("stage_id", stage.id)
        .eq("terrain_id", terrainIdToUse)
        .eq("date_debut", jour)
        .in("creneau", ["matin", "apres-midi"]);
      const infraId = await ensureLegacyInfrastructureId(besoin);
      if (infraId) {
        await supabase
          .from("reservations_infrastructure")
          .delete()
          .eq("stage_id", stage.id)
          .eq("infrastructure_id", infraId)
          .gte("date_debut", `${jour}T00:00:00`)
          .lte("date_debut", `${jour}T23:59:59`)
          .in("creneau", ["matin", "apres_midi"]);
      }
    };
    for (const creneau of creneauxEffectifs) {
      const joursCibles: string[] =
        besoin.jours?.length && Array.isArray(besoin.jours)
          ? [...new Set(besoin.jours.map((d) => String(d).slice(0, 10)).filter((d) => d.length > 0))]
          : eachDay(stage.dateDebut, stage.dateFin);
      for (const jour of joursCibles) {
        await clearPartialCreneaux(jour, creneau);
        if (useLegacyReservations) {
          const { debut, fin } = legacyHours(creneau);
          const dateDebut = `${jour}T${debut}`;
          const dateFin = `${jour}T${fin}`;
          const dispatchCountValue = besoin.mode === "dispatch" ? besoin.joueurIds?.length ?? 0 : 0;
          const encodedMeta =
            `[MODE:${besoin.mode}]` +
            (besoin.mode === "dispatch" ? `[DISPATCH_N:${dispatchCountValue}]` : "");
          const notesPayload = [besoin.notes?.trim(), encodedMeta].filter(Boolean).join(" ").trim();
          // 1) Conflit réel = chevauchement horaire avec un AUTRE stage (pas le même)
          const realConflict = await hasInfraTimeConflict(supabase, {
            infrastructure_id: terrainIdToUse,
            stage_id: stage.id,
            jour,
            creneau,
            heure_debut: debut.slice(0, 5),
            heure_fin: fin.slice(0, 5),
          });
          if (realConflict) {
            conflits.push(`${terrainIdToUse}/${jour}/${creneau}`);
            continue;
          }

          // Idempotence : une seule ligne par stage + infra + jour + créneau
          await supabase
            .from("reservations_infrastructure")
            .delete()
            .eq("stage_id", stage.id)
            .eq("infrastructure_id", terrainIdToUse)
            .eq("creneau", creneauLegacy(creneau))
            .gte("date_debut", `${jour}T00:00:00`)
            .lte("date_debut", `${jour}T23:59:59`);

          // 2) Mise à jour si déjà présente pour ce stage/jour (upgrade matin → journée)
          const existingSameStage = await supabase
            .from("reservations_infrastructure")
            .select("id, notes, creneau")
            .eq("infrastructure_id", terrainIdToUse)
            .eq("stage_id", stage.id)
            .gte("date_debut", `${jour}T00:00:00`)
            .lte("date_debut", `${jour}T23:59:59`)
            .order("date_debut", { ascending: false })
            .limit(1);
          const existingRow = existingSameStage.data?.[0] as
            | { id: string; notes?: string | null; creneau?: string | null }
            | undefined;
          if (existingRow?.id) {
            const mergedNotes = [String(existingRow.notes ?? "").trim(), notesPayload]
              .filter(Boolean)
              .join(" ")
              .trim();
            await supabase
              .from("reservations_infrastructure")
              .update({
                creneau: creneauLegacy(creneau),
                date_debut: dateDebut,
                date_fin: dateFin,
                heure_debut: debut.slice(0, 5),
                heure_fin: fin.slice(0, 5),
                statut: "confirmee",
                notes: mergedNotes || null,
              })
              .eq("id", existingRow.id);
            if (besoin.mode === "dispatch") {
              await saveLegacyDispatch(existingRow.id, besoin, terrainIdToUse, jour, creneau);
            }
            ok.push(`${terrainIdToUse}/${jour}/${creneau}`);
            continue;
          }

          // 3) Insert normal (avec creneau)
          let legacyInsertErr: any = null;
          const insertWithCreneau = await supabase
            .from("reservations_infrastructure")
            .insert({
              infrastructure_id: terrainIdToUse,
              stage_id: stage.id,
              date_debut: dateDebut,
              date_fin: dateFin,
              creneau: creneauLegacy(creneau),
              heure_debut: debut.slice(0, 5),
              heure_fin: fin.slice(0, 5),
              statut: "confirmee",
              notes: notesPayload || null,
            })
            .select("id")
            .single();
          legacyInsertErr = insertWithCreneau.error;

          // 4) Fallback insert compatible schéma legacy sans creneau/heure_*
          if (legacyInsertErr) {
            const insertLegacyMinimal = await supabase
              .from("reservations_infrastructure")
              .insert({
                infrastructure_id: terrainIdToUse,
                stage_id: stage.id,
                date_debut: dateDebut,
                date_fin: dateFin,
                statut: "confirmee",
                notes: notesPayload || null,
              })
              .select("id")
              .single();
            legacyInsertErr = insertLegacyMinimal.error;
          }

          // 5) Idempotence après échec insert
          if (legacyInsertErr) {
            const existingRetry = await supabase
              .from("reservations_infrastructure")
              .select("id, notes, creneau")
              .eq("infrastructure_id", terrainIdToUse)
              .eq("stage_id", stage.id)
              .gte("date_debut", `${jour}T00:00:00`)
              .lte("date_debut", `${jour}T23:59:59`)
              .limit(1);
            if ((existingRetry.data?.length ?? 0) > 0) {
              const existing = existingRetry.data?.[0] as { id: string; notes?: string | null };
              const mergedNotes = [String(existing.notes ?? "").trim(), notesPayload]
                .filter(Boolean)
                .join(" ")
                .trim();
              await supabase
                .from("reservations_infrastructure")
                .update({
                  creneau: creneauLegacy(creneau),
                  date_debut: dateDebut,
                  date_fin: dateFin,
                  heure_debut: debut.slice(0, 5),
                  heure_fin: fin.slice(0, 5),
                  notes: mergedNotes || null,
                })
                .eq("id", existing.id);
              if (besoin.mode === "dispatch") {
                await saveLegacyDispatch(existing.id, besoin, terrainIdToUse, jour, creneau);
              }
              ok.push(`${terrainIdToUse}/${jour}/${creneau}`);
              continue;
            }
            conflits.push(`${terrainIdToUse}/${jour}/${creneau}/insert_error`);
            continue;
          }
          let insertedReservationId =
            ((insertWithCreneau as any).data?.id as string | undefined) ?? undefined;
          if (!insertedReservationId && besoin.mode === "dispatch") {
            const existingInserted = await supabase
              .from("reservations_infrastructure")
              .select("id")
              .eq("infrastructure_id", terrainIdToUse)
              .eq("stage_id", stage.id)
              .gte("date_debut", `${jour}T00:00:00`)
              .lte("date_debut", `${jour}T23:59:59`)
              .order("date_debut", { ascending: false })
              .limit(1)
              .maybeSingle();
            insertedReservationId = (existingInserted.data?.id as string | undefined) ?? undefined;
          }
          if (insertedReservationId) {
            await saveLegacyDispatch(insertedReservationId, besoin, terrainIdToUse, jour, creneau);
          }
          ok.push(`${terrainIdToUse}/${jour}/${creneau}`);
          continue;
        }

        const conflit = await verifierConflits(
          terrainIdToUse,
          jour,
          jour,
          creneau,
          stage.id
        );
        if (conflit) {
          conflits.push(`${besoin.terrainId}/${jour}/${creneau}`);
          continue;
        }
        const { data: resa, error } = await supabase
          .from("terrain_reservations")
          .upsert(
            {
              terrain_id: terrainIdToUse,
              stage_id: stage.id,
              date_debut: jour,
              date_fin: jour,
              creneau,
              mode: besoin.mode,
              statut: "confirme",
              notes: besoin.notes ?? null,
            },
            { onConflict: "terrain_id,stage_id,creneau,date_debut" }
          )
          .select()
          .single();
        if (error || !resa) continue;

        // Miroir reservations_infrastructure → visible dans Réservations V2
        const infraMirrorId = await ensureLegacyInfrastructureId(besoin);
        if (infraMirrorId) {
          const { debut, fin } = legacyHours(creneau);
          const dateDebut = `${jour}T${debut}`;
          const dateFin = `${jour}T${fin}`;
          const existingMirror = await supabase
            .from("reservations_infrastructure")
            .select("id, creneau")
            .eq("infrastructure_id", infraMirrorId)
            .eq("stage_id", stage.id)
            .gte("date_debut", `${jour}T00:00:00`)
            .lte("date_debut", `${jour}T23:59:59`)
            .order("date_debut", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (existingMirror.data?.id) {
            await supabase
              .from("reservations_infrastructure")
              .update({
                date_debut: dateDebut,
                date_fin: dateFin,
                creneau: creneauLegacy(creneau),
                heure_debut: debut.slice(0, 5),
                heure_fin: fin.slice(0, 5),
                statut: "confirmee",
              })
              .eq("id", existingMirror.data.id);
          } else {
            await supabase.from("reservations_infrastructure").insert({
              infrastructure_id: infraMirrorId,
              stage_id: stage.id,
              date_debut: dateDebut,
              date_fin: dateFin,
              creneau: creneauLegacy(creneau),
              heure_debut: debut.slice(0, 5),
              heure_fin: fin.slice(0, 5),
              statut: "confirmee",
              notes: besoin.notes?.trim() || null,
            });
          }
        }

        // Dispatch joueurs si mode dispatch
        if (besoin.mode === "dispatch" && besoin.joueurIds?.length) {
          const rows = besoin.joueurIds.map((jid: string) => ({
            reservation_id: resa.id,
            joueur_id: jid,
            stage_id: stage.id,
            terrain_id: terrainIdToUse,
            date_debut: jour,
            date_fin: jour,
            creneau,
          }));
          await supabase
            .from("terrain_dispatch")
            .upsert(rows, { onConflict: "joueur_id,stage_id,terrain_id,creneau" });
        }
        ok.push(`${terrainIdToUse}/${jour}/${creneau}`);
      }
    }
  }

  if (ok.length > 0 && stage.id) {
    try {
      const { syncStagePlanningWithTerrainReservations } = await import("@/lib/v2/sync-stage-planning");
      await syncStagePlanningWithTerrainReservations({
        stage_id: stage.id,
        date_debut: stage.dateDebut,
        date_fin: stage.dateFin,
        notes: stage.notes ?? null,
        categorie: stage.categorie ?? null,
        coach_id: stage.coach_id ?? null,
      });
    } catch (err) {
      console.warn("[terrains] sync planning après réservation", err);
    }
  }

  return { ok, conflits };
};

/** Extrait le JSON array après `[TERRAINS_BESOINS:` (crochets internes inclus). */
function sliceTerrainsBesoinsJson(notes: string): string | null {
  const marker = "[TERRAINS_BESOINS:";
  const idx = notes.indexOf(marker);
  if (idx === -1) return null;
  const jsonStart = idx + marker.length;
  if (notes[jsonStart] !== "[") return null;
  let depth = 0;
  for (let i = jsonStart; i < notes.length; i++) {
    const ch = notes[i];
    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) return notes.slice(jsonStart, i + 1);
    }
  }
  return null;
}

export function parseTerrainsBesoinsFromNotes(notes: string | null | undefined): TerrainBesoin[] | null {
  if (!notes) return null;
  const jsonStr = sliceTerrainsBesoinsJson(notes);
  if (!jsonStr) return null;
  try {
    const parsed = JSON.parse(jsonStr) as TerrainBesoin[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function stripTerrainsBesoinsFromNotes(notes: string | null | undefined): string {
  if (!notes) return "";
  const marker = "[TERRAINS_BESOINS:";
  let result = notes;
  while (true) {
    const idx = result.indexOf(marker);
    if (idx === -1) break;
    const jsonStart = idx + marker.length;
    if (result[jsonStart] !== "[") {
      const close = result.indexOf("]", jsonStart);
      if (close === -1) break;
      result = (result.slice(0, idx) + result.slice(close + 1)).trim();
      continue;
    }
    let depth = 0;
    let removeEnd = -1;
    for (let i = jsonStart; i < result.length; i++) {
      if (result[i] === "[") depth++;
      else if (result[i] === "]") {
        depth--;
        if (depth === 0) {
          removeEnd = i + 1;
          if (result[removeEnd] === "]") removeEnd++;
          break;
        }
      }
    }
    if (removeEnd === -1) break;
    result = (result.slice(0, idx) + result.slice(removeEnd)).replace(/\s{2,}/g, " ").trim();
  }
  return result.trim();
}

/**
 * Passe matin → journée en base (migration manuelle uniquement).
 * Ne pas appeler automatiquement : respecter le créneau choisi par l'utilisateur.
 */
export async function upgradeStageTerrainsMatinToJourneeInDb(stageId: string): Promise<number> {
  const supabase = await getTerrainsSupabaseClient();
  let n = 0;
  const { data: infraRows } = await supabase
    .from("reservations_infrastructure")
    .select("id, date_debut")
    .eq("stage_id", stageId)
    .in("creneau", ["matin", "apres_midi"]);
  for (const row of infraRows ?? []) {
    const jour = String(row.date_debut).slice(0, 10);
    await supabase
      .from("reservations_infrastructure")
      .update({
        creneau: "journee",
        date_debut: `${jour}T09:00:00`,
        date_fin: `${jour}T18:00:00`,
        heure_debut: "09:00",
        heure_fin: "18:00",
      })
      .eq("id", row.id);
    n++;
  }
  const { data: terrainRows } = await supabase
    .from("terrain_reservations")
    .select("terrain_id, date_debut")
    .eq("stage_id", stageId)
    .in("creneau", ["matin", "apres-midi"]);
  for (const row of terrainRows ?? []) {
    const jour = String(row.date_debut).slice(0, 10);
    await supabase
      .from("terrain_reservations")
      .update({ creneau: "journee", date_debut: jour, date_fin: jour })
      .eq("stage_id", stageId)
      .eq("terrain_id", row.terrain_id)
      .eq("date_debut", jour)
      .in("creneau", ["matin", "apres-midi"]);
    n++;
  }
  return n;
}

/** Supprime matin/aprem quand une réservation journée existe déjà (doublons legacy). */
export async function cleanupDuplicateMatinWhenJourneeExists(): Promise<number> {
  const supabase = await getTerrainsSupabaseClient();
  const { data: journeeRows } = await supabase
    .from("terrain_reservations")
    .select("stage_id, terrain_id, date_debut")
    .eq("creneau", "journee");
  let cleaned = 0;
  for (const row of journeeRows ?? []) {
    const jour = String(row.date_debut).slice(0, 10);
    await supabase
      .from("terrain_reservations")
      .delete()
      .eq("stage_id", row.stage_id)
      .eq("terrain_id", row.terrain_id)
      .eq("date_debut", jour)
      .in("creneau", ["matin", "apres-midi"]);
    await supabase
      .from("reservations_infrastructure")
      .delete()
      .eq("stage_id", row.stage_id)
      .eq("infrastructure_id", row.terrain_id)
      .gte("date_debut", `${jour}T00:00:00`)
      .lte("date_debut", `${jour}T23:59:59`)
      .in("creneau", ["matin", "apres_midi"]);
    cleaned++;
  }
  return cleaned;
}

/** Recrée les réservations terrain depuis les métadonnées `[TERRAINS_BESOINS:…]` du stage. */
export async function resyncStageTerrainsFromNotes(
  stage: {
    id: string;
    nom?: string;
    stage_action?: string;
    date_debut: string;
    date_fin: string;
    notes?: string | null;
  },
  options?: { reserve?: boolean }
): Promise<{ ok: string[]; conflits: string[] }> {
  const besoins = parseTerrainsBesoinsFromNotes(stage.notes);
  if (!besoins?.length) return { ok: [], conflits: [] };
  const normalized = besoins.map((b) => ({
    ...b,
    creneaux: b.creneaux?.length ? b.creneaux : (["journee"] as Creneau[]),
    mode: b.mode ?? "stage",
  }));
  const supabase = await getTerrainsSupabaseClient();
  for (const besoin of normalized) {
    const wantsJournee = besoin.creneaux?.includes("journee");
    if (!wantsJournee) continue;
    const infraId = besoin.terrainId;
    const days =
      besoin.jours?.length ?
        besoin.jours.map((d) => d.slice(0, 10))
      : eachDayOfStage(stage.date_debut, stage.date_fin);
    for (const jour of days) {
      await supabase
        .from("reservations_infrastructure")
        .update({
          creneau: "journee",
          date_debut: `${jour}T09:00:00`,
          date_fin: `${jour}T18:00:00`,
          heure_debut: "09:00",
          heure_fin: "18:00",
          statut: "confirmee",
        })
        .eq("stage_id", stage.id)
        .eq("infrastructure_id", infraId)
        .gte("date_debut", `${jour}T00:00:00`)
        .lte("date_debut", `${jour}T23:59:59`)
        .in("creneau", ["matin", "apres_midi"]);
    }
  }
  if (options?.reserve === false) return { ok: [], conflits: [] };
  return reserverTerrains({
    id: stage.id,
    nom: stage.nom ?? stage.stage_action ?? "Stage",
    dateDebut: stage.date_debut,
    dateFin: stage.date_fin,
    besoins: { terrains: normalized },
  });
}

/** Alignement automatique Stages → Réservations pour tous les stages avec besoins terrain. */
export async function resyncAllStageTerrainsFromNotes(): Promise<number> {
  const supabase = await getTerrainsSupabaseClient();
  const { data: stages } = await supabase
    .from("stages_programme")
    .select("id, stage_action, date_debut, date_fin, notes, statut")
    .neq("statut", "annule");
  let synced = 0;
  await cleanupDuplicateMatinWhenJourneeExists();
  for (const s of stages ?? []) {
    const hasBesoins = Boolean(parseTerrainsBesoinsFromNotes(s.notes)?.length);
    if (!hasBesoins) continue;
    const { ok } = await resyncStageTerrainsFromNotes({
      id: s.id,
      stage_action: s.stage_action,
      date_debut: s.date_debut,
      date_fin: s.date_fin,
      notes: s.notes,
    });
    if (ok.length > 0) synced++;
  }
  return synced;
};

/* ─── SUPPRIMER RÉSERVATIONS D'UN STAGE ─── */
export const supprimerReservationsStage = async (stageId: string) => {
  const supabase = await getTerrainsSupabaseClient();
  await supabase
    .from("terrain_reservations")
    .delete()
    .eq("stage_id", stageId);
};

/* ─── SUPPRIMER UNE RÉSERVATION TERRAIN ─── */
export const supprimerReservationTerrain = async (reservationId: string): Promise<boolean> => {
  const supabase = await getTerrainsSupabaseClient();
  const r1 = await supabase.from("terrain_reservations").delete().eq("id", reservationId);
  if (!r1.error) return true;
  const r2 = await supabase.from("reservations_infrastructure").delete().eq("id", reservationId);
  return !r2.error;
};
