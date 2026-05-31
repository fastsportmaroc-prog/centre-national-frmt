import { NextResponse } from "next/server";
import { requireCompetitionApiUser } from "@/lib/competitions/auth-api";
import {
  createBilletsForTeam,
  deleteBillet,
  listBillets,
  upsertBillet,
} from "@/lib/competitions/server";
import type { CompetitionBillet, CompetitionBilletLegInput } from "@/lib/types/competition";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const user = await requireCompetitionApiUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;
  const { data, error } = await listBillets(id);
  if (error) return NextResponse.json({ error, billets: [] }, { status: 500 });
  return NextResponse.json({ billets: data });
}

export async function POST(request: Request, { params }: Ctx) {
  const user = await requireCompetitionApiUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;
  const body = (await request.json()) as
    | (Omit<CompetitionBillet, "id" | "created_at" | "competition_id"> & { id?: string })
    | {
        apply_to_all?: boolean;
        participant_ids?: string[];
        aller?: CompetitionBilletLegInput;
        retour?: CompetitionBilletLegInput;
        tarif_mode?: "individuel" | "groupe";
        montant_unitaire?: number | null;
        montant_groupe?: number | null;
        devise?: string;
      };

  if ("apply_to_all" in body || "aller" in body || "retour" in body) {
    const teamBody = body as {
      apply_to_all?: boolean;
      participant_ids?: string[];
      aller?: CompetitionBilletLegInput;
      retour?: CompetitionBilletLegInput;
      tarif_mode?: "individuel" | "groupe";
      montant_unitaire?: number | null;
      montant_groupe?: number | null;
      devise?: string;
    };
    const { count, error } = await createBilletsForTeam(
      id,
      {
        apply_to_all: Boolean(teamBody.apply_to_all),
        participant_ids: teamBody.participant_ids,
        aller: teamBody.aller,
        retour: teamBody.retour,
        tarif_mode: teamBody.tarif_mode,
        montant_unitaire: teamBody.montant_unitaire,
        montant_groupe: teamBody.montant_groupe,
        devise: teamBody.devise,
      },
      user.id
    );
    if (error) return NextResponse.json({ error }, { status: 400 });
    return NextResponse.json({ count });
  }

  const single = body as Omit<CompetitionBillet, "id" | "created_at" | "competition_id"> & {
    id?: string;
  };
  const { data, error } = await upsertBillet(id, single, user.id);
  if (error) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json({ billet: data });
}

export async function DELETE(request: Request, { params }: Ctx) {
  const user = await requireCompetitionApiUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;
  const billetId = new URL(request.url).searchParams.get("billet_id");
  if (!billetId) return NextResponse.json({ error: "billet_id requis" }, { status: 400 });
  const { ok, error } = await deleteBillet(billetId, id, user.id);
  if (!ok) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
