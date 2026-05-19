/**
 * Données classement FRMT (JSON) — sans dépendance Supabase (safe serveur + client).
 */
import classementFile from "@/data/frmt/classement-top5.json";
import {
  dedupeFrmtPlayers,
  frmtPlayersToJoueurs,
  type FrmtClassementFile,
  type FrmtClassementPlayer,
} from "@/lib/frmt/classement-to-joueurs";
import type { Joueur } from "@/lib/types/database";

const file = classementFile as FrmtClassementFile;

export function getFrmtClassementRaw(): FrmtClassementFile {
  return file;
}

export function getFrmtClassementPlayers(): FrmtClassementPlayer[] {
  return dedupeFrmtPlayers(file.players ?? []);
}

export function getFrmtClassementJoueurs(): Joueur[] {
  return frmtPlayersToJoueurs(getFrmtClassementPlayers());
}
