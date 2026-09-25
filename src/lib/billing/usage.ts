import { db } from "../supabase";
import { currentPeriod, decideAccess, type Access, type Billing } from "./access";

/**
 * Cache curto: o webhook decide isso a cada fluxo, e o Supabase e compartilhado.
 * 30s de atraso no limite e aceitavel (o fluxo em andamento termina de qualquer jeito).
 */
const CACHE_MS = 30_000;
const cache = new Map<string, { billing: Billing; used: number; period: string; at: number }>();

async function load(accountId: string) {
  const period = currentPeriod();
  const hit = cache.get(accountId);
  if (hit && hit.period === period && Date.now() - hit.at < CACHE_MS) return hit;

  const supabase = db();
  const [{ data: account }, { data: usage }] = await Promise.all([
    supabase.from("mc_accounts").select("plan, subscription_status").eq("id", accountId).maybeSingle(),
    supabase.from("mc_usage").select("messages").eq("account_id", accountId).eq("period", period).maybeSingle(),
  ]);

  const entry = {
    billing: { plan: account?.plan ?? null, subscription_status: account?.subscription_status ?? null },
    used: usage?.messages ?? 0,
    period,
    at: Date.now(),
  };
  cache.set(accountId, entry);
  return entry;
}

/** Pode rodar automacao agora? Falha de banco libera: cobranca nunca derruba o atendimento. */
export async function checkAccess(accountId: string): Promise<Access> {
  try {
    const { billing, used } = await load(accountId);
    return decideAccess(billing, used);
  } catch (err) {
    console.error("[billing] nao consegui checar o plano; liberando:", err);
    return { allowed: true };
  }
}

/** Uso do mes para mostrar no painel. */
export async function getUsage(accountId: string): Promise<{ used: number; period: string }> {
  const { used, period } = await load(accountId);
  return { used, period };
}

/** Conta uma mensagem enviada pela automacao. Nunca lanca: contar e secundario a entregar. */
export async function bumpUsage(accountId: string): Promise<void> {
  try {
    const period = currentPeriod();
    const { error } = await db().rpc("mc_bump_usage", { p_account: accountId, p_period: period });
    if (error) throw new Error(error.message);

    const hit = cache.get(accountId);
    if (hit && hit.period === period) hit.used += 1;
  } catch (err) {
    console.error("[billing] nao consegui contar a mensagem:", err);
  }
}

/** Depois de mudar o plano/status (webhook da Stripe), o proximo fluxo ja ve o novo estado. */
export function forgetBilling(accountId: string) {
  cache.delete(accountId);
}
