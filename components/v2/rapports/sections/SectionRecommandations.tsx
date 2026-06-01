"use client";

import { Card } from "@/components/ui/Card";
import { SECTION_LABELS } from "@/lib/rapports/types";

type Props = {
  recommandations?: string;
};

export function SectionRecommandations({ recommandations }: Props) {
  return (
    <Card className="space-y-4 p-4" id="section-recommandations">
      <h2 className="text-lg font-semibold text-frmt-gold">{SECTION_LABELS.recommandations}</h2>
      {recommandations ? (
        <p className="text-sm">{recommandations}</p>
      ) : (
        <p className="text-sm text-muted">Aucune recommandation formulée.</p>
      )}
    </Card>
  );
}
