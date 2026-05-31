"use client";

import { useEffect, useState } from "react";
import { V2PageHeader } from "@/components/v2/V2PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { EmptyState } from "@/components/v2/ui/EmptyState";
import { getJoueursByStage, getStages } from "@/lib/supabase/queries";
import { exportListePdf } from "@/lib/pdf/pdf-exports";
import type { StageProgrammeV2 } from "@/lib/types/v2";
import { Mail } from "lucide-react";

export function ConvocationsClient() {
  const [stages, setStages] = useState<StageProgrammeV2[]>([]);
  const [stageId, setStageId] = useState("");
  const [heure, setHeure] = useState("09:00");
  const [joueurs, setJoueurs] = useState<{ id: string; nom: string; prenom: string; date_naissance?: string }[]>([]);

  useEffect(() => {
    (async () => {
      const s = await getStages();
      setStages(s);
      if (s[0]) {
        setStageId(s[0].id);
        setJoueurs(await getJoueursByStage(s[0].id));
      }
    })();
  }, []);

  const stage = stages.find((s) => s.id === stageId);

  function generateFor(joueurNom: string) {
    if (!stage) return;
    exportListePdf(
      `CONVOCATION OFFICIELLE — ${joueurNom}`,
      ["Champ", "Valeur"],
      [
        ["Joueur", joueurNom],
        ["Stage", stage.stage_action],
        ["Période", `${stage.date_debut} au ${stage.date_fin}`],
        ["Lieu", "Centre National de Tennis — Club de l'Agriculture, Rabat"],
        ["Heure convocation", heure],
        ["Direction", "FRMT — Direction Technique Nationale"],
      ],
      `Convocation_${joueurNom.replace(/\s+/g, "_")}.pdf`
    );
  }

  function generateAll() {
    for (const j of joueurs) generateFor(`${j.nom} ${j.prenom}`);
  }

  return (
    <>
      <V2PageHeader
        title="Convocations officielles"
        actions={
          <Button variant="secondary" onClick={generateAll}>
            Générer toutes les convocations
          </Button>
        }
      />
      <main className="space-y-4 p-4 sm:p-6">
        <Card className="grid gap-3 p-4 sm:grid-cols-3">
          <Select
            value={stageId}
            onChange={async (e) => {
              const id = e.target.value;
              setStageId(id);
              setJoueurs(await getJoueursByStage(id));
            }}
          >
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.stage_action}
              </option>
            ))}
          </Select>
          <Input value={heure} onChange={(e) => setHeure(e.target.value)} />
          <div className="text-sm text-[var(--text-secondary)]">Lieu: Club de l'Agriculture, Rabat</div>
        </Card>

        {joueurs.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="Aucun joueur sur ce stage"
            description="Sélectionnez un autre stage pour générer des convocations."
          />
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="v2-data-table w-full text-sm">
              <thead>
                <tr>
                  <th className="p-3 text-left">Joueur</th>
                  <th className="p-3 text-left">Date de naissance</th>
                  <th className="p-3 text-left">Heure convocation</th>
                  <th className="p-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {joueurs.map((j) => (
                  <tr key={j.id}>
                    <td className="p-3 font-medium">
                      {j.nom} {j.prenom}
                    </td>
                    <td className="p-3">{j.date_naissance ?? "—"}</td>
                    <td className="p-3">{heure}</td>
                    <td className="p-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => generateFor(`${j.nom} ${j.prenom}`)}
                      >
                        Générer PDF
                      </Button>
                    </td>
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

