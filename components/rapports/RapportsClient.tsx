"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { exportCsv, exportPdfReport, openPrintReport } from "@/lib/export/reports";
import {
  reportBilletsAvion,
  reportDemandesLogistique,
  reportListeJoueurs,
  reportOccupationCourts,
  reportReservationsCourts,
} from "@/lib/reports/generators";
import { logHistorique } from "@/lib/audit/historique";
import { FileDown, FileSpreadsheet, Printer } from "lucide-react";

type ReportKey =
  | "joueurs"
  | "reservations"
  | "courts"
  | "logistique"
  | "billets";

const REPORTS: {
  key: ReportKey;
  label: string;
  description: string;
  filename: string;
  load: () => ReturnType<typeof reportListeJoueurs>;
}[] = [
  {
    key: "joueurs",
    label: "Liste des joueurs",
    description: "Effectif complet avec groupes et statuts",
    filename: "joueurs",
    load: reportListeJoueurs,
  },
  {
    key: "reservations",
    label: "Réservations par court",
    description: "Planning des créneaux réservés",
    filename: "reservations-courts",
    load: reportReservationsCourts,
  },
  {
    key: "courts",
    label: "Occupation des courts",
    description: "Taux d'occupation et maintenance",
    filename: "occupation-courts",
    load: reportOccupationCourts,
  },
  {
    key: "logistique",
    label: "Demandes logistiques",
    description: "Workflow direction et service logistique",
    filename: "demandes-logistique",
    load: reportDemandesLogistique,
  },
  {
    key: "billets",
    label: "Billets d'avion",
    description: "Demandes de vol et statuts",
    filename: "billets-avion",
    load: reportBilletsAvion,
  },
];

export function RapportsClient() {
  const [loading, setLoading] = useState<ReportKey | null>(null);

  async function auditExport(key: ReportKey, format: string) {
    await logHistorique({
      action: "export",
      module: "rapports",
      entite_id: key,
      entite_label: REPORTS.find((r) => r.key === key)?.label ?? key,
      ancienne_valeur: null,
      nouvelle_valeur: format,
      commentaire: null,
    });
  }

  async function handlePrint(key: ReportKey) {
    setLoading(key);
    try {
      const meta = await REPORTS.find((r) => r.key === key)!.load();
      await openPrintReport(meta);
      await auditExport(key, "impression");
    } finally {
      setLoading(null);
    }
  }

  async function handlePdf(key: ReportKey) {
    setLoading(key);
    try {
      const r = REPORTS.find((x) => x.key === key)!;
      const meta = await r.load();
      await exportPdfReport(`${r.filename}.pdf`, meta);
      await auditExport(key, "PDF");
    } finally {
      setLoading(null);
    }
  }

  async function handleExcel(key: ReportKey) {
    setLoading(key);
    try {
      const r = REPORTS.find((x) => x.key === key)!;
      const meta = await r.load();
      exportCsv(`${r.filename}.csv`, meta.colonnes, meta.lignes);
      await auditExport(key, "Excel");
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Rapports"
        description="Export PDF, Excel et impression des données du centre"
      />
      <main className="flex-1 space-y-4 p-4 sm:p-6">
        <div className="grid gap-4 md:grid-cols-2">
          {REPORTS.map((r) => (
            <Card key={r.key}>
              <h3 className="font-semibold">{r.label}</h3>
              <p className="mt-1 text-sm text-muted">{r.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={loading === r.key}
                  onClick={() => handlePrint(r.key)}
                >
                  <Printer className="h-4 w-4" />
                  Imprimer
                </Button>
                <Button
                  size="sm"
                  disabled={loading === r.key}
                  onClick={() => handlePdf(r.key)}
                >
                  <FileDown className="h-4 w-4" />
                  PDF
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={loading === r.key}
                  onClick={() => handleExcel(r.key)}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </>
  );
}
