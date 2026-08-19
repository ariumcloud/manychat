import { NextResponse } from "next/server";
import { MetaError, sendText } from "@/lib/meta/client";
import { withApi } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Teste rápido de envio. Só funciona para alguém que te mandou DM nas últimas
 * 24h — o Instagram não deixa iniciar conversa do nada.
 */
async function postHandler(req: Request) {
  const { igsid, text } = (await req.json().catch(() => ({}))) as {
    igsid?: string;
    text?: string;
  };

  if (!igsid || !text) {
    return NextResponse.json({ error: "Informe igsid e text." }, { status: 400 });
  }

  try {
    return NextResponse.json({ result: await sendText(igsid, text) });
  } catch (err) {
    const detail = err instanceof MetaError ? `${err.message} (HTTP ${err.status})` : String(err);
    return NextResponse.json({ error: detail }, { status: 502 });
  }
}

export const POST = withApi(postHandler);
