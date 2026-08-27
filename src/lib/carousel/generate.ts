import type { Slide, SlideCard } from "./types";
import { clampSlideCount } from "./prompt";
import { runProvider } from "./providers";

export type GeneratedCarousel = { title: string; slides: Slide[] };

/** Campo do modelo vira campo do slide só quando tem conteúdo. */
function clean(key: string, value: string | null | undefined) {
  const text = value?.trim();
  return text ? { [key]: text } : {};
}

/**
 * O esquema que o modelo preenche é chapado (tudo obrigatório, o que não se
 * aplica vem null). Aqui ele vira a união de verdade — e some quando o slide
 * não tem cartão.
 */
function toCard(card: {
  kind: "none" | "bullets" | "flow" | "steps" | "text";
  title: string | null;
  items: string[];
  body: string | null;
  note: string | null;
}): { card?: SlideCard } {
  const title = card.title?.trim() || undefined;
  const items = (card.items ?? []).map((i) => i.trim()).filter(Boolean);

  switch (card.kind) {
    case "bullets":
      if (!items.length) return {};
      return { card: { kind: "bullets", title, items, note: card.note?.trim() || undefined } };
    case "flow":
      if (items.length < 2) return {};
      return { card: { kind: "flow", title, items } };
    case "steps":
      if (!items.length) return {};
      return { card: { kind: "steps", title, items } };
    case "text": {
      const body = card.body?.trim();
      return body ? { card: { kind: "text", title, body } } : {};
    }
    default:
      return {};
  }
}

export async function generateCarousel(
  brief: string,
  direction: string | null,
  slideCount: number,
): Promise<GeneratedCarousel> {
  const count = clampSlideCount(slideCount);
  const parsed = await runProvider(brief, direction, count);

  // Renumera na marra: a ordem do array é a verdade, não o campo n que o modelo
  // escreveu — modelo às vezes pula ou repete número.
  const slides: Slide[] = parsed.slides.slice(0, count).map((s, i) => ({
    n: i + 1,
    text: s.text.trim(),
    screenshot_hint: s.screenshot_hint.trim(),
    image_url: null,
    ...clean("eyebrow", s.eyebrow),
    ...clean("breadcrumb", s.breadcrumb),
    ...clean("subhead", s.subhead),
    ...clean("kicker", s.kicker),
    ...toCard(s.card),
  }));

  if (!slides.length) {
    throw new Error("O modelo não devolveu nenhum slide. Tente descrever o teste com mais detalhe.");
  }

  return { title: parsed.title.trim(), slides };
}
