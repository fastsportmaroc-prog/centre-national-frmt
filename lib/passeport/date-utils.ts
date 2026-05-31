/** Normalise une date pour `<input type="date">` (AAAA-MM-JJ). */
export function normalizeDateForInput(value: string | null | undefined): string {
  if (!value?.trim()) return "";
  const v = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  const d = new Date(v);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return "";
}

export function formatDateFr(iso: string | null | undefined): string {
  const n = normalizeDateForInput(iso);
  if (!n) return "—";
  const [y, m, d] = n.split("-");
  return `${d}/${m}/${y}`;
}
