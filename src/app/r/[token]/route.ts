import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

/**
 * Registra o clique e manda a pessoa para o destino.
 *
 * Fica fora do proxy de autenticação de propósito — quem abre isto é o
 * seguidor, não você.
 */
export async function GET(_req: Request, { params }: Params) {
  const { token } = await params;
  const supabase = db();

  const { data: link } = await supabase
    .from("mc_links")
    .select("id, url, click_count, first_clicked_at")
    .eq("token", token)
    .maybeSingle();

  // Link desconhecido não vira erro na cara do seguidor.
  if (!link) return NextResponse.redirect("https://instagram.com");

  const now = new Date().toISOString();
  await supabase
    .from("mc_links")
    .update({
      click_count: (link.click_count ?? 0) + 1,
      first_clicked_at: link.first_clicked_at ?? now,
      last_clicked_at: now,
    })
    .eq("id", link.id);

  return NextResponse.redirect(link.url);
}
