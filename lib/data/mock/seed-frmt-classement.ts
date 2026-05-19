import classementFile from "@/data/frmt/classement-top5.json";
import {
  dedupeFrmtPlayers,
  frmtPlayersToJoueurs,
  type FrmtClassementFile,
} from "@/lib/frmt/classement-to-joueurs";
import type { Joueur } from "@/lib/types/database";

const file = classementFile as FrmtClassementFile;

export const seedFrmtClassementJoueurs: Joueur[] = frmtPlayersToJoueurs(
  dedupeFrmtPlayers(file.players ?? [])
);
