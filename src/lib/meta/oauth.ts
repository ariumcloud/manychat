import crypto from "node:crypto";
import { env } from "../env";
import { MetaError, metaConfig } from "./client";

/**
 * OAuth do "Instagram API com Instagram Login": o cliente autoriza a propria
 * conta no seu app da Meta e o token dele fica em mc_accounts.
 *
 * Com o app em modo Desenvolvimento so quem e "Testador do Instagram" do app
 * consegue autorizar. Para abrir a qualquer pessoa e preciso App Review.
 */
export const OAUTH_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_messages",
  "instagram_business_manage_comments",
  "instagram_business_content_publish",
];

/** Campos do webhook que o app processa (ver api/webhook/instagram). */
const WEBHOOK_FIELDS = ["comments", "live_comments", "messages", "messaging_postbacks", "messaging_seen"];

export const STATE_COOKIE = "ig_oauth_state";
const STATE_TTL_MS = 10 * 60_000;

/** Origem publica deste app, a mesma que voce cadastra como URI de redirecionamento na Meta. */
export function publicOrigin(req: Request): string {
  const fixed = process.env.APP_BASE_URL?.trim();
  if (fixed) return fixed.replace(/\/$/, "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export function redirectUri(req: Request) {
  return `${publicOrigin(req)}/api/instagram/callback`;
}

function hmac(payload: string) {
  return crypto.createHmac("sha256", env.authSecret).update(payload).digest("base64url");
}

/** state = nonce.accountId.expira.assinatura — amarra o retorno a quem iniciou. */
export function makeState(accountId: string) {
  const nonce = crypto.randomBytes(16).toString("base64url");
  const payload = `${nonce}.${accountId}.${Date.now() + STATE_TTL_MS}`;
  return { nonce, state: `${payload}.${hmac(payload)}` };
}

export function readState(state: string | null): { nonce: string; accountId: string } | null {
  if (!state) return null;
  const parts = state.split(".");
  if (parts.length !== 4) return null;
  const [nonce, accountId, expires, signature] = parts;
  const expected = hmac(`${nonce}.${accountId}.${expires}`);
  if (
    expected.length !== signature.length ||
    !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  ) {
    return null;
  }
  if (Number(expires) < Date.now()) return null;
  return { nonce, accountId };
}

export function authorizeUrl(req: Request, state: string) {
  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.searchParams.set("client_id", env.igAppId);
  url.searchParams.set("redirect_uri", redirectUri(req));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", OAUTH_SCOPES.join(","));
  url.searchParams.set("state", state);
  return url.toString();
}

async function json<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => ({}))) as T & {
    error?: { message?: string } | string;
    error_message?: string;
  };
  if (!res.ok) {
    const err = body.error;
    const message =
      body.error_message ?? (typeof err === "string" ? err : err?.message) ?? `HTTP ${res.status}`;
    throw new MetaError(message, res.status, body);
  }
  return body;
}

export type ConnectedProfile = {
  igUserId: string;
  username: string | null;
  name: string | null;
  profilePictureUrl: string | null;
  followersCount: number | null;
  accessToken: string;
  expiresInSeconds: number;
  webhookSubscribed: boolean;
};

/** code -> token curto -> token de 60 dias -> perfil -> inscricao no webhook. */
export async function completeAuthorization(req: Request, code: string): Promise<ConnectedProfile> {
  // O Instagram anexa "#_" ao code no redirecionamento.
  const cleanCode = code.replace(/#_$/, "");

  const shortRes = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.igAppId,
      client_secret: env.igAppSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri(req),
      code: cleanCode,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const short = await json<{ access_token?: string }>(shortRes);
  if (!short.access_token) throw new MetaError("O Instagram nao devolveu o token.", 502, short);

  const longUrl = new URL("https://graph.instagram.com/access_token");
  longUrl.searchParams.set("grant_type", "ig_exchange_token");
  longUrl.searchParams.set("client_secret", env.igAppSecret);
  longUrl.searchParams.set("access_token", short.access_token);
  const long = await json<{ access_token?: string; expires_in?: number }>(
    await fetch(longUrl, { cache: "no-store", signal: AbortSignal.timeout(15_000) }),
  );
  if (!long.access_token || !long.expires_in) {
    throw new MetaError("O Instagram nao devolveu o token de longa duracao.", 502, long);
  }
  const token = long.access_token;

  const meUrl = new URL(`https://graph.instagram.com/${metaConfig.version}/me`);
  meUrl.searchParams.set("fields", "user_id,username,name,profile_picture_url,followers_count");
  const me = await json<{
    user_id?: string;
    id?: string;
    username?: string;
    name?: string;
    profile_picture_url?: string;
    followers_count?: number;
  }>(
    await fetch(meUrl, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    }),
  );
  const igUserId = String(me.user_id ?? me.id ?? "");
  if (!igUserId) throw new MetaError("Nao consegui descobrir o ID da conta do Instagram.", 502, me);

  // Sem esta inscricao o Instagram nao manda comentarios e DMs da conta pro webhook.
  let webhookSubscribed = false;
  try {
    const subUrl = new URL(`https://graph.instagram.com/${metaConfig.version}/me/subscribed_apps`);
    subUrl.searchParams.set("subscribed_fields", WEBHOOK_FIELDS.join(","));
    const sub = await fetch(subUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    webhookSubscribed = sub.ok;
    if (!sub.ok) console.error("[oauth] subscribed_apps falhou:", sub.status, await sub.text());
  } catch (err) {
    console.error("[oauth] subscribed_apps falhou:", err);
  }

  return {
    igUserId,
    username: me.username ?? null,
    name: me.name ?? null,
    profilePictureUrl: me.profile_picture_url ?? null,
    followersCount: me.followers_count ?? null,
    accessToken: token,
    expiresInSeconds: long.expires_in,
    webhookSubscribed,
  };
}
