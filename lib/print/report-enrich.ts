import type { ReportMeta, ReportKpi } from "@/lib/export/reports";
import { formatGeneratedDatePrint } from "@/lib/print/format-date";

export function enrichReportMeta(meta: ReportMeta): ReportMeta {
  const rowCount = meta.lignes.length;
  const metaRows =
    meta.metaRows ??
    ([
      [
        { label: "Période / contexte", value: meta.periodeLabel ?? meta.sousTitre ?? meta.filtres ?? "—" },
        { label: "Enregistrements", value: String(rowCount) },
      ],
      meta.filtres
        ? [
            { label: "Filtres appliqués", value: meta.filtres },
            { label: "Généré le", value: formatGeneratedDatePrint() },
          ]
        : [
            { label: "Généré le", value: formatGeneratedDatePrint() },
            { label: "Type", value: meta.titre },
          ],
    ] as { label: string; value: string }[][]);

  const kpis: ReportKpi[] =
    meta.kpis ??
    (rowCount > 0
      ? [
          { label: "Enregistrements", value: String(rowCount), sub: "lignes au rapport" },
          { label: "Colonnes", value: String(meta.colonnes.length), sub: "champs exportés" },
          {
            label: "Période",
            value: meta.periodeLabel?.slice(0, 12) ?? "—",
            sub: meta.periodeLabel && meta.periodeLabel.length > 12 ? meta.periodeLabel : undefined,
          },
          { label: "Référence", value: meta.reference ?? "—", sub: "document" },
        ]
      : [
          { label: "Enregistrements", value: "0", sub: "aucune donnée" },
          { label: "Colonnes", value: String(meta.colonnes.length), sub: "structure" },
          { label: "Période", value: "—", sub: "non définie" },
          { label: "Référence", value: meta.reference ?? "—", sub: "document" },
        ]);

  const { observations: _omit, ...rest } = meta;

  return {
    ...rest,
    metaRows,
    kpis,
    reference: meta.reference ?? `CNF-${new Date().getFullYear()}`,
  };
}
