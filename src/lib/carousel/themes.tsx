import type { ReactElement } from "react";
import { Rich, plain } from "./text";
import { SLIDE_HEIGHT, SLIDE_WIDTH, type Carousel, type Slide, type SlideCard } from "./types";

/**
 * Um tema é um jeito de desenhar o slide. Todos recebem o mesmo conteúdo — o
 * que muda é a página.
 *
 * Papel do slide:
 *   capa     = o primeiro, que ganha (ou perde) o arrasto;
 *   conteudo = o miolo;
 *   final    = o último, que pede UMA ação.
 *
 * O texto de cada slide chega como parágrafos. O primeiro vira manchete e o
 * resto vira apoio — é isso que permite layout de verdade sem mudar nada no
 * que a IA escreve.
 */
export type SlideRole = "capa" | "conteudo" | "final";

export type ThemeCtx = {
  carousel: Carousel;
  slide: Slide;
  index: number;
  total: number;
  role: SlideRole;
  headline: string;
  body: string[];
};

export type FontSpec = { family: string; weight: number; italic?: boolean };

export type Theme = {
  id: string;
  label: string;
  hint: string;
  fonts: FontSpec[];
  render: (ctx: ThemeCtx) => ReactElement;
};

// --- peças compartilhadas ---------------------------------------------------

/** Escala a manchete pelo tamanho dela: título curto ocupa a tela. */
function headlineSize(text: string, big: number, mid: number, small: number) {
  const n = plain(text).length;
  return n < 42 ? big : n < 90 ? mid : small;
}

function Avatar({ url, size, ring }: { url: string | null; size: number; ring?: string }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      width={size}
      height={size}
      alt=""
      style={{
        borderRadius: size,
        objectFit: "cover",
        ...(ring ? { border: `3px solid ${ring}` } : {}),
      }}
    />
  ) : (
    <div style={{ width: size, height: size, borderRadius: size, background: "#2a2f3d" }} />
  );
}

/** Print de prova, quando o slide tem um. */
function Proof({ url, border, radius = 24 }: { url: string; border: string; radius?: number }) {
  return (
    <div style={{ display: "flex", marginTop: 48 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        style={{
          width: "100%",
          maxHeight: 520,
          objectFit: "contain",
          borderRadius: radius,
          border: `2px solid ${border}`,
        }}
      />
    </div>
  );
}

// --- 1. Tweet ---------------------------------------------------------------

const tweet: Theme = {
  id: "tweet",
  label: "Card de tweet",
  hint: "Fundo branco, print de tweet. O clássico que já estava aqui.",
  fonts: [
    { family: "Inter", weight: 400 },
    { family: "Inter", weight: 700 },
  ],
  render: ({ carousel, slide, index, total, headline, body }) => {
    const blocks = [headline, ...body];
    const chars = plain(blocks.join(" ")).length;
    const size = slide.image_url ? 38 : chars > 360 ? 42 : chars > 200 ? 48 : 56;

    return (
      <div
        style={{
          width: SLIDE_WIDTH,
          height: SLIDE_HEIGHT,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          background: "#ffffff",
          padding: "128px 76px 96px",
          fontFamily: "Inter",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: 44 }}>
          <Avatar url={carousel.avatar_url} size={96} />
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 24 }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ fontSize: 38, fontWeight: 700, color: "#0f1419" }}>
                {carousel.display_name || "—"}
              </span>
              {carousel.verified && (
                <svg width="34" height="34" viewBox="0 0 24 24" style={{ marginLeft: 10 }}>
                  <path
                    fill="#1d9bf0"
                    d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81C14.67 2.63 13.43 1.75 12 1.75s-2.67.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91C2.63 9.33 1.75 10.57 1.75 12s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"
                  />
                </svg>
              )}
            </div>
            <span style={{ fontSize: 32, color: "#536471", marginTop: 4 }}>
              {carousel.handle ? `@${carousel.handle}` : ""}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {blocks.map((block, i) => (
            <div
              key={i}
              style={{ display: "flex", marginBottom: i === blocks.length - 1 ? 0 : 28 }}
            >
              <Rich block={block} size={size} color="#0f1419" />
            </div>
          ))}
        </div>

        {slide.image_url && <Proof url={slide.image_url} border="#eff3f4" radius={20} />}

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
    );
  },
};

