import { lookupJoueurSexeByNomPrenom } from "@/lib/v2/frmt-joueurs-sexe-index";

/** Normalise le sexe joueur depuis la base (M / F). */
export function normalizeJoueurSexe(raw: string | number | null | undefined): "M" | "F" | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") {
    if (raw === 2) return "F";
    if (raw === 1) return "M";
    return null;
  }
  const s = String(raw).trim().toUpperCase();
  if (!s) return null;
  if (s === "F" || s === "2" || s === "FILLE" || s === "FILLES" || s.startsWith("FEM") || s === "FEMME") {
    return "F";
  }
  if (
    s === "M" ||
    s === "1" ||
    s === "H" ||
    s === "GARCON" ||
    s === "GARÇON" ||
    s === "GARCONS" ||
    s === "GARÇONS" ||
    s.startsWith("MAS")
  ) {
    return "M";
  }
  return null;
}

function inferSexeFromText(...parts: (string | null | undefined)[]): "M" | "F" | null {
  const blob = parts
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!blob.trim()) return null;
  if (/\b(fille|filles|feminin|femme|girls|dames|feminine)\b/.test(blob)) return "F";
  if (/\b(garcon|garcons|masculin|boys|homme|garcon)\b/.test(blob)) return "M";
  return null;
}

export function resolveJoueurSexe(j: {
  sexe?: string | number | null;
  categorie_age?: string | null;
  categorie?: string | null;
  notes?: string | null;
  nom?: string | null;
  prenom?: string | null;
}): "M" | "F" | null {
  const direct = normalizeJoueurSexe(j.sexe);
  if (direct) return direct;
  const fromCat = inferSexeFromText(j.categorie_age, j.categorie, j.notes);
  if (fromCat) return fromCat;
  if (j.nom?.trim() && j.prenom?.trim()) {
    return lookupJoueurSexeByNomPrenom(j.nom.trim(), j.prenom.trim());
  }
  return null;
}

/** Libellé rôle compétition : Joueur (M) / Joueuse (F). */
export function joueurRoleLabel(sexe: "M" | "F" | null): string {
  if (sexe === "F") return "Joueuse";
  if (sexe === "M") return "Joueur";
  return "Joueur";
}

export function joueurRoleBadgeClass(sexe: "M" | "F" | null): string {
  if (sexe === "F") return "bg-pink-500/15 text-pink-300 ring-pink-500/30";
  return "bg-sky-500/15 text-sky-300 ring-sky-500/30";
}

export function joueurSexeLabel(sexe: "M" | "F" | null): string {
  if (sexe === "F") return "Féminin";
  if (sexe === "M") return "Masculin";
  return "Non renseigné";
}

export function joueurSexeBadgeClass(sexe: "M" | "F" | null): string {
  return joueurRoleBadgeClass(sexe);
}

/** Compteur pied de page : « 12 joueurs · 8 joueuses ». */
export function formatJoueursCountLabel(
  joueurs: { sexe?: string | number | null; categorie_age?: string | null; categorie?: string | null; notes?: string | null; nom?: string | null; prenom?: string | null }[]
): string {
  let masculin = 0;
  let feminin = 0;
  let autre = 0;
  for (const j of joueurs) {
    const s = resolveJoueurSexe(j);
    if (s === "F") feminin++;
    else if (s === "M") masculin++;
    else autre++;
  }
  const parts: string[] = [];
  if (masculin) parts.push(`${masculin} joueur${masculin > 1 ? "s" : ""}`);
  if (feminin) parts.push(`${feminin} joueuse${feminin > 1 ? "s" : ""}`);
  if (autre) parts.push(`${autre} sans sexe renseigné`);
  return parts.join(" · ") || "0 joueur";
}
