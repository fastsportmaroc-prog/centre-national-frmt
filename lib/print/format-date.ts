/** Dates lisibles pour impressions officielles (fr-MA, mois en toutes lettres). */

export function formatDatePrint(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "—";
  const d = typeof dateStr === "string" ? new Date(dateStr.includes("T") ? dateStr : `${dateStr}T12:00:00`) : dateStr;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-MA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function formatPeriodePrint(debut: string | null | undefined, fin: string | null | undefined): string {
  if (!debut) return "—";
  if (!fin || debut.slice(0, 10) === fin.slice(0, 10)) return formatDatePrint(debut);
  return `${formatDatePrint(debut)} → ${formatDatePrint(fin)}`;
}

export function formatTimePrint(date = new Date()): string {
  return date.toLocaleTimeString("fr-MA", { hour: "2-digit", minute: "2-digit" });
}

/** Date de génération document (sans heure, libellés en majuscules). */
export function formatGeneratedDatePrint(date: Date | string = new Date()): string {
  const iso = typeof date === "string" ? date : date.toISOString();
  const label = formatDatePrint(iso);
  return label === "—" ? label : label.toLocaleUpperCase("fr-FR");
}

export function formatDateTimePrint(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "—";
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  if (Number.isNaN(d.getTime())) return "—";
  return `${formatDatePrint(d)} à ${formatTimePrint(d)}`;
}
