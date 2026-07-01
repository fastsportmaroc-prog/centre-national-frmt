"use client";

import { useEffect, useState } from "react";
import {
  addMonths,
  endOfMonth,
  endOfYear,
  format,
  startOfMonth,
  startOfYear,
} from "date-fns";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import type { JoueurV2 } from "@/lib/types/v2";
import { getJoueurDisplayCategorie } from "@/lib/utils/joueur";

type Props = {
  open: boolean;
  onClose: () => void;
  joueurs: JoueurV2[];
  defaultSelectedIds?: string[];
  onConfirm: (opts: {
    joueurIds: string[];
    dateDebut: string;
    dateFin: string;
  }) => Promise<void>;
};

export function ExportPdfModal({ open, onClose, joueurs, defaultSelectedIds, onConfirm }: Props) {
  const now = new Date();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dateDebut, setDateDebut] = useState(format(startOfMonth(now), "yyyy-MM-dd"));
  const [dateFin, setDateFin] = useState(format(endOfMonth(now), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected(new Set(defaultSelectedIds?.length ? defaultSelectedIds : joueurs.map((j) => j.id)));
      setDateDebut(format(startOfMonth(now), "yyyy-MM-dd"));
      setDateFin(format(endOfMonth(now), "yyyy-MM-dd"));
    }
  }, [open, defaultSelectedIds, joueurs]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function applyPeriode(p: "mois" | "mois_suivant" | "annee") {
    if (p === "mois") {
      setDateDebut(format(startOfMonth(now), "yyyy-MM-dd"));
      setDateFin(format(endOfMonth(now), "yyyy-MM-dd"));
    } else if (p === "mois_suivant") {
      const next = addMonths(now, 1);
      setDateDebut(format(startOfMonth(next), "yyyy-MM-dd"));
      setDateFin(format(endOfMonth(next), "yyyy-MM-dd"));
    } else {
      setDateDebut(format(startOfYear(now), "yyyy-MM-dd"));
      setDateFin(format(endOfYear(now), "yyyy-MM-dd"));
    }
  }

  async function handleExport() {
    if (!selected.size) return;
    setLoading(true);
    try {
      await onConfirm({
        joueurIds: [...selected],
        dateDebut,
        dateFin,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Exporter le planning des déplacements"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button disabled={loading || !selected.size} onClick={() => void handleExport()}>
            {loading ? "Génération…" : "Télécharger le PDF"}
          </Button>
        </div>
      }
    >
      <p className="mb-4 text-sm text-[var(--text-secondary)]">
        Tableau par semaine : pour chaque joueur, où il se trouve (Maroc ou pays à l&apos;étranger).
      </p>

      <div className="space-y-4">
        <div>
          <Label className="mb-2 block">Joueurs</Label>
          <div className="mb-2 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" type="button" onClick={() => setSelected(new Set(joueurs.map((j) => j.id)))}>
              Tous
            </Button>
            <Button size="sm" variant="secondary" type="button" onClick={() => setSelected(new Set())}>
              Aucun
            </Button>
          </div>
          <p className="mb-2 text-xs text-[var(--text-secondary)]">
            {selected.size} joueur{selected.size > 1 ? "s" : ""} sélectionné{selected.size > 1 ? "s" : ""}
          </p>
          <div className="max-h-48 space-y-1 overflow-y-auto rounded border border-[var(--border)] p-2">
            {joueurs.map((j) => (
              <label
                key={j.id}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-[var(--bg-hover)]"
              >
                <input type="checkbox" checked={selected.has(j.id)} onChange={() => toggle(j.id)} />
                <span className="text-sm">
                  {j.prenom} {j.nom}
                </span>
                <span className="ml-auto text-xs text-[var(--text-secondary)]">
                  {getJoueurDisplayCategorie(j)}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Période</Label>
          <div className="mb-3 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" type="button" onClick={() => applyPeriode("mois")}>
              Ce mois
            </Button>
            <Button size="sm" variant="secondary" type="button" onClick={() => applyPeriode("mois_suivant")}>
              Mois prochain
            </Button>
            <Button size="sm" variant="secondary" type="button" onClick={() => applyPeriode("annee")}>
              Cette année
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Du</Label>
              <Input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
            </div>
            <div>
              <Label>Au</Label>
              <Input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
