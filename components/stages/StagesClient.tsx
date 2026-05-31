"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { CATEGORIES_STAGE, SOURCES_STAGE } from "@/lib/constants/stages";
import {
  createStageProgramme,
  deleteStageProgramme,
  duplicateStageProgramme,
  getStagesProgramme,
  updateStageProgramme,
} from "@/lib/data/stages";
import { getInfrastructures } from "@/lib/data/infrastructures";
import { getEntraineurs } from "@/lib/data/entraineurs";
import { getJoueurs } from "@/lib/data/joueurs";
import { getMateriels } from "@/lib/data/materiel";
import { StageAddForm } from "@/components/stages/StageAddForm";
import { provisionStageAfterCreate } from "@/lib/stages/provision-stage";
import {
  emptyLogistiquePack,
  embedLogistiqueInNotes,
  parseLogistiqueFromNotes,
  stripLogistiqueFromNotes,
} from "@/lib/stages/stage-logistique-serializer";
import type { StageLogistiquePack } from "@/lib/types/stage-logistique";
import type { Infrastructure } from "@/lib/types/infrastructures";
import { statutStageLabel } from "@/lib/utils/stage-automation";
import type { StageProgramme, StageProgrammeInput } from "@/lib/types/stages";
import { logHistorique } from "@/lib/audit/historique";
import { exportPdfReport, openPrintReport } from "@/lib/export/reports";
import { buildCalendrierStagesReport } from "@/lib/reports/stages-calendrier";
import { formatDate } from "@/lib/utils/dates";
import { LocalTestBadge } from "@/components/ui/LocalTestBadge";
import { isBrowserSupabaseReady, isLocalTestModeClient } from "@/lib/local-test/mode";
import { validateStageForm } from "@/lib/stages/validate-stage-form";
import { Calendar, Copy, FileDown, List, Pencil, Plus, Printer, Trash2 } from "lucide-react";

type Vue = "liste" | "mois" | "annee";

function emptyStage(): StageProgrammeInput {
  const today = new Date().toISOString().split("T")[0]!;
  return {
    id_excel: null,
    source: "FRMT",
    categorie: "U16",
    stage_action: "",
    date_debut: today,
    date_fin: today,
    nombre_joueurs: 0,
    nombre_encadrants: 0,
    hebergement: false,
    chambres: 0,
    lieu: "Centre National Rabat",
    notes: "",
    budget_prevu: null,
    budget_reel: null,
    statut: "prevu",
    infrastructure_ids: [],
    entraineur_ids: [],
    materiel_assignations: [],
  };
}

