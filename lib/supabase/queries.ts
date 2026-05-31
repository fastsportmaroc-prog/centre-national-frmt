/**
 * Requêtes Supabase centralisées — V2 Centre National FRMT
 * Zéro throw. Fallback [] ou null.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSafeSupabaseClient } from "@/lib/supabase/client";
import { mutateOmitMissingColumns } from "@/lib/supabase/mutate-omit-missing-columns";
import type {
  DemandeBilletAvionV2,
  EntraineurV2,
  FacturePrestataireV2,
  FactureClubV2,
  HebergementStageV2,
  HistoriqueV2,
  InfrastructureV2,
  InterneChambreV2,
  JoueurV2,
  OccupationChambreV2,
  PlanningSeanceV2,
  PresenceRepasV2,
  RapportLogistiqueV2,
  ReservationEnrichedV2,
  ReservationInfraV2,
  RestaurationStageV2,
  StageCoachV2,
  StageJoueurV2,
  StageProgrammeInputV2,
  StageProgrammeV2,
} from "@/lib/types/v2";

const STAGES = "stages_programme";

function warn(msg: string, detail?: string) {
  console.warn(`[Supabase] ${msg}${detail ? `: ${detail}` : ""}`);
}

function clientOrNull(): SupabaseClient | null {
  const c = getSafeSupabaseClient();
  if (!c) warn("indisponible — fallback []");
  return c;
}

/**
 * Compat: certaines bases lient les tables logistiques à `stages(id)` au lieu de
 * `stages_programme(id)`. Construit une liste d'ids candidats compatibles.
 */
async function resolveLegacyCompatibleStageIds(stageId: string): Promise<string[]> {
  const c = clientOrNull();
  if (!c) return [stageId];
  const candidates = new Set<string>([stageId]);
  try {
    const { data: sameInStages } = await c.from("stages").select("id").eq("id", stageId).maybeSingle();
    if (sameInStages?.id) candidates.add(sameInStages.id);

    const { data: prog } = await c
      .from(STAGES)
      .select("stage_action, date_debut, date_fin, categorie")
      .eq("id", stageId)
      .maybeSingle();
    if (!prog) return [...candidates];

    // Schéma simplifié: stages.nom
    const { data: legacyByNom } = await c
      .from("stages")
      .select("id")
      .eq("nom", prog.stage_action)
      .eq("date_debut", prog.date_debut)
      .eq("date_fin", prog.date_fin)
      .eq("categorie", prog.categorie)
      .maybeSingle();
    if (legacyByNom?.id) candidates.add(legacyByNom.id);

    // Fallback souple: même période + catégorie
    const { data: legacyRows } = await c
      .from("stages")
      .select("id")
      .eq("date_debut", prog.date_debut)
      .eq("date_fin", prog.date_fin)
      .eq("categorie", prog.categorie)
      .limit(5);
    for (const row of legacyRows ?? []) {
      if (row?.id) candidates.add(row.id);
    }

    // Fallback encore plus souple: même période uniquement.
    const { data: byDatesOnly } = await c
      .from("stages")
      .select("id")
      .eq("date_debut", prog.date_debut)
      .eq("date_fin", prog.date_fin)
      .limit(10);
    for (const row of byDatesOnly ?? []) {
      if (row?.id) candidates.add(row.id);
    }

    // Fallback texte: nom proche du stage_action.
    if (prog.stage_action?.trim()) {
      const q = prog.stage_action.trim().replace(/\s+/g, "%");
      const { data: byNameLike } = await c
        .from("stages")
        .select("id")
        .ilike("nom", `%${q}%`)
        .limit(10);
      for (const row of byNameLike ?? []) {
        if (row?.id) candidates.add(row.id);
      }
    }
    return [...candidates];
  } catch {
    return [...candidates];
  }
}

