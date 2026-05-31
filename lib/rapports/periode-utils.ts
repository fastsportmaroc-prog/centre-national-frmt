import type { RapportPeriode, RapportType } from "@/lib/rapports/types";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function startOfWeekMonday(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

function endOfWeekSunday(d: Date): Date {
  const start = startOfWeekMonday(d);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end;
}

export function resolveReportPeriode(
  type: RapportType,
  periodeDebut: string,
  periodeFin: string
): RapportPeriode | undefined {
  const now = new Date();

  if (type === "mensuel") {
    const anchor = periodeDebut ? new Date(periodeDebut) : now;
    const debut = startOfMonth(anchor);
    const fin = endOfMonth(anchor);
    return {
      debut: toIsoDate(debut),
      fin: toIsoDate(fin),
      label: debut.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
    };
  }

  if (type === "annuel") {
    const year = periodeDebut ? new Date(periodeDebut).getFullYear() : now.getFullYear();
    return {
      debut: `${year}-01-01`,
      fin: `${year}-12-31`,
      label: String(year),
    };
  }

  if (type === "hebdomadaire") {
    const anchor = periodeDebut ? new Date(periodeDebut) : now;
    const debut = startOfWeekMonday(anchor);
    const fin = endOfWeekSunday(anchor);
    const label = `${debut.toLocaleDateString("fr-FR")} → ${fin.toLocaleDateString("fr-FR")}`;
    return {
      debut: toIsoDate(debut),
      fin: toIsoDate(fin),
      label,
    };
  }

  if (periodeDebut && periodeFin) {
    return {
      debut: periodeDebut,
      fin: periodeFin,
      label: `${new Date(periodeDebut).toLocaleDateString("fr-FR")} → ${new Date(periodeFin).toLocaleDateString("fr-FR")}`,
    };
  }

  return undefined;
}
