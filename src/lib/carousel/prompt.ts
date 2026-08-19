import { z } from "zod";

export const MIN_SLIDES = 4;
export const MAX_SLIDES = 10;
export const DEFAULT_SLIDES = 8;

export const ANGLES = [
  {
    id: "teste",
    label: "Testei e medi",
    hint: "Rodei um experimento e tenho os números.",
  },
  {
    id: "tutorial",
    label: "Passo a passo",
    hint: "Ensino a fazer uma coisa específica.",
  },
  {
    id: "erros",
    label: "Erros e armadilhas",
    hint: "O que ninguém avisa e derruba quem tenta.",
  },
  {
    id: "contraintuitivo",
    label: "Contra-intuitivo",
    hint: "Todo mundo acredita em X — e é por isso que não funciona.",
  },
  {
    id: "bastidor",
    label: "Bastidor",
    hint: "Como eu construí / como funciona por dentro.",
  },
] as const;

export type AngleId = (typeof ANGLES)[number]["id"];

export function isAngle(v: unknown): v is AngleId {
  return ANGLES.some((a) => a.id === v);
}

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
 * Cada ângulo tem uma espinha diferente, mas todas seguem a mesma lógica:
 * abertura que prende, miolo que entrega, fechamento com UMA ação. O que muda
 * é quantos slides sobram para o miolo — calculado, não escrito à mão para
 * cada tamanho.
 */
function structure(angle: AngleId, count: number): string {
  const first = 3;
  const last = count - 1;
  const middle = (what: string) =>
    last < first
      ? `- Slide ${first}: ${what}`
      : last === first
        ? `- Slide ${first}: ${what}`
        : `- Slides ${first} a ${last}: ${what}`;

  switch (angle) {
    case "teste":
      return `- Slide 1 (capa): o resultado concreto com número + o esforço irrisório que deu.
- Slide 2: a prova. O painel, a métrica, o print que mostra que aconteceu mesmo.
${middle(`um passo por slide, na ordem em que você fez, com o print de cada etapa.
  O penúltimo slide traz a regra ou o detalhe que quase ninguém faz.`)}
- Slide ${count} (fechamento): o que a pessoa faz HOJE. Uma ação, não três.`;

    case "tutorial":
      return `- Slide 1 (capa): o que a pessoa vai conseguir fazer ao final, concreto.
- Slide 2: o que precisa ter na mão antes de começar. Nada de teoria.
${middle(`um passo por slide, numerado, na ordem exata de execução. Cada slide
  entrega UMA ação que a pessoa consegue repetir sem você.`)}
- Slide ${count} (fechamento): o primeiro passo pra fazer agora.`;

    case "erros":
      return `- Slide 1 (capa): quantos erros são e o que eles custam. Sem suspense vago.
- Slide 2: o erro mais caro de todos, direto.
${middle(`um erro por slide. Diga o erro, por que ele parece certo, e o que
  fazer no lugar. O que fazer no lugar é obrigatório — erro sem saída é reclamação.`)}
- Slide ${count} (fechamento): qual desses a pessoa conserta hoje.`;

    case "contraintuitivo":
      return `- Slide 1 (capa): a crença comum + o resultado que ela produz de verdade.
- Slide 2: por que todo mundo acredita nisso. Sem deboche de quem acredita.
${middle(`a construção do argumento, um passo por slide: o que realmente
  acontece, o que muda quando você inverte, e o custo de continuar como está.`)}
- Slide ${count} (fechamento): o que fazer no lugar, em uma frase acionável.`;

    case "bastidor":
      return `- Slide 1 (capa): o que foi construído + o detalhe que faz parecer impossível.
- Slide 2: por onde começou e por quê.
${middle(`uma decisão por slide: o que foi feito, o que quebrou, como resolveu.
  Onde algo deu errado, conte — é isso que separa bastidor de propaganda.`)}
- Slide ${count} (fechamento): o que a pessoa pode replicar disso.`;
  }
}

/**
 * A regra que sustenta o formato: número escrito precisa existir num print.
 *
 * Nem todo ângulo tem número, e forçar número onde não tem é o que produz
 * carrossel inventado. Por isso a regra é "nunca invente", não "sempre tenha".
 */
export function systemPrompt(angle: AngleId, count: number): string {
  return `Você escreve carrosséis de Instagram no formato "card de tweet": fundo branco,
texto curto, sem design. O nicho é marketing, automação e IA aplicada — quem lê
executa, não é iniciante absoluto.

O que faz esses carrosséis performarem não é estética. É ser específico e
verdadeiro onde todo mundo é vago.

REGRAS INEGOCIÁVEIS

1. NUNCA invente número, nome de ferramenta, print ou resultado. Use só o que
   estiver no relato. Se o relato não tem número, escreva sem número — texto
   específico sem número é melhor que número inventado.
2. Quando houver um número, descreva em screenshot_hint qual print prova aquilo.
   Quando o slide não precisar de print, deixe screenshot_hint vazio.
3. Escreva na primeira pessoa. Nunca conselho genérico, nunca "você precisa
   entender que".
4. Frases curtas. Quebra de linha entre ideias. Quem rola o feed lê em 2 segundos.
5. Use **negrito** SOMENTE em número ou no termo mais importante do slide.
   No máximo duas marcações por slide.
6. Nada de emoji, hashtag, "dica de ouro", "swipe", "bora?" ou linguagem de coach.
7. Cada slide tem no máximo 320 caracteres. O slide 1 tem no máximo 200.
8. Prefira o concreto: nome da ferramenta, o clique exato, o erro literal da
   tela. "Configure a integração" é ruim; "cole a URL em Webhooks → Instagram" é bom.

ESTRUTURA DOS ${count} SLIDES

${structure(angle, count)}

Com menos slides, corte do miolo — nunca corte a capa nem o fechamento.

Devolva exatamente ${count} slides, numerados de 1 a ${count}.
Escreva em português do Brasil.`;
}

export function userPrompt(brief: string) {
  return `Escreva o carrossel sobre isto:\n\n${brief}`;
}
