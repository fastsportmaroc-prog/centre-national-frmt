import { logHistorique } from "@/lib/audit/historique";
import { shouldUseLocalTestStorage } from "@/lib/local-test/mode";
import {
  localCreateBudgetPrevisionnel,
  localDeleteBudgetPrevisionnel,
  localDuplicateBudgetPrevisionnel,
  localGetBudgetHistory,
  localGetBudgetPrevisionnel,
  localListBudgetsPrevisionnel,
  localMarkBudgetPdfExported,
  localUpdateBudgetPrevisionnel,
} from "@/lib/local-test/budget-previsionnel-store";
import { signatairesOfficielsInput, TAUX_MAD_DEFAUT } from "@/lib/constants/budget-previsionnel";
import { getSupabaseDataClient } from "@/lib/supabase/data-client";
import type {
  BudgetParticipantsMeta,
  BudgetPrevisionnel,
  BudgetPrevisionnelFilters,
  BudgetPrevisionnelHistoryEntry,
  BudgetPrevisionnelInput,
  BudgetPrevisionnelLine,
  BudgetPrevisionnelSignatory,
} from "@/lib/types/budget-previsionnel";
import {
  computeBudgetTotals,
  computeLignesWithTotals,
} from "@/lib/utils/budget-previsionnel-math";

const USER = "FRMT Budget";

function isBudgetPrevisionnelTableMissing(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("does not exist") ||
    m.includes("schema cache") ||
    m.includes("could not find the table") ||
    m.includes("relation") && m.includes("budgets_previsionnel")
  );
}

function toSupabaseBudgetRow(
  payload: ReturnType<typeof preparePayload>,
  extra?: { created_by?: string; created_at?: string }
) {
  return {
    objet: payload.objet,
    type_budget: payload.type_budget,
    sujet_libelle: payload.sujet_libelle,
    avec_coach: payload.avec_coach,
    coach_nom: payload.coach_nom,
    tournoi_evenement: payload.tournoi_evenement,
    pays: payload.pays,
    ville: payload.ville,
    date_debut: payload.date_debut,
    date_fin: payload.date_fin,
    nombre_personnes: payload.nombre_personnes,
    devise: payload.devise,
    taux_mad: payload.taux_mad,
    statut: payload.statut,
    joueur_id: payload.joueur_id,
    entraineur_id: payload.entraineur_id,
    stage_id: payload.stage_id,
    equipe_libelle: payload.equipe_libelle,
    sous_total_eur: payload.sous_total_eur,
    total_eur: payload.total_eur,
    total_mad: payload.total_mad,
    montant_lettres_mad: payload.montant_lettres_mad,
    lignes: payload.lignes,
    signataires: payload.signataires,
    participants: payload.participants,
    updated_at: payload.updated_at,
    updated_by: payload.updated_by,
    ...extra,
  };
}

function parseParticipantsFromRow(row: Record<string, unknown>): BudgetParticipantsMeta {
  const raw = row.participants as BudgetParticipantsMeta | undefined;
  if (
    raw?.joueur_ids?.length ||
    raw?.coach_ids?.length ||
    raw?.membres_extras?.length ||
    raw?.groupe_effectif
  ) {
    return {
      joueur_ids: raw.joueur_ids ?? [],
      coach_ids: raw.coach_ids ?? [],
      membres_extras: raw.membres_extras ?? [],
      groupe_effectif: raw.groupe_effectif,
    };
  }
  const joueurId = row.joueur_id as string | null | undefined;
  const coachId = row.entraineur_id as string | null | undefined;
  return {
    joueur_ids: joueurId ? [joueurId] : [],
    coach_ids: coachId ? [coachId] : [],
    membres_extras: [],
  };
}

function rowToBudget(row: Record<string, unknown>): BudgetPrevisionnel {
  const stored = row as unknown as BudgetPrevisionnel;
  const official = signatairesOfficielsInput();
  return {
    ...stored,
    lignes: (row.lignes as BudgetPrevisionnelLine[]) ?? [],
    participants: parseParticipantsFromRow(row),
    signataires: official.map((s, i) => ({
      id: stored.signataires?.[i]?.id ?? `sig-${i}`,
      ...s,
    })),
  };
}

