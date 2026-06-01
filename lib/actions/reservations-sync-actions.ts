"use server";

import { cleanupDuplicateMatinWhenJourneeExists } from "@/lib/data/terrains";
import { revalidatePath } from "next/cache";

/**
 * Nettoie les doublons matin/aprem quand une journée existe déjà.
 * Ne modifie jamais le créneau matin ou après-midi vers journée complète.
 */
export async function reconcileStageTerrainReservationsAction(): Promise<{ cleaned: number }> {
  const cleaned = await cleanupDuplicateMatinWhenJourneeExists();
  revalidatePath("/v2/reservations");
  revalidatePath("/v2/stages");
  return { cleaned };
}
