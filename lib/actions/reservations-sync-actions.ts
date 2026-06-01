"use server";

import { getSupabaseServerDataClient } from "@/lib/supabase/data-client.server";
import { revalidatePath } from "next/cache";

async function upgradeStageMatinToJourneeServer(stageId: string): Promise<number> {
  const supabase = await getSupabaseServerDataClient();
  let n = 0;

  const { data: infraRows } = await supabase
    .from("reservations_infrastructure")
    .select("id, date_debut, creneau, heure_debut, heure_fin")
    .eq("stage_id", stageId);

  for (const row of infraRows ?? []) {
    const c = String(row.creneau ?? "").toLowerCase();
    const hD = String(row.heure_debut ?? "").slice(0, 5);
    const hF = String(row.heure_fin ?? "").slice(0, 5);
    const isMatin =
      c === "matin" ||
      c.includes("matin") ||
      (hD === "09:00" && hF === "13:00");
    if (!isMatin) continue;
    const jour = String(row.date_debut).slice(0, 10);
    const { error } = await supabase
      .from("reservations_infrastructure")
      .update({
        creneau: "journee",
        date_debut: `${jour}T09:00:00`,
        date_fin: `${jour}T18:00:00`,
        heure_debut: "09:00",
        heure_fin: "18:00",
        statut: "confirmee",
      })
      .eq("id", row.id);
    if (!error) n++;
  }

  const { data: terrainRows } = await supabase
    .from("terrain_reservations")
    .select("terrain_id, date_debut, creneau")
    .eq("stage_id", stageId);

  for (const row of terrainRows ?? []) {
    const c = String(row.creneau ?? "").toLowerCase();
    if (c !== "matin" && c !== "apres-midi" && !c.includes("matin")) continue;
    const jour = String(row.date_debut).slice(0, 10);
    const { error } = await supabase
      .from("terrain_reservations")
      .update({ creneau: "journee", date_debut: jour, date_fin: jour, statut: "confirme" })
      .eq("stage_id", stageId)
      .eq("terrain_id", row.terrain_id)
      .eq("date_debut", jour)
      .eq("creneau", row.creneau);
    if (!error) n++;
  }

  if (n > 0) {
    await supabase.from("stages_programme").update({ terrains: true }).eq("id", stageId);
  }

  return n;
}

/** Corrige en base matin → journée pour toutes les réservations terrain de stage. */
export async function reconcileStageTerrainReservationsAction(): Promise<{ upgraded: number }> {
  const supabase = await getSupabaseServerDataClient();
  const { data: stages } = await supabase
    .from("stages_programme")
    .select("id, statut")
    .neq("statut", "annule");

  let upgraded = 0;
  for (const s of stages ?? []) {
    upgraded += await upgradeStageMatinToJourneeServer(s.id);
  }

  revalidatePath("/v2/reservations");
  revalidatePath("/v2/stages");
  return { upgraded };
}
