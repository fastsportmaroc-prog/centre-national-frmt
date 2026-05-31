import { getSupabaseDataClient } from "@/lib/supabase/data-client";

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

function mapLegacyCreneau(creneau: string | null | undefined): "matin" | "apres-midi" | "journee" {
  const c = (creneau ?? "").toLowerCase();
  if (c.includes("apres")) return "apres-midi";
  if (c.includes("matin")) return "matin";
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

async function buildLegacyCalendrierRows(filters?: {
  stageId?: string;
  terrainId?: string;
  dateDebut?: string;
  dateFin?: string;
}) {
  const supabase = await getSupabaseDataClient();
  let q = supabase
    .from("reservations_infrastructure")
    .select("id, infrastructure_id, stage_id, date_debut, date_fin, creneau, statut, notes");

  if (filters?.stageId) q = q.eq("stage_id", filters.stageId);
  if (filters?.terrainId) q = q.eq("infrastructure_id", filters.terrainId);
  if (filters?.dateDebut) q = q.gte("date_fin", filters.dateDebut);
  if (filters?.dateFin) q = q.lte("date_debut", filters.dateFin);

  let { data: resa, error: resaErr } = await q.order("date_debut", { ascending: true });
  if (resaErr) {
    // Fallback schéma legacy sans colonne creneau
    let q2 = supabase
      .from("reservations_infrastructure")
      .select("id, infrastructure_id, stage_id, date_debut, date_fin, statut, notes");
    if (filters?.stageId) q2 = q2.eq("stage_id", filters.stageId);
    if (filters?.terrainId) q2 = q2.eq("infrastructure_id", filters.terrainId);
    if (filters?.dateDebut) q2 = q2.gte("date_fin", filters.dateDebut);
    if (filters?.dateFin) q2 = q2.lte("date_debut", filters.dateFin);
    const r2 = await q2.order("date_debut", { ascending: true });
    resa = (r2.data ?? []).map((r: any) => ({ ...r, creneau: "journee" }));
    resaErr = r2.error;
  }
  if (resaErr) throw asError(resaErr, "Erreur lecture reservations_infrastructure");
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
      creneau: mapLegacyCreneau(r.creneau),
      mode: extra.mode,
      resa_statut: r.statut ?? "confirmee",
      nb_joueurs_dispatches: nbDispatch,
      dispatch_joueurs_noms: dispatchNames.get(r.id) ?? [],
    };
  });
}