// --- 2. Editorial -----------------------------------------------------------

const editorial: Theme = {
  id: "editorial",
  label: "Editorial",
  hint: "Preto, serifa grande e numeral gigante ao fundo. Cara de revista.",
  fonts: [
    { family: "Playfair Display", weight: 700 },
    { family: "Inter", weight: 400 },
    { family: "Inter", weight: 700 },
  ],
  render: ({ carousel, slide, index, total, role, headline, body }) => {
    const accent = "#e8c47a";
    const size = headlineSize(headline, role === "capa" ? 104 : 82, 74, 60);

    return (
      <div
        style={{
          width: SLIDE_WIDTH,
          height: SLIDE_HEIGHT,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(160deg, #14141a 0%, #08080c 55%, #101018 100%)",
          padding: "96px 84px",
          fontFamily: "Inter",
        }}
      >
        {/* Numeral fantasma, ancorado embaixo: em cima ele passava por trás da
            manchete e virava sujeira atrás das letras. */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            right: 34,
            bottom: 96,
            fontSize: 420,
            fontFamily: "Playfair Display",
            fontWeight: 700,
            color: "rgba(232,196,122,0.055)",
            lineHeight: 1,
          }}
        >
          {String(index).padStart(2, "0")}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", width: 56, height: 3, background: accent }} />
            <span
              style={{
                fontSize: 24,
                letterSpacing: 4,
                textTransform: "uppercase",
                color: accent,
                marginLeft: 18,
                fontWeight: 700,
              }}
            >
              {role === "capa" ? carousel.title || "Fio" : role === "final" ? "Fecha aqui" : `Parte ${index - 1}`}
            </span>
          </div>
        </div>

        {/* Miolo centrado — ver comentário no tema Terminal. */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
          <div style={{ display: "flex" }}>
            <Rich
              block={headline}
              size={size}
              color="#f6f2ea"
              weight={700}
              boldWeight={700}
              boldColor={accent}
              lineHeight={1.14}
              spacing={-1.5}
              family="Playfair Display"
            />
          </div>

          {body.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", marginTop: 44 }}>
              {body.map((block, i) => (
                <div key={i} style={{ display: "flex", marginBottom: i === body.length - 1 ? 0 : 24 }}>
                  <Rich block={block} size={38} color="#b8b2a6" lineHeight={1.5} />
                </div>
              ))}
            </div>
          )}

          {slide.image_url && <Proof url={slide.image_url} border="#2a2620" />}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <Avatar url={carousel.avatar_url} size={64} ring="#2a2620" />
            <span style={{ fontSize: 28, color: "#7d776c", marginLeft: 18 }}>
              {carousel.handle ? `@${carousel.handle}` : ""}
            </span>
          </div>
          <span style={{ fontSize: 26, color: "#4a463f", letterSpacing: 2 }}>
            {String(index).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
        </div>
      </div>
    );
  },
};

// --- 3. Poster --------------------------------------------------------------

/** Uma cor por slide, girando. É o que dá o efeito de coleção no feed. */
const POSTER = [
  { bg: "#5b21b6", ink: "#f5f3ff", accent: "#fde047" },
  { bg: "#0f766e", ink: "#ecfdf5", accent: "#fcd34d" },
  { bg: "#be123c", ink: "#fff1f2", accent: "#fde68a" },
  { bg: "#1d4ed8", ink: "#eff6ff", accent: "#a7f3d0" },
  { bg: "#c2410c", ink: "#fff7ed", accent: "#fef08a" },
];

const poster: Theme = {
  id: "poster",
  label: "Pôster",
  hint: "Cor cheia trocando a cada slide e tipografia gigante. Grita no feed.",
  fonts: [
    { family: "Anton", weight: 400 },
    { family: "Inter", weight: 400 },
    { family: "Inter", weight: 700 },
  ],
  render: ({ carousel, slide, index, total, role, headline, body }) => {
    const c = POSTER[(index - 1) % POSTER.length];
    const size = headlineSize(headline, 132, 104, 82);

    return (
      <div
        style={{
          width: SLIDE_WIDTH,
          height: SLIDE_HEIGHT,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: c.bg,
          padding: "88px 76px",
          fontFamily: "Inter",
        }}
      >
        {/* bolha de luz no canto, só para o fundo não ser chapado */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: -260,
            right: -200,
            width: 760,
            height: 760,
            borderRadius: 760,
            background: "rgba(255,255,255,0.09)",
          }}
        />

        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 66,
              height: 66,
              borderRadius: 66,
              background: c.accent,
              color: c.bg,
              fontSize: 32,
              fontWeight: 700,
              padding: "0 22px",
            }}
          >
            {role === "capa" ? "COMEÇA" : role === "final" ? "AGORA VAI" : String(index).padStart(2, "0")}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex" }}>
            <Rich
              block={headline}
              size={size}
              color={c.ink}
              weight={400}
              boldWeight={400}
              boldColor={c.accent}
              lineHeight={1.08}
              spacing={-2}
              family="Anton"
            />
          </div>

          {body.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", marginTop: 40 }}>
              {body.map((block, i) => (
                <div key={i} style={{ display: "flex", marginBottom: i === body.length - 1 ? 0 : 22 }}>
                  <Rich block={block} size={36} color={c.ink} lineHeight={1.45} />
                </div>
              ))}
            </div>
          )}

          {slide.image_url && <Proof url={slide.image_url} border="rgba(255,255,255,0.25)" />}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <Avatar url={carousel.avatar_url} size={60} ring="rgba(255,255,255,0.3)" />
            <span style={{ fontSize: 30, color: c.ink, marginLeft: 18, fontWeight: 700 }}>
              {carousel.handle ? `@${carousel.handle}` : ""}
            </span>
          </div>
          <span style={{ fontSize: 28, color: "rgba(255,255,255,0.6)" }}>
            {index}/{total}
          </span>
        </div>
      </div>
    );
  },
};

