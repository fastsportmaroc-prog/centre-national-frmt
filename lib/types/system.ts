export type ImportHistoryStatus = "success" | "partial" | "failed";

export type ImportHistoryEntry = {
  id: string;
  source: "excel" | "json" | "manual";
  filename: string | null;
  stages_imported: number;
  occupation_imported: number;
  errors: string[];
  status: ImportHistoryStatus;
  created_at: string;
  created_by: string | null;
};

export type ImportHistoryInput = Omit<ImportHistoryEntry, "id" | "created_at">;

export type SystemLogLevel = "info" | "warn" | "error";

export type SystemLogEntry = {
  id: string;
  level: SystemLogLevel;
  module: string;
  message: string;
  details: string | null;
  created_at: string;
};

export type SystemLogInput = Omit<SystemLogEntry, "id" | "created_at">;
