import { format, parseISO, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import {
  deriveLettreHebergementBesoins,
  hebergementCoachsOnly,
  resolveLettreRenderMode,
} from "@/lib/letters/letter-stage-data";
import type {
  LettreBuiltContent,
  LettreChambreGroupe,
  LettreExceptionLine,
  LettreHebergementBesoins,
  LettreHebergementException,
  LettreParticipantLine,
  LettreReservationInput,
} from "@/lib/letters/letter-types";

const DESTINATAIRE_FIXE = "CLUB DE L'AGRICULTURE";

function formatDateLong(iso: string): string {
  try {
    return format(parseISO(iso), "d MMMM yyyy", { locale: fr });
  } catch {
    return iso;
  }
}

/** Période courte pour l'objet, ex. « 13 au 14 juin 2026 ». */
function formatStagePeriodeObjet(dateDebut: string, dateFin: string): string {
  try {
    const d0 = parseISO(dateDebut);
    const d1 = parseISO(dateFin);
    const sameMonth = d0.getMonth() === d1.getMonth() && d0.getFullYear() === d1.getFullYear();
    if (sameMonth) {
      return `${format(d0, "d", { locale: fr })} au ${format(d1, "d MMMM yyyy", { locale: fr })}`;
    }
    return `${format(d0, "d MMMM", { locale: fr })} au ${format(d1, "d MMMM yyyy", { locale: fr })}`;
  } catch {
    return `${dateDebut} au ${dateFin}`;
  }
}

/** « du 13 au 14 juin 2026 » pour le corps. */
function formatStagePeriodeCorps(dateDebut: string, dateFin: string): string {
  try {
    const d0 = parseISO(dateDebut);
    const d1 = parseISO(dateFin);
    const sameMonth = d0.getMonth() === d1.getMonth() && d0.getFullYear() === d1.getFullYear();
    if (sameMonth) {
      return `du ${format(d0, "d", { locale: fr })} au ${format(d1, "d MMMM yyyy", { locale: fr })}`;
    }
    return `du ${format(d0, "d MMMM", { locale: fr })} au ${format(d1, "d MMMM yyyy", { locale: fr })}`;
  } catch {
    return `du ${dateDebut} au ${dateFin}`;
  }
}

/** Nuitées : « 26 et 27 juin 2026 » ou « 12 et 13 juin 2026 ». */
function formatNuiteesLabel(dateDebut: string, dateFin: string, hebergementDebut?: string): string {
  try {
    const start = hebergementDebut ? parseISO(hebergementDebut) : subDays(parseISO(dateDebut), 1);
    const end = parseISO(dateFin);
    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
    if (sameMonth) {
      return `${format(start, "d", { locale: fr })} et ${format(end, "d MMMM yyyy", { locale: fr })}`;
    }
    return `${format(start, "d MMMM", { locale: fr })} et ${format(end, "d MMMM yyyy", { locale: fr })}`;
  } catch {
    return `${dateDebut} et ${dateFin}`;
  }
}

function personLabel(nom: string, prenom: string): string {
  return `${nom.toUpperCase()} ${prenom}`;
}

function toLines(
  people: { nom: string; prenom: string }[]
): LettreParticipantLine[] {
  return people.map((p) => ({
    nom: p.nom,
    prenom: p.prenom,
    label: personLabel(p.nom, p.prenom),
  }));
}

function buildChambreGroupes(
  input: LettreReservationInput,
  besoins: LettreHebergementBesoins,
  joueurs: LettreParticipantLine[],
  coachs: LettreParticipantLine[]
): LettreChambreGroupe[] {
  const b = besoins;
  const nbGarcons =
    b.chambres_garcons ?? (input.hebergement?.nb_chambres_joueurs && joueurs.length ? input.hebergement.nb_chambres_joueurs : 0);
  const nbFilles = b.chambres_filles ?? 0;
  const nbStaff =
    b.chambres_staff ??
    input.hebergement?.nb_chambres_coachs ??
    (coachs.length > 0 ? coachs.length : 0);

  const garcons = input.joueurs.filter((j) => (j.sexe ?? "M").toString().toUpperCase() !== "F");
  const filles = input.joueurs.filter((j) => (j.sexe ?? "").toString().toUpperCase() === "F");

  const groupes: LettreChambreGroupe[] = [];
  if (nbGarcons > 0 && garcons.length > 0) {
    groupes.push({
      title: `${nbGarcons} chambres garçons :`,
      participants: toLines(garcons),
    });
  }
  if (nbFilles > 0 && filles.length > 0) {
    groupes.push({
      title: `${nbFilles} chambres filles :`,
      participants: toLines(filles),
    });
  }
  if (nbStaff > 0 && coachs.length > 0) {
    groupes.push({
      title: `${nbStaff} chambres singles staff :`,
      participants: coachs,
    });
  }
  if (groupes.length === 0 && joueurs.length > 0) {
    const n = input.hebergement?.nb_chambres_joueurs ?? 2;
    groupes.push({ title: `${n} chambres :`, participants: joueurs });
  }
  return groupes;
}

function buildCoachOnlyParagraph(
  input: LettreReservationInput,
  besoins: LettreHebergementBesoins,
  coachs: LettreParticipantLine[],
  nbJoueurs: number
): string | undefined {
  if (coachs.length === 0) return undefined;
  if (!hebergementCoachsOnly(input.hebergement, besoins, nbJoueurs)) return undefined;

  const nbChambres = besoins.chambres_staff ?? input.hebergement?.nb_chambres_coachs ?? coachs.length;

  const nuits = formatNuiteesLabel(
    input.nuiteesDateDebut ?? input.stage.date_debut,
    input.nuiteesDateFin ?? input.stage.date_fin,
    input.hebergement?.date_debut
  );
  const nbCoach = coachs.length;
  const coachWord = nbCoach > 1 ? "coachs" : "coach";
  const chambreWord = nbChambres > 1 ? "chambres singles" : "chambre single";
  return `L'hébergement concernera uniquement les ${nbCoach > 1 ? `${nbCoach} ` : ""}${coachWord}, avec réservation de ${nbChambres} ${chambreWord} pour les nuitées des ${nuits}.`;
}

function formatDateCourte(iso: string): string {
  try {
    return format(parseISO(iso), "d MMMM yyyy", { locale: fr });
  } catch {
    return iso;
  }
}

function buildExceptionLines(input: LettreReservationInput): LettreExceptionLine[] {
  const lines: LettreExceptionLine[] = [];
  for (const ex of input.exceptions ?? []) {
    const p = findPersonForException(input, ex);
    if (!p) continue;
    const parts: string[] = [];
    if (ex.date_debut && ex.date_fin) {
      parts.push(
        `hébergement du ${formatDateCourte(ex.date_debut)} au ${formatDateCourte(ex.date_fin)}`
      );
    } else if (ex.date_debut) {
      parts.push(`arrivée le ${formatDateCourte(ex.date_debut)}`);
    } else if (ex.date_fin) {
      parts.push(`départ le ${formatDateCourte(ex.date_fin)}`);
    }
    if (ex.kitchenette) parts.push("chambre avec kitchenette");
    if (ex.note?.trim()) parts.push(ex.note.trim());
    lines.push({
      label: personLabel(p.nom, p.prenom),
      detail: parts.length ? parts.join(", ") : "dates spécifiques",
    });
  }
  return lines;
}

function findPersonForException(
  input: LettreReservationInput,
  ex: LettreHebergementException
): { nom: string; prenom: string } | null {
  if (ex.personne_type === "joueur") {
    const j = input.joueurs.find((x) => x.id === ex.personne_id);
    return j ? { nom: j.nom, prenom: j.prenom } : null;
  }
  const c = input.coachs.find((x) => x.id === ex.personne_id);
  return c ? { nom: c.nom, prenom: c.prenom } : null;
}

export function buildLetterContent(input: LettreReservationInput): LettreBuiltContent {
  const besoins = deriveLettreHebergementBesoins(
    input.hebergement,
    input.joueurs,
    input.coachs,
    input.hebergementBesoins
  );
  const mode = resolveLettreRenderMode(input, besoins);
  const stagePeriode = formatStagePeriodeObjet(input.stage.date_debut, input.stage.date_fin);
  const stagePeriodeCorps = formatStagePeriodeCorps(input.stage.date_debut, input.stage.date_fin);

  const joueurs = toLines(input.joueurs);
  const coachs = toLines(input.coachs);
  const participants = [...joueurs, ...coachs];

  const avecHebergement = mode === "hebergement_complet";

  let objet: string;
  let introParagraphs: string[];
  let hebergementRepartitionIntro: string | undefined;
  let hebergementCoachParagraph: string | undefined;
  let chambreGroupes: LettreChambreGroupe[] = [];

  if (mode === "hebergement_complet") {
    objet = `Liste des participants et besoins hébergements – Stage national FRMT (${stagePeriode})`;
    introParagraphs = [
      `Dans le cadre des activités du Centre National de Tennis, la FRMT organise ${stagePeriodeCorps} un stage national de tennis. À cet effet, nous vous communiquons ci-dessous les éléments relatifs à l'organisation de l'hébergement des participants durant les nuits du ${formatNuiteesForIntro(input)}.`,
    ];
    hebergementRepartitionIntro =
      "À ce titre, nous vous prions de bien vouloir assurer l'hébergement destiné aux participants. La répartition des chambres sera comme suit :";
    chambreGroupes = buildChambreGroupes(input, besoins, joueurs, coachs);
  } else {
    hebergementCoachParagraph = buildCoachOnlyParagraph(input, besoins, coachs, joueurs.length);
    if (hebergementCoachParagraph) {
      objet = `Liste des participants et hébergement coachs – Stage national FRMT (${stagePeriode})`;
    } else {
      objet = `Liste des participants – Stage national FRMT (${stagePeriode})`;
    }
    introParagraphs = [
      `Dans le cadre des activités du Centre National de Tennis, la FRMT organise un stage national de tennis ${stagePeriodeCorps}.`,
      "À cet effet, nous vous communiquons la liste des participants relative au déroulement de ce stage.",
    ];
  }

  const closingParagraphs = [
    "Vous trouverez, en pièces jointes, les justificatifs de licences correspondant aux joueurs et membres du staff concernés.",
    "En restant à votre disposition, veuillez agréer, Monsieur, l'expression de nos salutations distinguées.",
  ];

  return {
    dateLettre: input.dateLettre,
    destinataireLigne: `A L'ATTENTION DE LA DIRECTION DU ${DESTINATAIRE_FIXE}`,
    stageNom: input.stage.stage_action,
    stageDates: stagePeriodeCorps,
    objet,
    mode,
    introParagraphs,
    hebergementCoachParagraph,
    hebergementRepartitionIntro,
    chambreGroupes,
    joueurs,
    coachs,
    participants,
    exceptions: buildExceptionLines(input),
    closingParagraphs,
    signatureName: "HAMALI Ayoub",
    signatureTitle: "Le Directeur Général de la FRMT",
    avecHebergement,
  };
}

function formatNuiteesForIntro(input: LettreReservationInput): string {
  try {
    const d0 = parseISO(
      input.nuiteesDateDebut ?? input.hebergement?.date_debut ?? input.stage.date_debut
    );
    const finIso = input.nuiteesDateFin ?? input.hebergement?.date_fin ?? input.stage.date_fin;
    const d1 = subDays(parseISO(finIso), 1);
    const sameMonth = d0.getMonth() === d1.getMonth() && d0.getFullYear() === d1.getFullYear();
    if (sameMonth) {
      return `${format(d0, "d", { locale: fr })} et du ${format(d1, "d MMMM yyyy", { locale: fr })}`;
    }
    return `${format(d0, "d MMMM", { locale: fr })} et du ${format(d1, "d MMMM yyyy", { locale: fr })}`;
  } catch {
    return formatNuiteesLabel(input.stage.date_debut, input.stage.date_fin);
  }
}

export const LETTER_FOOTER_LINES = {
  casablanca: {
    label: "Casablanca siège :",
    lines: [
      "Complexe Al Amal, Quartier des Sports – Beauséjour Casablanca.",
      "Boîte postale : N°171 - Casablanca - Code postal : 20 200",
      "Tél : 05 22 98 17 66 | Fax : 05 22 98 12 65",
      "Email : frmtennisinfo@gmail.com | Site web : www.frmt.ma",
    ],
  },
  rabat: {
    label: "Rabat Annexe :",
    lines: [
      "Villa N°7 Rue Ahmed Lyazidi Ex Meknès, Quartier Hassan – Rabat.",
      "Tél : 05 37 66 00 20/21",
      "Email : contact.frmt@gmail.com",
      "ICE : 001832784000061",
    ],
  },
};
