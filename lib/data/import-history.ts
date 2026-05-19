import { getSupabaseDataClient } from "@/lib/supabase/data-client";
import type { ImportHistoryEntry, ImportHistoryInput } from "@/lib/types/system";

export async function getImportHistory(): Promise<ImportHistoryEntry[]> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("import_history")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ImportHistoryEntry[];
}

export async function logImportHistory(
  input: ImportHistoryInput
): Promise<ImportHistoryEntry> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("import_history")
    .insert(input)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as ImportHistoryEntry;
}
