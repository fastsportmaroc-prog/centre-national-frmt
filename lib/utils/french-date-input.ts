import { format, isValid, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

/** Affiche une date ISO (yyyy-MM-dd) en jj/mm/aaaa. */
export function isoToFrenchDisplay(iso?: string | null): string {
  if (!iso?.trim()) return "";
  const normalized = parseFrenchDateInput(iso) ?? iso.slice(0, 10);
  const d = parseISO(normalized);
  if (!isValid(d)) return "";
  return format(d, "dd/MM/yyyy", { locale: fr });
}

/**
 * Parse une saisie utilisateur → ISO yyyy-MM-dd.
 * Accepte : jj/mm/aaaa, j/m/aaaa, jj-mm-aaaa, yyyy-MM-dd.
 */
export function parseFrenchDateInput(input: string): string | null {
  const t = input.trim();
  if (!t) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    const d = parseISO(t);
    return isValid(d) ? t : null;
  }

  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t);
  if (!m) return null;

  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return null;
  }

  return format(d, "yyyy-MM-dd");
}

/** Masque de saisie progressive : 31122026 → 31/12/2026 */
export function maskFrenchDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function normalizeFilterIsoDate(value?: string | null): string | undefined {
  if (!value?.trim()) return undefined;
  return parseFrenchDateInput(value) ?? undefined;
}
