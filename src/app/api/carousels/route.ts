import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { getAccount } from "@/lib/repo";
import { withApi } from "@/lib/api";
import { DEFAULT_THEME, THEMES, getTheme } from "@/lib/carousel/themes";
import { normalizeHex } from "@/lib/carousel/color";
import { generateCarousel } from "@/lib/carousel/generate";
import { pickProvider, providerLabel } from "@/lib/carousel/providers";
import { clampSlideCount, MAX_SLIDES, MIN_SLIDES, PRESETS } from "@/lib/carousel/prompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function getHandler() {
  const account = await getAccount();
  const { data, error } = await db()
    .from("mc_carousels")
    .select("*")
    .eq("account_id", account.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const provider = pickProvider();
  return NextResponse.json({
    carousels: data,
    provider: providerLabel(provider),
    // Sem chave nenhuma o botão de gerar precisa avisar antes, não falhar depois.
    ready: provider === "openai" ? Boolean(process.env.OPENAI_API_KEY) : Boolean(process.env.ANTHROPIC_API_KEY),
    slideRange: { min: MIN_SLIDES, max: MAX_SLIDES },
    presets: PRESETS,
    // Só o rótulo: as funções de desenho ficam no servidor.
    themes: THEMES.map(({ id, label, hint, defaultAccent }) => ({ id, label, hint, defaultAccent })),
    defaultTheme: DEFAULT_THEME,
  });
}

/** Recebe a ideia e devolve o roteiro dos slides já gravado. */
async function postHandler(req: Request) {
  const account = await getAccount();
  const { brief, slide_count, direction, theme, accent } = (await req.json().catch(() => ({}))) as {
    brief?: string;
    slide_count?: number;
    direction?: string;
    theme?: string;
    accent?: string;
  };

  if (!brief?.trim() || brief.trim().length < 30) {
    return NextResponse.json(
      { error: "Descreva a ideia com mais detalhe — quanto mais concreto, melhor o carrossel." },
      { status: 400 },
    );
  }

  const { title, slides } = await generateCarousel(
    brief.trim(),
    direction?.trim() || null,
    clampSlideCount(slide_count),
  );

  const { data, error } = await db()
    .from("mc_carousels")
    .insert({
      account_id: account.id,
      brief: brief.trim(),
      title,
      slides,
      // O card sai com o perfil da própria conta conectada.
      handle: account.username,
      display_name: account.name ?? account.username,
      avatar_url: account.profile_picture_url,
      theme: getTheme(theme).id,
      accent: normalizeHex(accent),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ carousel: data });
}

export const GET = withApi(getHandler);
export const POST = withApi(postHandler);
