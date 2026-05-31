"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { useToast } from "@/components/v2/ui/ToastProvider";
import {
  equipementKindsForCoach,
  equipementKindsForJoueur,
  type EquipementKind,
} from "@/lib/constants/equipement-tailles";
import { updateEntraineur, updateJoueur } from "@/lib/supabase/queries";
import type { EntraineurV2, JoueurV2 } from "@/lib/types/v2";

const SIZE_OPTIONS = [
  "",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "36",
  "37",
  "38",
  "39",
  "40",
  "41",
  "42",
  "43",
  "44",
  "45",
  "128",
  "140",
  "152",
  "164",
  "176",
];

type BaseProps = {
  /** Si false : champs et bouton masqués (lecture seule). Par défaut : édition activée. */
  editable?: boolean;
  compact?: boolean;
};

type JoueurProps = BaseProps & {
  kind: "joueur";
  person: JoueurV2;
  onSaved?: (p: JoueurV2) => void;
};

type CoachProps = BaseProps & {
  kind: "entraineur";
  person: EntraineurV2;
  onSaved?: (p: EntraineurV2) => void;
};

type Props = JoueurProps | CoachProps;

function kindsFor(props: Props): EquipementKind[] {
  return props.kind === "joueur"
    ? equipementKindsForJoueur(props.person)
    : equipementKindsForCoach(props.person);
}

function initialSizes(person: JoueurV2 | EntraineurV2, kinds: EquipementKind[]) {
  const o: Record<string, string> = {};
  for (const k of kinds) {
    const v = person[k.field as keyof typeof person];
    o[k.id] = typeof v === "string" ? v : "";
  }
  return o;
}

export function PersonEquipementTaillesForm(props: Props) {
  const { toast } = useToast();
  const editable = props.editable !== false;
  const { compact } = props;
  const kinds = kindsFor(props);
  const [sizes, setSizes] = useState(() => initialSizes(props.person, kinds));
  const [saving, setSaving] = useState(false);
  const prefix = props.person.id;

  useEffect(() => {
    setSizes(initialSizes(props.person, kindsFor(props)));
  }, [props.person, props.kind]);

  function showSaveError(message?: string) {
    const msg = message ?? "Erreur enregistrement";
    if (/schema cache|could not find.*column/i.test(msg)) {
      toast(
        "Colonnes tailles absentes en base. Exécutez lib/db/migrations/equipement_tailles_complet.sql dans Supabase SQL Editor, puis réessayez.",
        "error"
      );
      return;
    }
    toast(msg, "error");
  }

  async function save() {
    if (!editable) return;
    setSaving(true);
    const payload: Record<string, string | null> = {};
    for (const k of kinds) {
      payload[k.field] = sizes[k.id]?.trim() || null;
    }

    if (props.kind === "joueur") {
      const res = await updateJoueur(props.person.id, payload);
      setSaving(false);
      if (!res.ok) {
        showSaveError(res.error);
        return;
      }
      const next = { ...props.person, ...payload };
      props.onSaved?.(next);
      if (!props.onSaved) toast("Tailles textiles et chaussures enregistrées", "success");
    } else {
      const res = await updateEntraineur(props.person.id, payload);
      setSaving(false);
      if (!res.ok) {
        showSaveError(res.error);
        return;
      }
      const next = { ...props.person, ...payload };
      props.onSaved?.(next);
      if (!props.onSaved) toast("Tailles textiles et chaussures enregistrées", "success");
    }
  }

  const textileKinds = kinds.filter((k) => k.id !== "chaussures");
  const shoeKinds = kinds.filter((k) => k.id === "chaussures");

  return (
    <div
      className={
        compact ? "space-y-4" : "rounded-lg border border-[var(--border)] p-3 space-y-4"
      }
    >
      {!compact && (
        <div>
          <h4 className="text-sm font-semibold text-[var(--text-primary)]">
            Tailles textiles & chaussures
          </h4>
          <p className="mt-0.5 text-xs text-muted">
            Saisissez chaque taille puis enregistrez pour cette personne.
          </p>
        </div>
      )}

      {textileKinds.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Textiles</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {textileKinds.map((k) => (
              <SizeField
                key={k.id}
                kind={k}
                listId={`${prefix}-${k.id}`}
                value={sizes[k.id] ?? ""}
                editable={editable}
                onChange={(v) => setSizes((prev) => ({ ...prev, [k.id]: v }))}
              />
            ))}
          </div>
        </div>
      )}

      {shoeKinds.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Chaussures</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {shoeKinds.map((k) => (
              <SizeField
                key={k.id}
                kind={k}
                listId={`${prefix}-${k.id}`}
                value={sizes[k.id] ?? ""}
                editable={editable}
                onChange={(v) => setSizes((prev) => ({ ...prev, [k.id]: v }))}
                placeholder="ex. 42, 43, 9 US…"
              />
            ))}
          </div>
        </div>
      )}

      {editable ? (
        <Button
          type="button"
          className="w-full sm:w-auto"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? "Enregistrement…" : "Enregistrer les tailles"}
        </Button>
      ) : (
        <p className="text-xs text-muted">
          Modification non autorisée pour votre compte. Contactez un administrateur.
        </p>
      )}
    </div>
  );
}

function SizeField({
  kind,
  listId,
  value,
  editable,
  onChange,
  placeholder = "ex. M, L, 152…",
}: {
  kind: EquipementKind;
  listId: string;
  value: string;
  editable: boolean;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <Label>{kind.label}</Label>
      {editable ? (
        <Input
          list={listId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <p className="mt-1 text-sm font-medium">{value.trim() || "—"}</p>
      )}
      <datalist id={listId}>
        {SIZE_OPTIONS.filter(Boolean).map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </div>
  );
}
