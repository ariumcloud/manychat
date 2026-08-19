import { ImageResponse } from "next/og";
import { db } from "@/lib/supabase";
import { loadFont } from "@/lib/carousel/font";
import { SLIDE_HEIGHT, SLIDE_WIDTH, type Carousel, type Slide } from "@/lib/carousel/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; n: string }> };

/** Quebra o texto em pedaços, marcando o que está entre ** ** como negrito. */
function parseBold(text: string): Array<{ text: string; bold: boolean }> {
  const parts: Array<{ text: string; bold: boolean }> = [];
  const regex = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = regex.exec(text))) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index), bold: false });
    parts.push({ text: m[1], bold: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), bold: false });
  return parts;
}

/**
 * O texto vem com quebras de linha que separam ideias. Cada bloco vira um
 * parágrafo próprio para o espaçamento não colapsar no Satori.
 */
function paragraphs(text: string): string[] {
  return text
    .split(/\n{1,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export async function GET(_req: Request, { params }: Params) {
  const { id, n } = await params;
  const index = Number(n);

  const { data } = await db().from("mc_carousels").select("*").eq("id", id).maybeSingle();
  if (!data) return new Response("Carrossel não encontrado", { status: 404 });

  const carousel = data as Carousel;
  const slide = (carousel.slides ?? []).find((s: Slide) => s.n === index);
  if (!slide) return new Response("Slide não encontrado", { status: 404 });

  const [regular, bold] = await Promise.all([loadFont("Inter", 400), loadFont("Inter", 700)]);

  const total = carousel.slides.length;
  const name = carousel.display_name || "—";
  const handle = carousel.handle ? `@${carousel.handle}` : "";
  const blocks = paragraphs(slide.text);

  // Slide com print sobra menos espaço para texto — encolhe a fonte.
  const fontSize = slide.image_url ? 40 : blocks.join(" ").length > 240 ? 42 : 50;

  return new ImageResponse(
    (
      <div
        style={{
          width: SLIDE_WIDTH,
          height: SLIDE_HEIGHT,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#ffffff",
          padding: 72,
          fontFamily: "Inter",
        }}
      >
        {/* cabeçalho: avatar, nome, selo, arroba */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 44 }}>
          {carousel.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={carousel.avatar_url}
              width={96}
              height={96}
              style={{ borderRadius: 96, objectFit: "cover" }}
              alt=""
            />
          ) : (
            <div style={{ width: 96, height: 96, borderRadius: 96, background: "#e6e9ef" }} />
          )}

          <div style={{ display: "flex", flexDirection: "column", marginLeft: 24 }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ fontSize: 38, fontWeight: 700, color: "#0f1419" }}>{name}</span>
              {carousel.verified && (
                <svg width="34" height="34" viewBox="0 0 24 24" style={{ marginLeft: 10 }}>
                  <path
                    fill="#1d9bf0"
                    d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81C14.67 2.63 13.43 1.75 12 1.75s-2.67.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91C2.63 9.33 1.75 10.57 1.75 12s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"
                  />
                </svg>
              )}
            </div>
            <span style={{ fontSize: 32, color: "#536471", marginTop: 4 }}>{handle}</span>
          </div>
        </div>

        {/* corpo */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {blocks.map((block, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexWrap: "wrap",
                fontSize,
                lineHeight: 1.4,
                color: "#0f1419",
                marginBottom: i === blocks.length - 1 ? 0 : 28,
              }}
            >
              {parseBold(block).map((part, j) => (
                <span key={j} style={{ fontWeight: part.bold ? 700 : 400, whiteSpace: "pre-wrap" }}>
                  {part.text}
                </span>
              ))}
            </div>
          ))}
        </div>

        {/* print da prova */}
        {slide.image_url && (
          <div style={{ display: "flex", marginTop: 44 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slide.image_url}
              style={{
                width: "100%",
                maxHeight: 560,
                objectFit: "contain",
                borderRadius: 20,
                border: "2px solid #eff3f4",
              }}
              alt=""
            />
          </div>
        )}

        {/* contador */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            right: 72,
            bottom: 56,
            fontSize: 28,
            color: "#8b98a5",
          }}
        >
          {index}/{total}
        </div>
      </div>
    ),
    {
      width: SLIDE_WIDTH,
      height: SLIDE_HEIGHT,
      fonts: [
        { name: "Inter", data: regular, weight: 400, style: "normal" },
        { name: "Inter", data: bold, weight: 700, style: "normal" },
      ],
    },
  );
}
