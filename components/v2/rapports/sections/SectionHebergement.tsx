"use client";

import { Card } from "@/components/ui/Card";
import type { HebergementReportData } from "@/lib/rapports/types";
import { SECTION_LABELS } from "@/lib/rapports/types";

export function SectionHebergement({ data }: { data: HebergementReportData }) {
  return (
    <Card className="space-y-4 p-4" id="section-hebergement">
      <h2 className="text-lg font-semibold text-frmt-gold">{SECTION_LABELS.hebergement}</h2>
      <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-[var(--border)] p-3">
          <p className="text-xs text-muted">Nuits</p>
          <p className="text-xl font-bold">{data.nuits}</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] p-3">
          <p className="text-xs text-muted">Ch. joueurs</p>
          <p className="text-xl font-bold">{data.chambres_joueurs}</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] p-3">
          <p className="text-xs text-muted">Ch. coaches</p>
          <p className="text-xl font-bold">{data.chambres_coachs}</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] p-3">
          <p className="text-xs text-muted">Occupation</p>
          <p className="text-xl font-bold">{data.taux_occupation_pct}%</p>
        </div>
      </div>
      <p className="text-sm font-semibold">
        Montant : {data.montant_mad.toLocaleString("fr-FR")} MAD
      </p>
    </Card>
  );
}
