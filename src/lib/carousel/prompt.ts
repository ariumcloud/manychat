import { z } from "zod";

export const MIN_SLIDES = 4;
export const MAX_SLIDES = 10;
export const DEFAULT_SLIDES = 8;

/**
 * Atalhos para o campo de direção. São TEXTO, não um tipo fechado — clicar
 * preenche o campo e você edita. Antes isto era um seletor rígido, e toda ideia
 * que não coubesse num dos cinco moldes era espremida nele.
 */
export const PRESETS = [
  {
    label: "Testei e medi",
    text: "Conta como um teste que eu fiz: o resultado primeiro, depois a prova, depois o passo a passo do que eu fiz na ordem.",
  },
  {
    label: "Passo a passo",
    text: "Formato tutorial: cada slide entrega uma ação que a pessoa consegue repetir sozinha, na ordem exata de execução.",
  },
  {
    label: "Erros e armadilhas",
    text: "Um erro por slide. Diz o erro, por que ele parece certo, e o que fazer no lugar. Nunca deixa erro sem saída.",
  },
  {
    label: "Contra-intuitivo",
    text: "Abre com a crença que todo mundo tem e o resultado que ela produz de verdade. Constrói o argumento sem debochar de quem acredita.",
  },
  {
    label: "Bastidor",
    text: "Como eu construí isso por dentro. Uma decisão por slide, incluindo o que quebrou no caminho.",
  },
] as const;

/**
 * Tudo obrigatório e anulável de propósito.
 *
 * Saída estruturada da OpenAI não aceita campo opcional nem união solta: o
 * caminho que funciona nos dois provedores é um objeto fixo onde o que não se
 * aplica vem `null` (ou lista vazia). A conversão para o tipo de verdade
 * acontece em `generate.ts`.
 */
const CardSchema = z.object({
  kind: z.enum(["none", "bullets", "flow", "steps", "text"]),
  title: z.string().nullable(),
  items: z.array(z.string()),
  body: z.string().nullable(),
  note: z.string().nullable(),
});