function preparePayload(input: BudgetPrevisionnelInput) {
  const lignes = computeLignesWithTotals(
    input.lignes.map((l, i) => ({ ...l, ordre: l.ordre ?? i }))
  );
  const signataires = signatairesOfficielsInput();
  const devise = (input.devise || "EUR") as "EUR" | "MAD";
  const totals = computeBudgetTotals(lignes, input.taux_mad || TAUX_MAD_DEFAUT, devise);
  const participants: BudgetParticipantsMeta = input.participants ?? {
    joueur_ids: input.joueur_id ? [input.joueur_id] : [],
    coach_ids: input.entraineur_id ? [input.entraineur_id] : [],
    membres_extras: [],
  };
  return {
    ...input,
    joueur_id: participants.joueur_ids[0] ?? input.joueur_id ?? null,
    entraineur_id: participants.coach_ids[0] ?? input.entraineur_id ?? null,
    participants,
    taux_mad: input.taux_mad || TAUX_MAD_DEFAUT,
    devise: input.devise || "EUR",
    lignes,
    signataires,
    ...totals,
    updated_at: new Date().toISOString(),
    updated_by: USER,
  };
}

async function pushHistoryDb(
  budgetId: string,
  action: string,
  details: string | null
) {
  if (shouldUseLocalTestStorage()) return;
  try {
    const supabase = await getSupabaseDataClient();
    await supabase.from("budget_previsionnel_history").insert({
      budget_id: budgetId,
      action,
      utilisateur: USER,
      details,
    });
  } catch {
    /* table absente en local */
  }
}

function useLocalOr<T>(fn: () => T): T {
  if (shouldUseLocalTestStorage()) return fn();
  throw new Error("__use_supabase__");
}

export async function listBudgetsPrevisionnel(
  filters?: BudgetPrevisionnelFilters
): Promise<BudgetPrevisionnel[]> {
  try {
    return useLocalOr(() => localListBudgetsPrevisionnel(filters));
  } catch {
    const supabase = await getSupabaseDataClient();
    let q = supabase.from("budgets_previsionnel").select("*").order("updated_at", {
      ascending: false,
    });
    if (filters?.type_budget) q = q.eq("type_budget", filters.type_budget);
    if (filters?.joueur_id) q = q.eq("joueur_id", filters.joueur_id);
    if (filters?.entraineur_id) q = q.eq("entraineur_id", filters.entraineur_id);
    if (filters?.stage_id) q = q.eq("stage_id", filters.stage_id);
    if (filters?.statut) q = q.eq("statut", filters.statut);
    const { data, error } = await q;
    if (error) {
      if (isBudgetPrevisionnelTableMissing(error.message)) {
        return localListBudgetsPrevisionnel(filters);
      }
      throw new Error(error.message);
    }
    let items = ((data ?? []) as Record<string, unknown>[]).map(rowToBudget);
    if (filters?.q) {
      const s = filters.q.toLowerCase();
      items = items.filter(
        (b) =>
          b.objet.toLowerCase().includes(s) ||
          b.sujet_libelle.toLowerCase().includes(s) ||
          (b.tournoi_evenement?.toLowerCase().includes(s) ?? false)
      );
    }
    return items;
  }
}

export async function getBudgetPrevisionnel(id: string): Promise<BudgetPrevisionnel | null> {
  try {
    return useLocalOr(() => localGetBudgetPrevisionnel(id));
  } catch {
    const supabase = await getSupabaseDataClient();
    const { data, error } = await supabase
      .from("budgets_previsionnel")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      if (isBudgetPrevisionnelTableMissing(error.message)) return localGetBudgetPrevisionnel(id);
      throw new Error(error.message);
    }
    return data ? rowToBudget(data as Record<string, unknown>) : null;
  }
}

