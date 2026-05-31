"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { V2PageHeader } from "@/components/v2/V2PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/v2/ui/ToastProvider";
import { BudgetPrevisionnelForm } from "@/components/budget/BudgetPrevisionnelForm";
import { LocalTestBadge } from "@/components/ui/LocalTestBadge";
import { shouldUseLocalTestStorage } from "@/lib/local-test/mode";
import {
  createBudgetPrevisionnel,
  getBudgetPrevisionnel,
  updateBudgetPrevisionnel,
} from "@/lib/data/budget-previsionnel";
import { getEntraineurs } from "@/lib/data/entraineurs";
import { getJoueurs } from "@/lib/data/joueurs";
import type { Competition } from "@/lib/types/competition";
import type { BudgetPrevisionnelInput } from "@/lib/types/budget-previsionnel";

const COMPETITION_REF_PREFIX = "competition:";

export function competitionRefFromBudget(equipeLibelle: string | null | undefined): string | null {
  const v = (equipeLibelle ?? "").trim();
  if (v.startsWith(COMPETITION_REF_PREFIX)) return v.slice(COMPETITION_REF_PREFIX.length);
  return null;
}

export function competitionRefLabel(competitionId: string): string {
  return `${COMPETITION_REF_PREFIX}${competitionId}`;
}

type Props = {
  budgetId?: string;
};

export function BudgetCompetitionPrevisionnelV2Client({ budgetId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const competitionId = searchParams.get("competition_id") ?? "";
  const tournoiParam = searchParams.get("tournoi") ?? "";

  const [loading, setLoading] = useState(Boolean(budgetId));
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [initial, setInitial] = useState<Awaited<ReturnType<typeof getBudgetPrevisionnel>>>(null);
  const [joueurs, setJoueurs] = useState<{ id: string; label: string; subtitle?: string }[]>([]);
  const [entraineurs, setEntraineurs] = useState<{ id: string; label: string }[]>([]);
  const [localMode, setLocalMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocalMode(shouldUseLocalTestStorage());
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const [js, es] = await Promise.all([getJoueurs(), getEntraineurs()]);
        setJoueurs(
          js.map((j) => ({
            id: j.id,
            label: `${j.prenom} ${j.nom}`,
            subtitle: j.categorie_age,
          }))
        );
        setEntraineurs(es.map((e) => ({ id: e.id, label: `${e.prenom} ${e.nom}` })));

        if (budgetId) {
          const b = await getBudgetPrevisionnel(budgetId);
          if (!b) {
            setError("Budget introuvable.");
            return;
          }
          setInitial(b);
          const refId = competitionRefFromBudget(b.equipe_libelle);
          if (refId) {
            const res = await fetch(`/api/competitions/${refId}`, { credentials: "include" });
            if (res.ok) {
              const json = (await res.json()) as { competition?: Competition };
              setCompetition(json.competition ?? null);
            }
          }
          return;
        }

        if (competitionId) {
          const res = await fetch(`/api/competitions/${competitionId}`, { credentials: "include" });
          if (!res.ok) {
            setError("Impossible de charger la compétition.");
            return;
          }
          const json = (await res.json()) as { competition?: Competition };
          setCompetition(json.competition ?? null);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    })();
  }, [budgetId, competitionId]);

  async function handleSubmit(input: BudgetPrevisionnelInput) {
    const comp = competition;
    const refId = competitionId || competitionRefFromBudget(input.equipe_libelle) || comp?.id;
    const payload: BudgetPrevisionnelInput = {
      ...input,
      type_budget: input.type_budget === "mission" ? "mission" : "tournoi",
      tournoi_evenement: input.tournoi_evenement?.trim() || comp?.nom || tournoiParam || null,
      pays: input.pays?.trim() || null,
      ville: input.ville?.trim() || comp?.lieu || null,
      date_debut: input.date_debut || comp?.date_debut || input.date_debut,
      date_fin: input.date_fin || comp?.date_fin || input.date_fin,
      equipe_libelle: refId ? competitionRefLabel(refId) : input.equipe_libelle,
      objet: input.objet?.trim() || `Budget voyage — ${comp?.nom ?? tournoiParam}`,
    };

    try {
      if (budgetId) {
        await updateBudgetPrevisionnel(budgetId, payload);
        toast("Budget compétition enregistré.", "success");
        router.push("/v2/budget/voyage-competition");
        return;
      }
      const created = await createBudgetPrevisionnel(payload);
      const savedLocal = created.id.startsWith("local-");
      toast(
        savedLocal
          ? "Budget enregistré en mode local (navigateur). Pour la base partagée, exécutez la migration SQL."
          : "Budget prévisionnel créé.",
        savedLocal ? "warning" : "success"
      );
      if (savedLocal) {
        toast(
          "Supabase → SQL Editor : exécutez supabase/migrations/021_budget_previsionnel.sql",
          "info"
        );
      }
      router.push("/v2/budget/voyage-competition");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Enregistrement impossible";
      toast(msg, "error");
      if (
        msg.includes("does not exist") ||
        msg.includes("schema cache") ||
        msg.includes("budgets_previsionnel")
      ) {
        toast(
          "Exécutez dans Supabase : supabase/migrations/021_budget_previsionnel.sql puis réessayez.",
          "warning"
        );
      }
    }
  }

  const isStandalone = !budgetId && !competitionId;
  const defaultSujet =
    initial?.objet ??
    (competition ? `Budget voyage — ${competition.nom}` : tournoiParam || undefined);
  const defaultTournoi =
    initial?.tournoi_evenement ?? competition?.nom ?? (tournoiParam || undefined);
  const canShowForm = !loading && !error && (budgetId ? Boolean(initial) : true);

  return (
    <>
      <V2PageHeader
        title={budgetId ? "Modifier le budget compétition" : "Créer un budget compétition"}
        description={
          competition
            ? `${competition.nom} — EUR ou MAD, export PDF`
            : isStandalone
              ? "Saisissez tournoi, dates et lieu — liaison compétition optionnelle"
              : "Budget prévisionnel voyage compétition"
        }
      />
      <main className="space-y-4 p-4 sm:p-6">
        <Link
          href="/v2/budget/voyage-competition"
          className="inline-flex items-center gap-1 text-sm text-[var(--frmt-gold)] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Retour à la liste
        </Link>

        {localMode && <LocalTestBadge />}

        {loading && <p className="text-muted">Chargement…</p>}
        {error && (
          <Card className="border-red-500/40 p-4 text-sm text-red-400">
            {error}
            <div className="mt-3">
              <Link href="/v2/budget/voyage-competition">
                <Button variant="secondary" size="sm">
                  Retour à la liste
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {canShowForm && (
          <BudgetPrevisionnelForm
            initial={initial ?? undefined}
            defaultSujet={defaultSujet}
            defaultTournoi={defaultTournoi}
            defaultDateDebut={initial?.date_debut ?? competition?.date_debut}
            defaultDateFin={initial?.date_fin ?? competition?.date_fin}
            defaultPays={initial?.pays ?? undefined}
            defaultVille={initial?.ville ?? competition?.lieu ?? undefined}
            defaultType="tournoi"
            contexteMissionTournoi
            joueurs={joueurs}
            entraineurs={entraineurs}
            onSubmit={handleSubmit}
            onCancel={() => router.push("/v2/budget/voyage-competition")}
            submitLabel={budgetId ? "Enregistrer" : "Créer le budget compétition"}
          />
        )}
      </main>
    </>
  );
}
