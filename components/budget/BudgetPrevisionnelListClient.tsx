"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { LocalTestBadge } from "@/components/ui/LocalTestBadge";
import { shouldUseLocalTestStorage } from "@/lib/local-test/mode";
import {
  archiveBudgetPrevisionnel,
  deleteBudgetPrevisionnel,
  duplicateBudgetPrevisionnel,
  listBudgetsPrevisionnel,
  markBudgetPdfExported,
} from "@/lib/data/budget-previsionnel";
import { getEntraineurs } from "@/lib/data/entraineurs";
import { getJoueurs } from "@/lib/data/joueurs";
import { STATUTS_BUDGET, TYPES_BUDGET } from "@/lib/constants/budget-previsionnel";
import { openBudgetPrevisionnelPdf } from "@/lib/reports/budget-previsionnel-report";
import type {
  BudgetPrevisionnel,
  BudgetPrevisionnelFilters,
  StatutBudgetPrevisionnel,
  TypeBudgetPrevisionnel,
} from "@/lib/types/budget-previsionnel";
import { formatEur, formatMad } from "@/lib/utils/budget-previsionnel-math";
import { formatDate } from "@/lib/utils/dates";
import { FileDown, Plus, Search } from "lucide-react";

function statutVariant(s: StatutBudgetPrevisionnel): "success" | "warning" | "muted" {
  if (s === "valide" || s === "paye") return "success";
  if (s === "envoye") return "warning";
  return "muted";
}

export function BudgetPrevisionnelListClient() {
  const router = useRouter();
  const [budgets, setBudgets] = useState<BudgetPrevisionnel[]>([]);
  const [joueurs, setJoueurs] = useState<{ id: string; label: string }[]>([]);
  const [entraineurs, setEntraineurs] = useState<{ id: string; label: string }[]>([]);
  const [q, setQ] = useState("");
  const [typeBudget, setTypeBudget] = useState<TypeBudgetPrevisionnel | "">("");
  const [joueurId, setJoueurId] = useState("");
  const [entraineurId, setEntraineurId] = useState("");
  const [statut, setStatut] = useState<StatutBudgetPrevisionnel | "">("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [loading, setLoading] = useState(true);
  const [localMode, setLocalMode] = useState(false);

  const filters: BudgetPrevisionnelFilters = useMemo(
    () => ({
      q: q.trim() || undefined,
      type_budget: typeBudget || undefined,
      joueur_id: joueurId || undefined,
      entraineur_id: entraineurId || undefined,
      statut: statut || undefined,
      date_debut: dateDebut || undefined,
      date_fin: dateFin || undefined,
    }),
    [q, typeBudget, joueurId, entraineurId, statut, dateDebut, dateFin]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setLocalMode(shouldUseLocalTestStorage());
    const [bs, js, es] = await Promise.all([
      listBudgetsPrevisionnel(filters),
      getJoueurs(),
      getEntraineurs(),
    ]);
    setBudgets(bs);
    setJoueurs(js.map((j) => ({ id: j.id, label: `${j.prenom} ${j.nom}` })));
    setEntraineurs(es.map((e) => ({ id: e.id, label: `${e.prenom} ${e.nom}` })));
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleExportPdf(b: BudgetPrevisionnel) {
    await openBudgetPrevisionnelPdf(b);
    await markBudgetPdfExported(b.id);
    await load();
  }

  async function handleDelete(id: string, label: string) {
    if (!confirm(`Supprimer définitivement le budget « ${label} » ?`)) return;
    await deleteBudgetPrevisionnel(id);
    await load();
  }

  return (
    <>
      <PageHeader
        title="Budgets prévisionnels"
        description="Création, suivi et export PDF officiel FRMT — missions, joueurs, équipes et stages"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/budget">
              <Button variant="secondary">Budget annuel</Button>
            </Link>
            <Link href="/budget/deplacements">
              <Button variant="secondary">Budget déplacement</Button>
            </Link>
            <Link href="/budget/previsionnels/nouveau">
              <Button>
                <Plus className="h-4 w-4" />
                Créer budget
              </Button>
            </Link>
          </div>
        }
      />
      <main className="space-y-4 p-4 sm:p-6">
        {localMode && <LocalTestBadge />}

        <Card premium className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Label>Recherche</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted" />
              <Input
                className="pl-8"
                placeholder="Objet, joueur, tournoi…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Type</Label>
            <Select
              value={typeBudget}
              onChange={(e) => setTypeBudget(e.target.value as TypeBudgetPrevisionnel | "")}
            >
              <option value="">Tous</option>
              {TYPES_BUDGET.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Statut</Label>
            <Select
              value={statut}
              onChange={(e) => setStatut(e.target.value as StatutBudgetPrevisionnel | "")}
            >
              <option value="">Tous</option>
              {STATUTS_BUDGET.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Joueur</Label>
            <Select value={joueurId} onChange={(e) => setJoueurId(e.target.value)}>
              <option value="">Tous</option>
              {joueurs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Coach</Label>
            <Select value={entraineurId} onChange={(e) => setEntraineurId(e.target.value)}>
              <option value="">Tous</option>
              {entraineurs.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Période — du</Label>
            <Input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
          </div>
          <div>
            <Label>Période — au</Label>
            <Input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
          </div>
        </Card>

        <Card premium className="overflow-x-auto">
          <h2 className="mb-3 text-sm font-semibold">Historique des budgets</h2>
          {loading ? (
            <p className="text-muted">Chargement…</p>
          ) : budgets.length === 0 ? (
            <p className="text-muted">Aucun budget prévisionnel. Cliquez sur « Créer budget ».</p>
          ) : (
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="p-2">Objet</th>
                  <th className="p-2">Bénéficiaire</th>
                  <th className="p-2">Période</th>
                  <th className="p-2">Statut</th>
                  <th className="p-2">Total EUR</th>
                  <th className="p-2">Total MAD</th>
                  <th className="p-2">Modifié</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {budgets.map((b) => (
                  <tr key={b.id} className="border-b border-border/40 hover:bg-surface/50">
                    <td className="p-2 font-medium">{b.objet}</td>
                    <td className="p-2">{b.sujet_libelle}</td>
                    <td className="p-2 text-xs whitespace-nowrap">
                      {formatDate(b.date_debut)} — {formatDate(b.date_fin)}
                    </td>
                    <td className="p-2">
                      <Badge variant={statutVariant(b.statut)}>{b.statut}</Badge>
                    </td>
                    <td className="p-2">{formatEur(b.total_eur)}</td>
                    <td className="p-2">{formatMad(b.total_mad)}</td>
                    <td className="p-2 text-xs text-muted">
                      {formatDate(b.updated_at.slice(0, 10))}
                      {b.dernier_export_pdf_at && (
                        <span className="block">PDF : {formatDate(b.dernier_export_pdf_at.slice(0, 10))}</span>
                      )}
                    </td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/budget/previsionnels/${b.id}`)}
                        >
                          Voir
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            router.push(`/budget/previsionnels/${b.id}?edit=1`)
                          }
                        >
                          Modifier
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            const dup = await duplicateBudgetPrevisionnel(b.id);
                            router.push(`/budget/previsionnels/${dup.id}?edit=1`);
                          }}
                        >
                          Dupliquer
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleExportPdf(b)}>
                          <FileDown className="h-3 w-3" />
                          PDF
                        </Button>
                        {b.statut !== "archive" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              await archiveBudgetPrevisionnel(b.id);
                              await load();
                            }}
                          >
                            Archiver
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400"
                          onClick={() => handleDelete(b.id, b.objet)}
                        >
                          Supprimer
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </main>
    </>
  );
}
