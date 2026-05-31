"use client";

import { useCallback, useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Card } from "@/components/ui/Card";
import type { CompetitionHistoriqueEntry } from "@/lib/types/competition";

export function TabHistorique({ competitionId }: { competitionId: string }) {
  const [entries, setEntries] = useState<CompetitionHistoriqueEntry[]>([]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/competitions/${competitionId}/historique`);
    const json = await res.json();
    setEntries(json.historique ?? []);
  }, [competitionId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Card className="divide-y divide-[var(--border)] p-0">
      {entries.map((e) => (
        <div key={e.id} className="flex flex-wrap gap-2 p-3 text-sm">
          <span className="text-muted">
            {format(parseISO(e.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}
          </span>
          <span className="font-medium">{e.action.replace(/_/g, " ")}</span>
          {e.details && <span className="text-muted">— {e.details}</span>}
        </div>
      ))}
      {entries.length === 0 && (
        <p className="p-4 text-sm text-muted">Aucune action enregistrée pour cette compétition.</p>
      )}
    </Card>
  );
}
