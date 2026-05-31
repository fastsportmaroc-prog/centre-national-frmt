"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { V2PageHeader } from "@/components/v2/V2PageHeader";
import { ExportPdfButton } from "@/components/v2/ui/ExportPdfButton";
import { useToast } from "@/components/v2/ui/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label, Select } from "@/components/ui/Input";
import { BUDGET_ANNEE_DEFAUT } from "@/lib/constants/budget";
import { getBudgetDashboard } from "@/lib/data/budget";
import {
  getHebergements,
  getRestaurations,
  getStages,
  getStageCoachLinks,
  getStageJoueursLinks,
} from "@/lib/supabase/queries";
import { exportBudgetAnnuelPDF, exportBudgetMissionPDF } from "@/lib/pdf/pdf-exports";
import { formatMoneyEUR, formatMoneyMAD } from "@/lib/pdf/pdf-format";
import type { StageProgrammeV2 } from "@/lib/types/v2";
import {
  type BudgetVoyageForm,
  type DiversLigne,
  computeBudgetTotals,
  emptyBudgetVoyage,
  listAllBudgetVoyages,
  loadBudgetVoyage,
  saveBudgetVoyage,
} from "@/lib/v2/budget-voyage";
import { countDaysInclusive, countNightsHebergement } from "@/lib/v2/stage-calculations";
import { Plus, Trash2 } from "lucide-react";
import { useRole } from "@/lib/hooks/useRole";

type Section = "voyage" | "annuel" | "export";

function mealTotalsFromRestauration(rest?: Awaited<ReturnType<typeof getRestaurations>>[number]) {
  if (!rest) return { pdj: 0, dej: 0, diner: 0 };
  const jours = countDaysInclusive(rest.date_debut, rest.date_fin);
  const pdj = rest.petit_dejeuner ? rest.nb_personnes * jours : 0;
  const dej = rest.dejeuner ? rest.nb_personnes * jours : 0;
  const diner = rest.diner ? rest.nb_personnes * jours : 0;
  return { pdj, dej, diner };
}

