import { NextResponse } from "next/server";
import { repairAuthAccount } from "@/lib/auth/repair-account.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Reparation compte (local uniquement).
 * POST JSON: { email, password, secret }
 * secret = REPAIR_SECRET dans .env.local
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production" && !process.env.REPAIR_SECRET) {
    return NextResponse.json({ ok: false, message: "Non disponible" }, { status: 403 });
  }

  const repairSecret = process.env.REPAIR_SECRET?.trim();
  let body: { email?: string; password?: string; secret?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "JSON invalide" }, { status: 400 });
  }

  if (repairSecret && body.secret !== repairSecret) {
    return NextResponse.json({ ok: false, message: "Secret invalide" }, { status: 403 });
  }

  const result = await repairAuthAccount(
    String(body.email ?? ""),
    String(body.password ?? ""),
    { role: "admin", frmtRole: "admin", fullName: "Administrateur FRMT" }
  );

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
