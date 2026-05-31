import { differenceInYears, format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

/** Montant : 1 234,56 EUR */
export function formatMoneyEUR(value: number): string {
  const n = Number.isFinite(value) ? value : 0;
  return (
    n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " EUR"
  );
}

export function formatMoneyMAD(value: number): string {
  const n = Number.isFinite(value) ? value : 0;
  return (
    n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " MAD"
  );
}

/** Date : 10 juin 2026 */
export function formatDateFR(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? parseISO(iso.includes("T") ? iso : `${iso}T12:00:00`) : iso;
  if (Number.isNaN(d.getTime())) return String(iso);
  return format(d, "d MMMM yyyy", { locale: fr });
}

export function formatDateTimeFR(iso: string): string {
  const d = parseISO(iso.includes("T") ? iso : `${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return format(d, "d MMMM yyyy", { locale: fr });
}

export function todayRabatLine(): string {
  return `Le ${format(new Date(), "d MMMM yyyy", { locale: fr })}`;
}

/** BUDGET_STAGE-U16_2026-06-02.pdf */
export function buildPdfFilename(rubrique: string, stageOrLabel?: string, dateIso?: string): string {
  const slug = (stageOrLabel ?? "export")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)
    .toUpperCase();
  const d = dateIso ? dateIso.slice(0, 10) : format(new Date(), "yyyy-MM-dd");
  return `${rubrique}_${slug}_${d}.pdf`;
}

export function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

export function formatMontant(n: number, devise = "EUR"): string {
  return (
    new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n) +
    " " +
    devise
  );
}

const CRENEAU_LABELS: Record<string, string> = {
  matin: "Matin (09:00-13:00)",
  apres_midi: "Après-midi (14:00-18:00)",
  journee: "Journée (09:00-18:00)",
};

export function formatCreneauPdf(c: string): string {
  return CRENEAU_LABELS[c] ?? c;
}

const STATUT_LABELS: Record<string, string> = {
  prevu: "Prévu",
  confirme: "Confirmé",
  en_cours: "En cours",
  termine: "Terminé",
  annule: "Annulé",
  annulee: "Annulé",
};

export function formatStatutPdf(s: string): string {
  return STATUT_LABELS[s] ?? s;
}

export function safePdfCell(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

export function ageFromBirthdate(dateNaissance: string): string {
  try {
    const d = parseISO(
      dateNaissance.includes("T") ? dateNaissance : `${dateNaissance}T12:00:00`
    );
    if (Number.isNaN(d.getTime())) return "—";
    return String(differenceInYears(new Date(), d));
  } catch {
    return "—";
  }
}
