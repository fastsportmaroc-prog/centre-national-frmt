import { syncFromApiTennis } from "@/lib/tennis/api-tennis-sync";
import { isApiTennisConfigured } from "@/lib/tennis/providers/api-tennis/client";
import { NextResponse } from "next/server";

export async function POST() {
  if (!isApiTennisConfigured()) {
    return NextResponse.json(
      {
        error:
          "Configurez TENNIS_DATA_API_KEY dans .env.local (clé api-tennis.com).",
      },
      { status: 503 }
    );
  }

  try {
    const payload = await syncFromApiTennis();
    return NextResponse.json({ ...payload, mode: "live_api" as const });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur synchronisation API Tennis";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
