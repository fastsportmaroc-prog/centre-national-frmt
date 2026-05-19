import { getSupabaseDataClient } from "@/lib/supabase/data-client";
import { loadOccupationFromJson } from "@/lib/excel/cne-loader";
import type {
  OccupationCneInput,
  OccupationCneSnapshot,
  OccupationCentreResume,
} from "@/lib/types/occupation-cne";
import { computeOccupationJour } from "@/lib/utils/occupation-auto";
import { getHebergements } from "./hebergements";
import { getInfrastructures } from "./infrastructures";
import { getReservationsInfrastructure } from "./reservation-infra";
import { getStagesProgramme } from "./stages";

export async function getOccupationAutomatique(date: string): Promise<
  OccupationCentreResume & {
    taux_terrains_pct?: number;
    taux_fitness_pct?: number;
    taux_natation_pct?: number;
    alertes?: string[];
  }
> {
  const [stages, infrastructures, reservations, hebergements] = await Promise.all([
    getStagesProgramme(),
    getInfrastructures(),
    getReservationsInfrastructure(),
    getHebergements(),
  ]);
  return computeOccupationJour({
    date,
    stages,
    infrastructures,
    reservations,
    hebergements,
  });
}

export async function getOccupationCne(): Promise<OccupationCneSnapshot[]> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("occupation_cne")
    .select("*")
    .order("date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as OccupationCneSnapshot[];
}

export async function getOccupationByDate(date: string): Promise<OccupationCneSnapshot[]> {
  const all = await getOccupationCne();
  return all.filter((o) => o.date === date);
}

export async function getOccupationAlertes(): Promise<OccupationCneSnapshot[]> {
  const all = await getOccupationCne();
  return all.filter((o) => o.alerte || o.taux_occupation_pct > 100);
}

export async function getOccupationCentreResume(date?: string): Promise<OccupationCentreResume> {
  const d = date ?? new Date().toISOString().split("T")[0]!;
  const snapshots = await getOccupationByDate(d);
  const chambres = snapshots.filter(
    (s) => s.pavillon > 0 && s.type_chambre !== "centre" && s.type_chambre !== "terrains"
  );
  const terrains = snapshots.find((s) => s.type_chambre === "terrains");
  const centre = snapshots.find((s) => s.type_chambre === "centre");

  const chambres_total = chambres.length || 15;
  const chambres_occupees = chambres.filter((c) => c.occupants > 0).length;
  const alertes = chambres.filter((c) => c.taux_occupation_pct > 100 || c.alerte).length;

  return {
    date: d,
    taux_chambres_pct: centre?.taux_occupation_pct ?? Math.round((chambres_occupees / chambres_total) * 100),
    chambres_occupees,
    chambres_total,
    alertes_surcharge: alertes,
    terrains_occupes: terrains?.occupants ?? 0,
    terrains_total: terrains?.capacite ?? 8,
  };
}

export async function createOccupationCne(
  input: OccupationCneInput
): Promise<OccupationCneSnapshot> {
  const supabase = await getSupabaseDataClient();
  const { data, error } = await supabase
    .from("occupation_cne")
    .insert(input)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as OccupationCneSnapshot;
}

export async function importOccupationFromCneJson(): Promise<number> {
  const rows = loadOccupationFromJson();
  let count = 0;
  for (const row of rows) {
    await createOccupationCne({
      date: row.date ?? new Date().toISOString().split("T")[0]!,
      pavillon: Number(row.pavillon) || 0,
      numero_chambre: Number(row.numero_chambre) || 0,
      type_chambre: row.type_chambre ?? "double",
      capacite: Number(row.capacite) || 1,
      occupants: Number(row.occupants) || 0,
      stage_id: null,
      stage_id_excel: row.stage_id_excel ?? null,
      stage_libelle: row.stage_libelle ?? null,
      categorie: row.categorie ?? null,
      taux_occupation_pct: Number(row.taux_occupation_pct) || 0,
      alerte: row.alerte ?? null,
    });
    count++;
  }
  return count;
}
