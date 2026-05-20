import type { JoueurWithGroupe } from "@/lib/types/database";
import {
  FRMT_BIRTH_YEARS,
  isFrmtBirthYearInScope,
} from "@/lib/frmt/classement-scope";

export type JoueurFrmtYearGroup = {
  annee: number;
  sexe: "M" | "F";
  label: string;
  joueurs: JoueurWithGroupe[];
};

function birthYear(j: JoueurWithGroupe): number {
  return Number.parseInt(j.date_naissance.slice(0, 4), 10);
}

function rankFromJoueur(j: JoueurWithGroupe): number {
  const m = j.notes?.match(/top\s*(\d+)\s*\/\s*5/i);
  if (m) return Number.parseInt(m[1]!, 10);
  const n = j.niveau?.match(/Top\s*(\d+)/i);
  if (n) return Number.parseInt(n[1]!, 10);
  return 99;
}

export function filterJoueursFrmtScope(joueurs: JoueurWithGroupe[]): JoueurWithGroupe[] {
  return joueurs.filter((j) => {
    const y = birthYear(j);
    return Boolean(j.is_frmt_tracked) && isFrmtBirthYearInScope(y);
  });
}

/** Regroupe les joueurs FRMT en base par année de naissance et sexe (top 5 max). */
export function groupJoueursByBirthYearAndSexe(
  joueurs: JoueurWithGroupe[]
): JoueurFrmtYearGroup[] {
  const scoped = filterJoueursFrmtScope(joueurs);
  const groups: JoueurFrmtYearGroup[] = [];

  for (const year of FRMT_BIRTH_YEARS) {
    for (const sexe of ["M", "F"] as const) {
      const list = scoped
        .filter((j) => birthYear(j) === year && j.sexe === sexe)
        .sort((a, b) => rankFromJoueur(a) - rankFromJoueur(b))
        .slice(0, 5);
      groups.push({
        annee: year,
        sexe,
        label: sexe === "M" ? "Garçons" : "Filles",
        joueurs: list,
      });
    }
  }
  return groups;
}
