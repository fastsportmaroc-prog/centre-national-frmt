"use client";

import { DocumentExpirationBadge } from "@/components/v2/passeports/DocumentExpirationBadge";
import { formatDateFr, normalizeDateForInput } from "@/lib/passeport/date-utils";
import { IdCard } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Props = {
  numero?: string | null;
  expiration?: string | null;
  /** Affichage compact sous la photo */
  variant?: "card" | "inline";
  onManageClick?: () => void;
  className?: string;
};

export function PersonPasseportSummary({
  numero,
  expiration,
  variant = "card",
  onManageClick,
  className,
}: Props) {
  const n = numero?.trim() ?? "";
  const expIso = normalizeDateForInput(expiration);
  const hasData = Boolean(n || expIso);

  if (!hasData) {
    return (
      <p
        className={cn(
          "text-center text-xs text-[var(--text-secondary)]",
          variant === "card" && "w-full rounded border border-dashed border-[var(--border)] px-3 py-2",
          className
        )}
      >
        Passeport non renseigné
      </p>
    );
  }

  const complete = Boolean(n && expIso);

  return (
    <div
      className={cn(
        "w-full space-y-1 text-xs",
        variant === "card" &&
          "rounded-lg border border-[var(--border)] bg-[var(--bg-main)] px-3 py-2.5",
        className
      )}
    >
      <div className="flex items-center gap-1.5 font-medium text-[var(--text-primary)]">
        <IdCard className="h-3.5 w-3.5 shrink-0 text-frmt-green" />
        Passeport
        {complete ? (
          <span className="text-[var(--success)]">· OK</span>
        ) : (
          <span className="text-[var(--warning)]">· incomplet</span>
        )}
      </div>
      {n ? (
        <p>
          <span className="text-[var(--text-secondary)]">N° </span>
          <span className="font-mono font-medium">{n}</span>
        </p>
      ) : (
        <p className="text-[var(--warning)]">N° non renseigné</p>
      )}
      {expIso ? (
        <p className="flex flex-wrap items-center gap-2">
          <span>
            <span className="text-[var(--text-secondary)]">Expire </span>
            <span className="font-medium">{formatDateFr(expIso)}</span>
          </span>
          <DocumentExpirationBadge expirationDate={expIso} />
        </p>
      ) : (
        <p className="text-[var(--warning)]">Date d&apos;expiration manquante</p>
      )}
      {onManageClick && (
        <button
          type="button"
          onClick={onManageClick}
          className="text-frmt-green hover:underline"
        >
          Gérer le dossier →
        </button>
      )}
    </div>
  );
}
