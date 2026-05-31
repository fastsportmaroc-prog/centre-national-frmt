"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { V2PageHeader } from "@/components/v2/V2PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { getJoueursByStage, getRestaurationByStage, getStages, upsertPresenceRepas } from "@/lib/supabase/queries";
import { exportListePdf } from "@/lib/pdf/pdf-exports";
import type { PresenceRepasV2, StageProgrammeV2 } from "@/lib/types/v2";

function stageDays(stage: StageProgrammeV2) {
  const out: string[] = [];
  const d0 = new Date(`${stage.date_debut}T00:00:00`);
  const d1 = new Date(`${stage.date_fin}T00:00:00`);
  for (let d = d0; d <= d1; d = addDays(d, 1)) out.push(format(d, "yyyy-MM-dd"));
  return out;
}

export function RestaurationComptageClient() {
  const [stages, setStages] = useState<StageProgrammeV2[]>([]);
  const [selectedStage, setSelectedStage] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [rows, setRows] = useState<PresenceRepasV2[]>([]);

  const load = useCallback(async () => {
    const s = await getStages();
    setStages(s);
    const target = s.find((x) => x.restauration) ?? s[0];
    if (!target) return;
    setSelectedStage(target.id);
    const days = stageDays(target);
    setSelectedDay(days[0] ?? "");
    const joueurs = await getJoueursByStage(target.id);
    const rest = await getRestaurationByStage(target.id);
    const defaults = joueurs.map((j) => ({
      id: `${target.id}-${j.id}-${days[0]}`,
      stage_id: target.id,
      personne_id: j.id,
      personne_type: "joueur" as const,
      personne_nom: `${j.prenom} ${j.nom}`,
      date_repas: days[0] ?? target.date_debut,
      petit_dejeuner: rest?.petit_dejeuner ?? true,
      dejeuner: rest?.dejeuner ?? true,
      diner: rest?.diner ?? true,
    }));
    setRows(defaults);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stage = stages.find((s) => s.id === selectedStage);
  const days = stage ? stageDays(stage) : [];
  const dayRows = rows.filter((r) => r.date_repas === selectedDay);

  const totals = useMemo(
    () => ({
      pdj: dayRows.filter((r) => r.petit_dejeuner).length,
      dej: dayRows.filter((r) => r.dejeuner).length,
      din: dayRows.filter((r) => r.diner).length,
      total: dayRows.reduce((sum, r) => sum + Number(r.petit_dejeuner) + Number(r.dejeuner) + Number(r.diner), 0),
    }),
    [dayRows]
  );

  async function changeStage(stageId: string) {
    setSelectedStage(stageId);
    const s = stages.find((x) => x.id === stageId);
    if (!s) return;
    const d = stageDays(s)[0] ?? s.date_debut;
    setSelectedDay(d);
    const joueurs = await getJoueursByStage(stageId);
    const rest = await getRestaurationByStage(stageId);
    setRows(
      joueurs.map((j) => ({
        id: `${stageId}-${j.id}-${d}`,
        stage_id: stageId,
        personne_id: j.id,
        personne_type: "joueur",
        personne_nom: `${j.prenom} ${j.nom}`,
        date_repas: d,
        petit_dejeuner: rest?.petit_dejeuner ?? true,
        dejeuner: rest?.dejeuner ?? true,
        diner: rest?.diner ?? true,
      }))
    );
  }

  async function toggle(id: string, field: "petit_dejeuner" | "dejeuner" | "diner") {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, [field]: !r[field] };
        void upsertPresenceRepas({
          stage_id: next.stage_id,
          personne_id: next.personne_id,
          personne_type: next.personne_type,
          personne_nom: next.personne_nom,
          date_repas: next.date_repas,
          petit_dejeuner: next.petit_dejeuner,
          dejeuner: next.dejeuner,
          diner: next.diner,
        });
        return next;
      })
    );
  }

  function exportRecap() {
    if (!stage) return;
    const rowsPdf = dayRows.map((r) => [
      r.personne_nom,
      r.petit_dejeuner ? "1" : "0",
      r.dejeuner ? "1" : "0",
      r.diner ? "1" : "0",
      String(Number(r.petit_dejeuner) + Number(r.dejeuner) + Number(r.diner)),
    ]);
    rowsPdf.push(["TOTAL", String(totals.pdj), String(totals.dej), String(totals.din), String(totals.total)]);
    exportListePdf(
      `Comptage restauration — ${stage.stage_action} — ${selectedDay}`,
      ["Nom", "PDJ", "Déjeuner", "Dîner", "Total"],
      rowsPdf,
      `restauration-comptage-${stage.id}.pdf`
    );
  }

  return (
    <>
      <V2PageHeader
        title="Restauration / Comptage"
        description="Présences repas quotidiennes par joueur"
        actions={
          <Button variant="secondary" onClick={exportRecap}>
            📄 Récapitulatif restauration
          </Button>
        }
      />
      <main className="space-y-4 p-4 sm:p-6">
        <Card className="grid gap-3 p-4 sm:grid-cols-2">
          <Select value={selectedStage} onChange={(e) => void changeStage(e.target.value)}>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.stage_action}
              </option>
            ))}
          </Select>
          <Select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)}>
            {days.map((d) => (
              <option key={d} value={d}>
                {format(new Date(`${d}T12:00:00`), "EEEE dd MMM yyyy", { locale: fr })}
              </option>
            ))}
          </Select>
        </Card>

        <Card className="overflow-x-auto p-0">
          <table className="v2-data-table w-full text-sm">
            <thead>
              <tr>
                <th className="p-3 text-left">Nom</th>
                <th className="p-3 text-center">PDJ</th>
                <th className="p-3 text-center">Déjeuner</th>
                <th className="p-3 text-center">Dîner</th>
                <th className="p-3 text-center">Total</th>
              </tr>
            </thead>
            <tbody>
              {dayRows.map((r) => (
                <tr key={r.id}>
                  <td className="p-3">{r.personne_nom}</td>
                  <td className="p-3 text-center">
                    <button type="button" onClick={() => void toggle(r.id, "petit_dejeuner")}>
                      {r.petit_dejeuner ? "✅" : "❌"}
                    </button>
                  </td>
                  <td className="p-3 text-center">
                    <button type="button" onClick={() => void toggle(r.id, "dejeuner")}>
                      {r.dejeuner ? "✅" : "❌"}
                    </button>
                  </td>
                  <td className="p-3 text-center">
                    <button type="button" onClick={() => void toggle(r.id, "diner")}>
                      {r.diner ? "✅" : "❌"}
                    </button>
                  </td>
                  <td className="p-3 text-center">
                    {Number(r.petit_dejeuner) + Number(r.dejeuner) + Number(r.diner)}
                  </td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="p-3">TOTAL DU JOUR</td>
                <td className="p-3 text-center">{totals.pdj}</td>
                <td className="p-3 text-center">{totals.dej}</td>
                <td className="p-3 text-center">{totals.din}</td>
                <td className="p-3 text-center">{totals.total}</td>
              </tr>
            </tbody>
          </table>
        </Card>
      </main>
    </>
  );
}

