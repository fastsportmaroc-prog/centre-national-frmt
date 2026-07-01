import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

export function formatDeplacementsFilename(dateDebut: string, dateFin: string): string {
  const gen = format(new Date(), "yyyyMMdd");
  const d0 = parseISO(dateDebut.slice(0, 10));
  const d1 = parseISO(dateFin.slice(0, 10));
  const sameMonth = format(d0, "yyyy-MM") === format(d1, "yyyy-MM");
  const periode = sameMonth
    ? format(d0, "MMMM-yyyy", { locale: fr })
    : `${format(d0, "yyyyMMdd")}-${format(d1, "yyyyMMdd")}`;
  return `FRMT_Deplacements_${periode}_${gen}.pdf`.replace(/\s/g, "-");
}

/** @deprecated */
export function formatPdfFilename(
  _typePdf: string,
  dateDebut: string,
  dateFin: string
): string {
  return formatDeplacementsFilename(dateDebut, dateFin);
}

export function truncateText(doc: { getTextWidth: (t: string) => number }, text: string, maxW: number): string {
  if (doc.getTextWidth(text) <= maxW) return text;
  let t = text;
  while (t.length > 1 && doc.getTextWidth(`${t}…`) > maxW) t = t.slice(0, -1);
  return `${t}…`;
}
