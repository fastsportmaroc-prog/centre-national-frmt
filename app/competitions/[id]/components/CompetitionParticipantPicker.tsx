"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Input, Label } from "@/components/ui/Input";
import { cn } from "@/lib/utils/cn";
import { Search } from "lucide-react";

export type CompetitionParticipantOption = {
  participant_id: string;
  prenom: string;
  nom: string;
  poste?: string;
};

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

type Props = {
  value: string;
  options: CompetitionParticipantOption[];
  onSelect: (opt: CompetitionParticipantOption | null) => void;
  placeholder?: string;
  label?: string;
};

export function CompetitionParticipantPicker({
  value,
  options,
  onSelect,
  placeholder = "Rechercher un participant (nom, prénom)…",
  label = "Participant",
}: Props) {
  const inputId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => options.find((o) => o.participant_id === value),
    [options, value]
  );

  useEffect(() => {
    if (selected) setQuery(`${selected.prenom} ${selected.nom}`.trim());
    else if (!value) setQuery("");
  }, [selected, value]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return options.slice(0, 40);
    return options
      .filter((o) => {
        const hay = normalize(`${o.prenom} ${o.nom} ${o.poste ?? ""}`);
        return q.split(/\s+/).every((t) => hay.includes(t));
      })
      .slice(0, 40);
  }, [options, query]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={wrapRef} className="relative min-w-[280px] flex-1">
      <Label htmlFor={inputId}>{label}</Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted" />
        <Input
          id={inputId}
          className="pl-9"
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (!e.target.value.trim()) onSelect(null);
          }}
          onFocus={() => setOpen(true)}
        />
      </div>
      {open && filtered.length > 0 && (
        <ul
          className={cn(
            "absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-[var(--border)]",
            "bg-[var(--bg-card)] py-1 shadow-lg"
          )}
        >
          {filtered.map((o) => (
            <li key={o.participant_id}>
              <button
                type="button"
                className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-[var(--bg-card-hover)]"
                onClick={() => {
                  onSelect(o);
                  setQuery(`${o.prenom} ${o.nom}`.trim());
                  setOpen(false);
                }}
              >
                <span className="font-medium">
                  {o.prenom} {o.nom}
                </span>
                {o.poste ? <span className="text-xs text-muted">{o.poste}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && query.trim() && filtered.length === 0 && (
        <p className="absolute z-20 mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3 text-xs text-muted">
          Aucun participant — ajoutez l&apos;équipe dans l&apos;onglet Participants.
        </p>
      )}
    </div>
  );
}
