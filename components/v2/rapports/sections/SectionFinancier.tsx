"use client";

import { Card } from "@/components/ui/Card";
import { SimpleBarChart, SimplePieChart } from "@/components/v2/rapports/charts/SimpleCharts";
import type { FinancierReportData } from "@/lib/rapports/types";
import { SECTION_LABELS } from "@/lib/rapports/types";

export function SectionFinancier({ data }: { data: FinancierReportData }) {
  return (
    <Card className="space-y-6 p-4" id="section-financier">
      <h2 className="text-lg font-semibold text-frmt-gold">{SECTION_LABELS.financier}</h2>
      <p className="text-2xl font-bold text-frmt-gold">
        Total : {data.montant_total.toLocaleString("fr-FR")} MAD
      </p>
      <div className="grid gap-6 lg:grid-cols-2">
        <SimplePieChart
          items={data.repartition.map((r) => ({ label: r.label, value: r.montant }))}
        />
        <SimpleBarChart
          items={data.repartition.map((r) => ({ label: r.label, value: r.montant }))}
          formatValue={(v) => `${v.toLocaleString("fr-FR")} MAD`}
        />
      </div>
    </Card>
  );
}
