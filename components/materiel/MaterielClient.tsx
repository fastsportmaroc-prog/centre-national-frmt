"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  createMateriel,
  createMouvementMateriel,
  getMateriels,
  getMouvementsMateriel,
} from "@/lib/data/materiel";
import type {
  Materiel,
  MaterielInput,
  MouvementMateriel,
  MouvementMaterielInput,
} from "@/lib/types/materiel";

const emptyMateriel: MaterielInput = {
  nom: "",
  categorie: "autres",
  quantite_totale: 0,
  quantite_disponible: 0,
  quantite_utilisee: 0,
  seuil_alerte: 5,
  etat: "disponible",
  emplacement: null,
  fournisseur: null,
  prix_unitaire: null,
  notes: null,
  photo_url: null,
};

export function MaterielClient() {
  const [items, setItems] = useState<Materiel[]>([]);
  const [mouvements, setMouvements] = useState<MouvementMateriel[]>([]);
  const [form, setForm] = useState<MaterielInput>(emptyMateriel);
  const [movement, setMovement] = useState({ materiel_id: "", type_mouvement: "sortie_stock", quantite: 1 });

  const load = useCallback(async () => {
    const [mats, mvs] = await Promise.all([getMateriels(), getMouvementsMateriel()]);
    setItems(mats);
    setMouvements(mvs);
    if (!movement.materiel_id && mats[0]) setMovement((v) => ({ ...v, materiel_id: mats[0].id }));
  }, [movement.materiel_id]);

  useEffect(() => { load(); }, [load]);

  const dashboard = useMemo(() => {
    const totalArticles = items.length;
    const stockFaible = items.filter((i) => i.quantite_disponible <= i.seuil_alerte).length;
    const utilise = items.reduce((sum, i) => sum + i.quantite_utilisee, 0);
    const commander = items.filter((i) => i.etat === "a_commander").length;
    const valeur = items.reduce((sum, i) => sum + (i.prix_unitaire ?? 0) * i.quantite_totale, 0);
    return { totalArticles, stockFaible, utilise, commander, valeur };
  }, [items]);

  return (
    <>
      <PageHeader title="Matériel" description="Stock, mouvements et alertes du Centre National" />
      <main className="space-y-4 p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Card className="premium p-4"><p className="text-xs text-muted">Total articles</p><p className="text-xl font-semibold">{dashboard.totalArticles}</p></Card>
          <Card className="premium p-4"><p className="text-xs text-muted">Stock faible</p><p className="text-xl font-semibold text-amber-400">{dashboard.stockFaible}</p></Card>
          <Card className="premium p-4"><p className="text-xs text-muted">Matériel utilisé</p><p className="text-xl font-semibold">{dashboard.utilise}</p></Card>
          <Card className="premium p-4"><p className="text-xs text-muted">À commander</p><p className="text-xl font-semibold text-red-400">{dashboard.commander}</p></Card>
          <Card className="premium p-4"><p className="text-xs text-muted">Valeur estimée</p><p className="text-xl font-semibold">{dashboard.valeur.toLocaleString("fr-FR")} MAD</p></Card>
        </div>

        <Card className="premium grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2"><Label>Nom</Label><Input value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} /></div>
          <div><Label>Catégorie</Label><Select value={form.categorie} onChange={(e) => setForm((f) => ({ ...f, categorie: e.target.value as MaterielInput["categorie"] }))}><option value="balles_dures">Balles dures</option><option value="balles_orange">Balles orange</option><option value="balles_vertes">Balles vertes</option><option value="balles_rouges">Balles rouges</option><option value="paniers">Paniers</option><option value="packs">Packs</option><option value="raquettes">Raquettes</option><option value="plots">Plots</option><option value="elastiques">Élastiques</option><option value="medecine_balls">Médecine balls</option><option value="filets">Filets</option><option value="materiel_fitness">Matériel fitness</option><option value="autres">Autres</option></Select></div>
          <div><Label>Qté totale</Label><Input type="number" value={form.quantite_totale} onChange={(e) => setForm((f) => ({ ...f, quantite_totale: Number(e.target.value) || 0 }))} /></div>
          <div><Label>Seuil alerte</Label><Input type="number" value={form.seuil_alerte} onChange={(e) => setForm((f) => ({ ...f, seuil_alerte: Number(e.target.value) || 0 }))} /></div>
          <div className="flex items-end"><Button className="w-full" onClick={async () => { await createMateriel(form); setForm(emptyMateriel); await load(); }}>Ajouter</Button></div>
        </Card>

        <Card className="premium grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2"><Label>Matériel</Label><Select value={movement.materiel_id} onChange={(e) => setMovement((m) => ({ ...m, materiel_id: e.target.value }))}>{items.map((i) => <option key={i.id} value={i.id}>{i.nom}</option>)}</Select></div>
          <div><Label>Type mouvement</Label><Select value={movement.type_mouvement} onChange={(e) => setMovement((m) => ({ ...m, type_mouvement: e.target.value }))}><option value="entree_stock">Entrée stock</option><option value="sortie_stock">Sortie stock</option><option value="affectation_stage">Affectation stage</option><option value="retour">Retour</option><option value="perte">Perte</option><option value="casse">Casse</option></Select></div>
          <div><Label>Quantité</Label><Input type="number" value={movement.quantite} onChange={(e) => setMovement((m) => ({ ...m, quantite: Number(e.target.value) || 1 }))} /></div>
          <div className="sm:col-span-4"><Button variant="secondary" onClick={async () => { if (!movement.materiel_id) return; const payload: MouvementMaterielInput = { ...movement, quantite: Math.max(1, movement.quantite), type_mouvement: movement.type_mouvement as MouvementMaterielInput["type_mouvement"], stage_id: null, commentaire: null }; await createMouvementMateriel(payload); await load(); }}>Enregistrer le mouvement</Button></div>
        </Card>

        <Card className="premium overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-muted"><th className="p-3">Matériel</th><th className="p-3">Stock</th><th className="p-3">Seuil</th><th className="p-3">État</th></tr></thead>
            <tbody>{items.map((i) => (<tr key={i.id} className="border-b border-border/50"><td className="p-3 font-medium">{i.nom}</td><td className="p-3">{i.quantite_disponible} / {i.quantite_totale}</td><td className="p-3">{i.seuil_alerte}</td><td className="p-3"><Badge variant={i.etat === "a_commander" ? "danger" : i.etat === "utilise" ? "warning" : "success"}>{i.etat.replaceAll("_", " ")}</Badge></td></tr>))}</tbody>
          </table>
        </Card>

        <Card className="premium">
          <p className="mb-2 text-sm font-medium">Historique des mouvements</p>
          <div className="space-y-2 text-sm text-muted">
            {mouvements.slice(0, 10).map((m) => (
              <p key={m.id}>{new Date(m.created_at).toLocaleString("fr-FR")} · {m.type_mouvement} · Qté {m.quantite}</p>
            ))}
          </div>
        </Card>
      </main>
    </>
  );
}