export async function createBudgetPrevisionnel(
  input: BudgetPrevisionnelInput
): Promise<BudgetPrevisionnel> {
  if (shouldUseLocalTestStorage()) {
    const item = localCreateBudgetPrevisionnel(input, USER);
    await logHistorique({
      action: "creation",
      module: "budget",
      entite_id: item.id,
      entite_label: item.objet,
      ancienne_valeur: null,
      nouvelle_valeur: String(item.total_eur),
      commentaire: "Budget prévisionnel (local)",
    });
    return item;
  }
  try {
    const payload = preparePayload(input);
    const supabase = await getSupabaseDataClient();
    const row = toSupabaseBudgetRow(payload, {
      created_by: USER,
      created_at: new Date().toISOString(),
    });
    const { data, error } = await supabase.from("budgets_previsionnel").insert(row).select().single();
    if (error) throw new Error(error.message);
    const item = rowToBudget(data as Record<string, unknown>);
    await pushHistoryDb(item.id, "creation", `Total ${item.total_eur} EUR`);
    await logHistorique({
      action: "creation",
      module: "budget",
      entite_id: item.id,
      entite_label: item.objet,
      ancienne_valeur: null,
      nouvelle_valeur: String(item.total_eur),
      commentaire: "Budget prévisionnel",
    });
    return item;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (
      msg.includes("Supabase indisponible") ||
      isBudgetPrevisionnelTableMissing(msg)
    ) {
      const item = localCreateBudgetPrevisionnel(input, USER);
      await logHistorique({
        action: "creation",
        module: "budget",
        entite_id: item.id,
        entite_label: item.objet,
        ancienne_valeur: null,
        nouvelle_valeur: String(item.total_mad || item.total_eur),
        commentaire: "Budget prévisionnel (local — migration SQL requise)",
      });
      return item;
    }
    throw e;
  }
}

export async function updateBudgetPrevisionnel(
  id: string,
  input: Partial<BudgetPrevisionnelInput>
): Promise<BudgetPrevisionnel> {
  if (shouldUseLocalTestStorage()) return localUpdateBudgetPrevisionnel(id, input, USER);
  const existing = await getBudgetPrevisionnel(id);
  if (!existing) throw new Error("Budget introuvable");
  const merged: BudgetPrevisionnelInput = {
    objet: input.objet ?? existing.objet,
    type_budget: input.type_budget ?? existing.type_budget,
    sujet_libelle: input.sujet_libelle ?? existing.sujet_libelle,
    avec_coach: input.avec_coach ?? existing.avec_coach,
    coach_nom: input.coach_nom !== undefined ? input.coach_nom : existing.coach_nom,
    tournoi_evenement:
      input.tournoi_evenement !== undefined
        ? input.tournoi_evenement
        : existing.tournoi_evenement,
    pays: input.pays !== undefined ? input.pays : existing.pays,
    ville: input.ville !== undefined ? input.ville : existing.ville,
    date_debut: input.date_debut ?? existing.date_debut,
    date_fin: input.date_fin ?? existing.date_fin,
    nombre_personnes: input.nombre_personnes ?? existing.nombre_personnes,
    devise: input.devise ?? existing.devise,
    taux_mad: input.taux_mad ?? existing.taux_mad,
    statut: input.statut ?? existing.statut,
    joueur_id: input.joueur_id !== undefined ? input.joueur_id : existing.joueur_id,
    entraineur_id:
      input.entraineur_id !== undefined ? input.entraineur_id : existing.entraineur_id,
    stage_id: input.stage_id !== undefined ? input.stage_id : existing.stage_id,
    equipe_libelle:
      input.equipe_libelle !== undefined ? input.equipe_libelle : existing.equipe_libelle,
    participants: input.participants ?? existing.participants,
    lignes:
      input.lignes?.map((l, i) => ({
        designation: l.designation,
        description: l.description ?? null,
        quantite: l.quantite,
        jours_nuits: l.jours_nuits,
        prix_unitaire_eur: l.prix_unitaire_eur,
        remarques: l.remarques ?? null,
        ordre: l.ordre ?? i,
      })) ??
      existing.lignes.map((l) => ({
        designation: l.designation,
        description: l.description,
        quantite: l.quantite,
        jours_nuits: l.jours_nuits,
        prix_unitaire_eur: l.prix_unitaire_eur,
        remarques: l.remarques,
        ordre: l.ordre,
      })),
  };
  try {
    const payload = preparePayload(merged);
    const supabase = await getSupabaseDataClient();
    const { data, error } = await supabase
      .from("budgets_previsionnel")
      .update(toSupabaseBudgetRow(payload))
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    const item = rowToBudget(data as Record<string, unknown>);
    await pushHistoryDb(id, "modification", `Total ${item.total_eur} EUR`);
    return item;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (isBudgetPrevisionnelTableMissing(msg)) {
      return localUpdateBudgetPrevisionnel(id, input, USER);
    }
    return localUpdateBudgetPrevisionnel(id, input, USER);
  }
}

