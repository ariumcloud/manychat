import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { currentSession } from "@/lib/account-context";
import { withApi } from "@/lib/api";
import { db } from "@/lib/supabase";
import { hashPassword } from "@/lib/password";
import { PENDING_PREFIX } from "@/lib/meta/token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOGIN_RE = /^[a-z0-9._@+-]{3,80}$/;

/** Rotas de cliente so servem o dono; o cliente nunca ve nem cria contas. */
async function requireAdmin() {
  const session = await currentSession();
  return session?.role === "admin" ? session : null;
}

const FORBIDDEN = () => NextResponse.json({ error: "Somente o dono." }, { status: 403 });

async function getHandler() {
  if (!(await requireAdmin())) return FORBIDDEN();

  const { data, error } = await db()
    .from("mc_accounts")
    .select("id, login, username, name, ig_user_id, ig_token_expires_at, connected_at")
    .order("connected_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    accounts: (data ?? []).map((a) => ({
      id: a.id,
      login: a.login,
      username: a.username,
      name: a.name,
      connected: !String(a.ig_user_id).startsWith(PENDING_PREFIX),
      tokenExpiresAt: a.ig_token_expires_at,
    })),
  });
}

/** Cria o painel do cliente: login + senha. O Instagram ele conecta depois, logado. */
async function postHandler(req: Request) {
  if (!(await requireAdmin())) return FORBIDDEN();

  const body = (await req.json().catch(() => ({}))) as {
    login?: string;
    password?: string;
    name?: string;
  };
  const login = (body.login ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (!LOGIN_RE.test(login)) {
    return NextResponse.json(
      { error: "Use um e-mail ou login de 3 a 80 caracteres (letras, números e . _ @ + -)." },
      { status: 400 },
    );
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "A senha precisa de pelo menos 8 caracteres." }, { status: 400 });
  }

  const { data, error } = await db()
    .from("mc_accounts")
    .insert({
      // Placeholder ate o cliente conectar o Instagram (o OAuth troca pelo id real).
      ig_user_id: `${PENDING_PREFIX}${crypto.randomUUID()}`,
      login,
      password_hash: hashPassword(password),
      name: body.name?.trim() || null,
    })
    .select("id, login")
    .single();

  if (error) {
    const taken = error.code === "23505";
    return NextResponse.json(
      { error: taken ? "Esse login já existe." : error.message },
      { status: taken ? 409 : 500 },
    );
  }
  return NextResponse.json({ account: data }, { status: 201 });
}

/** Troca a senha de um cliente. */
async function patchHandler(req: Request) {
  if (!(await requireAdmin())) return FORBIDDEN();

  const { id, password } = (await req.json().catch(() => ({}))) as { id?: string; password?: string };
  if (!id || !password || password.length < 8) {
    return NextResponse.json({ error: "Informe o cliente e uma senha de 8+ caracteres." }, { status: 400 });
  }

  const { data, error } = await db()
    .from("mc_accounts")
    .update({ password_hash: hashPassword(password) })
    .eq("id", id)
    .not("login", "is", null)
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export const GET = withApi(getHandler);
export const POST = withApi(postHandler);
export const PATCH = withApi(patchHandler);
