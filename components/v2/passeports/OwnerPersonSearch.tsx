"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Input, Label } from "@/components/ui/Input";
import { cn } from "@/lib/utils/cn";
import { Search, X } from "lucide-react";

export type OwnerSearchOption = {
  key: string;
  prenom: string;
  nom: string;
  roleLabel: string;
};

type Props = {
  label?: string;
  value: string;
  options: OwnerSearchOption[];
  onChange: (key: string) => void;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
};

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function matchesOption(opt: OwnerSearchOption, rawQuery: string): boolean {
  const q = normalize(rawQuery.trim());
  if (!q) return true;
  const hay = normalize(`${opt.prenom} ${opt.nom} ${opt.nom} ${opt.prenom} ${opt.roleLabel}`);
  const tokens = q.split(/\s+/).filter(Boolean);
  return tokens.every((t) => hay.includes(t));
}

export function OwnerPersonSearch({
  label = "Joueur ou entraîneur",
  value,
  options,
  onChange,
  disabled,
  placeholder = "Tapez un nom ou prénom…",
  required,
}: Props) {
  const inputId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selected = useMemo(() => options.find((o) => o.key === value), [options, value]);

  useEffect(() => {
    if (selected) {
      setQuery(`${selected.prenom} ${selected.nom}`);
    } else if (!value) {
      setQuery("");
    }
  }, [selected, value]);

  const filtered = useMemo(() => {
    const list = options.filter((o) => matchesOption(o, query));
    return list.slice(0, 25);
  }, [options, query]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function selectOption(opt: OwnerSearchOption) {
    onChange(opt.key);
    setQuery(`${opt.prenom} ${opt.nom}`);
    setOpen(false);
  }

  function clear() {
    onChange("");
    setQuery("");
    setOpen(true);
  }

  return (
    <div ref={wrapRef} className="relative space-y-1">
      <Label htmlFor={inputId}>
        {label} {required && <span className="text-red-400">*</span>}
      </Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          id={inputId}
          className="pr-9 pl-9"
          value={query}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(e) => {
            setQuery(e.target.value);
            if (value) onChange("");
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (e.key === "Enter" && filtered[0]) {
              e.preventDefault();
              selectOption(filtered[0]!);
            }
          }}
        />
        {query && !disabled && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted hover:text-white"
            onClick={clear}
            aria-label="Effacer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {selected && !open && (
        <p className="text-xs text-[var(--success)]">
          ✓ {selected.prenom} {selected.nom} — {selected.roleLabel}
        </p>
      )}

      {open && !disabled && (
        <ul
          className="absolute z-[60] mt-1 max-h-56 w-full overflow-auto rounded-lg border border-border bg-[var(--bg-card)] shadow-xl"
          role="listbox"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-3 text-sm text-muted">Aucune personne trouvée</li>
          ) : (
            filtered.map((o) => (
              <li key={o.key}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === o.key}
                  className={cn(
                    "w-full px-3 py-2.5 text-left text-sm transition hover:bg-frmt-green/10",
                    value === o.key && "bg-frmt-green/15"
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectOption(o);
                  }}
                >
                  <span className="font-medium text-[var(--text-primary)]">
                    {o.prenom} {o.nom}
                  </span>
                  <span className="ml-2 text-xs text-muted">{o.roleLabel}</span>
                </button>
              </li>
            ))
          )}
          {options.length > 25 && filtered.length === 25 && (
            <li className="border-t border-border px-3 py-2 text-xs text-muted">
              Affinez la recherche pour voir plus de résultats
            </li>
          )}
        </ul>
      )}

      {!selected && query.trim() && !open && (
        <p className="text-xs text-amber-400">Choisissez une personne dans la liste</p>
      )}
    </div>
  );
}
