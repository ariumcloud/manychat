/**
 * Freio simples contra chute de senha: 8 tentativas a cada 10 minutos por
 * IP+login. Fica em memoria (por instancia), o que ja barra o chute manual.
 */
const WINDOW_MS = 10 * 60_000;
const MAX_ATTEMPTS = 8;
const attempts = new Map<string, number[]>();

export function checkLoginRate(key: string): boolean {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  attempts.set(key, recent);

  if (attempts.size > 500) {
    for (const [k, list] of attempts) {
      if (list.every((t) => now - t >= WINDOW_MS)) attempts.delete(k);
    }
  }
  return recent.length <= MAX_ATTEMPTS;
}
