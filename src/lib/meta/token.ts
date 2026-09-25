import { env } from "../env";
import { db } from "../supabase";
import { requireAccountId } from "../account-context";

/**
 * Token do Instagram da conta em uso, lido de mc_accounts.ig_access_token.
 *
 * Cada conta tem o seu. IG_ACCESS_TOKEN (variavel de ambiente) so vale para a
 * conta original, que foi conectada antes do OAuth existir: uma conta sem
 * token que nao seja ela NUNCA herda esse token, senao agiria no Instagram do
 * dono.
 *
 * Fica em memoria por alguns minutos: toda chamada a Graph API passa por
 * aqui, e o Supabase e compartilhado. Se a Meta disser que o token e invalido,
 * quem chama esquece o cache e tenta de novo (ver meta/client.ts).
 */
const CACHE_MS = 10 * 60_000;
const cache = new Map<string, { token: string; at: number }>();

/** Conta ainda sem Instagram conectado (ver api/admin/clients). */
export const PENDING_PREFIX = "pending:";

export async function accessToken(): Promise<string> {
  const accountId = await requireAccountId();

  const hit = cache.get(accountId);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.token;

  let token = "";
  let igUserId = "";
  try {
    const { data } = await db()
      .from("mc_accounts")
      .select("ig_access_token, ig_user_id")
      .eq("id", accountId)
      .maybeSingle();
    token = data?.ig_access_token ?? "";
    igUserId = data?.ig_user_id ?? "";
  } catch (err) {
    // Banco fora nao pode derrubar o envio, mas so a conta original tem plano B.
    console.error("[token] nao consegui ler o token do banco:", err);
    igUserId = env.igUserId;
  }

  if (!token) {
    const legacyAccount =
      Boolean(process.env.IG_ACCESS_TOKEN) &&
      !igUserId.startsWith(PENDING_PREFIX) &&
      (!env.igUserId || env.igUserId === igUserId);
    if (!legacyAccount) {
      throw new Error("Esta conta ainda nao conectou o Instagram. Use \"Conectar Instagram\" em Configuracoes.");
    }
    token = env.igAccessToken;
  }

  cache.set(accountId, { token, at: Date.now() });
  return token;
}

export function forgetAccessToken(accountId?: string) {
  if (accountId) cache.delete(accountId);
  else cache.clear();
}

/** Grava o token (novo ou renovado) da conta. */
export async function saveAccessToken(accountId: string, token: string, expiresInSeconds: number) {
  const now = new Date();
  const { error } = await db()
    .from("mc_accounts")
    .update({
      ig_access_token: token,
      ig_token_expires_at: new Date(now.getTime() + expiresInSeconds * 1000).toISOString(),
      ig_token_refreshed_at: now.toISOString(),
    })
    .eq("id", accountId);
  if (error) throw new Error(`Nao consegui salvar o token: ${error.message}`);
  cache.set(accountId, { token, at: Date.now() });
}
