import { db } from "@/lib/supabase";
import { renderSlide } from "@/lib/carousel/render";
import type { Carousel } from "@/lib/carousel/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; n: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id, n } = await params;

  const { data } = await db().from("mc_carousels").select("*").eq("id", id).maybeSingle();
  if (!data) return new Response("Carrossel não encontrado", { status: 404 });

  try {
    return await renderSlide(data as Carousel, Number(n));
  } catch (err) {
    return new Response(err instanceof Error ? err.message : "Falha ao renderizar", {
      status: 404,
    });
  }
}
