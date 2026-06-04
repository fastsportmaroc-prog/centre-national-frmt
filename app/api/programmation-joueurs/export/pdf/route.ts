import { NextResponse } from "next/server";
import { requireProgrammationApiUser } from "@/lib/programmation-joueurs/auth-api";
import {
  defaultPdfDateRange,
  generateProgrammationPdfBuffer,
} from "@/lib/programmation-joueurs/pdf-export.server";
import { listProgrammationEvenements } from "@/lib/programmation-joueurs/server";
import type { ProgrammationPdfType } from "@/lib/types/programmation-joueurs";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requireProgrammationApiUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const joueurIds = searchParams.getAll("joueurIds").filter(Boolean);
  if (!joueurIds.length) {
    return NextResponse.json({ error: "joueurIds requis" }, { status: 400 });
  }

  const typePdf = (searchParams.get("typePdf") ?? "mensuel") as ProgrammationPdfType;
  const { dateDebut, dateFin } = defaultPdfDateRange(
    typePdf,
    searchParams.get("dateDebut") ?? undefined,
    searchParams.get("dateFin") ?? undefined
  );

  const { data, error } = await listProgrammationEvenements({
    joueurIds,
    dateDebut,
    dateFin,
  });
  if (error) return NextResponse.json({ error }, { status: 500 });

  const buffer = await generateProgrammationPdfBuffer({
    evenements: data,
    joueurIds,
    dateDebut,
    dateFin,
    typePdf,
    generatedBy: user.email ?? user.id,
    includeResultats: searchParams.get("includeResultats") === "1",
    includePoints: searchParams.get("includePoints") === "1",
    includeClassement: searchParams.get("includeClassement") === "1",
  });

  return new NextResponse(Buffer.from(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="programme-${typePdf}.pdf"`,
    },
  });
}
