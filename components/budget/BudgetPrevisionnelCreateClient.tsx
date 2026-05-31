"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { LocalTestBadge } from "@/components/ui/LocalTestBadge";
import { BudgetPrevisionnelForm } from "@/components/budget/BudgetPrevisionnelForm";
import { shouldUseLocalTestStorage } from "@/lib/local-test/mode";
import { createBudgetPrevisionnel } from "@/lib/data/budget-previsionnel";
import { getEntraineurs } from "@/lib/data/entraineurs";
import { getGroupes } from "@/lib/data/groupes";
import { getJoueurs } from "@/lib/data/joueurs";
import { getStageById } from "@/lib/data/stages";
import type { BudgetPrevisionnelInput } from "@/lib/types/budget-previsionnel";
import { ArrowLeft } from "lucide-react";

export function BudgetPrevisionnelCreateClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const joueurId = searchParams.get("joueur_id") ?? undefined;
  const stageId = searchParams.get("stage_id") ?? undefined;
  const competitionId = searchParams.get("competition_id") ?? undefined;
  const tournoiParam = searchParams.get("tournoi") ?? "";
  const typeParam = searchParams.get("type") as BudgetPrevisionnelInput["type_budget"] | null;

  const [joueurs, setJoueurs] = useState<{ id: string; label: string; subtitle?: string }[]>([]);
  const [entraineurs, setEntraineurs] = useState<{ id: string; label: string }[]>([]);
  const [groupes, setGroupes] = useState<{ id: string; label: string }[]>([]);
  const [defaultSujet, setDefaultSujet] = useState(tournoiParam);
  const [defaultTournoi, setDefaultTournoi] = useState(tournoiParam);
  const [localMode, setLocalMode] = useState(false);

  useEffect(() => {
    setLocalMode(shouldUseLocalTestStorage());
    (async () => {
      const [js, es, gs] = await Promise.all([getJoueurs(), getEntraineurs(), getGroupes()]);
      setJoueurs(
        js.map((j) => ({
          id: j.id,
          label: `${j.prenom} ${j.nom}`,
          subtitle: j.categorie_age,
        }))
      );
      setEntraineurs(es.map((e) => ({ id: e.id, label: `${e.prenom} ${e.nom}` })));
      setGroupes(gs.map((g) => ({ id: g.id, label: g.nom })));
      if (joueurId) {
        const j = js.find((x) => x.id === joueurId);
        if (j) setDefaultSujet(`${j.prenom} ${j.nom}`);
      }
      if (stageId) {
        const s = await getStageById(stageId);
        if (s) setDefaultSujet((prev) => prev || s.stage_action);
      }
      if (tournoiParam) {
        setDefaultTournoi(tournoiParam);
        setDefaultSujet((prev) => prev || tournoiParam);
      }
      if (competitionId && !tournoiParam) {
        try {
          const res = await fetch(`/api/competitions/${competitionId}`, { credentials: "include" });
          if (res.ok) {
            const json = (await res.json()) as { competition?: { nom?: string } };
            const nom = json.competition?.nom ?? "";
            if (nom) {
              setDefaultTournoi(nom);
              setDefaultSujet((prev) => prev || nom);
            }
          }
        } catch {
          /* ignore */
        }
      }
    })();
  }, [joueurId, stageId, competitionId, tournoiParam]);

  async function handleCreate(input: BudgetPrevisionnelInput) {
    const payload: BudgetPrevisionnelInput = {
      ...input,
      joueur_id: input.joueur_id ?? joueurId ?? null,
      stage_id: input.stage_id ?? stageId ?? null,
      type_budget: typeParam ?? input.type_budget,
    };
    const created = await createBudgetPrevisionnel(payload);
    router.push(`/budget/previsionnels/${created.id}`);
  }

  return (
    <>
      <PageHeader title="Créer un budget prévisionnel" description="Formulaire mission FRMT" />
      <main className="space-y-4 p-4 sm:p-6">
        {localMode && <LocalTestBadge />}
        <Link href="/budget/previsionnels">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
        </Link>
        <BudgetPrevisionnelForm
          defaultJoueurId={joueurId}
          defaultStageId={stageId}
          defaultSujet={defaultSujet}
          defaultTournoi={defaultTournoi}
          defaultType={
            typeParam ??
            (competitionId ? "tournoi" : stageId ? "stage" : joueurId ? "joueur" : undefined)
          }
          joueurs={joueurs}
          entraineurs={entraineurs}
          groupes={groupes}
          onSubmit={handleCreate}
          submitLabel="Créer le budget"
        />
      </main>
    </>
  );
}
