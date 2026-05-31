"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils/cn";
import { Search, X } from "lucide-react";

export type ParticipantOption = {
  id: string;
  label: string;
  subtitle?: string;
};

type Props = {
  title: string;
  placeholder: string;
  options: ParticipantOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
};

function useDebounced(value: string, ms = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export function BudgetParticipantPicker({
  title,
  placeholder,
  options,
  selectedIds,
  onChange,
}: Props) {
  const [q, setQ] = useState("");
  const debounced = useDebounced(q);

  const filtered = useMemo(() => {
    const term = debounced.trim().toLowerCase();
    if (!term) return options.slice(0, 50);
    return options
      .filter(
        (o) =>
          o.label.toLowerCase().includes(term) ||
          (o.subtitle?.toLowerCase().includes(term) ?? false)
      )
      .slice(0, 50);
  }, [options, debounced]);

  const selected = useMemo(
    () => options.filter((o) => selectedIds.includes(o.id)),
    [options, selectedIds]
  );

  function toggle(id: string) {
    onChange(
      selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{title}</p>
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted" />
        <Input
          className="pl-8"
          placeholder={placeholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="max-h-40 overflow-y-auto rounded-lg border border-border bg-surface-elevated/50">
        {filtered.length === 0 ? (
          <p className="p-3 text-xs text-muted">Aucun résultat</p>
        ) : (
          filtered.map((o) => (
            <label
              key={o.id}
              className={cn(
                "flex cursor-pointer items-start gap-2 border-b border-border/40 px-3 py-2 text-sm last:border-0 hover:bg-surface-elevated",
                selectedIds.includes(o.id) && "bg-frmt-green/10"
              )}
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(o.id)}
                onChange={() => toggle(o.id)}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">{o.label}</span>
                {o.subtitle && <span className="ml-1 text-muted">— {o.subtitle}</span>}
              </span>
            </label>
          ))
        )}
      </div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((o) => (
            <span
              key={o.id}
              className="inline-flex items-center gap-1 rounded-full bg-frmt-green/15 px-2 py-0.5 text-xs"
            >
              {o.label}
              <button type="button" onClick={() => toggle(o.id)} aria-label="Retirer">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <p className="text-xs font-medium text-frmt-green">
        {selected.length} sélectionné{selected.length > 1 ? "s" : ""}
        {selected.length > 0 && " — cliquez × pour retirer"}
      </p>
    </div>
  );
}
