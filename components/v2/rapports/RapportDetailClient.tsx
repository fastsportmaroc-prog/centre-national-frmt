"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileDown } from "lucide-react";
import { V2PageHeader } from "@/components/v2/V2PageHeader";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/v2/ui/StatusBadge";
import { useToast } from "@/components/v2/ui/ToastProvider";
import { buildReportFromEntity } from "@/lib/rapports/rapport-service";
import { useRapportExport } from "@/lib/rapports/hooks/useRapportExport";
import type { RapportEntityData } from "@/lib/rapports/types";
import { RAPPORT_TYPE_LABELS } from "@/lib/rapports/types";
import { getReportLocal, type StoredReportV2 } from "@/lib/v2/reports-storage";
import { ResumExecutif } from "@/components/v2/rapports/sections/ResumExecutif";
import { SectionParticipants } from "@/components/v2/rapports/sections/SectionParticipants";
import { SectionRestauration } from "@/components/v2/rapports/sections/SectionRestauration";
import { SectionHebergement } from "@/components/v2/rapports/sections/SectionHebergement";
import { SectionTerrains } from "@/components/v2/rapports/sections/SectionTerrains";
import { SectionKinesitherapie } from "@/components/v2/rapports/sections/SectionKinesitherapie";
import { SectionFinancier } from "@/components/v2/rapports/sections/SectionFinancier";
import { SectionResultats } from "@/components/v2/rapports/sections/SectionResultats";
import { SectionRecommandations } from "@/components/v2/rapports/sections/SectionRecommandations";

export function RapportDetailClient({ reportId }: { reportId: string }) {
  const { toast } = useToast();
  const { exportPdf, exporting } = useRapportExport();
  const [report, setReport] = useState<StoredReportV2 | null>(null);
  const [data, setData] = useState<RapportEntityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const r = getReportLocal(reportId);
    setReport(r);
    if (!r) {
      setLoading(false);
      return;
    }
    void buildReportFromEntity(r).then((d) => {
      setData(d);
      setLoading(false);
    });
  }, [reportId]);

  async function handleExport() {
    if (!report || !data) return;
    try {
      await exportPdf(report);
      toast("Fenêtre d'impression ouverte — choisissez « Enregistrer au format PDF »", "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur export PDF";
      toast(msg, "error");
    }
  }

  if (loading) {
    return <main className="p-6 text-muted">Chargement du rapport…</main>;
  }

  if (!report) {
    return (
      <main className="space-y-4 p-6">
        <p>Rapport introuvable.</p>
        <Link href="/v2/rapports">
          <Button variant="secondary">Retour aux rapports</Button>
        </Link>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="space-y-4 p-6">
        <p>Données indisponibles pour ce type de rapport ({RAPPORT_TYPE_LABELS[report.type]}).</p>
        <Link href="/v2/rapports">
          <Button variant="secondary">Retour aux rapports</Button>
        </Link>
      </main>
    );
  }

  const sections = report.sections;

  return (
    <>
      <V2PageHeader
        title={report.titre}
        description={`${RAPPORT_TYPE_LABELS[report.type]} — Généré le ${new Date(report.generated_at).toLocaleDateString("fr-FR")}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge statut={report.statut} />
            <Button variant="secondary" size="sm" disabled={exporting} onClick={() => void handleExport()}>
              <FileDown className="mr-1 h-4 w-4" />
              Export PDF
            </Button>
            <Link href="/v2/rapports">
              <Button variant="secondary" size="sm">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Retour
              </Button>
            </Link>
          </div>
        }
      />
      <main className="space-y-4 p-4 sm:p-6">
        <nav className="flex flex-wrap gap-2 text-xs">
          {sections.resume_executif && (
            <a href="#section-resume" className="rounded-full border border-[var(--border)] px-2 py-1 hover:border-frmt-gold">
              A
            </a>
          )}
          {sections.participants && (
            <a href="#section-participants" className="rounded-full border border-[var(--border)] px-2 py-1 hover:border-frmt-gold">
              B
            </a>
          )}
          {sections.restauration && (
            <a href="#section-restauration" className="rounded-full border border-[var(--border)] px-2 py-1 hover:border-frmt-gold">
              C
            </a>
          )}
          {sections.hebergement && (
            <a href="#section-hebergement" className="rounded-full border border-[var(--border)] px-2 py-1 hover:border-frmt-gold">
              D
            </a>
          )}
          {sections.terrains && (
            <a href="#section-terrains" className="rounded-full border border-[var(--border)] px-2 py-1 hover:border-frmt-gold">
              E
            </a>
          )}
          {sections.kinesitherapie && (
            <a href="#section-kinesitherapie" className="rounded-full border border-[var(--border)] px-2 py-1 hover:border-frmt-gold">
              F
            </a>
          )}
          {sections.financier && (
            <a href="#section-financier" className="rounded-full border border-[var(--border)] px-2 py-1 hover:border-frmt-gold">
              G
            </a>
          )}
          {sections.resultats && (
            <a href="#section-resultats" className="rounded-full border border-[var(--border)] px-2 py-1 hover:border-frmt-gold">
              H
            </a>
          )}
          {sections.recommandations && (
            <a href="#section-recommandations" className="rounded-full border border-[var(--border)] px-2 py-1 hover:border-frmt-gold">
              I
            </a>
          )}
        </nav>

        {sections.resume_executif && <ResumExecutif data={data} />}
        {sections.participants && <SectionParticipants participants={data.participants} />}
        {sections.restauration && <SectionRestauration data={data.restauration} />}
        {sections.hebergement && <SectionHebergement data={data.hebergement} />}
        {sections.terrains && <SectionTerrains data={data.terrains} />}
        {sections.kinesitherapie && <SectionKinesitherapie data={data.kinesitherapie} />}
        {sections.financier && <SectionFinancier data={data.financier} />}
        {sections.resultats && <SectionResultats resultats={data.resultats} />}
        {sections.recommandations && (
          <SectionRecommandations
            recommandations={data.recommandations ?? report.recommandations}
          />
        )}
      </main>
    </>
  );
}
