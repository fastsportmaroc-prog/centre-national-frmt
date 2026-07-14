import { NextResponse } from "next/server";
import { requireParametresAdmin } from "@/lib/auth/require-parametres-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PERMISSION_MODULE_KEYS, type PermissionModuleKey } from "@/lib/types/user-permissions";

export const dynamic = "force-dynamic";

type PermissionInput = {
  module_key: PermissionModuleKey;
  can_view: boolean;
  can_edit: boolean;
};

async function loadPlayerCategories(admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>, userId: string) {
  const { data } = await admin
    .from("user_player_category_access")
    .select("category_key")
    .eq("user_id", userId)
    .eq("can_view", true);
  return (data ?? []).map((r) => r.category_key as string);
}

async function savePlayerCategories(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  userId: string,
  categories: string[] | null | undefined
) {
  await admin.from("user_player_category_access").delete().eq("user_id", userId);
  const list = categories?.filter(Boolean) ?? [];
  if (!list.length) return;
  const rows = list.map((category_key) => ({
    user_id: userId,
    category_key,
    can_view: true,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await admin.from("user_player_category_access").insert(rows);
  if (error) throw new Error(error.message);
}

export async function GET(request: Request) {
  if (!(await requireParametresAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId requis" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  if (admin) {
    const { data, error } = await admin
      .from("user_permissions")
      .select("*")
      .eq("user_id", userId)
      .order("module_key");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const playerCategories = await loadPlayerCategories(admin, userId);
    return NextResponse.json({
      permissions: data ?? [],
      playerCategories,
      hasCustom: (data ?? []).length > 0,
      hasCategoryRestrictions: playerCategories.length > 0,
    });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase indisponible" }, { status: 503 });

  const { data, error } = await supabase.rpc("admin_list_user_permissions", { p_user_id: userId });
  if (!error) {
    const { data: cats } = await supabase
      .from("user_player_category_access")
      .select("category_key")
      .eq("user_id", userId)
      .eq("can_view", true);
    const playerCategories = (cats ?? []).map((r) => r.category_key as string);
    return NextResponse.json({
      permissions: data ?? [],
      playerCategories,
      hasCustom: (data ?? []).length > 0,
      hasCategoryRestrictions: playerCategories.length > 0,
    });
  }

  if (/schema cache|could not find|does not exist/i.test(error.message)) {
    const { data: fallback, error: fbErr } = await supabase
      .from("user_permissions")
      .select("*")
      .eq("user_id", userId)
      .order("module_key");
    if (fbErr) return NextResponse.json({ error: fbErr.message }, { status: 500 });
    const { data: cats } = await supabase
      .from("user_player_category_access")
      .select("category_key")
      .eq("user_id", userId)
      .eq("can_view", true);
    const playerCategories = (cats ?? []).map((r) => r.category_key as string);
    return NextResponse.json({
      permissions: fallback ?? [],
      playerCategories,
      hasCustom: (fallback ?? []).length > 0,
      hasCategoryRestrictions: playerCategories.length > 0,
    });
  }

  return NextResponse.json({ error: error.message }, { status: 500 });
}

export async function PUT(request: Request) {
  if (!(await requireParametresAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as {
    userId: string;
    permissions: PermissionInput[];
    playerCategories?: string[] | null;
  };

  if (!body.userId || !Array.isArray(body.permissions)) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const sanitized = body.permissions
    .filter((p) => PERMISSION_MODULE_KEYS.includes(p.module_key))
    .map((p) => ({
      module_key: p.module_key,
      can_view: !!p.can_view,
      can_edit: p.can_view ? !!p.can_edit : false,
    }));

  const admin = createSupabaseAdminClient();
  if (admin) {
    await admin.from("user_permissions").delete().eq("user_id", body.userId);
    if (sanitized.length > 0) {
      const rows = sanitized.map((p) => ({
        user_id: body.userId,
        module_key: p.module_key,
        can_view: p.can_view,
        can_edit: p.can_edit,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await admin.from("user_permissions").insert(rows);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    try {
      await savePlayerCategories(admin, body.userId, body.playerCategories);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Erreur catégories joueurs" },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase indisponible" }, { status: 503 });

  const { error } = await supabase.rpc("admin_upsert_user_permissions", {
    p_user_id: body.userId,
    p_permissions: sanitized,
  });
  if (!error) {
    await supabase.from("user_player_category_access").delete().eq("user_id", body.userId);
    const list = body.playerCategories?.filter(Boolean) ?? [];
    if (list.length) {
      const rows = list.map((category_key) => ({
        user_id: body.userId,
        category_key,
        can_view: true,
        updated_at: new Date().toISOString(),
      }));
      const { error: catErr } = await supabase.from("user_player_category_access").insert(rows);
      if (catErr) return NextResponse.json({ error: catErr.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (/schema cache|could not find|does not exist/i.test(error.message)) {
    await supabase.from("user_permissions").delete().eq("user_id", body.userId);
    if (sanitized.length > 0) {
      const rows = sanitized.map((p) => ({
        user_id: body.userId,
        module_key: p.module_key,
        can_view: p.can_view,
        can_edit: p.can_edit,
        updated_at: new Date().toISOString(),
      }));
      const { error: insErr } = await supabase.from("user_permissions").insert(rows);
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
    await supabase.from("user_player_category_access").delete().eq("user_id", body.userId);
    const list = body.playerCategories?.filter(Boolean) ?? [];
    if (list.length) {
      const rows = list.map((category_key) => ({
        user_id: body.userId,
        category_key,
        can_view: true,
        updated_at: new Date().toISOString(),
      }));
      const { error: catErr } = await supabase.from("user_player_category_access").insert(rows);
      if (catErr) return NextResponse.json({ error: catErr.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: error.message }, { status: 500 });
}

export async function DELETE(request: Request) {
  if (!(await requireParametresAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId requis" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  if (admin) {
    const { error } = await admin.from("user_permissions").delete().eq("user_id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await admin.from("user_player_category_access").delete().eq("user_id", userId);
    return NextResponse.json({ ok: true });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase indisponible" }, { status: 503 });

  const { error } = await supabase.from("user_permissions").delete().eq("user_id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from("user_player_category_access").delete().eq("user_id", userId);
  return NextResponse.json({ ok: true });
}
