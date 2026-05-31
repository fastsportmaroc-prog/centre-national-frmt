import { signatairesOfficielsInput, TAUX_MAD_DEFAUT } from "@/lib/constants/budget-previsionnel";
import type {
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
import { newLocalId, readJson, writeJson } from "./storage";

const KEY_BUDGETS = "budgets_previsionnel";
const KEY_HISTORY = "budgets_previsionnel_history";

function now() {
  return new Date().toISOString();
}

function loadAll(): BudgetPrevisionnel[] {
  return readJson<BudgetPrevisionnel[]>(KEY_BUDGETS, []);
}

function saveAll(items: BudgetPrevisionnel[]) {
  writeJson(KEY_BUDGETS, items);
}

function pushHistory(
  budgetId: string,
  action: string,
  details: string | null,
  user = "Mode local test"
) {
  const hist = readJson<BudgetPrevisionnelHistoryEntry[]>(KEY_HISTORY, []);
  hist.unshift({
    id: newLocalId(),
    budget_id: budgetId,
    action,
    utilisateur: user,
    details,
    created_at: now(),
  });
  writeJson(KEY_HISTORY, hist.slice(0, 500));
}

function normalizeInput(input: BudgetPrevisionnelInput, user: string): BudgetPrevisionnel {
  const t = now();
  const lignes = computeLignesWithTotals(
    input.lignes.map((l, i) => ({ ...l, id: newLocalId(), ordre: l.ordre ?? i }))
  );
  const signataires: BudgetPrevisionnelSignatory[] = signatairesOfficielsInput().map((s) => ({
    id: newLocalId(),
    poste: s.poste,
    nom: s.nom,
    ordre: s.ordre,
  }));
  const devise = (input.devise || "EUR") as "EUR" | "MAD";
  const totals = computeBudgetTotals(lignes, input.taux_mad || TAUX_MAD_DEFAUT, devise);
  return {
    id: newLocalId(),
    ...input,
    taux_mad: input.taux_mad || TAUX_MAD_DEFAUT,
    devise,
    lignes,
    signataires,
    ...totals,
    dernier_export_pdf_at: null,
    created_by: user,
    updated_by: user,
    created_at: t,
    updated_at: t,
  };
}

export function localListBudgetsPrevisionnel(
  filters?: BudgetPrevisionnelFilters
): BudgetPrevisionnel[] {
  let items = loadAll();
  if (filters?.q) {
    const q = filters.q.toLowerCase();
    items = items.filter(
      (b) =>
        b.objet.toLowerCase().includes(q) ||
        b.sujet_libelle.toLowerCase().includes(q) ||
        (b.tournoi_evenement?.toLowerCase().includes(q) ?? false)
    );
  }
  if (filters?.type_budget) items = items.filter((b) => b.type_budget === filters.type_budget);
  if (filters?.joueur_id) items = items.filter((b) => b.joueur_id === filters.joueur_id);
  if (filters?.entraineur_id)
    items = items.filter((b) => b.entraineur_id === filters.entraineur_id);
  if (filters?.stage_id) items = items.filter((b) => b.stage_id === filters.stage_id);
  if (filters?.statut) items = items.filter((b) => b.statut === filters.statut);
  if (filters?.date_debut)
    items = items.filter((b) => b.date_fin >= filters.date_debut!);
  if (filters?.date_fin) items = items.filter((b) => b.date_debut <= filters.date_fin!);
  return items.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function localGetBudgetPrevisionnel(id: string): BudgetPrevisionnel | null {
  return loadAll().find((b) => b.id === id) ?? null;
}

export function localCreateBudgetPrevisionnel(
  input: BudgetPrevisionnelInput,
  user = "Mode local test"
): BudgetPrevisionnel {
  const item = normalizeInput(input, user);
  const all = loadAll();
  all.push(item);
  saveAll(all);
  pushHistory(item.id, "creation", `Total ${item.total_eur} EUR`);
  return item;
}

export function localUpdateBudgetPrevisionnel(
  id: string,
  input: Partial<BudgetPrevisionnelInput>,
  user = "Mode local test"
): BudgetPrevisionnel {
  const all = loadAll();
  const idx = all.findIndex((b) => b.id === id);
  if (idx < 0) throw new Error("Budget introuvable");
  const prev = all[idx]!;
  const merged: BudgetPrevisionnelInput = {
    objet: input.objet ?? prev.objet,
    type_budget: input.type_budget ?? prev.type_budget,
    sujet_libelle: input.sujet_libelle ?? prev.sujet_libelle,
    avec_coach: input.avec_coach ?? prev.avec_coach,
    coach_nom: input.coach_nom !== undefined ? input.coach_nom : prev.coach_nom,
    tournoi_evenement:
      input.tournoi_evenement !== undefined ? input.tournoi_evenement : prev.tournoi_evenement,
    pays: input.pays !== undefined ? input.pays : prev.pays,
    ville: input.ville !== undefined ? input.ville : prev.ville,
    date_debut: input.date_debut ?? prev.date_debut,
    date_fin: input.date_fin ?? prev.date_fin,
    nombre_personnes: input.nombre_personnes ?? prev.nombre_personnes,
    devise: input.devise ?? prev.devise,
    taux_mad: input.taux_mad ?? prev.taux_mad,
    statut: input.statut ?? prev.statut,
    joueur_id: input.joueur_id !== undefined ? input.joueur_id : prev.joueur_id,
    entraineur_id:
      input.entraineur_id !== undefined ? input.entraineur_id : prev.entraineur_id,
    stage_id: input.stage_id !== undefined ? input.stage_id : prev.stage_id,
    equipe_libelle:
      input.equipe_libelle !== undefined ? input.equipe_libelle : prev.equipe_libelle,
    lignes:
      input.lignes?.map((l, i) => ({
        ...l,
        id: (l as BudgetPrevisionnelLine).id ?? newLocalId(),
        ordre: l.ordre ?? i,
      })) ?? prev.lignes,
  };
  const lignes = computeLignesWithTotals(merged.lignes);
  const signataires: BudgetPrevisionnelSignatory[] = signatairesOfficielsInput().map((s, i) => ({
    id: prev.signataires[i]?.id ?? newLocalId(),
    poste: s.poste,
    nom: s.nom,
    ordre: s.ordre,
  }));
  const totals = computeBudgetTotals(
    lignes,
    merged.taux_mad,
    (merged.devise || "EUR") as "EUR" | "MAD"
  );
  const updated: BudgetPrevisionnel = {
    ...prev,
    ...merged,
    lignes,
    signataires,
    ...totals,
    updated_by: user,
    updated_at: now(),
  };
  all[idx] = updated;
  saveAll(all);
  pushHistory(id, "modification", `Total ${updated.total_eur} EUR`);
  return updated;
}

export function localDuplicateBudgetPrevisionnel(id: string): BudgetPrevisionnel {
  const src = localGetBudgetPrevisionnel(id);
  if (!src) throw new Error("Budget introuvable");
  const { id: _id, created_at, updated_at, dernier_export_pdf_at, ...rest } = src;
  return localCreateBudgetPrevisionnel({
    ...rest,
    objet: `${rest.objet} (copie)`,
    statut: "brouillon",
    lignes: rest.lignes.map((l) => ({
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

export function localArchiveBudgetPrevisionnel(id: string): BudgetPrevisionnel {
  return localUpdateBudgetPrevisionnel(id, { statut: "archive" });
}

export function localDeleteBudgetPrevisionnel(id: string): void {
  const all = loadAll().filter((b) => b.id !== id);
  saveAll(all);
  pushHistory(id, "suppression", null);
}

export function localMarkBudgetPdfExported(id: string): BudgetPrevisionnel {
  const all = loadAll();
  const idx = all.findIndex((b) => b.id === id);
  if (idx < 0) throw new Error("Budget introuvable");
  all[idx] = { ...all[idx]!, dernier_export_pdf_at: now(), updated_at: now() };
  saveAll(all);
  pushHistory(id, "export_pdf", null);
  return all[idx]!;
}

export function localGetBudgetHistory(budgetId: string): BudgetPrevisionnelHistoryEntry[] {
  return readJson<BudgetPrevisionnelHistoryEntry[]>(KEY_HISTORY, [])
    .filter((h) => h.budget_id === budgetId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}
