import { ImageResponse } from "next/og";
import { loadFont } from "./font";
import { paragraphs } from "./text";
import { getTheme, roleOf, splitContent } from "./themes";
import { SLIDE_HEIGHT, SLIDE_WIDTH, type Carousel, type Slide } from "./types";

/**
 * Renderiza um slide em PNG, no tema escolhido pelo carrossel.
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

  const theme = getTheme(carousel.theme);
  const total = carousel.slides.length;
  const blocks = paragraphs(slide.text);
  const { headline, body } = splitContent(slide, blocks);

  const files = await Promise.all(theme.fonts.map((f) => loadFont(f.family, f.weight, f.italic)));

  return new ImageResponse(
    theme.render({
      carousel,
      slide,
      index,
      total,
      role: roleOf(index, total),
      headline,
      body,
    }),
    {
      width: SLIDE_WIDTH,
      height: SLIDE_HEIGHT,
      fonts: theme.fonts.map((f, i) => ({
        name: f.family,
        data: files[i],
        weight: f.weight as 400 | 700,
        style: (f.italic ? "italic" : "normal") as "italic" | "normal",
      })),
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
