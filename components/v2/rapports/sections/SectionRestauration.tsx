"use client";

import { Card } from "@/components/ui/Card";
import { SimpleBarChart } from "@/components/v2/rapports/charts/SimpleCharts";
import type { RestaurationReportData } from "@/lib/rapports/types";
import { SECTION_LABELS } from "@/lib/rapports/types";

export function SectionRestauration({ data }: { data: RestaurationReportData }) {
  return (
    <Card className="space-y-4 p-4" id="section-restauration">
      <h2 className="text-lg font-semibold text-frmt-gold">{SECTION_LABELS.restauration}</h2>
      <p className="text-sm text-[var(--text-secondary)]">
        {data.date_debut} → {data.date_fin} — {data.total_repas} repas au total
      </p>
      <SimpleBarChart
        items={[
          { label: "Petits-déjeuners", value: data.pdj },
          { label: "Déjeuners", value: data.dej },
          { label: "Dîners", value: data.diner },
        ]}
      />
      <p className="text-sm font-semibold">
        Montant : {data.montant_mad.toLocaleString("fr-FR")} MAD
      </p>
    </Card>
  );
}
