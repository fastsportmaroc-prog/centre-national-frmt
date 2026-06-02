"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { FRMTPdfEngine } from "@/lib/pdf/pdfEngine";
import { formatCreneauPdf, formatStatutPdf, safePdfCell } from "@/lib/pdf/pdf-format";
import { loadPdfLogoBase64 } from "@/lib/pdf/load-pdf-logo";
import { formatDateLong, getCreneauInfo, surfaceLabel } from "@/lib/v2/reservations-utils";
import type { ReservationEnrichedV2 } from "@/lib/types/v2";

export async function generateReservationsPDF(
  reservations: ReservationEnrichedV2[],
  subtitle?: string
): Promise<void> {
  const logo = await loadPdfLogoBase64();
  const moisLabel = format(new Date(), "MMMM", { locale: fr });
  const annee = new Date().getFullYear();

  const rows = [...reservations]
    .sort((a, b) => a.date_debut.localeCompare(b.date_debut))
    .map((r) => {
      const c = getCreneauInfo(r.date_debut, r.date_fin, r.creneau);
      const surf = surfaceLabel(r.court_surface);
      const short =
        surf === "Terre battue" ? "TB" : surf === "Dur" ? "D" : surf === "Gazon" ? "G" : "";
      return [
        formatDateLong(r.date_debut.includes("T") ? r.date_debut : `${r.date_debut}T12:00:00`),
        formatCreneauPdf(c.type),
        `${r.court_nom ?? "—"}${short ? ` (${short})` : ""}`,
        surf,
        safePdfCell(r.stage_nom),
        formatStatutPdf(r.statut ?? "prevu"),
      ];
    });

  const engine = new FRMTPdfEngine("Planning des réservations");
  engine.drawHeader({
    documentType: "RÉSERVATIONS INFRASTRUCTURES",
    stageName: subtitle ?? `${moisLabel} ${annee}`,
    date: `Généré le ${format(new Date(), "d MMMM yyyy", { locale: fr })}`,
    logoBase64: logo,
  });

  engine.kpiRow([
    { label: "Réservations", value: String(reservations.length), color: "#2B6CB0" },
  ]);

  engine.sectionTitle("Créneaux réservés");
  engine.table({
    headers: ["Date", "Créneau", "Infrastructure", "Surface", "Stage", "Statut"],
    colWidths: [32, 28, 42, 22, 38, 20],
    statusColIndex: 5,
    rows: rows.length ? rows : [["—", "—", "—", "—", "—", "—"]],
  });

  engine.save(`Reservations_${moisLabel}_${annee}.pdf`);
}