export function StagesClient() {
  const [items, setItems] = useState<StageProgramme[]>([]);
  const [vue, setVue] = useState<Vue>("liste");
  const [filtreSource, setFiltreSource] = useState("");
  const [filtreCategorie, setFiltreCategorie] = useState("");
  const [filtreMois, setFiltreMois] = useState(new Date().toISOString().slice(0, 7));
  const [filtreAnnee, setFiltreAnnee] = useState(String(new Date().getFullYear()));
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StageProgramme | null>(null);
  const [form, setForm] = useState<StageProgrammeInput>(emptyStage());
  const [infrastructures, setInfrastructures] = useState<{ id: string; nom: string }[]>([]);
  const [infraFull, setInfraFull] = useState<Infrastructure[]>([]);
  const [entraineurs, setEntraineurs] = useState<{ id: string; label: string }[]>([]);
  const [joueurs, setJoueurs] = useState<{ id: string; label: string }[]>([]);
  const [materiels, setMateriels] = useState<{ id: string; nom: string }[]>([]);
  const [logistique, setLogistique] = useState<StageLogistiquePack>(emptyLogistiquePack());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [provisionInfo, setProvisionInfo] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const stages = await getStagesProgramme();
      setItems(stages);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Impossible de charger les stages");
      setItems([]);
    }
    try {
      const [infras, coaches, mats, jlist] = await Promise.all([
        getInfrastructures(),
        getEntraineurs(),
        getMateriels(),
        getJoueurs(),
      ]);
      setInfraFull(infras);
      setInfrastructures(infras.map((i) => ({ id: i.id, nom: i.nom })));
      setEntraineurs(
        coaches.map((e) => ({ id: e.id, label: `${e.prenom} ${e.nom}` }))
      );
      setJoueurs(jlist.map((j) => ({ id: j.id, label: `${j.prenom} ${j.nom}` })));
      setMateriels(mats.map((m) => ({ id: m.id, nom: m.nom })));
    } catch {
      /* formulaire reste utilisable sans listes auxiliaires */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return items.filter((s) => {
      if (filtreSource && s.source !== filtreSource) return false;
      if (filtreCategorie && s.categorie !== filtreCategorie) return false;
      if (vue === "mois") {
        const m = filtreMois;
        return s.date_debut.slice(0, 7) <= m && s.date_fin.slice(0, 7) >= m;
      }
      if (vue === "annee") {
        return s.date_debut.startsWith(filtreAnnee) || s.date_fin.startsWith(filtreAnnee);
      }
      return true;
    });
  }, [items, filtreSource, filtreCategorie, vue, filtreMois, filtreAnnee]);

  const byMonth = useMemo(() => {
    const map = new Map<string, StageProgramme[]>();
    for (const s of filtered) {
      const key = s.date_debut.slice(0, 7);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setProvisionInfo(null);
    const validation = validateStageForm(form);
    if (!validation.ok) {
      setFormError(validation.message);
      return;
    }
    const userNotes = stripLogistiqueFromNotes(form.notes ?? null) || null;
    const notes = embedLogistiqueInNotes(userNotes, logistique);
    const payload = {
      ...form,
      lieu: form.lieu || null,
      notes,
      nombre_joueurs: logistique.joueur_ids.length || form.nombre_joueurs,
      nombre_encadrants: logistique.entraineur_ids.length || form.nombre_encadrants,
      entraineur_ids: logistique.entraineur_ids.length
        ? logistique.entraineur_ids
        : form.entraineur_ids,
      hebergement: !!logistique.hebergement?.actif,
    };
    try {
      if (editing) {
        await updateStageProgramme(editing.id, payload);
      } else {
        const created = await createStageProgramme(payload);
        const result = await provisionStageAfterCreate(created.id, logistique);
        const parts: string[] = ["Stage créé ✓"];
        if (result.hebergement_cree) parts.push("Hébergement généré ✓");
        if (result.restauration_cree) parts.push("Restauration générée ✓");
        if (result.planning_crees) parts.push("Planning créé ✓");
        if (result.reservations_crees) {
          parts.push(`${result.reservations_crees} courts réservés ✓`);
        }
        const localPrefix = created.id.startsWith("local-") ? "Mode local · " : "";
        setProvisionInfo(`${localPrefix}${parts.join(" | ")}`);
        await load();
        return;
      }
      setOpen(false);
      setEditing(null);
      setLogistique(emptyLogistiquePack());
      setForm(emptyStage());
      await load();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Impossible d'enregistrer le stage."
      );
    }
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyStage());
    setLogistique(emptyLogistiquePack());
    setFormError(null);
    setProvisionInfo(null);
    setOpen(true);
  }

  function openEdit(s: StageProgramme) {
    setEditing(s);
    const pack = parseLogistiqueFromNotes(s.notes) ?? emptyLogistiquePack();
    setLogistique({
      ...pack,
      joueur_ids: pack.joueur_ids.length ? pack.joueur_ids : [],
      entraineur_ids: pack.entraineur_ids.length ? pack.entraineur_ids : s.entraineur_ids,
    });
    setForm({
      id_excel: s.id_excel,
      source: s.source,
      categorie: s.categorie,
      stage_action: s.stage_action,
      date_debut: s.date_debut,
      date_fin: s.date_fin,
      nombre_joueurs: s.nombre_joueurs,
      nombre_encadrants: s.nombre_encadrants,
      hebergement: s.hebergement,
      chambres: s.chambres,
      lieu: s.lieu ?? "",
      notes: stripLogistiqueFromNotes(s.notes) ?? "",
      budget_prevu: s.budget_prevu,
      budget_reel: s.budget_reel,
      statut: s.statut,
      infrastructure_ids: s.infrastructure_ids,
      entraineur_ids: s.entraineur_ids,
      materiel_assignations: s.materiel_assignations,
    });
    setOpen(true);
  }

  function toggleInfra(id: string) {
    setForm((f) => ({
      ...f,
      infrastructure_ids: f.infrastructure_ids.includes(id)
        ? f.infrastructure_ids.filter((x) => x !== id)
        : [...f.infrastructure_ids, id],
    }));
  }

  function toggleCoach(id: string) {
    setForm((f) => ({
      ...f,
      entraineur_ids: f.entraineur_ids.includes(id)
        ? f.entraineur_ids.filter((x) => x !== id)
        : [...f.entraineur_ids, id],
    }));
  }

  function setMaterielQty(materielId: string, quantite: number) {
    setForm((f) => {
      const rest = f.materiel_assignations.filter((a) => a.materiel_id !== materielId);
      if (quantite <= 0) return { ...f, materiel_assignations: rest };
      return {
        ...f,
        materiel_assignations: [...rest, { materiel_id: materielId, quantite }],
      };
    });
  }

  function materielQty(materielId: string): number {
    return form.materiel_assignations.find((a) => a.materiel_id === materielId)?.quantite ?? 0;
  }

  function periodeLabel(): string | undefined {
    if (vue === "mois") {
      return new Date(filtreMois + "-01").toLocaleDateString("fr-FR", {
        month: "long",
        year: "numeric",
      });
    }
    if (vue === "annee") return `Année ${filtreAnnee}`;
    return undefined;
  }

  function filtresLabel(): string | undefined {
    const parts: string[] = [];
    if (filtreSource) parts.push(`Source : ${filtreSource}`);
    if (filtreCategorie) parts.push(`Catégorie : ${filtreCategorie}`);
    return parts.length ? parts.join(" · ") : undefined;
  }

  function buildPrintMeta() {
    return buildCalendrierStagesReport(filtered, {
      vue,
      periodeLabel: periodeLabel(),
      filtresLabel: filtresLabel(),
    });
  }

  async function imprimerCalendrier() {
    const meta = buildPrintMeta();
    await openPrintReport(meta);
    await logHistorique({
      action: "export",
      module: "stages",
      entite_id: null,
      entite_label: "Calendrier CNE",
      ancienne_valeur: null,
      nouvelle_valeur: "impression",
      commentaire: `${filtered.length} stage(s)`,
    });
  }

  async function exporterCalendrierPdf() {
    const meta = buildPrintMeta();
    const suffix =
      vue === "mois" ? filtreMois : vue === "annee" ? filtreAnnee : "liste";
    await exportPdfReport(`calendrier-cne-${suffix}.pdf`, meta);
    await logHistorique({
      action: "export",
      module: "stages",
      entite_id: null,
      entite_label: "Calendrier CNE PDF",
      ancienne_valeur: null,
      nouvelle_valeur: "PDF",
      commentaire: `${filtered.length} stage(s)`,
    });
  }

  async function handleDeleteStage(s: StageProgramme) {
    if (!confirm(`Supprimer le stage « ${s.stage_action} » et toutes les données liées ?`)) return;
    try {
      await deleteStageProgramme(s.id);
      await load();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Suppression impossible");
    }
  }

  return (
    <>
      <PageHeader
        title="Programme & stages"
        description="Calendrier CNE — import Excel FRMT · filtres · vues mensuelle et annuelle"
        actions={<LocalTestBadge />}
      />
      <main className="flex-1 space-y-4 p-4 sm:p-6">
        {loadError && !isLocalTestModeClient() && (
          <Card className="border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
            {loadError}
            <p className="mt-2 text-xs text-muted">
              Vérifiez Supabase (.env.local) et redémarrez le serveur, ou utilisez le mode local test.
            </p>
          </Card>
        )}
        {isLocalTestModeClient() && (
          <Card className="border-sky-500/30 bg-sky-500/10 p-4 text-sm text-sky-200">
            Mode local test actif — les stages sont enregistrés dans le navigateur (localStorage).
            Aucune écriture sur Supabase production.
            {!isBrowserSupabaseReady() && (
              <span className="mt-2 block text-xs">
                Astuce : redémarrez <code className="text-sky-100">npm run dev:3001</code> après
                modification de <code className="text-sky-100">.env.local</code>, ou vérifiez{" "}
                <a href="/api/health" className="underline" target="_blank" rel="noreferrer">
                  /api/health
                </a>
                .
              </span>
            )}
          </Card>
        )}
        {!loadError && items.length === 0 && (
          <Card className="p-4 text-sm text-muted">
            Aucun stage affiché. Les données en base peuvent exister — vérifiez{" "}
            <code>/api/stages/count</code> ou réimportez via Import Excel CNE.
          </Card>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant={vue === "liste" ? "primary" : "ghost"} size="sm" onClick={() => setVue("liste")}>
            <List className="h-4 w-4" />
            Liste
          </Button>
          <Button variant={vue === "mois" ? "primary" : "ghost"} size="sm" onClick={() => setVue("mois")}>
            <Calendar className="h-4 w-4" />
            Mensuelle
          </Button>
          <Button variant={vue === "annee" ? "primary" : "ghost"} size="sm" onClick={() => setVue("annee")}>
            <Calendar className="h-4 w-4" />
            Annuelle
          </Button>
          <div className="hidden sm:block w-px h-8 bg-border mx-1" aria-hidden />
          <Button
            variant="secondary"
            size="sm"
            onClick={imprimerCalendrier}
            disabled={filtered.length === 0}
            title={filtered.length === 0 ? "Aucun stage à imprimer" : undefined}
          >
            <Printer className="h-4 w-4" />
            Imprimer le calendrier
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={exporterCalendrierPdf}
            disabled={filtered.length === 0}
          >
            <FileDown className="h-4 w-4" />
            PDF
          </Button>
          <Link href="/import-cne" className="ml-auto">
            <Button variant="secondary" size="sm">
              Import Excel CNE
            </Button>
          </Link>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Ajouter stage
          </Button>
        </div>

        <Card className="flex flex-wrap gap-3 p-4">
          <div>
            <Label className="text-xs">Source</Label>
            <Select value={filtreSource} onChange={(e) => setFiltreSource(e.target.value)}>
              <option value="">Toutes</option>
              {SOURCES_STAGE.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label className="text-xs">Catégorie</Label>
            <Select value={filtreCategorie} onChange={(e) => setFiltreCategorie(e.target.value)}>
              <option value="">Toutes</option>
              {CATEGORIES_STAGE.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          {vue === "mois" && (
            <div>
              <Label className="text-xs">Mois</Label>
              <Input type="month" value={filtreMois} onChange={(e) => setFiltreMois(e.target.value)} />
            </div>
          )}
          {vue === "annee" && (
            <div>
              <Label className="text-xs">Année</Label>
              <Input
                type="number"
                min={2020}
                max={2035}
                value={filtreAnnee}
                onChange={(e) => setFiltreAnnee(e.target.value)}
              />
            </div>
          )}
        </Card>

        {vue === "liste" &&
          filtered.map((s) => (
            <StageCard
              key={s.id}
              stage={s}
              onEdit={() => openEdit(s)}
              onDuplicate={async () => {
                await duplicateStageProgramme(s.id);
                await load();
              }}
              onDelete={() => handleDeleteStage(s)}
            />
          ))}

        {vue === "mois" &&
          byMonth.map(([month, stages]) => (
            <Card key={month} className="p-4">
              <h3 className="mb-3 font-semibold capitalize">
                {new Date(month + "-01").toLocaleDateString("fr-FR", {
                  month: "long",
                  year: "numeric",
                })}
              </h3>
              <div className="space-y-2">
                {stages.map((s) => (
                  <StageCard
                    key={s.id}
                    stage={s}
                    compact
                    onEdit={() => openEdit(s)}
                    onDuplicate={async () => {
                      await duplicateStageProgramme(s.id);
                      await load();
                    }}
                    onDelete={() => handleDeleteStage(s)}
                  />
                ))}
              </div>
            </Card>
          ))}

        {vue === "annee" && (
          <Card className="p-4">
            <p className="text-sm text-muted mb-4">
              {filtered.length} stage(s) en {filtreAnnee}
            </p>
            <div className="space-y-2">
              {filtered.map((s) => (
                <StageCard
                  key={s.id}
                  stage={s}
                  compact
                  onEdit={() => openEdit(s)}
                  onDuplicate={async () => {
                    await duplicateStageProgramme(s.id);
                    await load();
                  }}
                  onDelete={() => handleDeleteStage(s)}
                />
              ))}
            </div>
          </Card>
        )}
      </main>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Modifier le stage" : "Ajouter stage"}
        panelClassName="max-w-3xl w-full"
        footer={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1 space-y-2">
              {formError && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {formError}
                </p>
              )}
              {provisionInfo && (
                <p className="rounded-lg border border-frmt-green/30 bg-frmt-green/10 px-3 py-2 text-sm text-frmt-green">
                  {provisionInfo}
                </p>
              )}
            </div>
            <div className="flex shrink-0 gap-2 justify-end">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" form="stage-add-form">
                {editing ? "Enregistrer" : "Créer stage"}
              </Button>
            </div>
          </div>
        }
      >
        <form id="stage-add-form" onSubmit={handleSubmit} className="space-y-4">
          <StageAddForm
            form={form}
            logistique={logistique}
            joueurs={joueurs}
            entraineurs={entraineurs}
            infrastructures={infraFull}
            onFormChange={setForm}
            onLogistiqueChange={setLogistique}
          />
          <div className="rounded-lg border border-border p-3 overflow-hidden">
            <Label>Matériel (optionnel)</Label>
            <div className="mt-2 space-y-2">
              {materiels.length === 0 ? (
                <p className="text-xs text-muted">Aucun matériel enregistré.</p>
              ) : (
                materiels.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 text-sm">
                    <span className="min-w-[120px]">{m.nom}</span>
                    <Input
                      type="number"
                      min={0}
                      className="w-20"
                      value={materielQty(m.id)}
                      onChange={(e) => setMaterielQty(m.id, Number(e.target.value) || 0)}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
}

function StageCard({
  stage: s,
  compact,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  stage: StageProgramme;
  compact?: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className={compact ? "p-3" : ""}>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={compact ? "text-sm font-semibold" : "font-semibold"}>{s.stage_action}</h3>
            <Badge variant="muted">{s.categorie}</Badge>
            <Badge variant="success">{s.source}</Badge>
            <Badge>{statutStageLabel(s.statut)}</Badge>
          </div>
          <p className="text-sm text-muted mt-1">
            {formatDate(s.date_debut)} → {formatDate(s.date_fin)}
            {s.id_excel ? ` · ${s.id_excel}` : ""}
          </p>
          {!compact && (
            <p className="text-sm mt-1">
              {s.nombre_joueurs} joueurs · {s.nombre_encadrants} encadrants · {s.chambres} chambres
              {s.hebergement ? " · hébergement" : ""}
            </p>
          )}
        </div>
        <div className="flex gap-1">
          <Link href={`/stages/${s.id}`}>
            <Button size="sm" variant="ghost">
              Détail
            </Button>
          </Link>
          <Button size="sm" variant="ghost" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onDuplicate}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete} title="Supprimer">
            <Trash2 className="h-4 w-4 text-red-400" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
