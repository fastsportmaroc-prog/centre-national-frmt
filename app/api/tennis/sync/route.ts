import { NextResponse } from "next/server";

const DISABLED =
  "Synchronisation API Tennis désactivée en mode sauvetage (local uniquement).";

export async function POST() {
  return NextResponse.json({ error: DISABLED }, { status: 503 });
}
