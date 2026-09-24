import { NextResponse } from "next/server";
import { refreshLongLivedToken } from "@/lib/meta/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Chamado pelo cron da Vercel (vercel.json) toda semana. O token de Instagram
 * dura 60 dias e so renova se usado para isso; sem esta rota, um dia todas as
 * automacoes paravam.
 *
 * A Vercel manda `Authorization: Bearer <CRON_SECRET>`. Sem CRON_SECRET
 * configurada a rota se recusa a rodar — ela fica fora do login do painel.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET não configurada." }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const { expiresInSeconds } = await refreshLongLivedToken();
    const days = Math.round(expiresInSeconds / 86400);
    console.log(`[cron] token renovado, válido por ${days} dias.`);
    return NextResponse.json({ ok: true, days });
  } catch (err) {
    // Vai para os logs da Vercel; o aviso no painel mostra a validade caindo.
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron] falha ao renovar o token:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
