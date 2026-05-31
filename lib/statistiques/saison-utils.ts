import type { SaisonOption } from "@/lib/statistiques/types";

/** Saison sportive FRMT : septembre → août */
export function saisonToDateRange(saison: SaisonOption): { debut: string; fin: string } {
  const [startYear] = saison.split("-").map(Number);
  return {
    debut: `${startYear}-09-01`,
    fin: `${startYear + 1}-08-31`,
  };
}

export function previousSaison(saison: SaisonOption): SaisonOption {
  const map: Record<SaisonOption, SaisonOption> = {
    "2025-2026": "2024-2025",
    "2024-2025": "2023-2024",
    "2023-2024": "2023-2024",
  };
  return map[saison];
}

export function formatMonthLabel(isoMonth: string): string {
  const [y, m] = isoMonth.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
}

export function countDaysInclusive(debut: string, fin: string): number {
  if (!debut || !fin) return 0;
  const a = new Date(debut);
  const b = new Date(fin);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000) + 1);
}

export function overlapsRange(
  itemDebut: string,
  itemFin: string,
  rangeDebut: string,
  rangeFin: string
): boolean {
  return itemDebut <= rangeFin && itemFin >= rangeDebut;
}
