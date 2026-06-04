import {
  PROGRAMMATION_SURFACE_LABELS,
  PROGRAMMATION_TYPE_LABELS,
} from "@/lib/constants/programmation-joueurs";
import type { ProgrammationEvenementEnriched } from "@/lib/types/programmation-joueurs";
import { formatPeriodePdf } from "@/lib/pdf/pdf-format";

type Props = {
  evenement: ProgrammationEvenementEnriched;
  children: React.ReactNode;
};

export function TooltipEvenement({ evenement, children }: Props) {
  const lieu = [evenement.ville, evenement.pays].filter(Boolean).join(", ");
  const surface = evenement.surface
    ? PROGRAMMATION_SURFACE_LABELS[evenement.surface]
    : null;
  const title = [
    evenement.nom,
    lieu || null,
    formatPeriodePdf(evenement.date_debut, evenement.date_fin),
    PROGRAMMATION_TYPE_LABELS[evenement.type],
    evenement.categorie_tournoi,
    surface,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <span title={title} className="block h-full w-full">
      {children}
    </span>
  );
}
