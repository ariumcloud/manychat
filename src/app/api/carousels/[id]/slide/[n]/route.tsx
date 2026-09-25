import { db } from "@/lib/supabase";
import { getAccountCached } from "@/lib/repo";
import { renderSlide } from "@/lib/carousel/render";
import type { Carousel } from "@/lib/carousel/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; n: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id, n } = await params;
  const account = await getAccountCached();
  if (!account) return new Response("Não autorizado", { status: 401 });

  const { data } = await db()
    .from("mc_carousels")
    .select("*")
    .eq("id", id)
    .eq("account_id", account.id)
    .maybeSingle();
  if (!data) return new Response("Carrossel não encontrado", { status: 404 });

  try {
    return await renderSlide(data as Carousel, Number(n));
  } catch (err) {
    return new Response(err instanceof Error ? err.message : "Falha ao renderizar", {
      status: 404,
    });
  }
}
