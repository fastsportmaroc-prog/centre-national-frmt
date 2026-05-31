"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { Input } from "@/components/ui/Input";
import type { InputHTMLAttributes } from "react";

type NumericInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> & {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  /** Affiche un champ vide tant que la valeur est 0 (meilleure saisie au clavier). */
  allowEmpty?: boolean;
};

function displayForValue(value: number, allowEmpty: boolean): string {
  if (allowEmpty && value === 0) return "";
  return String(value);
}

/** Saisie numérique directe (texte), sans flèches type=number. */
export function NumericInput({
  value,
  onChange,
  min = 0,
  allowEmpty = false,
  className,
  ...props
}: NumericInputProps) {
  const [text, setText] = useState(() => displayForValue(value, allowEmpty));

  useEffect(() => {
    setText(displayForValue(value, allowEmpty));
  }, [value, allowEmpty]);

  return (
    <Input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      className={cn(className)}
      value={text}
      onChange={(e) => {
        const raw = e.target.value.replace(/\D/g, "");
        setText(raw);
        if (raw === "") {
          onChange(0);
        } else {
          onChange(Math.max(min, parseInt(raw, 10)));
        }
      }}
      onBlur={() => {
        if (text === "") {
          setText(allowEmpty ? "" : String(min));
          onChange(0);
          return;
        }
        const n = Math.max(min, parseInt(text, 10) || min);
        setText(displayForValue(n, allowEmpty));
        onChange(n);
      }}
      {...props}
    />
  );
}
