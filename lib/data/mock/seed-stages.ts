import type { StageProgramme } from "@/lib/types/stages";
import { loadStagesFromJson, rowToStageInput } from "@/lib/excel/cne-loader";

const now = new Date().toISOString();

export const seedStagesProgramme: StageProgramme[] = loadStagesFromJson().map((row, i) => {
  const base = rowToStageInput(row);
  return {
    ...base,
    id: `stage-${i + 1}`,
    created_at: now,
    updated_at: now,
  };
});