// --- 4. Neon ----------------------------------------------------------------

const neon: Theme = {
  id: "neon",
  label: "Neon",
  hint: "Gradiente escuro com brilho e cartão de vidro. Combina com IA e automação.",
  fonts: [
    { family: "Space Grotesk", weight: 700 },
    { family: "Inter", weight: 400 },
    { family: "Inter", weight: 700 },
  ],
  render: ({ carousel, slide, index, total, role, headline, body }) => {
    const accent = "#a78bfa";
    const size = headlineSize(headline, role === "capa" ? 100 : 84, 74, 60);

    return (
      <div
        style={{
          width: SLIDE_WIDTH,
          height: SLIDE_HEIGHT,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "radial-gradient(90% 60% at 15% 0%, #3b1d7a 0%, transparent 60%)," +
            "radial-gradient(80% 50% at 100% 100%, #7c2d6b 0%, transparent 65%)," +
            "linear-gradient(160deg, #0d0b1a 0%, #08070f 100%)",
          padding: "92px 78px",
          fontFamily: "Inter",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              borderRadius: 999,
              padding: "12px 26px",
              background: "rgba(167,139,250,0.14)",
              border: "1px solid rgba(167,139,250,0.35)",
            }}
          >
            <div
              style={{ display: "flex", width: 12, height: 12, borderRadius: 12, background: accent }}
            />
            <span style={{ fontSize: 24, color: "#d6ccff", marginLeft: 12, letterSpacing: 2 }}>
              {role === "capa" ? "FIO NOVO" : role === "final" ? "SUA VEZ" : `PASSO ${index - 1}`}
            </span>
          </div>
          <span style={{ fontSize: 26, color: "#6a6486" }}>
            {String(index).padStart(2, "0")}/{String(total).padStart(2, "0")}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex" }}>
            <Rich
              block={headline}
              size={size}
              color="#f4f1ff"
              weight={700}
              boldWeight={700}
              boldColor={accent}
              lineHeight={1.1}
              spacing={-1.5}
              family="Space Grotesk"
            />
          </div>

          {body.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginTop: 44,
                padding: "36px 38px",
                borderRadius: 28,
                background: "rgba(255,255,255,0.045)",
                border: "1px solid rgba(255,255,255,0.09)",
              }}
            >
              {body.map((block, i) => (
                <div key={i} style={{ display: "flex", marginBottom: i === body.length - 1 ? 0 : 22 }}>
                  <Rich block={block} size={36} color="#b9b3d4" lineHeight={1.5} boldColor="#efeaff" />
                </div>
              ))}
            </div>
          )}

          {slide.image_url && <Proof url={slide.image_url} border="rgba(167,139,250,0.3)" />}
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          <Avatar url={carousel.avatar_url} size={62} ring="rgba(167,139,250,0.4)" />
          <span style={{ fontSize: 28, color: "#8b85a8", marginLeft: 18 }}>
            {carousel.handle ? `@${carousel.handle}` : ""}
          </span>
        </div>
      </div>
    );
  },
};

