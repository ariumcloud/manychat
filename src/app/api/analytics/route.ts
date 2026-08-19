import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { getAccount } from "@/lib/repo";
import { withApi } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type Funnel = {
  comentarios: number;
  com_gatilho: number;
  dm_enviada: number;
  dm_lida: number;
  cliques: number;
  pessoas_que_clicaram: number;
};

export type KeywordRow = {
  trigger_id: string;
  keywords: string[];
  kind: string;
  fluxo: string | null;
  comentarios: number;
  dm_enviada: number;
  links_enviados: number;
  links_clicados: number;
};

async function getHandler(req: Request) {
  const account = await getAccount();
  const days = Number(new URL(req.url).searchParams.get("days") ?? 30);
  const supabase = db();

  const [funnel, keywords] = await Promise.all([
    supabase.rpc("mc_funnel", { p_account: account.id, p_days: days }),
    supabase.rpc("mc_keyword_performance", { p_account: account.id, p_days: Math.max(days, 90) }),
  ]);

  if (funnel.error) return NextResponse.json({ error: funnel.error.message }, { status: 500 });
  if (keywords.error) return NextResponse.json({ error: keywords.error.message }, { status: 500 });

  return NextResponse.json({
    days,
    funnel: (funnel.data?.[0] ?? {
      comentarios: 0,
      com_gatilho: 0,
      dm_enviada: 0,
      dm_lida: 0,
      cliques: 0,
      pessoas_que_clicaram: 0,
    }) as Funnel,
    keywords: (keywords.data ?? []) as KeywordRow[],
  });
}

export const GET = withApi(getHandler);
