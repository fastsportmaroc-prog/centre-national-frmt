import { NextResponse } from "next/server";
import { getSupabaseDataClient } from "@/lib/supabase/data-client";

export async function GET() {
  try {
    const supabase = await getSupabaseDataClient();
    if (!supabase) {
      return NextResponse.json({ total: 0, offline: true });
    }
    const { count, error } = await supabase
      .from("stages_programme")
      .select("*", { count: "exact", head: true });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ total: count ?? 0 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
