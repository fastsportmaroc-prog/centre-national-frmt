"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  addLigneBudgetDeplacement,
  createBudgetDeplacement,
  getBudgetsDeplacement,
  imputeBudgetAuJoueur,
  validateBudgetDeplacement,
} from "@/lib/data/budget-deplacement";
import { getJoueurs } from "@/lib/data/joueurs";
import { exportPdfReport, openPrintReport } from "@/lib/export/reports";
import { CATEGORIE_LIGNE_BUDGET_LABELS } from "@/lib/constants/budget-deplacement";
import { buildBudgetDeplacementReport } from "@/lib/reports/budget-deplacement-report";
import type { BudgetDeplacementInput, BudgetDeplacementWithLignes, LigneBudgetDeplacementInput } from "@/lib/types/budget-deplacement";
import { FileDown, Printer } from "lucide-react";

const emptyBudget: BudgetDeplacementInput = {
  joueur_id: "",
  coach_id: null,
  tournoi: "",
  destination: "",
  date_depart: new Date().toISOString().slice(0, 10),
  date_retour: new Date().toISOString().slice(0, 10),
  avec_coach: false,
  devise: "MAD",
  statut: "brouillon",
  valide_par: null,
  date_validation: null,
  notes: null,
};

export function BudgetDeplacementClient() {
  const [budgets, setBudgets] = useState<BudgetDeplacementWithLignes[]>([]);
  const [joueurs, setJoueurs] = useState<{ id: string; nom: string }[]>([]);
  const [form, setForm] = useState<BudgetDeplacementInput>(emptyBudget);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>("");
  const [ligne, setLigne] = useState<Omit<LigneBudgetDeplacementInput, "budget_deplacement_id" | "joueur_id">>({
    categorie: "billet_avion_joueur",
    description: "",
    quantite: 1,
    prix_unitaire: 0,
    devise: "MAD",
    type: "previsionnel",
    impute_joueur: true,
    commentaire: null,
  });

  const load = useCallback(async () => {
    const [bs, js] = await Promise.all([getBudgetsDeplacement(), getJoueurs()]);
    setBudgets(bs);
    setJoueurs(js.map((j) => ({ id: j.id, nom: `${j.prenom} ${j.nom}` })));
    if (!form.joueur_id && js[0]) setForm((f) => ({ ...f, joueur_id: js[0].id }));
    if (!selectedBudgetId && bs[0]) setSelectedBudgetId(bs[0].id);
  }, [form.joueur_id, selectedBudgetId]);

  useEffect(() => { load(); }, [load]);

  const current = useMemo(
    () => budgets.find((b) => b.id === selectedBudgetId) ?? null,
    [budgets, selectedBudgetId]
  );

  const joueurNom = useMemo(() => {
    if (!current) return "Joueur";
    return joueurs.find((j) => j.id === current.joueur_id)?.nom ?? "Joueur";
  }, [current, joueurs]);

  const exportBudgetPdf = async () => {
    if (!current) return;
    const meta = buildBudgetDeplacementReport(current, joueurNom);
    await exportPdfReport(`budget-deplacement-${current.id}.pdf`, meta);
  };

  return (
    <>
      <PageHeader title="Budget déplacement" description="Prévision, validation et imputation automatique des coûts joueur" />
      <main className="space-y-4 p-4 sm:p-6">
        <Card premium className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2"><Label>Joueur</Label><Select value={form.joueur_id} onChange={(e) => setForm((f) => ({ ...f, joueur_id: e.target.value }))}>{joueurs.map((j) => <option key={j.id} value={j.id}>{j.nom}</option>)}</Select></div>
          <div><Label>Tournoi / stage</Label><Input value={form.tournoi} onChange={(e) => setForm((f) => ({ ...f, tournoi: e.target.value }))} /></div>
          <div><Label>Destination</Label><Input value={form.destination} onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))} /></div>
          <div><Label>Date départ</Label><Input type="date" value={form.date_depart} onChange={(e) => setForm((f) => ({ ...f, date_depart: e.target.value }))} /></div>
          <div><Label>Date retour</Label><Input type="date" value={form.date_retour} onChange={(e) => setForm((f) => ({ ...f, date_retour: e.target.value }))} /></div>
          <div className="flex items-end"><Button onClick={async () => { await createBudgetDeplacement(form); setForm(emptyBudget); await load(); }}>Créer budget</Button></div>
        </Card>

        <Card premium>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Select className="max-w-sm" value={selectedBudgetId} onChange={(e) => setSelectedBudgetId(e.target.value)}>
              {budgets.map((b) => <option key={b.id} value={b.id}>{b.tournoi} — {b.destination}</option>)}
            </Select>
            {current && <Badge variant={current.statut === "valide" ? "success" : "muted"}>{current.statut}</Badge>}
            {current && (
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  const meta = buildBudgetDeplacementReport(current, joueurNom);
                  await openPrintReport(meta);
                }}
              >
                <Printer className="h-4 w-4" />
                Imprimer
              </Button>
            )}
            {current && (
              <Button variant="ghost" size="sm" onClick={exportBudgetPdf}>
                <FileDown className="h-4 w-4" />
                PDF
              </Button>
            )}
            {current && <Button variant="secondary" onClick={async () => { await validateBudgetDeplacement(current.id, "Direction FRMT"); await load(); }}>Valider budget</Button>}
            {current && <Button variant="secondary" onClick={async () => { await imputeBudgetAuJoueur(current.id); await load(); }}>Imputer au compte joueur</Button>}
          </div>

          <div className="grid gap-2 sm:grid-cols-6">
            <div className="sm:col-span-2"><Label>Catégorie</Label><Select value={ligne.categorie} onChange={(e) => setLigne((l) => ({ ...l, categorie: e.target.value as LigneBudgetDeplacementInput["categorie"] }))}><option value="billet_avion_joueur">Billet avion joueur</option><option value="billet_avion_coach">Billet avion coach</option><option value="hotel_joueur">Hôtel joueur</option><option value="hotel_coach">Hôtel coach</option><option value="restauration">Restauration</option><option value="argent_de_poche">Argent de poche</option><option value="transport_local">Transport local</option><option value="inscription_tournoi">Inscription tournoi</option><option value="cordage">Cordage</option><option value="materiel">Matériel</option><option value="visa">Visa</option><option value="assurance">Assurance</option><option value="kine_medical">Kiné / médical</option><option value="autres_frais">Autres frais</option></Select></div>
            <div className="sm:col-span-2"><Label>Description</Label><Input value={ligne.description} onChange={(e) => setLigne((l) => ({ ...l, description: e.target.value }))} /></div>
            <div><Label>Qté</Label><Input type="number" value={ligne.quantite} onChange={(e) => setLigne((l) => ({ ...l, quantite: Number(e.target.value) || 1 }))} /></div>
            <div><Label>Prix unit.</Label><Input type="number" value={ligne.prix_unitaire} onChange={(e) => setLigne((l) => ({ ...l, prix_unitaire: Number(e.target.value) || 0 }))} /></div>
            <div><Label>Type</Label><Select value={ligne.type} onChange={(e) => setLigne((l) => ({ ...l, type: e.target.value as "previsionnel" | "reel" }))}><option value="previsionnel">Prévisionnel</option><option value="reel">Réel</option></Select></div>
            <div className="flex items-end"><Button variant="secondary" onClick={async () => {
              if (!current) return;
              await addLigneBudgetDeplacement({
                ...ligne,
                budget_deplacement_id: current.id,
                joueur_id: current.joueur_id,
              });
              setLigne((l) => ({ ...l, description: "", quantite: 1, prix_unitaire: 0 }));
              await load();
            }}>Ajouter ligne</Button></div>
          </div>
        </Card>

        {current && (
          <Card premium className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-left text-muted"><th className="p-3">Catégorie</th><th className="p-3">Description</th><th className="p-3 text-right">Montant</th><th className="p-3">Type</th></tr></thead>
              <tbody>
                {current.lignes.filter((l) => l.description || l.montant_total > 0).map((l) => (
                  <tr key={l.id} className="border-b border-border/50"><td className="p-3">{CATEGORIE_LIGNE_BUDGET_LABELS[l.categorie]}</td><td className="p-3">{l.description}</td><td className="p-3 text-right">{l.montant_total.toLocaleString("fr-FR")} {l.devise}</td><td className="p-3">{l.type}</td></tr>
                ))}
                <tr className="bg-surface-elevated/60 font-semibold"><td className="p-3" colSpan={2}>Total prévisionnel / réel</td><td className="p-3 text-right">{current.total_previsionnel.toLocaleString("fr-FR")} / {current.total_reel.toLocaleString("fr-FR")} {current.devise}</td><td className="p-3">—</td></tr>
              </tbody>
            </table>
          </Card>
        )}
      </main>
    </>
  );
}
