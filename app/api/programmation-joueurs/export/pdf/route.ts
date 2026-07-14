import { NextResponse } from "next/server";
import { requireProgrammationApiUser } from "@/lib/programmation-joueurs/auth-api";
import {
  defaultProPdfDateRange,
  generateProgrammationProPdf,
} from "@/lib/pdf/programmation/index.server";
import { DEFAULT_PDF_OPTIONS } from "@/lib/pdf/programmation/types";
import { enforceProgrammationJoueurIds } from "@/lib/auth/planning-cne-access.server";
import { filterProgrammationEvenements } from "@/lib/auth/apply-player-category-filter.server";
import { getPlayerCategoryContext } from "@/lib/auth/player-category-context.server";
import { getPlanningCneAccessContext } from "@/lib/auth/planning-cne-access.server";
import { listProgrammationEvenements } from "@/lib/programmation-joueurs/server";
import type { ProgrammationEvenementEnriched } from "@/lib/types/programmation-joueurs";

export const dynamic = "force-dynamic";

async function loadEvents(
  joueurIds: string[],
  dateDebut: string,
  dateFin: string
): Promise<{ data: ProgrammationEvenementEnriched[]; error?: string }> {
  const { data, error } = await listProgrammationEvenements({ joueurIds, dateDebut, dateFin });
  if (error) return { data: [], error };
  return { data: data ?? [] };
}

export async function POST(request: Request) {
  const user = await requireProgrammationApiUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  let body: {
    joueurIds?: string[];
    dateDebut?: string;
    dateFin?: string;
    options?: Partial<typeof DEFAULT_PDF_OPTIONS>;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const joueurIds = body.joueurIds?.filter(Boolean) ?? [];
  const access = await getPlanningCneAccessContext();
  if (!access?.canExport) {
    return NextResponse.json({ error: "Export non autorisé" }, { status: 403 });
  }

  const enforced = await enforceProgrammationJoueurIds(joueurIds);
  if (!enforced.ok) {
    return NextResponse.json({ error: enforced.error }, { status: enforced.status });
  }

  const { dateDebut, dateFin } = defaultProPdfDateRange(body.dateDebut, body.dateFin);

  const loaded = await loadEvents(enforced.joueurIds, dateDebut, dateFin);
  if (loaded.error) return NextResponse.json({ error: loaded.error }, { status: 500 });

  const ctx = await getPlayerCategoryContext();
  const evenements = filterProgrammationEvenements(loaded.data, ctx);

  const { buffer, filename } = await generateProgrammationProPdf({
    joueurIds: enforced.joueurIds,
    dateDebut,
    dateFin,
    options: { ...DEFAULT_PDF_OPTIONS, ...body.options },
    evenements,
    generatedBy: user.email ?? user.id,
  });

  return new NextResponse(Buffer.from(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function GET(request: Request) {
  const user = await requireProgrammationApiUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const access = await getPlanningCneAccessContext();
  if (!access?.canExport) {
    return NextResponse.json({ error: "Export non autorisé" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const joueurIds = searchParams.getAll("joueurIds").filter(Boolean);
  const enforced = await enforceProgrammationJoueurIds(joueurIds);
  if (!enforced.ok) {
    return NextResponse.json({ error: enforced.error }, { status: enforced.status });
  }

  const { dateDebut, dateFin } = defaultProPdfDateRange(
    searchParams.get("dateDebut") ?? undefined,
    searchParams.get("dateFin") ?? undefined
  );

  const loaded = await loadEvents(enforced.joueurIds, dateDebut, dateFin);
  if (loaded.error) return NextResponse.json({ error: loaded.error }, { status: 500 });

  const ctx = await getPlayerCategoryContext();
  const evenements = filterProgrammationEvenements(loaded.data, ctx);

  const { buffer, filename } = await generateProgrammationProPdf({
    joueurIds: enforced.joueurIds,
    dateDebut,
    dateFin,
    evenements,
    generatedBy: user.email ?? user.id,
  });

  return new NextResponse(Buffer.from(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