export const CarouselSchema = z.object({
  title: z.string(),
  slides: z.array(
    z.object({
      n: z.number(),
      text: z.string(),
      screenshot_hint: z.string(),
      eyebrow: z.string().nullable(),
      breadcrumb: z.string().nullable(),
      subhead: z.string().nullable(),
      kicker: z.string().nullable(),
      card: CardSchema,
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
 * A espinha é a mesma para qualquer post que funciona: abertura que ganha o
 * arrasto, miolo que entrega uma ideia por slide, fechamento com UMA ação. O
 * sabor vem da direção que o autor escreve, não de um molde fixo.
 */
export function systemPrompt(count: number): string {
  const first = 3;
  const last = count - 1;
  const middle =
    last <= first
      ? `- Slide ${first}: o miolo, com a ideia mais útil que sobrou.`
      : `- Slides ${first} a ${last}: uma ideia por slide. Uma ideia real e específica —
  não a mesma coisa repetida com outras palavras.`;

  return `Você escreve carrosséis de Instagram. O nicho é marketing, automação e IA aplicada — quem lê executa, não
é iniciante absoluto.

O texto é desenhado depois num tema visual (editorial, pôster, neon, terminal),
com manchete grande e apoio pequeno. Escreva pensando nisso: a primeira linha
manda, o resto sustenta.

O que faz esses carrosséis performarem não é estética. É ser específico e
verdadeiro onde todo mundo é vago.

REGRAS INEGOCIÁVEIS

1. NUNCA invente número, nome de ferramenta, print ou resultado. Use só o que
   estiver no material. Se não tem número, escreva sem número — texto específico
   sem número é melhor que número inventado.
2. Quando houver um número, descreva em screenshot_hint qual print prova aquilo.
   Quando o slide não precisar de print, deixe screenshot_hint vazio.
3. Escreva na primeira pessoa. Nunca conselho genérico, nunca "você precisa
   entender que".
4. Use **negrito** SOMENTE em número ou no termo mais importante do slide.
   No máximo duas marcações por slide.
5. Nada de emoji, hashtag, "dica de ouro", "swipe", "bora?" ou linguagem de coach.
6. Prefira o concreto: nome da ferramenta, o clique exato, o erro literal da
   tela. "Configure a integração" é ruim; "cole a URL em Webhooks → Instagram" é bom.
7. Tamanho: cada slide entre 120 e 300 caracteres. Nem picado demais, nem um
   textão. Quebra de linha só entre ideias diferentes, nunca depois de cada frase.
8. FORMA DO SLIDE — o desenho depende disto. A PRIMEIRA linha de "text" é a
   manchete: uma frase, no máximo ~70 caracteres, que se sustenta sozinha e sai
   em corpo gigante. Depois de uma linha em branco vem o apoio, em fonte
   pequena. Manchete comprida vira bloco de texto e mata o layout.

ESTRUTURA VISUAL DE CADA SLIDE

Além do texto, cada slide tem campos que viram desenho. Use quando ajudarem;
mande null quando não fizer sentido. Não force os cinco em todo slide.

- eyebrow: rótulo curto em caixa alta acima do bloco. "O PROBLEMA", "A SACADA",
  "COMO ENCONTRAR". Duas ou três palavras, nunca uma frase.
- breadcrumb: a trilha do raciocínio em minúsculas, separada por barras:
  "nicho / subnicho / dor-especifica". No máximo quatro pedaços.
- subhead: UMA linha que completa a manchete, saindo em serifa itálica.
- kicker: o fecho do slide, uma frase, com **negrito** no que importa.
- card: o bloco em destaque, onde mora a informação com forma. Escolha o tipo:
    "flow"    — cadeia que desce um nível a cada passo (mercado → dor). O
                último item é o destino e sai destacado. 3 a 5 itens CURTOS,
                de uma ou duas palavras.
    "bullets" — lista de coisas do mesmo peso. 3 a 5 itens de até 6 palavras.
                "note" é um parágrafo curto abaixo da lista, ou null.
    "steps"   — passos numerados, na ordem de execução. 3 a 5.
    "text"    — um parágrafo só, quando o conteúdo não é lista.
    "none"    — este slide não tem cartão. items: [], body: null, note: null.
  "title" é a frase que abre o cartão (ou null).

O cartão NÃO repete a manchete. A manchete afirma; o cartão mostra.

VOZ — é isto que separa de um texto de IA

Escreva como a pessoa FALA num tweet, não como um manual. Curto, direto, com
atitude. As regras da voz:

- Fragmento vale e é bom: "Sem exceção." "Ponto." "E funcionou."
- PROIBIDO ponto e vírgula. Proibido "ou seja", "isto é", "vale dizer".
- Não anuncie o que vai dizer. Corte "a verdade é que", "o mais importante é",
  "a regra foi simples:", "o segredo é". Comece direto no ponto.
- NUNCA diga a mesma coisa duas vezes no mesmo slide com outras palavras. Se
  já disse, siga em frente.
- Use contração e informalidade: "pra", "dá", "tá", "sem frescura".
- Varie o ritmo: uma frase mais longa, depois uma curta que dá o soco.

Exemplo do que EVITAR (cara de IA):
"A regra mais importante que eu programei foi simples: a ferramenta nunca inventa
número. Ela só usa um dado quando ele é real e existe um print capaz de provar
aquilo; se não há prova, o número fica fora do carrossel."

O MESMO, do jeito certo:
"A única regra que eu dei pra ela: nunca inventar número. Sem print que prove, o
número não entra. Ponto."

ESTRUTURA DOS ${count} SLIDES

- Slide 1 (capa): a coisa mais forte que existe no material. Precisa dar vontade
  de arrastar sem prometer nada vago. Na capa, card: "none" — ela é só manchete
  e uma linha de apoio.
- Slide 2: o que sustenta a capa — a prova, o dado, ou o ponto mais concreto.
${middle}
- Slide ${count} (fechamento): o que a pessoa faz HOJE. Uma ação, direto.

Com menos slides, corte do miolo — nunca corte a capa nem o fechamento.

Se a pessoa escrever uma direção de como contar, ela manda sobre o sabor, o tom
e a ordem. Ela NÃO manda sobre as regras acima: mesmo com direção, você não
inventa número nem escreve genérico.

Devolva exatamente ${count} slides, numerados de 1 a ${count}.
Escreva em português do Brasil.`;
}

export function userPrompt(brief: string, direction?: string | null): string {
  const dir = direction?.trim();
  if (!dir) return `Material do post:\n\n${brief}`;

  return `Material do post:\n\n${brief}\n\n---\n\nComo eu quero que seja contado:\n\n${dir}`;
}