async function ensureLegacyStageRow(stageId: string): Promise<boolean> {
  const c = clientOrNull();
  if (!c) return false;
  try {
    const { data: exists } = await c.from("stages").select("id").eq("id", stageId).maybeSingle();
    if (exists?.id) return true;

    const { data: prog } = await c
      .from(STAGES)
      .select("id, stage_action, categorie, date_debut, date_fin, lieu, statut, notes, hebergement, restauration, terrains")
      .eq("id", stageId)
      .maybeSingle();
    if (!prog) return false;

    const payload = {
      id: prog.id,
      nom: prog.stage_action,
      categorie: prog.categorie,
      date_debut: prog.date_debut,
      date_fin: prog.date_fin,
      lieu: prog.lieu ?? null,
      statut: prog.statut ?? "prevu",
      notes: prog.notes ?? null,
      hebergement: !!prog.hebergement,
      restauration: !!prog.restauration,
      terrains: !!prog.terrains,
    };
    const { error } = await c.from("stages").insert(payload);
    if (error && !/duplicate key|already exists/i.test(error.message)) {
      warn("ensure legacy stage", error.message);
      return false;
    }
    return true;
  } catch (e) {
    warn("ensure legacy stage", e instanceof Error ? e.message : String(e));
    return false;
  }
}

type QueryResult<T> = { data: T | null; error: { message: string } | null };

async function runSelect<T>(
  table: string,
  build: (c: SupabaseClient) => PromiseLike<QueryResult<T>>
): Promise<T> {
  const c = clientOrNull();
  if (!c) return [] as unknown as T;
  try {
    const { data, error } = await build(c);
    if (error) {
      warn(`${table} select`, error.message);
      return [] as unknown as T;
    }
    return (data ?? []) as T;
  } catch (e) {
    warn(table, e instanceof Error ? e.message : String(e));
    return [] as unknown as T;
  }
}

async function runSingle<T>(
  table: string,
  build: (c: SupabaseClient) => PromiseLike<QueryResult<T>>
): Promise<T | null> {
  const c = clientOrNull();
  if (!c) return null;
  try {
    const { data, error } = await build(c);
    if (error) {
      warn(`${table} single`, error.message);
      return null;
    }
    return data;
  } catch (e) {
    warn(table, e instanceof Error ? e.message : String(e));
    return null;
  }
}

