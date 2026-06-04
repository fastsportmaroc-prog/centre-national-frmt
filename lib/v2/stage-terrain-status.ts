import type { TerrainBesoin } from "@/lib/data/terrains";
import {
  parseTerrainsBesoinsFromNotes,
  stripTerrainsBesoinsFromNotes,
} from "@/lib/data/terrains";
import { besoinsSameCourt } from "@/lib/terrain/court-infrastructure";

export { stripTerrainsBesoinsFromNotes };

export function hasTerrainsInNotes(notes: string | null | undefined): boolean {
  const besoins = parseTerrainsBesoinsFromNotes(notes);
  return (besoins?.some((b) => Boolean(b.terrainId)) ?? false);
}

export function hasTerrainsSupplementairesInNotes(notes: string | null | undefined): boolean {
  const besoins = parseTerrainsBesoinsFromNotes(notes);
  if (!besoins?.length) return false;
  const uniq = new Set(besoins.map((b) => b.terrainId).filter(Boolean));
  return uniq.size > 1;
}

/** Terrains configurés : colonne stage, métadonnées notes ou réservations existantes. */
export function stageHasTerrainsConfigured(input: {
  id: string;
  terrains?: boolean;
  notes?: string | null;
  terrainReservationCount?: number;
}): boolean {
  if (input.terrains) return true;
  if (hasTerrainsInNotes(input.notes)) return true;
  if ((input.terrainReservationCount ?? 0) > 0) return true;
  return false;
}

function findBesoinIndex(existing: TerrainBesoin[], besoin: TerrainBesoin): number {
  const byId = existing.findIndex((b) => b.terrainId === besoin.terrainId);
  if (byId >= 0) return byId;
  return existing.findIndex((b) => besoinsSameCourt(b, besoin));
}

export function appendTerrainBesoinToNotes(
  notes: string | null | undefined,
  besoin: TerrainBesoin
): string {
  const existing = parseTerrainsBesoinsFromNotes(notes) ?? [];
  const idx = findBesoinIndex(existing, besoin);
  const normalized: TerrainBesoin = {
    ...besoin,
    creneaux:
      besoin.creneaux?.length ?
        [...besoin.creneaux]
      : (["journee"] as TerrainBesoin["creneaux"]),
    mode: besoin.mode ?? "stage",
  };
  if (idx >= 0) {
    const prevJours = existing[idx]!.jours ?? [];
    const nextJours = normalized.jours ?? [];
    const mergedJours =
      normalized.mode === "dispatch" ?
        [...new Set([...prevJours, ...nextJours].map((d) => d.slice(0, 10)).filter(Boolean))].sort()
      : nextJours.length ?
        nextJours
      : prevJours;
    existing[idx] = { ...existing[idx], ...normalized, jours: mergedJours.length ? mergedJours : undefined };
  } else existing.push(normalized);
  const stripped = stripTerrainsBesoinsFromNotes(notes);
  const meta = `[TERRAINS_BESOINS:${JSON.stringify(existing)}]`;
  return [stripped, meta].filter(Boolean).join(" ").trim();
}
