"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Package, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/v2/ui/ToastProvider";
import type { CompetitionMaterielStockEnriched } from "@/lib/types/competition";
import type { Materiel } from "@/lib/types/materiel";
import { cn } from "@/lib/utils/cn";

type DraftQty = Record<string, number>;

export function CompetitionTextileStockPanel({
  competitionId,
  materiels,
  onSaved,
}: {
  competitionId: string;
  materiels: Materiel[];
  onSaved?: () => void;
}) {
  const { toast } = useToast();
  const [stockRows, setStockRows] = useState<CompetitionMaterielStockEnriched[]>([]);
  const [draft, setDraft] = useState<DraftQty>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [migrationHint, setMigrationHint] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/competitions/${competitionId}/textiles/stock`);
    const json = await res.json();
    if (!res.ok) {
      setMigrationHint(json.error ?? "Erreur chargement stock");
      setStockRows([]);
    } else {
      setMigrationHint(null);
      setStockRows(json.stock ?? []);
    }
    setLoading(false);
  }, [competitionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const stockByArticle = useMemo(() => {
    const map = new Map<string, CompetitionMaterielStockEnriched>();
    for (const row of stockRows) map.set(row.article_id, row);
    return map;
  }, [stockRows]);

  useEffect(() => {
    const next: DraftQty = {};
    for (const m of materiels) {
      const row = stockByArticle.get(m.id);
      next[m.id] = row?.quantite_initiale ?? 0;
    }
    setDraft(next);
  }, [materiels, stockByArticle]);

  const textileMateriels = useMemo(() => {
    const keywords = /survet|survêt|t-?shirt|tee|short|jupe|chaussure|polo|textile|tenue|maillot/i;
    const filtered = materiels.filter((m) => keywords.test(m.nom));
    return filtered.length > 0 ? filtered : materiels;
  }, [materiels]);

  async function saveAll() {
    setSaving(true);
    const items = textileMateriels.map((m) => ({
      article_id: m.id,
      quantite_initiale: Math.max(0, Math.floor(draft[m.id] ?? 0)),
    }));
    const res = await fetch(`/api/competitions/${competitionId}/textiles/stock`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast(json.error ?? "Erreur enregistrement", "error");
      return;
    }
    toast("Stock initial enregistré", "success");
    setStockRows(json.stock ?? []);
    onSaved?.();
  }

  return (
    <Card className="space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold">
            <Package className="h-4 w-4 text-frmt-gold" />
            Stock initial compétition
          </h3>
          <p className="mt-1 text-sm text-muted">
            Définissez la quantité allouée à cette compétition. Elle diminue à chaque attribution
            joueur dans le tableau ci-dessous.
          </p>
        </div>
        <Button type="button" size="sm" disabled={saving || loading} onClick={() => void saveAll()}>
          <Save className="mr-1 h-4 w-4" />
          {saving ? "Enregistrement…" : "Enregistrer le stock"}
        </Button>
      </div>

      {migrationHint && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {migrationHint}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted">Chargement du stock…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="v2-data-table w-full text-sm">
            <thead>
              <tr>
                <th className="p-2 text-left">Article</th>
                <th className="p-2 text-right">Stock initial</th>
                <th className="p-2 text-right">Attribué</th>
                <th className="p-2 text-right">Restant</th>
                <th className="p-2 text-right text-muted">Magasin</th>
              </tr>
            </thead>
            <tbody>
              {textileMateriels.map((m) => {
                const row = stockByArticle.get(m.id);
                const initiale = draft[m.id] ?? row?.quantite_initiale ?? 0;
                const attribue = row?.quantite_attribuee ?? 0;
                const restant = Math.max(0, initiale - attribue);
                const low = initiale > 0 && restant <= 2;
                return (
                  <tr key={m.id}>
                    <td className="p-2 font-medium">{m.nom}</td>
                    <td className="p-2 text-right">
                      <Input
                        type="number"
                        min={attribue}
                        className="ml-auto w-24 text-right"
                        value={initiale}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            [m.id]: Math.max(0, Number(e.target.value) || 0),
                          }))
                        }
                      />
                    </td>
                    <td className="p-2 text-right text-muted">{attribue}</td>
                    <td
                      className={cn(
                        "p-2 text-right font-semibold",
                        low ? "text-amber-300" : "text-emerald-300"
                      )}
                    >
                      {initiale > 0 ? restant : "—"}
                    </td>
                    <td className="p-2 text-right text-xs text-muted">
                      {m.quantite_disponible} dispo
                    </td>
                  </tr>
                );
              })}
              {textileMateriels.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-muted">
                    Aucun article dans le stock matériel. Créez des articles dans Matériel.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted">
        Le stock initial ne peut pas être inférieur à la quantité déjà attribuée. Mettez 0 pour
        retirer l&apos;article du pool compétition (contrôle magasin global uniquement).
      </p>
    </Card>
  );
}

/** Restant compétition pour un article (0 si non configuré). */
export function competitionStockRemaining(
  stockRows: CompetitionMaterielStockEnriched[],
  articleId: string
): number | null {
  const row = stockRows.find((s) => s.article_id === articleId);
  if (!row) return null;
  return row.quantite_restante;
}