export async function duplicateBudgetPrevisionnel(id: string): Promise<BudgetPrevisionnel> {
  if (shouldUseLocalTestStorage()) return localDuplicateBudgetPrevisionnel(id);
  const src = await getBudgetPrevisionnel(id);
  if (!src) throw new Error("Budget introuvable");
  return createBudgetPrevisionnel({
    objet: `${src.objet} (copie)`,
    type_budget: src.type_budget,
    sujet_libelle: src.sujet_libelle,
    avec_coach: src.avec_coach,
    coach_nom: src.coach_nom,
    tournoi_evenement: src.tournoi_evenement,
    pays: src.pays,
    ville: src.ville,
    date_debut: src.date_debut,
    date_fin: src.date_fin,
    nombre_personnes: src.nombre_personnes,
    devise: src.devise,
    taux_mad: src.taux_mad,
    statut: "brouillon",
    joueur_id: src.joueur_id,
    entraineur_id: src.entraineur_id,
    participants: src.participants,
    stage_id: src.stage_id,
    equipe_libelle: src.equipe_libelle,
    lignes: src.lignes.map((l) => ({
      designation: l.designation,
      description: l.description,
      quantite: l.quantite,
      jours_nuits: l.jours_nuits,
      prix_unitaire_eur: l.prix_unitaire_eur,
      remarques: l.remarques,
      ordre: l.ordre,
    })),
  });
}

export async function archiveBudgetPrevisionnel(id: string): Promise<BudgetPrevisionnel> {
  return updateBudgetPrevisionnel(id, { statut: "archive" });
}

export async function deleteBudgetPrevisionnel(id: string): Promise<void> {
  if (shouldUseLocalTestStorage()) {
    localDeleteBudgetPrevisionnel(id);
    return;
  }
  try {
    const supabase = await getSupabaseDataClient();
    const { error } = await supabase.from("budgets_previsionnel").delete().eq("id", id);
    if (error) throw new Error(error.message);
    await pushHistoryDb(id, "suppression", null);
  } catch {
    localDeleteBudgetPrevisionnel(id);
  }
}

export async function markBudgetPdfExported(id: string): Promise<BudgetPrevisionnel> {
  if (shouldUseLocalTestStorage()) return localMarkBudgetPdfExported(id);
  try {
    const supabase = await getSupabaseDataClient();
    const { data, error } = await supabase
      .from("budgets_previsionnel")
      .update({ dernier_export_pdf_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    await pushHistoryDb(id, "export_pdf", null);
    return rowToBudget(data as Record<string, unknown>);
  } catch {
    return localMarkBudgetPdfExported(id);
  }
}

export async function getBudgetPrevisionnelHistory(
  budgetId: string
): Promise<BudgetPrevisionnelHistoryEntry[]> {
  if (shouldUseLocalTestStorage()) return localGetBudgetHistory(budgetId);
  try {
    const supabase = await getSupabaseDataClient();
    const { data, error } = await supabase
      .from("budget_previsionnel_history")
      .select("*")
      .eq("budget_id", budgetId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as BudgetPrevisionnelHistoryEntry[];
  } catch {
    return localGetBudgetHistory(budgetId);
  }
}
