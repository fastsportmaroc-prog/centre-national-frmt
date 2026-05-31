"use client";

import { Card } from "@/components/ui/Card";
import type { TerrainsReportData } from "@/lib/rapports/types";
import { SECTION_LABELS } from "@/lib/rapports/types";

export function SectionTerrains({ data }: { data: TerrainsReportData }) {
  return (
    <Card className="space-y-4 p-4" id="section-terrains">
      <h2 className="text-lg font-semibold text-frmt-gold">{SECTION_LABELS.terrains}</h2>
      <div className="grid gap-3 text-sm sm:grid-cols-3">
        <p><span className="text-muted">Séances :</span> {data.seances}</p>
        <p><span className="text-muted">Heures :</span> {data.heures} h</p>
        <p><span className="text-muted">Montant :</span> {data.montant_mad.toLocaleString("fr-FR")} MAD</p>
      </div>
      {data.terrains_utilises.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {data.terrains_utilises.map((t) => (
            <li
              key={t}
              className="rounded-full border border-frmt-green/40 bg-frmt-green/10 px-3 py-1 text-xs"
            >
              {t}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
