"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { V2PageHeader } from "@/components/v2/V2PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { useToast } from "@/components/v2/ui/ToastProvider";
import {
  createOccupationChambre,
  getEntraineursByStage,
  getInterneChambres,
  getJoueursByStage,
  getOccupationsChambresByStage,
  getStages,
} from "@/lib/supabase/queries";
import { exportListePdf } from "@/lib/pdf/pdf-exports";
import { assignChambresAutomatique } from "@/lib/v2/logistique-operationnelle";
import type { InterneChambreV2, OccupationChambreV2, StageProgrammeV2 } from "@/lib/types/v2";

const DEFAULT_CHAMBRES: InterneChambreV2[] = [
  { id: "A1", numero: "A1", batiment: "A", statut: "libre" },
  { id: "A2", numero: "A2", batiment: "A", statut: "libre" },
  { id: "A3", numero: "A3", batiment: "A", statut: "libre" },
  { id: "A4", numero: "A4", batiment: "A", statut: "libre" },
  { id: "B1", numero: "B1", batiment: "B", statut: "libre" },
  { id: "B2", numero: "B2", batiment: "B", statut: "libre" },
  { id: "B3", numero: "B3", batiment: "B", statut: "libre" },
  { id: "C1", numero: "C1", batiment: "C", statut: "libre" },
  { id: "C2", numero: "C2", batiment: "C", statut: "libre" },
];

export function HebergementChambresClient() {
  const { toast } = useToast();
  const [stages, setStages] = useState<StageProgrammeV2[]>([]);
  const [selectedStageId, setSelectedStageId] = useState("");
  const [chambres, setChambres] = useState<InterneChambreV2[]>([]);
  const [occupations, setOccupations] = useState<OccupationChambreV2[]>([]);
  const [activeRoom, setActiveRoom] = useState<InterneChambreV2 | null>(null);

  const load = useCallback(async () => {
    const [s, ch] = await Promise.all([getStages(), getInterneChambres()]);
    const target = s.find((x) => x.hebergement && x.statut !== "annule") ?? s[0] ?? null;
    setStages(s);
    setSelectedStageId(target?.id ?? "");
    setChambres(ch.length ? ch : DEFAULT_CHAMBRES);
    if (target) setOccupations(await getOccupationsChambresByStage(target.id));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function refreshOccupations(stageId: string) {
    setOccupations(await getOccupationsChambresByStage(stageId));
  }

  async function autoAssign() {
    const stage = stages.find((s) => s.id === selectedStageId);
    if (!stage) return;
    const [joueurs, coaches] = await Promise.all([getJoueursByStage(stage.id), getEntraineursByStage(stage.id)]);
    const propositions = assignChambresAutomatique(chambres, joueurs, coaches, stage);
    if (propositions.length === 0) {
      toast("Aucune attribution possible", "warning");
      return;
    }
    let created = 0;
    for (const p of propositions) {
      const res = await createOccupationChambre(p);
      if (!res.error) created += 1;
    }
    if (created === 0) {
      toast("Tables non migrées: affichage en local uniquement", "warning");
      setOccupations(
        propositions.map((p, i) => ({
          ...p,
          id: `local-${i}`,
        }))
      );
      return;
    }
    toast(`${created} chambres attribuées`, "success");
    await refreshOccupations(stage.id);
  }

  const byBat = useMemo(
    () => ({
      A: chambres.filter((c) => c.batiment === "A"),
      B: chambres.filter((c) => c.batiment === "B"),
      C: chambres.filter((c) => c.batiment === "C"),
    }),
    [chambres]
  );

  const occByRoom = useMemo(() => new Map(occupations.map((o) => [o.chambre_id, o])), [occupations]);

  function roomStatus(room: InterneChambreV2) {
    const occ = occByRoom.get(room.id);
    if (occ) return { dot: "🔴", label: occ.occupant_nom, text: "Occupée" };
    if (room.statut === "maintenance") return { dot: "🟡", label: "Maintenance", text: "Réservée" };
    return { dot: "🟢", label: "Libre", text: "Libre" };
  }

  function exportHebergementList() {
    const stage = stages.find((s) => s.id === selectedStageId);
    if (!stage) return;
    const rows = occupations.map((o) => {
      const room = chambres.find((c) => c.id === o.chambre_id);
      return [
        o.occupant_nom,
        room?.numero ?? "—",
        room?.batiment ?? "—",
        o.date_arrivee ?? "—",
        o.date_depart ?? "—",
      ];
    });
    exportListePdf(
      `LISTE D'HÉBERGEMENT — ${stage.stage_action}`,
      ["Nom Prénom", "Chambre", "Bâtiment", "Arrivée", "Départ"],
      rows,
      `hebergement-${stage.id}.pdf`
    );
  }

  return (
    <>
      <V2PageHeader
        title="Hébergement interne CNT"
        description="Plan visuel des chambres — Club de l'Agriculture"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => void autoAssign()}>
              Attribution automatique
            </Button>
            <Button variant="secondary" onClick={exportHebergementList}>
              📄 Liste hébergement
            </Button>
          </div>
        }
      />
      <main className="space-y-4 p-4 sm:p-6">
        <Card className="p-4">
          <label className="mb-2 block text-xs uppercase tracking-wider text-[var(--text-muted)]">Stage</label>
          <Select
            value={selectedStageId}
            onChange={(e) => {
              const id = e.target.value;
              setSelectedStageId(id);
              void refreshOccupations(id);
            }}
          >
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.stage_action}
              </option>
            ))}
          </Select>
        </Card>

        {(["A", "B", "C"] as const).map((bat) => (
          <Card key={bat} className="p-4">
            <p className="mb-3 text-sm font-semibold">
              {bat === "A" ? "BÂTIMENT A — JOUEURS" : bat === "B" ? "BÂTIMENT B — JOUEUSES" : "BÂTIMENT C — STAFF/COACHES"}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {byBat[bat].map((room) => {
                const s = roomStatus(room);
                return (
                  <button
                    key={room.id}
                    type="button"
                    className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3 text-left hover:border-[var(--frmt-gold)]"
                    onClick={() => setActiveRoom(room)}
                  >
                    <p className="font-semibold">{room.numero}</p>
                    <p className="text-xl">{s.dot}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{s.label}</p>
                  </button>
                );
              })}
            </div>
          </Card>
        ))}

        <Card className="p-3 text-xs text-[var(--text-secondary)]">Légende : 🟢 Libre • 🔴 Occupée • 🟡 Réservée</Card>

        {activeRoom && (
          <Card className="max-w-lg p-4">
            <p className="mb-2 text-lg font-semibold">Chambre {activeRoom.numero}</p>
            {occByRoom.get(activeRoom.id) ? (
              <>
                <p>Occupant : {occByRoom.get(activeRoom.id)?.occupant_nom}</p>
                <p>Arrivée : {occByRoom.get(activeRoom.id)?.date_arrivee ?? "—"}</p>
                <p>Départ : {occByRoom.get(activeRoom.id)?.date_depart ?? "—"}</p>
                <div className="mt-3 flex gap-2">
                  <Button variant="secondary" size="sm">
                    Modifier
                  </Button>
                  <Button variant="danger" size="sm">
                    Libérer
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-[var(--text-secondary)]">Chambre libre</p>
            )}
          </Card>
        )}
      </main>
    </>
  );
}

