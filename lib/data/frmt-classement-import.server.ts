import "server-only";

import { getFrmtClassementPlayers } from "@/lib/data/frmt-classement";
import { getSupabaseServerDataClient } from "@/lib/supabase/data-client.server";
import type { JoueurInput } from "@/lib/types/database";
import { frmtPlayerToJoueurInput } from "@/lib/frmt/classement-to-joueurs";
import type { Joueur } from "@/lib/types/database";
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

/** Import classement FRMT — route API / Server Actions uniquement. */
export async function mergeFrmtClassementToSupabase(): Promise<{
  added: number;
  total: number;
}> {
  const supabase = await getSupabaseServerDataClient();
  const { data: existingRows, error: readError } = await supabase
    .from("joueurs")
    .select("*")
    .order("nom", { ascending: true });
  if (readError) throw new Error(readError.message);
  const existing = (existingRows ?? []) as Joueur[];

  const players = getFrmtClassementPlayers();
  let added = 0;

  for (let i = 0; i < players.length; i++) {
    const input: JoueurInput = frmtPlayerToJoueurInput(players[i]!, i);
    const birthYear = input.date_naissance.slice(0, 4);
    const exists = existing.some(
      (x) =>
        x.nom.toLowerCase() === input.nom.toLowerCase() &&
        x.prenom.toLowerCase() === input.prenom.toLowerCase() &&
        x.date_naissance.startsWith(birthYear)
    );
    if (exists) continue;

    const payload = prepareJoueurInput(input);
    const { data, error } = await supabase.from("joueurs").insert(payload).select().single();
    if (error) throw new Error(error.message);
    existing.push(data as Joueur);
    added++;
  }

  return { added, total: existing.length };
}
