import type { RealtimeChannel } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export type RealtimeAlertPayload = {
  type: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "danger";
  href?: string;
  stage_id?: string;
  data?: unknown;
};

type AlertListener = (alert: RealtimeAlertPayload) => void;

let sharedChannel: RealtimeChannel | null = null;
let listenerCount = 0;
const listeners = new Set<AlertListener>();

function broadcast(alert: RealtimeAlertPayload) {
  for (const fn of listeners) {
    try {
      fn(alert);
    } catch (e) {
      console.warn("[realtime] listener error:", e);
    }
  }
}

function attachChannel(): RealtimeChannel | null {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return null;

  if (sharedChannel) return sharedChannel;

  sharedChannel = supabase
    .channel("frmt-realtime")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "stages_programme" },
      (payload) => {
        const row = payload.new as { stage_action?: string; id?: string };
        broadcast({
          type: "stage_created",
          title: "Nouveau stage créé",
          message: `Stage « ${row.stage_action ?? "—"} » créé`,
          severity: "info",
          href: "/v2/stages",
          stage_id: row.id,
          data: row,
        });
      }
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "stages_programme" },
      (payload) => {
        const row = payload.new as { stage_action?: string; id?: string };
        broadcast({
          type: "stage_updated",
          title: "Stage modifié",
          message: `Stage « ${row.stage_action ?? "—"} » mis à jour`,
          severity: "info",
          href: "/v2/stages",
          stage_id: row.id,
          data: row,
        });
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "hebergements" },
      () => {
        broadcast({
          type: "hebergement_updated",
          title: "Hébergement mis à jour",
          message: "Un hébergement a été modifié",
          severity: "info",
          href: "/v2/hebergement",
        });
      }
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "alerts" },
      (payload) => {
        const row = payload.new as {
          type?: string;
          title?: string;
          message?: string;
          severity?: string;
          href?: string;
          stage_id?: string;
        };
        broadcast({
          type: row.type ?? "alert",
          title: row.title ?? "Alerte",
          message: row.message ?? "",
          severity: (row.severity as RealtimeAlertPayload["severity"]) ?? "info",
          href: row.href,
          stage_id: row.stage_id,
        });
      }
    )
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR") {
        console.warn("[realtime] frmt-realtime — erreur canal (vérifiez Realtime Supabase).");
      }
    });

  return sharedChannel;
}

function detachChannel() {
  if (listenerCount > 0 || !sharedChannel) return;
  const supabase = createSupabaseBrowserClient();
  if (supabase) {
    void supabase.removeChannel(sharedChannel);
  }
  sharedChannel = null;
}

/** Un seul canal Realtime partagé — évite l'erreur « after subscribe() » en Strict Mode. */
export function subscribeToAlerts(onAlert: AlertListener) {
  attachChannel();
  listeners.add(onAlert);
  listenerCount += 1;

  return () => {
    listeners.delete(onAlert);
    listenerCount = Math.max(0, listenerCount - 1);
    detachChannel();
  };
}
