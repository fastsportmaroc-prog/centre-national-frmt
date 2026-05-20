import { logAudit } from "@/lib/audit/audit-logs";
import { getSupabaseDataClient } from "@/lib/supabase/data-client";
import type { ModuleHistorique } from "@/lib/types/historique";

export type SoftDeleteOptions = {
  table: string;
  id: string;
  entityType: string;
  entityLabel: string;
  module: ModuleHistorique;
  reason?: string;
  deletedBy?: string;
  beforeSnapshot?: Record<string, unknown>;
};

/**
 * Suppression logique — jamais DELETE SQL global.
 * Nécessite migration 019_soft_delete_audit_logs.sql
 */
export async function softDeleteRecord(opts: SoftDeleteOptions): Promise<void> {
  const supabase = await getSupabaseDataClient();
  const deletedBy = opts.deletedBy ?? "Utilisateur";
  const patch = {
    deleted_at: new Date().toISOString(),
    deleted_by: deletedBy,
    delete_reason: opts.reason ?? null,
  };

  const { data, error } = await supabase
    .from(opts.table)
    .update(patch)
    .eq("id", opts.id)
    .select()
    .single();

  if (error) {
    throw new Error(
      `Archivage impossible (${opts.table}): ${error.message}. Exécutez la migration 019_soft_delete_audit_logs.sql.`
    );
  }

  await logAudit({
    entityType: opts.entityType,
    entityId: opts.id,
    action: "soft_delete",
    beforeData: opts.beforeSnapshot ?? null,
    afterData: data as Record<string, unknown>,
    userName: deletedBy,
    historique: {
      module: opts.module,
      action: "suppression",
      entiteLabel: opts.entityLabel,
      ancienneValeur: opts.entityLabel,
      nouvelleValeur: "archivé",
      commentaire: opts.reason ?? "Suppression logique",
    },
  });
}

/** Filtre Supabase : enregistrements non archivés */
export function notDeletedFilter() {
  return { deleted_at: null as null };
}
