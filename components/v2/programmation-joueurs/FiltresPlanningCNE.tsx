"use client";

import { useMemo } from "react";
import { FileDown, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { useAgeCategories } from "@/lib/hooks/useAgeCategories";
import { useUserPermissions } from "@/lib/hooks/useUserPermissions";
import type { PlanningCneDisplayMode, PlanningCnePeriodPreset } from "@/lib/programmation-joueurs/planning-cne-grid";
import type { ProgrammationFilters } from "@/lib/types/programmation-joueurs";
import type { EntraineurV2, JoueurV2 } from "@/lib/types/v2";
import { getJoueurDisplayCategorie } from "@/lib/utils/joueur";
import { cn } from "@/lib/utils/cn";
import { FrenchDateInput } from "./FrenchDateInput";

type Props = {
  filters: ProgrammationFilters;
  onChange: (patch: Partial<ProgrammationFilters>) => void;
  onReset: () => void;
  periodPreset: PlanningCnePeriodPreset;
  onPeriodPresetChange: (preset: PlanningCnePeriodPreset) => void;
  displayMode: PlanningCneDisplayMode;
  onDisplayModeChange: (mode: PlanningCneDisplayMode) => void;
  joueurs: JoueurV2[];
  coaches: EntraineurV2[];
  visibleColumnIds: Set<string>;
  onToggleColumn: (id: string) => void;
  onSelectAllJoueurColumns: (ids: string[]) => void;
  onClearJoueurColumns: () => void;
  onSelectAllCoachColumns: (ids: string[]) => void;
  onClearCoachColumns: () => void;
  canSelectPlayers?: boolean;
  /** Active le filtre Afficher (joueurs / coaches / les deux) — tous rôles sauf vue perso joueur. */
  enableDisplayModeFilter?: boolean;
  selfOnly?: boolean;
  rangeLabelFr?: string;
  rangeTruncated?: boolean;
  canExport?: boolean;
  exportingExcel?: boolean;
  exportingCnePdf?: boolean;
  exportDisabled?: boolean;
  onExportExcel?: () => void;
  onExportCnePdf?: () => void;
};

const PERIOD_OPTIONS: { value: PlanningCnePeriodPreset; label: string }[] = [
  { value: "mois_precedent", label: "Mois précédent" },
  { value: "ce_mois", label: "Ce mois" },
  { value: "mois_prochain", label: "Mois prochain" },
  { value: "trimestre", label: "Trimestre" },
  { value: "personnalise", label: "Personnalisé" },
];

const DISPLAY_OPTIONS: { value: PlanningCneDisplayMode; label: string }[] = [
  { value: "both", label: "Joueurs et coaches" },
  { value: "joueurs", label: "Joueurs uniquement" },
  { value: "coaches", label: "Coaches uniquement" },
];

function countVisibleJoueurs(ids: Set<string>): number {
  return [...ids].filter((id) => !id.startsWith("coach-")).length;
}

function countVisibleCoaches(ids: Set<string>): number {
  return [...ids].filter((id) => id.startsWith("coach-")).length;
}

export function FiltresPlanningCNE({
  filters,
  onChange,
  onReset,
  periodPreset,
  onPeriodPresetChange,
  displayMode,
  onDisplayModeChange,
  joueurs,
  coaches,
  visibleColumnIds,
  onToggleColumn,
  onSelectAllJoueurColumns,
  onClearJoueurColumns,
  onSelectAllCoachColumns,
  onClearCoachColumns,
  canSelectPlayers = true,
  enableDisplayModeFilter = true,
  selfOnly = false,
  rangeLabelFr,
  rangeTruncated = false,
  canExport = false,
  exportingExcel = false,
  exportingCnePdf = false,
  exportDisabled = false,
  onExportExcel,
  onExportCnePdf,
}: Props) {
  const { categories: ageCategories } = useAgeCategories();
  const { hasCategoryRestrictions, lockedCategoryLabel, sanitizeCategoryParam } =
    useUserPermissions();
  const lockedCategory = sanitizeCategoryParam(filters.categorieJoueur) ?? lockedCategoryLabel;

  const sortedJoueurs = useMemo(
    () =>
      [...joueurs].sort((a, b) =>
        `${a.prenom} ${a.nom}`.localeCompare(`${b.prenom} ${b.nom}`, "fr")
      ),
    [joueurs]
  );

  const sortedCoaches = useMemo(
    () =>
      [...coaches].sort((a, b) =>
        `${a.prenom} ${a.nom}`.localeCompare(`${b.prenom} ${b.nom}`, "fr")
      ),
    [coaches]
  );

  const displayOptions = DISPLAY_OPTIONS;

  const showCoachSelection = enableDisplayModeFilter && displayMode !== "joueurs";
  const visibleJoueurCount = countVisibleJoueurs(visibleColumnIds);
  const visibleCoachCount = countVisibleCoaches(visibleColumnIds);

  return (
    <div className="space-y-3">
      {selfOnly && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-secondary)]">
          Vue personnelle — vous consultez uniquement votre colonne de planning.
        </div>
      )}
      {rangeLabelFr && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm">
          <div>
            <span className="text-[var(--text-secondary)]">Planning CNE — période : </span>
            <span className="font-medium capitalize text-white">{rangeLabelFr}</span>
            {rangeTruncated && (
              <span className="ml-2 text-xs text-amber-300">(tronquée à 124 jours max)</span>
            )}
          </div>
          {canExport && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={exportDisabled || exportingCnePdf}
                onClick={onExportCnePdf}
              >
                <FileDown className="mr-1.5 h-4 w-4" />
                {exportingCnePdf ? "Export PDF…" : "Imprimer PDF"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={exportDisabled || exportingExcel}
                onClick={onExportExcel}
              >
                <FileSpreadsheet className="mr-1.5 h-4 w-4" />
                {exportingExcel ? "Export Excel…" : "Exporter Excel"}
              </Button>
            </div>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3">
        <div>
          <Label>Période</Label>
          <Select
            value={periodPreset}
            onChange={(e) => onPeriodPresetChange(e.target.value as PlanningCnePeriodPreset)}
          >
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Afficher</Label>
          <Select
            value={displayMode}
            onChange={(e) => onDisplayModeChange(e.target.value as PlanningCneDisplayMode)}
            disabled={!enableDisplayModeFilter}
          >
            {displayOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Catégorie d&apos;âge</Label>
          {hasCategoryRestrictions ? (
            <div className="min-w-[120px] rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm">
              {lockedCategory || "—"}
            </div>
          ) : (
            <Select
              value={filters.categorieJoueur ?? ""}
              onChange={(e) => onChange({ categorieJoueur: e.target.value || undefined })}
            >
              <option value="">Toutes</option>
              {ageCategories.map((c) => (
                <option key={c.id} value={c.code}>
                  {c.label}
                </option>
              ))}
            </Select>
          )}
        </div>
        <div className="min-w-[140px] flex-1">
          <Label>Recherche joueur / coach</Label>
          <Input
            value={filters.search ?? ""}
            onChange={(e) => onChange({ search: e.target.value || undefined })}
            placeholder="Nom, prénom…"
          />
        </div>
        <FrenchDateInput
          label="Du"
          value={filters.dateDebut}
          onChange={(iso) => onChange({ dateDebut: iso })}
          max={filters.dateFin}
        />
        <FrenchDateInput
          label="Au"
          value={filters.dateFin}
          onChange={(iso) => onChange({ dateFin: iso })}
          min={filters.dateDebut}
        />
        <Button variant="ghost" size="sm" onClick={onReset}>
          Réinitialiser
        </Button>
      </div>

      {canSelectPlayers && displayMode !== "coaches" && sortedJoueurs.length > 0 && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <Label className="mb-0">Sélection joueurs ({visibleJoueurCount})</Label>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => onSelectAllJoueurColumns(sortedJoueurs.map((j) => j.id))}
              >
                Tout sélectionner
              </Button>
              <Button variant="ghost" size="sm" type="button" onClick={onClearJoueurColumns}>
                Tout désélectionner
              </Button>
            </div>
          </div>
          <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto">
            {sortedJoueurs.map((j) => {
              const checked = visibleColumnIds.has(j.id);
              return (
                <label
                  key={j.id}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-xs",
                    checked
                      ? "border-[#1a472a] bg-[#1a472a]/20 text-white"
                      : "border-[var(--border)] text-[var(--text-secondary)]"
                  )}
                >
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={checked}
                    onChange={() => onToggleColumn(j.id)}
                  />
                  <span>
                    {j.prenom} {j.nom}
                    <span className="ml-1 opacity-60">({getJoueurDisplayCategorie(j)})</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {showCoachSelection && sortedCoaches.length > 0 && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <Label className="mb-0">Sélection coaches ({visibleCoachCount})</Label>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() =>
                  onSelectAllCoachColumns(sortedCoaches.map((c) => `coach-${c.id}`))
                }
              >
                Tout sélectionner
              </Button>
              <Button variant="ghost" size="sm" type="button" onClick={onClearCoachColumns}>
                Tout désélectionner
              </Button>
            </div>
          </div>
          <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto">
            {sortedCoaches.map((c) => {
              const colId = `coach-${c.id}`;
              const checked = visibleColumnIds.has(colId);
              return (
                <label
                  key={c.id}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-xs",
                    checked
                      ? "border-[#1e3a5f] bg-[#1e3a5f]/20 text-white"
                      : "border-[var(--border)] text-[var(--text-secondary)]"
                  )}
                >
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={checked}
                    onChange={() => onToggleColumn(colId)}
                  />
                  <span>
                    {c.prenom} {c.nom}
                    {c.specialite ? (
                      <span className="ml-1 opacity-60">({c.specialite})</span>
                    ) : null}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
