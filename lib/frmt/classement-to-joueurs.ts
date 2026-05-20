import type { CategorieAge, Joueur, JoueurInput, SexeJoueur } from "@/lib/types/database";
import {
  MOROCCO_COUNTRY_CODE,
  MOROCCO_FEDERATION,
  MOROCCO_NATIONALITY,
} from "@/lib/tennis/morocco-filter";

export type FrmtClassementPlayer = {
  classement_national: number;
  points: number;
  /** Variation de points depuis le classement WB27 (colonne +/-) */
  variation?: number | null;
  nom: string;
  prenom: string;
  annee_naissance: number;
  club: string;
  sexe: "M" | "F";
  categorie_age: CategorieAge;
  rang_categorie: number;
  frmt_filter: string;
};

export type FrmtClassementFile = {
  source: string;
  fetchedAt: string;
  classementDate?: string | null;
  birthYearMin?: number;
  birthYearMax?: number;
  players: FrmtClassementPlayer[];
  note?: string;
};

const GROUPE_BY_CATEGORIE: Record<CategorieAge, string> = {
  U8: "g6",
  U10: "g6",
  U12: "g6",
  U14: "g5",
  U16: "g4",
  U18: "g3",
  Senior: "g2",
};

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function frmtPlayerToJoueurInput(
  p: FrmtClassementPlayer,
  index: number
): JoueurInput {
  const date_naissance = `${p.annee_naissance}-01-01`;
  const sexe = p.sexe as SexeJoueur;
  const varLabel =
    p.variation != null && !Number.isNaN(p.variation)
      ? ` · ${p.variation >= 0 ? "+" : ""}${p.variation} pts`
      : "";
  const classementLabel = `${p.classement_national}e national · ${p.points} pts${varLabel}`;
  return {
    photo_url: null,
    prenom: titleCase(p.prenom),
    nom: titleCase(p.nom),
    date_naissance,
    categorie_age: p.categorie_age,
    sexe,
    nationalite: MOROCCO_NATIONALITY,
    country_code: MOROCCO_COUNTRY_CODE,
    federation: MOROCCO_FEDERATION,
    is_marocain: true,
    is_frmt_tracked: true,
    email: null,
    telephone: null,
    niveau: `Top ${p.rang_categorie} cat. ${p.annee_naissance}`,
    classement: classementLabel,
    groupe_id: GROUPE_BY_CATEGORIE[p.categorie_age] ?? "g2",
    coach_referent: null,
    statut: "actif",
    documents: null,
    notes: `Import FRMT WB27 (${p.frmt_filter}) — club ${p.club} — top ${p.rang_categorie}/5${varLabel}`,
  };
}

export function frmtPlayersToJoueurs(
  players: FrmtClassementPlayer[],
  idPrefix = "frmt"
): Joueur[] {
  const now = new Date().toISOString();
  return players.map((p, i) => {
    const input = frmtPlayerToJoueurInput(p, i);
    const slug = `${p.annee_naissance}-${p.sexe}-${p.nom}-${p.prenom}`
      .replace(/[^a-zA-Z0-9-]/g, "")
      .toLowerCase();
    return {
      ...input,
      id: `${idPrefix}-${slug}`,
      created_at: now,
    };
  });
}

export function dedupeFrmtPlayers(players: FrmtClassementPlayer[]): FrmtClassementPlayer[] {
  const seen = new Set<string>();
  return players.filter((p) => {
    const key = `${p.annee_naissance}|${p.sexe}|${p.nom}|${p.prenom}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
