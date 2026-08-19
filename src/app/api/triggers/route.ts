import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { getAccount } from "@/lib/repo";
import { withApi } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getHandler(req: Request) {
  const account = await getAccount();
  const kind = new URL(req.url).searchParams.get("kind");

  let query = db()
    .from("triggers")
    .select("*, flows(id, name, status)")
    .eq("account_id", account.id)
    .order("created_at", { ascending: false });

  if (kind) query = query.eq("kind", kind);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ triggers: data });
}

async function postHandler(req: Request) {
  const account = await getAccount();
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  if (!body.flow_id) {
    return NextResponse.json({ error: "Escolha um fluxo para o gatilho." }, { status: 400 });
  }

  const { data, error } = await db()
    .from("triggers")
    .insert({
      account_id: account.id,
      flow_id: body.flow_id,
      kind: body.kind ?? "comment_keyword",
      keywords: body.keywords ?? [],
      match_type: body.match_type ?? "contains",
      media_id: body.media_id ?? null,
      enabled: body.enabled ?? true,
      priority: body.priority ?? 0,
      public_reply_enabled: body.public_reply_enabled ?? false,
      public_reply_texts: body.public_reply_texts ?? [],
      only_first_time: body.only_first_time ?? false,
    })
    .select("*, flows(id, name, status)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ trigger: data });
}

export const GET = withApi(getHandler);
export const POST = withApi(postHandler);
