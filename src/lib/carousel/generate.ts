import type { Slide } from "./types";
import { clampSlideCount, type AngleId } from "./prompt";
import { runProvider } from "./providers";

export type GeneratedCarousel = { title: string; slides: Slide[] };

export async function generateCarousel(
  brief: string,
  angle: AngleId,
  slideCount: number,
): Promise<GeneratedCarousel> {
  const count = clampSlideCount(slideCount);
  const parsed = await runProvider(brief, angle, count);

  // Renumera na marra: a ordem do array é a verdade, não o campo n que o modelo
  // escreveu — modelo às vezes pula ou repete número.
  const slides: Slide[] = parsed.slides.slice(0, count).map((s, i) => ({
    n: i + 1,
    text: s.text.trim(),
    screenshot_hint: s.screenshot_hint.trim(),
    image_url: null,
  }));

  if (!slides.length) {
    throw new Error("O modelo não devolveu nenhum slide. Tente descrever o teste com mais detalhe.");
  }

  return { title: parsed.title.trim(), slides };
}
