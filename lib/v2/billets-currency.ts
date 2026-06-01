import { DEFAULT_TAUX_EUR_MAD } from "@/lib/v2/budget-voyage";
import { getTarifsTransport } from "@/lib/v2/settings-store";

export function billetTauxEurMad(): number {
  if (typeof window !== "undefined") {
    return getTarifsTransport().taux_eur_mad || DEFAULT_TAUX_EUR_MAD;
  }
  return DEFAULT_TAUX_EUR_MAD;
}

/** Montant stocké → MAD (conversion si anciennes lignes en EUR). */
export function billetPrixEnMad(prix: number, devise?: string | null): number {
  const n = Number(prix);
  if (!Number.isFinite(n)) return 0;
  const d = String(devise ?? "MAD")
    .trim()
    .toUpperCase();
  if (d === "EUR" || d === "€") return n * billetTauxEurMad();
  return n;
}

export function formatBilletMontantMad(prix: number, devise?: string | null): string {
  const mad = billetPrixEnMad(prix, devise);
  return `${mad.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} MAD`;
}
