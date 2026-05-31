"use client";

import { Card } from "@/components/ui/Card";
import { SECTION_LABELS } from "@/lib/rapports/types";

type Props = {
  observations?: string;
  recommandations?: string;
};

export function SectionRecommandations({ observations, recommandations }: Props) {
  return (
    <Card className="space-y-4 p-4" id="section-recommandations">
      <h2 className="text-lg font-semibold text-frmt-gold">{SECTION_LABELS.recommandations}</h2>
      {observations && (
        <div>
          <h3 className="mb-1 text-sm font-medium text-muted">Observations</h3>
          <p className="text-sm">{observations}</p>
        </div>
      )}
      {recommandations && (
        <div>
          <h3 className="mb-1 text-sm font-medium text-muted">Recommandations</h3>
          <p className="text-sm">{recommandations}</p>
        </div>
      )}
      {!observations && !recommandations && (
        <p className="text-sm text-muted">Aucune recommandation formulée.</p>
      )}
    </Card>
  );
}
