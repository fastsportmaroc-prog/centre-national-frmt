"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { V2PageHeader } from "@/components/v2/V2PageHeader";
import { V2PageActions } from "@/components/v2/V2PageActions";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/v2/ui/ConfirmDialog";
import { useToast } from "@/components/v2/ui/ToastProvider";
import { RapportFilters } from "@/components/v2/rapports/RapportFilters";
import { RapportTable } from "@/components/v2/rapports/RapportTable";
import { RapportGenerateurModal } from "@/components/v2/rapports/RapportGenerateurModal";
import { useRapportFilters } from "@/lib/rapports/hooks/useRapportFilters";
import { useRapportGenerator } from "@/lib/rapports/hooks/useRapportGenerator";
import { useRapportExport } from "@/lib/rapports/hooks/useRapportExport";
import type { RapportType } from "@/lib/rapports/types";
import {
  deleteReportLocal,
  listReportsLocal,
  type StoredReportV2,
} from "@/lib/v2/reports-storage";

type ReportTab = "bilans" | "hebdo" | "mensuels" | "annuels" | "competitions";

const TAB_CONFIG: { id: ReportTab; label: string; types: RapportType[] }[] = [
  { id: "bilans", label: "Bilans Stages", types: ["bilan_stage"] },
  { id: "hebdo", label: "Hebdomadaires", types: ["hebdomadaire"] },
  { id: "mensuels", label: "Mensuels", types: ["mensuel"] },
  { id: "annuels", label: "Annuels", types: ["annuel"] },
  { id: "competitions", label: "Compétitions", types: ["competition"] },
];

export function RapportsV2Client() {
  const router = useRouter();
  const { toast } = useToast();
  const [tab, setTab] = useState<ReportTab>("bilans");
  const [reports, setReports] = useState<StoredReportV2[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const activeTab = TAB_CONFIG.find((t) => t.id === tab)!;
  const { filters, setFilters, filtered, resetFilters } = useRapportFilters(reports, activeTab.types);
  const generator = useRapportGenerator((report) => {
    setReports(listReportsLocal());
    router.push(`/v2/rapports/${report.id}`);
    toast("Rapport généré", "success");
  });
  const { exportPdf, exporting } = useRapportExport();

  const load = useCallback(() => {
    setReports(listReportsLocal());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleExport(report: StoredReportV2) {
    try {
      await exportPdf(report);
      toast("Fenêtre d'impression ouverte — choisissez « Enregistrer au format PDF »", "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur export PDF";
      toast(msg, "error");
    }
  }

  return (
    <>
      <V2PageHeader
        title="Rapports"
        description="Bilans stages, rapports périodiques et compétitions"
        actions={
          <V2PageActions addLabel="Nouveau rapport" onAdd={generator.openModal} />
        }
      />
      <main className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap gap-2">
          {TAB_CONFIG.map(({ id, label }) => (
            <Button
              key={id}
              variant={tab === id ? "primary" : "secondary"}
              size="sm"
              onClick={() => setTab(id)}
            >
              {label}
            </Button>
          ))}
        </div>

        <RapportFilters
          filters={filters}
          onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
          onReset={resetFilters}
        />

        <RapportTable
          reports={filtered}
          onDelete={setDeleteId}
          onExport={(r) => void handleExport(r)}
          exporting={exporting}
        />
      </main>

      <RapportGenerateurModal generator={generator} onGenerated={() => load()} />

      <ConfirmDialog
        open={!!deleteId}
        title="Supprimer ce rapport ?"
        description="Cette action est irréversible."
        confirmLabel="Supprimer définitivement"
        onConfirm={() => {
          if (deleteId) deleteReportLocal(deleteId);
          load();
          setDeleteId(null);
          toast("Rapport supprimé");
        }}
        onCancel={() => setDeleteId(null)}
      />
    </>
  );
}
