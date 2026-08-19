import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { withApi } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

async function getHandler(_req: Request, { params }: Params) {
  const { id } = await params;
  const { data, error } = await db().from("mc_carousels").select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Carrossel não encontrado." }, { status: 404 });
  return NextResponse.json({ carousel: data });
}

async function patchHandler(req: Request, { params }: Params) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of ["title", "slides", "handle", "display_name", "avatar_url", "verified"] as const) {
    if (key in body) patch[key] = body[key];
  }

  const { data, error } = await db()
    .from("mc_carousels")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ carousel: data });
}

async function deleteHandler(_req: Request, { params }: Params) {
  const { id } = await params;
  const { error } = await db().from("mc_carousels").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export const GET = withApi(getHandler);
export const PATCH = withApi(patchHandler);
export const DELETE = withApi(deleteHandler);