// --- 5. Terminal ------------------------------------------------------------

const terminal: Theme = {
  id: "terminal",
  label: "Terminal",
  hint: "Monoespaçada, verde no preto. Para conteúdo técnico e bastidor.",
  fonts: [
    { family: "JetBrains Mono", weight: 400 },
    { family: "JetBrains Mono", weight: 700 },
  ],
  render: ({ carousel, slide, index, total, role, headline, body }) => {
    const green = "#4ade80";
    const size = headlineSize(headline, 72, 60, 50);

    return (
      <div
        style={{
          width: SLIDE_WIDTH,
          height: SLIDE_HEIGHT,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#07090b",
          padding: "84px 72px",
          fontFamily: "JetBrains Mono",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            {["#ff5f57", "#febc2e", "#28c840"].map((dot) => (
              <div
                key={dot}
                style={{
                  display: "flex",
                  width: 18,
                  height: 18,
                  borderRadius: 18,
                  background: dot,
                  marginRight: 12,
                }}
              />
            ))}
            <span style={{ fontSize: 24, color: "#3f4b57", marginLeft: 16 }}>
              {carousel.handle ? `~/${carousel.handle}` : "~/fluxo"} — {index}/{total}
            </span>
          </div>
        </div>

        {/* O miolo fica no centro da página: ancorado no topo, texto curto
            deixava metade do slide vazia. */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "flex-start" }}>
            <div
              style={{
                display: "flex",
                width: size * 0.78,
                flexShrink: 0,
                fontSize: size,
                color: green,
                fontWeight: 700,
                lineHeight: 1.22,
              }}
            >
              {role === "final" ? "$" : ">"}
            </div>
            <Rich
              block={headline}
              size={size}
              color="#e6edf3"
              weight={700}
              boldWeight={700}
              boldColor={green}
              lineHeight={1.22}
              spacing={-1}
            />
          </div>

          {body.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", marginTop: 44, paddingLeft: 8 }}>
              {body.map((block, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    borderLeft: "3px solid #1c2530",
                    paddingLeft: 26,
                    marginBottom: i === body.length - 1 ? 0 : 24,
                  }}
                >
                  <Rich block={block} size={34} color="#93a4b3" lineHeight={1.55} boldColor="#e6edf3" />
                </div>
              ))}
            </div>
          )}

          {slide.image_url && <Proof url={slide.image_url} border="#1c2530" radius={14} />}
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          {/* bloquinho do cursor: o caractere ▮ não existe na JetBrains Mono e
              virava quadrado vazio */}
          <div
            style={{ display: "flex", width: 16, height: 30, background: green, marginRight: 14 }}
          />
          <span style={{ fontSize: 26, color: "#3f4b57" }}>
            {carousel.handle ? `@${carousel.handle}` : ""}
          </span>
        </div>
      </div>
    );
  },
};


// --- 6. Dossiê --------------------------------------------------------------

/**
 * O formato dos carrosséis bem editados que circulam por aí: papel creme,
 * manchete pesada em caixa alta, e um cartão escuro onde mora a informação com
 * forma — lista, cadeia ou passos.
 *
 * O que faz este tema funcionar não é a paleta, é o slide trazer ESTRUTURA
 * (eyebrow, trilha, cartão, fecho). Sem isso ele desenha o básico e fica
 * parecido com os outros.
 */
const D = {
  paper: "#f2ede1",
  ink: "#14161c",
  rust: "#c8552b",
  card: "#232733",
  cardInk: "#eeece7",
  muted: "#8c8578",
  rule: "#d9d2c2",
};

