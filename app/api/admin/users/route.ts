import { NextResponse } from "next/server";
import {
  requireManageUsersAdmin,
  requireParametresAdmin,
} from "@/lib/auth/require-parametres-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function attachCustomFlags<T extends { id: string }>(
  users: T[],
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>
): Promise<(T & { hasCustom: boolean })[]> {
  if (users.length === 0) return [];
  const ids = users.map((u) => u.id);
  const { data: perms } = await admin
    .from("user_permissions")
    .select("user_id")
    .in("user_id", ids);
  const customIds = new Set((perms ?? []).map((p) => p.user_id as string));
  return users.map((u) => ({ ...u, hasCustom: customIds.has(u.id) }));
}

export async function GET() {
  if (!(await requireParametresAdmin())) {
    return NextResponse.json(
      { error: "Accès refusé — connectez-vous avec un compte administrateur." },
      { status: 403 }
    );
  }

  const admin = createSupabaseAdminClient();
  if (admin) {
    const { data, error } = await admin
      .from("profiles")
      .select("id, email, nom, prenom, full_name, role, entraineur_id, actif, created_at")
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const users = await attachCustomFlags(data ?? [], admin);
    return NextResponse.json({ users });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ users: [] });
  const { data, error } = await supabase.rpc("admin_list_profiles");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data ?? [] });
}

export async function PATCH(request: Request) {
  if (!(await requireParametresAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await request.json()) as {
    id: string;
    role?: string;
    entraineur_id?: string | null;
    actif?: boolean;
  };
  const admin = createSupabaseAdminClient();
  if (admin) {
    const { error } = await admin
      .from("profiles")
      .update({
        role: body.role,
        entraineur_id: body.entraineur_id,
        actif: body.actif,
      })
      .eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase indisponible" }, { status: 503 });

  const patch: Record<string, unknown> = {};
  if (body.role !== undefined) patch.role = body.role;
  if (body.entraineur_id !== undefined) patch.entraineur_id = body.entraineur_id;
  if (body.actif !== undefined) patch.actif = body.actif;

  const { error } = await supabase.rpc("admin_update_profile_access", {
    p_id: body.id,
    p_patch: patch,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  if (!(await requireManageUsersAdmin())) {
    return NextResponse.json(
      { error: "Accès refusé — seul un administrateur peut inviter des utilisateurs." },
      { status: 403 }
    );
  }
  const body = (await request.json()) as { email: string; role?: string };
  const email = body.email?.trim();
  if (!email) {
    return NextResponse.json({ error: "Email requis." }, { status: 400 });
  }
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin.server");
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY requis pour inviter des utilisateurs" },
      { status: 503 }
    );
  }
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { role: body.role ?? "joueur" },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, user: data.user });
}
