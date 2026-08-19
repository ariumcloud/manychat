import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { getAccount } from "@/lib/repo";
import { withApi } from "@/lib/api";
import { generateCarousel } from "@/lib/carousel/generate";
import { pickProvider, providerLabel } from "@/lib/carousel/providers";

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
  });
}

/** Recebe o relato do teste e devolve o roteiro dos 8 slides já gravado. */
async function postHandler(req: Request) {
  const account = await getAccount();
  const { brief } = (await req.json().catch(() => ({}))) as { brief?: string };

  if (!brief?.trim() || brief.trim().length < 30) {
    return NextResponse.json(
      { error: "Descreva o teste com mais detalhe — o que você fez, quantas vezes e o que deu." },
      { status: 400 },
    );
  }

  const { title, slides } = await generateCarousel(brief.trim());

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
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ carousel: data });
}

export const GET = withApi(getHandler);
export const POST = withApi(postHandler);
