import {
  competitionParticipantTypeLabel,
  isCompetitionStaffParticipantType,
} from "@/lib/constants/budget-membres";
import { evaluatePasseportForCompetition } from "@/lib/competitions/passeport-competition";
import type { CompetitionParticipantEnriched } from "@/lib/types/competition";
import type { EntraineurV2, JoueurV2 } from "@/lib/types/v2";
import { resolveJoueurSexe } from "@/lib/v2/joueur-sexe-display";

/** Complète noms / passeport depuis les listes joueurs & entraîneurs (client). */
export function mergeCompetitionParticipantsEnriched(
  raw: CompetitionParticipantEnriched[],
  joueurs: JoueurV2[],
  coachs: EntraineurV2[],
  options?: { dateFin?: string; visasRequis?: boolean }
): CompetitionParticipantEnriched[] {
  const dateFin = options?.dateFin ?? new Date().toISOString().slice(0, 10);
  const visasRequis = options?.visasRequis ?? false;
  const jMap = new Map(joueurs.map((x) => [x.id, x]));
  const cMap = new Map(coachs.map((x) => [x.id, x]));

  return raw.map((p) => {
    if (p.participant_type === "joueur") {
      const joueur = jMap.get(p.participant_id);
      if (!joueur) return p;
      const sexe = resolveJoueurSexe({
        sexe: joueur.sexe,
        categorie_age: joueur.categorie_age,
        categorie: joueur.categorie,
        nom: joueur.nom,
        prenom: joueur.prenom,
      });
      const exp = p.passeport_expiration ?? joueur.passeport_expiration ?? null;
      return {
        ...p,
        nom: joueur.nom?.trim() || p.nom,
        prenom: joueur.prenom?.trim() || p.prenom,
        sexe: sexe ?? p.sexe ?? null,
        poste: sexe === "F" ? "Joueuse" : "Joueur",
        passeport_expiration: exp,
        passeport_alerte: evaluatePasseportForCompetition(exp, dateFin),
        visa_statut: visasRequis ? p.visa_statut : "non_requis",
      };
    }

    if (isCompetitionStaffParticipantType(p.participant_type)) {
      const lib = (p.libelle ?? p.fonction ?? "").trim();
      const tokens = lib.split(/\s+/).filter(Boolean);
      const nom = tokens.length > 0 ? tokens[tokens.length - 1]! : p.nom || "—";
      const prenom = tokens.length > 1 ? tokens.slice(0, -1).join(" ") : p.prenom || "";
      return {
        ...p,
        nom,
        prenom,
        poste: competitionParticipantTypeLabel(p.participant_type),
        fonction: lib || null,
        passeport_alerte: evaluatePasseportForCompetition(p.passeport_expiration, dateFin),
        visa_statut: visasRequis ? p.visa_statut : "non_requis",
      };
    }

    if (p.participant_type === "coach") {
      const coach = cMap.get(p.participant_id);
      if (!coach) return p;
      const nom = coach.nom?.trim() || p.nom;
      const prenom = coach.prenom?.trim() || p.prenom;
      const exp = p.passeport_expiration ?? coach.passeport_expiration ?? null;
      return {
        ...p,
        nom: nom && nom !== "Inconnu" ? nom : coach.nom?.trim() || nom,
        prenom,
        poste: "Coach",
        fonction: coach.specialite?.trim() || p.fonction,
        passeport_expiration: exp,
        passeport_alerte: evaluatePasseportForCompetition(exp, dateFin),
        visa_statut: visasRequis ? p.visa_statut : "non_requis",
      };
    }

    return p;
  });
}
