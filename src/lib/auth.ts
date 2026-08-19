/**
 * Autenticacao simples de painel: uma senha unica no .env vira um cookie
 * assinado com HMAC. Usa Web Crypto (nao node:crypto) porque o middleware
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

export async function createSessionValue(secret: string): Promise<string> {
  const expires = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = String(expires);
  return `${payload}.${await sign(payload, secret)}`;
}

export async function verifySessionValue(
  value: string | undefined,
  secret: string,
): Promise<boolean> {
  if (!value) return false;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return false;
  if (Number(payload) < Date.now()) return false;

  const expected = await sign(payload, secret);
  if (expected.length !== signature.length) return false;

  // Comparacao de tempo constante, pra nao vazar o segredo byte a byte.
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};
