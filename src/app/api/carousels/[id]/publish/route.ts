import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { withApi } from "@/lib/api";
import { renderSlidePng } from "@/lib/carousel/render";
import type { Carousel } from "@/lib/carousel/types";
import {
  createCarouselContainer,
  createCarouselItem,
  getContainerStatus,
  publishContainer,
} from "@/lib/meta/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BUCKET = "mc-carousel";
type Params = { params: Promise<{ id: string }> };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Publica o carrossel no Instagram.
 *
 * Etapa irreversível: depois do publish o post está no feed. Por isso exige
 * `confirm: true` explícito no corpo — evita publicar por clique errado ou por
 * uma requisição repetida.
 */
async function postHandler(req: Request, { params }: Params) {
  const { id } = await params;
  const { caption, confirm, republish } = (await req.json().catch(() => ({}))) as {
    caption?: string;
    confirm?: boolean;
    republish?: boolean;
  };

  if (confirm !== true) {
    return NextResponse.json(
      { error: "Publicação não confirmada." },
      { status: 400 },
    );
  }

  const supabase = db();
  const { data } = await supabase.from("mc_carousels").select("*").eq("id", id).maybeSingle();
  if (!data) return NextResponse.json({ error: "Carrossel não encontrado." }, { status: 404 });

  const carousel = data as Carousel;

  // Já publicado: só republica com o flag explícito. Cobre o caso de ter
  // apagado o post do feed e querer postar de novo.
  if (carousel.published_at && republish !== true) {
    return NextResponse.json(
      {
        error: "Este carrossel já foi publicado antes.",
        alreadyPublished: true,
      },
      { status: 409 },
    );
  }

  const slides = carousel.slides ?? [];
  if (slides.length < 2 || slides.length > 10) {
    return NextResponse.json(
      { error: `O Instagram aceita de 2 a 10 imagens por carrossel. Este tem ${slides.length}.` },
      { status: 400 },
    );
  }

  // 1. Renderiza e sobe cada slide — o Instagram baixa as imagens da URL, então
  //    elas precisam ser públicas. A rota de slide é protegida por senha.
  const urls: string[] = [];
  for (const slide of slides) {
    const bytes = await renderSlidePng(carousel, slide.n);
    const path = `${id}/publish-${slide.n}-${Date.now()}.png`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: "image/png", upsert: true });

    if (upErr) {
      return NextResponse.json(
        { error: `Falha ao subir o slide ${slide.n}: ${upErr.message}` },
        { status: 500 },
      );
    }

    urls.push(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
  }

  // 2. Um container por imagem, depois o container do carrossel.
  const children: string[] = [];
  for (const url of urls) children.push(await createCarouselItem(url));

  const containerId = await createCarouselContainer(children, caption ?? carousel.title ?? "");

  // 3. O container pode levar alguns segundos para ficar pronto.
  for (let i = 0; i < 10; i++) {
    const status = await getContainerStatus(containerId);
    if (status.status_code === "FINISHED") break;
    if (status.status_code === "ERROR") {
      return NextResponse.json(
        { error: "O Instagram recusou o carrossel ao processar as imagens." },
        { status: 502 },
      );
    }
    await sleep(2000);
  }

  // 4. A partir daqui está no ar.
  const mediaId = await publishContainer(containerId);

  const { data: updated } = await supabase
    .from("mc_carousels")
    .update({
      published_at: new Date().toISOString(),
      ig_media_id: mediaId,
      caption: caption ?? null,
      status: "published",
    })
    .eq("id", id)
    .select()
    .single();

  return NextResponse.json({ carousel: updated, ig_media_id: mediaId });
}

export const POST = withApi(postHandler);
