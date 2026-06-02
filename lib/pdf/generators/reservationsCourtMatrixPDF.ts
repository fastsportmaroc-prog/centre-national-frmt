"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { FRMTPdfEngine } from "@/lib/pdf/pdfEngine";
import { safePdfCell } from "@/lib/pdf/pdf-format";
import { loadPdfLogoBase64 } from "@/lib/pdf/load-pdf-logo";
import { buildReservationsCourtDateMatrix } from "@/lib/v2/reservations-court-matrix";
import {
  TABLE_GROUP_LABELS,
  type TableGroupBy,
  type TableReservationSection,
} from "@/lib/v2/reservations-table-filters";
import type { ReservationEnrichedV2 } from "@/lib/types/v2";
import {
  getCreneauInfoForReservation,
  parseReservationDate,
} from "@/lib/v2/reservations-utils";

function formatDateColHeader(dateKey: string): string {
  const d = parseReservationDate(dateKey);
  return format(d, "EEE d MMM", { locale: fr });
}

function cellLines(items: ReservationEnrichedV2[], hideStageName: boolean): string {
  if (!items.length) return "—";
  return items
    .map((r) => {
      const c = getCreneauInfoForReservation(r);
      const stage = hideStageName ? "" : ` — ${safePdfCell(r.stage_nom).slice(0, 28)}`;
      return `${c.label}${stage}`;
    })
    .join(" | ");
}

export async function generateReservationsCourtMatrixPDF(
  sections: TableReservationSection[],
  options?: { subtitle?: string; groupBy?: TableGroupBy }
): Promise<void> {
  const logo = await loadPdfLogoBase64();
  const moisLabel = format(new Date(), "MMMM", { locale: fr });
  const annee = new Date().getFullYear();
  const groupBy = options?.groupBy ?? "all";
  const groupLabel = TABLE_GROUP_LABELS[groupBy];

  const totalRows = sections.reduce((n, s) => n + s.rows.length, 0);
  const engine = new FRMTPdfEngine("Réservations — tableau par court", "landscape");

  engine.drawHeader({
    documentType: "PLANNING TERRAINS (GRILLE)",
    stageName: options?.subtitle?.slice(0, 90) || `${moisLabel} ${annee}`,
    subtitle: groupBy !== "all" ? `Regroupement : ${groupLabel}` : undefined,
    date: `Généré le ${format(new Date(), "d MMMM yyyy", { locale: fr })}`,
    logoBase64: logo,
  });

  engine.kpiRow([
    { label: "Réservations", value: String(totalRows), color: "#2B6CB0" },
    { label: "Sections", value: String(sections.length), color: "#276749" },
  ]);

  const hideStageInCell = groupBy === "stage";

  for (const section of sections) {
    const matrix = buildReservationsCourtDateMatrix(section.rows);
    if (matrix.dates.length === 0 || matrix.courts.length === 0) continue;

    const sectionTitle =
      sections.length > 1 || groupBy !== "all"
        ? section.label
        : "Grille courts × dates";

    engine.sectionTitle(sectionTitle);

    const maxDateCols = 14;
    const dateChunks: string[][] = [];
    for (let i = 0; i < matrix.dates.length; i += maxDateCols) {
      dateChunks.push(matrix.dates.slice(i, i + maxDateCols));
    }

    for (let chunkIdx = 0; chunkIdx < dateChunks.length; chunkIdx++) {
      const dates = dateChunks[chunkIdx]!;
      if (dateChunks.length > 1) {
        engine.paragraph(
          `Dates ${chunkIdx + 1}/${dateChunks.length} : ${formatDateColHeader(dates[0]!)} → ${formatDateColHeader(dates[dates.length - 1]!)}`
        );
      }

      const chunkHeaders = ["Court", ...dates.map((d) => formatDateColHeader(d))];
      const courtColW = 36;
      const dateColW = Math.max(14, (277 - courtColW) / dates.length);

      const tableRows = matrix.courts.map((court) => {
        const cells = dates.map((dateKey) =>
          cellLines(matrix.getCell(court.id, dateKey), hideStageInCell)
        );
        return [court.nom + (court.surface ? ` (${court.surface})` : ""), ...cells];
      });

      engine.table({
        headers: chunkHeaders,
        colWidths: [courtColW, ...dates.map(() => dateColW)],
        rows: tableRows,
      });
    }
  }

  if (sections.every((s) => buildReservationsCourtDateMatrix(s.rows).courts.length === 0)) {
    engine.paragraph("Aucune réservation à afficher pour ces filtres.");
  }

  const suffix = groupBy !== "all" ? `_${groupLabel.replace(/\s+/g, "_")}` : "";
  engine.save(`Reservations_tableau${suffix}_${moisLabel}_${annee}.pdf`);
}
