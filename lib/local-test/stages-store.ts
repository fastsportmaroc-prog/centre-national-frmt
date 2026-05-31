import type { StageProgramme, StageProgrammeInput } from "@/lib/types/stages";
import { enrichirStageDefaults } from "@/lib/data/stage-operations";
import { newLocalId, readJson, writeJson } from "./storage";
import { ensureLocalSeedData } from "./seed";

const KEY = "stages";

function normalize(s: StageProgramme): StageProgramme {
  return { ...s, ...enrichirStageDefaults(s) } as StageProgramme;
}

function load(): StageProgramme[] {
  ensureLocalSeedData();
  return readJson<StageProgramme[]>(KEY, []).map(normalize);
}

function save(items: StageProgramme[]): void {
  writeJson(KEY, items);
}

export function localGetStagesProgramme(): StageProgramme[] {
  return load().sort((a, b) => a.date_debut.localeCompare(b.date_debut));
}

export function localGetStageById(id: string): StageProgramme | null {
  return load().find((s) => s.id === id) ?? null;
}

export function localCreateStageProgramme(input: StageProgrammeInput): StageProgramme {
  const t = new Date().toISOString();
  const item = normalize({
    ...input,
    ...enrichirStageDefaults(input),
    id: newLocalId(),
    created_at: t,
    updated_at: t,
  } as StageProgramme);
  const all = load();
  all.push(item);
  save(all);
  return item;
}

export function localUpdateStageProgramme(
  id: string,
  input: Partial<StageProgrammeInput>
): StageProgramme {
  const all = load();
  const idx = all.findIndex((s) => s.id === id);
  if (idx < 0) throw new Error("Stage introuvable");
  const updated = normalize({
    ...all[idx]!,
    ...input,
    updated_at: new Date().toISOString(),
  } as StageProgramme);
  all[idx] = updated;
  save(all);
  return updated;
}

export function localDeleteStageProgramme(id: string): void {
  save(load().filter((s) => s.id !== id));
}
