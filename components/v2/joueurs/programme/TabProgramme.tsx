"use client";

import { useCallback, useEffect, useState } from "react";
import { FileDown, Plus } from "lucide-react";
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
  exportProgrammationPdf,
  fetchProgrammationEvenements,
  fetchProgrammationStats,
  updateProgrammationEvenement,
} from "@/lib/programmation-joueurs/client-api";
import { FormulaireEvenement } from "@/components/v2/programmation-joueurs/FormulaireEvenement";
import { EvenementDrawer } from "@/components/v2/programmation-joueurs/EvenementDrawer";
import { ExportPdfModal } from "@/components/v2/programmation-joueurs/ExportPdfModal";
import { StatsRapidesJoueur } from "./StatsRapidesJoueur";
import { MiniCalendrierJoueur } from "./MiniCalendrierJoueur";
import { ListeEvenementsJoueur } from "./ListeEvenementsJoueur";

type Props = {
  joueur: JoueurV2;
  allJoueurs: JoueurV2[];
};

export function TabProgramme({ joueur, allJoueurs }: Props) {
  const { toast } = useToast();
  const [evenements, setEvenements] = useState<ProgrammationEvenementEnriched[]>([]);
  const [stats, setStats] = useState<ProgrammationJoueurStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editEv, setEditEv] = useState<ProgrammationEvenementEnriched | null>(null);
  const [drawerEv, setDrawerEv] = useState<ProgrammationEvenementEnriched | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatsRapidesJoueur stats={stats} loading={loading} />
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setExportOpen(true)}>
            <FileDown className="mr-1 h-4 w-4" /> Exporter PDF
          </Button>
          <Button size="sm" onClick={() => { setEditEv(null); setFormOpen(true); }}>
            <Plus className="mr-1 h-4 w-4" /> Ajouter
          </Button>
        </div>
      </div>

      <MiniCalendrierJoueur evenements={evenements} />

      <div>
        <h3 className="mb-2 text-sm font-medium">Historique & à venir</h3>
        <ListeEvenementsJoueur evenements={evenements} onEventClick={setDrawerEv} />
      </div>

      <FormulaireEvenement
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditEv(null); }}
        joueurs={allJoueurs}
        initial={editEv}
        defaultJoueurIds={[joueur.id]}
        onSubmit={handleFormSubmit}
      />

      <EvenementDrawer
        evenement={drawerEv}
        onClose={() => setDrawerEv(null)}
        onEdit={(ev) => { setEditEv(ev); setFormOpen(true); setDrawerEv(null); }}
      />

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
    </div>
  );
}
