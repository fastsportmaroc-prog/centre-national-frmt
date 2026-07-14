"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileDown, FileSpreadsheet, Plus } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/v2/ui/ToastProvider";
import type { JoueurV2 } from "@/lib/types/v2";
import type {
  CreateProgrammationPayload,
  ProgrammationEvenementEnriched,
  ProgrammationEvenementInput,
  ProgrammationJoueurStats,
} from "@/lib/types/programmation-joueurs";
import {
  createProgrammationEvenements,
  exportProgrammationCneExcel,
  exportProgrammationCnePdf,
  exportProgrammationPdf,
  fetchProgrammationEvenements,
  fetchProgrammationStats,
  updateProgrammationEvenement,
} from "@/lib/programmation-joueurs/client-api";
import { FormulaireEvenement } from "@/components/v2/programmation-joueurs/FormulaireEvenement";
import { EvenementDrawer } from "@/components/v2/programmation-joueurs/EvenementDrawer";
import { ExportPdfModal } from "@/components/v2/programmation-joueurs/ExportPdfModal";
import { useUserPermissions } from "@/lib/hooks/useUserPermissions";
import { StatsRapidesJoueur } from "./StatsRapidesJoueur";
import { MiniCalendrierJoueur } from "./MiniCalendrierJoueur";
import { ListeEvenementsJoueur } from "./ListeEvenementsJoueur";

type Props = {
  joueur: JoueurV2;
  allJoueurs: JoueurV2[];
};

export function TabProgramme({ joueur, allJoueurs }: Props) {
  const { toast } = useToast();
  const { planningCne, canViewJoueur } = useUserPermissions();
  const [evenements, setEvenements] = useState<ProgrammationEvenementEnriched[]>([]);
  const [stats, setStats] = useState<ProgrammationJoueurStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editEv, setEditEv] = useState<ProgrammationEvenementEnriched | null>(null);
  const [drawerEv, setDrawerEv] = useState<ProgrammationEvenementEnriched | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportingCne, setExportingCne] = useState(false);

  const monthRange = useMemo(() => {
    const now = new Date();
    return {
      start: format(startOfMonth(now), "yyyy-MM-dd"),
      end: format(endOfMonth(now), "yyyy-MM-dd"),
    };
  }, []);

  const canViewThisJoueur = canViewJoueur(joueur);
  const canExportThisJoueur =
    planningCne.canExport &&
    canViewThisJoueur &&
    (!planningCne.selfOnly || planningCne.selfJoueurId === joueur.id);

  const refresh = useCallback(async () => {
    setLoading(true);
    const year = new Date().getFullYear();
    const [evRes, stRes] = await Promise.all([
      fetchProgrammationEvenements({ joueurId: joueur.id }),
      fetchProgrammationStats(joueur.id, year),
    ]);
    setEvenements(evRes.evenements);
    setStats(stRes.stats);
    setLoading(false);
  }, [joueur.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleFormSubmit(
    payload: CreateProgrammationPayload | Partial<ProgrammationEvenementInput>,
    isEdit: boolean,
    id?: string
  ) {
    if (isEdit && id) {
      const { error } = await updateProgrammationEvenement(id, payload);
      if (error) { toast(error, "error"); return; }
      toast("Événement mis à jour", "success");
    } else {
      const { error } = await createProgrammationEvenements({
        ...(payload as CreateProgrammationPayload),
        joueur_ids: [joueur.id],
      });
      if (error) { toast(error, "error"); return; }
      toast("Événement créé", "success");
    }
    await refresh();
  }

  async function handleExportCne(kind: "pdf" | "excel") {
    setExportingCne(true);
    try {
      const opts = {
        dateDebut: monthRange.start,
        dateFin: monthRange.end,
        columnIds: [joueur.id],
        displayMode: "joueurs" as const,
      };
      if (kind === "pdf") await exportProgrammationCnePdf(opts);
      else await exportProgrammationCneExcel(opts);
      toast(kind === "pdf" ? "PDF CNE téléchargé" : "Excel CNE téléchargé", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erreur export", "error");
    } finally {
      setExportingCne(false);
    }
  }

  if (!canViewThisJoueur) {
    return (
      <p className="text-sm text-[var(--text-secondary)]">
        Vous n&apos;avez pas accès au programme de ce joueur.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatsRapidesJoueur stats={stats} loading={loading} />
        <div className="flex flex-wrap gap-2">
          {canExportThisJoueur && (
            <>
              <Button
                size="sm"
                variant="secondary"
                disabled={exportingCne}
                onClick={() => void handleExportCne("pdf")}
              >
                <FileDown className="mr-1 h-4 w-4" />
                {exportingCne ? "Export…" : "PDF CNE"}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={exportingCne}
                onClick={() => void handleExportCne("excel")}
              >
                <FileSpreadsheet className="mr-1 h-4 w-4" />
                Excel CNE
              </Button>
            </>
          )}
          {canExportThisJoueur && !planningCne.selfOnly && (
            <Button size="sm" variant="secondary" onClick={() => setExportOpen(true)}>
              <FileDown className="mr-1 h-4 w-4" /> PDF déplacements
            </Button>
          )}
          {planningCne.canManageEvents && (
            <Button size="sm" onClick={() => { setEditEv(null); setFormOpen(true); }}>
              <Plus className="mr-1 h-4 w-4" /> Ajouter
            </Button>
          )}
        </div>
      </div>

      <MiniCalendrierJoueur evenements={evenements} />

      <div>
        <h3 className="mb-2 text-sm font-medium">Historique & à venir</h3>
        <ListeEvenementsJoueur evenements={evenements} onEventClick={setDrawerEv} />
      </div>

      {planningCne.canManageEvents && (
        <FormulaireEvenement
          open={formOpen}
          onClose={() => { setFormOpen(false); setEditEv(null); }}
          joueurs={allJoueurs}
          initial={editEv}
          defaultJoueurIds={[joueur.id]}
          onSubmit={handleFormSubmit}
        />
      )}

      <EvenementDrawer
        evenement={drawerEv}
        onClose={() => setDrawerEv(null)}
        onEdit={
          planningCne.canManageEvents
            ? (ev) => { setEditEv(ev); setFormOpen(true); setDrawerEv(null); }
            : undefined
        }
      />

      {!planningCne.selfOnly && (
        <ExportPdfModal
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          joueurs={[joueur]}
          defaultSelectedIds={[joueur.id]}
          onConfirm={async (opts) => {
            await exportProgrammationPdf(opts);
            toast("PDF téléchargé", "success");
          }}
        />
      )}
    </div>
  );
}