function DossieCard({ card }: { card: SlideCard }) {
  const title = "title" in card ? card.title : undefined;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: D.card,
        borderRadius: 30,
        padding: "42px 46px",
        marginTop: 40,
      }}
    >
      {title && (
        <div style={{ display: "flex", marginBottom: 26 }}>
          <Rich block={title} size={40} color={D.cardInk} weight={700} boldColor={D.rust} lineHeight={1.28} />
        </div>
      )}

      {card.kind === "text" && (
        <div style={{ display: "flex" }}>
          <Rich block={card.body} size={34} color="#a9b0bd" lineHeight={1.5} boldColor={D.cardInk} />
        </div>
      )}

      {card.kind === "bullets" && (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {card.items.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", marginBottom: 14 }}>
              <span style={{ fontSize: 34, color: D.rust, marginRight: 16, lineHeight: 1.45 }}>→</span>
              <Rich block={item} size={34} color={D.cardInk} lineHeight={1.45} boldColor="#ffffff" />
            </div>
          ))}
          {card.note && (
            <div style={{ display: "flex", marginTop: 22 }}>
              <Rich block={card.note} size={32} color="#98a0ad" lineHeight={1.5} boldColor={D.cardInk} />
            </div>
          )}
        </div>
      )}

      {card.kind === "flow" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          {card.items.map((item, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span
                style={{
                  fontSize: 38,
                  fontWeight: 700,
                  letterSpacing: 1,
                  color: i === card.items.length - 1 ? D.rust : D.cardInk,
                  textTransform: "uppercase",
                }}
              >
                {item}
              </span>
              {i < card.items.length - 1 && (
                <span style={{ fontSize: 32, color: D.rust, margin: "6px 0" }}>↓</span>
              )}
            </div>
          ))}
        </div>
      )}

      {card.kind === "steps" && (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {card.items.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", marginBottom: 16 }}>
              <span
                style={{
                  fontSize: 34,
                  fontWeight: 700,
                  color: D.rust,
                  marginRight: 16,
                  lineHeight: 1.4,
                }}
              >
                {i + 1}.
              </span>
              <Rich block={item} size={34} color={D.cardInk} weight={700} lineHeight={1.4} boldColor="#ffffff" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const dossie: Theme = {
  id: "dossie",
  label: "Dossiê",
  hint: "Papel creme, manchete pesada e cartão escuro com lista, cadeia ou passos. Capa usa o print como fundo.",
  fonts: [
    { family: "Archivo Black", weight: 400 },
    { family: "Instrument Serif", weight: 400, italic: true },
    { family: "Inter", weight: 400 },
    { family: "Inter", weight: 700 },
    { family: "JetBrains Mono", weight: 400 },
  ],
  render: ({ carousel, slide, index, role, headline, body }) => {
    const handle = carousel.handle ? `@${carousel.handle}` : "";
    const num = String(index).padStart(2, "0");

    // Capa com print: a imagem vira o fundo e o texto senta por cima.
    if (role === "capa" && slide.image_url) {
      return (
        <div
          style={{
            width: SLIDE_WIDTH,
            height: SLIDE_HEIGHT,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            background: D.ink,
            fontFamily: "Inter",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slide.image_url}
            alt=""
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: SLIDE_WIDTH,
              height: SLIDE_HEIGHT,
              objectFit: "cover",
            }}
          />
          {/* Véu: o texto tem que ficar legível sobre QUALQUER print, inclusive
              um que já seja cheio de letra. Nada de `inset` — o Satori ignora o
              atalho e o véu sai sem tamanho, ou seja, invisível. */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: SLIDE_WIDTH,
              height: SLIDE_HEIGHT,
              display: "flex",
              background:
                "linear-gradient(180deg, rgba(8,9,12,0.55) 0%, rgba(8,9,12,0.45) 30%, rgba(8,9,12,0.93) 62%, #08090c 100%)",
            }}
          />

          <div style={{ display: "flex", flexDirection: "column", padding: "0 64px 76px" }}>
            <div style={{ display: "flex" }}>
              <Rich
                block={headline}
                size={headlineSize(headline, 104, 88, 74)}
                color="#ffffff"
                weight={400}
                boldWeight={400}
                boldColor="#37e07f"
                lineHeight={1.03}
                spacing={-1}
                family="Archivo Black"
              />
            </div>
            {body.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", marginTop: 26 }}>
                {body.map((b, i) => (
                  <div key={i} style={{ display: "flex", marginBottom: 6 }}>
                    <Rich block={b} size={30} color="#dfe3e8" weight={700} lineHeight={1.34} boldColor="#37e07f" />
                  </div>
                ))}
              </div>
            )}
            <span style={{ fontSize: 26, color: "#9aa3ad", marginTop: 30, fontFamily: "JetBrains Mono" }}>
              {handle}
            </span>
          </div>
        </div>
      );
    }

    return (
      <div
        style={{
          width: SLIDE_WIDTH,
          height: SLIDE_HEIGHT,
          display: "flex",
          flexDirection: "column",
          background: D.paper,
          padding: "0 64px 64px",
          fontFamily: "Inter",
        }}
      >
        {/* barra de topo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "44px 0 26px",
            borderBottom: `2px solid ${D.rule}`,
            marginBottom: 54,
          }}
        >
          <span style={{ fontSize: 28, color: D.muted, fontFamily: "JetBrains Mono" }}>{handle}</span>
          <span style={{ fontSize: 28, color: D.muted, fontFamily: "JetBrains Mono" }}>{num}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex" }}>
            <Rich
              block={headline}
              size={headlineSize(headline, 92, 78, 66)}
              color={D.ink}
              weight={400}
              boldWeight={400}
              boldColor={D.rust}
              lineHeight={1.02}
              spacing={-1}
              family="Archivo Black"
            />
          </div>

          {slide.subhead && (
            <div style={{ display: "flex", marginTop: 20 }}>
              <span
                style={{
                  fontSize: 42,
                  color: D.rust,
                  fontFamily: "Instrument Serif",
                  fontStyle: "italic",
                  lineHeight: 1.25,
                }}
              >
                {slide.subhead}
              </span>
            </div>
          )}

          {(slide.eyebrow || slide.breadcrumb) && (
            <div style={{ display: "flex", flexDirection: "column", marginTop: 34 }}>
              {slide.eyebrow && (
                <span
                  style={{
                    fontSize: 27,
                    fontWeight: 700,
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                    color: D.rust,
                  }}
                >
                  {slide.eyebrow}
                </span>
              )}
              {slide.breadcrumb && (
                <span
                  style={{
                    fontSize: 28,
                    color: D.muted,
                    fontFamily: "JetBrains Mono",
                    marginTop: 8,
                  }}
                >
                  {slide.breadcrumb}
                </span>
              )}
            </div>
          )}

          {/* O bloco central divide o espaço livre com a manchete e o fecho —
              ancorado no topo, cartão curto deixava uma faixa vazia embaixo. */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
          {slide.card ? (
            <DossieCard card={slide.card} />
          ) : (
            body.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", marginTop: 36 }}>
                {body.map((block, i) => (
                  <div key={i} style={{ display: "flex", marginBottom: 18 }}>
                    <Rich block={block} size={36} color="#3f4450" lineHeight={1.5} boldColor={D.ink} />
                  </div>
                ))}
              </div>
            )
          )}

          {slide.image_url && <Proof url={slide.image_url} border={D.rule} />}
          </div>
        </div>

        {slide.kicker && (
          <div style={{ display: "flex", marginTop: 40 }}>
            <Rich block={slide.kicker} size={38} color={D.ink} weight={700} boldColor={D.rust} lineHeight={1.35} />
          </div>
        )}
      </div>
    );
  },
};

// --- registro ---------------------------------------------------------------

export const THEMES: Theme[] = [dossie, editorial, poster, neon, terminal, tweet];
export const DEFAULT_THEME = "dossie";

export function getTheme(id: string | null | undefined): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES.find((t) => t.id === DEFAULT_THEME) ?? tweet;
}

export function roleOf(index: number, total: number): SlideRole {
  if (index === 1) return "capa";
  if (index === total) return "final";
  return "conteudo";
}

export function splitContent(slide: Slide, blocks: string[]) {
  void slide;
  return { headline: blocks[0] ?? "", body: blocks.slice(1) };
}