async function runMutate(
  table: string,
  build: (c: SupabaseClient) => PromiseLike<{ error: { message: string } | null }>
): Promise<{ ok: boolean; error?: string }> {
  const c = clientOrNull();
  if (!c) return { ok: false, error: "Supabase indisponible" };
  try {
    const { error } = await build(c);
    if (error) {
      warn(`${table} mutate`, error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    warn(table, msg);
    return { ok: false, error: msg };
  }
}

async function runInsert<T>(
  table: string,
  build: (c: SupabaseClient) => PromiseLike<QueryResult<T>>
): Promise<{ data: T | null; error?: string }> {
  const c = clientOrNull();
  if (!c) return { data: null, error: "Supabase indisponible" };
  try {
    const { data, error } = await build(c);
    if (error) {
      warn(`${table} insert`, error.message);
      return { data: null, error: error.message };
    }
    return { data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    warn(`${table} insert`, msg);
    return { data: null, error: msg };
  }
}

// ─── STAGES ───────────────────────────────────────────────────────────────

export async function getStages(): Promise<StageProgrammeV2[]> {
  return runSelect<StageProgrammeV2[]>(STAGES, (c) =>
    c.from(STAGES).select("*").order("date_debut", { ascending: true })
  );
}

export async function getStageById(id: string): Promise<StageProgrammeV2 | null> {
  return runSingle<StageProgrammeV2>(STAGES, (c) =>
    c.from(STAGES).select("*").eq("id", id).single()
  );
}

export async function createStage(data: StageProgrammeInputV2): Promise<{ stage: StageProgrammeV2 | null; error?: string }> {
  const payload = {
    source: data.source ?? "FRMT",
    categorie: data.categorie,
    stage_action: data.stage_action,
    date_debut: data.date_debut,
    date_fin: data.date_fin,
    nombre_joueurs: data.nombre_joueurs,
    nombre_encadrants: data.nombre_encadrants,
    hebergement: data.hebergement ?? false,
    chambres: data.chambres ?? 0,
    lieu: data.lieu,
    notes: data.notes,
    statut: data.statut ?? "prevu",
    infrastructure_ids: [],
    entraineur_ids: [],
    materiel_assignations: [],
    budget_prevu: null,
    budget_reel: null,
  };
  const { data: row, error } = await runInsert<StageProgrammeV2>(STAGES, (c) =>
    c.from(STAGES).insert(payload).select().single()
  );
  if (error?.includes("row-level security")) {
    return {
      stage: null,
      error:
        "Création refusée (RLS). Connectez-vous puis exécutez lib/db/migrations/stages_programme_rls.sql dans Supabase.",
    };
  }
  return { stage: row, error };
}

export async function updateStage(id: string, data: Partial<StageProgrammeInputV2>): Promise<{ ok: boolean; error?: string }> {
  return runMutate(STAGES, (c) => c.from(STAGES).update({ ...data, updated_at: new Date().toISOString() }).eq("id", id));
}

export async function deleteStage(id: string): Promise<{ ok: boolean; error?: string }> {
  const tables = [
    "stage_joueurs",
    "stage_coachs",
    "hebergements",
    "restaurations",
    "kinesitherapie_stages",
    "kinesitherapie_stage_participants",
    "planning",
    "reservations_infrastructure",
    "demandes_billet_avion",
  ] as const;
  for (const t of tables) {
    await runMutate(t, (c) => c.from(t).delete().eq("stage_id", id));
  }
  return runMutate(STAGES, (c) => c.from(STAGES).delete().eq("id", id));
}

// ─── JOUEURS ──────────────────────────────────────────────────────────────

export async function getJoueurs(): Promise<JoueurV2[]> {
  return runSelect<JoueurV2[]>("joueurs", (c) => c.from("joueurs").select("*").order("nom"));
}

export async function getJoueurById(id: string): Promise<JoueurV2 | null> {
  return runSingle<JoueurV2>("joueurs", (c) => c.from("joueurs").select("*").eq("id", id).single());
}

export async function getJoueursByStage(stage_id: string): Promise<JoueurV2[]> {
  const c = clientOrNull();
  if (!c) return [];
  const { data: links } = await c.from("stage_joueurs").select("joueur_id").eq("stage_id", stage_id);
  const ids = (links ?? []).map((l: { joueur_id: string }) => l.joueur_id);
  if (ids.length === 0) return [];
  const { data, error } = await c.from("joueurs").select("*").in("id", ids);
  if (error) {
    warn("joueurs by stage", error.message);
    return [];
  }
  return (data ?? []) as JoueurV2[];
}

export async function createJoueur(data: Partial<JoueurV2>): Promise<{ data: JoueurV2 | null; error?: string }> {
  return runInsert<JoueurV2>("joueurs", (c) => c.from("joueurs").insert(data).select().single());
}

export async function updateJoueur(
  id: string,
  data: Partial<JoueurV2>
): Promise<{ ok: boolean; error?: string; skippedColumns?: string[] }> {
  return mutateOmitMissingColumns({ ...data } as Record<string, unknown>, (payload) =>
    runMutate("joueurs", (c) => c.from("joueurs").update(payload).eq("id", id))
  );
}

export async function deleteJoueur(id: string): Promise<{ ok: boolean; error?: string }> {
  await runMutate("stage_joueurs", (c) => c.from("stage_joueurs").delete().eq("joueur_id", id));
  return runMutate("joueurs", (c) => c.from("joueurs").delete().eq("id", id));
}

export async function linkJoueurStage(stage_id: string, joueur_id: string): Promise<{ ok: boolean; error?: string }> {
  return runMutate("stage_joueurs", (c) => c.from("stage_joueurs").insert({ stage_id, joueur_id }));
}

export async function unlinkJoueurStage(stage_id: string, joueur_id: string): Promise<{ ok: boolean; error?: string }> {
  return runMutate("stage_joueurs", (c) =>
    c.from("stage_joueurs").delete().eq("stage_id", stage_id).eq("joueur_id", joueur_id)
  );
}

export async function getStageJoueursLinks(): Promise<StageJoueurV2[]> {
  return runSelect<StageJoueurV2[]>("stage_joueurs", (c) => c.from("stage_joueurs").select("*"));
}

// ─── ENTRAÎNEURS ──────────────────────────────────────────────────────────

export async function getEntraineurs(): Promise<EntraineurV2[]> {
  return runSelect<EntraineurV2[]>("entraineurs", (c) => c.from("entraineurs").select("*").order("nom"));
}

export async function getEntraineurById(id: string): Promise<EntraineurV2 | null> {
  return runSingle<EntraineurV2>("entraineurs", (c) => c.from("entraineurs").select("*").eq("id", id).single());
}

export async function getEntraineursByStage(stage_id: string): Promise<EntraineurV2[]> {
  const c = clientOrNull();
  if (!c) return [];
  const { data: links } = await c.from("stage_coachs").select("coach_id").eq("stage_id", stage_id);
  const ids = (links ?? []).map((l: { coach_id: string }) => l.coach_id);
  if (ids.length === 0) return [];
  const { data, error } = await c.from("entraineurs").select("*").in("id", ids);
  if (error) {
    warn("entraineurs by stage", error.message);
    return [];
  }
  return (data ?? []) as EntraineurV2[];
}

export async function createEntraineur(data: Partial<EntraineurV2>): Promise<{ data: EntraineurV2 | null; error?: string }> {
  return runInsert<EntraineurV2>("entraineurs", (c) => c.from("entraineurs").insert(data).select().single());
}

export async function updateEntraineur(
  id: string,
  data: Partial<EntraineurV2>
): Promise<{ ok: boolean; error?: string; skippedColumns?: string[] }> {
  return mutateOmitMissingColumns({ ...data } as Record<string, unknown>, (payload) =>
    runMutate("entraineurs", (c) => c.from("entraineurs").update(payload).eq("id", id))
  );
}

export async function deleteEntraineur(id: string): Promise<{ ok: boolean; error?: string }> {
  await runMutate("stage_coachs", (c) => c.from("stage_coachs").delete().eq("coach_id", id));
  return runMutate("entraineurs", (c) => c.from("entraineurs").delete().eq("id", id));
}

export async function linkCoachStage(stage_id: string, coach_id: string): Promise<{ ok: boolean; error?: string }> {
  return runMutate("stage_coachs", (c) => c.from("stage_coachs").insert({ stage_id, coach_id }));
}

export async function unlinkCoachStage(stage_id: string, coach_id: string): Promise<{ ok: boolean; error?: string }> {
  return runMutate("stage_coachs", (c) =>
    c.from("stage_coachs").delete().eq("stage_id", stage_id).eq("coach_id", coach_id)
  );
}

// ─── HÉBERGEMENT ──────────────────────────────────────────────────────────

export async function getHebergements(): Promise<HebergementStageV2[]> {
  const withStage = await runSelect<HebergementStageV2[]>("hebergements", (c) =>
    c.from("hebergements").select("*").not("stage_id", "is", null).order("date_debut")
  );
  if (withStage.length > 0) return withStage;
  return runSelect<HebergementStageV2[]>("hebergements", (c) =>
    c.from("hebergements").select("*").order("date_debut")
  );
}

export async function getHebergementByStage(stage_id: string): Promise<HebergementStageV2 | null> {
  const rows = await runSelect<HebergementStageV2[]>("hebergements", (c) =>
    c.from("hebergements").select("*").eq("stage_id", stage_id).limit(1)
  );
  return rows[0] ?? null;
}

export async function createHebergement(data: Omit<HebergementStageV2, "id">): Promise<{ data: HebergementStageV2 | null; error?: string }> {
  return runInsert<HebergementStageV2>("hebergements", (c) => c.from("hebergements").insert(data).select().single());
}

export async function updateHebergement(id: string, data: Partial<HebergementStageV2>): Promise<{ ok: boolean; error?: string }> {
  return runMutate("hebergements", (c) => c.from("hebergements").update(data).eq("id", id));
}

export async function deleteHebergement(id: string): Promise<{ ok: boolean; error?: string }> {
  return runMutate("hebergements", (c) => c.from("hebergements").delete().eq("id", id));
}

export async function getInterneChambres(): Promise<InterneChambreV2[]> {
  return runSelect<InterneChambreV2[]>("interne_chambres", (c) =>
    c.from("interne_chambres").select("id, numero, batiment, type, genre, capacite, statut, notes, created_at").order("numero")
  );
}

export async function getOccupationsChambresByStage(stage_id: string): Promise<OccupationChambreV2[]> {
  return runSelect<OccupationChambreV2[]>("occupations_chambre", (c) =>
    c
      .from("occupations_chambre")
      .select("id, chambre_id, occupant_id, occupant_type, occupant_nom, stage_id, date_arrivee, date_depart, statut, notes, created_at")
      .eq("stage_id", stage_id)
      .order("date_arrivee")
  );
}

export async function getOccupationsChambres(): Promise<OccupationChambreV2[]> {
  return runSelect<OccupationChambreV2[]>("occupations_chambre", (c) =>
    c
      .from("occupations_chambre")
      .select("id, chambre_id, occupant_id, occupant_type, occupant_nom, stage_id, date_arrivee, date_depart, statut, notes, created_at")
      .order("created_at", { ascending: false })
  );
}

export async function createOccupationChambre(
  data: Omit<OccupationChambreV2, "id">
): Promise<{ data: OccupationChambreV2 | null; error?: string }> {
  return runInsert<OccupationChambreV2>("occupations_chambre", (c) =>
    c.from("occupations_chambre").insert(data).select().single()
  );
}

export async function deleteOccupationChambre(id: string): Promise<{ ok: boolean; error?: string }> {
  return runMutate("occupations_chambre", (c) => c.from("occupations_chambre").delete().eq("id", id));
}

// ─── RESTAURATION ─────────────────────────────────────────────────────────

export async function getRestaurations(): Promise<RestaurationStageV2[]> {
  return runSelect<RestaurationStageV2[]>("restaurations", (c) =>
    c.from("restaurations").select("*").order("date_debut")
  );
}

export async function getRestaurationByStage(stage_id: string): Promise<RestaurationStageV2 | null> {
  const ids = await resolveLegacyCompatibleStageIds(stage_id);
  const rows = await runSelect<RestaurationStageV2[]>("restaurations", (c) =>
    c.from("restaurations").select("*").in("stage_id", ids).limit(1)
  );
  return rows[0] ?? null;
}

export async function createRestauration(data: Omit<RestaurationStageV2, "id">): Promise<{ data: RestaurationStageV2 | null; error?: string }> {
  const ids = await resolveLegacyCompatibleStageIds(data.stage_id);
  let lastError: string | undefined;
  for (const candidateId of ids) {
    const payload = { ...data, stage_id: candidateId };
    const res = await runInsert<RestaurationStageV2>("restaurations", (c) =>
      c.from("restaurations").insert(payload).select().single()
    );
    if (res.data) return res;
    lastError = res.error;
    if (!/foreign key|violates/i.test(res.error ?? "")) return res;
  }

  // Fallback final: créer la ligne legacy `stages` si la FK de `restaurations` pointe vers `stages`.
  const createdLegacy = await ensureLegacyStageRow(data.stage_id);
  if (createdLegacy) {
    const retry = await runInsert<RestaurationStageV2>("restaurations", (c) =>
      c.from("restaurations").insert({ ...data, stage_id: data.stage_id }).select().single()
    );
    if (retry.data) return retry;
    lastError = retry.error ?? lastError;
  }

  return { data: null, error: lastError ?? "Impossible de créer la restauration." };
}

export async function updateRestauration(id: string, data: Partial<RestaurationStageV2>): Promise<{ ok: boolean; error?: string }> {
  return runMutate("restaurations", (c) => c.from("restaurations").update(data).eq("id", id));
}

export async function deleteRestauration(id: string): Promise<{ ok: boolean; error?: string }> {
  return runMutate("restaurations", (c) => c.from("restaurations").delete().eq("id", id));
}

export async function getPresencesRepasByStage(stage_id: string): Promise<PresenceRepasV2[]> {
  return runSelect<PresenceRepasV2[]>("presences_repas", (c) =>
    c
      .from("presences_repas")
      .select("id, stage_id, personne_id, personne_type, personne_nom, date_repas, petit_dejeuner, dejeuner, diner, created_at")
      .eq("stage_id", stage_id)
      .order("date_repas")
  );
}

export async function upsertPresenceRepas(
  data: Omit<PresenceRepasV2, "id" | "created_at">
): Promise<{ ok: boolean; error?: string }> {
  const c = clientOrNull();
  if (!c) return { ok: false, error: "Supabase indisponible" };
  try {
    const { error } = await c.from("presences_repas").upsert(data, {
      onConflict: "stage_id,personne_id,date_repas",
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─── PLANNING ─────────────────────────────────────────────────────────────

export async function getPlanning(): Promise<PlanningSeanceV2[]> {
  return runSelect<PlanningSeanceV2[]>("planning", (c) => c.from("planning").select("*").order("date"));
}

export async function getPlanningByStage(stage_id: string): Promise<PlanningSeanceV2[]> {
  return runSelect<PlanningSeanceV2[]>("planning", (c) =>
    c.from("planning").select("*").eq("stage_id", stage_id).order("date")
  );
}

export async function createSeance(data: Omit<PlanningSeanceV2, "id">): Promise<{ data: PlanningSeanceV2 | null; error?: string }> {
  return runInsert<PlanningSeanceV2>("planning", (c) => c.from("planning").insert(data).select().single());
}

export async function deleteSeance(id: string): Promise<{ ok: boolean; error?: string }> {
  return runMutate("planning", (c) => c.from("planning").delete().eq("id", id));
}

// ─── BILLETS AVION ────────────────────────────────────────────────────────

export async function getBilletsAvion(): Promise<DemandeBilletAvionV2[]> {
  return runSelect<DemandeBilletAvionV2[]>("demandes_billet_avion", (c) =>
    c.from("demandes_billet_avion").select("*").order("created_at", { ascending: false })
  );
}

export async function getBilletsByStage(stage_id: string): Promise<DemandeBilletAvionV2[]> {
  return runSelect<DemandeBilletAvionV2[]>("demandes_billet_avion", (c) =>
    c.from("demandes_billet_avion").select("*").eq("stage_id", stage_id)
  );
}

export async function createDemandeBillet(
  data: Omit<DemandeBilletAvionV2, "id">
): Promise<{ data: DemandeBilletAvionV2 | null; error?: string }> {
  return runInsert<DemandeBilletAvionV2>("demandes_billet_avion", (c) =>
    c.from("demandes_billet_avion").insert(data).select().single()
  );
}

export async function updateDemandeBillet(
  id: string,
  data: Partial<DemandeBilletAvionV2>
): Promise<{ ok: boolean; error?: string }> {
  return runMutate("demandes_billet_avion", (c) => c.from("demandes_billet_avion").update(data).eq("id", id));
}

export async function deleteDemandeBillet(id: string): Promise<{ ok: boolean; error?: string }> {
  return runMutate("demandes_billet_avion", (c) => c.from("demandes_billet_avion").delete().eq("id", id));
}

export async function getFacturesClub(): Promise<FactureClubV2[]> {
  return runSelect<FactureClubV2[]>("factures_club", (c) =>
    c
      .from("factures_club")
      .select(
        "id, stage_id, montant_hebergement, montant_restauration, montant_terrains, montant_total, statut, date_emission, date_paiement, reference_paiement, notes, created_at"
      )
      .order("created_at", { ascending: false })
  );
}

export async function upsertFactureClub(
  data: Omit<FactureClubV2, "id" | "created_at">
): Promise<{ data: FactureClubV2 | null; error?: string }> {
  const c = clientOrNull();
  if (!c) return { data: null, error: "Supabase indisponible" };
  try {
    const stageIds = data.stage_id ? await resolveLegacyCompatibleStageIds(data.stage_id) : [data.stage_id ?? null];
    let lastError: string | null = null;
    for (const sid of stageIds) {
      const payload = { ...data, stage_id: sid };
      const { data: row, error } = await c
        .from("factures_club")
        .upsert(payload, { onConflict: "stage_id" })
        .select(
          "id, stage_id, montant_hebergement, montant_restauration, montant_terrains, montant_total, statut, date_emission, date_paiement, reference_paiement, notes, created_at"
        )
        .single();
      if (!error) return { data: row as FactureClubV2 };
      lastError = error.message;
      if (!/foreign key|violates/i.test(error.message)) {
        return { data: null, error: error.message };
      }
    }

    if (data.stage_id) {
      const created = await ensureLegacyStageRow(data.stage_id);
      if (created) {
        const { data: row, error } = await c
          .from("factures_club")
          .upsert(data, { onConflict: "stage_id" })
          .select(
            "id, stage_id, montant_hebergement, montant_restauration, montant_terrains, montant_total, statut, date_emission, date_paiement, reference_paiement, notes, created_at"
          )
          .single();
        if (!error) return { data: row as FactureClubV2 };
        lastError = error.message;
      }
    }
    return { data: null, error: lastError ?? "Erreur upsert facture." };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function getFacturesPrestataires(): Promise<FacturePrestataireV2[]> {
  return runSelect<FacturePrestataireV2[]>("factures_prestataires", (c) =>
    c
      .from("factures_prestataires")
      .select("id, stage_id, service_type, prestataire_nom, montant, facture_url, reference, notes, created_at, updated_at")
      .order("created_at", { ascending: false })
  );
}

export async function upsertFacturePrestataire(
  data: Omit<FacturePrestataireV2, "id" | "created_at" | "updated_at">
): Promise<{ data: FacturePrestataireV2 | null; error?: string }> {
  const c = clientOrNull();
  if (!c) return { data: null, error: "Supabase indisponible" };
  try {
    const payload = { ...data, updated_at: new Date().toISOString() };
    const { data: row, error } = await c
      .from("factures_prestataires")
      .upsert(payload, { onConflict: "stage_id,service_type" })
      .select("id, stage_id, service_type, prestataire_nom, montant, facture_url, reference, notes, created_at, updated_at")
      .single();
    if (error) return { data: null, error: error.message };
    return { data: row as FacturePrestataireV2 };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function getRapportsLogistique(): Promise<RapportLogistiqueV2[]> {
  return runSelect<RapportLogistiqueV2[]>("rapports_logistique", (c) =>
    c
      .from("rapports_logistique")
      .select("id, type, periode_debut, periode_fin, stage_id, contenu, observations, recommandations, statut, envoye_dtn, envoye_at, created_at")
      .order("created_at", { ascending: false })
  );
}

export async function createRapportLogistique(
  data: Omit<RapportLogistiqueV2, "id" | "created_at">
): Promise<{ data: RapportLogistiqueV2 | null; error?: string }> {
  return runInsert<RapportLogistiqueV2>("rapports_logistique", (c) =>
    c.from("rapports_logistique").insert(data).select().single()
  );
}

// ─── INFRASTRUCTURES ──────────────────────────────────────────────────────

export async function getInfrastructures(): Promise<InfrastructureV2[]> {
  return runSelect<InfrastructureV2[]>("infrastructures", (c) => c.from("infrastructures").select("*").order("nom"));
}

export async function getReservationsInfrastructure(): Promise<ReservationInfraV2[]> {
  return runSelect<ReservationInfraV2[]>("reservations_infrastructure", (c) =>
    c.from("reservations_infrastructure").select("*").order("date_debut", { ascending: true })
  );
}

export async function getReservationsEnriched(): Promise<ReservationEnrichedV2[]> {
  const [reservations, stages, infrastructures, entraineurs, stageCoachLinks] = await Promise.all([
    getReservationsInfrastructure(),
    getStages(),
    getInfrastructures(),
    getEntraineurs(),
    getStageCoachLinks(),
  ]);

  const stageMap = new Map(stages.map((s) => [s.id, s]));
  const infraMap = new Map(infrastructures.map((i) => [i.id, i]));
  const coachMap = new Map(entraineurs.map((e) => [e.id, e]));
  const stageFirstCoach = new Map<string, string>();
  for (const link of stageCoachLinks) {
    if (!stageFirstCoach.has(link.stage_id)) stageFirstCoach.set(link.stage_id, link.coach_id);
  }

  return reservations.map((r) => {
    const stage = r.stage_id ? stageMap.get(r.stage_id) : null;
    const infra = infraMap.get(r.infrastructure_id);
    const coachId = r.entraineur_id ?? (r.stage_id ? stageFirstCoach.get(r.stage_id) : null);
    const coach = coachId ? coachMap.get(coachId) : null;
    return {
      ...r,
      stage_nom: stage?.stage_action ?? null,
      stage_categorie: stage?.categorie ?? null,
      court_nom: infra?.nom ?? null,
      court_surface: infra?.surface ?? null,
      infrastructure_type: infra?.type ?? null,
      coach_nom: coach?.nom ?? null,
      coach_prenom: coach?.prenom ?? null,
      groupe: stage?.categorie ?? null,
    };
  });
}

export async function updateReservationInfrastructure(
  id: string,
  data: Partial<
    Pick<
      ReservationInfraV2,
      | "date_debut"
      | "date_fin"
      | "infrastructure_id"
      | "entraineur_id"
      | "statut"
      | "creneau"
      | "heure_debut"
      | "heure_fin"
      | "stage_id"
      | "notes"
    >
  >
): Promise<{ ok: boolean; error?: string }> {
  return runMutate("reservations_infrastructure", (c) =>
    c
      .from("reservations_infrastructure")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", id)
  );
}

export async function createReservationInfrastructure(
  data: Omit<ReservationInfraV2, "id">
): Promise<{ data: ReservationInfraV2 | null; error?: string }> {
  return runInsert<ReservationInfraV2>("reservations_infrastructure", (c) =>
    c.from("reservations_infrastructure").insert(data).select().single()
  );
}

export async function deleteReservationInfrastructure(id: string): Promise<{ ok: boolean; error?: string }> {
  return runMutate("reservations_infrastructure", (c) => c.from("reservations_infrastructure").delete().eq("id", id));
}

export async function getOccupationByPeriode(debut: string, fin: string): Promise<ReservationInfraV2[]> {
  return runSelect<ReservationInfraV2[]>("reservations_infrastructure", (c) =>
    c
      .from("reservations_infrastructure")
      .select("*")
      .gte("date_debut", `${debut}T00:00:00`)
      .lte("date_fin", `${fin}T23:59:59`)
  );
}

export async function getOccupationPourcentage(): Promise<
  { infrastructure_id: string; nom: string; capacite: number; reserve: number; pct: number }[]
> {
  const [infra, resa] = await Promise.all([getInfrastructures(), getReservationsInfrastructure()]);
  return infra.map((i) => {
    const active = resa.filter((r) => r.infrastructure_id === i.id && r.statut !== "annulee").length;
    const cap = i.capacite ?? 1;
    return {
      infrastructure_id: i.id,
      nom: i.nom,
      capacite: cap,
      reserve: active,
      pct: Math.min(100, Math.round((active / cap) * 100)),
    };
  });
}

// ─── HISTORIQUE ───────────────────────────────────────────────────────────

export async function getHistorique(): Promise<HistoriqueV2[]> {
  return runSelect<HistoriqueV2[]>("historique", (c) =>
    c.from("historique").select("*").order("created_at", { ascending: false }).limit(500)
  );
}

// ─── GROUPES / MATÉRIEL (stubs) ───────────────────────────────────────────

export async function getGroupes(): Promise<{ id: string; nom: string }[]> {
  return runSelect<{ id: string; nom: string }[]>("groupes", (c) => c.from("groupes").select("id, nom").order("nom"));
}

export async function getMateriels(): Promise<{ id: string; nom: string }[]> {
  return runSelect<{ id: string; nom: string }[]>("materiels", (c) =>
    c.from("materiels").select("id, nom").order("nom")
  );
}

export async function deleteMateriel(id: string): Promise<{ ok: boolean; error?: string }> {
  return runMutate("materiels", (c) => c.from("materiels").delete().eq("id", id));
}

export async function getDemandesLogistique(): Promise<Record<string, unknown>[]> {
  return runSelect<Record<string, unknown>[]>("demandes_logistique", (c) =>
    c.from("demandes_logistique").select("*").order("created_at", { ascending: false })
  );
}

export async function getDossiersPasseport(): Promise<Record<string, unknown>[]> {
  return runSelect<Record<string, unknown>[]>("dossiers_passeport", (c) =>
    c.from("dossiers_passeport").select("*").order("created_at", { ascending: false })
  );
}

export async function getStageCoachLinks(): Promise<StageCoachV2[]> {
  return runSelect<StageCoachV2[]>("stage_coachs", (c) => c.from("stage_coachs").select("*"));
}

export async function getStagesForJoueur(joueur_id: string): Promise<StageProgrammeV2[]> {
  const c = clientOrNull();
  if (!c) return [];
  const { data: links } = await c.from("stage_joueurs").select("stage_id").eq("joueur_id", joueur_id);
  const ids = (links ?? []).map((l: { stage_id: string }) => l.stage_id);
  if (ids.length === 0) return [];
  const { data, error } = await c.from(STAGES).select("*").in("id", ids).order("date_debut", { ascending: false });
  if (error) {
    warn("stages for joueur", error.message);
    return [];
  }
  return (data ?? []) as StageProgrammeV2[];
}

export async function getStagesForEntraineur(coach_id: string): Promise<StageProgrammeV2[]> {
  const c = clientOrNull();
  if (!c) return [];
  const { data: links } = await c.from("stage_coachs").select("stage_id").eq("coach_id", coach_id);
  const ids = (links ?? []).map((l: { stage_id: string }) => l.stage_id);
  if (ids.length === 0) return [];
  const { data, error } = await c.from(STAGES).select("*").in("id", ids).order("date_debut", { ascending: false });
  if (error) {
    warn("stages for entraineur", error.message);
    return [];
  }
  return (data ?? []) as StageProgrammeV2[];
}

export async function countStagesByJoueur(joueur_id: string): Promise<number> {
  const c = clientOrNull();
  if (!c) return 0;
  const { count } = await c
    .from("stage_joueurs")
    .select("*", { count: "exact", head: true })
    .eq("joueur_id", joueur_id);
  return count ?? 0;
}

export async function countStagesByEntraineur(coach_id: string): Promise<number> {
  const c = clientOrNull();
  if (!c) return 0;
  const { count } = await c
    .from("stage_coachs")
    .select("*", { count: "exact", head: true })
    .eq("coach_id", coach_id);
  return count ?? 0;
}
