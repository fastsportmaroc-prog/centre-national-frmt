import { getFrmtClassementPlayers } from "@/lib/data/frmt-classement";
import { getJoueurs, createJoueur } from "@/lib/data/joueurs";
import type { JoueurInput } from "@/lib/types/database";
import { frmtPlayerToJoueurInput } from "@/lib/frmt/classement-to-joueurs";

export async function mergeFrmtClassementToSupabase(): Promise<{
  added: number;
  total: number;
}> {
  const existing = await getJoueurs();
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
    await createJoueur(input);
    added++;
  }

  const total = (await getJoueurs()).length;
  return { added, total };
}
