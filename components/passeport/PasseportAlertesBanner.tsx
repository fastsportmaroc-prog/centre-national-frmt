"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { PasseportAlerte } from "@/lib/utils/passeport-alertes";
import { AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/utils/dates";

type Props = {
  alertes: PasseportAlerte[];
  onSelectJoueur?: (joueurId: string) => void;
  compact?: boolean;
  /** Afficher le lien « Ouvrir dossier » (défaut : true si onSelectJoueur fourni) */
  showActions?: boolean;
};

export function PasseportAlertesBanner({
  alertes,
  onSelectJoueur,
  compact,
  showActions,
}: Props) {
  const actions = showActions ?? Boolean(onSelectJoueur);
  if (alertes.length === 0) return null;

  const expires = alertes.filter((a) => a.severite === "expire");
  const bientot = alertes.filter((a) => a.severite === "bientot");

  return (
    <Card
      className={
        compact
          ? "border-amber-500/40 bg-amber-500/10 p-3"
          : "border-amber-500/40 bg-amber-500/10 p-4 space-y-3"
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
        <h3 className="font-semibold text-amber-200">
          Alertes documents ({alertes.length})
        </h3>
        {expires.length > 0 && (
          <Badge variant="danger">{expires.length} expiré(s)</Badge>
        )}
        {bientot.length > 0 && (
          <Badge variant="warning">{bientot.length} à renouveler</Badge>
        )}
      </div>
      <p className="text-xs text-muted">
        Passeport : échéance dans les 6 mois · Visa : échéance dans les 2 mois
      </p>
      <ul className={compact ? "max-h-32 space-y-1 overflow-y-auto text-sm" : "space-y-2 text-sm"}>
        {alertes.map((a) => (
          <li
            key={a.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/50 bg-surface/40 px-2 py-1.5"
          >
            <div>
              <span className="font-medium">{a.joueur_nom}</span>
              <span className="text-muted"> — </span>
              <Badge variant={a.severite === "expire" ? "danger" : "warning"} className="mr-1">
                {a.type === "passeport" ? "Passeport" : "Visa"}
              </Badge>
              <span className="text-muted">
                {formatDate(a.date_echeance)}
                {a.severite === "bientot" && a.jours_restants >= 0
                  ? ` (J-${a.jours_restants})`
                  : ""}
              </span>
            </div>
            {actions &&
              (onSelectJoueur ? (
                <button
                  type="button"
                  className="text-xs text-frmt-green hover:underline"
                  onClick={() => onSelectJoueur(a.joueur_id)}
                >
                  Ouvrir dossier
                </button>
              ) : (
                <Link
                  href={`/passeport?joueur=${a.joueur_id}`}
                  className="text-xs text-frmt-green hover:underline"
                >
                  Voir →
                </Link>
              ))}
          </li>
        ))}
      </ul>
    </Card>
  );
}
