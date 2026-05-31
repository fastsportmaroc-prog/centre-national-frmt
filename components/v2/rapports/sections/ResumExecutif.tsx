"use client";

import { Card } from "@/components/ui/Card";
import { SimpleKpiGrid } from "@/components/v2/rapports/charts/SimpleCharts";
import type { RapportEntityData } from "@/lib/rapports/types";
import { SECTION_LABELS } from "@/lib/rapports/types";

export function ResumExecutif({ data }: { data: RapportEntityData }) {
  return (
    <Card className="space-y-4 p-4" id="section-resume">
      <h2 className="text-lg font-semibold text-frmt-gold">{SECTION_LABELS.resume_executif}</h2>
      <SimpleKpiGrid items={data.kpis} />
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <p><span className="text-muted">Lieu :</span> {data.lieu}</p>
        <p><span className="text-muted">Catégorie :</span> {data.categorie}</p>
        <p><span className="text-muted">Dates :</span> {data.date_debut} → {data.date_fin}</p>
        <p><span className="text-muted">Statut :</span> {data.statut.replace(/_/g, " ")}</p>
        {data.kind === "stage" && data.responsable && (
          <p><span className="text-muted">Responsable :</span> {data.responsable}</p>
        )}
      </div>
      {data.observations && (
        <p className="rounded-md bg-[var(--bg-muted)]/40 p-3 text-sm">{data.observations}</p>
      )}
    </Card>
  );
}
