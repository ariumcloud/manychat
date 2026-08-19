import { zipSync } from "fflate";
import { db } from "@/lib/supabase";
import { withApi } from "@/lib/api";
import type { Carousel } from "@/lib/carousel/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Params = { params: Promise<{ id: string }> };

/** Renderiza os 8 slides e devolve um ZIP com 01.png … 08.png, na ordem. */
async function getHandler(req: Request, { params }: Params) {
  const { id } = await params;

  const { data } = await db().from("mc_carousels").select("*").eq("id", id).maybeSingle();
  if (!data) return new Response("Carrossel não encontrado", { status: 404 });

  const carousel = data as Carousel;
  const origin = new URL(req.url).origin;

  const pngs = await Promise.all(
    carousel.slides.map(async (slide) => {
      const res = await fetch(`${origin}/api/carousels/${id}/slide/${slide.n}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Slide ${slide.n} falhou ao renderizar (HTTP ${res.status}).`);
      return { n: slide.n, bytes: new Uint8Array(await res.arrayBuffer()) };
    }),
  );

  const files: Record<string, Uint8Array> = {};
  for (const { n, bytes } of pngs) {
    files[`${String(n).padStart(2, "0")}.png`] = bytes;
  }

  const zip = zipSync(files, { level: 0 }); // PNG já é comprimido; recomprimir só gasta CPU

  const slug = (carousel.title ?? "carrossel")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);

  return new Response(zip as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${slug || "carrossel"}.zip"`,
    },
  });
}

export const GET = withApi(getHandler);
