import { addMonths, parseISO } from "date-fns";
import type { VisaEntry } from "@/lib/types/passeport";

export type PasseportAlerteNiveau = "valide" | "attention" | "expire" | "inconnu";

export type VisaStatutAffiche = "non_requis" | "en_cours" | "obtenu" | "refuse" | "inconnu";

export function evaluatePasseportForCompetition(
  dateExpiration: string | null | undefined,
  dateFinCompetition: string
): PasseportAlerteNiveau {
  if (!dateExpiration?.trim()) return "inconnu";
  const exp = dateExpiration.slice(0, 10);
  const fin = dateFinCompetition.slice(0, 10);
  if (exp < fin) return "expire";
  const limite = addMonths(parseISO(fin), 6).toISOString().slice(0, 10);
  if (exp < limite) return "attention";
  return "valide";
}

export function evaluateVisaForCompetition(
  visas: VisaEntry[] | null | undefined,
  dateFinCompetition: string,
  nationalite?: string | null,
  options?: { visasRequis?: boolean }
): VisaStatutAffiche {
  if (!options?.visasRequis) return "non_requis";
  const nat = (nationalite ?? "").toLowerCase();
  if (nat.includes("maroc") || nat === "ma") return "non_requis";
  if (!visas?.length) return "inconnu";
  const fin = dateFinCompetition.slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  let hasRefused = false;
  let hasValid = false;
  let hasPending = false;
  for (const v of visas) {
    const notes = (v.notes ?? "").toLowerCase();
    if (notes.includes("refus")) {
      hasRefused = true;
      continue;
    }
    if (v.date_fin && v.date_fin.slice(0, 10) >= fin) {
      hasValid = true;
    } else if (!v.date_fin || v.date_fin.slice(0, 10) >= today) {
      hasPending = true;
    }
  }
  if (hasRefused) return "refuse";
  if (hasValid) return "obtenu";
  if (hasPending) return "en_cours";
  return "inconnu";
}

export function passeportAlerteLabel(n: PasseportAlerteNiveau): string {
  switch (n) {
    case "valide":
      return "Valide";
    case "attention":
      return "Attention";
    case "expire":
      return "Expiré / Insuffisant";
    default:
      return "Non renseigné";
  }
}

export function visaStatutLabel(s: VisaStatutAffiche): string {
  switch (s) {
    case "non_requis":
      return "Non requis";
    case "en_cours":
      return "En cours";
    case "obtenu":
      return "Obtenu";
    case "refuse":
      return "Refusé";
    default:
      return "À vérifier";
  }
}
