import type { ApiTennisResponse } from "./types";

const API_BASE = "https://api.api-tennis.com/tennis/";

export function getApiTennisKey(): string | undefined {
  return process.env.TENNIS_DATA_API_KEY?.trim() || undefined;
}

export function isApiTennisConfigured(): boolean {
  return Boolean(getApiTennisKey());
}

export async function apiTennisRequest<T>(
  method: string,
  params: Record<string, string> = {}
): Promise<T> {
  const key = getApiTennisKey();
  if (!key) {
    throw new Error(
      "TENNIS_DATA_API_KEY non configurée. Ajoutez votre clé api-tennis.com dans .env.local"
    );
  }

  const url = new URL(API_BASE);
  url.searchParams.set("method", method);
  url.searchParams.set("APIkey", key);
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`API Tennis HTTP ${res.status}`);
  }

  const json = (await res.json()) as ApiTennisResponse<T>;
  if (json.success !== 1) {
    throw new Error(json.error ?? "Réponse API Tennis invalide");
  }

  return json.result;
}
