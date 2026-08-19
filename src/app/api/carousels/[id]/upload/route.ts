import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { withApi } from "@/lib/api";
import type { Carousel, Slide } from "@/lib/carousel/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BUCKET = "mc-carousel";
type Params = { params: Promise<{ id: string }> };

/** Recebe o print de um slide e guarda no Storage, devolvendo a URL pública. */
async function postHandler(req: Request, { params }: Params) {
  const { id } = await params;

  const form = await req.formData();
  const file = form.get("file");
  const n = Number(form.get("n"));

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Envie um arquivo de imagem." }, { status: 400 });
  }
  if (!Number.isInteger(n)) {
    return NextResponse.json({ error: "Informe o número do slide." }, { status: 400 });
  }

  const supabase = db();

  const { data: existing } = await supabase
    .from("mc_carousels")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: "Carrossel não encontrado." }, { status: 404 });

  const ext = file.type === "image/jpeg" ? "jpg" : file.type === "image/webp" ? "webp" : "png";
  // Timestamp no nome porque o Storage cacheia por caminho — sem isso, trocar o
  // print continuaria renderizando o antigo.
  const path = `${id}/slide-${n}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: `Falha no upload: ${uploadError.message}` }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const carousel = existing as Carousel;
  const slides = (carousel.slides ?? []).map((s: Slide) =>
    s.n === n ? { ...s, image_url: publicUrl } : s,
  );

  const { data, error } = await supabase
    .from("mc_carousels")
    .update({ slides, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ carousel: data, url: publicUrl });
}

export const POST = withApi(postHandler);
