/**
 * Données classement FRMT (JSON) — sans dépendance Supabase (safe serveur + client).
 */
import classementFile from "@/data/frmt/classement-top5.json";
import {
  filterTop5PerBirthYearAndSexe,
  groupFrmtPlayersByYearAndSexe,
  FRMT_BIRTH_YEAR_MIN,
  FRMT_BIRTH_YEAR_MAX,
} from "@/lib/frmt/classement-scope";
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

/** Top 5 par année (2005–2015) et sexe — garçons / filles isolés */
export function getFrmtClassementPlayers(): FrmtClassementPlayer[] {
  const deduped = dedupeFrmtPlayers(file.players ?? []);
  return filterTop5PerBirthYearAndSexe(deduped);
}

export function getFrmtClassementGroups() {
  return groupFrmtPlayersByYearAndSexe(getFrmtClassementPlayers());
}

export function getFrmtClassementMeta() {
  const players = getFrmtClassementPlayers();
  const garcons = players.filter((p) => p.sexe === "M").length;
  const filles = players.filter((p) => p.sexe === "F").length;
  return {
    birthYearMin: FRMT_BIRTH_YEAR_MIN,
    birthYearMax: FRMT_BIRTH_YEAR_MAX,
    total: players.length,
    garcons,
    filles,
    source: file.source,
    fetchedAt: file.fetchedAt,
  };
}

export function getFrmtClassementJoueurs(): Joueur[] {
  return frmtPlayersToJoueurs(getFrmtClassementPlayers());
}
