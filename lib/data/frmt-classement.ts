/**
 * Classement FRMT (JSON local). Import vers Supabase pour le registre joueurs.
 */
import classementFile from "@/data/frmt/classement-top5.json";
import {
  dedupeFrmtPlayers,
  frmtPlayerToJoueurInput,
  frmtPlayersToJoueurs,
  type FrmtClassementFile,
  type FrmtClassementPlayer,
} from "@/lib/frmt/classement-to-joueurs";
import type { Joueur } from "@/lib/types/database";
import { createJoueur, getJoueurs } from "./joueurs";

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

/** Fusionne les joueurs FRMT dans le store mock (sans doublons nom+prénom+année). */
export function mergeFrmtClassementIntoMock(): { added: number; total: number } {
  mockStore.ensureFrmtClassementJoueurs();
  return mockStore.mergeFrmtClassementJoueurs(getFrmtClassementJoueurs());
}

/** Restaure la liste complète du classement WB27 (après sync performances). */
export function ensureFrmtClassementInMock(): {
  added: number;
  total: number;
  expected?: number;
  present?: number;
} {
  return mockStore.ensureFrmtClassementJoueurs();
}
