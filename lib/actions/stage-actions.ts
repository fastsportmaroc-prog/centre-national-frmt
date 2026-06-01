"use server";

/**
 * Création stage complète — V2
 * Chaque étape logue l'erreur et continue.
 */
import { saveHebergementForStageServer } from "@/lib/data/stage-hebergement.server";
import { getEntraineurs, getInfrastructures, getJoueurs } from "@/lib/supabase/queries";
import {
  createDemandeBilletServer,
  createReservationInfrastructureServer,
  createRestaurationServer,
  createSeanceServer,
  createStageServer,
  deleteStageServer,
  linkCoachStageServer,
  linkJoueurStageServer,
  updateStageServer,
} from "@/lib/supabase/stage-write.server";
import { logAction } from "@/lib/supabase/log-action.server";
import { generateAndPersistLettre } from "@/lib/letters/save-lettre.server";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  suggestedChambresCounts,
  totalChambresFromForm,
} from "@/lib/v2/stage-hebergement-form";
import {
  calcTotalRepas,
  countDaysInclusive,
  eachDayOfStage,
  getCreneauHoraires,
} from "@/lib/v2/stage-calculations";
import type {
  CreateStageCompletResult,
  HebergementStageV2,
  StageCompletFormData,
  StageProgrammeInputV2,
} from "@/lib/types/v2";
import { syncStagePlanning } from "@/lib/v2/sync-stage-planning";
import { revalidateStageLinkedPaths } from "@/lib/server/revalidate-stage-paths";
import { getAuthUserFromServer } from "@/lib/auth/server-session";

