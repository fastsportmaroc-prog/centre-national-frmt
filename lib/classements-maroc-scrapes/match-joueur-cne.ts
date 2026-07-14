import { ELITE_PRO_CODE } from "@/lib/constants/official-categories";
import { displayNameForCneJoueur } from "@/lib/classements-maroc-scrapes/display-name";
import { normalizeName } from "@/lib/classements-externes/rapidapi-ranking-parse";

export type JoueurCneRow = {
  id: string;
  prenom: string | null;
  nom: string | null;
  sexe: string | null;
  categorie_age?: string | null;
};

function normSexe(sexe: string | null | undefined): string {
  return (sexe ?? "").trim().toUpperCase();
}

function isHomme(sexe: string | null | undefined): boolean {
  const s = normSexe(sexe);
  return s === "M" || s === "H" || s === "HOMME";
}

function isFemme(sexe: string | null | undefined): boolean {
  const s = normSexe(sexe);
  return s === "F" || s === "FEMME";
}

function isEligibleCneForCircuit(j: JoueurCneRow, type: "ATP" | "WTA"): boolean {
  const cat = (j.categorie_age ?? "").trim();
  if (cat !== ELITE_PRO_CODE) return false;
  if (type === "ATP") return isHomme(j.sexe);
  return isFemme(j.sexe);
}

function tokens(value: string): string[] {
  return normalizeName(value).split(" ").filter((t) => t.length >= 2);
}

function atpSlugFromSourceId(sourcePlayerId: string | null | undefined): string {
  if (!sourcePlayerId) return "";
  return sourcePlayerId.split("/")[0] ?? "";
}

function initialFromAbbreviatedDisplay(display: string): string | null {
  const m = display.trim().match(/^([A-Za-zÀ-ÿ])\./);
  return m ? normalizeName(m[1]!) : null;
}

function prenomMatchesSlug(prenom: string | null | undefined, slug: string): boolean {
  if (!slug) return false;
  const slugFirst = slug.split("-")[0] ?? "";
  if (!slugFirst) return false;
  const parts = normalizeName(prenom ?? "").split(" ").filter(Boolean);
  return parts.some(
    (p) =>
      p === slugFirst ||
      p.startsWith(slugFirst) ||
      slugFirst.startsWith(p.slice(0, Math.min(3, p.length)))
  );
}

function prenomMatchesInitial(prenom: string | null | undefined, initial: string): boolean {
  if (!initial) return false;
  const parts = normalizeName(prenom ?? "").split(" ").filter(Boolean);
  return parts.some((p) => p.startsWith(initial) || initial.startsWith(p.charAt(0)));
}

function familyTokensFromDisplay(display: string): string[] {
  const parts = display
    .replace(/\./g, " ")
    .trim()
    .split(/\s+/)
    .filter((p) => p.length >= 2);
  if (parts.length <= 1) return parts.map((p) => normalizeName(p)).filter(Boolean);
  return parts.slice(1).map((p) => normalizeName(p));
}

function joueurKeys(j: JoueurCneRow): string[] {
  const p = (j.prenom ?? "").trim();
  const n = (j.nom ?? "").trim();
  const keys = new Set<string>();
  const full = normalizeName(`${p} ${n}`);
  if (full) keys.add(full);
  const nomParts = n.split(/\s+/).filter((t) => t.length >= 2);
  if (p && nomParts[0]) keys.add(normalizeName(`${p} ${nomParts[0]}`));
  return [...keys];
}

function scrapedMatchesJoueur(scrapedName: string, j: JoueurCneRow): boolean {
  const scrapedNorm = normalizeName(scrapedName);
  if (!scrapedNorm) return false;

  for (const key of joueurKeys(j)) {
    if (key === scrapedNorm || scrapedNorm.includes(key) || key.includes(scrapedNorm)) {
      return true;
    }
  }

  const scrapedFamilies = familyTokensFromDisplay(scrapedName);
  const joueurTokens = tokens(`${j.prenom ?? ""} ${j.nom ?? ""}`);
  const joueurFamilies = joueurTokens.slice(1);

  if (!scrapedFamilies.length || !joueurFamilies.length) return false;

  return scrapedFamilies.some(
    (sf) =>
      sf.length >= 3 &&
      joueurFamilies.some((jf) => jf === sf || jf.startsWith(sf) || sf.startsWith(jf))
  );
}

export function matchScrapedToCneJoueur(
  scrapedName: string,
  type: "ATP" | "WTA",
  joueurs: JoueurCneRow[],
  options?: { sourcePlayerId?: string | null }
): JoueurCneRow | null {
  const slug = atpSlugFromSourceId(options?.sourcePlayerId);
  const candidates: JoueurCneRow[] = [];

  for (const j of joueurs) {
    if (!isEligibleCneForCircuit(j, type)) continue;
    if (scrapedMatchesJoueur(scrapedName, j)) candidates.push(j);
  }

  if (!candidates.length) return null;
  if (candidates.length === 1) return candidates[0]!;

  if (slug) {
    const bySlug = candidates.filter((j) => prenomMatchesSlug(j.prenom, slug));
    if (bySlug.length === 1) return bySlug[0]!;
    if (bySlug.length > 1) candidates.splice(0, candidates.length, ...bySlug);
  }

  const initial = initialFromAbbreviatedDisplay(scrapedName);
  if (initial) {
    const byInitial = candidates.filter((j) => prenomMatchesInitial(j.prenom, initial));
    if (byInitial.length === 1) return byInitial[0]!;
  }

  const scrapedNorm = normalizeName(scrapedName);
  const exact = candidates.find(
    (j) => normalizeName(displayNameForCneJoueur(j.prenom, j.nom)) === scrapedNorm
  );
  if (exact) return exact;

  return null;
}

export function attachCneMatches<
  T extends {
    nom_joueur: string;
    type_classement: "ATP" | "WTA";
    source_player_id?: string | null;
  },
>(rows: T[], joueurs: JoueurCneRow[]): Array<T & { joueur_cne_id: string | null; est_membre_cne: boolean }> {
  return rows.map((row) => {
    const hit = matchScrapedToCneJoueur(row.nom_joueur, row.type_classement, joueurs, {
      sourcePlayerId: row.source_player_id,
    });
    const nom_joueur = hit
      ? displayNameForCneJoueur(hit.prenom, hit.nom) || row.nom_joueur
      : row.nom_joueur;
    return {
      ...row,
      nom_joueur,
      joueur_cne_id: hit?.id ?? null,
      est_membre_cne: Boolean(hit),
    };
  });
}
