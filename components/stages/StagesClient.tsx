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
import { getMateriels } from "@/lib/data/materiel";
import type { StatutStage } from "@/lib/types/stages";
import { statutStageLabel } from "@/lib/utils/stage-automation";
import type { StageProgramme, StageProgrammeInput } from "@/lib/types/stages";
import { logHistorique } from "@/lib/audit/historique";
import { exportPdfReport, openPrintReport } from "@/lib/export/reports";
import { buildCalendrierStagesReport } from "@/lib/reports/stages-calendrier";
import { formatDate } from "@/lib/utils/dates";
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
    hebergement: true,
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
  const [entraineurs, setEntraineurs] = useState<{ id: string; nom: string }[]>([]);
  const [materiels, setMateriels] = useState<{ id: string; nom: string }[]>([]);

  const load = useCallback(async () => {
    const [stages, infras, coaches, mats] = await Promise.all([
      getStagesProgramme(),
      getInfrastructures(),
      getEntraineurs(),
      getMateriels(),
    ]);
    setItems(stages);
    setInfrastructures(infras.map((i) => ({ id: i.id, nom: i.nom })));
    setEntraineurs(coaches.map((e) => ({ id: e.id, nom: `${e.prenom} ${e.nom}` })));
    setMateriels(mats.map((m) => ({ id: m.id, nom: m.nom })));
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
    const payload = {
      ...form,
      lieu: form.lieu || null,
      notes: form.notes || null,
    };
    if (editing) await updateStageProgramme(editing.id, payload);
    else await createStageProgramme(payload);
    setOpen(false);
    setEditing(null);
    await load();
  }

  function openEdit(s: StageProgramme) {
    setEditing(s);
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
      notes: s.notes ?? "",
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

  return (
    <>
      <PageHeader
        title="Programme & stages"
        description="Calendrier CNE — import Excel FRMT · filtres · vues mensuelle et annuelle"
      />
      <main className="flex-1 space-y-4 p-4 sm:p-6">
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
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setForm(emptyStage());
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Nouveau stage
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
              onDelete={async () => {
                if (confirm("Supprimer ce stage ?")) {
                  await deleteStageProgramme(s.id);
                  await load();
                }
              }}
              onDuplicate={async () => {
                await duplicateStageProgramme(s.id);
                await load();
              }}
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
                    onDelete={async () => {
                      if (confirm("Supprimer ?")) {
                        await deleteStageProgramme(s.id);
                        await load();
                      }
                    }}
                    onDuplicate={async () => {
                      await duplicateStageProgramme(s.id);
                      await load();
                    }}
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
                  onDelete={async () => {
                    if (confirm("Supprimer ?")) {
                      await deleteStageProgramme(s.id);
                      await load();
                    }
                  }}
                  onDuplicate={async () => {
                    await duplicateStageProgramme(s.id);
                    await load();
                  }}
                />
              ))}
            </div>
          </Card>
        )}
      </main>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Modifier le stage" : "Nouveau stage"}
      >
        <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Stage / Action *</Label>
              <Input
                required
                value={form.stage_action}
                onChange={(e) => setForm({ ...form, stage_action: e.target.value })}
              />
            </div>
            <div>
              <Label>Source</Label>
              <Select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                {SOURCES_STAGE.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Catégorie</Label>
              <Select
                value={form.categorie}
                onChange={(e) => setForm({ ...form, categorie: e.target.value })}
              >
                {CATEGORIES_STAGE.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Date début</Label>
              <Input
                type="date"
                required
                value={form.date_debut}
                onChange={(e) => setForm({ ...form, date_debut: e.target.value })}
              />
            </div>
            <div>
              <Label>Date fin</Label>
              <Input
                type="date"
                required
                value={form.date_fin}
                onChange={(e) => setForm({ ...form, date_fin: e.target.value })}
              />
            </div>
            <div>
              <Label>Joueurs</Label>
              <Input
                type="number"
                min={0}
                value={form.nombre_joueurs}
                onChange={(e) =>
                  setForm({ ...form, nombre_joueurs: Number(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <Label>Encadrants</Label>
              <Input
                type="number"
                min={0}
                value={form.nombre_encadrants}
                onChange={(e) =>
                  setForm({ ...form, nombre_encadrants: Number(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <Label>Chambres</Label>
              <Input
                type="number"
                min={0}
                value={form.chambres}
                onChange={(e) => setForm({ ...form, chambres: Number(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Statut</Label>
              <Select
                value={form.statut}
                onChange={(e) => setForm({ ...form, statut: e.target.value as StatutStage })}
              >
                <option value="prevu">Prévu</option>
                <option value="en_cours">En cours</option>
                <option value="termine">Terminé</option>
                <option value="annule">Annulé</option>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={form.hebergement}
                onChange={(e) => setForm({ ...form, hebergement: e.target.checked })}
              />
              Hébergement requis
            </label>
            <div className="sm:col-span-2">
              <Label>Infrastructures utilisées</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {infrastructures.map((i) => (
                  <label key={i.id} className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs">
                    <input type="checkbox" checked={form.infrastructure_ids.includes(i.id)} onChange={() => toggleInfra(i.id)} />
                    {i.nom}
                  </label>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label>Entraîneurs affectés</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {entraineurs.map((e) => (
                  <label key={e.id} className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs">
                    <input type="checkbox" checked={form.entraineur_ids.includes(e.id)} onChange={() => toggleCoach(e.id)} />
                    {e.nom}
                  </label>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label>Matériel</Label>
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
          </div>
          <Button type="submit" className="w-full">
            Enregistrer
          </Button>
        </form>
      </Modal>
    </>
  );
}

function StageCard({
  stage: s,
  compact,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  stage: StageProgramme;
  compact?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
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
          <Button size="sm" variant="danger" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
