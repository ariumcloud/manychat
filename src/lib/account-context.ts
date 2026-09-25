import { AsyncLocalStorage } from "node:async_hooks";
import { cookies } from "next/headers";
import { readSession, SESSION_COOKIE, type Session } from "./auth";

/**
 * Qual conta do Instagram esta em uso agora.
 *
 * Dois caminhos:
 *  - Fora do painel (webhook, cron, MCP) quem chama sabe a conta e a declara
 *    com runWithAccount(): tudo que roda dentro dela — inclusive chamadas a
 *    Graph API — usa o token e os dados dessa conta.
 *  - No painel a conta vem da sessao (cookie assinado).
 *
 * Nao existe "primeira conta" como padrao: sem conta, o codigo falha em vez de
 * agir na conta errada.
 */
const store = new AsyncLocalStorage<{ accountId: string }>();

export function runWithAccount<T>(accountId: string, fn: () => Promise<T>): Promise<T> {
  return store.run({ accountId }, fn);
}

export async function currentSession(): Promise<Session | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  try {
    const jar = await cookies();
    return await readSession(jar.get(SESSION_COOKIE)?.value, secret);
  } catch {
    // Fora de um request (ex.: script) nao ha cookie.
    return null;
  }
}

export async function currentAccountId(): Promise<string | null> {
  const declared = store.getStore()?.accountId;
  if (declared) return declared;
  return (await currentSession())?.accountId ?? null;
}

export async function requireAccountId(): Promise<string> {
  const id = await currentAccountId();
  if (!id) throw new Error("Nenhuma conta do Instagram selecionada. Entre no painel de novo.");
  return id;
}
