"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addMonths,
  endOfMonth,
  endOfQuarter,
  endOfYear,
  format,
  startOfMonth,
  startOfQuarter,
  startOfYear,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import type { JoueurV2 } from "@/lib/types/v2";
import type { ProgrammationPdfTypeLetter } from "@/lib/types/programmation-joueurs";
import type { ProgrammationPdfOptions } from "@/lib/pdf/programmation/types";
import { ExportTypeCard } from "./ExportTypeCard";
import { getJoueurDisplayCategorie } from "@/lib/utils/joueur";
import { cn } from "@/lib/utils/cn";

type Props = {
  open: boolean;
  onClose: () => void;
  joueurs: JoueurV2[];
  defaultSelectedIds?: string[];
  onConfirm: (opts: {
    joueurIds: string[];
    dateDebut: string;
    dateFin: string;
    typePdf: ProgrammationPdfTypeLetter;
    options: ProgrammationPdfOptions;
  }) => Promise<void>;
};

const STEPS = ["Joueurs", "Période", "Type PDF", "Options"];

const PDF_TYPES: ProgrammationPdfTypeLetter[] = ["A", "B", "C", "D", "E"];

export function ExportPdfModal({ open, onClose, joueurs, defaultSelectedIds, onConfirm }: Props) {
  const now = new Date();
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dateDebut, setDateDebut] = useState(format(startOfMonth(now), "yyyy-MM-dd"));
  const [dateFin, setDateFin] = useState(format(endOfMonth(now), "yyyy-MM-dd"));
  const [typePdf, setTypePdf] = useState<ProgrammationPdfTypeLetter>("A");
  const [options, setOptions] = useState<ProgrammationPdfOptions>({
    inclurePhoto: true,
    inclureResultats: true,
    inclurePoints: true,
    inclurePrizeMoney: true,
    langue: "fr",
    orientation: "auto",
  });
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(0);
      setSelected(new Set(defaultSelectedIds?.length ? defaultSelectedIds : joueurs.map((j) => j.id)));
    }
  }, [open, defaultSelectedIds, joueurs]);

  const selectedList = useMemo(() => joueurs.filter((j) => selected.has(j.id)), [joueurs, selected]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(joueurs.map((j) => j.id)));
  }

  function selectNone() {
    setSelected(new Set());
  }

  function selectSeniors() {
    setSelected(
      new Set(
        joueurs
          .filter((j) => {
            const c = getJoueurDisplayCategorie(j).toLowerCase();
            return c.includes("elite") || c.includes("pro") || c.includes("senior");
          })
          .map((j) => j.id)
      )
    );
  }

  function selectJuniors() {
    setSelected(
      new Set(
        joueurs
          .filter((j) => {
            const c = getJoueurDisplayCategorie(j).toLowerCase();
            return /u\d|junior|jeune/.test(c);
          })
          .map((j) => j.id)
      )
    );
  }

  function applyPeriode(p: "mois" | "mois_suivant" | "trimestre" | "annee") {
    if (p === "mois") {
      setDateDebut(format(startOfMonth(now), "yyyy-MM-dd"));
      setDateFin(format(endOfMonth(now), "yyyy-MM-dd"));
      setTypePdf("A");
    } else if (p === "mois_suivant") {
      const next = addMonths(now, 1);
      setDateDebut(format(startOfMonth(next), "yyyy-MM-dd"));
      setDateFin(format(endOfMonth(next), "yyyy-MM-dd"));
      setTypePdf("A");
    } else if (p === "trimestre") {
      setDateDebut(format(startOfQuarter(now), "yyyy-MM-dd"));
      setDateFin(format(endOfQuarter(now), "yyyy-MM-dd"));
      setTypePdf("B");
    } else if (p === "annee") {
      setDateDebut(format(startOfYear(now), "yyyy-MM-dd"));
      setDateFin(format(endOfYear(now), "yyyy-MM-dd"));
      setTypePdf("C");
    }
  }

  const effectiveType = useMemo(() => {
    if (selected.size === 1 && typePdf === "E") return "D" as ProgrammationPdfTypeLetter;
    if (selected.size > 1 && typePdf === "D") return "A" as ProgrammationPdfTypeLetter;
    return typePdf;
  }, [selected.size, typePdf]);

  async function handleGenerate() {
    if (!selected.size) return;
    setLoading(true);
    try {
      await onConfirm({
        joueurIds: [...selected],
        dateDebut,
        dateFin,
        typePdf: effectiveType,
        options: {
          ...options,
          orientation:
            options.orientation === "auto"
              ? effectiveType === "D"
                ? "portrait"
                : "auto"
              : options.orientation,
        },
      });
      onClose();
    } finally {
      setLoading(false);
    }
  }

  const canNext = step === 0 ? selected.size > 0 : true;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Exporter PDF — Programmation Joueurs"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            {STEPS.map((s, i) => (
              <span
                key={s}
                className={cn(
                  "rounded px-2 py-0.5 text-xs",
                  i === step
                    ? "bg-[var(--accent)]/20 text-[var(--accent)]"
                    : "text-[var(--text-secondary)]"
                )}
              >
                {i + 1}. {s}
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Retour
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
                Suivant <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button disabled={loading || !selected.size} onClick={() => void handleGenerate()}>
                {loading ? "Génération…" : "Générer le PDF"}
              </Button>
            )}
          </div>
        </div>
      }
    >
      {step === 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={selectAll}>
              Tous
            </Button>
            <Button size="sm" variant="secondary" onClick={selectNone}>
              Aucun
            </Button>
            <Button size="sm" variant="secondary" onClick={selectSeniors}>
              Seniors seulement
            </Button>
            <Button size="sm" variant="secondary" onClick={selectJuniors}>
              Juniors seulement
            </Button>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            {selected.size} joueur{selected.size > 1 ? "s" : ""} sélectionné
            {selected.size > 1 ? "s" : ""}
          </p>
          <div className="max-h-64 space-y-1 overflow-y-auto rounded border border-[var(--border)] p-2">
            {joueurs.map((j) => (
              <label
                key={j.id}
                className="flex cursor-pointer items-center gap-3 rounded px-2 py-1.5 hover:bg-[var(--bg-hover)]"
              >
                <input type="checkbox" checked={selected.has(j.id)} onChange={() => toggle(j.id)} />
                {j.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={j.photo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-muted)] text-xs">
                    {j.prenom?.[0]}
                    {j.nom?.[0]}
                  </span>
                )}
                <span className="flex-1 text-sm">
                  {j.prenom} {j.nom}
                </span>
                <span className="text-xs text-[var(--text-secondary)]">
                  {j.classement ?? getJoueurDisplayCategorie(j)}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["mois", "Ce mois"],
                ["mois_suivant", "Mois prochain"],
                ["trimestre", "Ce trimestre"],
                ["annee", "Cette année"],
              ] as const
            ).map(([key, label]) => (
              <Button key={key} size="sm" variant="secondary" onClick={() => applyPeriode(key)}>
                {label}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date début</Label>
              <Input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
            </div>
            <div>
              <Label>Date fin</Label>
              <Input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Période : {format(parseDate(dateDebut), "d MMM yyyy", { locale: fr })} →{" "}
            {format(parseDate(dateFin), "d MMM yyyy", { locale: fr })}
          </p>
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PDF_TYPES.map((t) => (
            <ExportTypeCard
              key={t}
              type={t}
              selected={typePdf === t}
              disabled={t === "D" && selected.size > 1}
              onSelect={setTypePdf}
            />
          ))}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <button
            type="button"
            className="flex w-full items-center justify-between rounded border border-[var(--border)] px-3 py-2 text-sm"
            onClick={() => setAdvancedOpen((o) => !o)}
          >
            Options avancées
            <span>{advancedOpen ? "−" : "+"}</span>
          </button>
          {advancedOpen && (
            <div className="space-y-3 rounded border border-[var(--border)] p-3 text-sm">
              {(
                [
                  ["inclurePhoto", "Inclure photo joueur"],
                  ["inclureResultats", "Inclure résultats passés"],
                  ["inclurePoints", "Inclure points ATP/WTA"],
                  ["inclurePrizeMoney", "Inclure prize money"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={options[key]}
                    onChange={(e) => setOptions((o) => ({ ...o, [key]: e.target.checked }))}
                  />
                  {label}
                </label>
              ))}
              <div>
                <Label>Langue du document</Label>
                <select
                  className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg-card)] px-2 py-1.5 text-sm"
                  value={options.langue}
                  onChange={(e) =>
                    setOptions((o) => ({ ...o, langue: e.target.value as ProgrammationPdfOptions["langue"] }))
                  }
                >
                  <option value="fr">Français</option>
                  <option value="en">Anglais</option>
                  <option value="ar">Arabe</option>
                </select>
              </div>
              <div>
                <Label>Orientation</Label>
                <select
                  className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg-card)] px-2 py-1.5 text-sm"
                  value={options.orientation}
                  onChange={(e) =>
                    setOptions((o) => ({
                      ...o,
                      orientation: e.target.value as ProgrammationPdfOptions["orientation"],
                    }))
                  }
                >
                  <option value="auto">Auto</option>
                  <option value="landscape">Forcer paysage</option>
                  <option value="portrait">Forcer portrait</option>
                </select>
              </div>
            </div>
          )}
          <div className="rounded bg-[var(--bg-muted)] p-3 text-sm">
            <p>
              <strong>Type :</strong> {effectiveType}
            </p>
            <p>
              <strong>Joueurs :</strong> {selectedList.map((j) => `${j.prenom} ${j.nom}`).join(", ")}
            </p>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              Fichier : FRMT_Planning_{effectiveType}_[période]_[date].pdf
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}

function parseDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y!, m! - 1, d);
}
