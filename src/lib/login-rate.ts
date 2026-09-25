import { db } from "./supabase";

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

/**
 * Freio que vale entre instancias (o Map acima so enxerga a propria): conta
 * tentativas por chave no banco. Se o banco falhar, deixa passar, para nao
 * derrubar o cadastro por causa do freio.
 */
export async function checkPersistentRate(key: string, max: number, windowMs: number): Promise<boolean> {
  try {
    const supabase = db();
    const since = new Date(Date.now() - windowMs).toISOString();
    const { count, error } = await supabase
      .from("mc_rate_events")
      .select("id", { count: "exact", head: true })
      .eq("key", key)
      .gte("at", since);
    if (error) return true;
    if ((count ?? 0) >= max) return false;

    await supabase.from("mc_rate_events").insert({ key });
    // Limpeza oportunista: de vez em quando apaga o que ja passou de um dia.
    if (Math.random() < 0.02) {
      await supabase
        .from("mc_rate_events")
        .delete()
        .lt("at", new Date(Date.now() - 24 * 3600_000).toISOString());
    }
    return true;
  } catch {
    return true;
  }
}
