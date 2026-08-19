import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { getAccount, recordMessage, windowIsOpen } from "@/lib/repo";
import { MetaError, sendText } from "@/lib/meta/client";
import { withApi } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Mensagens de uma conversa. */
async function getHandler(req: Request) {
  const conversationId = new URL(req.url).searchParams.get("conversationId");
  if (!conversationId) {
    return NextResponse.json({ error: "conversationId é obrigatório" }, { status: 400 });
  }

  const supabase = db();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("conversations").update({ unread_count: 0 }).eq("id", conversationId);
  return NextResponse.json({ messages: data });
}

/** Resposta manual do painel. */
async function postHandler(req: Request) {
  const { conversationId, text } = (await req.json().catch(() => ({}))) as {
    conversationId?: string;
    text?: string;
  };

  if (!conversationId || !text?.trim()) {
    return NextResponse.json({ error: "Informe conversationId e text." }, { status: 400 });
  }

  const account = await getAccount();
  const supabase = db();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("*, contacts(igsid, username)")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conversation) {
    return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
  }

  if (!windowIsOpen(conversation.window_expires_at)) {
    return NextResponse.json(
      {
        error:
          "A janela de 24h fechou. O Instagram só permite responder até 24h depois da última mensagem da pessoa.",
      },
      { status: 409 },
    );
  }

  const igsid = (conversation.contacts as { igsid: string } | null)?.igsid;
  if (!igsid) return NextResponse.json({ error: "Contato sem IGSID." }, { status: 400 });

  try {
    const res = await sendText(igsid, text);
    const message = await recordMessage({
      accountId: account.id,
      conversationId,
      direction: "out",
      sender: "agent",
      text,
      mid: res.message_id ?? null,
    });
    return NextResponse.json({ message });
  } catch (err) {
    const detail =
      err instanceof MetaError ? `${err.message} (HTTP ${err.status})` : String(err);
    await recordMessage({
      accountId: account.id,
      conversationId,
      direction: "out",
      sender: "agent",
      text,
      status: "failed",
      error: detail,
    });
    return NextResponse.json({ error: detail }, { status: 502 });
  }
}

export const GET = withApi(getHandler);
export const POST = withApi(postHandler);
