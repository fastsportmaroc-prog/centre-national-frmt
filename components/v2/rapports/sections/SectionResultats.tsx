"use client";

import { Card } from "@/components/ui/Card";
import type { ResultatSportif } from "@/lib/rapports/types";
import { SECTION_LABELS } from "@/lib/rapports/types";

export function SectionResultats({ resultats }: { resultats: ResultatSportif[] }) {
  return (
    <Card className="space-y-4 p-4" id="section-resultats">
      <h2 className="text-lg font-semibold text-frmt-gold">{SECTION_LABELS.resultats}</h2>
      {resultats.length === 0 ? (
        <p className="text-sm text-muted">Aucun résultat enregistré.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs text-muted">
                <th className="pb-2 pr-4">Joueur</th>
                <th className="pb-2 pr-4">Épreuve</th>
                <th className="pb-2 pr-4">Résultat</th>
                <th className="pb-2">Classement</th>
              </tr>
            </thead>
            <tbody>
              {resultats.map((r, i) => (
                <tr key={`${r.joueur}-${i}`} className="border-b border-[var(--border)]/50">
                  <td className="py-2 pr-4">{r.joueur}</td>
                  <td className="py-2 pr-4">{r.epreuve ?? "—"}</td>
                  <td className="py-2 pr-4">{r.resultat}</td>
                  <td className="py-2">{r.classement ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
