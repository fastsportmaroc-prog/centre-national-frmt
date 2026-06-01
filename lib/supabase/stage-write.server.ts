import "server-only";

import { authUserIsAppAdmin } from "@/lib/auth/admin-access";
import { permissionsForRole } from "@/lib/auth/app-permissions";
import { resolveEffectiveAppRole } from "@/lib/auth/passeports-access";
import { getAuthUserFromServer } from "@/lib/auth/server-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin.server";
import { getSupabaseServerDataClient } from "@/lib/supabase/data-client.server";
import type {
  DemandeBilletAvionV2,
  PlanningSeanceV2,
  ReservationInfraV2,
  RestaurationStageV2,
  StageProgrammeInputV2,
  StageProgrammeV2,
} from "@/lib/types/v2";

const STAGES = "stages_programme";

function rlsHint(table: string): string {
  return `Création refusée (RLS sur ${table}). Connectez-vous et exécutez lib/db/migrations/stages_programme_rls.sql si besoin.`;
}

export async function createStageServer(
  data: StageProgrammeInputV2
): Promise<{ stage: StageProgrammeV2 | null; error?: string }> {
  const supabase = await getSupabaseServerDataClient();
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
    terrains: data.terrains ?? false,
    restauration: data.restauration ?? false,
    transport_avion: data.transport_avion ?? false,
    kinesitherapie: data.kinesitherapie ?? false,
    infrastructure_ids: [],
    entraineur_ids: [],
    materiel_assignations: [],
    budget_prevu: null,
    budget_reel: null,
  };
  const { data: row, error } = await supabase.from(STAGES).insert(payload).select().single();
  if (error) {
    const msg = error.message;
    if (msg.includes("row-level security")) return { stage: null, error: rlsHint(STAGES) };
    return { stage: null, error: msg };
  }
  return { stage: row as StageProgrammeV2 };
}

async function stageWriteClientForUser() {
  const user = await getAuthUserFromServer();
  if (!user) return { supabase: null as null, user: null, error: "Non authentifié — reconnectez-vous." };

  const appRole = resolveEffectiveAppRole(user);
  if (!permissionsForRole(appRole).canWrite && !authUserIsAppAdmin(user)) {
    return { supabase: null, user, error: "Modification non autorisée pour votre rôle." };
  }

  if (authUserIsAppAdmin(user)) {
    const admin = createSupabaseAdminClient();
    if (admin) return { supabase: admin, user, error: undefined };
  }

  return { supabase: await getSupabaseServerDataClient(), user, error: undefined };
}

export async function updateStageServer(
  id: string,
  data: Partial<StageProgrammeInputV2>
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, error: authError } = await stageWriteClientForUser();
  if (authError || !supabase) return { ok: false, error: authError ?? "Client Supabase indisponible." };

  const { error } = await supabase
    .from(STAGES)
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    const msg = error.message;
    if (msg.includes("row-level security")) return { ok: false, error: rlsHint(STAGES) };
    return { ok: false, error: msg };
  }
  return { ok: true };
}

export async function deleteStageServer(id: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getAuthUserFromServer();
  if (!user) return { ok: false, error: "Non authentifié — reconnectez-vous." };
  const appRole = resolveEffectiveAppRole(user);
  if (!permissionsForRole(appRole).canDelete && !authUserIsAppAdmin(user)) {
    return { ok: false, error: "Suppression non autorisée pour votre rôle." };
  }

  const supabase = authUserIsAppAdmin(user)
    ? (createSupabaseAdminClient() ?? (await getSupabaseServerDataClient()))
    : await getSupabaseServerDataClient();

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
    const { error } = await supabase.from(t).delete().eq("stage_id", id);
    if (error && !error.message.includes("row-level security")) {
      console.warn(`[deleteStageServer] ${t}:`, error.message);
    }
  }
  const { error } = await supabase.from(STAGES).delete().eq("id", id);
  if (error) {
    if (error.message.includes("row-level security")) return { ok: false, error: rlsHint(STAGES) };
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function linkJoueurStageServer(
  stage_id: string,
  joueur_id: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await getSupabaseServerDataClient();
  const { error } = await supabase.from("stage_joueurs").insert({ stage_id, joueur_id });
  if (error) {
    if (error.message.includes("row-level security")) return { ok: false, error: rlsHint("stage_joueurs") };
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function linkCoachStageServer(
  stage_id: string,
  coach_id: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await getSupabaseServerDataClient();
  const { error } = await supabase.from("stage_coachs").insert({ stage_id, coach_id });
  if (error) {
    if (error.message.includes("row-level security")) return { ok: false, error: rlsHint("stage_coachs") };
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function createRestaurationServer(
  data: Omit<RestaurationStageV2, "id">
): Promise<{ data: RestaurationStageV2 | null; error?: string }> {
  const supabase = await getSupabaseServerDataClient();
  const { data: row, error } = await supabase.from("restaurations").insert(data).select().single();
  if (error) {
    if (error.message.includes("row-level security")) return { data: null, error: rlsHint("restaurations") };
    return { data: null, error: error.message };
  }
  return { data: row as RestaurationStageV2 };
}

export async function createSeanceServer(
  data: Omit<PlanningSeanceV2, "id">
): Promise<{ data: PlanningSeanceV2 | null; error?: string }> {
  const supabase = await getSupabaseServerDataClient();
  const { data: row, error } = await supabase.from("planning").insert(data).select().single();
  if (error) {
    if (error.message.includes("row-level security")) return { data: null, error: rlsHint("planning") };
    return { data: null, error: error.message };
  }
  return { data: row as PlanningSeanceV2 };
}

export async function createReservationInfrastructureServer(
  data: Omit<ReservationInfraV2, "id">
): Promise<{ data: ReservationInfraV2 | null; error?: string }> {
  const supabase = await getSupabaseServerDataClient();
  const { data: row, error } = await supabase
    .from("reservations_infrastructure")
    .insert(data)
    .select()
    .single();
  if (error) {
    if (error.message.includes("row-level security"))
      return { data: null, error: rlsHint("reservations_infrastructure") };
    return { data: null, error: error.message };
  }
  return { data: row as ReservationInfraV2 };
}

export async function createDemandeBilletServer(
  data: Omit<DemandeBilletAvionV2, "id">
): Promise<{ data: DemandeBilletAvionV2 | null; error?: string }> {
  const supabase = await getSupabaseServerDataClient();
  const { data: row, error } = await supabase
    .from("demandes_billet_avion")
    .insert(data)
    .select()
    .single();
  if (error) {
    if (error.message.includes("row-level security"))
      return { data: null, error: rlsHint("demandes_billet_avion") };
    return { data: null, error: error.message };
  }
  return { data: row as DemandeBilletAvionV2 };
}
