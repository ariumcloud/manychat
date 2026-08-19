import type { Trigger } from "./types";

/** Minusculas, sem acento, sem pontuacao, espacos colapsados. */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchesTrigger(trigger: Trigger, rawText: string): boolean {
  // "any" dispara com qualquer texto — usado em auto-resposta geral.
  if (trigger.match_type === "any") return true;

  const text = normalize(rawText);
  if (!text) return false;

  if (trigger.match_type === "regex") {
    return trigger.keywords.some((k) => {
      try {
        return new RegExp(k, "i").test(rawText);
      } catch {
        return false;
      }
    });
  }

  const keywords = trigger.keywords.map(normalize).filter(Boolean);
  if (!keywords.length) return false;

  if (trigger.match_type === "exact") {
    return keywords.includes(text);
  }

  // "contains": palavra inteira, pra "oi" nao casar dentro de "coisa".
  const words = new Set(text.split(" "));
  return keywords.some((k) => (k.includes(" ") ? text.includes(k) : words.has(k)));
}

/**
 * Escolhe o gatilho vencedor. Ordem: prioridade desc, depois o mais especifico
 * (preso a um post especifico ganha de "qualquer post"), depois exact > contains > any.
 */
export function pickTrigger(
  triggers: Trigger[],
  text: string,
  opts: { mediaId?: string | null } = {},
): Trigger | null {
  const specificity = { exact: 3, regex: 2, contains: 1, any: 0 } as const;

  const candidates = triggers
    .filter((t) => t.enabled)
    .filter((t) => !t.media_id || t.media_id === opts.mediaId)
    .filter((t) => matchesTrigger(t, text))
    .sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      const aMedia = a.media_id ? 1 : 0;
      const bMedia = b.media_id ? 1 : 0;
      if (bMedia !== aMedia) return bMedia - aMedia;
      return specificity[b.match_type] - specificity[a.match_type];
    });

  return candidates[0] ?? null;
}
