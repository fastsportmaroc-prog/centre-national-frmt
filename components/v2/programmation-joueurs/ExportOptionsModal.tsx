"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import type { ProgrammationPdfType } from "@/lib/types/programmation-joueurs";
import {
  endOfMonth,
  endOfYear,
  format,
  startOfMonth,
  startOfYear,
} from "date-fns";

type Props = {
  open: boolean;
  onClose: () => void;
  joueurCount: number;
  onConfirm: (opts: {
    typePdf: ProgrammationPdfType;
    dateDebut: string;
    dateFin: string;
    includeResultats: boolean;
    includePoints: boolean;
    includeClassement: boolean;
  }) => Promise<void>;
};

export function ExportOptionsModal({ open, onClose, joueurCount, onConfirm }: Props) {
  const now = new Date();
  const [periode, setPeriode] = useState<"mois" | "annee" | "plage">("mois");
  const [typePdf, setTypePdf] = useState<ProgrammationPdfType>("mensuel");
  const [dateDebut, setDateDebut] = useState(format(startOfMonth(now), "yyyy-MM-dd"));
  const [dateFin, setDateFin] = useState(format(endOfMonth(now), "yyyy-MM-dd"));
  const [includeResultats, setIncludeResultats] = useState(true);
  const [includePoints, setIncludePoints] = useState(true);
  const [includeClassement, setIncludeClassement] = useState(true);
  const [loading, setLoading] = useState(false);

  function applyPeriode(p: "mois" | "annee" | "plage") {
    setPeriode(p);
    if (p === "mois") {
      setTypePdf("mensuel");
      setDateDebut(format(startOfMonth(now), "yyyy-MM-dd"));
      setDateFin(format(endOfMonth(now), "yyyy-MM-dd"));
    } else if (p === "annee") {
      setTypePdf("annuel");
      setDateDebut(format(startOfYear(now), "yyyy-MM-dd"));
      setDateFin(format(endOfYear(now), "yyyy-MM-dd"));
    } else {
      setTypePdf(joueurCount > 1 ? "multi" : "plage");
    }
  }

  async function handleExport() {
    setLoading(true);
    try {
      const pdfType =
        joueurCount > 1 && periode !== "annee" && typePdf !== "annuel" ? "multi" : typePdf;
      await onConfirm({
        typePdf: pdfType,
        dateDebut,
        dateFin,
        includeResultats,
        includePoints,
        includeClassement,
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
      title="Options d'export PDF"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button disabled={loading} onClick={() => void handleExport()}>
            {loading ? "Génération…" : "Générer PDF"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>Période</Label>
          <Select value={periode} onChange={(e) => applyPeriode(e.target.value as typeof periode)}>
            <option value="mois">Ce mois</option>
            <option value="annee">Cette année</option>
            <option value="plage">Plage personnalisée</option>
          </Select>
        </div>
        {periode === "plage" && (
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
        )}
        <div>
          <Label>Format</Label>
          <Select
            value={typePdf}
            onChange={(e) => setTypePdf(e.target.value as ProgrammationPdfType)}
          >
            <option value="mensuel">Programme détaillé (mensuel)</option>
            <option value="annuel">Vue annuelle synthétique</option>
            <option value="plage">Programme sur plage</option>
            {joueurCount > 1 && <option value="multi">Comparatif multi-joueurs</option>}
          </Select>
        </div>
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={includeResultats}
              onChange={(e) => setIncludeResultats(e.target.checked)}
            />
            Inclure résultats si disponibles
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={includePoints}
              onChange={(e) => setIncludePoints(e.target.checked)}
            />
            Inclure points ATP/WTA
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={includeClassement}
              onChange={(e) => setIncludeClassement(e.target.checked)}
            />
            Inclure classement période
          </label>
        </div>
      </div>
    </Modal>
  );
}
