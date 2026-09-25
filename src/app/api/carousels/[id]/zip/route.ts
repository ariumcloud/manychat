import { zipSync } from "fflate";
import { db } from "@/lib/supabase";
import { getAccount } from "@/lib/repo";
import { withApi } from "@/lib/api";
import { renderSlidePng } from "@/lib/carousel/render";
import type { Carousel } from "@/lib/carousel/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Params = { params: Promise<{ id: string }> };

/**
 * Renderiza todos os slides e devolve um ZIP com 01.png, 02.png…, na ordem.
 *
 * Renderiza em processo de propósito. Buscar cada slide por HTTP sairia sem
 * cookie de sessão, o proxy redirecionaria para /login e o ZIP viria cheio de
 * páginas de login com extensão .png.
 */
async function getHandler(_req: Request, { params }: Params) {
  const { id } = await params;
  const account = await getAccount();

  const { data } = await db()
    .from("mc_carousels")
    .select("*")
    .eq("id", id)
    .eq("account_id", account.id)
    .maybeSingle();
  if (!data) return new Response("Carrossel não encontrado", { status: 404 });

  const carousel = data as Carousel;
  if (!carousel.slides?.length) {
    return new Response("Este carrossel não tem slides.", { status: 400 });
  }

  const rendered = await Promise.all(
    carousel.slides.map(async (slide) => ({
      n: slide.n,
      bytes: await renderSlidePng(carousel, slide.n),
    })),
  );

  const files: Record<string, Uint8Array> = {};
  for (const { n, bytes } of rendered) {
    files[`${String(n).padStart(2, "0")}.png`] = bytes;
  }

  // PNG já é comprimido; recomprimir só gastaria CPU.
  const zip = zipSync(files, { level: 0 });

  const slug = (carousel.title ?? "carrossel")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);

  return new Response(zip, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Length": String(zip.byteLength),
      "Content-Disposition": `attachment; filename="${slug || "carrossel"}.zip"`,
    },
  });
}

export const GET = withApi(getHandler);
