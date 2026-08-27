/**
 * Satori não usa fontes do sistema — precisa do arquivo da fonte em memória.
 * Busca no Google Fonts e cacheia no módulo, senão cada slide refaria o download.
 */
const cache = new Map<string, ArrayBuffer>();

export async function loadFont(
  family: string,
  weight: number,
  italic = false,
): Promise<ArrayBuffer> {
  const key = `${family}:${weight}:${italic ? "i" : "n"}`;
  const hit = cache.get(key);
  if (hit) return hit;

  // Famílias de peso único (Anton, Bebas Neue) não aceitam o eixo wght — cai
  // para a URL sem eixo quando a primeira não devolve nada utilizável.
  const axis = italic ? `ital,wght@1,${weight}` : `wght@${weight}`;
  const urls = [
    `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:${axis}`,
    `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}`,
  ];

  /*
    NÃO mande User-Agent aqui. O Google escolhe o formato pelo UA: navegador
    moderno recebe woff2, que o Satori não consegue ler. Sem UA ele devolve
    truetype, que é o que precisamos. (O snippet que circula por aí manda um UA
    de Chrome e quebra exatamente por isso.)
  */
  let match: RegExpMatchArray | null = null;
  for (const url of urls) {
    const css = await fetch(url).then((r) => (r.ok ? r.text() : ""));
    match = css.match(/src:\s*url\(([^)]+)\)\s*format\('(?:opentype|truetype)'\)/);
    if (match) break;
  }
  if (!match) throw new Error(`Não consegui baixar a fonte ${family} ${weight}.`);

  const buffer = await fetch(match[1]).then((r) => r.arrayBuffer());
  cache.set(key, buffer);
  return buffer;
}
