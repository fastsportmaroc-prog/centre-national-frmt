import { logHistorique } from "@/lib/audit/historique";
import { getSupabaseDataClient } from "@/lib/supabase/data-client";
import {
  assertMoroccanPlayerProfile,
  isMoroccanPlayer,
  normalizeMoroccanPlayer,
} from "@/lib/tennis/morocco-filter";
import type { Joueur, JoueurInput, JoueurWithGroupe } from "@/lib/types/database";
import { getGroupes } from "./groupes";

export async function getJoueurs(): Promise<Joueur[]> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("joueurs")
    .select("*")
    .order("nom", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Joueur[];
}

export async function getJoueursWithGroupes(): Promise<JoueurWithGroupe[]> {
  const [joueurs, groupes] = await Promise.all([getJoueurs(), getGroupes()]);
  return joueurs.map((j) => ({
    ...j,
    groupe: groupes.find((g) => g.id === j.groupe_id) ?? null,
  }));
}

export async function getJoueurById(id: string): Promise<JoueurWithGroupe | null> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("joueurs")
    .select("*, groupes(*)")
    .eq("id", id)
    .single();
  if (error) return null;
  const row = data as Joueur & { groupes?: JoueurWithGroupe["groupe"] };
  return { ...row, groupe: row.groupes ?? null };
}

function prepareJoueurInput(input: JoueurInput): JoueurInput {
  if (input.is_frmt_tracked) {
    assertMoroccanPlayerProfile(input);
    return normalizeMoroccanPlayer(input);
  }
  if (isMoroccanPlayer(input)) {
    return {
      ...input,
      is_marocain: true,
      country_code: input.country_code ?? "MAR",
      federation: input.federation ?? "FRMT",
    };
  }
  return input;
}

export async function createJoueur(input: JoueurInput): Promise<Joueur> {
  const payload = prepareJoueurInput(input);
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase.from("joueurs").insert(payload).select().single();
  if (error) throw new Error(error.message);
  const joueur = data as Joueur;
  await logHistorique({
    action: "creation",
    module: "joueurs",
    entite_id: joueur.id,
    entite_label: `${joueur.prenom} ${joueur.nom}`,
    ancienne_valeur: null,
    nouvelle_valeur: joueur.statut ?? "actif",
    commentaire: null,
  });
  return joueur;
}

export async function updateJoueur(
  id: string,
  input: Partial<JoueurInput>
): Promise<Joueur> {
  const existing = await getJoueurById(id);
  const merged = { ...existing, ...input } as JoueurInput;
  const payload =
    input.is_frmt_tracked !== undefined || existing?.is_frmt_tracked
      ? prepareJoueurInput(merged)
      : input;

  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("joueurs")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  const joueur = data as Joueur;
  await logHistorique({
    action: "modification",
    module: "joueurs",
    entite_id: id,
    entite_label: `${joueur.prenom} ${joueur.nom}`,
    ancienne_valeur: existing?.statut ?? null,
    nouvelle_valeur: joueur.statut ?? null,
    commentaire: null,
  });
  return joueur;
}

export async function deleteJoueur(id: string): Promise<void> {
  const existing = await getJoueurById(id);
  const supabase = await getSupabaseDataClient();
  const { error } = await supabase.from("joueurs").delete().eq("id", id);
  if (error) throw new Error(error.message);
  if (existing) {
    await logHistorique({
      action: "suppression",
      module: "joueurs",
      entite_id: id,
      entite_label: `${existing.prenom} ${existing.nom}`,
      ancienne_valeur: existing.statut ?? null,
      nouvelle_valeur: null,
      commentaire: null,
    });
  }
}

/** Toujours false en production (Supabase obligatoire). */
export function usingMockData(): boolean {
  return false;
}
