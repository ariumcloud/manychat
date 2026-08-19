/**
 * Satori não usa fontes do sistema — precisa do arquivo da fonte em memória.
 * Busca no Google Fonts e cacheia no módulo, senão cada slide refaria o download.
 */
const cache = new Map<string, ArrayBuffer>();

export async function loadFont(family: string, weight: 400 | 700): Promise<ArrayBuffer> {
  const key = `${family}:${weight}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
    family,
  )}:wght@${weight}`;

  /*
    NÃO mande User-Agent aqui. O Google escolhe o formato pelo UA: navegador
    moderno recebe woff2, que o Satori não consegue ler. Sem UA ele devolve
    truetype, que é o que precisamos. (O snippet que circula por aí manda um UA
    de Chrome e quebra exatamente por isso.)
  */
  const css = await fetch(cssUrl).then((r) => r.text());

  const match = css.match(/src:\s*url\(([^)]+)\)\s*format\('(?:opentype|truetype)'\)/);
  if (!match) throw new Error(`Não consegui baixar a fonte ${family} ${weight}.`);

  const buffer = await fetch(match[1]).then((r) => r.arrayBuffer());
  cache.set(key, buffer);
  return buffer;
}
