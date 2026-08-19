import { z } from "zod";

export const MIN_SLIDES = 4;
export const MAX_SLIDES = 10;
export const DEFAULT_SLIDES = 8;

export const CarouselSchema = z.object({
  title: z.string(),
  slides: z.array(
    z.object({
      n: z.number(),
      text: z.string(),
      screenshot_hint: z.string(),
    }),
  ),
});

export type ParsedCarousel = z.infer<typeof CarouselSchema>;

export function clampSlideCount(n: unknown): number {
  const parsed = Number(n);
  if (!Number.isFinite(parsed)) return DEFAULT_SLIDES;
  return Math.min(MAX_SLIDES, Math.max(MIN_SLIDES, Math.round(parsed)));
}

/**
 * A estrutura é sempre a mesma — capa, prova, passos, regra, fechamento — e o
 * que muda com o total é quantos slides sobram para os passos. Montar isso na
 * mão para cada tamanho seria repetição; a faixa é calculada.
 */
function structure(count: number): string {
  const firstStep = 3;
  const lastStep = count - 2;
  const ruleSlide = count - 1;

  const steps =
    lastStep < firstStep
      ? `- Slide ${firstStep}: o passo principal, o que foi feito na prática.`
      : lastStep === firstStep
        ? `- Slide ${firstStep}: o passo principal, com o print da etapa.`
        : `- Slides ${firstStep} a ${lastStep}: um passo por slide. O que foi feito, na ordem,
  com o print de cada etapa. Passo concreto, não princípio.`;

  return `- Slide 1 (capa): o resultado concreto com número + o esforço irrisório que deu.
  Precisa dar vontade de arrastar sem prometer nada vago.
- Slide 2: a prova. O painel, a métrica, o print que mostra que aconteceu mesmo.
${steps}
- Slide ${ruleSlide}: a regra ou o detalhe que quase ninguém faz e que muda o resultado.
- Slide ${count} (fechamento): o que a pessoa faz HOJE. Uma ação, não três.`;
}

/**
 * O formato que funciona não é design — é prova.
 *
 * A regra que segura tudo: todo número escrito precisa existir num print. Sem
 * print, o número não entra. É isso que separa "eu testei" de "eu inventei",
 * e é por isso que o modelo precisa dizer qual print capturar em cada slide.
 *
 * O mesmo texto vale para os dois provedores — o que muda é só a chamada.
 */
export function systemPrompt(count: number): string {
  return `Você escreve carrosséis de Instagram no formato "card de tweet": fundo branco,
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

ESTRUTURA DOS ${count} SLIDES

${structure(count)}

Com menos slides, corte passos — nunca corte a capa, a prova ou o fechamento.

Devolva exatamente ${count} slides, numerados de 1 a ${count}.
Escreva em português do Brasil.`;
}

export function userPrompt(brief: string) {
  return `Escreva o carrossel sobre este teste que eu fiz de verdade:\n\n${brief}`;
}
