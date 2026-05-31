import { getSupabaseDataClient } from "@/lib/supabase/data-client";
import { guardReadAccess } from "@/lib/supabase/data-access-guard";
import { shouldUseLocalTestStorage } from "@/lib/local-test/mode";
import { newLocalId, readJson, writeJson } from "@/lib/local-test/storage";
import type { HistoriqueEntry, HistoriqueFilters, HistoriqueInput } from "@/lib/types/historique";

let currentUser = { nom: "Utilisateur", role: "staff" };

export function setAuditUser(nom: string, role: string) {
  currentUser = { nom, role };
}

export async function logHistorique(
  input: Omit<HistoriqueInput, "utilisateur_nom" | "utilisateur_role">
): Promise<void> {
  const entry: HistoriqueInput = {
    ...input,
    utilisateur_nom: currentUser.nom,
    utilisateur_role: currentUser.role,
  };

  if (shouldUseLocalTestStorage()) {
    const entries = readJson<(HistoriqueEntry)[]>("historique", []);
    entries.unshift({
      ...entry,
      id: newLocalId(),
      created_at: new Date().toISOString(),
    } as HistoriqueEntry);
    writeJson("historique", entries.slice(0, 500));
    return;
  }
  const supabase = await getSupabaseDataClient();
  const { error } = await supabase.from("historique").insert(entry);
  if (error) console.warn("[Supabase] historique insert:", error.message);
}

function filterHistorique(items: HistoriqueEntry[], filters?: HistoriqueFilters): HistoriqueEntry[] {
  if (!filters) return items;
  return items.filter((h) => {
    if (
      filters.utilisateur &&
      !h.utilisateur_nom.toLowerCase().includes(filters.utilisateur.toLowerCase())
    )
      return false;
    if (filters.module && h.module !== filters.module) return false;
    if (filters.action && h.action !== filters.action) return false;
    if (filters.dateDebut && h.created_at < filters.dateDebut) return false;
    if (filters.dateFin && h.created_at > filters.dateFin + "T23:59:59") return false;
    return true;
  });
}

export async function getHistorique(
  filters?: HistoriqueFilters
): Promise<HistoriqueEntry[]> {
  if (shouldUseLocalTestStorage()) {
    const items = readJson<HistoriqueEntry[]>("historique", []);
    return filterHistorique(items, filters);
  }
  await guardReadAccess();
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("historique")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("[Supabase] historique:", error.message);
    return [];
  }
  return filterHistorique((data ?? []) as HistoriqueEntry[], filters);
}
