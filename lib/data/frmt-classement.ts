/**
 * Import classement FRMT vers Supabase (client / data layer).
 */
import { frmtPlayerToJoueurInput } from "@/lib/frmt/classement-to-joueurs";
import type { Joueur, JoueurInput } from "@/lib/types/database";
import { createJoueur, getJoueurs } from "./joueurs";
import {
  getFrmtClassementJoueurs,
  getFrmtClassementPlayers,
  getFrmtClassementRaw,
} from "./frmt-classement-data";

export {
  getFrmtClassementRaw,
  getFrmtClassementPlayers,
  getFrmtClassementJoueurs,
} from "./frmt-classement-data";

function joueurExists(existing: Joueur[], input: JoueurInput): boolean {
  const birthYear = input.date_naissance.slice(0, 4);
  return existing.some(
    (x) =>
      x.nom.toLowerCase() === input.nom.toLowerCase() &&
      x.prenom.toLowerCase() === input.prenom.toLowerCase() &&
      x.date_naissance.startsWith(birthYear)
  );
}

export async function mergeFrmtClassementToSupabase(): Promise<{
  added: number;
  total: number;
}> {
  let existing = await getJoueurs();
  const players = getFrmtClassementPlayers();
  let added = 0;

  for (let i = 0; i < players.length; i++) {
    const input: JoueurInput = frmtPlayerToJoueurInput(players[i]!, i);
    if (joueurExists(existing, input)) continue;
    const created = await createJoueur(input);
    existing = [...existing, created];
    added++;
  }

  return { added, total: existing.length };
}

export async function mergeFrmtClassementIntoMock(): Promise<{
  added: number;
  total: number;
}> {
  return mergeFrmtClassementToSupabase();
}

export async function ensureFrmtClassementInMock(): Promise<{
  added: number;
  total: number;
  expected?: number;
  present?: number;
}> {
  const expected = getFrmtClassementJoueurs().length;
  const presentBefore = (await getJoueurs()).filter((j) => j.is_frmt_tracked).length;
  if (presentBefore >= expected) {
    return {
      added: 0,
      total: (await getJoueurs()).length,
      expected,
      present: presentBefore,
    };
  }
  const result = await mergeFrmtClassementToSupabase();
  return {
    ...result,
    expected,
    present: (await getJoueurs()).filter((j) => j.is_frmt_tracked).length,
  };
}
