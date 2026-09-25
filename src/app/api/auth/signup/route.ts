import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createSessionValue, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { createClientAccount, EMAIL_RE } from "@/lib/clients";
import { checkLoginRate } from "@/lib/login-rate";

export const runtime = "nodejs";

function sameCode(given: string, expected: string) {
  const a = crypto.createHash("sha256").update(given).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

/**
 * Autocadastro do cliente. Com SIGNUP_CODE definido, so entra quem souber o
 * codigo (o dono passa para o cliente); sem ele, o cadastro fica aberto. A
 * conta nasce vazia: so faz algo depois de conectar um Instagram, e isso o app
 * da Meta (modo Desenvolvimento) so deixa para testadores.
 */
export async function POST(req: Request) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Defina AUTH_SECRET no .env.local" }, { status: 500 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!checkLoginRate(`signup:${ip}`)) {
    return NextResponse.json({ error: "Muitas tentativas. Espere alguns minutos." }, { status: 429 });
  }

  const { email, password, code } = (await req.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
    code?: string;
  };

  const requiredCode = process.env.SIGNUP_CODE?.trim();
  if (requiredCode && !sameCode((code ?? "").trim(), requiredCode)) {
    return NextResponse.json({ error: "Código de convite incorreto." }, { status: 403 });
  }

  const login = (email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(login)) {
    return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
  }

  const result = await createClientAccount({ login, password: password ?? "" });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(
    SESSION_COOKIE,
    await createSessionValue({ accountId: result.accountId, role: "client" }, secret),
    sessionCookieOptions,
  );
  return res;
}
