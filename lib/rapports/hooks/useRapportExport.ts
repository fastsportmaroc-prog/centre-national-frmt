"use client";

import { useCallback, useState } from "react";
import { buildReportFromEntity } from "@/lib/rapports/rapport-service";
import { exportRapportPdf } from "@/lib/rapports/rapport-pdf";
import type { StoredReportV2 } from "@/lib/v2/reports-storage";

export function useRapportExport() {
  const [exporting, setExporting] = useState(false);

  const exportPdf = useCallback(async (report: StoredReportV2) => {
    setExporting(true);
    try {
      const data = await buildReportFromEntity(report);
      if (!data) {
        throw new Error("Données du rapport indisponibles");
      }
      await exportRapportPdf(report, data, "download");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Export impossible";
      throw new Error(message);
    } finally {
      setExporting(false);
    }
  }, []);

  return { exportPdf, exporting };
}
