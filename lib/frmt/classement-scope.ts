import type { FrmtClassementPlayer } from "@/lib/frmt/classement-to-joueurs";

/** Années de naissance ciblées — top 5 G / F isolés par année */
export const FRMT_BIRTH_YEAR_MIN = 2005;
export const FRMT_BIRTH_YEAR_MAX = 2015;

export const FRMT_BIRTH_YEARS = Array.from(
  { length: FRMT_BIRTH_YEAR_MAX - FRMT_BIRTH_YEAR_MIN + 1 },
  (_, i) => FRMT_BIRTH_YEAR_MAX - i
);

export function isFrmtBirthYearInScope(year: number): boolean {
  return year >= FRMT_BIRTH_YEAR_MIN && year <= FRMT_BIRTH_YEAR_MAX;
}

/** Garde uniquement le top 5 par couple (année, sexe). */
export function filterTop5PerBirthYearAndSexe(
  players: FrmtClassementPlayer[]
): FrmtClassementPlayer[] {
  const buckets = new Map<string, FrmtClassementPlayer[]>();

  for (const p of players) {
    if (!isFrmtBirthYearInScope(p.annee_naissance)) continue;
    const key = `${p.annee_naissance}-${p.sexe}`;
    const list = buckets.get(key) ?? [];
    list.push(p);
    buckets.set(key, list);
  }

  const out: FrmtClassementPlayer[] = [];
  for (const year of FRMT_BIRTH_YEARS) {
    for (const sexe of ["M", "F"] as const) {
      const key = `${year}-${sexe}`;
      const list = (buckets.get(key) ?? [])
        .sort((a, b) => a.rang_categorie - b.rang_categorie || b.points - a.points)
        .slice(0, 5)
        .map((p, i) => ({ ...p, rang_categorie: i + 1 }));
      out.push(...list);
    }
  }
  return out;
}

export type FrmtYearSexeGroup = {
  annee: number;
  sexe: "M" | "F";
  label: string;
  players: FrmtClassementPlayer[];
};

export function groupFrmtPlayersByYearAndSexe(
  players: FrmtClassementPlayer[]
): FrmtYearSexeGroup[] {
  const scoped = filterTop5PerBirthYearAndSexe(players);
  const groups: FrmtYearSexeGroup[] = [];

  for (const year of FRMT_BIRTH_YEARS) {
    for (const sexe of ["M", "F"] as const) {
      const list = scoped
        .filter((p) => p.annee_naissance === year && p.sexe === sexe)
        .sort((a, b) => a.rang_categorie - b.rang_categorie);
      groups.push({
        annee: year,
        sexe,
        label: sexe === "M" ? "Garçons" : "Filles",
        players: list,
      });
    }
  }
  return groups;
}
