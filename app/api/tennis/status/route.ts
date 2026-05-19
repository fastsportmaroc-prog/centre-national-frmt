import { getTennisProviderStatus } from "@/lib/tennis/provider";
import { NextResponse } from "next/server";

export async function GET() {
  const status = getTennisProviderStatus();
  return NextResponse.json({
    mode: status.mode,
    modeLabel: status.modeLabel,
    configured: status.mode === "live_api" && status.liveApiConfigured,
    liveApiConfigured: status.liveApiConfigured,
    defaultSource: status.defaultSource,
    docs: "https://api-tennis.com/",
    datasetPath: "/data/tennis",
  });
}
