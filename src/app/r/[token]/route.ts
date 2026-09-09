import { NextResponse, after } from "next/server";
import { db } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

// Cache em memória para resolução instantânea de tokens conhecidos (10 minutos de TTL)
const linkCache = new Map<string, { id: string; url: string; at: number }>();

/**
 * Registra o clique e manda a pessoa para o destino.
 *
 * Fica fora do proxy de autenticação de propósito — quem abre isto é o
 * seguidor, não você.
 */
export async function GET(_req: Request, { params }: Params) {
  const { token } = await params;
  const now = Date.now();

  let link = linkCache.get(token);
  if (!link || now - link.at > 10 * 60_000) {
    const { data } = await db()
      .from("mc_links")
      .select("id, url")
      .eq("token", token)
      .maybeSingle();

    if (data) {
      link = { id: data.id, url: data.url, at: now };
      linkCache.set(token, link);
    }
  }

  // Link desconhecido não vira erro na cara do seguidor.
  if (!link) return NextResponse.redirect("https://instagram.com");

  const linkId = link.id;
  const targetUrl = link.url;

  // Persiste a contagem de cliques em background sem bloquear o redirecionamento
  after(async () => {
    try {
      const nowIso = new Date().toISOString();
      const supabase = db();
      const { data: current } = await supabase
        .from("mc_links")
        .select("click_count, first_clicked_at")
        .eq("id", linkId)
        .maybeSingle();

      await supabase
        .from("mc_links")
        .update({
          click_count: (current?.click_count ?? 0) + 1,
          first_clicked_at: current?.first_clicked_at ?? nowIso,
          last_clicked_at: nowIso,
        })
        .eq("id", linkId);
    } catch (err) {
      console.error("[links] erro ao registrar clique em background:", err);
    }
  });

  return NextResponse.redirect(targetUrl);
}
