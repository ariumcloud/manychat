import { NextResponse } from "next/server";
import { withApi } from "@/lib/api";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const VERSION = process.env.META_API_VERSION ?? "v23.0";
const BASE =
  (process.env.META_API_FLAVOR ?? "instagram") === "facebook"
    ? `https://graph.facebook.com/${VERSION}`
    : `https://graph.instagram.com/${VERSION}`;

/**
 * Único teste que escreve algo: cria um "container" de mídia para satisfazer
 * instagram_business_content_publish.
 *
 * Criar o container NÃO publica nada no seu perfil — publicar exige uma segunda
 * chamada (/me/media_publish) que este endpoint deliberadamente não faz. O
 * container fica pendente e o Instagram o descarta sozinho em 24h.
 */
async function postHandler(req: Request) {
  const { imageUrl } = (await req.json().catch(() => ({}))) as { imageUrl?: string };

  if (!imageUrl?.trim()) {
    return NextResponse.json(
      { error: "Informe a URL pública de uma imagem JPEG." },
      { status: 400 },
    );
  }

  const url = new URL(`${BASE}/me/media`);
  url.searchParams.set("image_url", imageUrl.trim());
  url.searchParams.set("caption", "Teste de API — container não publicado");

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.igAccessToken}` },
    cache: "no-store",
  });

  const text = await res.text();
  let json: Record<string, unknown>;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text.slice(0, 300) };
  }

  if (!res.ok) {
    const err = json.error as { message?: string } | undefined;
    return NextResponse.json(
      { error: err?.message ?? `A Graph API respondeu ${res.status}.` },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    containerId: json.id,
    detail:
      "Container criado. Nada foi publicado no seu perfil — o Instagram descarta o container sozinho em 24h.",
  });
}

export const POST = withApi(postHandler);
