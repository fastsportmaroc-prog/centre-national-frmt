import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { detectConflicts } from "@/lib/v2/reservations-utils";
import type { ReservationEnrichedV2, StageProgrammeV2 } from "@/lib/types/v2";

export type AlertSeverity = "info" | "warning" | "danger";

export type AppAlert = {
  id: string;
  type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  stage_id?: string | null;
  href?: string | null;
  lu: boolean;
  created_at: string;
  dedupe_key?: string | null;
};

const LOCAL_KEY = "frmt-alerts-local";

function loadLocal(): AppAlert[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "[]") as AppAlert[];
  } catch {
    return [];
  }
}

function saveLocal(alerts: AppAlert[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_KEY, JSON.stringify(alerts.slice(0, 200)));
}

export async function fetchAlerts(): Promise<AppAlert[]> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return loadLocal();
  const { data, error } = await supabase
    .from("alerts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    console.warn("[alerts] fetch:", error.message);
    return loadLocal();
  }
  return (data ?? []) as AppAlert[];
}

export async function markAlertRead(id: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  if (supabase) {
    await supabase.from("alerts").update({ lu: true, lu_at: new Date().toISOString() }).eq("id", id);
  }
  const local = loadLocal().map((a) => (a.id === id ? { ...a, lu: true } : a));
  saveLocal(local);
}

export async function markAllAlertsRead(): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  if (supabase) {
    await supabase.from("alerts").update({ lu: true, lu_at: new Date().toISOString() }).eq("lu", false);
  }
  saveLocal(loadLocal().map((a) => ({ ...a, lu: true })));
}

async function upsertAlert(alert: Omit<AppAlert, "id" | "created_at" | "lu">) {
  const supabase = createSupabaseBrowserClient();
  const row = {
    type: alert.type,
    severity: alert.severity,
    title: alert.title,
    message: alert.message,
    stage_id: alert.stage_id ?? null,
    href: alert.href ?? null,
    dedupe_key: alert.dedupe_key ?? null,
    lu: false,
  };

  if (supabase && alert.dedupe_key) {
    const { error } = await supabase.from("alerts").upsert(row, { onConflict: "dedupe_key" });
    if (!error) return;
  }

  if (supabase) {
    const { error } = await supabase.from("alerts").insert(row);
    if (!error) return;
  }

  const local = loadLocal();
  if (alert.dedupe_key && local.some((a) => a.dedupe_key === alert.dedupe_key && !a.lu)) return;
  local.unshift({
    ...alert,
    id: crypto.randomUUID(),
    lu: false,
    created_at: new Date().toISOString(),
  });
  saveLocal(local);
}

/** Vérifie les conditions métier et crée des alertes (toutes les 5 min côté client). */
export async function runAlertsEngine(): Promise<number> {
  let created = 0;
  const now = Date.now();
  const inDays = (iso: string) => (new Date(iso).getTime() - now) / 86400000;

  try {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return 0;

    const { data: stagesRaw } = await supabase.from("stages_programme").select("*");
    const stages = (stagesRaw ?? []) as StageProgrammeV2[];

    const { data: resRaw } = await supabase
      .from("reservations_infrastructure")
      .select("id, infrastructure_id, date_debut, date_fin, statut");
    const reservations = (resRaw ?? []) as ReservationEnrichedV2[];
    for (const s of stages) {
      const days = inDays(s.date_debut);
      if (days >= 0 && days <= 7 && String(s.statut).includes("prev")) {
        await upsertAlert({
          type: "STAGE_PROCHE",
          severity: "warning",
          title: "Stage proche",
          message: `Le stage « ${s.stage_action} » commence dans ${Math.ceil(days)} jour(s)`,
          stage_id: s.id,
          href: "/v2/stages",
          dedupe_key: `stage_proche_${s.id}`,
        });
        created++;
      }
      if (s.nombre_encadrants === 0 && inDays(s.date_debut) > 0) {
        await upsertAlert({
          type: "COACH_MANQUANT",
          severity: "warning",
          title: "Coach manquant",
          message: `Aucun coach affecté au stage « ${s.stage_action} »`,
          stage_id: s.id,
          href: "/v2/stages",
          dedupe_key: `coach_manquant_${s.id}`,
        });
        created++;
      }
    }

    const conflicts = detectConflicts(reservations);
    if (conflicts.size > 0) {
      await upsertAlert({
        type: "CONFLIT_COURT",
        severity: "danger",
        title: "Conflit de court",
        message: `${conflicts.size} réservation(s) en conflit sur le même court`,
        href: "/v2/reservations",
        dedupe_key: "conflit_court_global",
      });
      created++;
    }
  } catch (e) {
    console.warn("[alertsEngine]", e);
  }

  return created;
}
