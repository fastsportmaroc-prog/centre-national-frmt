import { NextResponse } from "next/server";
import { requireProgrammationApiUser } from "@/lib/programmation-joueurs/auth-api";
import {
  createProgrammationEvenements,
  listProgrammationEvenements,
  parseProgrammationFiltersFromSearchParams,
} from "@/lib/programmation-joueurs/server";
import type { CreateProgrammationPayload } from "@/lib/types/programmation-joueurs";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requireProgrammationApiUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const filters = parseProgrammationFiltersFromSearchParams(searchParams);
  const { data, error, migrationRequired } = await listProgrammationEvenements(filters);
  if (error) {
    return NextResponse.json({ error, evenements: [], migrationRequired: migrationRequired ?? false }, { status: migrationRequired ? 200 : 500 });
  }
  return NextResponse.json({ evenements: data });
}

export async function POST(request: Request) {
  const user = await requireProgrammationApiUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = (await request.json()) as CreateProgrammationPayload;
  const { data, error } = await createProgrammationEvenements(body, user.id);
  if (error) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json({ evenements: data });
}
