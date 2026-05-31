"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/v2/ui/ToastProvider";
import { BUDGET_CATEGORIES } from "@/lib/competitions/utils";
import type { CompetitionBudgetLine } from "@/lib/types/competition";

export function TabBudget({ competitionId }: { competitionId: string }) {
  const { toast } = useToast();
  const [lines, setLines] = useState<CompetitionBudgetLine[]>([]);
  const [draft, setDraft] = useState<Record<string, { prevu: string; reel: string }>>({});

  const load = useCallback(async () => {
    const res = await fetch(`/api/competitions/${competitionId}/budget`);
    const json = await res.json();
    const rows: CompetitionBudgetLine[] = json.lines ?? [];
    setLines(rows);
    const d: Record<string, { prevu: string; reel: string }> = {};
    for (const cat of BUDGET_CATEGORIES) {
      const row = rows.find((r) => r.categorie === cat.value);
      d[cat.value] = {
        prevu: String(row?.montant_prevu ?? 0),
        reel: String(row?.montant_reel ?? 0),
      };
    }
    setDraft(d);
  }, [competitionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(() => {
    let prevu = 0;
    let reel = 0;
    for (const cat of BUDGET_CATEGORIES) {
      const v = draft[cat.value];
      if (!v) continue;
      prevu += Number(v.prevu) || 0;
      reel += Number(v.reel) || 0;
    }
    return { prevu, reel, ecart: prevu - reel };
  }, [draft]);

  async function saveLine(categorie: string) {
    const v = draft[categorie];
    if (!v) return;
    const res = await fetch(`/api/competitions/${competitionId}/budget`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categorie,
        montant_prevu: Number(v.prevu) || 0,
        montant_reel: Number(v.reel) || 0,
        notes: null,
      }),
    });
    if (!res.ok) {
      const json = await res.json();
      toast(json.error ?? "Erreur", "error");
      return;
    }
    toast("Ligne enregistrée", "success");
    await load();
  }

  async function saveAll() {
    for (const cat of BUDGET_CATEGORIES) {
      await saveLine(cat.value);
    }
    toast("Budget compétition enregistré", "success");
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden p-0">
        <table className="v2-data-table w-full text-sm">
          <thead>
            <tr>
              <th className="p-2 text-left">Catégorie</th>
              <th className="p-2 text-right">Prévu (MAD)</th>
              <th className="p-2 text-right">Réel (MAD)</th>
              <th className="p-2 text-right">Écart</th>
            </tr>
          </thead>
          <tbody>
            {BUDGET_CATEGORIES.map((cat) => {
              const v = draft[cat.value] ?? { prevu: "0", reel: "0" };
              const ecart = (Number(v.prevu) || 0) - (Number(v.reel) || 0);
              return (
                <tr key={cat.value}>
                  <td className="p-2 font-medium">{cat.label}</td>
                  <td className="p-2 text-right">
                    <Input
                      type="number"
                      className="ml-auto max-w-[120px] text-right"
                      value={v.prevu}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          [cat.value]: { ...v, prevu: e.target.value },
                        }))
                      }
                    />
                  </td>
                  <td className="p-2 text-right">
                    <Input
                      type="number"
                      className="ml-auto max-w-[120px] text-right"
                      value={v.reel}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          [cat.value]: { ...v, reel: e.target.value },
                        }))
                      }
                    />
                  </td>
                  <td className="p-2 text-right text-muted">{ecart.toLocaleString("fr-FR")}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-[var(--border)] font-bold">
              <td className="p-2">Total</td>
              <td className="p-2 text-right">{totals.prevu.toLocaleString("fr-FR")} MAD</td>
              <td className="p-2 text-right">{totals.reel.toLocaleString("fr-FR")} MAD</td>
              <td className="p-2 text-right">{totals.ecart.toLocaleString("fr-FR")} MAD</td>
            </tr>
          </tfoot>
        </table>
      </Card>
      <Button onClick={() => void saveAll()}>Enregistrer tout le budget</Button>
    </div>
  );
}
