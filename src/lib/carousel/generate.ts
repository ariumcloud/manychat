import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { SLIDE_COUNT, type Slide } from "./types";

const SlideSchema = z.object({
  n: z.number(),
  text: z.string(),
  screenshot_hint: z.string(),
});

const CarouselSchema = z.object({
  title: z.string(),
  slides: z.array(SlideSchema),
});

/**
 * O formato que funciona não é design — é prova.
 *
 * A regra que segura tudo: todo número escrito precisa existir num print. Sem
 * print, o número não entra. É isso que separa "eu testei" de "eu inventei",
 * e é por isso que o modelo precisa dizer qual print capturar em cada slide.
 */
const SYSTEM = `Você escreve carrosséis de Instagram no formato "card de tweet": fundo branco,
texto curto, sem design. O que faz esses carrosséis performarem não é estética —
é a história ser verdadeira e específica.

REGRAS INEGOCIÁVEIS

1. Todo número que aparecer no texto TEM que existir num print. Para cada slide
   com número, descreva em screenshot_hint exatamente qual print capturar. Se
   não dá para printar, não escreva o número.
2. Escreva na primeira pessoa, como quem fez o teste. Nunca conselho genérico.
3. Frases curtas. Quebra de linha entre ideias. Quem rola o feed lê em 2 segundos.
4. Use **negrito** SOMENTE nos números e no termo mais importante de cada slide.
   No máximo duas marcações por slide.
5. Nada de emoji, hashtag, "dica de ouro", "swipe" ou linguagem de coach.
6. Cada slide tem no máximo 320 caracteres. O slide 1 tem no máximo 200.

ESTRUTURA DOS ${SLIDE_COUNT} SLIDES

- Slide 1 (capa): o resultado concreto com número + o esforço irrisório que deu.
  Precisa dar vontade de arrastar sem prometer nada vago.
- Slide 2: a prova. O painel, a métrica, o print que mostra que aconteceu mesmo.
- Slides 3 a 6: um passo por slide. O que foi feito, na ordem, com o print de cada
  etapa. Passo concreto, não princípio.
- Slide 7: a regra ou o detalhe que quase ninguém faz e que muda o resultado.
- Slide 8 (fechamento): o que a pessoa faz HOJE. Uma ação, não três.

Devolva exatamente ${SLIDE_COUNT} slides, numerados de 1 a ${SLIDE_COUNT}.
Escreva em português do Brasil.`;

export type GeneratedCarousel = { title: string; slides: Slide[] };

export async function generateCarousel(brief: string): Promise<GeneratedCarousel> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "Defina ANTHROPIC_API_KEY no .env.local para gerar o roteiro. A chave sai em console.anthropic.com.",
    );
  }

  const client = new Anthropic();

  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "high",
      format: zodOutputFormat(CarouselSchema),
    },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Escreva o carrossel sobre este teste que eu fiz de verdade:\n\n${brief}`,
      },
    ],
  });

  const parsed = response.parsed_output;
  if (!parsed) {
    throw new Error("O modelo não devolveu um roteiro válido. Tente descrever o teste com mais detalhe.");
  }

  // Renumera na marra: a ordem do array é a verdade, não o campo n.
  const slides: Slide[] = parsed.slides.slice(0, SLIDE_COUNT).map((s, i) => ({
    n: i + 1,
    text: s.text.trim(),
    screenshot_hint: s.screenshot_hint.trim(),
    image_url: null,
  }));

  return { title: parsed.title.trim(), slides };
}
