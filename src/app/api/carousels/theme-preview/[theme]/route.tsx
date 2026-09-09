import { renderSlide } from "@/lib/carousel/render";
import { normalizeHex } from "@/lib/carousel/color";
import type { Carousel } from "@/lib/carousel/types";

export const runtime = "nodejs";
export const revalidate = 86400;

/**
 * Miniatura de um tema, para a pessoa ver antes de escolher.
 *
 * Usa um slide de exemplo em vez de um carrossel de verdade: o seletor precisa
 * mostrar os cinco temas de uma vez, inclusive antes de existir carrossel
 * nenhum. O conteúdo é fixo de propósito — o que muda entre as miniaturas é só
 * o desenho e a cor.
 */
const SAMPLE: Carousel = {
  id: "preview",
  account_id: "preview",
  brief: "",
  title: "Exemplo",
  handle: "seuperfil",
  display_name: "Seu nome",
  avatar_url: null,
  verified: true,
  theme: "dossie",
  accent: null,
  status: "draft",
  published_at: null,
  ig_media_id: null,
  caption: null,
  created_at: "",
  updated_at: "",
  slides: [
    {
      n: 1,
      text: "Todo mundo quer vender para todo mundo.",
      screenshot_hint: "",
      subhead: "Emagrecimento. Dinheiro. Relacionamento.",
      eyebrow: "O problema",
      breadcrumb: "nicho / subnicho / dor",
      card: {
        kind: "flow",
        title: "Quanto mais genérico, mais gente disputa a mesma atenção.",
        items: ["Emagrecimento", "Flacidez", "Flacidez no braço"],
      },
      kicker: "Desce **um nível** e a briga acaba.",
    },
    { n: 2, text: "segundo slide", screenshot_hint: "" },
  ],
};

type Params = { params: Promise<{ theme: string }> };

export async function GET(req: Request, { params }: Params) {
  const { theme } = await params;
  const accent = normalizeHex(new URL(req.url).searchParams.get("accent"));

  const image = await renderSlide({ ...SAMPLE, theme, accent }, 1);

  // O exemplo é fixo: sem cache, cada abertura da tela redesenharia os cinco.
  image.headers.set("Cache-Control", "public, max-age=86400, immutable");
  return image;
}
