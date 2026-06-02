"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { V2PageHeader } from "@/components/v2/V2PageHeader";
import { V2PageActions } from "@/components/v2/V2PageActions";
import { ExportPdfButton } from "@/components/v2/ui/ExportPdfButton";
import { StageDashboardCard as StageCard } from "@/components/v2/dashboard/StageDashboardCard";
import { StageQuickEditModal } from "@/components/v2/stages/StageQuickEditModal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Input, Label, Select } from "@/components/ui/Input";
import { NumericInput } from "@/components/ui/NumericInput";
import { CategorySelect } from "@/components/v2/ui/CategorySelect";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/v2/ui/EmptyState";
import { StatusBadge } from "@/components/v2/ui/StatusBadge";
import { createStageComplet, deleteStageQuickAction, updateStageQuickAction } from "@/lib/actions/stage-actions";
import { syncStageTerrainReservationsForStageAction } from "@/lib/actions/reservations-sync-actions";
import { syncStageLinkedViewsAction } from "@/lib/actions/stage-planning-actions";
import {
  getEntraineurs,
  getJoueurs,
  getJoueursByStage,
  getEntraineursByStage,
} from "@/lib/supabase/queries";
import { exportStagePDF, exportStagesLogistiquePDF } from "@/lib/pdf/pdf-exports";
import { emptyStageForm } from "@/lib/v2/form-defaults";
import { loadAllStageCards, type StageDashboardCard } from "@/lib/v2/dashboard-data";
import { getCategoryStyle } from "@/lib/v2/category-colors";
import { useDebounced } from "@/lib/hooks/useDebounced";
import { matchesParticipantSearch } from "@/lib/v2/global-search";
import {
  suggestedChambresCounts,
  totalChambresFromForm,
} from "@/lib/v2/stage-hebergement-form";
import {
  calcTotalRepas,
  countDaysInclusive,
  countNightsHebergement,
} from "@/lib/v2/stage-calculations";
import type { CreateStageCompletResult, StageCompletFormData, StageProgrammeV2 } from "@/lib/types/v2";
import { saveLettreLocal, downloadBase64File } from "@/lib/letters/lettres-storage";
import { useToast } from "@/components/v2/ui/ToastProvider";
import { ConfirmDialog } from "@/components/v2/ui/ConfirmDialog";
import { LayoutGrid, List, Plus, Search, Trophy, Trash2 } from "lucide-react";
import { useRole } from "@/lib/hooks/useRole";
import { useAuth } from "@/components/auth/AuthProvider";
import { getTerrains, type Creneau, type TerrainBesoin } from "@/services/terrainService";

