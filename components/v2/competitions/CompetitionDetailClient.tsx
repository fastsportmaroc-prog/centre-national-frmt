"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, FileDown, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/v2/ui/StatusBadge";
import { useToast } from "@/components/v2/ui/ToastProvider";
import { ConfirmDialog } from "@/components/v2/ui/ConfirmDialog";
import type { CompetitionListItem } from "@/lib/types/competition";
import {
  statutCompetitionBadge,
  statutCompetitionLabel,
  visasRequisLabel,
} from "@/lib/competitions/utils";
import { exportListePdf } from "@/lib/pdf/pdf-exports";
import { cn } from "@/lib/utils/cn";
import { TabInfos } from "@/app/competitions/[id]/components/TabInfos";
import { TabParticipants } from "@/app/competitions/[id]/components/TabParticipants";
import { TabPasseportsVisas } from "@/app/competitions/[id]/components/TabPasseportsVisas";
import { TabBilletsAvion } from "@/app/competitions/[id]/components/TabBilletsAvion";
import { TabTextiles } from "@/app/competitions/[id]/components/TabTextiles";
import { TabDocuments } from "@/app/competitions/[id]/components/TabDocuments";
import { TabHistorique } from "@/app/competitions/[id]/components/TabHistorique";

type TabId =
  | "infos"
  | "participants"
  | "passeports"
  | "billets"
  | "textiles"
  | "documents"
  | "historique";

const TABS: { id: TabId; label: string }[] = [
  { id: "infos", label: "Infos" },
  { id: "participants", label: "Participants" },
  { id: "passeports", label: "Passeports & Visas" },
  { id: "billets", label: "Billets Avion" },
  { id: "textiles", label: "Textiles" },
  { id: "documents", label: "Documents" },
  { id: "historique", label: "Historique" },
];

export function CompetitionDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab: TabId =
    tabParam === "billets" ||
    tabParam === "participants" ||
    tabParam === "passeports" ||
    tabParam === "textiles" ||
    tabParam === "documents" ||
    tabParam === "historique"
      ? tabParam
      : "infos";
  const { toast } = useToast();
  const [tab, setTab] = useState<TabId>(initialTab);
  const [competition, setCompetition] = useState<CompetitionListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [participantsRefreshKey, setParticipantsRefreshKey] = useState(0);
  const hasLoadedOnce = useRef(false);

  const load = useCallback(async () => {
    if (!hasLoadedOnce.current) setLoading(true);
    const res = await fetch(`/api/competitions/${id}`);
    const json = await res.json();
    if (!res.ok || !json.competition) {
      setCompetition(null);
      toast(json.error ?? "Compétition introuvable", "error");
    } else {
      setCompetition(json.competition);
    }
    setLoading(false);
    hasLoadedOnce.current = true;
  }, [id, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCompetitionChanged = useCallback(() => {
    void load();
    setParticipantsRefreshKey((k) => k + 1);
  }, [load]);

  function handlePdf() {
    if (!competition) return;
    exportListePdf(
      `Fiche compétition — ${competition.nom}`,
      ["Champ", "Valeur"],
      [
        ["Nom", competition.nom],
        ["Catégorie", competition.categorie],
        ["Dates", `${competition.date_debut} → ${competition.date_fin}`],
        ["Lieu", competition.lieu ?? "—"],
        ["Participants", String(competition.nb_participants)],
        ["Statut", statutCompetitionLabel(competition.statut_affichage)],
        ["Visas", visasRequisLabel(competition.visas_requis ?? false)],
      ],
      `competition-${competition.id}.pdf`
    );
    toast("Fiche PDF générée", "info");
  }

  async function handleDelete() {
    const res = await fetch(`/api/competitions/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json();
      toast(json.error ?? "Suppression impossible", "error");
      return;
    }
    toast("Compétition supprimée", "success");
    router.push("/competitions");
  }

  if (loading) {
    return <p className="p-6 text-sm text-muted">Chargement…</p>;
  }

  if (!competition) {
    return (
      <main className="p-6">
        <Link href="/competitions" className="text-sm text-[#3498db] hover:underline">
          ← Retour aux compétitions
        </Link>
        <p className="mt-4 text-muted">Compétition introuvable.</p>
      </main>
    );
  }

  const statut = competition.statut_affichage;
  const visasRequis = competition.visas_requis ?? false;
  const start = parseISO(competition.date_debut);
  const end = parseISO(competition.date_fin);

  return (
    <>
      <div className="border-b border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 sm:px-6">
        <Link
          href="/competitions"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Compétitions
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">{competition.nom}</h1>
            <p className="mt-1 text-sm text-muted">
              {format(start, "dd MMM", { locale: fr })} → {format(end, "dd MMM yyyy", { locale: fr })} ·{" "}
              {competition.lieu ?? "—"} · {competition.categorie}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge statut={statutCompetitionBadge(statut)} />
              <span className="text-xs text-muted">{statutCompetitionLabel(statut)}</span>
              <span
                className={
                  visasRequis
                    ? "rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-200"
                    : "rounded-full border border-[var(--border)] bg-[var(--bg-main)] px-2 py-0.5 text-xs text-muted"
                }
              >
                {visasRequisLabel(visasRequis)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => toast("Lettre : utilisez le module Lettres avec les infos stage/compétition", "info")}>
              <FileText className="mr-1 h-4 w-4" />
              Générer lettre officielle
            </Button>
            <Button variant="secondary" onClick={handlePdf}>
              <FileDown className="mr-1 h-4 w-4" />
              Fiche PDF
            </Button>
            <Button variant="secondary" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="mr-1 h-4 w-4" />
              Supprimer
            </Button>
          </div>
        </div>
        <nav className="mt-4 flex gap-1 overflow-x-auto border-t border-[var(--border)] pt-3">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-1.5 text-sm",
                tab === t.id
                  ? "bg-frmt-green/20 font-medium text-frmt-green"
                  : "text-muted hover:bg-[var(--bg-main)]"
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <main className="p-4 sm:p-6">
        {tab === "infos" && (
          <TabInfos competition={competition} onUpdated={handleCompetitionChanged} />
        )}
        {tab === "participants" && (
          <TabParticipants
            competitionId={id}
            dateFin={competition.date_fin}
            visasRequis={visasRequis}
            refreshKey={participantsRefreshKey}
            onChanged={handleCompetitionChanged}
          />
        )}
        {tab === "passeports" && (
          <TabPasseportsVisas
            competitionId={id}
            dateFin={competition.date_fin}
            visasRequis={visasRequis}
            refreshKey={participantsRefreshKey}
          />
        )}
        {tab === "billets" && competition && (
          <TabBilletsAvion
            competitionId={id}
            competitionNom={competition.nom}
            dateFin={competition.date_fin}
          />
        )}
        {tab === "textiles" && competition && (
          <TabTextiles competitionId={id} dateFin={competition.date_fin} />
        )}
        {tab === "documents" && <TabDocuments competitionId={id} />}
        {tab === "historique" && <TabHistorique competitionId={id} />}
      </main>

      <ConfirmDialog
        open={confirmDelete}
        title="Supprimer cette compétition ?"
        description="Cette action est irréversible (participants, documents liés)."
        confirmLabel="Supprimer"
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
