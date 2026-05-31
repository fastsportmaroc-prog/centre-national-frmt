import type { Infrastructure } from "@/lib/types/infrastructures";
import type { Entraineur } from "@/lib/types/entraineurs";
import type { Hebergement, Repas } from "@/lib/types/database";
import type { Joueur } from "@/lib/types/database";
import type { Materiel } from "@/lib/types/materiel";
import type { BesoinRestauration } from "@/lib/types/restauration";
import type { ReservationInfrastructure } from "@/lib/types/reservation-infra";
import { readJson, writeJson } from "./storage";
import {
  ensureLocalSeedData,
  getDefaultEntraineurs,
  getDefaultInfrastructures,
  getDefaultJoueurs,
  getDefaultMateriels,
} from "./seed";

export function localGetInfrastructures(): Infrastructure[] {
  ensureLocalSeedData();
  return readJson("infrastructures", getDefaultInfrastructures());
}

export function localGetJoueurs(): Joueur[] {
  ensureLocalSeedData();
  return readJson("joueurs", getDefaultJoueurs());
}

export function localGetEntraineurs(): Entraineur[] {
  ensureLocalSeedData();
  return readJson("entraineurs", getDefaultEntraineurs());
}

export function localGetMateriels(): Materiel[] {
  ensureLocalSeedData();
  return readJson("materiels", getDefaultMateriels());
}

export function localGetBesoinsRestauration(): BesoinRestauration[] {
  return readJson<BesoinRestauration[]>("besoins_restauration", []);
}

export function localGetHebergements(): Hebergement[] {
  return readJson<Hebergement[]>("hebergements", []);
}

export function localSaveHebergements(items: Hebergement[]): void {
  writeJson("hebergements", items);
}

export function localGetRepas(): Repas[] {
  return readJson<Repas[]>("repas", []);
}
