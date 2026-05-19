"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Input, Label } from "@/components/ui/Input";
import {
  formatAirportLabel,
  getAirportByIata,
  searchAirports,
  type Airport,
} from "@/lib/data/airports";
import { cn } from "@/lib/utils/cn";

type Props = {
  label: string;
  value: string;
  iataCode: string | null;
  onChange: (ville: string, iata: string | null) => void;
  required?: boolean;
  placeholder?: string;
};

export function AirportAutocomplete({
  label,
  value,
  iataCode,
  onChange,
  required,
  placeholder = "Ville, code IATA ou pays…",
}: Props) {
  const listId = useId();
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Airport[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    setResults(searchAirports(query));
  }, [query]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function selectAirport(a: Airport) {
    const label = formatAirportLabel(a);
    setQuery(label);
    onChange(label, a.iata);
    setOpen(false);
  }

  function onInputChange(text: string) {
    setQuery(text);
    onChange(text, null);
    setOpen(true);
  }

  function onBlurSync() {
    if (iataCode) {
      const a = getAirportByIata(iataCode);
      if (a) setQuery(formatAirportLabel(a));
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <Label htmlFor={listId}>{label}</Label>
      <Input
        id={listId}
        required={required && !query}
        value={query}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => onInputChange(e.target.value)}
        onFocus={() => {
          setOpen(true);
          setResults(searchAirports(query));
        }}
        onBlur={() => {
          setTimeout(() => setOpen(false), 150);
          onBlurSync();
        }}
      />
      {iataCode && (
        <span className="mt-0.5 block text-xs text-frmt-green">Code IATA : {iataCode}</span>
      )}
      {open && results.length > 0 && (
        <ul
          className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-border bg-surface shadow-lg"
          role="listbox"
        >
          {results.map((a) => (
            <li key={a.iata}>
              <button
                type="button"
                className={cn(
                  "w-full px-3 py-2 text-left text-sm hover:bg-frmt-green/10",
                  iataCode === a.iata && "bg-frmt-green/15"
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectAirport(a);
                }}
              >
                <span className="font-medium text-frmt-green">{a.iata}</span>
                <span className="text-muted"> — {a.city}, {a.name}</span>
                <span className="block text-xs text-muted">{a.country}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
