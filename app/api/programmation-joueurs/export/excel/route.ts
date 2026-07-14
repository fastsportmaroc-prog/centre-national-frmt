import { NextResponse } from "next/server";
import {
  enforceProgrammationFilters,
  filterProgrammationEvenements,
} from "@/lib/auth/apply-player-category-filter.server";
import { enforcePlanningCneExportColumns } from "@/lib/auth/planning-cne-access.server";
import { getPlayerCategoryContext } from "@/lib/auth/player-category-context.server";
import { requireProgrammationApiUser } from "@/lib/programmation-joueurs/auth-api";
import { generatePlanningCneExcel } from "@/lib/programmation-joueurs/planning-cne-excel.server";
import type { PlanningCneDisplayMode } from "@/lib/programmation-joueurs/planning-cne-grid";
import { listProgrammationEvenementsWithStages } from "@/lib/programmation-joueurs/server";
import type { ProgrammationFilters } from "@/lib/types/programmation-joueurs";

export const dynamic = "force-dynamic";

type ExportBody = {
  dateDebut?: string;
  dateFin?: string;
  columnIds?: string[];
  displayMode?: PlanningCneDisplayMode;
  categorieJoueur?: string;
};

function parseDateRange(body: ExportBody): { dateDebut: string; dateFin: string } | null {
  const dateDebut = body.dateDebut?.slice(0, 10);
  const dateFin = body.dateFin?.slice(0, 10);
  if (!dateDebut || !dateFin) return null;
  if (dateDebut > dateFin) return null;
  return { dateDebut, dateFin };
}

export async function POST(request: Request) {
  const user = await requireProgrammationApiUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  let body: ExportBody;
  try {
    body = (await request.json()) as ExportBody;
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const range = parseDateRange(body);
  if (!range) {
    return NextResponse.json({ error: "dateDebut et dateFin requis" }, { status: 400 });
  }

  const ctx = await getPlayerCategoryContext();
  const filters: ProgrammationFilters = enforceProgrammationFilters(
    { dateDebut: range.dateDebut, dateFin: range.dateFin, categorieJoueur: body.categorieJoueur },
    ctx
  );

  const enforced = await enforcePlanningCneExportColumns({
    columnIds: body.columnIds ?? [],
    displayMode: body.displayMode ?? "joueurs",
    categorieJoueur: filters.categorieJoueur,
  });
  if (!enforced.ok) {
    return NextResponse.json({ error: enforced.error }, { status: enforced.status });
  }

  const { columns } = enforced;
  const joueurIds = columns.filter((c) => c.kind === "joueur").map((c) => c.id);
  const { data, error } = await listProgrammationEvenementsWithStages({
    ...filters,
    joueurIds: joueurIds.length ? joueurIds : undefined,
  });
  if (error) return NextResponse.json({ error }, { status: 500 });

  const evenements = filterProgrammationEvenements(data ?? [], ctx);

  try {
    const { buffer, filename } = await generatePlanningCneExcel({
      dateDebut: range.dateDebut,
      dateFin: range.dateFin,
      columnIds: columns.map((c) => c.id),
      displayMode: body.displayMode ?? "joueurs",
      categorieJoueur: filters.categorieJoueur,
      evenements,
      ctx,
    });

    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur export Excel";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
