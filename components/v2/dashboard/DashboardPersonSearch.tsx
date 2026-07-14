"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { Input, Label, Select } from "@/components/ui/Input";
import { cn } from "@/lib/utils/cn";
import type { EntraineurV2, JoueurV2 } from "@/lib/types/v2";

export type DashboardPersonOption = {
  id: string;
  nom: string;
  prenom: string;
  role: "joueur" | "coach";
};

type Props = {
  joueurs: JoueurV2[];
  coaches: EntraineurV2[];
  /** Valeur sélectionnée : `joueur:uuid` | `coach:uuid` | null */
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
  roleFilter: "all" | "joueur" | "coach";
  onRoleFilterChange: (role: "all" | "joueur" | "coach") => void;
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function toOptions(joueurs: JoueurV2[], coaches: EntraineurV2[]): DashboardPersonOption[] {
  const j = joueurs
    .filter((x) => (x.statut ?? "actif") === "actif")
    .map((x) => ({
      id: x.id,
      nom: x.nom,
      prenom: x.prenom,
      role: "joueur" as const,
    }));
  const c = coaches
    .filter((x) => (x.statut ?? "actif") === "actif")
    .map((x) => ({
      id: x.id,
      nom: x.nom,
      prenom: x.prenom,
      role: "coach" as const,
    }));
  return [...j, ...c].sort((a, b) =>
    `${a.prenom} ${a.nom}`.localeCompare(`${b.prenom} ${b.nom}`, "fr")
  );
}

function personKey(p: DashboardPersonOption): string {
  return `${p.role}:${p.id}`;
}

function personLabel(p: DashboardPersonOption): string {
  return `${p.prenom} ${p.nom}`.trim();
}

export function DashboardPersonSearch({
  joueurs,
  coaches,
  selectedKey,
  onSelect,
  roleFilter,
  onRoleFilterChange,
}: Props) {
  const inputId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const allOptions = useMemo(() => toOptions(joueurs, coaches), [joueurs, coaches]);

  const selectedPerson = useMemo(() => {
    if (!selectedKey) return null;
    const [role, id] = selectedKey.split(":");
    return allOptions.find((p) => p.role === role && p.id === id) ?? null;
  }, [selectedKey, allOptions]);

  useEffect(() => {
    if (selectedPerson) setQuery(personLabel(selectedPerson));
  }, [selectedPerson]);

  const filtered = useMemo(() => {
    const q = normalize(query);
    return allOptions.filter((p) => {
      if (roleFilter !== "all" && p.role !== roleFilter) return false;
      if (!q) return true;
      const label = normalize(personLabel(p));
      return label.includes(q) || normalize(p.nom).includes(q) || normalize(p.prenom).includes(q);
    });
  }, [allOptions, query, roleFilter]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function pick(p: DashboardPersonOption) {
    const key = personKey(p);
    onSelect(key);
    setQuery(personLabel(p));
    setOpen(false);
  }

  function clear() {
    onSelect(null);
    setQuery("");
    setOpen(true);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[140px]">
          <Label htmlFor={`${inputId}-role`}>Type</Label>
          <Select
            id={`${inputId}-role`}
            value={roleFilter}
            onChange={(e) => {
              onRoleFilterChange(e.target.value as "all" | "joueur" | "coach");
              onSelect(null);
              setQuery("");
            }}
          >
            <option value="all">Joueurs et coachs</option>
            <option value="joueur">Joueurs</option>
            <option value="coach">Coachs</option>
          </Select>
        </div>

        <div ref={wrapRef} className="relative min-w-[220px] flex-1">
          <Label htmlFor={inputId}>Rechercher joueur ou coach</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              id={inputId}
              value={query}
              placeholder="Nom, prénom…"
              autoComplete="off"
              className="pl-9 pr-9"
              onChange={(e) => {
                setQuery(e.target.value);
                onSelect(null);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
            />
            {query && (
              <button
                type="button"
                onClick={clear}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                aria-label="Effacer la recherche"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {open && (
            <ul
              className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] shadow-lg"
              role="listbox"
            >
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-[12px] text-[var(--text-muted)]">Aucun résultat</li>
              ) : (
                filtered.slice(0, 40).map((p) => (
                  <li key={personKey(p)}>
                    <button
                      type="button"
                      role="option"
                      className={cn(
                        "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[12px] hover:bg-[var(--bg-hover)]",
                        selectedKey === personKey(p) && "bg-[var(--bg-inset)]"
                      )}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pick(p)}
                    >
                      <span className="text-[var(--text-primary)]">{personLabel(p)}</span>
                      <span className="shrink-0 text-[10px] uppercase text-[var(--text-muted)]">
                        {p.role === "joueur" ? "Joueur" : "Coach"}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      </div>

      {query.trim() && !selectedKey && filtered.length > 0 && (
        <div className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-inset)] p-2">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
            Résultats ({Math.min(filtered.length, 40)})
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {filtered.slice(0, 12).map((p) => (
              <li key={personKey(p)}>
                <Link
                  href={p.role === "joueur" ? `/v2/joueurs/${p.id}` : `/v2/entraineurs/${p.id}`}
                  className="inline-flex items-center gap-1 rounded-md border border-[var(--border-main)] bg-[var(--bg-card)] px-2 py-1 text-[11px] hover:bg-[var(--bg-hover)]"
                >
                  {personLabel(p)}
                  <span className="text-[9px] text-[var(--text-muted)]">
                    ({p.role === "joueur" ? "J" : "C"})
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
