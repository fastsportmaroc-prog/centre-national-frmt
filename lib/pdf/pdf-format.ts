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

function parsePdfDate(iso: string | Date | null | undefined): Date | null {
  if (!iso) return null;
  const d =
    typeof iso === "string" ? parseISO(iso.includes("T") ? iso : `${iso.slice(0, 10)}T12:00:00`) : iso;
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Date : 11 mai 2026 (affichage PDF / documents). */
export function formatDateFR(iso: string | Date | null | undefined): string {
  const d = parsePdfDate(iso);
  if (!d) return iso ? String(iso) : "—";
  return format(d, "d MMMM yyyy", { locale: fr });
}

/** Alias explicite pour exports PDF stage. */
export const formatDateFRPro = formatDateFR;

/**
 * Période sans caractères Unicode (flèches) — compatible police Helvetica jsPDF.
 * Ex. « Du 11 au 16 mai 2026 »
 */
export function formatPeriodePdf(debut: string, fin: string): string {
  const d0 = parsePdfDate(debut);
  const d1 = parsePdfDate(fin);
  if (!d0) return "—";
  if (!d1 || format(d0, "yyyy-MM-dd") === format(d1, "yyyy-MM-dd")) {
    return format(d0, "d MMMM yyyy", { locale: fr });
  }
  if (format(d0, "yyyy-MM") === format(d1, "yyyy-MM")) {
    return `Du ${format(d0, "d", { locale: fr })} au ${format(d1, "d MMMM yyyy", { locale: fr })}`;
  }
  if (format(d0, "yyyy") === format(d1, "yyyy")) {
    return `Du ${format(d0, "d MMMM", { locale: fr })} au ${format(d1, "d MMMM yyyy", { locale: fr })}`;
  }
  return `Du ${format(d0, "d MMMM yyyy", { locale: fr })} au ${format(d1, "d MMMM yyyy", { locale: fr })}`;
}

/** Sous-titre fiche stage (séparateurs ASCII). */
export function formatStagePdfSubtitle(
  debut: string,
  fin: string,
  jours: number,
  categorie: string
): string {
  const j = jours > 1 ? "jours" : "jour";
  return `${formatPeriodePdf(debut, fin)} | ${jours} ${j} | ${categorie}`;
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
