/**
 * Personalizacao do texto das mensagens: `{nome}` vira o primeiro nome da
 * pessoa. Quando nao sabemos o nome (ou ele nao parece um nome), o marcador
 * some junto com a pontuacao em volta, para a frase nao ficar quebrada:
 * "Oi, {nome}!" -> "Oi!".
 */

/** Primeiro nome com cara de nome, ou null (username, emoji, numero etc. nao valem). */
export function firstNameOf(full?: string | null): string | null {
  const token = (full ?? "").trim().split(/\s+/)[0] ?? "";
  if (!/^\p{L}{2,20}$/u.test(token)) return null;
  const allSameCase = token === token.toLowerCase() || token === token.toUpperCase();
  return allSameCase ? token.charAt(0).toUpperCase() + token.slice(1).toLowerCase() : token;
}

export function hasNamePlaceholder(text: string): boolean {
  return /\{nome\}/i.test(text);
}

export function applyName(text: string, name: string | null): string {
  if (!hasNamePlaceholder(text)) return text;
  if (name) return text.replace(/\{nome\}/gi, name);

  const cleaned = text
    // Marcador no comeco ("{nome}, aqui esta"): some com a virgula que vem depois.
    .replace(/^\s*\{nome\}\s*,?\s*/i, "")
    // "Oi, {nome}!" / "Oi {nome}, tudo bem": tira o marcador e a virgula/espaco antes.
    .replace(/\s*,?\s*\{nome\}(?=\s*[!?.,:]|\s*$)/gi, "")
    // Qualquer sobra no meio da frase.
    .replace(/\s*\{nome\}\s*,?\s*/gi, " ")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}
