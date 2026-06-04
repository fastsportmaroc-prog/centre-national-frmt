"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BadgeTypeEvenement } from "./BadgeTypeEvenement";
import {
  PROGRAMMATION_SURFACE_LABELS,
} from "@/lib/constants/programmation-joueurs";
import type { ProgrammationEvenementEnriched } from "@/lib/types/programmation-joueurs";
import { formatPeriodePdf } from "@/lib/pdf/pdf-format";

type Props = {
  evenement: ProgrammationEvenementEnriched | null;
  onClose: () => void;
  onEdit?: (ev: ProgrammationEvenementEnriched) => void;
  onDelete?: (id: string) => void;
};

export function EvenementDrawer({ evenement, onClose, onEdit, onDelete }: Props) {
  if (!evenement) return null;

  const joueur = [evenement.joueur_prenom, evenement.joueur_nom].filter(Boolean).join(" ");
  const lieu = [evenement.ville, evenement.pays].filter(Boolean).join(", ");

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-[var(--border)] bg-[var(--bg-card)] shadow-xl">
        <div className="flex items-start justify-between border-b border-[var(--border)] p-4">
          <div>
            <BadgeTypeEvenement type={evenement.type} />
            <h2 className="mt-2 text-lg font-semibold">{evenement.nom}</h2>
            {joueur && <p className="text-sm text-[var(--text-secondary)]">{joueur}</p>}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Fermer">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
          <dl className="grid gap-2">
            <div>
              <dt className="text-[var(--text-secondary)]">Dates</dt>
              <dd>{formatPeriodePdf(evenement.date_debut, evenement.date_fin)}</dd>
            </div>
            {lieu && (
              <div>
                <dt className="text-[var(--text-secondary)]">Lieu</dt>
                <dd>{lieu}</dd>
              </div>
            )}
            {evenement.surface && (
              <div>
                <dt className="text-[var(--text-secondary)]">Surface</dt>
                <dd>{PROGRAMMATION_SURFACE_LABELS[evenement.surface]}</dd>
              </div>
            )}
            {evenement.categorie_tournoi && (
              <div>
                <dt className="text-[var(--text-secondary)]">Catégorie tournoi</dt>
                <dd>{evenement.categorie_tournoi}</dd>
              </div>
            )}
            <div>
              <dt className="text-[var(--text-secondary)]">Statut</dt>
              <dd className="capitalize">{evenement.statut.replace("_", " ")}</dd>
            </div>
            {evenement.resultat_simple && (
              <div>
                <dt className="text-[var(--text-secondary)]">Résultat</dt>
                <dd>{evenement.resultat_simple}</dd>
              </div>
            )}
            {evenement.points_gagnes != null && (
              <div>
                <dt className="text-[var(--text-secondary)]">Points gagnés</dt>
                <dd>{evenement.points_gagnes}</dd>
              </div>
            )}
            {evenement.notes_coach && (
              <div>
                <dt className="text-[var(--text-secondary)]">Notes coach</dt>
                <dd className="whitespace-pre-wrap">{evenement.notes_coach}</dd>
              </div>
            )}
            {(evenement.billet_avion_id || evenement.hebergement_id || evenement.competition_id) && (
              <div>
                <dt className="text-[var(--text-secondary)]">Liaisons</dt>
                <dd className="space-y-1 text-xs">
                  {evenement.billet_avion_id && <p>Billet : {evenement.billet_avion_id.slice(0, 8)}…</p>}
                  {evenement.hebergement_id && <p>Hébergement : {evenement.hebergement_id.slice(0, 8)}…</p>}
                  {evenement.competition_id && <p>Compétition : {evenement.competition_id.slice(0, 8)}…</p>}
                </dd>
              </div>
            )}
          </dl>
        </div>
        <div className="flex gap-2 border-t border-[var(--border)] p-4">
          {onEdit && (
            <Button variant="secondary" onClick={() => onEdit(evenement)}>
              Modifier
            </Button>
          )}
          {onDelete && (
            <Button variant="ghost" className="text-red-400" onClick={() => onDelete(evenement.id)}>
              Supprimer
            </Button>
          )}
        </div>
      </aside>
    </div>
  );
}
