import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { getAccount } from "@/lib/repo";
import { withApi } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getHandler() {
  const account = await getAccount();
  const { data, error } = await db()
    .from("mc_flows")
    .select("*")
    .eq("account_id", account.id)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ flows: data });
}

async function postHandler(req: Request) {
  const account = await getAccount();
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    description?: string;
  };

  const { data, error } = await db()
    .from("mc_flows")
    .insert({
      account_id: account.id,
      name: body.name?.trim() || "Fluxo sem nome",
      description: body.description ?? null,
      nodes: [
        {
          id: "trigger",
          type: "trigger",
          position: { x: 80, y: 160 },
          data: { label: "Gatilho" },
        },
        {
          id: "msg-1",
          type: "text",
          position: { x: 400, y: 140 },
          data: { text: "Oi! Aqui está o que você pediu 👇" },
        },
      ],
      edges: [{ id: "e-trigger-msg-1", source: "trigger", target: "msg-1" }],
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ flow: data });
}

export const GET = withApi(getHandler);
export const POST = withApi(postHandler);
