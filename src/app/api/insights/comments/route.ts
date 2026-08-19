import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { getAccount } from "@/lib/repo";
import { withApi } from "@/lib/api";
import { listComments } from "@/lib/meta/client";
import { mineComments } from "@/lib/carousel/mine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function getHandler() {
  const account = await getAccount();
  const { data, error } = await db()
    .from("mc_comment_insights")
    .select("*")
    .eq("account_id", account.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ insights: data });
}

/** Lê os comentários de um post e agrupa as dúvidas que se repetem. */
async function postHandler(req: Request) {
  const account = await getAccount();
  const { media_id, media_caption } = (await req.json().catch(() => ({}))) as {
    media_id?: string;
    media_caption?: string;
  };

  if (!media_id) {
    return NextResponse.json({ error: "Escolha um post." }, { status: 400 });
  }

  const comments = await listComments(media_id, 300);
  const texts = comments.map((c) => (c.text ?? "").trim()).filter((t) => t.length > 1);

  if (texts.length < 3) {
    return NextResponse.json(
      { error: `Esse post tem só ${texts.length} comentário(s) com texto. Precisa de pelo menos 3.` },
      { status: 400 },
    );
  }

  const { themes } = await mineComments(texts);

  const { data, error } = await db()
    .from("mc_comment_insights")
    .insert({
      account_id: account.id,
      media_id,
      media_caption: media_caption ?? null,
      sample_size: texts.length,
      themes,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ insight: data });
}

export const GET = withApi(getHandler);
export const POST = withApi(postHandler);
