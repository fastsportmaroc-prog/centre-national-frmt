"use client";

import { useEffect, useMemo, useState } from "react";
import { V2PageHeader } from "@/components/v2/V2PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Input";
import { exportListePdf } from "@/lib/pdf/pdf-exports";
import { getEntraineurs, getJoueursByStage, getStages } from "@/lib/supabase/queries";
import type { StageProgrammeV2 } from "@/lib/types/v2";

type Slot = "matin" | "apm";
type Assignment = {
  stageId: string;
  day: string;
  court: string;
  slot: Slot;
  groupe: string;
  coach: string;
  joueurs: string[];
};

const COURTS = ["Court 1 TB", "Court 2 TB", "Court 3 D", "Fitness"];
const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const STORE = "frmt-dispatch-local";

export function PlanningDispatchClient() {
  const [stages, setStages] = useState<StageProgrammeV2[]>([]);
  const [stageId, setStageId] = useState("");
  const [coaches, setCoaches] = useState<{ id: string; nom: string; prenom: string }[]>([]);
  const [joueurs, setJoueurs] = useState<{ id: string; nom: string; prenom: string }[]>([]);
  const [items, setItems] = useState<Assignment[]>([]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Assignment>({
    stageId: "",
    day: "Lun",
    court: COURTS[0],
    slot: "matin",
    groupe: "",
    coach: "",
    joueurs: [],
  });

  useEffect(() => {
    (async () => {
      const [s, c] = await Promise.all([getStages(), getEntraineurs()]);
      setStages(s);
      setCoaches(c);
      const target = s[0];
      if (!target) return;
      setStageId(target.id);
      setDraft((d) => ({ ...d, stageId: target.id }));
      setJoueurs(await getJoueursByStage(target.id));
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem(STORE);
        if (raw) setItems(JSON.parse(raw) as Assignment[]);
      }
    })();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(STORE, JSON.stringify(items));
  }, [items]);

  const stage = stages.find((s) => s.id === stageId);
  const grid = useMemo(() => items.filter((a) => a.stageId === stageId), [items, stageId]);

  function openAssign(day: string, court: string, slot: Slot) {
    setDraft((d) => ({ ...d, day, court, slot, stageId: stageId || d.stageId }));
    setOpen(true);
  }

  function saveAssign() {
    setItems((prev) => {
      const without = prev.filter(
        (x) => !(x.stageId === draft.stageId && x.day === draft.day && x.court === draft.court && x.slot === draft.slot)
      );
      return [...without, draft];
    });
    setOpen(false);
  }

  function getCell(day: string, court: string, slot: Slot) {
    return grid.find((x) => x.day === day && x.court === court && x.slot === slot);
  }

  function exportDispatchPdf() {
    if (!stage) return;
    const rows = grid.map((a) => [a.day, a.court, a.slot === "matin" ? "Matin" : "Après-midi", a.groupe, a.coach]);
    exportListePdf(
      `PLANNING TERRAIN — ${stage.stage_action}`,
      ["Jour", "Court", "Créneau", "Groupe", "Coach"],
      rows,
      `dispatch-${stage.id}.pdf`
    );
  }

  return (
    <>
      <V2PageHeader
        title="Planning / Dispatch terrains"
        description={stage ? `${stage.stage_action} — Club de l'Agriculture` : "Dispatch hebdomadaire"}
        actions={
          <Button variant="secondary" onClick={exportDispatchPdf}>
            📄 Imprimer dispatch
          </Button>
        }
      />
      <main className="space-y-4 p-4 sm:p-6">
        <Card className="p-4">
          <Select
            value={stageId}
            onChange={async (e) => {
              const id = e.target.value;
              setStageId(id);
              setDraft((d) => ({ ...d, stageId: id }));
              setJoueurs(await getJoueursByStage(id));
            }}
          >
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.stage_action}
              </option>
            ))}
          </Select>
        </Card>

        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-card-hover)]">
                <th className="p-3 text-left">Jour / Créneau</th>
                {COURTS.map((c) => (
                  <th key={c} className="p-3 text-left">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day) => (
                <>
                  <tr key={`${day}-m`} className="border-b border-[var(--border)]">
                    <td className="p-3 font-medium">MATIN 09-13h ({day})</td>
                    {COURTS.map((court) => {
                      const cell = getCell(day, court, "matin");
                      return (
                        <td key={`${day}-${court}-m`} className="p-2">
                          {cell ? (
                            <div className="rounded border border-[var(--border)] bg-[var(--bg-card)] p-2">
                              <p>{cell.groupe}</p>
                              <p className="text-xs text-[var(--text-secondary)]">👤 {cell.coach}</p>
                              <p className="text-xs text-[var(--text-secondary)]">👥 {cell.joueurs.length} joueurs</p>
                            </div>
                          ) : (
                            <Button size="sm" variant="secondary" onClick={() => openAssign(day, court, "matin")}>
                              + Assigner
                            </Button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  <tr key={`${day}-a`} className="border-b border-[var(--border)]">
                    <td className="p-3 font-medium">APM 14-18h ({day})</td>
                    {COURTS.map((court) => {
                      const cell = getCell(day, court, "apm");
                      return (
                        <td key={`${day}-${court}-a`} className="p-2">
                          {cell ? (
                            <div className="rounded border border-[var(--border)] bg-[var(--bg-card)] p-2">
                              <p>{cell.groupe}</p>
                              <p className="text-xs text-[var(--text-secondary)]">👤 {cell.coach}</p>
                              <p className="text-xs text-[var(--text-secondary)]">👥 {cell.joueurs.length} joueurs</p>
                            </div>
                          ) : (
                            <Button size="sm" variant="secondary" onClick={() => openAssign(day, court, "apm")}>
                              + Assigner
                            </Button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                </>
              ))}
            </tbody>
          </table>
        </Card>
      </main>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Assigner un créneau"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={saveAssign}>Confirmer</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input value={draft.day} readOnly />
          <Input value={draft.court} readOnly />
          <Select value={draft.groupe} onChange={(e) => setDraft((d) => ({ ...d, groupe: e.target.value }))}>
            <option value="">Groupe</option>
            <option value="U18 Garçons">U18 Garçons</option>
            <option value="U18 Filles">U18 Filles</option>
            <option value="U16 Mixte">U16 Mixte</option>
          </Select>
          <Select value={draft.coach} onChange={(e) => setDraft((d) => ({ ...d, coach: e.target.value }))}>
            <option value="">Coach</option>
            {coaches.map((c) => (
              <option key={c.id} value={`${c.prenom} ${c.nom}`}>
                {c.prenom} {c.nom}
              </option>
            ))}
          </Select>
          <Select
            multiple
            value={draft.joueurs}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                joueurs: Array.from(e.target.selectedOptions).map((o) => o.value),
              }))
            }
            className="min-h-[120px]"
          >
            {joueurs.map((j) => (
              <option key={j.id} value={`${j.prenom} ${j.nom}`}>
                {j.prenom} {j.nom}
              </option>
            ))}
          </Select>
        </div>
      </Modal>
    </>
  );
}

