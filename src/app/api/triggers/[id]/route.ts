import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { withApi } from "@/lib/api";
import { getAccount } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const EDITABLE = [
  "flow_id",
  "kind",
  "keywords",
  "match_type",
  "media_id",
  "enabled",
  "priority",
  "public_reply_enabled",
  "public_reply_texts",
  "only_first_time",
] as const;

async function patchHandler(req: Request, { params }: Params) {
  const { id } = await params;
  const account = await getAccount();
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const patch: Record<string, unknown> = {};
  for (const key of EDITABLE) if (key in body) patch[key] = body[key];

  const { data, error } = await db()
    .from("mc_triggers")
    .update(patch)
    .eq("id", id)
    .eq("account_id", account.id)
    .select("*, flows:mc_flows(id, name, status)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ trigger: data });
}

async function deleteHandler(_req: Request, { params }: Params) {
  const { id } = await params;
  const account = await getAccount();
  const { error } = await db().from("mc_triggers").delete().eq("id", id).eq("account_id", account.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export const PATCH = withApi(patchHandler);
export const DELETE = withApi(deleteHandler);
