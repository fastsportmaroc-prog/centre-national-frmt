"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Input, Label } from "@/components/ui/Input";
import { cn } from "@/lib/utils/cn";
import { Search } from "lucide-react";

export type CompetitionPersonOption = {
  key: string;
  participant_id: string;
  participant_type: "joueur" | "coach";
  prenom: string;
  nom: string;
  roleLabel: string;
  detail?: string | null;
};

type Props = {
  value: string;
  options: CompetitionPersonOption[];
  onSelect: (opt: CompetitionPersonOption) => void;
  disabled?: boolean;
  placeholder?: string;
};

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function matches(opt: CompetitionPersonOption, raw: string) {
  const q = normalize(raw.trim());
  if (!q) return true;
  const hay = normalize(
    `${opt.prenom} ${opt.nom} ${opt.nom} ${opt.prenom} ${opt.roleLabel} ${opt.detail ?? ""}`
  );
  return q.split(/\s+/).filter(Boolean).every((t) => hay.includes(t));
}

export function CompetitionPersonSearch({
  value,
  options,
  onSelect,
  disabled,
  placeholder = "Rechercher joueur ou coach (nom, prénom)…",
}: Props) {
  const inputId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selected = useMemo(() => options.find((o) => o.key === value), [options, value]);

  useEffect(() => {
    if (selected) setQuery(`${selected.prenom} ${selected.nom}`.trim());
    else if (!value) setQuery("");
  }, [selected, value]);

  const filtered = useMemo(
    () => options.filter((o) => matches(o, query)).slice(0, 30),
    [options, query]
  );

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={wrapRef} className="relative min-w-[280px] flex-1">
      <Label htmlFor={inputId}>Rechercher et ajouter</Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted" />
        <Input
          id={inputId}
          className="pl-9"
          disabled={disabled}
          placeholder={placeholder}
          value={query}
          autoComplete="off"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
      </div>
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-[var(--bg-card)] shadow-lg">
          {filtered.map((opt) => (
            <li key={opt.key}>
              <button
                type="button"
                className={cn(
                  "w-full px-3 py-2 text-left text-sm hover:bg-frmt-green/10",
                  value === opt.key && "bg-frmt-green/15"
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(opt);
                  setQuery(`${opt.prenom} ${opt.nom}`.trim());
                  setOpen(false);
                }}
              >
                <span className="font-medium">
                  {opt.prenom} {opt.nom}
                </span>
                <span className="ml-2 rounded bg-[var(--bg-main)] px-1.5 py-0.5 text-xs text-muted">
                  {opt.roleLabel}
                </span>
                {opt.detail && (
                  <span className="mt-0.5 block text-xs text-muted">{opt.detail}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && query.trim() && filtered.length === 0 && (
        <p className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-[var(--bg-card)] p-2 text-xs text-muted">
          Aucun résultat — vérifiez l&apos;orthographe ou que la personne n&apos;est pas déjà inscrite.
        </p>
      )}
    </div>
  );
}
