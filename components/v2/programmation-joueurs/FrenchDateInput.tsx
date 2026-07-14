"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Calendar } from "lucide-react";
import { Input, Label } from "@/components/ui/Input";
import {
  isoToFrenchDisplay,
  maskFrenchDateInput,
  parseFrenchDateInput,
} from "@/lib/utils/french-date-input";
import { cn } from "@/lib/utils/cn";

type Props = {
  label: string;
  /** Valeur ISO yyyy-MM-dd */
  value?: string;
  onChange: (iso: string | undefined) => void;
  min?: string;
  max?: string;
  className?: string;
  disabled?: boolean;
};

function isCompleteFrenchDate(text: string): boolean {
  return /^\d{2}\/\d{2}\/\d{4}$/.test(text.trim());
}

function openNativeDatePicker(input: HTMLInputElement | null) {
  if (!input) return;
  if (typeof input.showPicker === "function") {
    try {
      input.showPicker();
      return;
    } catch {
      // showPicker peut échouer si l'appel n'est pas déclenché par un geste utilisateur
    }
  }
  input.focus();
  input.click();
}

export function FrenchDateInput({
  label,
  value,
  onChange,
  min,
  max,
  className,
  disabled,
}: Props) {
  const id = useId();
  const pickerId = `${id}-picker`;
  const editingRef = useRef(false);
  const pickerRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(() => isoToFrenchDisplay(value));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingRef.current) return;
    setText(isoToFrenchDisplay(value));
    setError(null);
  }, [value]);

  function applyIso(iso: string) {
    if (min && iso < min) {
      setError(`Minimum : ${isoToFrenchDisplay(min)}`);
      return false;
    }
    if (max && iso > max) {
      setError(`Maximum : ${isoToFrenchDisplay(max)}`);
      return false;
    }
    setError(null);
    onChange(iso);
    if (!editingRef.current) setText(isoToFrenchDisplay(iso));
    return true;
  }

  function commit(raw: string, opts?: { silent?: boolean }) {
    const trimmed = raw.trim();
    if (!trimmed) {
      if (!opts?.silent) {
        setError(null);
        onChange(undefined);
      }
      return true;
    }
    const iso = parseFrenchDateInput(trimmed);
    if (!iso) {
      if (!opts?.silent) setError("Format attendu : jj/mm/aaaa");
      return false;
    }
    if (!opts?.silent) {
      return applyIso(iso);
    }
    onChange(iso);
    if (!editingRef.current) setText(isoToFrenchDisplay(iso));
    return true;
  }

  function handleTextChange(raw: string) {
    const masked = maskFrenchDateInput(raw);
    setText(masked);
    setError(null);
    if (isCompleteFrenchDate(masked)) {
      commit(masked, { silent: true });
    }
  }

  function handlePickerChange(iso: string) {
    if (!iso) {
      setError(null);
      onChange(undefined);
      setText("");
      return;
    }
    editingRef.current = false;
    applyIso(iso);
  }

  return (
    <div className={cn("min-w-[150px]", className)}>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative flex items-stretch gap-1">
        <Input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="jj/mm/aaaa"
          disabled={disabled}
          value={text}
          onFocus={() => {
            editingRef.current = true;
          }}
          onChange={(e) => handleTextChange(e.target.value)}
          onBlur={() => {
            editingRef.current = false;
            commit(text);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              editingRef.current = false;
              commit(text);
            }
          }}
          aria-invalid={Boolean(error)}
          className={cn("min-w-0 flex-1", error && "border-red-500/70 focus:border-red-500")}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => openNativeDatePicker(pickerRef.current)}
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-lg border border-border bg-surface-elevated px-2.5 text-muted transition-colors",
            "hover:border-tennis/50 hover:text-foreground focus:border-tennis/50 focus:outline-none focus:ring-1 focus:ring-tennis/30",
            "disabled:pointer-events-none disabled:opacity-50"
          )}
          aria-label={`Choisir la date — ${label}`}
          title="Ouvrir le calendrier"
        >
          <Calendar className="h-4 w-4" aria-hidden />
        </button>
        <input
          ref={pickerRef}
          id={pickerId}
          type="date"
          tabIndex={-1}
          aria-hidden
          disabled={disabled}
          value={value?.slice(0, 10) ?? ""}
          min={min}
          max={max}
          onChange={(e) => handlePickerChange(e.target.value)}
          className="pointer-events-none absolute h-0 w-0 opacity-0"
        />
      </div>
      {error ? <p className="mt-1 text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
