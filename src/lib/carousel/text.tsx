import type { ReactElement } from "react";

type Run = { text: string; bold: boolean };

/** Quebra o texto em pedaços, marcando o que está entre ** ** como negrito. */
export function parseBold(text: string): Run[] {
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
export function toWords(block: string): Run[][] {
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
export function paragraphs(text: string): string[] {
  return text
    .split(/\n{1,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Texto sem marcação, para medir tamanho. */
export function plain(text: string): string {
  return text.replace(/\*\*/g, "");
}

/**
 * Um parágrafo com **negrito**, quebrando por palavra.
 *
 * `boldWeight` existe porque cada tema usa uma fonte diferente: no tema com
 * Anton, por exemplo, só existe um peso, e pedir 700 faria o Satori sintetizar
 * um falso-negrito borrado.
 */
export function Rich({
  block,
  size,
  color,
  weight = 400,
  boldWeight = 700,
  boldColor,
  lineHeight = 1.4,
  spacing,
  family,
}: {
  block: string;
  size: number;
  color: string;
  weight?: number;
  boldWeight?: number;
  boldColor?: string;
  lineHeight?: number;
  spacing?: number;
  /** Fonte da manchete. Cada tema traz a sua. */
  family?: string;
}): ReactElement {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        fontSize: size,
        lineHeight,
        color,
        ...(family ? { fontFamily: family } : {}),
        ...(spacing !== undefined ? { letterSpacing: spacing } : {}),
      }}
    >
      {toWords(block).map((word, w) => (
        <div key={w} style={{ display: "flex", marginRight: size * 0.27 }}>
          {word.map((run, r) => (
            <span
              key={r}
              style={{
                fontWeight: run.bold ? boldWeight : weight,
                ...(run.bold && boldColor ? { color: boldColor } : {}),
              }}
            >
              {run.text}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
