"use client";

import { Card } from "@/components/ui/Card";
import type { KinesitherapieReportData } from "@/lib/rapports/types";
import { SECTION_LABELS } from "@/lib/rapports/types";

export function SectionKinesitherapie({ data }: { data: KinesitherapieReportData }) {
  return (
    <Card className="space-y-4 p-4" id="section-kinesitherapie">
      <h2 className="text-lg font-semibold text-frmt-gold">{SECTION_LABELS.kinesitherapie}</h2>
      <div className="grid gap-3 text-sm sm:grid-cols-3">
        <p><span className="text-muted">Séances :</span> {data.seances}</p>
        <p><span className="text-muted">Joueurs suivis :</span> {data.joueurs_suivis}</p>
        <p><span className="text-muted">Blessures :</span> {data.blessures_signalees}</p>
      </div>
      {data.notes && <p className="text-sm text-[var(--text-secondary)]">{data.notes}</p>}
    </Card>
  );
}
