"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { V2PageHeader } from "@/components/v2/V2PageHeader";
import { ExportPdfButton } from "@/components/v2/ui/ExportPdfButton";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Input";
import { getHistorique } from "@/lib/supabase/queries";
import { exportListePdf } from "@/lib/pdf/pdf-exports";
import type { HistoriqueV2 } from "@/lib/types/v2";

function actionIcon(action: string) {
  if (action.includes("created")) return "🟢";
  if (action.includes("deleted")) return "🔴";
  if (action.includes("export")) return "🟣";
  if (action.includes("login")) return "⚪";
  return "🔵";
}

export function HistoriqueV2Client() {
  const [items, setItems] = useState<HistoriqueV2[]>([]);
  const [actionFilter, setActionFilter] = useState("all");
  const [tableFilter, setTableFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [diffRow, setDiffRow] = useState<HistoriqueV2 | null>(null);

  const load = useCallback(async () => {
    setItems(await getHistorique());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return items.filter((h) => {
      if (actionFilter !== "all" && !h.action.includes(actionFilter)) return false;
      const table = h.table_concernee ?? h.module;
      if (tableFilter !== "all" && table !== tableFilter) return false;
      if (search) {
        const hay = [h.description, h.utilisateur_nom, h.action, h.entite_label]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [items, actionFilter, tableFilter, search]);

  const tables = useMemo(() => {
    const s = new Set<string>();
    items.forEach((h) => {
      const t = (h as HistoriqueV2 & { table_concernee?: string }).table_concernee ?? h.module;
      if (t) s.add(t);
    });
    return [...s];
  }, [items]);

  function exportPdf() {
    exportListePdf(
      "Historique d'activité",
      ["Date", "Action", "Utilisateur", "Rôle", "Description"],
      filtered.map((h) => [
        new Date(h.created_at).toLocaleString("fr-FR"),
        h.action,
        h.utilisateur_nom ?? "—",
        h.utilisateur_role ?? "—",
        h.description ?? h.entite_label ?? "—",
      ]),
      `historique-${format(new Date(), "yyyy-MM-dd")}.pdf`
    );
  }

  const diff = diffRow?.diff ?? null;

  return (
    <ProtectedRoute allowedRoles={["admin", "direction"]}>
      <V2PageHeader
        title="Historique"
        description="Journal d'audit permanent — aucune suppression possible"
        actions={<ExportPdfButton onExport={exportPdf} label="Exporter PDF" />}
      />
      <main className="space-y-4 p-4 sm:p-6">
        <Card className="flex flex-wrap gap-2 p-3">
          <Select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
            <option value="all">Toutes actions</option>
            <option value="created">Créations</option>
            <option value="updated">Modifications</option>
            <option value="deleted">Suppressions</option>
          </Select>
          <Select value={tableFilter} onChange={(e) => setTableFilter(e.target.value)}>
            <option value="all">Toutes tables</option>
            {tables.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          <Input
            className="min-w-[200px] flex-1"
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Card>

        <div className="relative space-y-0 border-l-2 border-frmt-green/40 pl-6">
          {filtered.map((h) => {
            const ext = h;
            const when = format(new Date(h.created_at), "d MMM yyyy HH:mm", { locale: fr });
            return (
              <div key={h.id} className="relative pb-6">
                <span className="absolute -left-[31px] top-1 flex h-4 w-4 rounded-full bg-frmt-green" />
                <Card className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">
                        {actionIcon(h.action)} {h.action.replace(/_/g, " ")}
                      </p>
                      <p className="text-sm text-muted">{h.description ?? h.entite_label}</p>
                    </div>
                    <div className="text-right text-xs text-muted">
                      <p>{when}</p>
                      <p>
                        {ext.user_nom ?? h.utilisateur_nom} · {ext.user_role ?? h.utilisateur_role}
                      </p>
                    </div>
                  </div>
                  {ext.diff && Object.keys(ext.diff).length > 0 && (
                    <button
                      type="button"
                      className="mt-2 text-xs text-frmt-green hover:underline"
                      onClick={() => setDiffRow(h)}
                    >
                      Voir diff
                    </button>
                  )}
                </Card>
              </div>
            );
          })}
        </div>
      </main>

      <Modal open={!!diffRow} onClose={() => setDiffRow(null)} title="Détail des modifications">
        {diff && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted">
                <th className="py-2">Champ</th>
                <th className="py-2">Avant</th>
                <th className="py-2">Après</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(diff).map(([key, val]) => (
                <tr key={key} className="border-b border-border/40">
                  <td className="py-2 font-medium">{key}</td>
                  <td className="py-2">{String(val.avant ?? "—")}</td>
                  <td className="py-2">{String(val.apres ?? "—")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal>
    </ProtectedRoute>
  );
}
