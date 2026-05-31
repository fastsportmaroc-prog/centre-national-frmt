"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LocalTestBadge } from "@/components/ui/LocalTestBadge";
import { BudgetPrevisionnelForm } from "@/components/budget/BudgetPrevisionnelForm";
import { shouldUseLocalTestStorage } from "@/lib/local-test/mode";
import {
  getBudgetPrevisionnel,
  getBudgetPrevisionnelHistory,
  markBudgetPdfExported,
  updateBudgetPrevisionnel,
} from "@/lib/data/budget-previsionnel";
import { getEntraineurs } from "@/lib/data/entraineurs";
import { getGroupes } from "@/lib/data/groupes";
import { getJoueurs } from "@/lib/data/joueurs";
import { openBudgetPrevisionnelPdf } from "@/lib/reports/budget-previsionnel-report";
import type {
  BudgetPrevisionnel,
  BudgetPrevisionnelHistoryEntry,
  BudgetPrevisionnelInput,
} from "@/lib/types/budget-previsionnel";
import { formatEur, formatMad } from "@/lib/utils/budget-previsionnel-math";
import { formatDate } from "@/lib/utils/dates";
import { ArrowLeft, FileDown } from "lucide-react";

type Props = { id: string };

export function BudgetPrevisionnelDetailClient({ id }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editMode = searchParams.get("edit") === "1";

  const [budget, setBudget] = useState<BudgetPrevisionnel | null>(null);
  const [history, setHistory] = useState<BudgetPrevisionnelHistoryEntry[]>([]);
  const [joueurs, setJoueurs] = useState<{ id: string; label: string; subtitle?: string }[]>([]);
  const [entraineurs, setEntraineurs] = useState<{ id: string; label: string }[]>([]);
  const [groupes, setGroupes] = useState<{ id: string; label: string }[]>([]);
  const [editing, setEditing] = useState(editMode);
  const [localMode, setLocalMode] = useState(false);

  const load = useCallback(async () => {
    setLocalMode(shouldUseLocalTestStorage());
    const [b, h, js, es, gs] = await Promise.all([
      getBudgetPrevisionnel(id),
      getBudgetPrevisionnelHistory(id),
      getJoueurs(),
      getEntraineurs(),
      getGroupes(),
    ]);
    setBudget(b);
    setHistory(h);
    setJoueurs(
      js.map((j) => ({
        id: j.id,
        label: `${j.prenom} ${j.nom}`,
        subtitle: j.categorie_age,
      }))
    );
    setEntraineurs(es.map((e) => ({ id: e.id, label: `${e.prenom} ${e.nom}` })));
    setGroupes(gs.map((g) => ({ id: g.id, label: g.nom })));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setEditing(editMode);
  }, [editMode]);

  async function handleUpdate(input: BudgetPrevisionnelInput) {
    await updateBudgetPrevisionnel(id, input);
    setEditing(false);
    await load();
    router.replace(`/budget/previsionnels/${id}`);
  }

  async function exportPdf() {
    if (!budget) return;
    await openBudgetPrevisionnelPdf(budget);
    await markBudgetPdfExported(id);
    await load();
  }

  if (!budget) {
    return (
      <main className="p-6">
        <p className="text-muted">Budget introuvable.</p>
        <Link href="/budget/previsionnels">
          <Button variant="ghost" className="mt-4">
            Retour
          </Button>
        </Link>
      </main>
    );
  }

  return (
    <>
      <PageHeader title={budget.objet} description={`Budget prévisionnel — ${budget.sujet_libelle}`} />
      <main className="space-y-4 p-4 sm:p-6">
        {localMode && <LocalTestBadge />}
        <Link href="/budget/previsionnels">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Retour à la liste
          </Button>
        </Link>

        <div className="flex flex-wrap gap-2">
          <Badge>{budget.type_budget}</Badge>
          <Badge variant="muted">{budget.statut}</Badge>
          {!editing && (
            <>
              <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                Modifier
              </Button>
              <Button variant="secondary" size="sm" onClick={exportPdf}>
                <FileDown className="h-4 w-4" />
                Export PDF
              </Button>
            </>
          )}
        </div>

        {editing ? (
          <BudgetPrevisionnelForm
            initial={budget}
            joueurs={joueurs}
            entraineurs={entraineurs}
            groupes={groupes}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(false)}
            submitLabel="Mettre à jour"
          />
        ) : (
          <>
            <Card premium className="grid gap-2 p-4 sm:grid-cols-2 text-sm">
              <p>
                <span className="text-muted">Période :</span> {formatDate(budget.date_debut)} —{" "}
                {formatDate(budget.date_fin)}
              </p>
              <p>
                <span className="text-muted">Événement :</span> {budget.tournoi_evenement ?? "—"}
              </p>
              <p className="sm:col-span-2">
                <span className="text-muted">Participants :</span> {budget.sujet_libelle || "—"}
              </p>
              <p>
                <span className="text-muted">Coach :</span>{" "}
                {budget.avec_coach ? budget.coach_nom ?? "Oui" : "Non"}
              </p>
              <p>
                <span className="text-muted">Lieu :</span> {[budget.ville, budget.pays].filter(Boolean).join(", ") || "—"}
              </p>
              <p>
                <span className="text-muted">Total EUR :</span> {formatEur(budget.total_eur)}
              </p>
              <p>
                <span className="text-muted">Total MAD :</span> {formatMad(budget.total_mad)}
              </p>
              <p className="sm:col-span-2 text-xs italic">{budget.montant_lettres_mad}</p>
              <p className="text-xs text-muted">
                Créé le {formatDate(budget.created_at.slice(0, 10))} par {budget.created_by} ·
                Modifié le {formatDate(budget.updated_at.slice(0, 10))}
              </p>
            </Card>

            <Card premium className="overflow-x-auto p-4">
              <h3 className="mb-2 text-sm font-semibold">Lignes budgétaires</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted">
                    <th className="p-2 text-left">Désignation</th>
                    <th className="p-2 text-right">Qté</th>
                    <th className="p-2 text-right">J./Nuits</th>
                    <th className="p-2 text-right">P.U.</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {budget.lignes.map((l) => (
                    <tr key={l.id} className="border-b border-border/40">
                      <td className="p-2">{l.designation}</td>
                      <td className="p-2 text-right">{l.quantite}</td>
                      <td className="p-2 text-right">{l.jours_nuits}</td>
                      <td className="p-2 text-right">{l.prix_unitaire_eur}</td>
                      <td className="p-2 text-right">{formatEur(l.total_eur)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </>
        )}

        <Card premium className="p-4">
          <h3 className="mb-2 text-sm font-semibold">Historique</h3>
          {history.length === 0 ? (
            <p className="text-xs text-muted">Aucune entrée d'historique.</p>
          ) : (
            <ul className="space-y-2 text-xs">
              {history.map((h) => (
                <li key={h.id} className="flex justify-between gap-4 border-b border-border/30 pb-2">
                  <span>
                    <strong>{h.action}</strong>
                    {h.details ? ` — ${h.details}` : ""}
                  </span>
                  <span className="text-muted whitespace-nowrap">
                    {formatDate(h.created_at.slice(0, 10))} · {h.utilisateur}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </main>
    </>
  );
}
