"use client";

import { Input, Label, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { CATEGORIES_AGE, NIVEAUX, SEXES_JOUEUR, STATUTS_JOUEUR } from "@/lib/constants/joueurs";
import type { Groupe, JoueurFilters } from "@/lib/types/database";
import { Search } from "lucide-react";

type Props = {
  filters: JoueurFilters;
  onChange: (f: JoueurFilters) => void;
  groupes: Groupe[];
};

export function JoueurFiltersBar({ filters, onChange, groupes }: Props) {
  return (
    <Card className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
      <div className="sm:col-span-2">
        <Label htmlFor="search">Recherche</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            id="search"
            className="pl-9"
            placeholder="Nom, prénom, email…"
            value={filters.search ?? ""}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
          />
        </div>
      </div>
      <div>
        <Label>Sexe</Label>
        <Select
          value={filters.sexe ?? ""}
          onChange={(e) =>
            onChange({
              ...filters,
              sexe: (e.target.value || "") as JoueurFilters["sexe"],
            })
          }
        >
          <option value="">Tous</option>
          {SEXES_JOUEUR.filter((s) => s.value !== "Autre").map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Catégorie</Label>
        <Select
          value={filters.categorie ?? ""}
          onChange={(e) =>
            onChange({
              ...filters,
              categorie: (e.target.value || "") as JoueurFilters["categorie"],
            })
          }
        >
          <option value="">Toutes</option>
          {CATEGORIES_AGE.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Groupe</Label>
        <Select
          value={filters.groupeId ?? ""}
          onChange={(e) => onChange({ ...filters, groupeId: e.target.value || undefined })}
        >
          <option value="">Tous</option>
          {groupes.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nom}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Niveau</Label>
        <Select
          value={filters.niveau ?? ""}
          onChange={(e) => onChange({ ...filters, niveau: e.target.value || undefined })}
        >
          <option value="">Tous</option>
          {NIVEAUX.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Statut</Label>
        <Select
          value={filters.statut ?? ""}
          onChange={(e) =>
            onChange({
              ...filters,
              statut: (e.target.value || "") as JoueurFilters["statut"],
            })
          }
        >
          <option value="">Tous</option>
          {STATUTS_JOUEUR.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Âge min</Label>
        <Input
          type="number"
          min={0}
          placeholder="—"
          value={filters.ageMin ?? ""}
          onChange={(e) =>
            onChange({
              ...filters,
              ageMin: e.target.value ? Number(e.target.value) : undefined,
            })
          }
        />
      </div>
      <div>
        <Label>Âge max</Label>
        <Input
          type="number"
          min={0}
          placeholder="—"
          value={filters.ageMax ?? ""}
          onChange={(e) =>
            onChange({
              ...filters,
              ageMax: e.target.value ? Number(e.target.value) : undefined,
            })
          }
        />
      </div>
    </Card>
  );
}
