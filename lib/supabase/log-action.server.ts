import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LogActionInput = {
  action: string;
  description: string;
  stage_id?: string | null;
  table_concernee?: string | null;
  record_id?: string | null;
  ancienne_valeur?: Record<string, unknown> | null;
  nouvelle_valeur?: Record<string, unknown> | null;
  module?: string;
};

function computeDiff(
  avant: Record<string, unknown> | null | undefined,
  apres: Record<string, unknown> | null | undefined
): Record<string, { avant: unknown; apres: unknown }> | null {
  if (!avant || !apres) return null;
  const diff: Record<string, { avant: unknown; apres: unknown }> = {};
  for (const key of new Set([...Object.keys(avant), ...Object.keys(apres)])) {
    if (JSON.stringify(avant[key]) !== JSON.stringify(apres[key])) {
      diff[key] = { avant: avant[key], apres: apres[key] };
    }
  }
  return Object.keys(diff).length ? diff : null;
}

async function resolveActor() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { userId: null, userNom: "Système", userRole: "viewer" };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { userId: null, userNom: "Système", userRole: "viewer" };
  const { data: profile } = await supabase
    .from("profiles")
    .select("nom, prenom, full_name, role")
    .eq("id", user.id)
    .maybeSingle();
  return {
    userId: user.id,
    userNom:
      [profile?.prenom, profile?.nom].filter(Boolean).join(" ") ||
      profile?.full_name ||
      user.email ||
      "Utilisateur",
    userRole: (profile?.role as string) ?? "viewer",
  };
}

export async function logAction(input: LogActionInput): Promise<void> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return;

  const { userId, userNom, userRole } = await resolveActor();
  const diff = computeDiff(input.ancienne_valeur, input.nouvelle_valeur);
  const entry = {
    stage_id: input.stage_id ?? null,
    action: input.action,
    description: input.description,
    module: input.module ?? input.table_concernee ?? "general",
    entite_id: input.record_id ?? input.stage_id ?? null,
    entite_label: input.description,
    utilisateur_nom: userNom,
    utilisateur_role: userRole,
    user_id: userId,
    user_nom: userNom,
    user_role: userRole,
    table_concernee: input.table_concernee ?? null,
    record_id: input.record_id ?? null,
    ancienne_valeur: input.ancienne_valeur ?? null,
    nouvelle_valeur: input.nouvelle_valeur ?? null,
    diff,
    commentaire: input.nouvelle_valeur ? JSON.stringify(input.nouvelle_valeur) : null,
  };

  const { error } = await supabase.from("historique").insert(entry);
  if (error) console.warn("[logAction]", error.message);
}