/** Budget voyage stages CNE (séparé du hub administratif et des compétitions). */
export function BudgetV2Client() {
  const { toast } = useToast();
  const { canWrite, canExportBudget } = useRole();
  const [section, setSection] = useState<Section>("voyage");
  const [stages, setStages] = useState<StageProgrammeV2[]>([]);
  const [linksJ, setLinksJ] = useState<{ stage_id: string }[]>([]);
  const [linksC, setLinksC] = useState<{ stage_id: string }[]>([]);
  const [hebergements, setHebergements] = useState<Awaited<ReturnType<typeof getHebergements>>>([]);
  const [restaurations, setRestaurations] = useState<Awaited<ReturnType<typeof getRestaurations>>>([]);
  const [annee, setAnnee] = useState(BUDGET_ANNEE_DEFAUT);
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof getBudgetDashboard>> | null>(null);
  const [form, setForm] = useState<BudgetVoyageForm>(emptyBudgetVoyage());
  const [savedTick, setSavedTick] = useState(0);


  const load = useCallback(async () => {
    const [s, lj, lc, h, r, dash] = await Promise.all([
      getStages(),
      getStageJoueursLinks(),
      getStageCoachLinks(),
      getHebergements(),
      getRestaurations(),
      getBudgetDashboard(annee),
    ]);
    setStages(s);
    setLinksJ(lj);
    setLinksC(lc);
    setHebergements(h);
    setRestaurations(r);
    setDashboard(dash);
    setForm((prev) => {
      if (prev.stage_id) return prev;
      if (!s[0]) return prev;
      const st = s[0];
      const heb = h.find((x) => x.stage_id === st.id);
      const rest = r.find((x) => x.stage_id === st.id);
      const meals = mealTotalsFromRestauration(rest);
      const saved = loadBudgetVoyage(st.id);
      const base = saved ?? emptyBudgetVoyage(st.id);
      const totalChambres = (heb?.nb_chambres_joueurs ?? heb?.chambres ?? 0) + (heb?.nb_chambres_coachs ?? 0);
      return {
        ...base,
        stage_id: st.id,
        nb_billets_joueurs: lj.filter((x) => x.stage_id === st.id).length || st.nombre_joueurs,
        nb_billets_coachs: lc.filter((x) => x.stage_id === st.id).length || st.nombre_encadrants,
        nb_nuits: countNightsHebergement(st.date_debut, st.date_fin),
        nb_chambres_joueurs: heb?.nb_chambres_joueurs ?? heb?.chambres ?? 0,
        nb_chambres_coachs: heb?.nb_chambres_coachs ?? 0,
        nb_chambres_single: base.nb_chambres_single ?? 0,
        nb_chambres_double: base.nb_chambres_double || totalChambres,
        total_repas_petit_dejeuner: meals.pdj,
        total_repas_dejeuner: meals.dej,
        total_repas_diner: meals.diner,
        prix_petit_dejeuner: base.prix_petit_dejeuner,
        prix_dejeuner: base.prix_dejeuner,
        prix_diner: base.prix_diner,
        prix_chambre_single: base.prix_chambre_single,
        prix_chambre_double: base.prix_chambre_double,
      };
    });
  }, [annee]);

  function applyStageDefaults(
    st: StageProgrammeV2,
    lj: typeof linksJ,
    lc: typeof linksC,
    h: typeof hebergements,
    r: typeof restaurations,
    saved: BudgetVoyageForm | null
  ) {
    const heb = h.find((x) => x.stage_id === st.id);
    const rest = r.find((x) => x.stage_id === st.id);
    const meals = mealTotalsFromRestauration(rest);
    const base = saved ?? emptyBudgetVoyage(st.id);
    const totalChambres = (heb?.nb_chambres_joueurs ?? heb?.chambres ?? 0) + (heb?.nb_chambres_coachs ?? 0);
    setForm({
      ...base,
      stage_id: st.id,
      nb_billets_joueurs: lj.filter((x) => x.stage_id === st.id).length || st.nombre_joueurs,
      nb_billets_coachs: lc.filter((x) => x.stage_id === st.id).length || st.nombre_encadrants,
      nb_nuits: countNightsHebergement(st.date_debut, st.date_fin),
      nb_chambres_joueurs: heb?.nb_chambres_joueurs ?? heb?.chambres ?? 0,
      nb_chambres_coachs: heb?.nb_chambres_coachs ?? 0,
      nb_chambres_single: base.nb_chambres_single ?? 0,
      nb_chambres_double: base.nb_chambres_double || totalChambres,
      total_repas_petit_dejeuner: meals.pdj,
      total_repas_dejeuner: meals.dej,
      total_repas_diner: meals.diner,
      prix_petit_dejeuner: base.prix_petit_dejeuner,
      prix_dejeuner: base.prix_dejeuner,
      prix_diner: base.prix_diner,
      prix_chambre_single: base.prix_chambre_single,
      prix_chambre_double: base.prix_chambre_double,
    });
  }

  useEffect(() => {
    void load();
  }, [load]);

  const stage = useMemo(() => stages.find((s) => s.id === form.stage_id), [stages, form.stage_id]);
  const totals = useMemo(() => computeBudgetTotals(form), [form]);

  const annualRows = useMemo(() => {
    void savedTick;
    const voyages = listAllBudgetVoyages();
    return stages
      .filter((s) => s.date_debut.startsWith(String(annee)))
      .map((s) => {
        const v = voyages.find((x) => x.stage_id === s.id);
        const t = v ? computeBudgetTotals(v) : { transport: 0, hebergement: 0, restauration: 0, divers: 0, totalEur: 0, totalMad: 0 };
        return { stage: s, ...t };
      });
  }, [stages, annee, savedTick]);

  const chartByMonth = useMemo(() => {
    const m = Array.from({ length: 12 }, (_, i) => ({ mois: i + 1, total: 0 }));
    for (const row of annualRows) {
      const month = parseInt(row.stage.date_debut.slice(5, 7), 10) - 1;
      if (month >= 0 && month < 12) m[month]!.total += row.totalEur;
    }
    const max = Math.max(...m.map((x) => x.total), 1);
    return m.map((x) => ({ ...x, pct: Math.round((x.total / max) * 100) }));
  }, [annualRows]);

  const piePosts = useMemo(() => {
    const sum = annualRows.reduce(
      (acc, r) => ({
        transport: acc.transport + r.transport,
        hebergement: acc.hebergement + r.hebergement,
        restauration: acc.restauration + r.restauration,
        divers: acc.divers + r.divers,
      }),
      { transport: 0, hebergement: 0, restauration: 0, divers: 0 }
    );
    const total = sum.transport + sum.hebergement + sum.restauration + sum.divers || 1;
    return [
      { label: "Transport", value: sum.transport, pct: Math.round((sum.transport / total) * 100), color: "#3b82f6" },
      { label: "Hébergement", value: sum.hebergement, pct: Math.round((sum.hebergement / total) * 100), color: "#8b5cf6" },
      { label: "Restauration", value: sum.restauration, pct: Math.round((sum.restauration / total) * 100), color: "#22c55e" },
      { label: "Divers", value: sum.divers, pct: Math.round((sum.divers / total) * 100), color: "#f97316" },
    ];
  }, [annualRows]);

  const annualTotal = useMemo(
    () => annualRows.reduce((s, r) => s + r.totalEur, 0),
    [annualRows]
  );

  function onStageChange(stageId: string) {
    const st = stages.find((s) => s.id === stageId);
    if (!st) return;
    applyStageDefaults(st, linksJ, linksC, hebergements, restaurations, loadBudgetVoyage(stageId));
  }

  function handleSave() {
    saveBudgetVoyage(form);
    setSavedTick((t) => t + 1);
    toast("Budget voyage enregistré");
  }

  function addDiversLine() {
    setForm((f) => ({
      ...f,
      divers_lignes: [
        ...f.divers_lignes,
        { id: crypto.randomUUID(), description: "", montant_eur: 0, categorie: "autres" },
      ],
    }));
  }

  function updateDivers(id: string, patch: Partial<DiversLigne>) {
    setForm((f) => ({
      ...f,
      divers_lignes: f.divers_lignes.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));
  }

  function removeDivers(id: string) {
    setForm((f) => ({ ...f, divers_lignes: f.divers_lignes.filter((l) => l.id !== id) }));
  }

  function exportMission() {
    if (!stage) return;
    exportBudgetMissionPDF(stage.stage_action, stage.date_debut, stage.date_fin, form);
  }

  function exportAnnuel() {
    if (!dashboard) return;
    exportBudgetAnnuelPDF(
      annee,
      dashboard.lignes_annuelles.map((l) => ({
        Catégorie: l.categorie,
        Libellé: l.libelle,
        Alloué: l.montant_alloue.toLocaleString("fr-FR"),
        Engagé: l.montant_engage.toLocaleString("fr-FR"),
        Réel: l.montant_reel.toLocaleString("fr-FR"),
      })),
      {
        alloue: dashboard.total_alloue,
        reel: dashboard.total_reel,
        engage: dashboard.total_engage,
      }
    );
  }

  const tabs: { id: Section; label: string }[] = [
    { id: "voyage", label: "Budget voyage (stage)" },
    { id: "annuel", label: "Synthèse annuelle stages" },
    { id: "export", label: "Export PDF" },
  ];

  return (
    <>
      <V2PageHeader
        title="Budget voyage — Stages CNE"
        description="Transport, hébergement, restauration par stage — montants en EUR, total MAD via taux"
      />
      <main className="space-y-4 p-4 sm:p-6">
        <Link href="/v2/budget" className="text-sm text-[var(--frmt-gold)] hover:underline">
          ← Budget administratif
        </Link>
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <Button
              key={t.id}
              variant={section === t.id ? "primary" : "secondary"}
              size="sm"
              onClick={() => setSection(t.id)}
            >
              {t.label}
            </Button>
          ))}
        </div>

        {section === "voyage" && (
          <Card className="space-y-4 p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-[240px] flex-1">
                <Label>Stage</Label>
                <Select className="mt-1 w-full" value={form.stage_id} onChange={(e) => onStageChange(e.target.value)}>
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.stage_action} ({s.date_debut})
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex gap-2">
                {canWrite && (
                  <Button variant="secondary" onClick={handleSave}>
                    Sauvegarder
                  </Button>
                )}
                {canExportBudget && (
                  <ExportPdfButton onExport={exportMission} label="Exporter PDF officiel" disabled={!stage} />
                )}
              </div>
            </div>

            <div className="rounded-lg border border-border p-3">
              <h3 className="mb-2 font-semibold">Transport</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div>
                  <Label>Type transport</Label>
                  <Select value={form.transport_type} onChange={(e) => setForm((f) => ({ ...f, transport_type: e.target.value }))}>
                    <option value="avion">Avion</option>
                    <option value="bus">Bus</option>
                    <option value="train">Train</option>
                    <option value="voiture">Voiture</option>
                  </Select>
                </div>
                <div>
                  <Label>Nb billets joueurs</Label>
                  <Input type="number" value={form.nb_billets_joueurs} onChange={(e) => setForm((f) => ({ ...f, nb_billets_joueurs: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label>Prix/billet joueur (EUR)</Label>
                  <Input type="number" step="0.01" value={form.prix_billet_joueur} onChange={(e) => setForm((f) => ({ ...f, prix_billet_joueur: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label>Nb billets coachs</Label>
                  <Input type="number" value={form.nb_billets_coachs} onChange={(e) => setForm((f) => ({ ...f, nb_billets_coachs: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label>Prix/billet coach (EUR)</Label>
                  <Input type="number" step="0.01" value={form.prix_billet_coach} onChange={(e) => setForm((f) => ({ ...f, prix_billet_coach: Number(e.target.value) }))} />
                </div>
              </div>
              <p className="mt-2 text-sm font-medium text-emerald-400">
                Sous-total transport : {formatMoneyEUR(totals.transport)}
              </p>
            </div>

            <div className="rounded-lg border border-border p-3">
              <h3 className="mb-2 font-semibold">Hébergement</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label>Nb nuits</Label>
                  <Input type="number" value={form.nb_nuits} onChange={(e) => setForm((f) => ({ ...f, nb_nuits: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label>Chambres single</Label>
                  <Input
                    type="number"
                    value={form.nb_chambres_single}
                    onChange={(e) => setForm((f) => ({ ...f, nb_chambres_single: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label>Prix single / nuit (EUR)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.prix_chambre_single}
                    onChange={(e) => setForm((f) => ({ ...f, prix_chambre_single: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label>Chambres double</Label>
                  <Input
                    type="number"
                    value={form.nb_chambres_double}
                    onChange={(e) => setForm((f) => ({ ...f, nb_chambres_double: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label>Prix double / nuit (EUR)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.prix_chambre_double}
                    onChange={(e) => setForm((f) => ({ ...f, prix_chambre_double: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label>Chambres joueurs</Label>
                  <Input type="number" value={form.nb_chambres_joueurs} onChange={(e) => setForm((f) => ({ ...f, nb_chambres_joueurs: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label>Chambres coachs</Label>
                  <Input type="number" value={form.nb_chambres_coachs} onChange={(e) => setForm((f) => ({ ...f, nb_chambres_coachs: Number(e.target.value) }))} />
                </div>
              </div>
              <p className="mt-2 text-sm font-medium text-emerald-400">
                Sous-total hébergement : {formatMoneyEUR(totals.hebergement)}
              </p>
            </div>

            <div className="rounded-lg border border-border p-3">
              <h3 className="mb-2 font-semibold">Restauration</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <Label>Total petit déjeuner</Label>
                  <Input
                    type="number"
                    value={form.total_repas_petit_dejeuner}
                    onChange={(e) => setForm((f) => ({ ...f, total_repas_petit_dejeuner: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label>Prix petit déjeuner (EUR)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.prix_petit_dejeuner}
                    onChange={(e) => setForm((f) => ({ ...f, prix_petit_dejeuner: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label>Total déjeuner</Label>
                  <Input
                    type="number"
                    value={form.total_repas_dejeuner}
                    onChange={(e) => setForm((f) => ({ ...f, total_repas_dejeuner: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label>Prix déjeuner (EUR)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.prix_dejeuner}
                    onChange={(e) => setForm((f) => ({ ...f, prix_dejeuner: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label>Total dîner</Label>
                  <Input
                    type="number"
                    value={form.total_repas_diner}
                    onChange={(e) => setForm((f) => ({ ...f, total_repas_diner: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label>Prix dîner (EUR)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.prix_diner}
                    onChange={(e) => setForm((f) => ({ ...f, prix_diner: Number(e.target.value) }))}
                  />
                </div>
              </div>
              <p className="mt-2 text-sm font-medium text-emerald-400">
                Sous-total restauration : {formatMoneyEUR(totals.restauration)}
              </p>
            </div>

            <div className="rounded-lg border border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold">Divers</h3>
                {canWrite && (
                  <Button variant="secondary" size="sm" onClick={addDiversLine}>
                    <Plus className="mr-1 h-3 w-3" />
                    Ajouter ligne
                  </Button>
                )}
              </div>
              {form.divers_lignes.length === 0 ? (
                <p className="text-sm text-muted">Aucune ligne diverse.</p>
              ) : (
                <div className="space-y-2">
                  {form.divers_lignes.map((l) => (
                    <div key={l.id} className="grid gap-2 sm:grid-cols-[1fr_120px_120px_auto]">
                      <Input placeholder="Description" value={l.description} onChange={(e) => updateDivers(l.id, { description: e.target.value })} />
                      <Input type="number" step="0.01" placeholder="EUR" value={l.montant_eur} onChange={(e) => updateDivers(l.id, { montant_eur: Number(e.target.value) })} />
                      <Input placeholder="Catégorie" value={l.categorie} onChange={(e) => updateDivers(l.id, { categorie: e.target.value })} />
                      {canWrite && (
                        <Button variant="danger" size="sm" onClick={() => removeDivers(l.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-2 text-sm text-muted">Sous-total divers : {formatMoneyEUR(totals.divers)}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Taux EUR/MAD</Label>
                <Input type="number" step="0.01" value={form.taux_eur_mad} onChange={(e) => setForm((f) => ({ ...f, taux_eur_mad: Number(e.target.value) }))} />
              </div>
              <div className="rounded-lg bg-[#1a3c5e]/20 p-4 text-right">
                <p className="text-xs text-muted">Total général</p>
                <p className="text-2xl font-bold text-primary">{formatMoneyEUR(totals.totalEur)}</p>
                <p className="text-sm">{formatMoneyMAD(totals.totalMad)}</p>
                <div className="mt-2 space-y-0.5 text-left text-xs text-muted">
                  <p>Transport : {formatMoneyEUR(totals.transport)}</p>
                  <p>Hébergement : {formatMoneyEUR(totals.hebergement)}</p>
                  <p>Restauration : {formatMoneyEUR(totals.restauration)}</p>
                  <p>Divers : {formatMoneyEUR(totals.divers)}</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {section === "annuel" && (
          <>
            <Card className="overflow-x-auto p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Label>Année</Label>
                <Input type="number" className="w-24" value={annee} onChange={(e) => setAnnee(Number(e.target.value))} />
                <ExportPdfButton onExport={exportAnnuel} label="PDF budget annuel" />
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted">
                    <th className="py-2">Stage</th>
                    <th>Catégorie</th>
                    <th>Transport</th>
                    <th>Hébergement</th>
                    <th>Restauration</th>
                    <th>Divers</th>
                    <th>Total EUR</th>
                    <th>Total MAD</th>
                  </tr>
                </thead>
                <tbody>
                  {annualRows.map(({ stage: s, transport, hebergement, restauration, divers, totalEur, totalMad }) => (
                    <tr key={s.id} className="border-b border-border/40">
                      <td className="py-2 font-medium">{s.stage_action}</td>
                      <td>{s.categorie}</td>
                      <td>{formatMoneyEUR(transport)}</td>
                      <td>{formatMoneyEUR(hebergement)}</td>
                      <td>{formatMoneyEUR(restauration)}</td>
                      <td>{formatMoneyEUR(divers)}</td>
                      <td>{formatMoneyEUR(totalEur)}</td>
                      <td>{formatMoneyMAD(totalMad)}</td>
                    </tr>
                  ))}
                  <tr className="bg-[#1a3c5e] font-bold text-white">
                    <td colSpan={6} className="py-3 pl-2">
                      Total annuel {annee}
                    </td>
                    <td className="py-3">{formatMoneyEUR(annualTotal)}</td>
                    <td className="py-3">
                      {formatMoneyMAD(annualRows.reduce((s, r) => s + r.totalMad, 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="p-4">
                <h3 className="mb-3 text-sm font-semibold">Dépenses par mois</h3>
                <div className="flex h-40 items-end gap-1">
                  {chartByMonth.map((m) => (
                    <div key={m.mois} className="flex flex-1 flex-col items-center gap-1">
                      <div className="w-full rounded-t bg-[#1a3c5e]" style={{ height: `${Math.max(4, m.pct)}%` }} title={formatMoneyEUR(m.total)} />
                      <span className="text-[9px] text-muted">{m.mois}</span>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-4">
                <h3 className="mb-3 text-sm font-semibold">Répartition par poste</h3>
                <div className="space-y-2">
                  {piePosts.map((p) => (
                    <div key={p.label}>
                      <div className="mb-0.5 flex justify-between text-xs">
                        <span>{p.label}</span>
                        <span>{p.pct}% · {formatMoneyEUR(p.value)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-border">
                        <div className="h-full" style={{ width: `${p.pct}%`, backgroundColor: p.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </>
        )}

        {section === "export" && (
          <Card className="space-y-4 p-4">
            <p className="text-xs text-muted">
              Budget détaillé EUR/MAD ligne à ligne :{" "}
              <Link href="/v2/budget/previsionnel-stages" className="text-[var(--frmt-gold)] underline">
                Budget prévisionnel — Stages
              </Link>
              .
            </p>
            <div className="flex flex-wrap gap-3">
              {canExportBudget && (
                <>
                  <ExportPdfButton onExport={exportMission} label="Ordre de mission (stage courant)" disabled={!stage} />
                  <ExportPdfButton onExport={exportAnnuel} label="Budget annuel consolidé" />
                </>
              )}
            </div>
            {stage && (
              <p className="text-xs text-muted">
                Stage sélectionné : {stage.stage_action} — {stage.date_debut} → {stage.date_fin}
              </p>
            )}
          </Card>
        )}
      </main>
    </>
  );
}
