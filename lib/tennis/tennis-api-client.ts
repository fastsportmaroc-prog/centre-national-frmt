import type { PerformanceSyncPayload } from "./provider";

export type TennisApiStatus = {
  mode: "demo" | "dataset" | "live_api";
  modeLabel: string;
  configured: boolean;
  liveApiConfigured: boolean;
  defaultSource: string;
};

let statusCache: TennisApiStatus | null = null;

export async function fetchTennisApiStatus(): Promise<TennisApiStatus> {
  if (statusCache) return statusCache;
  try {
    const res = await fetch("/api/tennis/status", { cache: "no-store" });
    statusCache = (await res.json()) as TennisApiStatus;
    return statusCache;
  } catch {
    return {
      mode: "dataset",
      modeLabel: "Dataset gratuit FRMT",
      configured: false,
      liveApiConfigured: false,
      defaultSource: "/data/tennis",
    };
  }
}

export function clearTennisApiStatusCache() {
  statusCache = null;
}

/** Sync via API live uniquement (mode live_api) */
export async function syncTennisFromApi(): Promise<PerformanceSyncPayload> {
  const res = await fetch("/api/tennis/sync", { method: "POST", cache: "no-store" });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error ?? "Synchronisation API échouée");
  }
  clearTennisApiStatusCache();
  return body as PerformanceSyncPayload;
}
