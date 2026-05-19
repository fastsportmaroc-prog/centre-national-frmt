import type { OccupationCneSnapshot } from "@/lib/types/occupation-cne";
import { loadOccupationFromJson } from "@/lib/excel/cne-loader";

const now = new Date().toISOString();

export const seedOccupationCne: OccupationCneSnapshot[] = loadOccupationFromJson().map(
  (row, i) => ({
    id: `occ-${i + 1}`,
    date: row.date ?? now.split("T")[0]!,
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
    created_at: now,
  })
);
