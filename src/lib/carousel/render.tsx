import { ImageResponse } from "next/og";
import { loadFont } from "./font";
import { SLIDE_HEIGHT, SLIDE_WIDTH, type Carousel, type Slide } from "./types";

type Run = { text: string; bold: boolean };

/** Quebra o texto em pedaços, marcando o que está entre ** ** como negrito. */
function parseBold(text: string): Run[] {
  const parts: Run[] = [];
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
 * Agrupa os trechos em PALAVRAS, não em trechos de formatação.
 *
 * O Satori quebra linha entre itens de flex. Se cada trecho de negrito virar um
 * item, "**173 mil**." pode quebrar entre o negrito e o ponto, e o ponto fica
 * órfão na linha seguinte. Aqui a palavra é a unidade indivisível: o "." entra
 * na mesma palavra que "mil", mesmo vindo de outro trecho.
 */
function toWords(block: string): Run[][] {
  const words: Run[][] = [];
  let current: Run[] = [];

  for (const run of parseBold(block)) {
    for (const piece of run.text.split(/(\s+)/)) {
      if (!piece) continue;
      if (/^\s+$/.test(piece)) {
        if (current.length) {
          words.push(current);
          current = [];
        }
      } else {
        current.push({ text: piece, bold: run.bold });
      }
    }
  }
  if (current.length) words.push(current);
  return words;
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

/**
 * Renderiza um slide em PNG.
 *
 * Fica aqui, e não dentro da rota, porque o ZIP precisa das mesmas imagens. Se
 * o ZIP buscasse cada slide por HTTP, a requisição sairia sem cookie, o proxy
 * de autenticação redirecionaria para /login e o arquivo salvo seria a página
 * de login com extensão .png. (Além disso, uma função serverless chamando a si
 * mesma pode travar quando a concorrência acaba.)
 */
export async function renderSlide(carousel: Carousel, index: number): Promise<ImageResponse> {
  const slide = (carousel.slides ?? []).find((s: Slide) => s.n === index);
  if (!slide) throw new Error(`Slide ${index} não existe neste carrossel.`);

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
              {toWords(block).map((word, w) => (
                <div key={w} style={{ display: "flex", marginRight: fontSize * 0.27 }}>
                  {word.map((run, r) => (
                    <span key={r} style={{ fontWeight: run.bold ? 700 : 400 }}>
                      {run.text}
                    </span>
                  ))}
                </div>
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

/** Bytes do PNG, para empacotar no ZIP. */
export async function renderSlidePng(carousel: Carousel, index: number): Promise<Uint8Array> {
  const image = await renderSlide(carousel, index);
  const bytes = new Uint8Array(await image.arrayBuffer());

  // Assinatura PNG: 89 50 4E 47. Se não bater, algo devolveu outra coisa e é
  // melhor estourar aqui do que entregar um .png que não abre.
  const isPng =
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (!isPng) throw new Error(`O slide ${index} não gerou um PNG válido.`);

  return bytes;
}
