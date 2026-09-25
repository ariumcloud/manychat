import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { withApi } from "@/lib/api";
import { getAccount } from "@/lib/repo";
import { normalizeHex } from "@/lib/carousel/color";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

async function getHandler(_req: Request, { params }: Params) {
  const { id } = await params;
  const account = await getAccount();
  const { data, error } = await db()
    .from("mc_carousels")
    .select("*")
    .eq("id", id)
    .eq("account_id", account.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Carrossel não encontrado." }, { status: 404 });
  return NextResponse.json({ carousel: data });
}

async function patchHandler(req: Request, { params }: Params) {
  const { id } = await params;
  const account = await getAccount();
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  // Cor inválida vira null (= a cor padrão do tema) em vez de sujar o banco.
  if ("accent" in body) body.accent = normalizeHex(body.accent as string | null);
  for (const key of ["title", "slides", "handle", "display_name", "avatar_url", "verified", "theme", "accent"] as const) {
    if (key in body) patch[key] = body[key];
  }

  const { data, error } = await db()
    .from("mc_carousels")
    .update(patch)
    .eq("id", id)
    .eq("account_id", account.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ carousel: data });
}

async function deleteHandler(_req: Request, { params }: Params) {
  const { id } = await params;
  const account = await getAccount();
  const { error } = await db().from("mc_carousels").delete().eq("id", id).eq("account_id", account.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export const GET = withApi(getHandler);
export const PATCH = withApi(patchHandler);
export const DELETE = withApi(deleteHandler);
