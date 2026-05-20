import "server-only";

import { getFrmtClassementPlayers } from "@/lib/data/frmt-classement-data";
import { getSupabaseServerDataClient } from "@/lib/supabase/data-client.server";
import type { Joueur, JoueurInput } from "@/lib/types/database";
import {
  frmtPlayerToJoueurInput,
  groupeIdForCategorie,
} from "@/lib/frmt/classement-to-joueurs";
import {
  assertMoroccanPlayerProfile,
  isMoroccanPlayer,
  normalizeMoroccanPlayer,
} from "@/lib/tennis/morocco-filter";

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

function findExistingJoueur(existing: Joueur[], input: JoueurInput): Joueur | undefined {
  const birthYear = input.date_naissance.slice(0, 4);
  return existing.find(
    (x) =>
      x.nom.toLowerCase() === input.nom.toLowerCase() &&
      x.prenom.toLowerCase() === input.prenom.toLowerCase() &&
      x.date_naissance.startsWith(birthYear)
  );
}

function rankingFieldsFromInput(input: JoueurInput): Partial<JoueurInput> {
  return {
    niveau: input.niveau,
    classement: input.classement,
    notes: input.notes,
    categorie_age: input.categorie_age,
    sexe: input.sexe,
    groupe_id: input.groupe_id,
    is_frmt_tracked: true,
    is_marocain: true,
    country_code: input.country_code,
    federation: input.federation,
    nationalite: input.nationalite,
    statut: input.statut,
  };
}

/** Import / mise à jour classement FRMT depuis data/frmt/classement-top5.json */
export async function mergeFrmtClassementToSupabase(): Promise<{
  added: number;
  updated: number;
  total: number;
  sourcePlayers: number;
}> {
  const supabase = await getSupabaseServerDataClient();

  const [{ data: existingRows, error: readError }, { data: groupesRows, error: grpError }] =
    await Promise.all([
      supabase.from("joueurs").select("*").order("nom", { ascending: true }),
      supabase.from("groupes").select("id, nom"),
    ]);

  if (readError) throw new Error(readError.message);
  if (grpError) throw new Error(grpError.message);

  const existing = (existingRows ?? []) as Joueur[];
  const groupes = (groupesRows ?? []) as { id: string; nom: string }[];
  const players = getFrmtClassementPlayers();

  let added = 0;
  let updated = 0;

  for (let i = 0; i < players.length; i++) {
    const p = players[i]!;
    const groupeId = groupeIdForCategorie(groupes, p.categorie_age);
    const input: JoueurInput = frmtPlayerToJoueurInput(p, i, groupeId);
    const payload = prepareJoueurInput(input);
    const found = findExistingJoueur(existing, payload);

    if (found) {
      const patch = rankingFieldsFromInput(payload);
      const { data, error } = await supabase
        .from("joueurs")
        .update(patch)
        .eq("id", found.id)
        .select()
        .single();
      if (error) throw new Error(`${payload.prenom} ${payload.nom}: ${error.message}`);
      const idx = existing.findIndex((x) => x.id === found.id);
      if (idx >= 0) existing[idx] = data as Joueur;
      updated++;
      continue;
    }

    const { data, error } = await supabase.from("joueurs").insert(payload).select().single();
    if (error) throw new Error(`${payload.prenom} ${payload.nom}: ${error.message}`);
    existing.push(data as Joueur);
    added++;
  }

  return {
    added,
    updated,
    total: existing.length,
    sourcePlayers: players.length,
  };
}
