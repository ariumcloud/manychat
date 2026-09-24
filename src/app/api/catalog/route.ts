import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { getAccount } from "@/lib/repo";
import { withApi } from "@/lib/api";
import { parseCatalogInput } from "@/lib/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getHandler() {
  const account = await getAccount();
  const { data, error } = await db()
    .from("mc_catalog_items")
    .select("*")
    .eq("account_id", account.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data });
}

async function postHandler(req: Request) {
  const account = await getAccount();
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const parsed = parseCatalogInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { data, error } = await db()
    .from("mc_catalog_items")
    .insert({ account_id: account.id, ...parsed.value })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

export const GET = withApi(getHandler);
export const POST = withApi(postHandler);
