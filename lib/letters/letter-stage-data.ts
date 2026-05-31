import { calcChambresCoachs, calcChambresJoueurs } from "@/lib/v2/stage-calculations";
import type { LettreHebergementBesoins, LettreRenderMode, LettreReservationInput } from "@/lib/letters/letter-types";
import type { EntraineurV2, HebergementStageV2, JoueurV2 } from "@/lib/types/v2";

function isFemme(sexe: string | null | undefined): boolean {
  return (sexe ?? "").toString().toUpperCase() === "F";
}

function hasBesoins(b: LettreHebergementBesoins): boolean {
  return (
    (b.chambres_garcons ?? 0) > 0 ||
    (b.chambres_filles ?? 0) > 0 ||
    (b.chambres_staff ?? 0) > 0
  );
}

/** Besoins chambres dérivés de l’onglet Hébergement + participants (sexe M/F). */
export function deriveLettreHebergementBesoins(
  hebergement: HebergementStageV2 | null,
  joueurs: Pick<JoueurV2, "sexe">[],
  coachs: Pick<EntraineurV2, "id">[],
  override?: LettreHebergementBesoins
): LettreHebergementBesoins {
  if (override && hasBesoins(override)) return override;

  if (!hebergement) return override ?? {};

  const filles = joueurs.filter((j) => isFemme(j.sexe));
  const garcons = joueurs.filter((j) => !isFemme(j.sexe));
  const typeJ =
    (hebergement.type_chambre_joueurs as "single" | "double" | "triple") ?? "double";
  const typeC =
    (hebergement.type_chambre_coachs as "single" | "double") ?? "single";

  const nbStaff =
    override?.chambres_staff ??
    hebergement.nb_chambres_coachs ??
    (coachs.length > 0 ? calcChambresCoachs(coachs.length, typeC) : 0);

  const nbJoueursTotal = hebergement.nb_chambres_joueurs ?? 0;

  if (garcons.length > 0 && filles.length > 0) {
    return {
      chambres_garcons:
        override?.chambres_garcons ?? calcChambresJoueurs(garcons.length, typeJ),
      chambres_filles:
        override?.chambres_filles ?? calcChambresJoueurs(filles.length, typeJ),
      chambres_staff: nbStaff,
      chambre_kitchenette: override?.chambre_kitchenette,
      chambre_individuelle: override?.chambre_individuelle,
    };
  }

  if (garcons.length > 0) {
    return {
      chambres_garcons:
        override?.chambres_garcons ??
        (nbJoueursTotal > 0 ? nbJoueursTotal : calcChambresJoueurs(garcons.length, typeJ)),
      chambres_staff: nbStaff,
    };
  }

  if (filles.length > 0) {
    return {
      chambres_filles:
        override?.chambres_filles ??
        (nbJoueursTotal > 0 ? nbJoueursTotal : calcChambresJoueurs(filles.length, typeJ)),
      chambres_staff: nbStaff,
    };
  }

  return { chambres_staff: nbStaff };
}

export function resolveLettreRenderMode(
  input: Pick<LettreReservationInput, "type" | "hebergement" | "hebergementBesoins">,
  besoins: LettreHebergementBesoins
): LettreRenderMode {
  const type = input.type ?? "reservation";
  if (type === "liste_participants" || type === "terrains_only") {
    return "liste_participants";
  }
  if (type === "libre") return "liste_participants";

  const nbGarcons = besoins.chambres_garcons ?? 0;
  const nbFilles = besoins.chambres_filles ?? 0;
  const nbJoueursHeb = input.hebergement?.nb_chambres_joueurs ?? 0;
  if (nbGarcons > 0 || nbFilles > 0 || nbJoueursHeb > 0) {
    return "hebergement_complet";
  }
  return "liste_participants";
}

export function hebergementCoachsOnly(
  hebergement: HebergementStageV2 | null,
  besoins: LettreHebergementBesoins,
  nbJoueurs: number
): boolean {
  if (!hebergement && !(besoins.chambres_staff ?? 0)) return false;
  const joueurRooms = (besoins.chambres_garcons ?? 0) + (besoins.chambres_filles ?? 0);
  return nbJoueurs > 0 && joueurRooms === 0 && (hebergement?.nb_chambres_joueurs ?? 0) === 0;
}
