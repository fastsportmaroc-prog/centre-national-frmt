import frmtJoueursList from "../../output/joueurs-frmt.json";
import { getFrmtClassementPlayers } from "@/lib/data/frmt-classement-data";
function nameKey(nom: string, prenom: string): string {
  const norm = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  return `${norm(nom)}|${norm(prenom)}`;
}

const byName = new Map<string, "M" | "F">();

function normalizeSexe(raw: unknown): "M" | "F" | null {
  if (raw == null) return null;
  const s = String(raw).trim().toUpperCase();
  if (s === "F" || s === "2" || s.startsWith("FEM") || s === "FILLE" || s === "FILLES") return "F";
  if (s === "M" || s === "1" || s.startsWith("MAS") || s === "GARCON" || s === "GARCONS") return "M";
  return null;
}

function register(nom: string, prenom: string, sexe: unknown) {
  const s = normalizeSexe(sexe);
  if (s) byName.set(nameKey(nom, prenom), s);
}

for (const j of frmtJoueursList as { nom: string; prenom: string; sexe?: string }[]) {
  register(j.nom, j.prenom, j.sexe);
}

for (const p of getFrmtClassementPlayers()) {
  register(p.nom, p.prenom, p.sexe);
}

/** Sexe FRMT par nom/prénom (si absent en base joueurs). */
export function lookupJoueurSexeByNomPrenom(nom: string, prenom: string): "M" | "F" | null {
  return byName.get(nameKey(nom, prenom)) ?? null;
}
