import { env } from "../env";
import { db } from "../supabase";

/**
 * Token do Instagram em uso. O renovado pelo app fica em
 * mc_accounts.ig_access_token; enquanto nao houver um, vale IG_ACCESS_TOKEN.
 *
 * Fica em memoria por alguns minutos: toda chamada a Graph API passa por
 * aqui, e o Supabase e compartilhado. Se a Meta disser que o token e invalido,
 * quem chama esquece o cache e tenta de novo (ver meta/client.ts).
 */
const CACHE_MS = 10 * 60_000;
let cached: { token: string; at: number } | null = null;

export async function accessToken(): Promise<string> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.token;

  let token = "";
  try {
    const { data } = await db()
      .from("mc_accounts")
      .select("ig_access_token")
      .not("ig_access_token", "is", null)
      .limit(1)
      .maybeSingle();
    token = data?.ig_access_token ?? "";
  } catch (err) {
    // Banco fora nao pode derrubar o envio: a variavel de ambiente segura.
    console.error("[token] nao consegui ler o token do banco:", err);
  }

  cached = { token: token || env.igAccessToken, at: Date.now() };
  return cached.token;
}

export function forgetAccessToken() {
  cached = null;
}

/** Grava o token renovado. O app so tem uma conta. */
export async function saveAccessToken(token: string, expiresInSeconds: number) {
  const now = new Date();
  const { error } = await db()
    .from("mc_accounts")
    .update({
      ig_access_token: token,
      ig_token_expires_at: new Date(now.getTime() + expiresInSeconds * 1000).toISOString(),
      ig_token_refreshed_at: now.toISOString(),
    })
    .not("id", "is", null);
  if (error) throw new Error(`Nao consegui salvar o token renovado: ${error.message}`);
  cached = { token, at: Date.now() };
}
