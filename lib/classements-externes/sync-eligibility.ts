import {
  ELITE_PRO_CODE,
  OFFICIAL_UN_CODES,
} from "@/lib/constants/official-categories";

export type ClassementExterneCible = "ATP" | "WTA" | "ITF Junior";

export type JoueurSyncRow = {
  id: string;
  nom: string;
  prenom: string;
  date_naissance: string | null;
  sexe: string | null;
  categorie_age: string | null;
  external_atp_id: string | null;
  external_wta_id: string | null;
  external_itf_junior_id?: string | null;
  statut?: string | null;
};

const JUNIOR_SET = new Set<string>(OFFICIAL_UN_CODES);

export function normSexe(sexe: string | null | undefined): string {
  return (sexe ?? "").trim().toUpperCase();
}

export function isHomme(sexe: string | null | undefined): boolean {
  const s = normSexe(sexe);
  return s === "M" || s === "H" || s === "HOMME";
}

export function isFemme(sexe: string | null | undefined): boolean {
  const s = normSexe(sexe);
  return s === "F" || s === "FEMME";
}

/** Détermine le type de classement externe à interroger selon categorie_age + sexe. */
export function classementCiblePourJoueur(j: Pick<JoueurSyncRow, "categorie_age" | "sexe">): {
  cible: ClassementExterneCible | null;
  raisonIgnore?: string;
} {
  const cat = (j.categorie_age ?? "").trim();

  if (cat === ELITE_PRO_CODE) {
    if (isHomme(j.sexe)) return { cible: "ATP" };
    if (isFemme(j.sexe)) return { cible: "WTA" };
    return { cible: null, raisonIgnore: "Elite Pro sans sexe M/F renseigné" };
  }

  if (JUNIOR_SET.has(cat)) {
    if (!isHomme(j.sexe) && !isFemme(j.sexe)) {
      return { cible: null, raisonIgnore: `Junior ${cat} sans sexe M/F` };
    }
    return { cible: "ITF Junior" };
  }

  return { cible: null, raisonIgnore: `Catégorie « ${cat || "(vide)"} » hors Elite Pro / U8–U18` };
}

export function tourPourCible(cible: ClassementExterneCible): "atp" | "wta" | null {
  if (cible === "ATP") return "atp";
  if (cible === "WTA") return "wta";
  return null;
}

export function groupeParCible(joueurs: JoueurSyncRow[]) {
  const atp: JoueurSyncRow[] = [];
  const wta: JoueurSyncRow[] = [];
  const itf: JoueurSyncRow[] = [];
  const ignores: Array<{ joueur: JoueurSyncRow; raison: string }> = [];

  for (const j of joueurs) {
    const { cible, raisonIgnore } = classementCiblePourJoueur(j);
    if (!cible) {
      ignores.push({ joueur: j, raison: raisonIgnore ?? "non éligible" });
      continue;
    }
    if (cible === "ATP") atp.push(j);
    else if (cible === "WTA") wta.push(j);
    else itf.push(j);
  }

  return { atp, wta, itf, ignores };
}

export const SYNC_JOUEURS_SELECT =
  "id, nom, prenom, date_naissance, sexe, categorie_age, external_atp_id, external_wta_id, external_itf_junior_id, statut";
