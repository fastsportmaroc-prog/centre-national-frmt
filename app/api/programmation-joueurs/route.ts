import { NextResponse } from "next/server";
import { requireProgrammationApiUser } from "@/lib/programmation-joueurs/auth-api";
import {
  enforceProgrammationFilters,
  filterProgrammationEvenements,
} from "@/lib/auth/apply-player-category-filter.server";
import { getPlanningCneAccessContext } from "@/lib/auth/planning-cne-access.server";
import { getPlayerCategoryContext } from "@/lib/auth/player-category-context.server";
import {
  createProgrammationEvenements,
  listProgrammationEvenementsWithStages,
  parseProgrammationFiltersFromSearchParams,
} from "@/lib/programmation-joueurs/server";
import type { CreateProgrammationPayload } from "@/lib/types/programmation-joueurs";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requireProgrammationApiUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const ctx = await getPlayerCategoryContext();
  const planningAccess = await getPlanningCneAccessContext();
  const { searchParams } = new URL(request.url);
  let filters = enforceProgrammationFilters(
    parseProgrammationFiltersFromSearchParams(searchParams),
    ctx
  );
  if (planningAccess?.selfOnly && planningAccess.selfJoueurId) {
    filters = { ...filters, joueurId: planningAccess.selfJoueurId };
  }
  const { data, error, migrationRequired } = await listProgrammationEvenementsWithStages({
    ...filters,
    includeStageProgramme: searchParams.get("includeStageProgramme") !== "0",
  });
  if (error) {
    return NextResponse.json({ error, evenements: [], migrationRequired: migrationRequired ?? false }, { status: migrationRequired ? 200 : 500 });
  }
  return NextResponse.json({ evenements: filterProgrammationEvenements(data, ctx) });
}

export async function POST(request: Request) {
  const user = await requireProgrammationApiUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const planningAccess = await getPlanningCneAccessContext();
  if (!planningAccess?.canManageEvents) {
    return NextResponse.json({ error: "Modification non autorisée" }, { status: 403 });
  }

  const body = (await request.json()) as CreateProgrammationPayload;
  const { data, error } = await createProgrammationEvenements(body, user.id);
  if (error) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json({ evenements: data });
}
