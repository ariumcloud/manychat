import { NextResponse } from "next/server";
import { createSessionValue, SESSION_COOKIE, sessionCookieOptions, type Session } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { verifyPassword } from "@/lib/password";
import { checkLoginRate } from "@/lib/login-rate";

export const runtime = "nodejs";

/** Erro unico para login inexistente e senha errada: nao revela quais logins existem. */
const INVALID = "Login ou senha incorretos.";

export async function POST(req: Request) {
  const { login, password } = (await req.json().catch(() => ({}))) as {
    login?: string;
    password?: string;
  };

  const adminPassword = process.env.DASHBOARD_PASSWORD;
  const secret = process.env.AUTH_SECRET;

  if (!adminPassword || !secret) {
    return NextResponse.json(
      { error: "Defina DASHBOARD_PASSWORD e AUTH_SECRET no .env.local" },
      { status: 500 },
    );
  }
  if (!password) return NextResponse.json({ error: INVALID }, { status: 401 });

  const name = (login ?? "").trim().toLowerCase();

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!checkLoginRate(`${ip}:${name}`)) {
    return NextResponse.json({ error: "Muitas tentativas. Espere alguns minutos." }, { status: 429 });
  }

  let session: Session | null = null;

  if (!name) {
    // Dono: senha do .env. Abre a conta mais antiga; troca de conta em Configuracoes.
    if (password === adminPassword) {
      const { data } = await db()
        .from("mc_accounts")
        .select("id")
        .order("connected_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (data) session = { accountId: data.id, role: "admin" };
    }
  } else {
    // Logins sao gravados em minusculas (api/admin/clients).
    const { data } = await db()
      .from("mc_accounts")
      .select("id, password_hash")
      .eq("login", name)
      .maybeSingle();
    if (data && verifyPassword(password, data.password_hash)) {
      session = { accountId: data.id, role: "client" };
    }
  }

  if (!session) return NextResponse.json({ error: INVALID }, { status: 401 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await createSessionValue(session, secret), sessionCookieOptions);
  return res;
}
