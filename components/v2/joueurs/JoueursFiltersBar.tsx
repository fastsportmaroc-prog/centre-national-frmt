"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label, Select } from "@/components/ui/Input";
import type { AgeCategoryDefinition } from "@/lib/types/categories-age";
import { Filter, RotateCcw, Search } from "lucide-react";

type SortMode = "nom" | "club" | "classement_asc" | "classement_desc";

type Props = {
  search: string;
  onSearchChange: (v: string) => void;
  sexe: string;
  onSexeChange: (v: string) => void;
  categorie: string;
  onCategorieChange: (v: string) => void;
  annee: string;
  onAnneeChange: (v: string) => void;
  statut: string;
  onStatutChange: (v: string) => void;
  clubFilter: string;
  onClubFilterChange: (v: string) => void;
  sortMode: SortMode;
  onSortModeChange: (v: SortMode) => void;
  ageCategories: AgeCategoryDefinition[];
  birthYears: number[];
  clubOptions: string[];
  activeFilterCount: number;
  resultCount: number;
  totalCount: number;
  onReset: () => void;
};

export function JoueursFiltersBar({
  search,
  onSearchChange,
  sexe,
  onSexeChange,
  categorie,
  onCategorieChange,
  annee,
  onAnneeChange,
  statut,
  onStatutChange,
  clubFilter,
  onClubFilterChange,
  sortMode,
  onSortModeChange,
  ageCategories,
  birthYears,
  clubOptions,
  activeFilterCount,
  resultCount,
  totalCount,
  onReset,
}: Props) {
  return (
    <Card className="space-y-4 border border-border/80 bg-[var(--bg-card)] p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Filter className="h-4 w-4 text-frmt-green" aria-hidden />
          Recherche & filtres
          {activeFilterCount > 0 ? (
            <span className="rounded-full bg-frmt-green/15 px-2 py-0.5 text-xs font-medium text-frmt-green">
              {activeFilterCount} actif{activeFilterCount > 1 ? "s" : ""}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted">
            <span className="font-semibold text-[var(--fg)]">{resultCount}</span> affiché
            {resultCount !== 1 ? "s" : ""} sur {totalCount}
          </p>
          {activeFilterCount > 0 ? (
            <Button type="button" variant="ghost" size="sm" onClick={onReset}>
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
              Réinitialiser
            </Button>
          ) : null}
        </div>
      </div>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <Input
          className="pl-9"
          placeholder="Nom, prénom, club, licence, catégorie…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div>
          <Label>Sexe</Label>
          <Select className="mt-1" value={sexe} onChange={(e) => onSexeChange(e.target.value)}>
            <option value="">Tous</option>
            <option value="M">Masculin</option>
            <option value="F">Féminin</option>
          </Select>
        </div>
        <div>
          <Label>Catégorie d&apos;âge</Label>
          <Select className="mt-1" value={categorie} onChange={(e) => onCategorieChange(e.target.value)}>
            <option value="">Toutes</option>
            {ageCategories.map((c) => (
              <option key={c.id} value={c.code}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Année de naissance</Label>
          <Select className="mt-1" value={annee} onChange={(e) => onAnneeChange(e.target.value)}>
            <option value="">Toutes</option>
            {birthYears.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Statut</Label>
          <Select className="mt-1" value={statut} onChange={(e) => onStatutChange(e.target.value)}>
            <option value="">Tous</option>
            <option value="actif">Actif</option>
            <option value="inactif">Inactif</option>
            <option value="blesse">Blessé</option>
            <option value="suspendu">Suspendu</option>
          </Select>
        </div>
        <div>
          <Label>Club</Label>
          <Select className="mt-1" value={clubFilter} onChange={(e) => onClubFilterChange(e.target.value)}>
            <option value="">Tous</option>
            {clubOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Tri</Label>
          <Select
            className="mt-1"
            value={sortMode}
            onChange={(e) => onSortModeChange(e.target.value as SortMode)}
          >
            <option value="nom">Nom (A → Z)</option>
            <option value="club">Club (A → Z)</option>
            <option value="classement_asc">Classement (↑)</option>
            <option value="classement_desc">Classement (↓)</option>
          </Select>
        </div>
      </div>
    </Card>
  );
}
