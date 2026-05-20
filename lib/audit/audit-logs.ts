import { getSupabaseDataClient } from "@/lib/supabase/data-client";
import { logHistorique } from "@/lib/audit/historique";
import type { ActionHistorique, ModuleHistorique } from "@/lib/types/historique";

export type AuditLogInput = {
  entityType: string;
  entityId?: string | null;
  action: string;
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
  userId?: string | null;
  userName?: string;
  userRole?: string;
  /** Miroir table historique (compatibilité existante) */
  historique?: {
    module: ModuleHistorique;
    entiteLabel?: string | null;
    ancienneValeur?: string | null;
    nouvelleValeur?: string | null;
    commentaire?: string | null;
    action?: ActionHistorique;
  };
};

/** Double écriture : audit_logs + historique (aucune suppression de données) */
export async function logAudit(input: AuditLogInput): Promise<void> {
  const supabase = await getSupabaseDataClient();

  const row = {
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    action: input.action,
    before_data: input.beforeData ?? null,
    after_data: input.afterData ?? null,
    user_id: input.userId ?? null,
    user_name: input.userName ?? "Utilisateur",
    user_role: input.userRole ?? "staff",
  };

  const { error } = await supabase.from("audit_logs").insert(row);
  if (error) {
    /* Table pas encore migrée — on garde historique */
  }

  if (input.historique) {
    const h = input.historique;
    try {
      await logHistorique({
        action: h.action ?? (input.action as ActionHistorique),
        module: h.module,
        entite_id: input.entityId ?? null,
        entite_label: h.entiteLabel ?? null,
        ancienne_valeur: h.ancienneValeur ?? null,
        nouvelle_valeur: h.nouvelleValeur ?? null,
        commentaire: h.commentaire ?? null,
      });
    } catch {
      /* historique optionnel */
    }
  }
}