type StageFilter = "tous" | "avenir" | "encours" | "termine" | "annule";
type ViewMode = "grid" | "list";
const PAGE_SIZE = 20;

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export function StagesV2Client() {
  const { toast } = useToast();
  const { canWrite, canDelete } = useRole();
  const { user } = useAuth();
  const [deleteTarget, setDeleteTarget] = useState<StageProgrammeV2 | null>(null);
  const [editTarget, setEditTarget] = useState<StageProgrammeV2 | null>(null);
  const [stages, setStages] = useState<StageDashboardCard[]>([]);
  const [joueurs, setJoueurs] = useState<Awaited<ReturnType<typeof getJoueurs>>>([]);
  const [entraineurs, setEntraineurs] = useState<Awaited<ReturnType<typeof getEntraineurs>>>([]);
  const [open, setOpen] = useState(false);
  const [terrains, setTerrains] = useState<any[]>([]);
  const [terrainsBesoins, setTerrainsBesoins] = useState<TerrainBesoin[]>([]);
  const [view, setView] = useState<ViewMode>("grid");
  const [filter, setFilter] = useState<StageFilter>("tous");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search);
  const [joueurSearch, setJoueurSearch] = useState("");
  const [entraineurSearch, setEntraineurSearch] = useState("");
  const [dispatchJoueurSearch, setDispatchJoueurSearch] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<StageCompletFormData>(() => emptyStageForm());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createResult, setCreateResult] = useState<CreateStageCompletResult | null>(null);

  const loadParticipants = useCallback(async () => {
    const [j, e] = await Promise.all([getJoueurs(), getEntraineurs()]);
    setJoueurs(j);
    setEntraineurs(e);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [s, t] = await Promise.all([
      loadAllStageCards(),
      getTerrains().catch(() => []),
    ]);
    setStages(s);
    setTerrains(t);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const refresh = () => void load();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") refresh();
    });
    return () => {
      window.removeEventListener("focus", refresh);
    };
  }, [load]);

  const today = new Date().toISOString().slice(0, 10);

  const filtered = useMemo(() => {
    let list = [...stages];
    const q = debouncedSearch.trim().toLowerCase();
    if (q) list = list.filter((s) => s.stage_action.toLowerCase().includes(q) || s.categorie.toLowerCase().includes(q));
    if (filter === "annule") list = list.filter((s) => s.statut === "annule");
    else if (filter === "termine") list = list.filter((s) => s.statut === "termine" || s.date_fin < today);
    else if (filter === "encours")
      list = list.filter((s) => s.statut !== "annule" && s.date_debut <= today && s.date_fin >= today);
    else if (filter === "avenir") list = list.filter((s) => s.statut !== "annule" && s.date_debut > today);
    return list;
  }, [stages, debouncedSearch, filter, today]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const totalParticipants = form.joueur_ids.length + form.entraineur_ids.length;
  const stageJoueurs = useMemo(
    () => joueurs.filter((j) => form.joueur_ids.includes(j.id)),
    [joueurs, form.joueur_ids]
  );

  const filteredJoueursPick = useMemo(() => {
    const q = joueurSearch.trim();
    return joueurs.filter(
      (j) =>
        form.joueur_ids.includes(j.id) ||
        matchesParticipantSearch(q, j.prenom, j.nom, j.club, j.licence, j.categorie, j.ipin)
    );
  }, [joueurs, joueurSearch, form.joueur_ids]);

  const filteredEntraineursPick = useMemo(() => {
    const q = entraineurSearch.trim();
    return entraineurs.filter(
      (e) =>
        form.entraineur_ids.includes(e.id) ||
        matchesParticipantSearch(q, e.prenom, e.nom, e.specialite, e.email)
    );
  }, [entraineurs, entraineurSearch, form.entraineur_ids]);

  const filteredDispatchJoueurs = useMemo(() => {
    const q = dispatchJoueurSearch.trim();
    if (!q) return stageJoueurs;
    return stageJoueurs.filter((j) =>
      matchesParticipantSearch(q, j.prenom, j.nom, j.club, j.licence)
    );
  }, [stageJoueurs, dispatchJoueurSearch]);
  const joursResto = countDaysInclusive(
    form.restauration.date_debut || form.date_debut,
    form.restauration.date_fin || form.date_fin
  );
  const totalRepas = form.restauration.actif
    ? calcTotalRepas(form.restauration, totalParticipants, joursResto)
    : 0;
  const nbChambres = form.hebergement.actif ? totalChambresFromForm(form.hebergement) : 0;
  const nbNuitsHeb = form.hebergement.actif
    ? countNightsHebergement(
        form.hebergement.date_debut || form.date_debut,
        form.hebergement.date_fin || form.date_fin
      )
    : 0;

  useEffect(() => {
    setForm((prev) => {
      const first = terrainsBesoins[0];
      const firstCreneau = first?.creneaux[0];
      const selectedById = new Map(terrains.map((t) => [t.id, t]));
      const selected = terrainsBesoins
        .map((b) => selectedById.get(b.terrainId))
        .filter(Boolean) as any[];
      const hasFitness = selected.some((t) => t.type === "salle-fitness");
      const hasNatation = selected.some((t) => t.type === "piscine");
      const hasPhysique = selected.some((t) => t.type === "gymnase");
      return {
        ...prev,
        terrains: {
          ...prev.terrains,
          actif: terrainsBesoins.length > 0,
          nb_courts: Math.max(1, terrainsBesoins.length),
          creneau:
            firstCreneau === "apres-midi"
              ? "apres_midi"
              : firstCreneau === "journee"
                ? "journee"
                : firstCreneau === "matin"
                  ? "matin"
                  : "journee",
          surface: "indifferent",
          fitness: hasFitness,
          natation: hasNatation,
          espace_physique: hasPhysique,
        },
      };
    });
  }, [terrainsBesoins, terrains]);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    setMessage(null);
    const terrainMeta =
      terrainsBesoins.length > 0
        ? `[TERRAINS_BESOINS:${JSON.stringify(terrainsBesoins)}]`
        : "";
    const payload = {
      ...form,
      notes: [form.notes.trim(), terrainMeta].filter(Boolean).join(" ").trim(),
    };
    const result = await createStageComplet(payload);
    setSaving(false);
    if (!result.success) {
      const msg = result.erreurs.join(" · ") || "Échec création stage";
      setError(msg);
      toast(msg, "error");
      return;
    }
    setMessage(result.message ?? "Stage créé");
    toast(result.message ?? "Stage créé");

    if (result.stage_id && terrainsBesoins.length > 0) {
      const sync = await syncStageTerrainReservationsForStageAction(result.stage_id);
      if (sync.conflits.length > 0) {
        toast(
          `${sync.synced} terrain(s) réservé(s). ${sync.conflits.length} conflit(s) : ${sync.conflits.join(", ")}`,
          "warning"
        );
      } else if (sync.synced > 0) {
        toast(`${sync.synced} terrain(s) réservé(s) avec succès !`, "success");
      }
      await syncStageLinkedViewsAction(result.stage_id);
      await load();
    } else if (result.stage_id) {
      await syncStageLinkedViewsAction(result.stage_id);
      await load();
    }

    setOpen(false);
    setCreateResult(result);
    if (result.lettre_generee && result.lettre_id) {
      saveLettreLocal({
        id: result.lettre_id,
        stage_id: result.stage_id!,
        stage_nom: form.stage_action,
        club_destinataire: form.lettre.club_destinataire,
        date_lettre: new Date().toISOString().slice(0, 10),
        type: form.lettre.type,
        avec_hebergement: form.hebergement.actif,
        avec_terrains: form.terrains.actif,
        participants: [],
        exceptions_hebergement: form.lettre.exceptions,
        statut: "generee",
        created_at: new Date().toISOString(),
        pdf_base64: result.lettre_pdf_base64,
        docx_base64: result.lettre_docx_base64,
      });
    }
    setForm(emptyStageForm());
    setTerrainsBesoins([]);
    await load();
  }

  const getTerrain = useCallback(
    (id: string) => terrainsBesoins.find((b) => b.terrainId === id),
    [terrainsBesoins]
  );

  const toggleTerrain = useCallback((id: string) => {
    const selectedTerrain = terrains.find((t) => t.id === id);
    setTerrainsBesoins((prev) =>
      prev.find((b) => b.terrainId === id)
        ? prev.filter((b) => b.terrainId !== id)
        : [
            ...prev,
            {
              terrainId: id,
              terrainNom: selectedTerrain?.nom,
              terrainType: selectedTerrain?.type,
              terrainSurface: selectedTerrain?.surface,
              terrainCapacite: selectedTerrain?.capacite,
              creneaux: ["journee"],
              mode: "stage",
              joueurIds: [],
            },
          ]
    );
  }, [terrains]);

  const toggleCreneau = useCallback((terrainId: string, creneau: Creneau) => {
    setTerrainsBesoins((prev) =>
      prev.map((b) =>
        b.terrainId !== terrainId
          ? b
          : {
              ...b,
              creneaux: b.creneaux.includes(creneau)
                ? b.creneaux.filter((c) => c !== creneau)
                : creneau === "journee"
                  ? ["journee"]
                  : [...b.creneaux.filter((c) => c !== "journee"), creneau],
            }
      )
    );
  }, []);

  const setMode = useCallback((terrainId: string, mode: "stage" | "dispatch") => {
    setTerrainsBesoins((prev) =>
      prev.map((b) => (b.terrainId !== terrainId ? b : { ...b, mode, joueurIds: [] }))
    );
  }, []);

  const toggleJoueurDispatch = useCallback((terrainId: string, joueurId: string) => {
    setTerrainsBesoins((prev) =>
      prev.map((b) =>
        b.terrainId !== terrainId
          ? b
          : {
              ...b,
              joueurIds: b.joueurIds?.includes(joueurId)
                ? b.joueurIds.filter((id) => id !== joueurId)
                : [...(b.joueurIds ?? []), joueurId],
            }
      )
    );
  }, []);

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const res = await deleteStageQuickAction(deleteTarget.id);
    if (!res.ok) {
      toast(res.error ?? "Suppression impossible", "error");
      return;
    }
    toast("Stage supprimé");
    setDeleteTarget(null);
    await load();
  }

  async function handleExportPdf(stage: StageDashboardCard) {
    const [j, e] = await Promise.all([
      getJoueursByStage(stage.id),
      getEntraineursByStage(stage.id),
    ]);
    await exportStagePDF({
      stage_action: stage.stage_action,
      categorie: stage.categorie,
      date_debut: stage.date_debut,
      date_fin: stage.date_fin,
      lieu: stage.lieu,
      statut: String(stage.statut),
      joueurs: j.map((x) => `${x.prenom} ${x.nom}`),
      coachs: e.map((x) => `${x.prenom} ${x.nom}`),
      hebergement: stage.hebergement ? "Oui" : "Non",
      restauration: stage.restauration ? "Oui" : "Non",
      terrains: stage.has_terrains ? "Oui" : "Non",
    });
  }

  function yesNo(v: boolean): string {
    return v ? "Oui" : "Non";
  }

  function toDateIso(value: string): string {
    return value.includes("T") ? value : `${value}T12:00:00`;
  }

  async function handleExportLogistiquePdf() {
    const rows = filtered.map((s) => ({
      stage: s.stage_action,
      categorie: s.categorie,
      dates: `${format(parseISO(toDateIso(s.date_debut)), "dd/MM/yyyy")} - ${format(parseISO(toDateIso(s.date_fin)), "dd/MM/yyyy")}`,
      duree: `${s.jours_duree} j`,
      joueurs: String(s.nb_joueurs),
      coachs: String(s.nb_coachs),
      chambres: String(s.chambres ?? 0),
      hebergement: yesNo(Boolean(s.has_hebergement)),
      terrains: yesNo(Boolean(s.has_terrains)),
    }));

    const totals = rows.reduce(
      (acc, r) => ({
        joueurs: acc.joueurs + Number(r.joueurs),
        coachs: acc.coachs + Number(r.coachs),
        chambres: acc.chambres + Number(r.chambres),
      }),
      { joueurs: 0, coachs: 0, chambres: 0 }
    );

    const periodeLabel =
      filtered.length > 0 ?
        `Du ${format(parseISO(toDateIso(filtered[0]!.date_debut)), "dd/MM/yyyy")} au ${format(parseISO(toDateIso(filtered[filtered.length - 1]!.date_fin)), "dd/MM/yyyy")}`
      : "Aucune période";

    await exportStagesLogistiquePDF({ rows, totals, periodeLabel });
  }

  function toggleId(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  function openCreateStage() {
    if (!canWrite) {
      toast("Vous n'avez pas les droits pour créer un stage", "error");
      return;
    }
    setForm(emptyStageForm());
    setTerrainsBesoins([]);
    setCreateResult(null);
    setError(null);
    setMessage(null);
    setJoueurSearch("");
    setEntraineurSearch("");
    setDispatchJoueurSearch("");
    void loadParticipants();
    setOpen(true);
  }

  useEffect(() => {
    if (!open || joueurs.length > 0) return;
    void loadParticipants();
  }, [open, joueurs.length, loadParticipants]);

  return (
    <>
      <V2PageHeader
        title={`Stages (${stages.length})`}
        description="Création complète — source de toutes les automatisations"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={openCreateStage}>
              <Plus className="mr-1 h-4 w-4" />
              Créer un stage
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView(view === "grid" ? "list" : "grid")}
              title={view === "grid" ? "Vue liste" : "Vue grille"}
            >
              {view === "grid" ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
            </Button>
            <V2PageActions
              canAdd={false}
              onExportPdf={() => {
                if (stages.length === 0) return;
                void handleExportPdf(stages[0]!);
              }}
              extra={
                <ExportPdfButton
                  onExport={handleExportLogistiquePdf}
                  label="Exporter PDF Logistique"
                />
              }
            />
          </div>
        }
      />
      <main className="space-y-4 p-4 sm:p-6">
        {message && (
          <Card className="border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
            {message}
          </Card>
        )}

        <Card className="space-y-3 p-4">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["tous", "Tous"],
                ["avenir", "À venir"],
                ["encours", "En cours"],
                ["termine", "Terminés"],
                ["annule", "Annulés"],
              ] as const
            ).map(([id, label]) => (
              <Button
                key={id}
                size="sm"
                variant={filter === id ? "primary" : "secondary"}
                onClick={() => setFilter(id)}
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                className="pl-9"
                placeholder="Rechercher…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button type="button" variant="secondary" onClick={openCreateStage}>
              <Plus className="mr-1 h-4 w-4" />
              Créer un stage
            </Button>
          </div>
        </Card>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-lg bg-[var(--bg-card)]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="Aucun stage planifié"
            description="Créez votre premier stage pour alimenter hébergement, restauration, planning et terrains."
            actionLabel="Créer un stage"
            onAction={openCreateStage}
          />
        ) : view === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 frmt-stagger-list">
            {paged.map((s) => (
              <div key={s.id} className="frmt-stagger-item flex h-full min-h-0">
                <StageCard
                  stage={s}
                  onPdf={() => void handleExportPdf(s)}
                  onEdit={canWrite ? () => setEditTarget(s) : undefined}
                />
              </div>
            ))}
          </div>
        ) : (
          <Card className="overflow-x-auto">
            <table className="v2-data-table w-full text-sm">
              <thead>
                <tr>
                  <th className="p-3 text-left">Stage</th>
                  <th className="p-3 text-left">Catégorie</th>
                  <th className="p-3 text-left">Dates</th>
                  <th className="p-3 text-left">Dur.</th>
                  <th className="p-3 text-left">Part.</th>
                  <th className="p-3 text-left">Statut</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {paged.map((s) => {
                  const cat = getCategoryStyle(s.categorie);
                  const start = parseISO(s.date_debut.includes("T") ? s.date_debut : `${s.date_debut}T12:00:00`);
                  const end = parseISO(s.date_fin.includes("T") ? s.date_fin : `${s.date_fin}T12:00:00`);
                  return (
                    <tr key={s.id} style={{ borderLeft: `3px solid ${cat.border}` }}>
                      <td className="p-3">
                        <Link
                          href={`/v2/stages/${encodeURIComponent(s.id)}`}
                          className="font-medium hover:text-frmt-green"
                        >
                          {s.stage_action}
                        </Link>
                      </td>
                      <td className="p-3">{s.categorie}</td>
                      <td className="p-3">
                        {format(start, "dd/MM", { locale: fr })}-{format(end, "dd/MM", { locale: fr })}
                      </td>
                      <td className="p-3">{s.jours_duree}j</td>
                      <td className="p-3 tabular-nums whitespace-nowrap">
                        {s.nb_joueurs} j · {s.nb_coachs} c
                      </td>
                      <td className="p-3">
                        <StatusBadge statut={String(s.statut)} />
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          {canWrite && (
                            <Button variant="secondary" size="sm" onClick={() => setEditTarget(s)}>
                              Modifier
                            </Button>
                          )}
                          <Button variant="secondary" size="sm" onClick={() => void handleExportPdf(s)}>
                            PDF
                          </Button>
                          {canDelete && (
                            <Button variant="danger" size="sm" onClick={() => setDeleteTarget(s)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}

        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Précédent
            </Button>
            <span className="text-sm text-muted">
              Page {page + 1} / {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Suivant
            </Button>
          </div>
        )}
      </main>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Nouveau stage complet"
        panelClassName="max-w-3xl max-h-[90vh]"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button disabled={saving || !form.stage_action} onClick={() => void handleSubmit()}>
              {saving ? "Enregistrement…" : "Créer le stage"}
            </Button>
          </div>
        }
      >
        <div className="max-h-[60vh] space-y-6 overflow-y-auto pr-1">
          {error && <p className="text-sm text-red-400">{error}</p>}

          <section className="space-y-3">
            <h3 className="font-semibold">A. Infos générales</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Nom du stage</Label>
                <Input
                  value={form.stage_action}
                  onChange={(e) => setForm({ ...form, stage_action: e.target.value })}
                />
              </div>
              <div>
                <Label>Catégorie</Label>
                <CategorySelect
                  value={form.categorie}
                  onChange={(categorie) => setForm({ ...form, categorie })}
                />
              </div>
              <div>
                <Label>Statut</Label>
                <Select
                  value={form.statut}
                  onChange={(e) =>
                    setForm({ ...form, statut: e.target.value as StageCompletFormData["statut"] })
                  }
                >
                  <option value="prevu">Prévu</option>
                  <option value="confirme">Confirmé</option>
                  <option value="termine">Terminé</option>
                  <option value="annule">Annulé</option>
                </Select>
              </div>
              <div>
                <Label>Date début</Label>
                <Input
                  type="date"
                  value={form.date_debut}
                  onChange={(e) => setForm({ ...form, date_debut: e.target.value })}
                />
              </div>
              <div>
                <Label>Date fin</Label>
                <Input
                  type="date"
                  value={form.date_fin}
                  onChange={(e) => setForm({ ...form, date_fin: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Lieu</Label>
                <Input value={form.lieu} onChange={(e) => setForm({ ...form, lieu: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Notes</Label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="font-semibold">B. Participants</h3>
            <p className="text-xs text-muted">
              Total : {form.joueur_ids.length} joueurs · {form.entraineur_ids.length} entraîneurs ·{" "}
              {totalParticipants} participants
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border p-2">
                <p className="mb-2 text-xs font-medium text-muted">
                  Joueurs ({form.joueur_ids.length} sélectionné
                  {form.joueur_ids.length !== 1 ? "s" : ""})
                </p>
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                  <Input
                    className="h-8 pl-8 text-sm"
                    placeholder="Rechercher joueur (nom, club, licence…)"
                    value={joueurSearch}
                    onChange={(e) => setJoueurSearch(e.target.value)}
                  />
                </div>
                <div className="max-h-48 space-y-1 overflow-y-auto">
                  {filteredJoueursPick.length === 0 ? (
                    <p className="py-2 text-xs text-muted">Aucun joueur trouvé</p>
                  ) : (
                    filteredJoueursPick.map((j) => (
                      <label key={j.id} className="flex gap-2 rounded px-1 py-0.5 text-sm hover:bg-white/5">
                        <input
                          type="checkbox"
                          checked={form.joueur_ids.includes(j.id)}
                          onChange={() =>
                            setForm({ ...form, joueur_ids: toggleId(form.joueur_ids, j.id) })
                          }
                        />
                        <span className="min-w-0 flex-1">
                          {j.prenom} {j.nom}
                          {j.club ? (
                            <span className="ml-1 text-xs text-muted">· {j.club}</span>
                          ) : null}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div className="rounded-lg border border-border p-2">
                <p className="mb-2 text-xs font-medium text-muted">
                  Entraîneurs ({form.entraineur_ids.length} sélectionné
                  {form.entraineur_ids.length !== 1 ? "s" : ""})
                </p>
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                  <Input
                    className="h-8 pl-8 text-sm"
                    placeholder="Rechercher entraîneur…"
                    value={entraineurSearch}
                    onChange={(e) => setEntraineurSearch(e.target.value)}
                  />
                </div>
                <div className="max-h-48 space-y-1 overflow-y-auto">
                  {filteredEntraineursPick.length === 0 ? (
                    <p className="py-2 text-xs text-muted">Aucun entraîneur trouvé</p>
                  ) : (
                    filteredEntraineursPick.map((e) => (
                      <label key={e.id} className="flex gap-2 rounded px-1 py-0.5 text-sm hover:bg-white/5">
                        <input
                          type="checkbox"
                          checked={form.entraineur_ids.includes(e.id)}
                          onChange={() =>
                            setForm({
                              ...form,
                              entraineur_ids: toggleId(form.entraineur_ids, e.id),
                            })
                          }
                        />
                        {e.prenom} {e.nom}
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <Toggle
              label="C. Hébergement"
              checked={form.hebergement.actif}
              onChange={(v) => setForm({ ...form, hebergement: { ...form.hebergement, actif: v } })}
            />
            {form.hebergement.actif && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Type chambre joueurs</Label>
                  <Select
                    value={form.hebergement.type_chambre_joueurs}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        hebergement: {
                          ...form.hebergement,
                          type_chambre_joueurs: e.target.value as "single" | "double" | "triple",
                        },
                      })
                    }
                  >
                    <option value="single">Single</option>
                    <option value="double">Double</option>
                    <option value="triple">Triple</option>
                  </Select>
                </div>
                <div>
                  <Label>Type chambre entraîneurs</Label>
                  <Select
                    value={form.hebergement.type_chambre_coachs}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        hebergement: {
                          ...form.hebergement,
                          type_chambre_coachs: e.target.value as "single" | "double",
                        },
                      })
                    }
                  >
                    <option value="single">Single</option>
                    <option value="double">Double</option>
                  </Select>
                </div>
                <div>
                  <Label>Nombre de chambres joueurs</Label>
                  <NumericInput
                    value={form.hebergement.nb_chambres_joueurs}
                    onChange={(nb_chambres_joueurs) =>
                      setForm({
                        ...form,
                        hebergement: { ...form.hebergement, nb_chambres_joueurs },
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Nombre de chambres staff</Label>
                  <NumericInput
                    value={form.hebergement.nb_chambres_coachs}
                    onChange={(nb_chambres_coachs) =>
                      setForm({
                        ...form,
                        hebergement: { ...form.hebergement, nb_chambres_coachs },
                      })
                    }
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const counts = suggestedChambresCounts(
                        form.joueur_ids.length,
                        form.entraineur_ids.length,
                        form.hebergement
                      );
                      setForm({
                        ...form,
                        hebergement: { ...form.hebergement, ...counts },
                      });
                    }}
                  >
                    Recalculer selon participants
                  </Button>
                  <p className="text-sm text-muted">
                    Total : <strong>{nbChambres}</strong> chambre{nbChambres !== 1 ? "s" : ""} ·{" "}
                    <strong>{nbNuitsHeb}</strong> nuit{nbNuitsHeb !== 1 ? "s" : ""} ·{" "}
                    <strong>{nbChambres * nbNuitsHeb}</strong> nuitées
                  </p>
                </div>
                <Toggle
                  label="Kitchenette"
                  checked={form.hebergement.kitchenette}
                  onChange={(v) =>
                    setForm({ ...form, hebergement: { ...form.hebergement, kitchenette: v } })
                  }
                />
              </div>
            )}
          </section>

          <section className="space-y-3">
            <Toggle
              label="D. Restauration"
              checked={form.restauration.actif}
              onChange={(v) => setForm({ ...form, restauration: { ...form.restauration, actif: v } })}
            />
            {form.restauration.actif && (
              <div className="flex flex-wrap gap-3">
                <Toggle
                  label="Petit-déjeuner"
                  checked={form.restauration.petit_dejeuner}
                  onChange={(v) =>
                    setForm({ ...form, restauration: { ...form.restauration, petit_dejeuner: v } })
                  }
                />
                <Toggle
                  label="Déjeuner"
                  checked={form.restauration.dejeuner}
                  onChange={(v) =>
                    setForm({ ...form, restauration: { ...form.restauration, dejeuner: v } })
                  }
                />
                <Toggle
                  label="Dîner"
                  checked={form.restauration.diner}
                  onChange={(v) =>
                    setForm({ ...form, restauration: { ...form.restauration, diner: v } })
                  }
                />
                <Badge variant="success">Total repas : {totalRepas}</Badge>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <Toggle
              label="E. Terrains"
              checked={form.terrains.actif}
              onChange={(v) => {
                setForm({ ...form, terrains: { ...form.terrains, actif: v } });
                if (!v) setTerrainsBesoins([]);
              }}
            />
            {form.terrains.actif && (
              <div className="space-y-4">
                <p className="text-xs text-muted">
                  Sélectionnez les terrains et créneaux à réserver pour ce stage.
                </p>
                {(["court-tennis", "salle-fitness", "piscine", "gymnase"] as const).map((type) => {
                  const groupe = terrains.filter((t) => t.type === type);
                  if (!groupe.length) return null;
                  const iconByType: Record<string, string> = {
                    "court-tennis": "🎾",
                    "salle-fitness": "🏋️",
                    piscine: "🏊",
                    gymnase: "🏃",
                  };
                  const labelByType: Record<string, string> = {
                    "court-tennis": "Courts de Tennis",
                    "salle-fitness": "Espace Physique",
                    piscine: "Espace Natation",
                    gymnase: "Salle de Gym",
                  };
                  return (
                    <div key={type} className="space-y-2">
                      <p className="text-xs font-semibold uppercase text-muted">
                        {iconByType[type]} {labelByType[type]}
                      </p>
                      {groupe.map((terrain) => {
                        const besoin = getTerrain(terrain.id);
                        const actif = !!besoin;
                        return (
                          <div
                            key={terrain.id}
                            className={`rounded-lg border p-3 ${
                              actif
                                ? "border-frmt-green bg-frmt-green/5"
                                : "border-border bg-[var(--bg-card)]"
                            }`}
                          >
                            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                              <input
                                type="checkbox"
                                checked={actif}
                                onChange={() => toggleTerrain(terrain.id)}
                              />
                              <span>{terrain.nom}</span>
                              <span className="text-xs font-normal text-muted">
                                — {terrain.surface ?? "—"} · {terrain.capacite ?? "—"} joueurs max
                              </span>
                            </label>

                            {actif && (
                              <div className="mt-3 space-y-3 pl-5">
                                <div className="flex flex-wrap gap-4 text-sm">
                                  {(["matin", "apres-midi", "journee"] as Creneau[]).map((c) => (
                                    <label key={c} className="flex cursor-pointer items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={besoin!.creneaux.includes(c)}
                                        onChange={() => toggleCreneau(terrain.id, c)}
                                      />
                                      <span>
                                        {c === "matin"
                                          ? "☀️ Matin (09:00-13:00)"
                                          : c === "apres-midi"
                                            ? "🌤 Après-midi (14:00-18:00)"
                                            : "🌞 Journée complète (09:00-18:00)"}
                                      </span>
                                    </label>
                                  ))}
                                </div>

                                <div className="flex flex-wrap gap-5 text-sm">
                                  <label className="flex cursor-pointer items-center gap-2">
                                    <input
                                      type="radio"
                                      checked={besoin!.mode === "stage"}
                                      onChange={() => setMode(terrain.id, "stage")}
                                    />
                                    📋 Réserver pour tout le stage
                                  </label>
                                  <label className="flex cursor-pointer items-center gap-2">
                                    <input
                                      type="radio"
                                      checked={besoin!.mode === "dispatch"}
                                      onChange={() => setMode(terrain.id, "dispatch")}
                                    />
                                    👥 Dispatcher des joueurs spécifiques
                                  </label>
                                </div>

                                {besoin!.mode === "dispatch" && (
                                  <div className="rounded-md border border-border bg-[var(--bg-main)] p-3">
                                    <p className="mb-2 text-xs text-muted">
                                      Sélectionnez les joueurs à affecter sur ce terrain :
                                    </p>
                                    {stageJoueurs.length > 4 && (
                                      <div className="relative mb-2">
                                        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                                        <Input
                                          className="h-8 pl-8 text-xs"
                                          placeholder="Rechercher joueur…"
                                          value={dispatchJoueurSearch}
                                          onChange={(e) => setDispatchJoueurSearch(e.target.value)}
                                        />
                                      </div>
                                    )}
                                    <div className="grid max-h-36 gap-1 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                                      {filteredDispatchJoueurs.map((j) => (
                                        <label
                                          key={j.id}
                                          className="flex cursor-pointer items-center gap-2 text-xs"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={besoin!.joueurIds?.includes(j.id)}
                                            onChange={() => toggleJoueurDispatch(terrain.id, j.id)}
                                          />
                                          {j.prenom} {j.nom}
                                        </label>
                                      ))}
                                    </div>
                                    <p className="mt-2 text-xs italic text-frmt-green">
                                      {besoin!.joueurIds?.length ?? 0} joueur(s) sélectionné(s)
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
                <div className="rounded border border-border bg-[var(--bg-main)] p-2 text-xs text-muted">
                  {terrainsBesoins.length} infrastructure(s) sélectionnée(s)
                </div>
              </div>
            )}
          </section>

          <section className="space-y-3 rounded-lg border border-border p-3">
            <p className="text-sm font-semibold text-frmt-green">G. Lettre officielle (optionnel)</p>
            <div>
              <Label>Club destinataire</Label>
              <Input
                value={form.lettre.club_destinataire}
                onChange={(e) =>
                  setForm({ ...form, lettre: { ...form.lettre, club_destinataire: e.target.value } })
                }
              />
            </div>
            <div>
              <Label>Lieu d&apos;envoi</Label>
              <Input
                value={form.lettre.lieu_envoi}
                onChange={(e) =>
                  setForm({ ...form, lettre: { ...form.lettre, lieu_envoi: e.target.value } })
                }
              />
            </div>
            {form.hebergement.actif && (
              <div className="space-y-2">
                <p className="text-xs text-muted">Exceptions hébergement (dates / kitchenette)</p>
                {form.lettre.exceptions.map((ex, idx) => (
                  <Card key={idx} className="grid gap-2 p-2 sm:grid-cols-2">
                    <Select
                      value={`${ex.personne_type}:${ex.personne_id}`}
                      onChange={(e) => {
                        const [personne_type, personne_id] = e.target.value.split(":") as [
                          "joueur" | "entraineur",
                          string,
                        ];
                        const next = [...form.lettre.exceptions];
                        next[idx] = { ...ex, personne_type, personne_id };
                        setForm({ ...form, lettre: { ...form.lettre, exceptions: next } });
                      }}
                    >
                      <option value="">Personne</option>
                      {entraineurs.map((c) => (
                        <option key={c.id} value={`entraineur:${c.id}`}>
                          Coach {c.prenom} {c.nom}
                        </option>
                      ))}
                      {joueurs.map((j) => (
                        <option key={j.id} value={`joueur:${j.id}`}>
                          {j.prenom} {j.nom}
                        </option>
                      ))}
                    </Select>
                    <Input
                      type="date"
                      value={ex.date_debut ?? ""}
                      onChange={(e) => {
                        const next = [...form.lettre.exceptions];
                        next[idx] = { ...ex, date_debut: e.target.value };
                        setForm({ ...form, lettre: { ...form.lettre, exceptions: next } });
                      }}
                    />
                    <Input
                      type="date"
                      value={ex.date_fin ?? ""}
                      onChange={(e) => {
                        const next = [...form.lettre.exceptions];
                        next[idx] = { ...ex, date_fin: e.target.value };
                        setForm({ ...form, lettre: { ...form.lettre, exceptions: next } });
                      }}
                    />
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={!!ex.kitchenette}
                        onChange={(e) => {
                          const next = [...form.lettre.exceptions];
                          next[idx] = { ...ex, kitchenette: e.target.checked };
                          setForm({ ...form, lettre: { ...form.lettre, exceptions: next } });
                        }}
                      />
                      Kitchenette
                    </label>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        const next = form.lettre.exceptions.filter((_, i) => i !== idx);
                        setForm({ ...form, lettre: { ...form.lettre, exceptions: next } });
                      }}
                    >
                      Retirer
                    </Button>
                  </Card>
                ))}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setForm({
                      ...form,
                      lettre: {
                        ...form.lettre,
                        exceptions: [
                          ...form.lettre.exceptions,
                          { personne_id: "", personne_type: "entraineur" },
                        ],
                      },
                    })
                  }
                >
                  + Ajouter exception
                </Button>
              </div>
            )}
          </section>

        </div>
      </Modal>

      <Modal
        open={!!createResult?.success}
        onClose={() => setCreateResult(null)}
        title="Stage créé — récapitulatif"
      >
        {createResult && (
          <div className="space-y-3 text-sm">
            <ul className="space-y-1">
              <li>✓ Stage créé</li>
              {createResult.hebergement_cree && <li>✓ Hébergement généré</li>}
              {createResult.restauration_creee && <li>✓ Restauration générée</li>}
              {createResult.seances_creees > 0 && <li>✓ Planning créé</li>}
              {createResult.lettre_generee && <li>✓ Lettre officielle générée</li>}
            </ul>
            {createResult.lettre_generee && createResult.lettre_pdf_base64 && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() =>
                    downloadBase64File(
                      createResult.lettre_pdf_base64!,
                      "application/pdf",
                      `${createResult.lettre_filename_base ?? "lettre"}.pdf`
                    )
                  }
                >
                  📄 Télécharger la lettre PDF
                </Button>
                {createResult.lettre_docx_base64 && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      downloadBase64File(
                        createResult.lettre_docx_base64!,
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                        `${createResult.lettre_filename_base ?? "lettre"}.docx`
                      )
                    }
                  >
                    📝 Télécharger la lettre Word
                  </Button>
                )}
              </div>
            )}
            {createResult.erreurs.length > 0 && (
              <p className="text-xs text-amber-400">{createResult.erreurs.join(" · ")}</p>
            )}
          </div>
        )}
      </Modal>

      <StageQuickEditModal
        stage={editTarget}
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => void load()}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Supprimer le stage"
        description={
          deleteTarget
            ? `« ${deleteTarget.stage_action} » et toutes les données liées (hébergement, restauration, planning, terrains) seront supprimées.`
            : ""
        }
        onConfirm={() => void handleDeleteConfirm()}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
