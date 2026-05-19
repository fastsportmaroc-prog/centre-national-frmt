import type { ImportHistoryEntry, SystemLogEntry } from "@/lib/types/system";

const now = new Date().toISOString();

export const seedImportHistory: ImportHistoryEntry[] = [
  {
    id: "imp-1",
    source: "json",
    filename: "data/cne/calendrier-stages.json",
    stages_imported: 8,
    occupation_imported: 12,
    errors: [],
    status: "success",
    created_at: now,
    created_by: "Système (seed)",
  },
];

export const seedSystemLogs: SystemLogEntry[] = [
  {
    id: "log-1",
    level: "info",
    module: "system",
    message: "Application Centre National FRMT démarrée (mode démo)",
    details: null,
    created_at: now,
  },
];
