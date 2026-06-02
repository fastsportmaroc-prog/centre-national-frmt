"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { addDays, format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, CalendarDays, FileDown, FileText, Pencil, Trash2 } from "lucide-react";
import { syncStageTerrainReservationsForStageAction } from "@/lib/actions/reservations-sync-actions";
import { syncStageLinkedViewsAction } from "@/lib/actions/stage-planning-actions";
import { StageLettreModal } from "@/components/v2/stages/StageLettreModal";
import { StageQuickEditModal } from "@/components/v2/stages/StageQuickEditModal";
import { StageHebergementSection } from "@/components/v2/stages/StageHebergementSection";
import { StageKinesitherapieSection } from "@/components/v2/stages/StageKinesitherapieSection";
import { StageParticipantsAssign } from "@/components/v2/stages/StageParticipantsAssign";
import { getStageHebergementAction } from "@/lib/actions/stage-hebergement-actions";
import { getStageRepasPrevusCountAction } from "@/lib/actions/stage-logistique-participants-actions";
import { RestaurationTab } from "@/components/v2/stages/tabs/RestaurationTab";
import { getStageDetailV2Action } from "@/lib/actions/stage-detail-actions";
import { getStageParticipantsAction } from "@/lib/actions/stage-participants-actions";
import {
  deleteLettreAction,
  listLettresByStageAction,
  regenerateLettreFilesAction,
} from "@/lib/actions/lettre-actions";
import {
  deleteLettreLocal,
  downloadBase64File,
  loadLettresLocal,
  mergeRemoteAndLocalLettres,
  saveLettreLocal,
} from "@/lib/letters/lettres-storage";
import type { LettreOfficielleRecord } from "@/lib/letters/letter-types";
import { useRole } from "@/lib/hooks/useRole";
import { V2PageHeader } from "@/components/v2/V2PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { StatusBadge } from "@/components/v2/ui/StatusBadge";
import { useToast } from "@/components/v2/ui/ToastProvider";
import { deleteStageQuickAction, updateStageQuickAction } from "@/lib/actions/stage-actions";
import {
  createRestauration,
  getPlanningByStage,
  getRestaurationByStage,
  updateRestauration,
} from "@/lib/supabase/queries";
import { exportStagePDF } from "@/lib/pdf/pdf-exports";
import { getCategoryStyle } from "@/lib/v2/category-colors";
import { computeStageBudgetEstimateMad } from "@/lib/v2/stage-budget-estimate";
import { countDaysInclusive, countNightsHebergement } from "@/lib/v2/stage-calculations";
import { useTarifsBudget } from "@/lib/v2/use-tarifs-budget";
import type {
  EntraineurV2,
  HebergementStageV2,
  JoueurV2,
  PlanningSeanceV2,
  RestaurationStageV2,
  StageProgrammeV2,
} from "@/lib/types/v2";
import { cn } from "@/lib/utils/cn";
import {
  getTerrains,
  getReservationsStageTerrains,
  supprimerReservationTerrain,
  type Creneau,
} from "@/services/terrainService";
import { getCreneauInfoForReservation } from "@/lib/v2/reservations-utils";
import {
  appendTerrainBesoinToNotes,
  stageHasTerrainsConfigured,
} from "@/lib/v2/stage-terrain-status";

type Tab =
  | "infos"
  | "participants"
  | "hebergement"
  | "restauration"
  | "terrains"
  | "kinesitherapie"
  | "budget"
  | "documents"
  | "historique";

const TABS: { id: Tab; label: string }[] = [
  { id: "infos", label: "Infos" },
  { id: "participants", label: "Participants" },
  { id: "hebergement", label: "Hébergement" },
  { id: "restauration", label: "Restauration" },
  { id: "terrains", label: "Terrains" },
  { id: "kinesitherapie", label: "Kinésithérapie" },
  { id: "budget", label: "Budget" },
  { id: "documents", label: "Documents" },
  { id: "historique", label: "Historique" },
];

function isValidStageTab(v: string | null): v is Tab {
  return Boolean(v && TABS.some((t) => t.id === v));
}

