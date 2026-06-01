import { getJoueurDisplayCategorie } from "@/lib/utils/joueur";
import type { JoueurV2 } from "@/lib/types/v2";

export type RepartitionRow = { label: string; count: number; pct: number };

export function countActiveFilters(flags: {
  search: string;
  sexe: string;
  categorie: string;
  annee: string;
  statut: string;
  clubFilter: string;
}): number {
  let n = 0;
  if (flags.search.trim()) n++;
  if (flags.sexe) n++;
  if (flags.categorie) n++;
  if (flags.annee) n++;
  if (flags.statut) n++;
  if (flags.clubFilter) n++;
  return n;
}

export function joueurDocsComplete(j: JoueurV2): boolean {
  return Boolean(j.passeport_numero?.trim() && j.passeport_expiration);
}

export function buildRepartitionByCategory(joueurs: JoueurV2[]): RepartitionRow[] {
  const map = new Map<string, number>();
  for (const j of joueurs) {
    const cat = getJoueurDisplayCategorie(j) || "—";
    map.set(cat, (map.get(cat) ?? 0) + 1);
  }
  const total = joueurs.length || 1;
  return [...map.entries()]
    .map(([label, count]) => ({ label, count, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count);
}

export function buildRepartitionBySexe(joueurs: JoueurV2[]): { M: number; F: number; autre: number } {
  let M = 0;
  let F = 0;
  let autre = 0;
  for (const j of joueurs) {
    if (j.sexe === "F") F++;
    else if (j.sexe === "M") M++;
    else autre++;
  }
  return { M, F, autre };
}

export function buildRepartitionByStatut(joueurs: JoueurV2[]): RepartitionRow[] {
  const labels: Record<string, string> = {
    actif: "Actifs",
    inactif: "Inactifs",
    blesse: "Blessés",
    suspendu: "Suspendus",
  };
  const map = new Map<string, number>();
  for (const j of joueurs) {
    const key = j.statut ?? "actif";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  const total = joueurs.length || 1;
  return [...map.entries()]
    .map(([key, count]) => ({
      label: labels[key] ?? key,
      count,
      pct: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

export function buildRepartitionByClub(joueurs: JoueurV2[], limit = 12): RepartitionRow[] {
  const map = new Map<string, number>();
  for (const j of joueurs) {
    const club = (j.club ?? "").trim() || "Sans club";
    map.set(club, (map.get(club) ?? 0) + 1);
  }
  const total = joueurs.length || 1;
  return [...map.entries()]
    .map(([label, count]) => ({ label, count, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function buildRepartitionStages(
  joueurs: JoueurV2[],
  stageCounts: Record<string, number>
): RepartitionRow[] {
  let zero = 0;
  let one = 0;
  let multi = 0;
  for (const j of joueurs) {
    const n = stageCounts[j.id] ?? 0;
    if (n === 0) zero++;
    else if (n === 1) one++;
    else multi++;
  }
  const total = joueurs.length || 1;
  return [
    { label: "Aucun stage", count: zero, pct: Math.round((zero / total) * 100) },
    { label: "1 stage", count: one, pct: Math.round((one / total) * 100) },
    { label: "2 stages ou plus", count: multi, pct: Math.round((multi / total) * 100) },
  ];
}
