import { getEntraineurs, getJoueurs, getStages } from "@/lib/supabase/queries";
import type { CompetitionListItem } from "@/lib/types/competition";

export type GlobalSearchResultType = "joueur" | "entraineur" | "stage" | "competition";

export type GlobalSearchResult = {
  id: string;
  type: GlobalSearchResultType;
  label: string;
  subtitle: string;
  href: string;
  score: number;
};

const TYPE_LABEL: Record<GlobalSearchResultType, string> = {
  joueur: "Joueur",
  entraineur: "Entraîneur",
  stage: "Stage",
  competition: "Compétition",
};

export function globalSearchTypeLabel(type: GlobalSearchResultType): string {
  return TYPE_LABEL[type];
}

/** Normalise pour recherche insensible aux accents. */
export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function tokensFromQuery(query: string): string[] {
  return normalizeSearchText(query).split(/\s+/).filter(Boolean);
}

/** Filtre nom/prénom + champs optionnels (club, licence…). */
export function matchesParticipantSearch(query: string, ...fields: (string | null | undefined)[]): boolean {
  const tokens = tokensFromQuery(query);
  if (!tokens.length) return true;
  const hay = normalizeSearchText(fields.filter(Boolean).join(" "));
  return tokens.every((t) => hay.includes(t));
}

function scoreMatch(haystack: string, tokens: string[]): number {
  const h = normalizeSearchText(haystack);
  if (!h) return 0;
  if (!tokens.every((t) => h.includes(t))) return 0;

  let score = 10 * tokens.length;
  const full = tokens.join(" ");
  if (h === full) score += 100;
  else if (h.startsWith(full)) score += 60;
  else if (h.includes(full)) score += 30;

  for (const t of tokens) {
    if (h.startsWith(t)) score += 8;
  }
  return score;
}

async function fetchCompetitions(): Promise<CompetitionListItem[]> {
  try {
    const res = await fetch("/api/competitions", { cache: "no-store" });
    if (!res.ok) return [];
    const json = (await res.json()) as { competitions?: CompetitionListItem[] };
    return json.competitions ?? [];
  } catch {
    return [];
  }
}

export async function runGlobalSearch(query: string, limit = 12): Promise<GlobalSearchResult[]> {
  const tokens = tokensFromQuery(query);
  if (tokens.length === 0) return [];

  const [stages, joueurs, entraineurs, competitions] = await Promise.all([
    getStages(),
    getJoueurs(),
    getEntraineurs(),
    fetchCompetitions(),
  ]);

  const results: GlobalSearchResult[] = [];

  for (const j of joueurs) {
    const hay = `${j.prenom} ${j.nom} ${j.club ?? ""} ${j.categorie_age ?? ""} ${j.categorie ?? ""}`;
    const score = scoreMatch(hay, tokens);
    if (score > 0) {
      results.push({
        id: j.id,
        type: "joueur",
        label: `${j.prenom} ${j.nom}`.trim(),
        subtitle: [j.categorie_age, j.club].filter(Boolean).join(" · ") || "Joueur",
        href: `/v2/joueurs/${j.id}`,
        score,
      });
    }
  }

  for (const c of entraineurs) {
    const hay = `${c.prenom} ${c.nom} ${c.specialite ?? ""} ${c.email ?? ""}`;
    const score = scoreMatch(hay, tokens);
    if (score > 0) {
      results.push({
        id: c.id,
        type: "entraineur",
        label: `${c.prenom} ${c.nom}`.trim(),
        subtitle: c.specialite?.trim() || "Entraîneur",
        href: `/v2/entraineurs/${c.id}`,
        score,
      });
    }
  }

  for (const s of stages) {
    const hay = `${s.stage_action} ${s.categorie} ${s.lieu ?? ""} ${s.notes ?? ""}`;
    const score = scoreMatch(hay, tokens);
    if (score > 0) {
      results.push({
        id: s.id,
        type: "stage",
        label: s.stage_action,
        subtitle: `${s.date_debut?.slice(0, 10) ?? ""} → ${s.date_fin?.slice(0, 10) ?? ""} · ${s.categorie}`,
        href: `/v2/stages/${s.id}`,
        score,
      });
    }
  }

  for (const c of competitions) {
    const hay = `${c.nom} ${c.categorie} ${c.lieu ?? ""}`;
    const score = scoreMatch(hay, tokens);
    if (score > 0) {
      results.push({
        id: c.id,
        type: "competition",
        label: c.nom,
        subtitle: `${c.date_debut?.slice(0, 10)} → ${c.date_fin?.slice(0, 10)} · ${c.lieu ?? "—"}`,
        href: `/competitions/${c.id}`,
        score,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** Meilleure cible unique (Entrée clavier). */
export function pickBestSearchResult(results: GlobalSearchResult[]): GlobalSearchResult | null {
  return results[0] ?? null;
}
