import { getSupabaseDataClient } from "@/lib/supabase/data-client";
import type { SystemLogEntry, SystemLogInput } from "@/lib/types/system";

export async function getSystemLogs(limit = 50): Promise<SystemLogEntry[]> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("system_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as SystemLogEntry[];
}

export async function addSystemLog(input: SystemLogInput): Promise<SystemLogEntry> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase.from("system_logs").insert(input).select().single();
  if (error) throw new Error(error.message);
  return data as SystemLogEntry;
}
