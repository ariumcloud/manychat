/**
 * Autenticacao de painel: o login vira um cookie assinado com HMAC que carrega
 * a conta (e o papel) da sessao. Usa Web Crypto (nao node:crypto) porque o middleware
 * roda no runtime edge.
 */
export const SESSION_COOKIE = "mc_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 dias

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (const b of arr) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return b64url(sig);
}

export type Session = {
  /** Conta do Instagram cujo painel esta aberto. */
  accountId: string;
  /** "admin" = dono do app (senha do .env), pode trocar de conta. "client" = so a propria. */
  role: "admin" | "client";
};

function utf8ToB64url(text: string) {
  return b64url(new TextEncoder().encode(text));
}

function b64urlToUtf8(value: string): string | null {
  try {
    const bin = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  } catch {
    return null;
  }
}

export async function createSessionValue(session: Session, secret: string): Promise<string> {
  const payload = utf8ToB64url(
    JSON.stringify({ exp: Date.now() + MAX_AGE_SECONDS * 1000, acc: session.accountId, role: session.role }),
  );
  return `${payload}.${await sign(payload, secret)}`;
}

/** Devolve a sessao se a assinatura confere e nao venceu; null caso contrario. */
export async function readSession(
  value: string | undefined,
  secret: string,
): Promise<Session | null> {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const expected = await sign(payload, secret);
  if (expected.length !== signature.length) return null;

  // Comparacao de tempo constante, pra nao vazar o segredo byte a byte.
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  if (diff !== 0) return null;

  const json = b64urlToUtf8(payload);
  if (!json) return null;
  try {
    const data = JSON.parse(json) as { exp?: number; acc?: string; role?: string };
    if (!data.exp || data.exp < Date.now() || !data.acc) return null;
    if (data.role !== "admin" && data.role !== "client") return null;
    return { accountId: data.acc, role: data.role };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};