async function enrichDispatchNames(rows: any[]): Promise<any[]> {
  if (!rows.length) return rows;
  const supabase = await getSupabaseDataClient();
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
  const supabase = await getSupabaseDataClient();
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
  const supabase = await getSupabaseDataClient();
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
    resa = (r2.data ?? []).map((r: any) => ({ ...r, creneau: "journee" }));
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
  const supabase = await getSupabaseDataClient();
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
  const supabase = await getSupabaseDataClient();
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
  const supabase = await getSupabaseDataClient();
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

/* ─── RÉSERVATIONS TERRAINS D'UN STAGE ─── */
export const getReservationsStageTerrains = async (stageId: string) => {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("v_calendrier_terrains")
    .select("*")
    .eq("stage_id", stageId)
    .order("date_debut", { ascending: true });
  if (!error && (data?.length ?? 0) > 0) return enrichDispatchNames(data ?? []);
  return buildLegacyCalendrierRows({ stageId });
};

/* ─── VÉRIFIER CONFLITS ─── */
export const verifierConflits = async (
  terrainId: string,
  dateDebut: string,
  dateFin: string,
  creneau: Creneau,
  stageIdExclu?: string
): Promise<boolean> => {
  const supabase = await getSupabaseDataClient();
  let q = supabase
    .from("terrain_reservations")
    .select("id")
    .eq("terrain_id", terrainId)
    .eq("creneau", creneau)
    .eq("statut", "confirme")
    .lte("date_debut", dateFin)
    .gte("date_fin", dateDebut);
  if (stageIdExclu) q = q.neq("stage_id", stageIdExclu);
  const { data } = await q;
  return (data?.length ?? 0) > 0;
};

/* ─── RÉSERVER TERRAINS DEPUIS UN STAGE ─── */
export const reserverTerrains = async (stage: any): Promise<{
  ok: string[];
  conflits: string[];
}> => {
  const supabase = await getSupabaseDataClient();
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

  const { error: terrainReservationsProbeErr } = await supabase
    .from("terrain_reservations")
    .select("id")
    .limit(1);
  const useLegacyReservations = !!terrainReservationsProbeErr;
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
    for (const creneau of besoin.creneaux) {
      const joursCibles: string[] =
        besoin.jours?.length && Array.isArray(besoin.jours)
          ? [...new Set(besoin.jours.map((d) => String(d).slice(0, 10)).filter((d) => d.length > 0))]
          : eachDay(stage.dateDebut, stage.dateFin);
      for (const jour of joursCibles) {
        if (useLegacyReservations) {
          const { debut, fin } = legacyHours(creneau);
          const dateDebut = `${jour}T${debut}`;
          const dateFin = `${jour}T${fin}`;
          const dispatchCountValue = besoin.mode === "dispatch" ? besoin.joueurIds?.length ?? 0 : 0;
          const encodedMeta =
            `[MODE:${besoin.mode}]` +
            (besoin.mode === "dispatch" ? `[DISPATCH_N:${dispatchCountValue}]` : "");
          const notesPayload = [besoin.notes?.trim(), encodedMeta].filter(Boolean).join(" ").trim();
          // 1) Vérifier uniquement les conflits avec d'AUTRES stages
          let overlaps: any[] = [];
          let overlapErr: any = null;
          const overlapWithCreneau = await supabase
            .from("reservations_infrastructure")
            .select("id, stage_id, notes")
            .eq("infrastructure_id", terrainIdToUse)
            .eq("creneau", creneauLegacy(creneau))
            .in("statut", ["confirmee", "confirme", "confirmé", "confirmee", "confirmer"])
            .lte("date_debut", dateFin)
            .gte("date_fin", dateDebut)
            .neq("stage_id", stage.id ?? "");
          if (overlapWithCreneau.error) {
            // Fallback si colonne creneau absente côté DB legacy
            const overlapNoCreneau = await supabase
              .from("reservations_infrastructure")
              .select("id, stage_id, notes")
              .eq("infrastructure_id", terrainIdToUse)
              .in("statut", ["confirmee", "confirme", "confirmé", "confirmee", "confirmer"])
              .lte("date_debut", dateFin)
              .gte("date_fin", dateDebut)
              .neq("stage_id", stage.id ?? "");
            overlaps = overlapNoCreneau.data ?? [];
            overlapErr = overlapNoCreneau.error;
          } else {
            overlaps = overlapWithCreneau.data ?? [];
          }
          if (overlapErr) {
            conflits.push(`${terrainIdToUse}/${jour}/${creneau}/query_error`);
            continue;
          }

          if ((overlaps.length ?? 0) > 0) {
            conflits.push(`${terrainIdToUse}/${jour}/${creneau}`);
            continue;
          }

          // 2) Insert normal (avec creneau)
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

          // 3) Fallback insert compatible schéma legacy sans creneau/heure_*
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

          // 4) Idempotence: si déjà présente pour ce stage/jour, compter OK
          if (legacyInsertErr) {
            const existingSameStage = await supabase
              .from("reservations_infrastructure")
              .select("id, notes")
              .eq("infrastructure_id", terrainIdToUse)
              .eq("stage_id", stage.id)
              .gte("date_debut", `${jour}T00:00:00`)
              .lte("date_debut", `${jour}T23:59:59`)
              .limit(1);
            if ((existingSameStage.data?.length ?? 0) > 0) {
              // Si la resa existe déjà, propager aussi la meta dispatch pour la rendre visible dans l'onglet Dispatch.
              const existing = existingSameStage.data?.[0] as any;
              if (existing?.id && besoin.mode === "dispatch") {
                const mergedNotes = [String(existing.notes ?? "").trim(), encodedMeta]
                  .filter(Boolean)
                  .join(" ")
                  .trim();
                await supabase
                  .from("reservations_infrastructure")
                  .update({ notes: mergedNotes || null })
                  .eq("id", existing.id);
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
  return { ok, conflits };
};

/* ─── SUPPRIMER RÉSERVATIONS D'UN STAGE ─── */
export const supprimerReservationsStage = async (stageId: string) => {
  const supabase = await getSupabaseDataClient();
  await supabase
    .from("terrain_reservations")
    .delete()
    .eq("stage_id", stageId);
};

/* ─── SUPPRIMER UNE RÉSERVATION TERRAIN ─── */
export const supprimerReservationTerrain = async (reservationId: string): Promise<boolean> => {
  const supabase = await getSupabaseDataClient();
  const r1 = await supabase.from("terrain_reservations").delete().eq("id", reservationId);
  if (!r1.error) return true;
  const r2 = await supabase.from("reservations_infrastructure").delete().eq("id", reservationId);
  return !r2.error;
};