export function StageDetailV2Client({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { role, canWrite, canDelete, isAdmin } = useRole();
  const tarifsBudget = useTarifsBudget();
  const canDeleteStage = canDelete || isAdmin;
  const canLettre = role === "admin" || role === "direction" || role === "viewer" || role === "entraineur";
  const canManageParticipants =
    canWrite || role === "direction" || role === "viewer" || role === "entraineur";
  const tabFromUrl = searchParams.get("tab");
  const [tab, setTab] = useState<Tab>(isValidStageTab(tabFromUrl) ? tabFromUrl : "infos");
  const [lettreOpen, setLettreOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingLettre, setEditingLettre] = useState<LettreOfficielleRecord | null>(null);
  const [lettresStage, setLettresStage] = useState<LettreOfficielleRecord[]>([]);
  const [stage, setStage] = useState<StageProgrammeV2 | null>(null);
  const [joueurs, setJoueurs] = useState<JoueurV2[]>([]);
  const [coachs, setCoachs] = useState<EntraineurV2[]>([]);
  const [hebergement, setHebergement] = useState<HebergementStageV2 | null>(null);
  const [restauration, setRestauration] = useState<RestaurationStageV2 | null>(null);
  const [restaurationActive, setRestaurationActive] = useState(false);
  const [restDates, setRestDates] = useState<{ debut: string; fin: string }>({ debut: "", fin: "" });
  const [restMeals, setRestMeals] = useState({ pdj: true, dej: true, din: true, eau: false });
  const [savingRestauration, setSavingRestauration] = useState(false);
  const [planning, setPlanning] = useState<PlanningSeanceV2[]>([]);
  const [terrains, setTerrains] = useState<any[]>([]);
  const [terrainReservations, setTerrainReservations] = useState<any[]>([]);
  const [terrainId, setTerrainId] = useState("");
  const [terrainMode, setTerrainMode] = useState<"stage" | "dispatch">("stage");
  const [terrainCreneau, setTerrainCreneau] = useState<Creneau>("journee");
  const [terrainJours, setTerrainJours] = useState<string[]>([]);
  const [dispatchJoueurIds, setDispatchJoueurIds] = useState<string[]>([]);
  const [savingTerrain, setSavingTerrain] = useState(false);
  const [loading, setLoading] = useState(true);
  const hasLoadedOnce = useRef(false);

  const load = useCallback(async () => {
    if (!hasLoadedOnce.current) setLoading(true);
    const s = await getStageDetailV2Action(id);
    setStage(s);
    if (!s) {
      setLoading(false);
      hasLoadedOnce.current = true;
      return;
    }
    await syncStageLinkedViewsAction(id, { revalidate: false });
    const [participants, h, r, p] = await Promise.all([
      getStageParticipantsAction(id),
      getStageHebergementAction(id),
      getRestaurationByStage(id),
      getPlanningByStage(id),
    ]);
    setJoueurs(participants.joueurs);
    setCoachs(participants.coachs);
    setHebergement(h);
    setRestauration(r);
    const baseDebut = r?.date_debut ?? s.date_debut;
    const baseFin = r?.date_fin ?? s.date_fin;
    const rawNotes = r?.remarques ?? "";
    const eauTag = /\[EAU:(oui|non)\]/i.exec(rawNotes)?.[1]?.toLowerCase() === "oui";
    setRestaurationActive(Boolean(r));
    setRestDates({ debut: baseDebut, fin: baseFin });
    setRestMeals({
      pdj: r?.petit_dejeuner ?? true,
      dej: r?.dejeuner ?? true,
      din: r?.diner ?? true,
      eau: eauTag,
    });
    setPlanning(p);
    const [t, tr] = await Promise.all([
      getTerrains().catch(() => []),
      getReservationsStageTerrains(id).catch(() => []),
    ]);
    setTerrains(t);
    setTerrainReservations(tr);
    if (tr.length > 0 && !s.terrains) {
      const up = await updateStageQuickAction(id, { terrains: true });
      if (up.ok) setStage((prev) => (prev ? { ...prev, terrains: true } : prev));
    }
    if (!terrainId && t.length > 0) setTerrainId(t[0].id);
    const remoteLettres = await listLettresByStageAction(id);
    const localLettres = loadLettresLocal().filter((l) => l.stage_id === id);
    setLettresStage(mergeRemoteAndLocalLettres(remoteLettres, localLettres));
    setLoading(false);
    hasLoadedOnce.current = true;
  }, [id]);

  function toggleDispatchJoueur(joueurId: string) {
    setDispatchJoueurIds((prev) =>
      prev.includes(joueurId) ? prev.filter((id) => id !== joueurId) : [...prev, joueurId]
    );
  }

  function toggleTerrainJour(jour: string) {
    setTerrainJours((prev) => (prev.includes(jour) ? prev.filter((d) => d !== jour) : [...prev, jour]));
  }

  useEffect(() => {
    void load();
  }, [load]);

  const refreshParticipants = useCallback(
    (nextJoueurs: JoueurV2[], nextCoachs: EntraineurV2[]) => {
      setJoueurs(nextJoueurs);
      setCoachs(nextCoachs);
      setStage((prev) =>
        prev
          ? {
              ...prev,
              nombre_joueurs: nextJoueurs.length,
              nombre_encadrants: nextCoachs.length,
            }
          : prev
      );
    },
    []
  );

  useEffect(() => {
    if (tab !== "participants" || !stage?.id) return;
    let cancelled = false;
    void (async () => {
      const p = await getStageParticipantsAction(stage.id);
      if (!cancelled) refreshParticipants(p.joueurs, p.coachs);
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, stage?.id, refreshParticipants]);

  const refreshHebergement = useCallback(
    (next: HebergementStageV2 | null, stagePatch?: Pick<StageProgrammeV2, "hebergement" | "chambres">) => {
      setHebergement(next);
      if (stagePatch && stage) {
        setStage({ ...stage, ...stagePatch });
      }
    },
    [stage]
  );

  const jours = stage ? countDaysInclusive(stage.date_debut, stage.date_fin) : 0;
  const nuitsHebergement = stage
    ? countNightsHebergement(
        hebergement?.date_debut ?? stage.date_debut,
        hebergement?.date_fin ?? stage.date_fin
      )
    : 0;
  const catStyle = stage ? getCategoryStyle(stage.categorie) : null;
  const restDays = restDates.debut && restDates.fin ? countDaysInclusive(restDates.debut, restDates.fin) : 1;
  const restPersons = joueurs.length + coachs.length;
  const mealCountPerPerson = Number(restMeals.pdj) + Number(restMeals.dej) + Number(restMeals.din);
  const totalRepasCalc = restaurationActive ? restPersons * mealCountPerPerson * restDays : 0;

  const budget = useMemo(() => {
    if (!stage) {
      return { hebergement: 0, restauration: 0, terrains: 0, total: 0 };
    }
    const est = computeStageBudgetEstimateMad({
      dateDebut: stage.date_debut,
      dateFin: stage.date_fin,
      terrainsActif: stageHasTerrainsConfigured({
        id: stage.id,
        terrains: stage.terrains,
        notes: stage.notes,
        terrainReservationCount: terrainReservations.length,
      }),
      hebergement,
      restauration,
      tarifs: tarifsBudget,
    });
    return {
      hebergement: est.hebergement,
      restauration: est.restauration,
      terrains: est.terrains,
      total: est.total,
    };
  }, [hebergement, restauration, stage, tarifsBudget, terrainReservations.length]);

  const stageDays = useMemo(() => {
    if (!stage) return [] as string[];
    const startDate = parseISO(
      stage.date_debut.includes("T") ? stage.date_debut : `${stage.date_debut}T12:00:00`
    );
    const endDate = parseISO(stage.date_fin.includes("T") ? stage.date_fin : `${stage.date_fin}T12:00:00`);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return [];
    const out: string[] = [];
    let cur = startDate;
    while (cur <= endDate) {
      out.push(format(cur, "yyyy-MM-dd"));
      cur = addDays(cur, 1);
    }
    return out;
  }, [stage]);

  useEffect(() => {
    if (stageDays.length > 0) {
      setTerrainJours(stageDays);
    } else {
      setTerrainJours([]);
    }
  }, [stageDays]);

  async function handlePdf() {
    if (!stage) return;
    const terrainsOk = stageHasTerrainsConfigured({
      id: stage.id,
      terrains: stage.terrains,
      notes: stage.notes,
      terrainReservationCount: terrainReservations.length,
    });
    exportStagePDF({
      stage_action: stage.stage_action,
      categorie: stage.categorie,
      date_debut: stage.date_debut,
      date_fin: stage.date_fin,
      lieu: stage.lieu,
      statut: String(stage.statut),
      joueurs: joueurs.map((x) => `${x.prenom} ${x.nom}`),
      coachs: coachs.map((x) => `${x.prenom} ${x.nom}`),
      hebergement: stage.hebergement ? "Oui" : "Non",
      restauration: stage.restauration ? "Oui" : "Non",
      terrains: terrainsOk ? "Oui" : "Non",
      kinesitherapie: stage.kinesitherapie ? "Oui" : "Non",
    });
    toast("Fiche PDF générée", "info");
  }

  async function handleDownloadLettrePdf(l: LettreOfficielleRecord) {
    if (l.pdf_base64) {
      downloadBase64File(
        l.pdf_base64,
        "application/pdf",
        l.pdf_filename ?? `Lettre_officielle_stage_${stage?.stage_action ?? "stage"}.pdf`
      );
      return;
    }
    if (!l.input_snapshot) {
      toast("PDF indisponible. Ouvrez Modifier puis régénérez la lettre.", "warning");
      return;
    }
    const regen = await regenerateLettreFilesAction(l.input_snapshot);
    downloadBase64File(regen.pdfBase64, "application/pdf", `${regen.filenameBase}.pdf`);
    saveLettreLocal({
      ...l,
      pdf_base64: regen.pdfBase64,
      docx_base64: regen.docxBase64,
      pdf_filename: `${regen.filenameBase}.pdf`,
    });
  }

  async function handleDownloadLettreDocx(l: LettreOfficielleRecord) {
    if (l.docx_base64) {
      downloadBase64File(
        l.docx_base64,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        (l.pdf_filename ?? `Lettre_officielle_stage_${stage?.stage_action ?? "stage"}.pdf`).replace(
          /\.pdf$/i,
          ".docx"
        )
      );
      return;
    }
    if (!l.input_snapshot) {
      toast("Word indisponible. Ouvrez Modifier puis régénérez la lettre.", "warning");
      return;
    }
    const regen = await regenerateLettreFilesAction(l.input_snapshot);
    downloadBase64File(
      regen.docxBase64,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      `${regen.filenameBase}.docx`
    );
    saveLettreLocal({
      ...l,
      pdf_base64: regen.pdfBase64,
      docx_base64: regen.docxBase64,
      pdf_filename: `${regen.filenameBase}.pdf`,
    });
  }

  async function handleDeleteLettre(l: LettreOfficielleRecord) {
    const ok = confirm("Supprimer cette lettre ?");
    if (!ok) return;
    await deleteLettreAction(l.id);
    deleteLettreLocal(l.id);
    toast("Lettre supprimée", "success");
    await load();
  }

  async function saveRestaurationAndFacture() {
    if (!stage) return;
    setSavingRestauration(true);
    try {
      if (!restaurationActive) {
        setRestauration(null);
        setSavingRestauration(false);
        toast("Restauration désactivée (enregistrement local de la vue)", "info");
        return;
      }

      const remarques = `[EAU:${restMeals.eau ? "oui" : "non"}]`;
      const accurateRepas = await getStageRepasPrevusCountAction(stage.id).catch(() => 0);
      const payload = {
        stage_id: stage.id,
        petit_dejeuner: restMeals.pdj,
        dejeuner: restMeals.dej,
        diner: restMeals.din,
        date_debut: restDates.debut || stage.date_debut,
        date_fin: restDates.fin || stage.date_fin,
        nb_personnes: restPersons,
        total_repas: accurateRepas > 0 ? accurateRepas : totalRepasCalc,
        remarques,
        statut: restauration?.statut ?? "prevu",
      };

      if (restauration?.id) {
        const up = await updateRestauration(restauration.id, payload);
        if (!up.ok) throw new Error(up.error ?? "Échec mise à jour restauration");
      } else {
        const created = await createRestauration(payload);
        if (created.error) {
          if (/foreign key constraint/i.test(created.error)) {
            throw new Error(
              "Restauration non créée: liaison stage invalide en base. Ouvrez la rubrique Restauration."
            );
          }
          throw new Error(created.error);
        }
      }
      await load();
      toast("Restauration stage enregistrée", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erreur enregistrement restauration", "error");
    } finally {
      setSavingRestauration(false);
    }
  }

  async function handleCreateTerrainReservation() {
    if (!stage) return;
    if (!terrainId) {
      toast("Sélectionnez un terrain", "warning");
      return;
    }
    const creneauxEffectifs: Creneau[] = [terrainCreneau];
    if (terrainJours.length === 0) {
      toast("Sélectionnez au moins un jour du stage", "warning");
      return;
    }
    const selectedTerrain = terrains.find((t) => t.id === terrainId);
    setSavingTerrain(true);
    try {
      const besoin = {
        terrainId,
        terrainNom: selectedTerrain?.nom,
        terrainType: selectedTerrain?.type,
        terrainSurface: selectedTerrain?.surface,
        terrainCapacite: selectedTerrain?.capacite,
        jours: terrainJours,
        creneaux: creneauxEffectifs,
        mode: terrainMode,
        joueurIds: terrainMode === "dispatch" ? dispatchJoueurIds : [],
      };
      const updatedNotes = appendTerrainBesoinToNotes(stage.notes, besoin);
      const stageUp = await updateStageQuickAction(stage.id, {
        terrains: true,
        notes: updatedNotes,
      });
      if (!stageUp.ok) {
        toast(stageUp.error ?? "Notes stage non mises à jour", "error");
        return;
      }
      setStage((prev) =>
        prev ? { ...prev, terrains: true, notes: updatedNotes } : prev
      );

      const sync = await syncStageTerrainReservationsForStageAction(stage.id);
      if (sync.conflits.length > 0) {
        toast(
          `${sync.synced} réservé(s), ${sync.conflits.length} conflit(s): ${sync.conflits.join(", ")}`,
          "warning"
        );
      } else {
        toast(`${sync.synced} créneau(x) réservé(s)`, "success");
      }

      await syncStageLinkedViewsAction(stage.id);
      const [tr, p] = await Promise.all([
        getReservationsStageTerrains(stage.id).catch(() => []),
        getPlanningByStage(stage.id),
      ]);
      setTerrainReservations(tr);
      setPlanning(p);
      setTerrainCreneau("journee");
      setTerrainJours(stageDays);
      setDispatchJoueurIds([]);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erreur réservation terrain", "error");
    } finally {
      setSavingTerrain(false);
    }
  }

  async function handleDeleteTerrainReservation(reservationId: string) {
    const ok = confirm("Supprimer cette réservation terrain ?");
    if (!ok) return;
    const removed = await supprimerReservationTerrain(reservationId);
    if (!removed) {
      toast("Suppression impossible", "error");
      return;
    }
    toast("Réservation supprimée", "success");
    if (stage?.id) {
      await syncStageLinkedViewsAction(stage.id);
      const p = await getPlanningByStage(stage.id);
      setPlanning(p);
    }
    const tr = await getReservationsStageTerrains(stage?.id ?? "").catch(() => []);
    setTerrainReservations(tr);
  }

  async function handleDeleteStage() {
    if (!stage || !canDeleteStage) return;
    const ok = confirm(
      `Supprimer le stage « ${stage.stage_action} » ?\n\nToutes les données liées seront supprimées (participants, hébergement, restauration, planning, réservations terrains).`
    );
    if (!ok) return;
    const res = await deleteStageQuickAction(stage.id);
    if (!res.ok) {
      toast(res.error ?? "Suppression impossible", "error");
      return;
    }
    toast("Stage supprimé", "success");
    router.push("/v2/stages");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="space-y-4 p-4 sm:p-6">
        <div className="h-8 w-64 animate-pulse rounded bg-[var(--bg-card)]" />
        <div className="h-32 animate-pulse rounded-lg bg-[var(--bg-card)]" />
      </main>
    );
  }

  if (!stage) {
    return (
      <main className="p-6">
        <Link href="/v2/stages" className="mb-4 inline-flex items-center gap-1 text-sm text-frmt-green">
          <ArrowLeft className="h-4 w-4" /> Retour aux stages
        </Link>
        <p className="text-muted">Stage introuvable.</p>
      </main>
    );
  }

  const start = parseISO(stage.date_debut.includes("T") ? stage.date_debut : `${stage.date_debut}T12:00:00`);
  const end = parseISO(stage.date_fin.includes("T") ? stage.date_fin : `${stage.date_fin}T12:00:00`);

  return (
    <>
      <V2PageHeader
        title={stage.stage_action}
        description={`${format(start, "dd", { locale: fr })} → ${format(end, "dd MMM yyyy", { locale: fr })} · ${stage.lieu ?? "—"}`}
        actions={
          <div className="flex flex-wrap gap-2">
            {canLettre && (
              <Button
                className="gap-1"
                onClick={() => {
                  setEditingLettre(null);
                  setLettreOpen(true);
                }}
              >
                <FileText className="h-4 w-4" /> Générer lettre officielle
              </Button>
            )}
            <Button variant="secondary" className="gap-1" onClick={() => void handlePdf()}>
              <FileDown className="h-4 w-4" /> Fiche PDF
            </Button>
            <Link href={`/v2/calendrier?stage=${stage.id}`}>
              <Button variant="secondary" className="gap-1">
                <CalendarDays className="h-4 w-4" /> Calendrier
              </Button>
            </Link>
            <Link href={`/v2/planning?stage=${stage.id}`}>
              <Button variant="secondary" className="gap-1">
                <CalendarDays className="h-4 w-4" /> Planning
              </Button>
            </Link>
            {canWrite && (
              <Button variant="secondary" className="gap-1" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" /> Modifier
              </Button>
            )}
            {canDeleteStage && (
              <Button variant="danger" className="gap-1" onClick={() => void handleDeleteStage()}>
                <Trash2 className="h-4 w-4" /> Supprimer stage
              </Button>
            )}
          </div>
        }
      />
      <main className="space-y-4 p-4 sm:p-6">
        <Link
          href="/v2/stages"
          className="inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Stages
        </Link>

        <div
          className="overflow-visible rounded-lg border border-[var(--border)] bg-[var(--bg-card)]"
          style={{ borderLeftWidth: 3, borderLeftColor: catStyle?.border }}
        >
          <div className="v2-stage-detail-tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "v2-stage-detail-tab",
                  tab === t.id && "v2-stage-detail-tab--active"
                )}
              >
                {t.id === "participants"
                  ? `Participants (${joueurs.length} j · ${coachs.length} c)`
                  : t.label}
              </button>
            ))}
          </div>

          <div className="p-4">
            {tab === "infos" && (
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-[var(--text-muted)]">Catégorie</dt>
                  <dd>{stage.categorie}</dd>
                </div>
                <div>
                  <dt className="text-[var(--text-muted)]">Statut</dt>
                  <dd>
                    <StatusBadge statut={String(stage.statut)} />
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--text-muted)]">Durée</dt>
                  <dd>
                    {jours} jour{jours > 1 ? "s" : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--text-muted)]">Participants</dt>
                  <dd>
                    {joueurs.length} joueurs · {coachs.length} coachs
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--text-muted)]">Kinésithérapie</dt>
                  <dd>{stage.kinesitherapie ? "Oui" : "Non"}</dd>
                </div>
              </dl>
            )}

            {tab === "participants" && stage && (
              <StageParticipantsAssign
                stage={stage}
                joueurs={joueurs}
                coachs={coachs}
                canManage={canManageParticipants}
                onParticipantsChange={refreshParticipants}
                toast={toast}
              />
            )}

            {tab === "hebergement" && stage && (
              <StageHebergementSection
                stage={stage}
                hebergement={hebergement}
                joueurs={joueurs}
                coachs={coachs}
                nbJoueurs={joueurs.length}
                nbCoachs={coachs.length}
                canManage={canManageParticipants}
                onSaved={refreshHebergement}
                toast={toast}
              />
            )}

            {tab === "restauration" && stage && (
              <RestaurationTab
                stageId={stage.id}
                stageDateDebut={stage.date_debut}
                stageDateFin={stage.date_fin}
                active={restaurationActive}
                onActiveChange={setRestaurationActive}
                disabled={!canManageParticipants}
                toast={toast}
                legacyFooter={
                  <div className="space-y-3 border-t border-[var(--border)] pt-4">
                    <p className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                      Fiche restauration (synthèse & facturation)
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label>Date début restauration</Label>
                        <Input
                          type="date"
                          value={restDates.debut}
                          onChange={(e) => setRestDates((v) => ({ ...v, debut: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Date fin restauration</Label>
                        <Input
                          type="date"
                          value={restDates.fin}
                          onChange={(e) => setRestDates((v) => ({ ...v, fin: e.target.value }))}
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={restMeals.eau}
                        onChange={(e) => setRestMeals((m) => ({ ...m, eau: e.target.checked }))}
                      />
                      Eau incluse
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => void saveRestaurationAndFacture()}
                        disabled={savingRestauration}
                      >
                        {savingRestauration ? "Enregistrement…" : "Enregistrer fiche restauration"}
                      </Button>
                      <Link href={`/v2/restauration?stage=${stage.id}`}>
                        <Button variant="secondary">Rubrique Restauration</Button>
                      </Link>
                    </div>
                  </div>
                }
              />
            )}

            {tab === "terrains" && (
              <div className="space-y-4">
                <div className="rounded-lg border border-border p-3">
                  <p className="mb-3 text-sm font-semibold text-frmt-green">Créer une demande terrain</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Terrain</Label>
                      <select
                        className="mt-1 w-full rounded-md border border-border bg-[var(--bg-main)] px-2 py-2 text-sm"
                        value={terrainId}
                        onChange={(e) => setTerrainId(e.target.value)}
                      >
                        <option value="">Sélectionner</option>
                        {terrains.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.nom}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Mode</Label>
                      <div className="mt-2 flex gap-4 text-sm">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={terrainMode === "stage"}
                            onChange={() => setTerrainMode("stage")}
                          />
                          Stage entier
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={terrainMode === "dispatch"}
                            onChange={() => setTerrainMode("dispatch")}
                          />
                          Dispatch joueurs
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 rounded-md border border-border bg-[var(--bg-main)] p-2 text-xs">
                    <p>
                      <span className="text-muted">Stage :</span> {stage.stage_action}
                    </p>
                    <p>
                      <span className="text-muted">Période stage :</span> {stage.date_debut} → {stage.date_fin}
                    </p>
                    <p>
                      <span className="text-muted">Terrain choisi :</span>{" "}
                      {terrains.find((t) => t.id === terrainId)?.nom ?? "—"}
                    </p>
                  </div>
                  <div className="mt-3 rounded-md border border-border bg-[var(--bg-main)] p-2">
                    <p className="mb-2 text-xs text-muted">Jours à réserver (par jour)</p>
                    <div className="flex flex-wrap gap-3 text-xs">
                      {stageDays.map((jour) => (
                        <label key={jour} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={terrainJours.includes(jour)}
                            onChange={() => toggleTerrainJour(jour)}
                          />
                          {format(parseISO(`${jour}T12:00:00`), "dd/MM/yyyy", { locale: fr })}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-muted">Créneau (un seul choix)</p>
                    <div className="flex flex-wrap gap-4 text-sm">
                      {(["matin", "apres-midi", "journee"] as Creneau[]).map((c) => (
                        <label key={c} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="terrain-creneau"
                            checked={terrainCreneau === c}
                            onChange={() => setTerrainCreneau(c)}
                          />
                          {c === "matin"
                            ? "Matin (09:00-13:00)"
                            : c === "apres-midi"
                              ? "Après-midi (14:00-18:00)"
                              : "Journée complète (09:00-18:00)"}
                        </label>
                      ))}
                    </div>
                  </div>

                  {terrainMode === "dispatch" && (
                    <div className="mt-3 rounded border border-border bg-[var(--bg-main)] p-2">
                      <p className="mb-1 text-xs text-muted">Joueurs à dispatcher</p>
                      <div className="grid gap-1 sm:grid-cols-2">
                        {joueurs.map((j) => (
                          <label key={j.id} className="flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={dispatchJoueurIds.includes(j.id)}
                              onChange={() => toggleDispatchJoueur(j.id)}
                            />
                            {j.nom} {j.prenom}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-3">
                    <Button
                      type="button"
                      onClick={() => void handleCreateTerrainReservation()}
                      disabled={savingTerrain}
                    >
                      {savingTerrain ? "Réservation..." : "Créer la demande terrain"}
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="v2-data-table w-full text-sm">
                    <thead>
                      <tr>
                        <th className="p-2 text-left">Stage</th>
                        <th className="p-2 text-left">Terrain</th>
                        <th className="p-2 text-left">Date</th>
                        <th className="p-2 text-left">Période</th>
                        <th className="p-2 text-left">Créneau</th>
                        <th className="p-2 text-left">Mode</th>
                        <th className="p-2 text-left">Dispatch</th>
                        <th className="p-2 text-left">Statut</th>
                        <th className="p-2 text-left">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {terrainReservations.map((r) => (
                        <tr key={r.reservation_id}>
                          <td className="p-2">
                            {r.stage_nom ?? stage.stage_action}
                            <div className="text-xs text-muted">
                              {stage.date_debut} → {stage.date_fin}
                            </div>
                          </td>
                          <td className="p-2">{r.terrain_nom ?? "—"}</td>
                          <td className="p-2">{r.date_debut}</td>
                          <td className="p-2">
                            {r.date_debut}
                            {r.date_fin !== r.date_debut ? ` → ${r.date_fin}` : ""}
                          </td>
                          <td className="p-2">
                            {getCreneauInfoForReservation({
                              id: String(r.reservation_id),
                              infrastructure_id: String(r.terrain_id ?? ""),
                              stage_id: stage.id,
                              date_debut: String(r.date_debut).includes("T")
                                ? String(r.date_debut)
                                : `${String(r.date_debut).slice(0, 10)}T12:00:00`,
                              date_fin: String(r.date_fin).includes("T")
                                ? String(r.date_fin)
                                : `${String(r.date_fin).slice(0, 10)}T12:00:00`,
                              creneau: String(r.creneau ?? "journee").replace("apres-midi", "apres_midi"),
                              heure_debut: null,
                              heure_fin: null,
                              statut: String(r.resa_statut ?? "confirmee"),
                            }).label}
                          </td>
                          <td className="p-2">{r.mode}</td>
                          <td className="p-2">{r.nb_joueurs_dispatches ?? 0}</td>
                          <td className="p-2">
                            <StatusBadge statut={String(r.resa_statut ?? "confirme")} />
                          </td>
                          <td className="p-2">
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => void handleDeleteTerrainReservation(r.reservation_id)}
                            >
                              Supprimer
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {terrainReservations.length === 0 && (
                        <tr>
                          <td colSpan={9} className="p-4 text-center text-muted">
                            Aucune demande terrain pour ce stage.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="overflow-x-auto">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-wide text-muted">Planning généré</p>
                    <span className="flex flex-wrap gap-3">
                      <Link
                        href={`/v2/calendrier?stage=${stage.id}`}
                        className="v2-stage-detail-link hover:underline"
                      >
                        Voir dans Calendrier →
                      </Link>
                      <Link
                        href={`/v2/planning?stage=${stage.id}`}
                        className="v2-stage-detail-link hover:underline"
                      >
                        Voir dans Planning →
                      </Link>
                    </span>
                  </div>
                  <table className="v2-data-table w-full text-sm">
                    <thead>
                      <tr>
                        <th className="p-2 text-left">Date</th>
                        <th className="p-2 text-left">Horaire</th>
                        <th className="p-2 text-left">Court</th>
                        <th className="p-2 text-left">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {planning.map((p) => (
                        <tr key={p.id}>
                          <td className="p-2">{p.date}</td>
                          <td className="p-2">
                            {p.heure_debut}-{p.heure_fin}
                          </td>
                          <td className="p-2">{p.infrastructure_id ?? "—"}</td>
                          <td className="p-2">
                            <StatusBadge statut={p.statut} />
                          </td>
                        </tr>
                      ))}
                      {planning.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-muted">
                            Aucune séance planifiée
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === "kinesitherapie" && stage && (
              <StageKinesitherapieSection
                stage={stage}
                joueurs={joueurs}
                canManage={canManageParticipants}
                toast={toast}
              />
            )}

            {tab === "budget" && (
              <div className="space-y-3">
                <p className="text-xs text-muted">
                  Estimation basée sur les tarifs MAD de{" "}
                  <Link href="/v2/parametres" className="text-[var(--frmt-gold)] underline">
                    Paramètres
                  </Link>{" "}
                  et les onglets Hébergement / Restauration / Terrains de ce stage.
                </p>
              <dl className="grid max-w-md gap-2 text-sm">
                <div className="flex justify-between border-b border-[var(--border)] py-2">
                  <dt>Hébergement</dt>
                  <dd>{budget.hebergement.toLocaleString("fr-FR")} MAD</dd>
                </div>
                <div className="flex justify-between border-b border-[var(--border)] py-2">
                  <dt>Restauration</dt>
                  <dd>{budget.restauration.toLocaleString("fr-FR")} MAD</dd>
                </div>
                <div className="flex justify-between border-b border-[var(--border)] py-2">
                  <dt>Terrains</dt>
                  <dd>{budget.terrains.toLocaleString("fr-FR")} MAD</dd>
                </div>
                <div className="flex justify-between py-2 text-base font-bold">
                  <dt>Total estimé</dt>
                  <dd className="text-frmt-gold">{budget.total.toLocaleString("fr-FR")} MAD</dd>
                </div>
              </dl>
              </div>
            )}

            {tab === "documents" && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {canLettre && (
                    <Button
                      onClick={() => {
                        setEditingLettre(null);
                        setLettreOpen(true);
                      }}
                    >
                      Générer lettre officielle
                    </Button>
                  )}
                  <Button variant="secondary" onClick={() => void handlePdf()}>
                    Fiche stage PDF
                  </Button>
                  <Link href="/v2/lettres">
                    <Button variant="secondary">Toutes les lettres</Button>
                  </Link>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold">Lettres générées</h3>
                  {lettresStage.length === 0 ? (
                    <p className="text-sm text-muted">Aucune lettre pour ce stage.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-surface-elevated text-left text-muted">
                            <th className="p-2">Date</th>
                            <th className="p-2">Type</th>
                            <th className="p-2">Licences</th>
                            <th className="p-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lettresStage.map((l) => (
                            <tr key={l.id} className="border-b border-border/40">
                              <td className="p-2">{l.date_lettre}</td>
                              <td className="p-2">
                                {l.avec_hebergement ? "Avec hébergement" : "Sans hébergement"}
                              </td>
                              <td className="p-2">
                                {l.licences_complet === false ? (
                                  <span className="text-amber-400">Incomplet</span>
                                ) : (
                                  <span className="text-[var(--success)]">Complet</span>
                                )}
                              </td>
                              <td className="p-2">
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => void handleDownloadLettrePdf(l)}
                                  >
                                    PDF
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => void handleDownloadLettreDocx(l)}
                                  >
                                    Word
                                  </Button>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => {
                                      setEditingLettre(l);
                                      setLettreOpen(true);
                                    }}
                                  >
                                    Modifier
                                  </Button>
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => void handleDeleteLettre(l)}
                                  >
                                    Supprimer
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === "historique" && (
              <div className="space-y-2 text-sm">
                <p className="text-[var(--text-secondary)]">
                  Suivi des mises a jour de ce stage.
                </p>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-main)] p-3">
                  <p>
                    <span className="text-[var(--text-muted)]">Creation :</span>{" "}
                    {stage.created_at
                      ? format(new Date(stage.created_at), "dd/MM/yyyy HH:mm", { locale: fr })
                      : "—"}
                  </p>
                  <p className="mt-1">
                    <span className="text-[var(--text-muted)]">Derniere mise a jour :</span>{" "}
                    {stage.updated_at
                      ? format(new Date(stage.updated_at), "dd/MM/yyyy HH:mm", { locale: fr })
                      : "—"}
                  </p>
                  <p className="mt-1">
                    <span className="text-[var(--text-muted)]">Statut courant :</span>{" "}
                    <StatusBadge statut={String(stage.statut)} />
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {canLettre && (
        <StageLettreModal
          open={lettreOpen}
          onClose={() => {
            setLettreOpen(false);
            setEditingLettre(null);
          }}
          stage={stage}
          joueurs={joueurs}
          coachs={coachs}
          hebergement={hebergement}
          initialRecord={editingLettre}
          onGenerated={() => void load()}
        />
      )}

      <StageQuickEditModal
        stage={stage}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={(patch) => {
          setStage((prev) => (prev ? { ...prev, ...patch } : prev));
          void load();
        }}
      />
    </>
  );
}