export async function createStageComplet(form: StageCompletFormData): Promise<CreateStageCompletResult> {
  const user = await getAuthUserFromServer();
  if (!user) {
    return {
      success: false,
      hebergement_cree: false,
      restauration_creee: false,
      seances_creees: 0,
      reservations_creees: 0,
      billets_generes: 0,
      erreurs: ["Non authentifié — reconnectez-vous."],
      message: "Session expirée. Reconnectez-vous pour créer un stage.",
    };
  }

  const erreurs: string[] = [];
  const nbJoueurs = form.joueur_ids.length;
  const nbCoachs = form.entraineur_ids.length;
  const totalParticipants = nbJoueurs + nbCoachs;

  let chambres = 0;
  let hebergementForm = form.hebergement;
  if (form.hebergement.actif) {
    if (hebergementForm.nb_chambres_joueurs === 0 && hebergementForm.nb_chambres_coachs === 0) {
      const suggested = suggestedChambresCounts(nbJoueurs, nbCoachs, hebergementForm);
      hebergementForm = { ...hebergementForm, ...suggested };
    }
    chambres = totalChambresFromForm(hebergementForm);
  }

  const { stage, error: stageErr } = await createStageServer({
    stage_action: form.stage_action,
    categorie: form.categorie,
    date_debut: form.date_debut,
    date_fin: form.date_fin,
    lieu: form.lieu || null,
    notes: form.notes || null,
    statut: form.statut,
    nombre_joueurs: nbJoueurs,
    nombre_encadrants: nbCoachs,
    hebergement: form.hebergement.actif,
    chambres,
    terrains: form.terrains.actif,
    restauration: form.restauration.actif,
    transport_avion: form.transport_avion.actif,
  });

  if (!stage || stageErr) {
    return {
      success: false,
      hebergement_cree: false,
      restauration_creee: false,
      seances_creees: 0,
      reservations_creees: 0,
      billets_generes: 0,
      erreurs: [stageErr ?? "Impossible de créer le stage"],
      message: stageErr ?? "Erreur création stage",
    };
  }

  const stage_id = stage.id;
  let hebergement_cree = false;
  let hebergementData: HebergementStageV2 | null = null;
  let restauration_creee = false;
  let seances_creees = 0;
  let reservations_creees = 0;
  let billets_generes = 0;
  let lettre_generee = false;
  let lettre_id: string | undefined;
  let lettre_pdf_base64: string | undefined;
  let lettre_docx_base64: string | undefined;
  let lettre_filename_base: string | undefined;

  for (const joueur_id of form.joueur_ids) {
    const r = await linkJoueurStageServer(stage_id, joueur_id);
    if (!r.ok) erreurs.push(`stage_joueurs ${joueur_id}: ${r.error}`);
  }

  for (const coach_id of form.entraineur_ids) {
    const r = await linkCoachStageServer(stage_id, coach_id);
    if (!r.ok) erreurs.push(`stage_coachs ${coach_id}: ${r.error}`);
  }

  if (form.hebergement.actif) {
    const hebForm = {
      ...hebergementForm,
      date_debut: hebergementForm.date_debut || form.date_debut,
      date_fin: hebergementForm.date_fin || form.date_fin,
    };
    const { hebergement: data, error } = await saveHebergementForStageServer({
      stageId: stage_id,
      actif: true,
      form: hebForm,
      statut: "prevu",
      nbJoueurs,
      nbCoachs,
    });
    if (error) erreurs.push(`hebergements: ${error}`);
    else {
      hebergement_cree = !!data;
      hebergementData = data;
    }
  }

  if (form.restauration.actif) {
    const jours = countDaysInclusive(
      form.restauration.date_debut || form.date_debut,
      form.restauration.date_fin || form.date_fin
    );
    const total_repas = calcTotalRepas(form.restauration, totalParticipants, jours);
    const { data, error } = await createRestaurationServer({
      stage_id,
      petit_dejeuner: form.restauration.petit_dejeuner,
      dejeuner: form.restauration.dejeuner,
      diner: form.restauration.diner,
      date_debut: form.restauration.date_debut || form.date_debut,
      date_fin: form.restauration.date_fin || form.date_fin,
      nb_personnes: totalParticipants,
      total_repas,
      remarques: form.restauration.remarques || null,
      statut: "prevu",
    });
    if (error) erreurs.push(`restaurations: ${error}`);
    else restauration_creee = !!data;
  }

  if (form.terrains.actif) {
    const infrastructures = await getInfrastructures();
    const surfaceFilter = form.terrains.surface;
    let courts = infrastructures.filter((i) => {
      const t = (i.type ?? "").toLowerCase();
      if (t && !t.includes("terrain") && !t.includes("court")) return false;
      if (surfaceFilter === "indifferent") return true;
      const s = (i.surface ?? "").toLowerCase();
      if (surfaceFilter === "terre_battue") return s.includes("terre") || s.includes("battue");
      if (surfaceFilter === "dur") return s.includes("dur") || s.includes("hard");
      return true;
    });
    if (courts.length === 0) courts = infrastructures.slice(0, form.terrains.nb_courts);
    courts = courts.slice(0, form.terrains.nb_courts);
    const creneau = form.terrains.creneau;
    const { debut, fin } = getCreneauHoraires(form.terrains);
    const days = eachDayOfStage(form.date_debut, form.date_fin);
    const coachId = form.entraineur_ids[0] ?? null;

    for (const day of days) {
      for (const court of courts) {
        const { data: seance, error: seErr } = await createSeanceServer({
          stage_id,
          date: day,
          heure_debut: debut,
          heure_fin: fin,
          infrastructure_id: court.id,
          surface: court.surface ?? null,
          coach_id: coachId,
          groupe: form.categorie,
          statut: "prevu",
        });
        if (seErr) erreurs.push(`planning ${day}: ${seErr}`);
        else if (seance) seances_creees++;

        const dateDebut = `${day}T${debut}:00`;
        const dateFin = `${day}T${fin}:00`;
        const { data: resa, error: resErr } = await createReservationInfrastructureServer({
          infrastructure_id: court.id,
          stage_id,
          entraineur_id: coachId,
          date_debut: dateDebut,
          date_fin: dateFin,
          creneau,
          heure_debut: debut,
          heure_fin: fin,
          statut: "confirmee",
          notes: form.stage_action,
        });
        if (resErr) erreurs.push(`reservation ${day}: ${resErr}`);
        else if (resa) reservations_creees++;
      }
    }
  }

  if (form.transport_avion.actif) {
    const [joueurs, entraineurs] = await Promise.all([getJoueurs(), getEntraineurs()]);
    const jMap = new Map(joueurs.map((j) => [j.id, j]));
    const eMap = new Map(entraineurs.map((e) => [e.id, e]));

    const targets: { id: string; type: "joueur" | "entraineur" }[] = [];
    if (form.transport_avion.tous_joueurs) {
      form.joueur_ids.forEach((id) => targets.push({ id, type: "joueur" }));
    } else {
      form.transport_avion.joueur_ids.forEach((id) => targets.push({ id, type: "joueur" }));
    }
    if (form.transport_avion.tous_entraineurs) {
      form.entraineur_ids.forEach((id) => targets.push({ id, type: "entraineur" }));
    } else {
      form.transport_avion.entraineur_ids.forEach((id) => targets.push({ id, type: "entraineur" }));
    }

    for (const t of targets) {
      const p =
        t.type === "joueur" ? jMap.get(t.id) : eMap.get(t.id);
      if (!p) continue;
      const { data, error } = await createDemandeBilletServer({
        stage_id,
        personne_id: t.id,
        personne_type: t.type,
        personne_nom: p.nom,
        personne_prenom: p.prenom,
        aeroport_depart: form.transport_avion.aeroport_depart,
        date_depart: form.transport_avion.date_depart || form.date_debut,
        heure_depart: form.transport_avion.heure_depart || null,
        aeroport_retour: form.transport_avion.aeroport_retour,
        date_retour: form.transport_avion.date_retour || form.date_fin,
        heure_retour: form.transport_avion.heure_retour || null,
        prix_unitaire: form.transport_avion.prix_unitaire,
        statut: "demande",
        devise: "EUR",
        notes: null,
      });
      if (error) erreurs.push(`billet ${p.nom}: ${error}`);
      else if (data) billets_generes++;
    }
  }

  await logAction({
    action: "stage_created",
    description: `Stage créé : ${form.stage_action}`,
    stage_id,
    table_concernee: "stages_programme",
    record_id: stage_id,
    nouvelle_valeur: form as unknown as Record<string, unknown>,
    module: "stages",
  });

  try {
    const [allJoueurs, allCoachs] = await Promise.all([getJoueurs(), getEntraineurs()]);
    const joueursSel = allJoueurs.filter((j) => form.joueur_ids.includes(j.id));
    const coachsSel = allCoachs.filter((e) => form.entraineur_ids.includes(e.id));
    const club =
      form.lettre.club_destinataire.trim() ||
      form.lieu?.trim() ||
      "Club de l'Agriculture";
    const dateLettre = `${form.lettre.lieu_envoi || "Rabat"}, le ${format(new Date(), "d MMMM yyyy", { locale: fr })}`;

    const lettreType =
      !form.hebergement.actif && form.terrains.actif
        ? "terrains_only"
        : form.lettre.type;

    const lettreResult = await generateAndPersistLettre({
      stage_id,
      stage,
      joueurs: joueursSel,
      coachs: coachsSel,
      hebergement: hebergementData,
      clubDestinataire: club,
      dateLettre,
      type: lettreType,
      exceptions: form.lettre.exceptions,
      contenuPersonnalise: form.lettre.contenu_personnalise,
      nbCourts: form.terrains.nb_courts,
    });

    if (lettreResult.ok && lettreResult.record) {
      lettre_generee = true;
      lettre_id = lettreResult.record.id;
      lettre_pdf_base64 = lettreResult.record.pdf_base64 ?? undefined;
      lettre_docx_base64 = lettreResult.record.docx_base64 ?? undefined;
      lettre_filename_base = `lettre-${form.stage_action}`;
    } else if (lettreResult.error) {
      erreurs.push(`lettre: ${lettreResult.error}`);
    }
  } catch (e) {
    console.warn("Lettre non générée", e);
    erreurs.push("lettre: génération échouée");
  }

  const syncedPlanning = await syncStagePlanning({
    stage_id,
    date_debut: form.date_debut,
    date_fin: form.date_fin,
    notes: form.notes,
    categorie: form.categorie,
    coach_id: form.entraineur_ids[0] ?? null,
  });
  seances_creees += syncedPlanning;

  revalidateStageLinkedPaths(stage_id);

  const parts = [
    "Stage créé ✓",
    hebergement_cree ? "Hébergement généré ✓" : form.hebergement.actif ? "Hébergement ✗" : null,
    restauration_creee ? "Restauration générée ✓" : form.restauration.actif ? "Restauration ✗" : null,
    seances_creees > 0 ? "Planning synchronisé ✓" : "Planning ✗",
    reservations_creees > 0 ? `${reservations_creees} courts réservés ✓` : null,
    billets_generes > 0 ? `${billets_generes} billets générés ✓` : null,
    lettre_generee ? "Lettre officielle générée ✓" : null,
  ].filter(Boolean);

  return {
    success: true,
    stage_id,
    hebergement_cree,
    restauration_creee,
    seances_creees,
    reservations_creees,
    billets_generes,
    lettre_generee,
    lettre_id,
    lettre_pdf_base64,
    lettre_docx_base64,
    lettre_filename_base,
    erreurs,
    message: parts.join(" | "),
  };
}

export async function updateStageQuickAction(
  id: string,
  data: Partial<StageProgrammeInputV2>
): Promise<{ ok: boolean; error?: string }> {
  const res = await updateStageServer(id, data);
  if (res.ok) {
    revalidateStageLinkedPaths(id);
  }
  return res;
}

export async function deleteStageQuickAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const res = await deleteStageServer(id);
  if (res.ok) {
    revalidateStageLinkedPaths(id);
  }
  return res;
}
