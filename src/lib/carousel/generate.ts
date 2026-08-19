import { SLIDE_COUNT, type Slide } from "./types";
import { runProvider } from "./providers";

export type GeneratedCarousel = { title: string; slides: Slide[] };

export async function generateCarousel(brief: string): Promise<GeneratedCarousel> {
  const parsed = await runProvider(brief);

  // Renumera na marra: a ordem do array é a verdade, não o campo n que o modelo
  // escreveu — modelo às vezes pula ou repete número.
  const slides: Slide[] = parsed.slides.slice(0, SLIDE_COUNT).map((s, i) => ({
    n: i + 1,
    text: s.text.trim(),
    screenshot_hint: s.screenshot_hint.trim(),
    image_url: null,
  }));

  return { title: parsed.title.trim(), slides };
}
