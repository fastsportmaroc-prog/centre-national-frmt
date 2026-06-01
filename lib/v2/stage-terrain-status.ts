import type { TerrainBesoin } from "@/lib/data/terrains";
import {
  parseTerrainsBesoinsFromNotes,
  stripTerrainsBesoinsFromNotes,
} from "@/lib/data/terrains";

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

export function appendTerrainBesoinToNotes(
  notes: string | null | undefined,
  besoin: TerrainBesoin
): string {
  const existing = parseTerrainsBesoinsFromNotes(notes) ?? [];
  const idx = existing.findIndex((b) => b.terrainId === besoin.terrainId);
  const normalized: TerrainBesoin = {
    ...besoin,
    creneaux: besoin.creneaux?.length ? besoin.creneaux : (["journee"] as TerrainBesoin["creneaux"]),
    mode: besoin.mode ?? "stage",
  };
  if (idx >= 0) existing[idx] = { ...existing[idx], ...normalized };
  else existing.push(normalized);
  const stripped = stripTerrainsBesoinsFromNotes(notes);
  const meta = `[TERRAINS_BESOINS:${JSON.stringify(existing)}]`;
  return [stripped, meta].filter(Boolean).join(" ").trim();
}
