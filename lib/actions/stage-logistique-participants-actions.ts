"use server";

import { revalidatePath } from "next/cache";
import { getAuthUserFromServer } from "@/lib/auth/server-session";
import { resolveEffectiveAppRole } from "@/lib/auth/passeports-access";
import {
  bulkUpsertHebergementParticipantsServer,
  countRepasPrevusStage,
  createExternalHebergementParticipantServer,
  deleteHebergementParticipantServer,
  deleteParticipantMealOverrideServer,
  hebergementRowsToParticipantDates,
  loadStageHebergementParticipants,
  loadStageRestaurationDetail,
  listInterneChambresServer,
  saveJourRepasServer,
  saveParticipantMealServer,
  upsertHebergementParticipantServer,
} from "@/lib/data/stage-logistique-participants.server";
import { getHebergementByStageServer, saveHebergementForStageServer } from "@/lib/data/stage-hebergement.server";
import { hebergementToForm } from "@/lib/v2/stage-hebergement-form";
import { getStageParticipantsServer } from "@/lib/data/stage-relations.server";
import type {
  HebergementParticipantRow,
  JourRepasStage,
  ParticipantMealOverride,
} from "@/lib/types/v2";

function canManage(role: string): boolean {
  return role === "admin" || role === "entraineur" || role === "direction" || role === "viewer";
}

export async function getStageHebergementParticipantsAction(stageId: string) {
  if (!(await getAuthUserFromServer())) return null;
  return loadStageHebergementParticipants(stageId);
}

export async function getInterneChambresAction() {
  if (!(await getAuthUserFromServer())) return [];
  return listInterneChambresServer();
}

export async function saveHebergementParticipantAction(row: HebergementParticipantRow) {
  const user = await getAuthUserFromServer();
  if (!user) return { ok: false, error: "Non authentifié" };
  if (!canManage(resolveEffectiveAppRole(user))) {
    return { ok: false, error: "Droits insuffisants" };
  }

  const res = await upsertHebergementParticipantServer(row);
  if (res.ok) {
    await syncHebergementLegacyFromRows(row.stage_id);
    revalidatePath(`/v2/stages/${row.stage_id}`);
  }
  return res;
}

export async function bulkSaveHebergementParticipantsAction(
  stageId: string,
  rows: HebergementParticipantRow[]
) {
  const user = await getAuthUserFromServer();
  if (!user) return { ok: false, error: "Non authentifié" };
  if (!canManage(resolveEffectiveAppRole(user))) {
    return { ok: false, error: "Droits insuffisants" };
  }

  const res = await bulkUpsertHebergementParticipantsServer(rows);
  if (res.ok) {
    await syncHebergementLegacyFromRows(stageId);
    revalidatePath(`/v2/stages/${stageId}`);
  }
  return res;
}

export async function addExternalHebergementParticipantAction(input: {
  stageId: string;
  nom: string;
  prenom?: string;
  dateArrivee: string;
  dateDepart: string;
  chambreId?: string | null;
}) {
  const user = await getAuthUserFromServer();
  if (!user) return { ok: false, error: "Non authentifié" };
  if (!canManage(resolveEffectiveAppRole(user))) {
    return { ok: false, error: "Droits insuffisants" };
  }
  if (!input.nom.trim()) return { ok: false, error: "Nom obligatoire" };
  const res = await createExternalHebergementParticipantServer(input);
  if (res.ok) {
    await syncHebergementLegacyFromRows(input.stageId);
    revalidatePath(`/v2/stages/${input.stageId}`);
  }
  return res;
}

export async function removeHebergementParticipantAction(input: {
  stageId: string;
  participantType: HebergementParticipantRow["participant_type"];
  participantId: string | null;
  rowId?: string;
}) {
  const user = await getAuthUserFromServer();
  if (!user) return { ok: false, error: "Non authentifié" };
  if (!canManage(resolveEffectiveAppRole(user))) {
    return { ok: false, error: "Droits insuffisants" };
  }
  const res = await deleteHebergementParticipantServer(
    input.stageId,
    input.participantType,
    input.participantId,
    input.rowId
  );
  if (res.ok) {
    await syncHebergementLegacyFromRows(input.stageId);
    revalidatePath(`/v2/stages/${input.stageId}`);
  }
  return res;
}

async function syncHebergementLegacyFromRows(stageId: string) {
  const { participants, stageDates } = await loadStageHebergementParticipants(stageId);
  const hebergement = await getHebergementByStageServer(stageId);
  if (!hebergement) return;

  const { joueurs, coachs } = await getStageParticipantsServer(stageId);
  const form = hebergementToForm(
    { date_debut: stageDates.debut, date_fin: stageDates.fin, hebergement: true },
    hebergement,
    joueurs,
    coachs,
    joueurs.length,
    coachs.length
  );
  form.participants_dates = hebergementRowsToParticipantDates(
    participants,
    stageDates.debut,
    stageDates.fin
  );
  form.dates_participants_actif = form.participants_dates.some((r) => r.dates_personnalisees);

  await saveHebergementForStageServer({
    stageId,
    actif: true,
    form,
    statut: hebergement.statut,
    nbJoueurs: joueurs.length,
    nbCoachs: coachs.length,
  });
}

export async function getStageRestaurationDetailAction(stageId: string) {
  if (!(await getAuthUserFromServer())) return null;
  return loadStageRestaurationDetail(stageId);
}

export async function saveJourRepasAction(stageId: string, jour: JourRepasStage) {
  const user = await getAuthUserFromServer();
  if (!user) return { ok: false, error: "Non authentifié" };
  if (!canManage(resolveEffectiveAppRole(user))) {
    return { ok: false, error: "Droits insuffisants" };
  }
  const res = await saveJourRepasServer(stageId, jour);
  if (res.ok) revalidatePath(`/v2/stages/${stageId}`);
  return res;
}

export async function saveParticipantMealAction(stageId: string, override: ParticipantMealOverride) {
  const user = await getAuthUserFromServer();
  if (!user) return { ok: false, error: "Non authentifié" };
  if (!canManage(resolveEffectiveAppRole(user))) {
    return { ok: false, error: "Droits insuffisants" };
  }
  const res = await saveParticipantMealServer(stageId, override);
  if (res.ok) revalidatePath(`/v2/stages/${stageId}`);
  return res;
}

export async function resetParticipantMealForDayAction(
  stageId: string,
  participantId: string,
  participantType: "joueur" | "coach",
  date: string
) {
  const user = await getAuthUserFromServer();
  if (!user) return { ok: false, error: "Non authentifié" };
  if (!canManage(resolveEffectiveAppRole(user))) {
    return { ok: false, error: "Droits insuffisants" };
  }
  const res = await deleteParticipantMealOverrideServer(stageId, participantId, participantType, date);
  if (res.ok) revalidatePath(`/v2/stages/${stageId}`);
  return res;
}

export async function getStageRepasPrevusCountAction(stageId: string): Promise<number> {
  const data = await loadStageRestaurationDetail(stageId);
  return countRepasPrevusStage(data.jours, data.overrides, data.participants);
}
