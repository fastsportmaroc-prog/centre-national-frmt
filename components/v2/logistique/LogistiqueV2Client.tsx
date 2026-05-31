"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { V2PageHeader } from "@/components/v2/V2PageHeader";
import { V2PageActions } from "@/components/v2/V2PageActions";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { EmptyState } from "@/components/v2/ui/EmptyState";
import { getDemandesLogistique } from "@/lib/supabase/queries";
import { exportLogistiquePDF } from "@/lib/pdf/pdf-exports";
import { Truck } from "lucide-react";

export function LogistiqueV2Client() {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const load = useCallback(async () => {
    setItems(await getDemandesLogistique());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((r) => {
      const type = String(r.type ?? r.type_demande ?? "").toLowerCase();
      const stage = String(r.stage_id ?? "").toLowerCase();
      const status = String(r.statut ?? "").toLowerCase();
      if (q && !`${type} ${stage}`.includes(q)) return false;
      if (filterStatus && status !== filterStatus) return false;
      return true;
    });
  }, [items, search, filterStatus]);

  return (
    <>
      <V2PageHeader
        title="Logistique"
        actions={
          <V2PageActions
            onExportPdf={() =>
              exportLogistiquePDF(
                items.map((r) => ({
                  Stage: String(r.stage_id ?? "—"),
                  Type: String(r.type ?? r.type_demande ?? "—"),
                  Responsable: String(r.responsable ?? "—"),
                  "Date besoin": String(r.date_besoin ?? "—"),
                  Statut: String(r.statut ?? "—"),
                  Notes: String(r.notes ?? "—"),
                }))
              )
            }
          />
        }
      />
      <main className="space-y-4 p-4 sm:p-6">
        <Card className="grid gap-3 p-4 sm:grid-cols-3">
          <Input
            placeholder="Rechercher type ou stage..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Tous statuts</option>
            <option value="demande">Demandé</option>
            <option value="en_cours">En cours</option>
            <option value="termine">Terminé</option>
            <option value="annule">Annulé</option>
          </Select>
        </Card>
        {filtered.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="Aucune demande logistique"
            description="Aucune entrée ne correspond aux filtres actifs."
          />
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="v2-data-table w-full text-sm">
              <thead>
                <tr>
                  <th className="p-3 text-left">Type</th>
                  <th className="p-3 text-left">Stage</th>
                  <th className="p-3 text-left">Responsable</th>
                  <th className="p-3 text-left">Date besoin</th>
                  <th className="p-3 text-left">Statut</th>
                  <th className="p-3 text-left">Notes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={String(r.id ?? i)}>
                    <td className="p-3 font-medium">{String(r.type ?? r.type_demande ?? "Demande")}</td>
                    <td className="p-3">{String(r.stage_id ?? "—")}</td>
                    <td className="p-3">{String(r.responsable ?? "—")}</td>
                    <td className="p-3">{String(r.date_besoin ?? "—")}</td>
                    <td className="p-3">{String(r.statut ?? "—")}</td>
                    <td className="p-3">{String(r.notes ?? "—")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </main>
    </>
  );
}
