import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { runWithAccount } from "@/lib/account-context";
import { refreshLongLivedToken } from "@/lib/meta/client";
import { PENDING_PREFIX } from "@/lib/meta/token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Chamado pelo cron da Vercel (vercel.json) toda semana. O token de Instagram
 * dura 60 dias e so renova se usado para isso; sem esta rota, um dia todas as
 * automacoes paravam. Renova o de cada conta conectada: uma que falha nao
 * impede as outras.
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

  const { data: accounts, error } = await db()
    .from("mc_accounts")
    .select("id, username, ig_user_id")
    .not("ig_user_id", "like", `${PENDING_PREFIX}%`);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results: Array<{ account: string; ok: boolean; days?: number; error?: string }> = [];
  for (const account of accounts ?? []) {
    const label = account.username ?? account.ig_user_id;
    try {
      const { expiresInSeconds } = await runWithAccount(account.id, refreshLongLivedToken);
      const days = Math.round(expiresInSeconds / 86400);
      console.log(`[cron] token de ${label} renovado, válido por ${days} dias.`);
      results.push({ account: label, ok: true, days });
    } catch (err) {
      // Vai para os logs da Vercel; o aviso no painel mostra a validade caindo.
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[cron] falha ao renovar o token de ${label}:`, message);
      results.push({ account: label, ok: false, error: message });
    }
  }

  const failed = results.some((r) => !r.ok);
  return NextResponse.json({ ok: !failed, results }, { status: failed ? 500 : 200 });
}
